#!/usr/bin/env python3
"""Collective semantics and an alpha-beta ring model; no NCCL measurements."""
import argparse,csv,hashlib,json,platform
from pathlib import Path

def allreduce(vectors):
    if not vectors or not vectors[0] or any(len(v)!=len(vectors[0]) for v in vectors):raise ValueError('same nonempty count on each rank required')
    result=[sum(v[i] for v in vectors) for i in range(len(vectors[0]))]
    return [result[:] for _ in vectors]
def bandwidth(size_bytes,time_ms,ranks):
    if size_bytes<0 or time_ms<=0 or ranks<2:raise ValueError('bytes>=0, time>0, ranks>=2 required')
    alg=size_bytes/(time_ms/1000)/1e9
    return {'algbw_GBs':alg,'busbw_GBs':alg*2*(ranks-1)/ranks}
def ring_time(size_bytes,ranks=4,alpha_us=5,beta_GBs=25):
    if size_bytes<0 or ranks<2 or alpha_us<0 or beta_GBs<=0:raise ValueError('invalid ring parameters')
    startup=2*(ranks-1)*alpha_us/1000;transfer=2*(ranks-1)/ranks*size_bytes/(beta_GBs*1e9)*1000
    return {'startup_ms':startup,'transfer_ms':transfer,'total_ms':startup+transfer}
def experiment(day):
    if day==1:
        x=[[1,2],[3,4]];reduced=allreduce(x);return {'inputs':x,'sum':reduced,'average':[[v/2 for v in r] for r in reduced],'allgather':[1,2,3,4]}
    if day==2:return {'world_size':4,'hosts':['a','a','b','b'],'global_ranks':[0,1,2,3],'local_ranks':[0,1,0,1],'device_indices':[0,1,0,1],'boundary':'example mapping; global rank is not a per-host device index'}
    if day==3:return {'payload_MB':100,'paths':[{'link_GBs':bw,'serialization_ms':100e6/(bw*1e9)*1000} for bw in (25,50,100)],'boundary':'ideal decimal units; topology and contention are omitted'}
    if day==4:
        rows=[{'bytes':s,**ring_time(s)} for s in (1024,1048576,16777216)];return {'evidence':'synthetic alpha-beta','ranks':4,'alpha_us':5,'beta_GBs':25,'rows':rows}
    if day==5:return {'bytes':100000000,'duration_ms':10,'ranks':4,**bandwidth(100000000,10,4),'notice':'busbw is normalized traffic accounting, not another stopwatch'}
    if day==6:return {'rows':[{'bytes':s,**ring_time(s)} for s in (1024,1024**2,16*1024**2,64*1024**2)],'boundary':'ring is one model; NCCL may choose other algorithms/protocols'}
    if day==7:return {'compute_ms':40,'comm_ms':25,'sequential_ms':65,'ideal_full_overlap_ms':40,'speedup_upper_bound':65/40,'boundary':'dependencies and contention can prevent full overlap'}
    if day==8:
        return {'unfused_4_calls_ms':4*ring_time(1024**2)['total_ms'],'fused_1_call_ms':ring_time(4*1024**2)['total_ms'],'same_payload_bytes':4*1024**2,'warning':'fusion may delay readiness and reduce overlap; model ignores that cost'}
    if day==9:
        bad=False
        try:allreduce([[1,2],[3]])
        except ValueError:bad=True
        return {'count_mismatch_detected':bad,'compatible_output':allreduce([[1,2],[3,4]]),'diagnosis_order':['rank/device mapping','matching count/dtype/order','small local test','topology and logs'],'boundary':'do not deliberately hang real ranks; incompatible data is rejected offline'}
    raise ValueError('day must be 1..9')
def selfcheck():
    assert allreduce([[1,2],[3,4]])==[[4,6],[4,6]]
    assert bandwidth(100000000,10,4)=={'algbw_GBs':10.0,'busbw_GBs':15.0}
    assert abs(ring_time(0)['total_ms']-.03)<1e-12
    assert experiment(8)['unfused_4_calls_ms']>experiment(8)['fused_1_call_ms']
    return 'PASS: collectives, byte units, normalization, startup and fusion'
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('day',choices=['selfcheck']+['day'+str(i) for i in range(1,11)]);p.add_argument('--out',default='out');a=p.parse_args()
    if a.day=='selfcheck':print(selfcheck());return
    out=Path(a.out);out.mkdir(parents=True,exist_ok=True);rows=[]
    for day in (range(1,10) if a.day=='day10' else [int(a.day[3:])]):
        result={'day':day,'evidence':'CPU semantics / synthetic cost model; no NCCL execution',**experiment(day)};path=out/f'day{day:02d}.json';path.write_text(json.dumps(result,indent=2)+'\n');rows.append({'day':day,'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()});print(json.dumps(result))
    if a.day=='day10':
        with (out/'manifest.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=['day','file','sha256']);w.writeheader();w.writerows(rows)
        (out/'REPORT.md').write_text('# Collective communication portfolio / 通信作品\n\nPython '+platform.python_version()+'; no GPU/NCCL measurement.\n\n## Question / 问题\nTODO: Explain rank count, message bytes, latency and bandwidth convention.\n\n## Contribution / 本人贡献\nTODO: Explain student.py and one changed model parameter.\n\n## Evidence / 证据\nJSON and manifest.csv; keep failures.\n\n## Counterexample / 反例\nTODO: Explain why a larger message or fusion is not always better.\n\n## Limits / 局限\nAlpha-beta values are assumptions. busbw is normalized, not an independent speed.\n\n## Next / 下一步\nOptional collective_gpu.py requires two NVIDIA GPUs; record actual NCCL version and topology.\n')
        print('REPORT.md and manifest.csv written')
if __name__=='__main__':main()
