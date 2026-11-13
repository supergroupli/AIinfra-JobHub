#!/usr/bin/env python3
"""Distributed training semantics using CPU scalars; not a DDP/FSDP runtime."""
import argparse,csv,hashlib,json,math,platform,random
from pathlib import Path

def gradient(weight,xs,ys):
    if not xs or len(xs)!=len(ys):raise ValueError('equal nonempty samples required')
    return sum(2*x*(weight*x-y) for x,y in zip(xs,ys))/len(xs)
def train(steps,weight=0.0,start=0):
    logs=[]
    for step in range(start,start+steps):
        g=gradient(weight,[1,2],[2,4]);weight-=.1*g;logs.append({'step':step,'weight':weight,'gradient':g})
    return weight,logs

def shard_indices(n,world,epoch=0,drop=False):
    if n<0 or world<1:raise ValueError('nonnegative count and positive world required')
    ids=list(range(n));random.Random(epoch).shuffle(ids)
    total=(n//world)*world if drop else math.ceil(n/world)*world
    if total>n and n:ids=(ids*math.ceil(total/n))[:total]
    else:ids=ids[:total]
    return [ids[r:total:world] for r in range(world)]
def memory(parameters,world):
    if parameters<0 or world<1:raise ValueError('invalid dimensions')
    return {'replicated_bytes_per_rank':parameters*16,'ideal_sharded_persistent_bytes_per_rank':parameters*16/world,'boundary':'FP32 weights 4 + gradients 4 + Adam states 8; excludes activations, temporary gathers, buckets, padding and allocator overhead'}
def experiment(day):
    if day==1:
        w,logs=train(4);return {'weight':w,'loss':sum((w*x-y)**2 for x,y in zip([1,2],[2,4]))/2,'trace':logs}
    if day==2:return {'local_values':[1,2,3,4],'allreduce_sum':[10]*4,'allgather':[1,2,3,4],'warning':'all ranks enter collectives in compatible order'}
    if day==3:
        local=[gradient(0,[1],[2]),gradient(0,[2],[4])];return {'local_mean_gradients':local,'rank_average':sum(local)/2,'global_mean':gradient(0,[1,2],[2,4]),'weight_after_update':1.0}
    if day==4:return {'padded':shard_indices(5,2),'dropped':shard_indices(5,2,drop=True),'epoch1':shard_indices(5,2,epoch=1),'padded_total':6,'dropped_total':4}
    if day==5:return {'world_size':2,'global_ranks':[0,1],'local_ranks':[0,1],'step_times_ms':[40,90],'synchronous_step_lower_bound_ms':90,'boundary':'slowest-rank model, not measured distributed timing'}
    if day==6:
        gs=[gradient(0,[1],[2]),gradient(0,[2],[4])];return {'microbatch_gradients':gs,'scaled_sum':sum(g/2 for g in gs),'unscaled_sum':sum(gs),'global_gradient':gradient(0,[1,2],[2,4]),'unequal_batches_note':'weight each mean by its sample count'}
    if day==7:return {'single_step_ms':100,'two_rank_compute_ms':55,'unhidden_communication_ms':15,'two_rank_total_ms':70,'speedup':100/70,'efficiency':100/70/2,'boundary':'illustrative times at a fixed global workload; not measurement'}
    if day==8:return {'parameters':1000000,'world_size':4,**memory(1000000,4)}
    if day==9:
        full,_=train(6);w,a=train(3);checkpoint={'weight':w,'next_step':3,'optimizer':'stateless SGD','lr':.1};resumed,b=train(3,checkpoint['weight'],checkpoint['next_step']);return {'checkpoint':checkpoint,'full_weight':full,'resumed_weight':resumed,'match':full==resumed,'state_note':'real momentum/Adam needs optimizer tensors; also save sampler epoch, RNG, scheduler and AMP scaler where applicable'}
    raise ValueError('day must be 1..9')
def selfcheck():
    assert gradient(0,[1,2],[2,4])==-10
    assert sum(map(len,shard_indices(5,2)))==6
    assert sum(map(len,shard_indices(5,2,drop=True)))==4
    assert experiment(9)['match']
    assert memory(1000000,4)['ideal_sharded_persistent_bytes_per_rank']==4000000
    return 'PASS: global gradient, sampler padding, drop policy, resume, memory'
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('day',choices=['selfcheck']+['day'+str(i) for i in range(1,11)]);p.add_argument('--out',default='out');a=p.parse_args()
    if a.day=='selfcheck':print(selfcheck());return
    out=Path(a.out);out.mkdir(parents=True,exist_ok=True);rows=[]
    for day in (range(1,10) if a.day=='day10' else [int(a.day[3:])]):
        value={'day':day,'evidence':'CPU algebra / design, not torch.distributed execution',**experiment(day)};path=out/f'day{day:02d}.json';path.write_text(json.dumps(value,indent=2)+'\n');rows.append({'day':day,'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()});print(json.dumps(value))
    if a.day=='day10':
        with (out/'manifest.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=['day','file','sha256']);w.writeheader();w.writerows(rows)
        (out/'REPORT.md').write_text('# Distributed training portfolio / 分布式训练作品\n\nPython '+platform.python_version()+'; CPU algebra only, no DDP/FSDP/GPU timing.\n\n## Question / 问题\nTODO: Explain equivalent global gradients and sample weighting.\n\n## Contribution / 个人贡献\nTODO: Link student.py changes and boundary checks.\n\n## Data / 数据\nJSON plus manifest.csv. Explain padded/dropped samples.\n\n## Recovery / 恢复\nTODO: Compare interrupted and uninterrupted runs; list saved state.\n\n## Limits / 局限\nMemory excludes activations and transient gathers. Real DDP example in ddp_example.py is optional and unmeasured here.\n')
        print('REPORT.md and manifest.csv written')
if __name__=='__main__':main()
