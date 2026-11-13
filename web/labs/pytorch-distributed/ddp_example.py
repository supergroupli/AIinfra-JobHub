#!/usr/bin/env python3
"""Optional actual DDP update; launch with torchrun --standalone --nproc-per-node=2.
Pinned torch 2.6.0. Default gloo runs on CPUs; --backend nccl needs two GPUs.
"""
import argparse,datetime,os
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP

def main():
    p=argparse.ArgumentParser();p.add_argument('--backend',choices=['gloo','nccl'],default='gloo');a=p.parse_args()
    if torch.__version__.split('+')[0]!='2.6.0':raise SystemExit('Use torch==2.6.0 for the teaching baseline.')
    local=int(os.environ['LOCAL_RANK'])
    device=torch.device('cuda',local) if a.backend=='nccl' else torch.device('cpu')
    if a.backend=='nccl':torch.cuda.set_device(device)
    dist.init_process_group(a.backend,timeout=datetime.timedelta(seconds=45))
    try:
        if dist.get_world_size()!=2:raise RuntimeError('This example expects exactly two ranks.')
        rank=dist.get_rank();model=torch.nn.Linear(1,1,bias=False).to(device)
        with torch.no_grad():model.weight.zero_()
        ddp=DDP(model,device_ids=[local] if a.backend=='nccl' else None)
        optimizer=torch.optim.SGD(ddp.parameters(),lr=.1)
        x=torch.tensor([[rank+1.]],device=device);y=2*x
        optimizer.zero_grad();loss=((ddp(x)-y)**2).mean();loss.backward();optimizer.step()
        torch.testing.assert_close(model.weight,torch.ones_like(model.weight))
        print({'rank':rank,'weight':model.weight.detach().cpu().item(),'expected':1.0,'backend':a.backend,'torch':torch.__version__},flush=True)
    finally:dist.destroy_process_group()
if __name__=='__main__':main()
