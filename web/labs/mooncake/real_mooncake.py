#!/usr/bin/env python3
"""Optional real Mooncake Store TCP example; see README prerequisites. Not RDMA."""
import hashlib, importlib.metadata, json
from mooncake.store import MooncakeDistributedStore

def main():
    version=importlib.metadata.version('mooncake-transfer-engine-non-cuda')
    if version!='0.3.14':raise SystemExit('This example targets non-CUDA Mooncake 0.3.14')
    store=MooncakeDistributedStore()
    try:
        store.setup(local_hostname='localhost',metadata_server='P2PHANDSHAKE',
                    global_segment_size=512*1024*1024,local_buffer_size=128*1024*1024,
                    protocol='tcp',rdma_devices='',master_server_addr='127.0.0.1:50051')
        payload=b'JobHub isolated teaching store / version 1'
        key='jobhub-teaching-v1-'+hashlib.sha256(payload).hexdigest()
        store.put(key,payload)
        received=store.get(key)
        assert received==payload,'Store returned different bytes'
        print(json.dumps({'evidence':'measured-mooncake-store-tcp','version':version,
                          'bytes':len(received),'sha256':hashlib.sha256(received).hexdigest(),
                          'verified':True,'boundary':'Local CPU Store roundtrip; no throughput or RDMA claim'}))
    finally:store.close()
if __name__=='__main__':main()
