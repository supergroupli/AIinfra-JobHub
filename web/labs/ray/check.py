#!/usr/bin/env python3
"""Check your implementation, or compare an explicitly labelled reference."""
import argparse, importlib, math

def run(reference=False):
    mod=importlib.import_module('solutions' if reference else 'student')
    cases=[('admission', (4, 1.5), 2), ('admission', (0, 1), 0), ('admission', (2, 0.5), 4), ('admission', (0.5, 1), 0)]
    invalid=[('admission', (-1, 1)), ('admission', (1, 0)), ('admission', (1, -0.5))]
    for name,args,expected in cases:
        actual=getattr(mod,name)(*args)
        assert math.isclose(actual,expected,rel_tol=1e-12,abs_tol=1e-12),(args,actual,expected)
    for name,args in invalid:
        try:getattr(mod,name)(*args)
        except ValueError:pass
        else:raise AssertionError('Expected ValueError for '+repr(args))
    print(('REFERENCE ONLY / 仅参考解' if reference else 'YOUR IMPLEMENTATION / 本人实现')+' PASS: '+str(len(cases)+len(invalid))+' boundary cases')

def main():
    p=argparse.ArgumentParser();p.add_argument('--reference',action='store_true');a=p.parse_args()
    try:run(a.reference)
    except NotImplementedError as e:
        print('NOT YET / 尚未完成:',e);raise SystemExit(1)
    except (AssertionError,TypeError) as e:
        print('FAIL / 未通过:',e);raise SystemExit(1)
if __name__=='__main__':main()
