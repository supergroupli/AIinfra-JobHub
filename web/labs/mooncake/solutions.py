"""Reference only: reading/passing this is not personal completion. / 参考解不等于本人完成。"""
import math

def transfer_cost_ms(size_bytes, bandwidth_gb_s, fixed_ms=0.2):
    if size_bytes < 0 or bandwidth_gb_s <= 0 or fixed_ms < 0:
        raise ValueError('invalid transfer inputs')
    return fixed_ms + size_bytes / (bandwidth_gb_s * 1_000_000_000) * 1000
