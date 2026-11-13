"""Your independent implementation. / 在这里完成自己的挑战。"""

def restoration_decision(payload_mb, bandwidth_gbps, fixed_ms, recompute_ms):
    """Return {'restore_ms': number, 'beneficial': bool}.
    Use decimal MB, GB/s, ms; strictly faster restoration is beneficial.
    带宽正数，其他值非负，全部有限数字且非 bool；无效输入抛 ValueError。
    """
    raise NotImplementedError('TODO: transfer + fixed cost versus recompute / 传输加固定开销与重算比较')


def cache_identity(model, revision, namespace, tokens):
    """Return a deterministic string containing no raw secret tokens.
    Same metadata and ordered tokens -> same; change ANY field -> different.
    使用稳定序列化与摘要，不能只用 token 数量或不稳定的 Python hash()。
    """
    raise NotImplementedError('TODO: stable structured serialization + digest / 稳定序列化加摘要')
