"""Reference only; implement student.py before comparing. / 参考解。"""
import math
import hashlib
import json

def restoration_decision(payload_mb, bandwidth_gbps, fixed_ms, recompute_ms):
    values = (payload_mb, bandwidth_gbps, fixed_ms, recompute_ms)
    if any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) for x in values):
        raise ValueError('finite numeric arguments required')
    if payload_mb < 0 or bandwidth_gbps <= 0 or fixed_ms < 0 or recompute_ms < 0:
        raise ValueError('bandwidth positive; all costs nonnegative')
    # Decimal MB / (decimal GB/s) numerically equals milliseconds.
    restore_ms = payload_mb / bandwidth_gbps + fixed_ms
    return {'restore_ms': restore_ms, 'beneficial': restore_ms < recompute_ms}


def cache_identity(model, revision, namespace, tokens):
    # Exact sequence and metadata matter. Length alone cannot identify KV.
    data = json.dumps([model, revision, namespace, list(tokens)], ensure_ascii=False, separators=(',', ':'))
    return hashlib.sha256(data.encode('utf-8')).hexdigest()
