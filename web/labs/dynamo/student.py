"""Your independent implementation. / 在这里完成自己的挑战。"""

def select_worker(workers):
    """Return ID of ready worker with smallest queue_ms + max(0,40-saved_prefill_ms).
    Input: list of {id, ready, queue_ms, saved_prefill_ms}; costs nonnegative.
    无 ready 返回 None；平局按输入顺序。不要让缓存亲和覆盖 readiness。
    """
    raise NotImplementedError('TODO: eligibility first, cost second / 先资格过滤再比较代价')


def goodput(rows, slo_ms):
    """Fraction of ALL submitted rows that are ok AND latency_ms <= slo_ms.
    rows: [{'status':'ok'|'error'|'timeout','latency_ms':number}].
    空集合返回 None，SLO 必须正有限数字（非 bool），否则 ValueError。
    """
    raise NotImplementedError('TODO: numerator meets both conditions; denominator includes failures / 分母包含失败')
