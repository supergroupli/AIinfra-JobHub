#!/usr/bin/env python3
"""Standard-library kernel reasoning labs; no Triton/GPU execution."""
import argparse,csv,hashlib,json,math,platform,statistics,time
from pathlib import Path

def tiles(n,block):
    if not isinstance(n,int) or n<0 or not isinstance(block,int) or block<1:raise ValueError('n>=0, block>=1 integers required')
    return [{'pid':p,'offsets':list(range(p*block,(p+1)*block)),'valid':[i<n for i in range(p*block,(p+1)*block)]} for p in range((n+block-1)//block)]
def add(x,y,block=4):
    if len(x)!=len(y):raise ValueError('equal lengths required')
    out=[None]*len(x)
    for tile in tiles(len(x),block):
        for i,valid in zip(tile['offsets'],tile['valid']):
            if valid:out[i]=x[i]+y[i]
    return out

def softmax(x):
    if not x or not all(math.isfinite(v) for v in x):raise ValueError('nonempty finite row required')
    e=[math.exp(v-max(x)) for v in x];total=sum(e);return [v/total for v in e]
def layer_norm(x,eps=1e-5):
    if not x or eps<=0:raise ValueError('nonempty row and positive epsilon required')
    mean=sum(x)/len(x);var=sum((v-mean)**2 for v in x)/len(x)
    return [(v-mean)/math.sqrt(var+eps) for v in x]
def matmul(a,b,block=2):
    m,k=len(a),len(a[0]);n=len(b[0]);out=[[0]*n for _ in range(m)]
    if len(b)!=k or any(len(r)!=k for r in a) or any(len(r)!=n for r in b):raise ValueError('rectangular compatible matrices required')
    for i0 in range(0,m,block):
        for j0 in range(0,n,block):
            for k0 in range(0,k,block):
                for i in range(i0,min(m,i0+block)):
                    for j in range(j0,min(n,j0+block)):
                        out[i][j]+=sum(a[i][t]*b[t][j] for t in range(k0,min(k,k0+block)))
    return out

def experiment(day):
    if day==1:return {'tiles':tiles(10,4),'programs':3,'boundary':'offset lists describe logical lanes, not CUDA threads'}
    if day==2:return {'lengths':{str(n):add(list(range(n)),[1]*n) for n in (0,1,4,5,10)},'masked_lanes_at_10':2}
    if day==3:
        x=[.1,.2,.3];actual=[v+1e-7 for v in x]
        return {'exact_equal':actual==x,'allclose':all(abs(a-b)<=1e-6+1e-5*abs(b) for a,b in zip(actual,x)),'finite':all(math.isfinite(v) for v in actual),'rule':'absolute_error <= atol + rtol*abs(reference)'}
    if day==4:
        p=softmax([1000,1001,1002]);return {'input':[1000,1001,1002],'probabilities':p,'sum':sum(p),'shift_invariant':all(abs(a-b)<1e-12 for a,b in zip(p,softmax([0,1,2])))}
    if day==5:return {'normal':layer_norm([1,2,3]),'constant':layer_norm([7,7,7]),'epsilon':1e-5,'variance_divisor':'N, not N-1'}
    if day==6:
        a=[[1,2,3],[4,5,6]];b=[[1,0],[0,1],[1,1]]
        return {'a':a,'b':b,'product':matmul(a,b),'reference':[[4,5],[10,11]],'tiling':'edge K tile has one valid element'}
    if day==7:
        rows=[]
        for block in (4,8,16):
            count=(17+block-1)//block;rows.append({'block':block,'programs':count,'valid':17,'allocated_lanes':count*block,'wasted_lanes':count*block-17,'correct':add(list(range(17)),[1]*17,block)==list(range(1,18))})
        return {'candidates':rows,'notice':'padding is a shape model, not a speed ranking'}
    if day==8:
        rows=[]
        for _ in range(5):
            start=time.perf_counter();out=add(list(range(1000)),[1]*1000,64);elapsed=(time.perf_counter()-start)*1000
            assert out[-1]==1000;rows.append(elapsed)
        return {'evidence':'measured CPU Python only','samples_ms':rows,'median_ms':statistics.median(rows),'minimum_ms':min(rows),'notice':'not a GPU kernel benchmark; Python allocations are included'}
    if day==9:
        rejected=False
        try:add([1],[1,2])
        except ValueError:rejected=True
        return {'mismatched_lengths_rejected':rejected,'empty_output':add([],[]),'contract':['equal sizes','finite-value validation defined by caller','contiguous GPU example only']}
    raise ValueError('day must be 1..9')

def selfcheck():
    assert add(list(range(5)),[1]*5)==[1,2,3,4,5]
    assert add([],[])==[] and len(tiles(10,4))==3
    assert abs(sum(softmax([1000,1001,1002]))-1)<1e-12
    assert layer_norm([7,7,7])==[0,0,0]
    assert experiment(6)['product']==[[4,5],[10,11]]
    return 'PASS: mask, empty input, stable softmax, epsilon, matrix edges'

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('day',choices=['selfcheck']+['day'+str(i) for i in range(1,11)]);p.add_argument('--out',default='out');args=p.parse_args()
    if args.day=='selfcheck':print(selfcheck());return
    folder=Path(args.out);folder.mkdir(parents=True,exist_ok=True);days=range(1,10) if args.day=='day10' else [int(args.day[3:])]
    rows=[]
    for day in days:
        value={'day':day,'evidence':'CPU semantic model; not Triton execution',**experiment(day)};path=folder/f'day{day:02d}.json';path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');rows.append({'day':day,'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()});print(json.dumps(value,ensure_ascii=False))
    if args.day=='day10':
        with (folder/'manifest.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=['day','file','sha256']);w.writeheader();w.writerows(rows)
        (folder/'REPORT.md').write_text('# Triton learning portfolio / 学习作品\n\nPython: '+platform.python_version()+'\n\nCPU models only; day8 is local CPU timing, no GPU results. / CPU教学模型，未测GPU。\n\n## My contribution / 我的贡献\nTODO: Explain student.py implementation and one parameter change.\n\n## Correctness / 正确性\nTODO: Include empty, nonmultiple, large-value cases and tolerances.\n\n## Evidence / 证据\nRaw day JSON + manifest.csv.\n\n## Limits / 局限\nPadding does not predict GPU speed.\n\n## Next / 下一步\nTODO: Record kernel_gpu.py environment and real results only after running.\n')
        print('REPORT.md and manifest.csv written; fill your own contribution / 请填写个人贡献')
if __name__=='__main__':main()
