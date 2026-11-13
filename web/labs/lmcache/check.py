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
    assert m.restoration_decision(200,10,5,100) == {'restore_ms':25,'beneficial':True}
    assert m.restoration_decision(200,.5,5,100) == {'restore_ms':405,'beneficial':False}
    assert m.restoration_decision(200,10,5,25)['beneficial'] is False
    assert m.restoration_decision(0,1,0,0) == {'restore_ms':0,'beneficial':False}
    for args in ((1,0,0,1),(-1,1,0,1),(1,1,-1,1),(1,1,0,-1),(1,float('inf'),0,1),(True,1,0,1)):
        invalid(lambda: m.restoration_decision(*args))
    base=m.cache_identity('model','r1','team-a',[1,2])
    assert isinstance(base,str) and base == m.cache_identity('model','r1','team-a',[1,2])
    for args in (('other','r1','team-a',[1,2]),('model','r2','team-a',[1,2]),('model','r1','team-b',[1,2]),('model','r1','team-a',[2,1]),('model','r1','team-a',[1,2,3])):
        assert base != m.cache_identity(*args)

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
