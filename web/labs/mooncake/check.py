#!/usr/bin/env python3
"""Check your implementation, or compare an explicitly labelled reference."""
import argparse, importlib, math

def run(reference=False):
    mod=importlib.import_module('solutions' if reference else 'student')
    cases=[('transfer_cost_ms', (100000000, 10, 0.2), 10.2), ('transfer_cost_ms', (0, 1, 0.2), 0.2), ('transfer_cost_ms', (1000000000, 1, 0), 1000), ('transfer_cost_ms', (2000000, 4, 1), 1.5)]
    invalid=[('transfer_cost_ms', (-1, 1, 0.2)), ('transfer_cost_ms', (1, 0, 0.2)), ('transfer_cost_ms', (1, 1, -0.1))]
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
