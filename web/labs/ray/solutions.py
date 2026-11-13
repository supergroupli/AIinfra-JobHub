"""Reference only: reading/passing this is not personal completion. / 参考解不等于本人完成。"""
import math

def admission(cpu, per_task):
    if cpu < 0 or per_task <= 0:
        raise ValueError('invalid logical resources')
    return math.floor(cpu / per_task)
