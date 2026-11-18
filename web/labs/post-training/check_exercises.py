"""Fixed independent acceptance cases; no lab.py implementation is imported."""
import argparse
import importlib
import math


def check(module):
    checks = 0
    for values,mask,expected in [([99,2,4,-99],[0,1,1,0],3),([5],[1],5),([-2,8,2],[1,0,1],0)]:
        assert math.isclose(module.masked_mean(values,mask), expected); checks += 1
    for values,mask in [([1],[0]),([1,2],[1]),([],[]),([1],[2])]:
        try: module.masked_mean(values,mask)
        except ValueError: checks += 1
        else: raise AssertionError('invalid mask accepted')
    for behavior,current,lag,expected in [(8,8,0,True),(7,8,1,True),(6,8,1,False),(9,8,9,False),(0,0,0,True)]:
        assert module.accept_trajectory(behavior,current,lag) is expected; checks += 1
    assert module.unique_rewards([('x',1),('y',0),('x',1)]) == [1,0]; checks += 1
    assert module.unique_rewards([]) == []; checks += 1
    try: module.unique_rewards([('x',1),('x',0)])
    except ValueError: checks += 1
    else: raise AssertionError('conflicting retry accepted')
    return checks


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference',action='store_true')
    args=parser.parse_args()
    try:
        name='reference' if args.reference else 'exercises'
        print('PASS',check(importlib.import_module(name)),'cases; implementation:',name)
    except (AssertionError,ValueError,NotImplementedError) as exc:
        parser.exit(1,'NOT YET: '+str(exc)+'\n')
