#!/usr/bin/env python3
"""AI Infra JobHub teaching lab. Python 3.9+, stdlib, localhost only."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import csv
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.metadata
import json
import math
from pathlib import Path
import platform
import statistics
import time
import urllib.error
import urllib.request

MODEL = 'Qwen/Qwen2.5-0.5B-Instruct'

def write_json(path, value):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

def workload():
    return [{'request_id': i, 'prompt': ('The same context. ' * 24 if i % 2 == 0 else 'Unique topic %d. ' % i * 24) + 'Reply OK.', 'group': 'shared' if i % 2 == 0 else 'unique', 'max_tokens': 16} for i in range(12)]

def simulate(cache=False, output_tokens=16, concurrency=1, failures=False):
    # Deterministic event simulation, not sleeps or measured GPU timings.
    slots = [0.0] * concurrency; rows=[]; cache_available_at=None
    for item in workload():
        i=item['request_id']; arrival=i*10.0
        worker=min(range(concurrency),key=slots.__getitem__)
        start=max(arrival,slots[worker]); hit=cache and item['group']=='shared' and cache_available_at is not None and start>=cache_available_at
        prefill=10.0 if hit else 40.0
        first=start+prefill; finish=first+max(0,output_tokens-1)*5.0
        status='timeout' if failures and i==3 else 'error' if failures and i==7 else 'ok'
        slots[worker]=finish
        if item['group']=='shared' and cache_available_at is None and status=='ok':cache_available_at=finish
        rows.append(dict(item,evidence='simulated',status=status,arrival_ms=arrival,start_ms=start,first_content_ms=first,finish_ms=finish,latency_ms=finish-arrival,first_content_latency_ms=first-arrival,completion_tokens=output_tokens if status=='ok' else None,cache_hit=bool(hit)))
    return rows

def percentile(values, p):
    values=sorted(values)
    return values[max(0,math.ceil(p*len(values))-1)] if values else None

def summarize(rows, elapsed_ms):
    success=[r for r in rows if r['status']=='ok']; latency=[r['latency_ms'] for r in success]
    counts={s:sum(r['status']==s for r in rows) for s in ('ok','error','timeout')}
    known_tokens=bool(success) and all(isinstance(r.get('completion_tokens'),int) for r in success)
    return {'evidence':sorted({r['evidence'] for r in rows}), 'total':len(rows),'counts':counts,'success_rate':len(success)/len(rows) if rows else None,'latency_p50_ms':percentile(latency,.5),'latency_p95_ms':percentile(latency,.95),'elapsed_ms':elapsed_ms,'successful_requests_per_second':len(success)/(elapsed_ms/1000) if elapsed_ms>0 else None,'completion_tokens_per_second':sum(r['completion_tokens'] for r in success)/(elapsed_ms/1000) if known_tokens and elapsed_ms>0 else None,'latency_scope':'successful requests only; nearest-rank percentiles','throughput_scope':'successful completions over total run wall time; simulation uses virtual time'}

def save_run(out,rows,elapsed_ms,config):
    out=Path(out); out.mkdir(parents=True,exist_ok=True)
    (out/'requests.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows),encoding='utf-8')
    write_json(out/'summary.json',summarize(rows,elapsed_ms)); write_json(out/'config.json',config)
    with (out/'results.csv').open('w',newline='',encoding='utf-8') as f:
        fields=['request_id','evidence','status','latency_ms','first_content_latency_ms','completion_tokens']; w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows)
    print(json.dumps(summarize(rows,elapsed_ms),indent=2))

class MockHandler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def send_json(self,status,payload):
        data=json.dumps(payload).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def do_GET(self):
        self.send_json(200,{'data':[{'id':'mock-model'}]}) if self.path=='/v1/models' else self.send_json(404,{'error':'not found'})
    def do_POST(self):
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=65536: return self.send_json(400,{'error':'invalid body size'})
            payload=json.loads(self.rfile.read(size))
            if not isinstance(payload,dict):return self.send_json(400,{'error':'object required'})
            messages=payload.get('messages')
            if payload.get('model')!='mock-model': return self.send_json(404,{'error':'unknown model'})
            if not isinstance(messages,list) or not messages or not all(isinstance(m,dict) for m in messages): return self.send_json(400,{'error':'messages required'})
            prompt=str(messages[-1].get('content',''))
            if 'INJECT_ERROR' in prompt:return self.send_json(500,{'error':'injected failure'})
            if 'INJECT_TIMEOUT' in prompt:time.sleep(.2)
            if payload.get('stream'):
                self.send_response(200);self.send_header('Content-Type','text/event-stream');self.end_headers()
                for content in ('MOCK ', 'OK'):
                    data={'choices':[{'delta':{'content':content}}]};self.wfile.write(('data: '+json.dumps(data)+'\n\n').encode());self.wfile.flush()
                self.wfile.write(b'data: [DONE]\n\n')
            else:self.send_json(200,{'model':'mock-model','choices':[{'message':{'content':'MOCK OK'}}], 'teaching_notice':'No model, tokenizer, or GPU inference was used.'})
        except (ValueError,TypeError): self.send_json(400,{'error':'invalid JSON'})
        except (BrokenPipeError,ConnectionResetError): pass

def request_one(item,port=8000,model='mock-model',evidence='simulated',timeout=30,stream=False):
    body={'model':model,'messages':[{'role':'user','content':item['prompt']}],'max_tokens':item.get('max_tokens',16),'temperature':0,'stream':stream}
    if stream:body['stream_options']={'include_usage':True}
    req=urllib.request.Request('http://127.0.0.1:%d/v1/chat/completions'%port,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
    start=time.perf_counter();first=None;tokens=None;text='';code=None;status='ok'
    try:
        with urllib.request.urlopen(req,timeout=timeout) as response:
            code=response.status
            if stream:
                done=False
                for raw in response:
                    line=raw.decode().strip()
                    if not line.startswith('data:'):continue
                    data=line[5:].strip()
                    if data=='[DONE]':
                        done=True
                        break
                    event=json.loads(data)
                    if event.get('usage'):tokens=event['usage'].get('completion_tokens')
                    for choice in event.get('choices',[]):
                        content=choice.get('delta',{}).get('content') or ''
                        if content and first is None:first=time.perf_counter()
                        text+=content
                if not done:raise ValueError('stream ended before [DONE]')
            else:
                data=json.load(response);text=data['choices'][0]['message']['content'];tokens=(data.get('usage') or {}).get('completion_tokens')
    except (ValueError,KeyError,IndexError,TypeError,AttributeError) as e:status='error';text='Invalid or incomplete response: '+str(e)
    except urllib.error.HTTPError as e:status='error';code=e.code;text=e.read().decode()[:200]
    except (TimeoutError,urllib.error.URLError,OSError) as e:status='timeout' if isinstance(e,TimeoutError) or 'timed out' in str(e) else 'error';text=str(e)
    end=time.perf_counter()
    return dict(item,evidence=evidence,status=status,http_status=code,latency_ms=(end-start)*1000,first_content_latency_ms=(first-start)*1000 if first is not None else None,completion_tokens=tokens,response=text,metric_note='First non-empty content event latency; not necessarily one-token TTFT. Mock does not report token counts.')

def kv(tokens=1024,sequences=1):
    # Qwen2.5-0.5B config: 24 layers, 2 KV heads, 64 head dimension, FP16=2 bytes.
    byte_count=2*24*2*64*2*tokens*sequences
    return {'evidence':'design','tokens_per_sequence':tokens,'sequences':sequences,'kv_bytes':byte_count,'kv_MiB':byte_count/2**20,'excludes':'weights, activations, padding, allocator and runtime overhead'}

def quantize(values,bits):
    maximum=max(abs(x) for x in values);limit=2**(bits-1)-1;scale=maximum/limit if maximum else 1
    restored=[round(x/scale)*scale for x in values]
    return {'evidence':'simulated','bits':bits,'scale':scale,'values':values,'restored':restored,'max_abs_error':max(abs(a-b) for a,b in zip(values,restored)),'notice':'Toy symmetric integer quantization, not model quality or GPU speed.'}

def check_run(directory):
    d=Path(directory);rows=[json.loads(x) for x in (d/'requests.jsonl').read_text().splitlines() if x];summary=json.loads((d/'summary.json').read_text())
    assert len({r['request_id'] for r in rows})==len(rows),'duplicate request IDs'
    assert all(r['status'] in ('ok','error','timeout') and r['evidence'] in ('measured','simulated','design') and r['latency_ms']>=0 for r in rows),'invalid row'
    assert summary==summarize(rows,summary['elapsed_ms']),'summary does not match raw data'
    assert sum(summary['counts'].values())==len(rows),'denominator mismatch'
    return summary

def main():
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='cmd',required=True)
    sub.add_parser('env');sub.add_parser('selfcheck')
    p=sub.add_parser('mock');p.add_argument('--port',type=int,default=8000)
    for name in ('request','bench'):
        p=sub.add_parser(name);p.add_argument('--port',type=int,default=8000);p.add_argument('--model',default='mock-model');p.add_argument('--evidence',choices=['simulated','measured'],default='simulated');p.add_argument('--timeout',type=float,default=30);p.add_argument('--stream',action='store_true');p.add_argument('--out',default='out/'+name);p.add_argument('--concurrency',type=int,choices=range(1,9),default=1);p.add_argument('--prompt',default='Say OK.')
    p=sub.add_parser('simulate');p.add_argument('--cache',action='store_true');p.add_argument('--failures',action='store_true');p.add_argument('--tokens',type=int,choices=range(1,257),default=16);p.add_argument('--concurrency',type=int,choices=range(1,9),default=1);p.add_argument('--out',default='out/baseline')
    p=sub.add_parser('kv');p.add_argument('--tokens',type=int,default=1024);p.add_argument('--sequences',type=int,default=1)
    sub.add_parser('quant');sub.add_parser('plan')
    for name in ('check','report'):
        p=sub.add_parser(name);p.add_argument('directory')
    args=parser.parse_args()
    if args.cmd=='env':
        versions={'python':platform.python_version(),'platform':platform.platform(),'teaching_vllm_version':'0.33.0','model':MODEL}
        for name in ('vllm','torch','transformers'):
            try:versions[name]=importlib.metadata.version(name)
            except importlib.metadata.PackageNotFoundError:versions[name]='not installed'
        write_json('out/environment.json',versions);print(json.dumps(versions,indent=2))
    elif args.cmd=='mock':
        print('SIMULATED: no model inference. Listening on 127.0.0.1:%d. Ctrl+C stops.'%args.port,flush=True)
        try:ThreadingHTTPServer(('127.0.0.1',args.port),MockHandler).serve_forever()
        except KeyboardInterrupt:pass
    elif args.cmd in ('request','bench'):
        if args.timeout<=0:parser.error('timeout must be positive')
        if args.model=='mock-model' and args.evidence=='measured':parser.error('mock-model must be simulated')
        items=[{'request_id':0,'prompt':args.prompt,'max_tokens':16}] if args.cmd=='request' else workload()
        start=time.perf_counter()
        with ThreadPoolExecutor(max_workers=args.concurrency) as pool:rows=list(pool.map(lambda item:request_one(item,args.port,args.model,args.evidence,args.timeout,args.stream),items))
        save_run(args.out,rows,(time.perf_counter()-start)*1000,vars(args))
    elif args.cmd=='simulate':
        rows=simulate(args.cache,args.tokens,args.concurrency,args.failures);save_run(args.out,rows,max(r['finish_ms'] for r in rows),vars(args))
    elif args.cmd=='kv':
        if args.tokens<1 or args.sequences<1:parser.error('tokens and sequences must be positive')
        print(json.dumps(kv(args.tokens,args.sequences),indent=2))
    elif args.cmd=='quant':
        print(json.dumps([quantize([-.95,-.31,.02,.47,1.0],b) for b in (4,8)],indent=2))
    elif args.cmd=='plan':
        value={'evidence':'design','single_gpu':'Start here. Establish correctness and workload first.','tensor_parallel':'Splits a model across devices; communication and divisibility constraints matter.','data_parallel':'Replicates a model; routes independent requests; extra copies cost memory.','student_task':'Explain a capacity bottleneck and a throughput bottleneck separately. No multi-GPU result is claimed.'};write_json('out/scaling-plan.json',value);print(json.dumps(value,indent=2))
    elif args.cmd=='check':check_run(args.directory);print('PASS: unique IDs, statuses, denominators and recomputed summary')
    elif args.cmd=='report':
        summary=check_run(args.directory);d=Path(args.directory);files=['requests.jsonl','summary.json','config.json'];hashes={f:hashlib.sha256((d/f).read_bytes()).hexdigest() for f in files};write_json(d/'manifest.json',hashes)
        report='# vLLM learning portfolio / 学习作品\n\nEvidence / 证据类型: '+', '.join(summary['evidence'])+'\n\n```json\n'+json.dumps(summary,indent=2)+'\n```\n\n## My question / 我的问题\nTODO: state the workload and goal.\n\n## My change / 本人改动\nTODO: explain your code and one controlled change.\n\n## Evidence / 证据\nrequests.jsonl, summary.json, config.json, manifest.json. Add environment, model revision, server command and independent repeats for GPU runs.\n\n## Limitations / 局限\nSimulation is not vLLM performance. First content events may contain multiple tokens. Small samples do not establish a production SLO.\n\n## Next experiment / 下一次实验\nTODO: one falsifiable prediction and a failure case.\n';(d/'REPORT.md').write_text(report,encoding='utf-8');print(str(d/'REPORT.md'))
    elif args.cmd=='selfcheck':
        assert kv()['kv_MiB']==12
        assert percentile([10,20,30],.95)==30
        base=simulate();hot=simulate(True);assert hot[0]['cache_hit'] is False and hot[2]['cache_hit'] is True
        assert hot[-1]['finish_ms']<base[-1]['finish_ms']
        errors=summarize(simulate(failures=True),1380);assert errors['counts']=={'ok':10,'error':1,'timeout':1}
        assert summarize([],0)['latency_p95_ms'] is None
        assert quantize([-.95,-.31,.02,.47,1.0],8)['max_abs_error']<quantize([-.95,-.31,.02,.47,1.0],4)['max_abs_error']
        print('PASS: KV math, percentile, cache controls, errors, empty results, quantization')

if __name__=='__main__':main()
