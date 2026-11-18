"""Independent hand-computed and invariant checks, no import of lab.py."""
import argparse
import importlib
import math
import random


def check(module):
    for scores, k, expected in [([2, 2, 1, 0], 2, [0, 1]), ([-3, -1, -1], 3, [1, 2, 0]), ([0], 1, [0]), ([1, 4, 2, 3], 2, [1, 3])]:
        assert module.stable_topk(scores, k) == expected, 'stable_topk order/tie failure'
    rows = [(1, 0.25, [4, 8]), (0, 1, [3, -2]), (1, 0.75, [8, 4])]
    expected = [[3, -2], [7, 5], [0, 0]]
    for seed in range(7):
        shuffled = list(rows)
        random.Random(seed).shuffle(shuffled)
        actual = module.weighted_combine(3, 2, shuffled)
        assert len(actual) == 3 and all(len(r) == 2 for r in actual), 'combine shape'
        assert all(math.isclose(x, y, abs_tol=1e-12) for row, ref in zip(actual, expected) for x, y in zip(row, ref)), 'combine values/order'
    assert module.weighted_combine(2, 2, []) == [[0, 0], [0, 0]], 'empty buckets'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', action='store_true', help='check the provided reference, not the student submission')
    args = parser.parse_args()
    name = 'reference' if args.reference else 'exercises'
    try:
        check(importlib.import_module(name))
    except (AssertionError, NotImplementedError, TypeError, ValueError, IndexError) as error:
        parser.exit(1, 'FAIL ' + name + ': ' + str(error) + '\n')
    print('PASS', name, '(reference validation only)' if args.reference else '(local exercise checks only)')
