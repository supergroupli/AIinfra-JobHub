#!/usr/bin/env python3
"""Independent acceptance checks. --reference checks supplied answers only."""
import argparse
import importlib.util
from pathlib import Path
import sys

def invalid(fn):
    try:
        fn()
    except ValueError:
        return
    raise AssertionError('Expected ValueError / 应拒绝无效输入')

def verify(m):
    a={'id':'a','ready':True,'queue_ms':10,'saved_prefill_ms':35}
    b={'id':'b','ready':True,'queue_ms':0,'saved_prefill_ms':0}
    assert m.select_worker([a,b]) == 'a'
    assert m.select_worker([dict(a,queue_ms=100),b]) == 'b'
    assert m.select_worker([dict(a,ready=False),b]) == 'b'
    assert m.select_worker([]) is None
    assert m.select_worker([dict(a,ready=False)]) is None
    assert m.select_worker([dict(a,queue_ms=0,saved_prefill_ms=0),b]) == 'a'
    rows=[{'status':'ok','latency_ms':40},{'status':'ok','latency_ms':100},{'status':'ok','latency_ms':120},{'status':'error','latency_ms':1}]
    assert m.goodput(rows,100) == .5
    assert m.goodput(rows,50) == .25
    assert m.goodput([],100) is None
    for slo in (0,-1,float('nan'),float('inf'),True):
        invalid(lambda: m.goodput(rows,slo))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--reference',action='store_true')
    args=parser.parse_args()
    path=Path(__file__).with_name('solutions.py' if args.reference else 'student.py')
    spec=importlib.util.spec_from_file_location('challenge_module',path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    try:
        verify(module)
    except NotImplementedError as error:
        print('NOT YET / 尚未完成:',error); return 1
    except (AssertionError,ValueError,TypeError,KeyError) as error:
        print('FAIL / 未通过:',type(error).__name__,str(error)); return 1
    print('PASS: supplied REFERENCE only / 仅参考解通过' if args.reference else 'PASS: your student implementation / 学生实现通过')
    return 0

if __name__=='__main__':sys.exit(main())
