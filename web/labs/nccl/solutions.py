"""Reference only; passing this is not your own work."""
def bus_bandwidth(size_bytes, elapsed_ms, ranks):
    if size_bytes<0 or elapsed_ms<=0 or type(ranks) is not int or ranks<2:raise ValueError('invalid measurement')
    return size_bytes/(elapsed_ms/1000)/1e9 * 2*(ranks-1)/ranks
