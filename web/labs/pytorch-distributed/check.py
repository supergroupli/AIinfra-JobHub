import argparse

def verify(module):
    assert module.weighted_gradient([-4,-16],[1,1])==-10
    assert module.weighted_gradient([2,8],[3,1])==3.5
    for means,counts in [([],[]),([1],[0]),([1],[1,2])]:
        try:module.weighted_gradient(means,counts)
        except ValueError:pass
        else:raise AssertionError('invalid counts must fail')

def main():
    p=argparse.ArgumentParser();p.add_argument('--reference',action='store_true');a=p.parse_args()
    if a.reference:import solutions as implementation
    else:import student as implementation
    try:verify(implementation)
    except (AssertionError,NotImplementedError) as e:print('NOT YET / 尚未通过:',str(e));return 1
    print('PASS: reference only / 仅参考解法' if a.reference else 'PASS: your implementation / 你的实现');return 0
if __name__=='__main__':raise SystemExit(main())
