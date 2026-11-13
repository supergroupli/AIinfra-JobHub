#!/usr/bin/env python3
"""LMCache concepts; pure CPU state/size/cost models, not LMCache runtime."""
import hashlib
import json
import math
from common import positive, run


def cache_key(model,revision,namespace,tokens):
    payload=json.dumps([model,revision,namespace,list(tokens)],separators=(',',':')).encode()
    return hashlib.sha256(payload).hexdigest()


def full_chunks(tokens,chunk_size):
    if not isinstance(tokens,int) or tokens<0 or not isinstance(chunk_size,int) or chunk_size<=0:raise ValueError('nonnegative tokens and positive integer chunk size required')
    return tokens//chunk_size


def transfer_ms(size_mb,bandwidth_gbps,overhead_ms=0):
    if size_mb<0 or overhead_ms<0:raise ValueError('nonnegative size and overhead required')
    positive(bandwidth_gbps,'GB/s')
    return size_mb/bandwidth_gbps+overhead_ms


def day1(changed):
    return {'components':['inference engine','connector','cache server','storage backend'],'payload':'KV tensors, not generated text','case':'same text with different model revision must miss' if changed else 'same model/revision/token prefix may reuse','runtime':'not loaded'}

def day2(changed):
    expected={'torch':'2.14.0','connector':'LMCacheMPConnector','model':'supported-by-own-validation'}
    actual={'torch':'2.13.0' if changed else '2.14.0','connector':'LMCacheMPConnector','model':'supported-by-own-validation'}
    return {'expected':expected,'observed_fixture':actual,'compatible_in_this_fixture':actual==expected,'notice':'metadata exercise; no ABI or model compatibility proven'}

def day3(changed):
    baseline=cache_key('demo','revision-a','team-a',[1,2,3]);other=cache_key('demo','revision-b' if changed else 'revision-a','team-a',[1,2,3])
    return {'first_key':baseline,'second_key':other,'equal':baseline==other,'notice':'JSON/SHA-256 toy identity; real connector also tracks layouts and other configuration'}

def day4(changed):
    state={};records=[]
    for i in range(3):
        enabled=not changed;hit=enabled and 'prefix-a' in state
        records.append({'request':i,'cache_enabled':enabled,'retrieved_tokens':256 if hit else 0,'prefill_work_tokens':16 if hit else 272})
        if enabled:state['prefix-a']=True
    return {'trace':records,'retrieved_total':sum(r['retrieved_tokens'] for r in records),'notice':'retrieval counter is evidence of reuse in this toy, latency alone is not'}

def day5(changed):
    tokens=1000;chunk=128 if changed else 256;bytes_per_token=12288
    return {'tokens':tokens,'chunk_size':chunk,'full_chunks':full_chunks(tokens,chunk),'reusable_full_tokens':full_chunks(tokens,chunk)*chunk,'uncached_tail_tokens':tokens%chunk,'full_chunk_bytes':chunk*bytes_per_token,'notice':'full aligned chunks only in this lesson, no claim about every backend policy'}

def day6(changed):
    bandwidth=.5 if changed else 10
    restore=transfer_ms(200,bandwidth,5);recompute=100
    return {'payload_MB':200,'bandwidth_GBps':bandwidth,'restore_ms':restore,'recompute_ms':recompute,'beneficial':restore<recompute,'break_even_GBps':200/(recompute-5),'units':'decimal MB and GB/s'}

def day7(changed):
    # ABA avoidance: clients carry the immutable object generation, not just a key.
    object_record={'key':'prefix-a','generation':2,'payload':'new-kv'};client_generation=1 if changed else 2
    return {'object':object_record,'client_generation':client_generation,'accept':client_generation==object_record['generation'],'on_reject':'refetch metadata or recompute; never consume mismatched KV'}

def day8(changed):
    existing=not changed
    return {'mode':'lookup-and-reuse' if existing else 'produce-then-transfer','has_existing_object':existing,'producer_prefill_ms':0 if existing else 40,'transfer_ms':20,'consumer_decode_ms':80,'critical_path_ms':100 if existing else 140,'notice':'cache reuse and PD transport are separate mechanisms'}

def day9(changed):
    records=[]
    for backend_ok in [True,False,True]:
        fallback=not backend_ok and not changed
        records.append({'backend_ok':backend_ok,'fallback_recompute':fallback,'status':'ok' if backend_ok or fallback else 'error','cost_ms':25 if backend_ok else 105 if fallback else 5})
    return {'trace':records,'failures':sum(x['status']=='error' for x in records),'notice':'failure policy trades availability and recompute work; no unconditional silent retry'}

def selfcheck():
    assert full_chunks(1000,256)==3 and full_chunks(0,256)==0
    assert day3(False)['equal'] and not day3(True)['equal']
    assert day4(False)['retrieved_total']==512 and day4(True)['retrieved_total']==0
    assert day5(True)['uncached_tail_tokens']==104
    assert transfer_ms(200,10,5)==25
    assert day6(True)['restore_ms']==405
    assert not day7(True)['accept']
    assert day9(True)['failures']==1

if __name__=='__main__':run('LMCache',[day1,day2,day3,day4,day5,day6,day7,day8,day9],selfcheck)
