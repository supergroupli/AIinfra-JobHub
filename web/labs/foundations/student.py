"""Your independent exercise / 你的独立练习.

Implement these functions without importing lab.py or solutions.py.
先写出自己的实现，再看参考；不调用 lab.py 或 solutions.py。
"""


def failure_rate(records):
    """Return failed / total, or None for no records.
    Any status other than 'ok' is a failure / 非 ok 都计入失败。
    """
    raise NotImplementedError("Implement failure_rate / 请实现失败率")


def nearest_rank(values, q):
    """Return ceil(q*n)-th sorted value (one-based), None if empty.
    q must be in (0,1]; invalid q raises ValueError.
    """
    raise NotImplementedError("Implement nearest_rank / 请实现最近秩分位数")
