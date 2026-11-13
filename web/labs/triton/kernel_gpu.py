#!/usr/bin/env python3
"""Optional real Triton correctness exercise. Linux/NVIDIA, torch 2.6.0, Triton 3.2.0.
Not executed by this platform. Does not report performance numbers.
"""
import torch
import triton
import triton.language as tl

@triton.jit
def plus(a, b, result, N: tl.constexpr, B: tl.constexpr):
    index = tl.program_id(0) * B + tl.arange(0, B)
    valid = index < N
    av = tl.load(a + index, valid, other=0)
    bv = tl.load(b + index, valid, other=0)
    tl.store(result + index, av + bv, valid)

@triton.jit
def row_softmax(source, target, C: tl.constexpr, B: tl.constexpr):
    row = tl.program_id(0)
    col = tl.arange(0, B)
    logits = tl.load(source + row * C + col, col < C, other=-float('inf')).to(tl.float32)
    shifted = logits - tl.max(logits, 0)
    numer = tl.exp(shifted)
    probs = numer / tl.sum(numer, 0)
    tl.store(target + row * C + col, probs, col < C)

def main():
    if not torch.cuda.is_available():raise SystemExit('Compatible NVIDIA GPU required; use lab.py for CPU reasoning.')
    if triton.__version__ != '3.2.0' or torch.__version__.split('+')[0] != '2.6.0':raise SystemExit('Use the versions pinned in README.md.')
    torch.manual_seed(17)
    for n in (1,257,1025):
        a=torch.randn(n,device='cuda');b=torch.randn_like(a);out=torch.empty_like(a)
        plus[(triton.cdiv(n,256),)](a,b,out,n,256)
        torch.testing.assert_close(out,a+b)
    x=torch.randn((5,37),device='cuda');x[0]+=1000;y=torch.empty_like(x)
    row_softmax[(5,)](x,y,37,triton.next_power_of_2(37))
    torch.testing.assert_close(y,torch.softmax(x,dim=-1),rtol=1e-4,atol=1e-5)
    torch.cuda.synchronize()
    print({'status':'PASS','evidence':'measured correctness, not performance','torch':torch.__version__,'triton':triton.__version__,'gpu':torch.cuda.get_device_name()})
if __name__=='__main__':main()
