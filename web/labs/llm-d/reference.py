"""Reference answers; attempt exercises.py before reading."""
def pick_endpoint(endpoints):
    scored = sorted((e['queue_ms'] + e['prefill_ms'], e['id']) for e in endpoints if e['ready'] and e['age_ms'] <= 1000)
    return scored[0][1] if scored else None

def pd_capacity(prefill_replicas, decode_replicas, network_MBps):
    return min(prefill_replicas * 25, decode_replicas * 10, network_MBps / 8)

def available_capacity(replicas, max_unavailable):
    return 10 * max(0, replicas - max_unavailable)
