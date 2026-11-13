#!/usr/bin/env python3
"""Run independent checks: python3 check.py [--reference]."""
import argparse
import math
import sys


def verify(module):
    assert module.failure_rate([]) is None, 'empty records must return None'
    assert module.failure_rate([{'status': 'ok'}]) == 0
    assert math.isclose(module.failure_rate([{'status': 'ok'}, {'status': 'error'}, {'status': 'timeout'}]), 2/3)
    assert module.nearest_rank([], .95) is None
    assert module.nearest_rank([30, 10, 20], .5) == 20
    assert module.nearest_rank(list(range(1, 21)), .95) == 19
    assert module.nearest_rank([7], 1) == 7
    for q in (0, -1, 1.01):
        try:
            module.nearest_rank([1], q)
        except ValueError:
            pass
        else:
            raise AssertionError('invalid q must raise ValueError')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--reference', action='store_true', help='verify the supplied reference, not your work')
    args = parser.parse_args()
    if args.reference:
        import solutions as implementation
    else:
        import student as implementation
    try:
        verify(implementation)
    except (AssertionError, NotImplementedError) as exc:
        print('NOT YET / 尚未通过:', str(exc) or 'a boundary case returned the wrong value')
        return 1
    print('PASS: reference only / 仅参考解法通过' if args.reference else 'PASS: student boundary checks / 学生边界用例通过')
    return 0


if __name__ == '__main__':
    sys.exit(main())
