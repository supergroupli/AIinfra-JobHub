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
    assert m.aligned_prefix_length([1,2,3],[1,2,4],2) == 2
    assert m.aligned_prefix_length([1,2,3],[1,2,3],2) == 2
    assert m.aligned_prefix_length([],[],4) == 0
    assert m.aligned_prefix_length([1],[2],1) == 0
    for size in (0,-1,1.5,True):
        invalid(lambda: m.aligned_prefix_length([1],[1],size))
    assert m.successful_p95([]) is None
    assert m.successful_p95([{'status':'error','latency_ms':1}]) is None
    rows=[{'status':'ok','latency_ms':x} for x in range(1,21)]
    rows.append({'status':'timeout','latency_ms':99999})
    assert m.successful_p95(rows) == 19
    for value in (-1,float('nan'),float('inf')):
        invalid(lambda: m.successful_p95([{'status':'ok','latency_ms':value}]))

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
