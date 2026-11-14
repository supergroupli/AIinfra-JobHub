#!/usr/bin/env python3
"""CPU analysis of synthetic teaching data. No framework/GPU execution."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

CASES = ('kv-capacity','tail-queue','prefix-miss','async-timing','ddp-scaling','small-collectives','retry-storm','bounded-queue','probe-confusion')
ROOT = Path(__file__).resolve().parent

def number(data, key, low=0, integer=False):
    value = data[key]
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < low or value > 10**12 or (integer and not isinstance(value, int)):
        raise ValueError('invalid number: ' + key)
    return value

def rows(data, key, limit=10000):
    value = data[key]
    if not isinstance(value, list) or not value or len(value) > limit:
        raise ValueError('invalid list: ' + key)
    return value

def percentile(values, p=.95):
    return sorted(values)[math.ceil(len(values)*p)-1]

def analyze(case, d):
    if not isinstance(d, dict): raise ValueError('input must be an object')
    if case == 'kv-capacity':
        layers=number(d,'layers',1,True);heads=number(d,'kv_heads',1,True);dim=number(d,'head_dim',1,True);width=number(d,'bytes',1,True);block=number(d,'block',1,True)
        tokens=rows(d,'sequence_tokens');budget=number(d,'kv_budget_bytes',1,True)
        allocated=sum(math.ceil(number({'n':x},'n',1,True)/block)*block for x in tokens)
        per_token=2*layers*heads*dim*width
        return {'bytes_per_token':per_token,'allocated_tokens':allocated,'required_bytes':allocated*per_token,'budget_bytes':budget,'fits':allocated*per_token<=budget,'max_full_blocks':int(budget//(per_token*block))}
    if case == 'tail-queue':
        requests=rows(d,'requests');clock=0;out=[]
        for row in sorted(requests,key=lambda r:number(r,'arrival_ms')):
            arrival=number(row,'arrival_ms');service=number(row,'service_ms',.001);start=max(clock,arrival);clock=start+service
            if row.get('kind') not in ('short','long'):raise ValueError('invalid kind')
            out.append({'kind':row['kind'],'wait_ms':start-arrival,'latency_ms':clock-arrival,'service_ms':service})
        short=[r for r in out if r['kind']=='short']
        if not short:raise ValueError('need short requests')
        return {'policy':'single-server FCFS, no preemption','requests':out,'short_p95_latency_ms':percentile([r['latency_ms'] for r in short]),'short_p95_wait_ms':percentile([r['wait_ms'] for r in short]),'short_service_p95_ms':percentile([r['service_ms'] for r in short])}
    if case == 'prefix-miss':
        block=number(d,'block',1,True);output={}
        for name in ('dynamic_first','stable_first'):
            cache=set();hits=0;total=0
            for tokens in rows(d,name):
                if not isinstance(tokens,list) or not tokens or len(tokens)>512 or not all(isinstance(x,str) and len(x)<=100 for x in tokens):raise ValueError('invalid tokens')
                total+=len(tokens)
                for end in range(block,len(tokens)+1,block):
                    prefix=tuple(tokens[:end])
                    if prefix in cache:hits+=block
                    cache.add(prefix)
            output[name]={'cached_tokens':hits,'prompt_tokens':total,'token_hit_fraction':hits/total}
        return output
    if case == 'async-timing':
        items=rows(d,'kernels');result=[]
        for r in items:
            if not isinstance(r.get('name'),str) or not r['name']:raise ValueError('kernel name required')
            host=number(r,'host_enqueue_ms',.00001);device=number(r,'device_elapsed_ms',.00001)
            result.append({'name':r['name'],'host_enqueue_ms':host,'device_elapsed_ms':device,'understatement_factor':device/host})
        return {'kernels':result,'host_fastest':min(result,key=lambda x:x['host_enqueue_ms'])['name'],'device_fastest':min(result,key=lambda x:x['device_elapsed_ms'])['name']}
    if case == 'ddp-scaling':
        ranks=rows(d,'sample_gradients');sums=[];counts=[]
        for batch in ranks:
            if not isinstance(batch,list) or not batch or len(batch)>10000:raise ValueError('invalid batch')
            for value in batch:
                if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or abs(value)>1e9:raise ValueError('invalid gradient')
            sums.append(sum(batch));counts.append(len(batch))
        if len(set(counts))!=1:raise ValueError('this exercise requires equal local batch sizes; weighted gradients needed otherwise')
        expected=sum(sums)/sum(counts);bad=sum(sums)/len(ranks);fixed=sum(s/n for s,n in zip(sums,counts))/len(ranks)
        return {'global_sample_mean':expected,'ddp_of_local_sums':bad,'ddp_of_local_means':fixed,'absolute_error_before':abs(bad-expected),'absolute_error_after':abs(fixed-expected)}
    if case == 'small-collectives':
        latency=number(d,'latency_us',.00001);bandwidth=number(d,'payload_bytes_per_us',.00001);sizes=rows(d,'message_bytes');out=[]
        for value in sizes:
            size=number({'size':value},'size',1,True);time=latency+size/bandwidth
            out.append({'bytes':size,'time_us':time,'payload_GB_per_s':size/time/1000,'fixed_fraction':latency/time})
        count=number(d,'small_message_count',1,True);small=number(d,'small_message_bytes',1,True)
        return {'model':'T = alpha + bytes / bandwidth; payload throughput, not NCCL busbw','messages':out,'separate_us':count*(latency+small/bandwidth),'coalesced_us':latency+count*small/bandwidth}
    if case == 'retry-storm':
        requests=number(d,'requests',1,True);attempts=number(d,'attempts',1,True);lost=number(d,'lost_ack_requests',0,True)
        if lost>requests or attempts>100:raise ValueError('invalid retry bounds')
        # Each selected request commits successfully but its acknowledgement is lost on every nonfinal attempt.
        total=requests+lost*(attempts-1)
        return {'assumption':'lost acknowledgement after a committed side effect; final attempt acknowledged','attempts':total,'amplification':total/requests,'writes_without_deduplication':total,'writes_with_atomic_idempotency':requests,'duplicate_side_effects':total-requests,'budgeted_attempts_if_at_most_two':requests+lost*(min(attempts,2)-1)}
    if case == 'bounded-queue':
        arrivals=rows(d,'arrivals_per_tick');capacity=number(d,'service_per_tick',1,True);limit=number(d,'queue_limit',1,True);memory=number(d,'bytes_per_task',1,True)
        unbounded=bounded=peak_u=peak_b=rejected=served_u=served_b=0;timeline=[]
        for value in arrivals:
            n=number({'n':value},'n',0,True);unbounded+=n;accepted=min(n,max(0,limit-bounded));rejected+=n-accepted;bounded+=accepted
            peak_u=max(peak_u,unbounded);peak_b=max(peak_b,bounded)
            su=min(capacity,unbounded);sb=min(capacity,bounded);served_u+=su;served_b+=sb;unbounded-=su;bounded-=sb
            timeline.append({'unbounded_pending':unbounded,'bounded_pending':bounded,'rejected_this_tick':n-accepted})
        return {'ordering':'arrive, enforce total pending cap, then serve each tick','unbounded_peak_bytes':peak_u*memory,'bounded_peak_bytes':peak_b*memory,'rejected':rejected,'served_unbounded':served_u,'served_bounded':served_b,'remaining_unbounded':unbounded,'remaining_bounded':bounded,'timeline':timeline}
    if case == 'probe-confusion':
        threshold=number(d,'failure_threshold',1,True);startup=number(d,'startup_seconds',0,True);period=number(d,'period_seconds',1,True)
        early_failures=max(0,math.ceil(startup/period)-1)
        return {'readiness_failure_restarts':0,'readiness_routes_traffic':False,'initial_liveness_failures_before_ready':early_failures,'unguarded_liveness_restarts_before_ready':early_failures>=threshold,'startup_budget_seconds':threshold*period,'startup_budget_exceeds_load':threshold*period>startup,'hpa_inference':'readiness alone cannot prove HPA needs more replicas; inspect metric samples and decisions'}
    raise ValueError('unknown case')

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('case',choices=CASES);parser.add_argument('--input',type=Path);parser.add_argument('--out',type=Path,default=Path('out'));args=parser.parse_args()
    source=args.input or ROOT/'fixtures'/(args.case+'.json')
    try:
        raw=source.read_bytes()
        if len(raw)>1024*1024:raise ValueError('input limit is 1 MiB')
        data=json.loads(raw);result=analyze(args.case,data)
        report={'case':args.case,'evidence':'synthetic-cpu-analysis','input_sha256':hashlib.sha256(raw).hexdigest(),'result':result}
        args.out.mkdir(parents=True,exist_ok=True);target=args.out/'diagnosis.json';target.write_text(json.dumps(report,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False,allow_nan=False));print('Saved '+str(target))
    except (ValueError,KeyError,TypeError,OverflowError,OSError) as exc:
        print('Invalid input or output: '+str(exc),file=sys.stderr);return 2
    return 0
if __name__=='__main__':sys.exit(main())
