"""Implement both functions; then run python3 check_exercises.py.

完成两个 TODO 后运行独立检查器。禁止用示例输出硬编码替代一般算法。
"""


def stable_topk(scores, k):
    """Return k expert indices, descending score, smaller index wins ties.

按分数降序返回 k 个专家索引，同分时小索引优先。假设输入有限且 k 有效。
"""
    raise NotImplementedError('TODO: stable routing order / 稳定路由顺序')


def weighted_combine(token_count, width, rows):
    """rows are (token_id, weight, expert_output); sum contributions by token.

返回 token_count × width 列表；未收到贡献的 token 为零向量。不能依赖行顺序。
"""
    raise NotImplementedError('TODO: token-major weighted sum / 按 token 加权聚合')
