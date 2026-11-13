"""Reference only; passing this is not your own work."""
def masked_sum(values, valid):
    if len(values) != len(valid): raise ValueError('length mismatch')
    return sum(v for v, flag in zip(values, valid) if flag)
