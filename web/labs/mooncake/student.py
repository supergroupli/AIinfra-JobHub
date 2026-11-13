"""Your independent implementation / 本人独立实现。"""

def transfer_cost_ms(size_bytes, bandwidth_gb_s, fixed_ms=0.2):
    """Return fixed_ms + payload transmission time in milliseconds.
    Bytes and decimal GB/s are used: 1 GB = 1,000,000,000 bytes.
    size_bytes and fixed_ms may be zero; bandwidth must be > 0.
    Raise ValueError on negative size/overhead or nonpositive bandwidth.
    返回传输总毫秒数；注意十进制 GB/s 与 bytes 的换算，并检查非法输入。"""
    raise NotImplementedError("Implement this function before running check.py / 请先实现函数")
