"""Reference only: reading/passing this is not personal completion. / 参考解不等于本人完成。"""
import math

def replica_slots(cpu_m, memory_mib, request_cpu_m, request_memory_mib):
    if min(cpu_m, memory_mib) < 0 or min(request_cpu_m, request_memory_mib) <= 0:
        raise ValueError('invalid resource requests')
    return int(min(cpu_m // request_cpu_m, memory_mib // request_memory_mib))
