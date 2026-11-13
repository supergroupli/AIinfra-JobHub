#!/usr/bin/env python3
"""Actual NCCL all-reduce correctness and local-device timing; two NVIDIA GPUs.
Pin torch 2.6.0 cu124; record the bundled NCCL version at runtime.
Not executed by this platform. No multi-node claims.
"""
import datetime,json,os
import torch
import torch.distributed as dist

def main():
    if torch.__version__.split('+')[0]!='2.6.0':raise SystemExit('Use torch==2.6.0 baseline.')
    local=int(os.environ['LOCAL_RANK']);torch.cuda.set_device(local)
    dist.init_process_group('nccl',timeout=datetime.timedelta(seconds=45))
    try:
        rank=dist.get_rank();world=dist.get_world_size()
        if world!=2:raise RuntimeError('Use exactly two ranks with one GPU per rank.')
        x=torch.full((262144,),float(rank+1),device='cuda');expected=world*(world+1)/2
        for _ in range(3):x.fill_(rank+1);dist.all_reduce(x)
        torch.cuda.synchronize();dist.barrier()
        samples=[]
        for _ in range(10):
            x.fill_(rank+1)
            start=torch.cuda.Event(enable_timing=True);end=torch.cuda.Event(enable_timing=True)
            start.record();dist.all_reduce(x);end.record();end.synchronize()
            samples.append(start.elapsed_time(end));torch.testing.assert_close(x,torch.full_like(x,expected))
        # Slowest local device's mean, not a global synchronized-clock measurement.
        mean=torch.tensor([sum(samples)/len(samples)],device='cuda');dist.all_reduce(mean,op=dist.ReduceOp.MAX)
        seconds=mean.item()/1000;size=x.numel()*x.element_size();alg=size/seconds/1e9
        if rank==0:print(json.dumps({'evidence':'measured on your run','bytes':size,'ranks':world,'max_rank_mean_ms':mean.item(),'algbw_GBs':alg,'busbw_GBs':alg*2*(world-1)/world,'torch':torch.__version__,'cuda':torch.version.cuda,'nccl':torch.cuda.nccl.version(),'gpu':torch.cuda.get_device_name(),'scope':'single-node, CUDA-event timing, 3 warmups and 10 samples; no network inference'},indent=2))
    finally:dist.destroy_process_group()
if __name__=='__main__':main()
