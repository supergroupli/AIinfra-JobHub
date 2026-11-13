"""Reference only; implement student.py before comparing. / 参考解。"""
import math

def select_worker(workers):
    eligible = [w for w in workers if w['ready']]
    if not eligible:
        return None
    # Input order breaks ties; this is a teaching policy, not Dynamo code.
    return min(eligible, key=lambda w: w['queue_ms'] + max(0, 40 - w['saved_prefill_ms']))['id']


def goodput(rows, slo_ms):
    if isinstance(slo_ms, bool) or not isinstance(slo_ms, (int, float)) or not math.isfinite(slo_ms) or slo_ms <= 0:
        raise ValueError('positive finite SLO required')
    if not rows:
        return None
    return sum(r['status'] == 'ok' and r['latency_ms'] <= slo_ms for r in rows) / len(rows)
