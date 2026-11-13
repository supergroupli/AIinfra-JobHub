import argparse

def verify(module):
    assert module.masked_sum([1,2,100],[True,True,False])==3
    assert module.masked_sum([],[])==0
    try:module.masked_sum([1],[])
    except ValueError:pass
    else:raise AssertionError('length mismatch must be rejected')

def main():
    p=argparse.ArgumentParser();p.add_argument('--reference',action='store_true');a=p.parse_args()
    if a.reference:import solutions as implementation
    else:import student as implementation
    try:verify(implementation)
    except (AssertionError,NotImplementedError) as e:print('NOT YET / 尚未通过:',str(e));return 1
    print('PASS: reference only / 仅参考解法' if a.reference else 'PASS: your implementation / 你的实现');return 0
if __name__=='__main__':raise SystemExit(main())
