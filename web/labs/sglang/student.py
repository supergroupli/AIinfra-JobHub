"""Your independent implementation. / 在这里完成自己的挑战。"""

def aligned_prefix_length(left, right, block_size):
    """Return matching-prefix tokens rounded DOWN to full blocks.
    返回完整块对齐的公共前缀长度；block_size 非正整数时 ValueError。
    Example: [1,2,3], [1,2,4], 2 -> 2; empty lists -> 0.
    """
    raise NotImplementedError('TODO: compare in order, then round down / 顺序比较后向下取整')


def successful_p95(rows):
    """Nearest-rank P95 over status=ok only; no successes -> None.
    rows: [{'status':'ok'|'error'|'timeout', 'latency_ms': number}].
    成功延迟必须有限且非负，否则 ValueError；失败样本保留在原始数据。
    """
    raise NotImplementedError('TODO: filter successes and use ceil(.95*n)-1 / 筛选成功样本再取分位数')
