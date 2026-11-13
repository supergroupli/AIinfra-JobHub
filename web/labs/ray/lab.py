#!/usr/bin/env python3
"""Local concurrency teaching lab, not a Ray cluster benchmark. Python 3.9+."""
import argparse,csv,hashlib,json,math,platform,time
from concurrent.futures import ThreadPoolExecutor,wait,FIRST_COMPLETED
from pathlib import Path

def square(x):return x*x

def bounded_map(values,limit=2):
    if not isinstance(limit,int) or limit<1:raise ValueError('limit must be a positive integer')
    iterator=iter(enumerate(values));pending={};results={};peak=0
    with ThreadPoolExecutor(max_workers=limit) as pool:
        def fill():
            nonlocal peak
            while len(pending)<limit:
                try:i,value=next(iterator)
                except StopIteration:break
                pending[pool.submit(square,value)]=i
            peak=max(peak,len(pending))
        fill()
        while pending:
            done,_=wait(pending,return_when=FIRST_COMPLETED)
            for future in done:results[pending.pop(future)]=future.result()
            fill()
    return [results[i] for i in range(len(results))],peak

def capacity(cpu,per_task):
    if cpu<0 or per_task<=0:raise ValueError('invalid logical CPU request')
    return math.floor(cpu/per_task)

def backlog(arrival_rate,workers,service_ms,seconds):
    if min(arrival_rate,workers,seconds)<0 or service_ms<=0:raise ValueError('invalid queue inputs')
    return max(0,arrival_rate-workers*1000/service_ms)*seconds

def experiment(day):
    if day==1:return {'evidence':'design','layers':{'Core':'tasks, actors, references','Data':'batch transformations','Train':'training orchestration','Serve':'online request lifecycle'},'flow':['input','transform','output']}
    if day==2:
        start=time.perf_counter();result,peak=bounded_map(range(8),2)
        return {'evidence':'measured-local-python','result':result,'sum':sum(result),'peak_pending':peak,'elapsed_s':time.perf_counter()-start,'boundary':'Python threads execute real work; no Ray scheduler and no parallel speedup claim.'}
    if day==3:return {'evidence':'design','object_MiB':64,'consumers':8,'naive_copied_MiB':512,'shared_payload_MiB':64,'warning':'Reference metadata, serialization, remote copies and spilling excluded; refs do not make object lifetime free.'}
    if day==4:
        state={'value':0};events=[]
        for delta in (2,3,-1):state['value']+=delta;events.append(state['value'])
        return {'evidence':'simulated','sequential_actor_values':events,'reconstructed_value':sum((2,3,-1)),'note':'Sequential toy only; async/concurrent actors need explicit ordering.'}
    if day==5:return {'evidence':'design','node_cpu':4,'task_cpu':1.5,'max_tasks':capacity(4,1.5),'unused_cpu':1.0,'boundary':'Logical scheduler resources, not a process CPU utilization limit.'}
    if day==6:
        result,peak=bounded_map(range(100),4)
        return {'evidence':'measured-local-python','count':len(result),'sum':sum(result),'peak_pending':peak,'unbounded_100_objects_MiB':6400,'bounded_4_objects_MiB':256,'fluid_backlog_after_10s':backlog(50,2,50,10),'memory_boundary':'64 MiB/object is a separate hypothetical estimate; actual integers are tiny.'}
    if day==7:
        rows=[{'id':i,'value':i} for i in range(8)];batches=[rows[i:i+3] for i in range(0,len(rows),3)]
        output=[{'id':r['id'],'square':square(r['value'])} for b in batches for r in b]
        return {'evidence':'measured-local-python','batch_sizes':[len(b) for b in batches],'output':output,'sum':sum(r['square'] for r in output),'boundary':'Python batch semantics, not Ray Data throughput.'}
    if day==8:return {'evidence':'design','request':{'value':7},'response':{'square':square(7)},'same_function_as_batch':True,'queue_limit':4,'overflow_policy':'reject or backpressure explicitly','notice':'This is an offline API contract; the optional Ray example runs real Serve.'}
    if day==9:
        seen=set();committed=[]
        for ident in ('a','b','a'):
            if ident not in seen:committed.append(ident);seen.add(ident)
        return {'evidence':'simulated','attempts':3,'committed':committed,'retry_side_effect_count':len(committed),'note':'Dedup state needs durable atomic storage for production exactly-once-like effects; retries alone do not provide it.'}
    raise ValueError('unknown day')

def selfcheck():
    assert bounded_map(range(8),2)[0]==[0,1,4,9,16,25,36,49]
    assert bounded_map([],2)==([],0)
    assert capacity(4,1.5)==2 and backlog(50,2,50,10)==100
    assert experiment(9)['retry_side_effect_count']==2
    print('PASS: bounded work, empty input, fractional resources, backlog and dedup')

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('command',choices=['selfcheck']+[f'day{i}' for i in range(1,11)]);p.add_argument('--out',default='out');a=p.parse_args();out=Path(a.out)
    if a.command=='selfcheck':selfcheck();return
    day=int(a.command[3:]);out.mkdir(parents=True,exist_ok=True)
    for d in (range(1,10) if day==10 else [day]):
        result=experiment(d);(out/f'day{d:02d}.json').write_text(json.dumps(result,indent=2)+'\n');print('DAY',d,json.dumps(result))
    if day==10:
        with (out/'summary.csv').open('w',newline='') as f:
            w=csv.writer(f);w.writerow(['day','evidence','sha256'])
            for d in range(1,10):
                raw=(out/f'day{d:02d}.json').read_bytes();w.writerow([d,json.loads(raw)['evidence'],hashlib.sha256(raw).hexdigest()])
        (out/'environment.json').write_text(json.dumps({'python':platform.python_version(),'source_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}))
        (out/'REPORT.md').write_text('# Ray learning portfolio / Ray 学习作品\n\nLocal Python experiments are not Ray cluster measurements.\n本机 Python 实验不等于 Ray 集群性能。\n\n## My contribution / 本人贡献\nTODO: implement student.py, change one backlog parameter and explain your results.\n\n## Evidence / 证据\nAttach raw day JSON, CSV and environment. Mark optional Ray SDK runs separately.\n\n## Failure and next step / 失败与下一步\nTODO: explain why retries need idempotence and why pending limits differ from worker counts.\n')
        print('REPORT.md ready; complete your analysis')
if __name__=='__main__':main()
