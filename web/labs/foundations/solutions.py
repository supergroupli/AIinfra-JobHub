"""Reference only: read after your attempt / 尝试后再阅读参考解法."""
import math


def failure_rate(records):
    # Include errors and timeouts in the denominator and numerator.
    return sum(r['status'] != 'ok' for r in records) / len(records) if records else None


def nearest_rank(values, q):
    if not 0 < q <= 1:
        raise ValueError('q must be in (0, 1]')
    return sorted(values)[math.ceil(q * len(values)) - 1] if values else None
