"""Reference only; implement student.py before comparing. / 参考解。"""
import math

def aligned_prefix_length(left, right, block_size):
    if isinstance(block_size, bool) or not isinstance(block_size, int) or block_size <= 0:
        raise ValueError('block_size must be a positive integer')
    matched = 0
    for a, b in zip(left, right):
        if a != b:
            break
        matched += 1
    return matched // block_size * block_size


def successful_p95(rows):
    values = [r['latency_ms'] for r in rows if r['status'] == 'ok']
    if not values:
        return None
    if any(not math.isfinite(x) or x < 0 for x in values):
        raise ValueError('successful latency must be finite and nonnegative')
    values.sort()
    return values[math.ceil(.95 * len(values)) - 1]
