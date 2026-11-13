import argparse

def verify(module):
    assert module.bus_bandwidth(100000000,10,4)==15
    assert module.bus_bandwidth(100000000,10,2)==10
    assert module.bus_bandwidth(0,1,2)==0
    for args in [(1,0,2),(1,1,1),(-1,1,2)]:
        try:module.bus_bandwidth(*args)
        except ValueError:pass
        else:raise AssertionError('invalid inputs must fail')

def main():
    p=argparse.ArgumentParser();p.add_argument('--reference',action='store_true');a=p.parse_args()
    if a.reference:import solutions as implementation
    else:import student as implementation
    try:verify(implementation)
    except (AssertionError,NotImplementedError) as e:print('NOT YET / 尚未通过:',str(e));return 1
    print('PASS: reference only / 仅参考解法' if a.reference else 'PASS: your implementation / 你的实现');return 0
if __name__=='__main__':raise SystemExit(main())
