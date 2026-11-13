#!/usr/bin/env python3
"""SGLang concepts, implemented as explicit CPU teaching models."""
import math
from collections import OrderedDict
from common import positive, run


def prefix_length(a,b):
    size=0
    for left,right in zip(a,b):
        if left!=right: break
        size+=1
    return size


def validate_request(request):
    if not isinstance(request,dict): return 400
    if request.get('model')!='teaching-model':return 404
    messages=request.get('messages')
    if not isinstance(messages,list) or not messages or any(not isinstance(m,dict) or not isinstance(m.get('content'),str) for m in messages):return 400
    return 200


def nearest_rank(values,p=.95):
    if not 0<p<=1:raise ValueError('p must be in (0,1]')
    values=sorted(values)
    return values[math.ceil(len(values)*p)-1] if values else None


def lru(keys,capacity):
    if not isinstance(capacity,int) or capacity<1:raise ValueError('positive integer capacity required')
    cache=OrderedDict();rows=[]
    for key in keys:
        hit=key in cache;evicted=None
        if hit:cache.move_to_end(key)
        else:
            cache[key]=True
            if len(cache)>capacity:evicted=cache.popitem(last=False)[0]
        rows.append({'key':key,'hit':hit,'evicted':evicted,'resident':list(cache)})
    return rows


def day1(changed):
    components=['HTTP adapter','tokenizer','scheduler','model executor','response']
    return {'components':components,'engine_release':'0.5.23','not_installed_here':True,'scenario':'invalid model is rejected before execution' if changed else 'valid request crosses five stages'}

def day2(changed):
    good={'model':'teaching-model','messages':[{'role':'user','content':'Explain a queue.'}]}
    requests=[good,{'model':'wrong','messages':good['messages']},{'model':'teaching-model'},[]]
    if changed: requests.append({'model':'teaching-model','messages':[{'content':None}]})
    return {'status_codes':[validate_request(x) for x in requests],'notice':'offline protocol model, not an SGLang server'}

def day3(changed):
    short=[10,12,14,16];long=[70,90]
    if changed:long=[70,90,110,130]
    return {'short_p95_ms':nearest_rank(short),'long_p95_ms':nearest_rank(long),'overall_p95_ms':nearest_rank(short+long),'short_count':len(short),'long_count':len(long),'synthetic':True}

def day4(changed):
    rows=lru(['A','B','A','C','B'],3 if changed else 2)
    return {'common_prefix_tokens':prefix_length([10,20,30,40],[10,20,31]),'capacity':3 if changed else 2,'trace':rows,'hits':sum(x['hit'] for x in rows),'notice':'whole-entry LRU, not actual radix-tree eviction'}

def day5(changed):
    input_tokens=1024;chunk=128 if changed else 256;decode_quantum_ms=5
    return {'input_tokens':input_tokens,'chunk_tokens':chunk,'prefill_chunks':math.ceil(input_tokens/chunk),'assumed_prefill_ms_per_chunk':chunk*.1,'max_single_prefill_block_ms':chunk*.1,'interleaving_overhead_ms':(math.ceil(input_tokens/chunk)-1)*decode_quantum_ms,'notice':'toy alternating chunks, not the SGLang scheduling algorithm'}

def day6(changed):
    values=[-.95,-.31,.02,.47,1.0] if not changed else [0.,1.]
    rows=[]
    for bits in [4,8]:
        scale=max(map(abs,values))/(2**(bits-1)-1) or 1
        reconstructed=[round(v/scale)*scale for v in values]
        rows.append({'bits':bits,'max_abs_error':max(abs(a-b) for a,b in zip(values,reconstructed))})
    return {'values':values,'rows':rows,'notice':'scalar quantization; no model quality or kernel speed claim'}

def day7(changed):
    gpu_hit=.5;cpu_conditional_hit=.2 if changed else .8
    # Sequential lookups: CPU cost paid after GPU miss, recompute after both miss.
    expected=1+(1-gpu_hit)*(10+(1-cpu_conditional_hit)*100)
    return {'gpu_hit':gpu_hit,'cpu_hit_given_gpu_miss':cpu_conditional_hit,'expected_ms':expected,'all_gpu_miss_ms':10+(1-cpu_conditional_hit)*100,'notice':'toy sequential lookup costs, no overlap'}

def day8(changed):
    bandwidth=1 if changed else 10;payload_gb=.2;transfer_ms=payload_gb/bandwidth*1000
    return {'prefill_ms':40,'decode_ms':80,'transfer_ms':transfer_ms,'isolated_colocated_ms':120,'isolated_split_ms':120+transfer_ms,'pipeline_ceiling_requests_per_s':min(1000/40,1000/80,1000/transfer_ms),'notice':'ideal throughput bound; ignores contention and fixed total hardware budget'}

def day9(changed):
    states=['ok','timeout','error','ok'] if not changed else ['timeout','error']
    successful=[20,30] if not changed else []
    return {'total':len(states),'successes':states.count('ok'),'failures':len(states)-states.count('ok'),'success_rate':states.count('ok')/len(states),'successful_p95_ms':nearest_rank(successful),'recovery_action':'validate request, then retry once after recovery; do not drop failed rows'}

def selfcheck():
    assert prefix_length([1,2],[1,3])==1
    assert validate_request([])==400
    assert day4(False)['hits']==1 and day4(True)['hits']==2
    assert day5(True)['max_single_prefill_block_ms']<day5(False)['max_single_prefill_block_ms']
    assert day5(True)['interleaving_overhead_ms']>day5(False)['interleaving_overhead_ms']
    assert abs(day7(False)['expected_ms']-16)<1e-9
    assert day8(True)['pipeline_ceiling_requests_per_s']==5
    assert day9(True)['successful_p95_ms'] is None

if __name__=='__main__':run('SGLang',[day1,day2,day3,day4,day5,day6,day7,day8,day9],selfcheck)
