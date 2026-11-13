#!/usr/bin/env python3
"""Python 3.9+ data-path teaching lab. No Mooncake/RDMA measurements are claimed."""
import argparse, csv, hashlib, json, platform, socket, struct, threading, time
from pathlib import Path

def recv_exact(sock, count):
    if count<0:raise ValueError('count must be nonnegative')
    chunks=[]; remaining=count
    while remaining:
        chunk=sock.recv(min(65536,remaining))
        if not chunk: raise EOFError('peer closed before all announced bytes arrived')
        chunks.append(chunk);remaining-=len(chunk)
    return b''.join(chunks)

def tcp_roundtrip(size=65536):
    if not 1 <= size <= 1048576: raise ValueError('size must be 1..1048576 bytes')
    payload=bytes(i%251 for i in range(size)); result={}; errors=[]
    server=socket.socket();server.settimeout(3)
    try:server.bind(('127.0.0.1',0));server.listen(1)
    except Exception:
        server.close();raise
    port=server.getsockname()[1]
    def receiver():
        try:
            with server.accept()[0] as conn:
                conn.settimeout(3);n=struct.unpack('!I',recv_exact(conn,4))[0]
                if n>1048576:raise ValueError('frame too large')
                received=recv_exact(conn,n);result['received_bytes']=len(received)
                digest=hashlib.sha256(received).digest();conn.sendall(digest)
        except Exception as e:errors.append(e)
    worker=threading.Thread(target=receiver,daemon=True);worker.start();start=time.perf_counter()
    try:
        with socket.create_connection(('127.0.0.1',port),timeout=3) as client:
            client.sendall(struct.pack('!I',size)+payload);reply=recv_exact(client,32)
    finally:
        worker.join(4);server.close()
    if errors:raise errors[0]
    if worker.is_alive():raise TimeoutError('receiver did not finish')
    elapsed=time.perf_counter()-start
    result.update(evidence='measured-local-tcp',bytes=size,sha256=reply.hex(),verified=reply==hashlib.sha256(payload).digest(),elapsed_s=elapsed,goodput_MiB_s=size/(2**20)/elapsed,boundary='One process/two threads, loopback TCP; includes connect and checksum reply. Not Mooncake, RDMA or network-link bandwidth.')
    return result

def transfer_ms(size_bytes, bandwidth_GB_s, fixed_ms=0.2):
    if size_bytes<0 or bandwidth_GB_s<=0 or fixed_ms<0:raise ValueError('invalid transfer model inputs')
    return fixed_ms+size_bytes/(bandwidth_GB_s*1e9)*1000

def key(namespace,model,tokens): return namespace,model,tuple(tokens)
def replicas(logical_gib,copies,reserve=.2):
    if logical_gib<0 or copies<1 or not 0<=reserve<1:raise ValueError('invalid capacity inputs')
    return logical_gib*copies/(1-reserve)

def experiment(day):
    if day==1:return {'evidence':'design','transfer':['register','submit','complete','release'],'store':['identify','put','locate','get'],'payload_sha256':hashlib.sha256(b'KV-example').hexdigest()}
    if day==2:return tcp_roundtrip()
    if day==3:
        mutable=bytearray(b'ABC');borrowed=mutable;owned=bytes(mutable);mutable[0]=90
        return {'evidence':'simulated','borrowed_after_mutation':borrowed.decode(),'owned_snapshot':owned.decode(),'states':['registered','submitted','completed','released'],'rule':'Keep borrowed buffers alive and unchanged until completion.'}
    if day==4:
        objects={};k=key('team-a','model-v1',[1,2]);objects[k]=b'KV';hit=objects.get(k);del objects[k]
        return {'evidence':'simulated','put_bytes':len(hit),'hit':hit.decode(),'after_delete':objects.get(k),'missing_is_not_empty':objects.get(key('team-a','model-v1',[9])) is None}
    if day==5:return {'evidence':'design','rows':[{'bytes':s,'bandwidth_GB_s':b,'time_ms':transfer_ms(s,b)} for s in (1_000_000,100_000_000) for b in (1,10)],'assumption':'decimal GB/s; fixed overhead=0.2 ms; no contention/overlap'}
    if day==6:return {'evidence':'design','logical_gib':8,'copies':2,'reserve_fraction':.2,'required_physical_gib':replicas(8,2),'placement':{'node-a':8,'node-b':8},'notice':'Replication across named nodes does not itself prove failure-domain independence.'}
    if day==7:return {'evidence':'design','producer':{'model':'toy-v1','dtype':'fp16','layout':'dense','tokens':[1,2,3]},'consumer':{'model':'toy-v2','dtype':'fp16','layout':'dense','tokens':[1,2,3]},'compatible':False,'fallback':'recompute on identity/layout mismatch; never interpret incompatible bytes as KV'}
    if day==8:return {'evidence':'simulated','same_tenant':key('a','v1',[1])==key('a','v1',[1]),'other_tenant':key('a','v1',[1])==key('b','v1',[1]),'expired_at_12':12>=10,'note':'Namespace partition is a keying example, not authentication or access control.'}
    if day==9:
        announced=8;received=b'abc';retry_id='write-17';seen=set();applied=0
        for attempt in (retry_id,retry_id):
            if attempt not in seen:applied+=1;seen.add(attempt)
        return {'evidence':'simulated','announced_bytes':announced,'received_bytes':len(received),'status':'truncated','apply_count':applied,'attempts':2,'notice':'In-memory deduplication is lost on process failure.'}
    raise ValueError('unknown day')

def save(out,day,result):
    out.mkdir(parents=True,exist_ok=True);p=out/f'day{day:02d}.json';p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(p.name,json.dumps(result,ensure_ascii=False))

def selfcheck():
    assert transfer_ms(100_000_000,10)==10.2
    assert replicas(8,2)==20
    assert key('a','v1',[1])!=key('b','v1',[1])
    assert experiment(3)['owned_snapshot']=='ABC'
    assert experiment(9)['apply_count']==1
    print('PASS: transfer units, capacity, identity, lifetime and deduplication')

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('command',choices=['selfcheck']+[f'day{i}' for i in range(1,11)]);p.add_argument('--out',default='out');a=p.parse_args();out=Path(a.out)
    if a.command=='selfcheck':selfcheck();return
    day=int(a.command[3:])
    if day<10:save(out,day,experiment(day));return
    for d in range(1,10):save(out,d,experiment(d))
    with (out/'summary.csv').open('w',newline='') as f:
        w=csv.writer(f);w.writerow(['day','evidence','sha256'])
        for d in range(1,10):
            raw=(out/f'day{d:02d}.json').read_bytes();w.writerow([d,json.loads(raw)['evidence'],hashlib.sha256(raw).hexdigest()])
    (out/'environment.json').write_text(json.dumps({'python':platform.python_version(),'source_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},indent=2))
    (out/'REPORT.md').write_text('# Mooncake data-path learning portfolio / 数据通路作品\n\nOnly day 2 measures localhost TCP; other results are models/designs, not Mooncake or RDMA.\n仅第2天测量本机TCP，其他为模型/设计，不是Mooncake或RDMA性能。\n\n## My change / 本人改动\nTODO: link your independent student.py implementation and one changed variable.\n\n## Explain / 解释\nTODO: distinguish transfer correctness, Store semantics and integration compatibility.\n\n## Evidence and limitations / 证据与局限\nAttach day JSON, summary.csv and environment.json. Explain connect/checksum overhead, namespaces versus authorization, and a failed transfer.\n')
    print('REPORT.md ready; fill your own contribution and interpretation')
if __name__=='__main__':main()
