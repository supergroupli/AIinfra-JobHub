"""Fill these three TODOs; no third-party packages are required."""

def pick_endpoint(endpoints):
    """Keep ready endpoints with age_ms <= 1000; minimize queue+prefill; tie by id.
    Return the endpoint ID, or None for an empty eligible pool.
    """
    raise NotImplementedError('TODO: filter, score, pick')


def pd_capacity(prefill_replicas, decode_replicas, network_MBps):
    """Return the minimum of P*1000/40, D*1000/100 and network_MBps/8."""
    raise NotImplementedError('TODO: three serial stage capacity bounds')


def available_capacity(replicas, max_unavailable):
    """Return max(0, replicas-max_unavailable)*10 modeled requests/second."""
    raise NotImplementedError('TODO: conservative rollout capacity')
