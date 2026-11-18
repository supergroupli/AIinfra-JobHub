"""Independent expected examples for the three student functions."""
import argparse
import importlib
import math


def check(module):
    def e(ident, queue=0, prefill=20, ready=True, age=0):
        return dict(id=ident, queue_ms=queue, prefill_ms=prefill, ready=ready, age_ms=age)
    cases = [([], None), ([e('a', ready=False)], None), ([e('hot', 100, 10), e('cold', 0, 80)], 'cold'), ([e('a', age=1001), e('b', age=1000)], 'b'), ([e('b'), e('a')], 'a')]
    for entries, expected in cases:
        actual = module.pick_endpoint(entries)
        if actual != expected: raise AssertionError('route: expected %r, got %r' % (expected, actual))
    for args, expected in [((2, 4, 800), 40), ((2, 4, 80), 10), ((0, 4, 800), 0), ((4, 1, 800), 10), ((1, 9, 800), 25)]:
        if not math.isclose(module.pd_capacity(*args), expected): raise AssertionError('PD capacity case %r' % (args,))
    for args, expected in [((4, 1), 30), ((4, 2), 20), ((0, 1), 0), ((2, 5), 0), ((3, 0), 30)]:
        if module.available_capacity(*args) != expected: raise AssertionError('rollout case %r' % (args,))
    return 15


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', action='store_true')
    args = parser.parse_args()
    try:
        count = check(importlib.import_module('reference' if args.reference else 'exercises'))
    except (AssertionError, NotImplementedError) as exc:
        parser.exit(1, 'NOT COMPLETE: %s\n' % exc)
    print('PASS: %d fixed correctness cases; this is not a GPU benchmark or certification.' % count)

if __name__ == '__main__': main()
