#!/usr/bin/env python3
"""Dynamo concepts: routing, pipeline, lifecycle and SLO teaching models."""
import math
from common import positive,run


def goodput(rows,slo_ms):
    positive(slo_ms,'SLO')
    if not rows:return None
    return sum(r['status']=='ok' and r['latency_ms']<=slo_ms for r in rows)/len(rows)


def choose_worker(queues,prefix_savings):
    if not queues or len(queues)!=len(prefix_savings):raise ValueError('nonempty aligned arrays required')
    # Predicted queue plus work after cache reuse. Fixed no-cache work=40ms.
    scores=[q+max(0,40-s) for q,s in zip(queues,prefix_savings)]
    return min(range(len(scores)),key=lambda i:(scores[i],i)),scores


def pd_capacity(prefill_ms,decode_ms,transfer_ms,p_workers,d_workers):
    for value in [prefill_ms,decode_ms,transfer_ms,p_workers,d_workers]:positive(value)
    return min(p_workers*1000/prefill_ms,d_workers*1000/decode_ms,1000/transfer_ms)


def day1(changed):
    return {'request_plane':['frontend','router','worker'],'control_plane':['discovery','planner','lifecycle'],'data_plane':['KV producer','transport','KV consumer'],'case':'worker crash changes membership before routing resumes' if changed else 'one request has control and data dependencies','runtime':'not loaded'}

def day2(changed):
    workers={'worker-a':'ready','worker-b':'starting' if changed else 'ready'}
    return {'workers':workers,'eligible':[w for w,s in workers.items() if s=='ready'],'requests':4,'rule':'registered does not mean ready; exclude starting workers'}

def day3(changed):
    rows=[{'id':1,'status':'ok','latency_ms':40},{'id':2,'status':'ok','latency_ms':80},{'id':3,'status':'ok','latency_ms':120},{'id':4,'status':'error','latency_ms':10}]
    target=100 if not changed else 60
    return {'trace':rows,'slo_ms':target,'goodput_fraction':goodput(rows,target),'success_fraction':.75,'notice':'fraction of all requests meeting SLO; not requests/sec'}

def day4(changed):
    queues=[100 if changed else 10,0];savings=[35,0];selected,scores=choose_worker(queues,savings)
    return {'queue_ms':queues,'cache_saved_ms':savings,'predicted_completion_ms':scores,'selected_worker':selected,'notice':'known-state model; real router state can be stale'}

def day5(changed):
    transfer=200 if changed else 20
    return {'prefill_ms':40,'decode_ms':80,'transfer_ms':transfer,'p_workers':1,'d_workers':1,'ideal_requests_per_s':pd_capacity(40,80,transfer,1,1),'isolated_request_ms':40+80+transfer,'notice':'ideal pipeline ceiling, no batching or contention; compares fixed 1P+1D resources'}

def day6(changed):
    events=[{'seq':1,'worker':'a','state':'ready'},{'seq':2,'worker':'a','state':'removed'}]
    if changed:events.append({'seq':1,'worker':'a','state':'ready'})
    latest={};ignored=0
    for e in events:
        if e['seq']>latest.get(e['worker'],{'seq':-1})['seq']:latest[e['worker']]=e
        else:ignored+=1
    return {'events':events,'latest':latest,'ignored_stale_events':ignored,'notice':'sequence numbers are toy lifecycle generations, not Dynamo event wire format'}

def day7(changed):
    arrivals_per_tick=[5,15,15,15,5];ready_at=4 if changed else 2;backlog=0;trace=[]
    for tick,arrivals in enumerate(arrivals_per_tick):
        replicas=2 if tick>=ready_at else 1;capacity=replicas*10
        backlog=max(0,backlog+arrivals-capacity);trace.append({'tick':tick,'arrivals':arrivals,'ready_replicas':replicas,'backlog':backlog})
    return {'trace':trace,'maximum_backlog':max(x['backlog'] for x in trace),'scale_requested_at':1,'new_replica_ready_at':ready_at,'notice':'a replica request adds capacity only after readiness'}

def day8(changed):
    spec={'replicas':2,'gpu_per_replica':1,'node_gpu_capacity':1 if changed else 4,'readiness_probe':True}
    return {'spec':spec,'requested_gpu':2,'fits_capacity':2<=spec['node_gpu_capacity'],'notice':'resource arithmetic only; not a Kubernetes scheduler or a validated Dynamo CRD'}

def day9(changed):
    events=['admit','allocate','cancel','release','late_completion'] if not changed else ['admit','allocate','cancel','late_completion']
    allocated=False;released=0
    for event in events:
        if event=='allocate':allocated=True
        elif event=='release' and allocated:allocated=False;released+=1
    return {'events':events,'resources_held':int(allocated),'releases':released,'leak_detected':allocated,'notice':'cancel alone does not prove cleanup; a late completion must not double-release'}

def selfcheck():
    assert goodput([],100) is None
    assert day3(False)['goodput_fraction']==.5 and day3(True)['goodput_fraction']==.25
    assert day4(False)['selected_worker']==0 and day4(True)['selected_worker']==1
    assert day5(False)['ideal_requests_per_s']==12.5 and day5(True)['ideal_requests_per_s']==5
    assert day6(True)['latest']['a']['state']=='removed'
    assert day7(True)['maximum_backlog']>day7(False)['maximum_backlog']
    assert day9(True)['leak_detected'] and not day9(False)['leak_detected']

if __name__=='__main__':run('NVIDIA Dynamo',[day1,day2,day3,day4,day5,day6,day7,day8,day9],selfcheck)
