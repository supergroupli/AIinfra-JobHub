"""MoE teaching lab: exact CPU semantics and explicit analytical cost models.

No DeepEP, DeepGEMM, GPU, distributed runtime or network operation is executed.
"""
import argparse
import hashlib
import json
import math
import platform
import random
import statistics
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXPERTS, HIDDEN = 4, 4


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, allow_nan=False).encode()).hexdigest()


def topk(scores, k):
    if not scores or not 1 <= k <= len(scores) or not all(math.isfinite(x) for x in scores):
        raise ValueError('finite scores and 1 <= k <= expert count required')
    ids = sorted(range(len(scores)), key=lambda i: (-scores[i], i))[:k]
    exps = [math.exp(scores[i] - max(scores)) for i in ids]
    return [(i, p / sum(exps)) for i, p in zip(ids, exps)]


def workload(tokens=16, k=2, skew=0, seed=7):
    rng = random.Random(seed)
    xs, routes = [], []
    for token in range(tokens):
        xs.append([round(rng.uniform(-2, 2), 4) for _ in range(HIDDEN)])
        first = 0 if rng.random() < skew else token % EXPERTS
        second = (first + 1 + token % (EXPERTS - 1)) % EXPERTS
        scores = [-2.0] * EXPERTS
        scores[first], scores[second] = 2.0, 1.0
        routes.append(topk(scores, k))
    return {'x': xs, 'routes': routes, 'experts': EXPERTS, 'hidden': HIDDEN, 'topk': k}


def dispatch(data):
    buckets = [[] for _ in range(EXPERTS)]
    for token, routes in enumerate(data['routes']):
        for expert, weight in routes:
            buckets[expert].append({'token': token, 'weight': weight, 'x': data['x'][token]})
    return buckets


def expert(x, expert_id):
    # A deterministic linear expert, not the gated FFN of a production MoE.
    return [sum(value * ((expert_id + 1) if i == j else 0.125)
                for i, value in enumerate(x)) for j in range(HIDDEN)]


def execute(data, buckets=None):
    buckets = dispatch(data) if buckets is None else buckets
    output = [[0.0] * HIDDEN for _ in data['x']]
    for expert_id, bucket in enumerate(buckets):
        for row in bucket:
            result = expert(row['x'], expert_id)
            for j in range(HIDDEN):
                output[row['token']][j] += row['weight'] * result[j]
    return output


def oracle(data):
    # Token-major direct expression independent of bucket construction and expert().
    return [[sum(weight * ((eid + 1) * x[j] + 0.125 * sum(x[i] for i in range(HIDDEN) if i != j))
                 for eid, weight in routes) for j in range(HIDDEN)]
            for x, routes in zip(data['x'], data['routes'])]


def max_error(a, b):
    if len(a) != len(b) or any(len(x) != len(y) for x, y in zip(a, b)):
        raise ValueError('output shape mismatch')
    return max((abs(x - y) for row, ref in zip(a, b) for x, y in zip(row, ref)), default=0)


def counts(data):
    return [len(bucket) for bucket in dispatch(data)]


def quantize(values):
    scale = max((abs(x) for x in values), default=0) / 127 or 1.0
    integers = [max(-127, min(127, round(x / scale))) for x in values]
    return {'scale': scale, 'integers': integers, 'restored': [x * scale for x in integers]}


def traffic(data, placement=(0, 0, 1, 1)):
    matrix = [[0, 0], [0, 0]]
    for token, routes in enumerate(data['routes']):
        for eid, _ in routes:
            matrix[token % 2][placement[eid]] += 1
    return {'dispatch_assignment_matrix': matrix,
            'remote_assignments': matrix[0][1] + matrix[1][0],
            'local_assignments': matrix[0][0] + matrix[1][1]}


def roofline(m, h=4096, bandwidth=1000, tflops=100):
    flops = 2 * m * h * h
    byte_count = 2 * (m * h + h * h + m * h)
    compute_ms = flops / (tflops * 1e12) * 1000
    memory_ms = byte_count / (bandwidth * 1e9) * 1000
    return {'m': m, 'h': h, 'flops': flops, 'cold_bytes': byte_count,
            'compute_ms': compute_ms, 'memory_ms': memory_ms,
            'lower_bound_ms': max(compute_ms, memory_ms),
            'intensity_flops_per_byte': flops / byte_count}


def daily(day, args):
    data = workload(args.tokens, args.topk, args.skew, args.seed)
    buckets = dispatch(data)
    load = counts(data)
    base = {'day': day, 'evidence': 'cpu-semantics-and-analytical-model',
            'input_sha256': digest(data), 'gpu_executed': False}
    if day == 1:
        result = {'first_routes': data['routes'][:3], 'ties': topk([2, 2, 1, 0], 2),
                  'weights_sum': sum(w for _, w in data['routes'][0])}
    elif day == 2:
        result = {'buckets': buckets, 'assignments': sum(load), 'expected': args.tokens * args.topk,
                  'unique_tokens': len({row['token'] for bucket in buckets for row in bucket})}
    elif day == 3:
        result = {'input': data['x'][0], 'outputs_by_expert': [expert(data['x'][0], i) for i in range(EXPERTS)],
                  'linear_flops_per_expert_row': 2 * HIDDEN * HIDDEN}
    elif day == 4:
        output, ref = execute(data), oracle(data)
        result = {'output': output, 'reference': ref, 'max_abs_error': max_error(output, ref)}
    elif day == 5:
        wrong = [[dict(row, token=(row['token'] + 1) % args.tokens) for row in bucket] for bucket in buckets]
        result = {'correct_error': max_error(execute(data), oracle(data)),
                  'permuted_token_error': max_error(execute(data, wrong), oracle(data)),
                  'assignment_count_unchanged': sum(map(len, wrong)) == args.tokens * args.topk}
    elif day == 6:
        hot = workload(args.tokens, args.topk, 1.0, args.seed)
        result = {'baseline_load': load, 'hot_load': counts(hot),
                  'max_to_mean': max(load) / statistics.mean(load),
                  'hot_max_to_mean': max(counts(hot)) / statistics.mean(counts(hot))}
    elif day == 7:
        capacity = math.ceil(args.capacity_factor * args.tokens * args.topk / EXPERTS)
        kept = [bucket[:capacity] for bucket in buckets]
        result = {'capacity': capacity, 'load': load, 'dropped_assignments': sum(max(0, n - capacity) for n in load),
                  'error_after_drop': max_error(execute(data, kept), oracle(data)), 'renormalized_after_drop': False}
    elif day == 8:
        padded = [math.ceil(n / 8) * 8 for n in load]
        result = {'real_rows': load, 'padded_rows': padded, 'tile_rows': 8,
                  'padding_rows': sum(padded) - sum(load),
                  'useful_fraction': sum(load) / sum(padded)}
    elif day == 9:
        q = quantize([x for row in data['x'] for x in row])
        result = {'scheme': 'symmetric-int8-teaching-model-NOT-FP8', **q,
                  'zero_tensor': quantize([0.0, 0.0]), 'half_step_bound': q['scale'] / 2}
    elif day == 10:
        changed = dict(data, x=[quantize(row)['restored'] for row in data['x']])
        qout, ref = execute(changed), oracle(data)
        result = {'max_abs_error': max_error(qout, ref),
                  'relative_l2': math.sqrt(sum((a - b) ** 2 for row, rr in zip(qout, ref) for a, b in zip(row, rr)) /
                                           max(1e-30, sum(b * b for row in ref for b in row))),
                  'quantized_input_only': True}
    elif day == 11:
        result = {'contiguous_experts': traffic(data), 'striped_experts': traffic(data, (0, 1, 0, 1)),
                  'output_invariant': max_error(execute(data), oracle(data)) < 1e-12}
    elif day == 12:
        remote = traffic(data)['remote_assignments']
        payload = 2 * remote * 4096 * 2
        result = {'remote_assignments': remote, 'modeled_hidden': 4096, 'bytes_per_element': 2,
                  'roundtrip_payload_bytes': payload, 'effective_GBps': args.bandwidth,
                  'payload_lower_bound_us': payload / (args.bandwidth * 1e9) * 1e6,
                  'excludes': ['metadata', 'padding', 'launch', 'contention', 'protocol']}
    elif day == 13:
        tr = traffic(data)
        result = {**tr, 'total_dispatch_assignments': sum(map(sum, tr['dispatch_assignment_matrix'])),
                  'nonempty_remote_messages_if_one_message_per_peer': sum(tr['dispatch_assignment_matrix'][i][j] > 0 for i in range(2) for j in range(2) if i != j)}
    elif day == 14:
        result = {'decode': roofline(1), 'prefill': roofline(256), 'assumed_GBps': 1000, 'assumed_TFLOPs': 100,
                  'assumption': 'single BF16 HxH GEMM, cold tensors; not full expert FFN'}
    elif day == 15:
        compute, communication = 7.0, 5.0
        result = {'compute_ms': compute, 'communication_ms': communication, 'serial_ms': compute + communication,
                  'ideal_overlap_ms': max(compute, communication), 'with_dependency_gap_ms': max(compute, communication) + 2,
                  'assumption': 'independent pipeline chunks; full overlap is an optimistic bound'}
    elif day == 16:
        result = {'batches': [{'tokens': n, 'dispatch_launch_us': 10, 'assignments': n * args.topk,
                               'launch_us_per_token': 10 / n} for n in (1, 8, 64, 256)],
                  'unmodeled': ['batch wait', 'request deadlines', 'expert GEMM efficiency']}
    elif day == 17:
        for _ in range(3):
            execute(data)
        samples = []
        for _ in range(7):
            start = time.perf_counter_ns()
            value = execute(data)
            elapsed = time.perf_counter_ns() - start
            if max_error(value, oracle(data)) > 1e-12:
                raise ValueError('correctness gate failed')
            samples.append(elapsed)
        base['evidence'] = 'measured-python-cpu-only'
        result = {'samples_ns': samples, 'median_ns': statistics.median(samples), 'warmup': 3,
                  'timed_scope': 'Python dispatch + linear experts + combine, excluding oracle',
                  'python': platform.python_version()}
    elif day == 18:
        result = {'exercise_file': 'exercises.py', 'functions': ['stable_topk', 'weighted_combine'],
                  'check_command': 'python3 check_exercises.py', 'student_verified': False,
                  'note': 'Run the independent checker after implementing TODOs; this JSON does not grade your code.'}
    elif day == 19:
        result = {'upstream_commands_executed': False,
                  'design_file': 'GPU_EXTENSION.md', 'required_records': ['exact commits', 'GPU topology', 'CUDA/PyTorch/NCCL',
                      'correctness tolerances', 'warmup and synchronization', 'raw samples', 'failures'],
                  'migration_warning': 'DeepEP V2.5 removes V1 APIs/NVSHMEM backend; do not mix old snippets with new checkout'}
    else:
        result = {'report': 'REPORT.md', 'student_explanation_required': True,
                  'same_workload_comparison': {'contiguous': traffic(data), 'striped': traffic(data, (0, 1, 0, 1))},
                  'correctness_error': max_error(execute(data), oracle(data)), 'executed_days': list(range(1, 21))}
    return dict(base, **result)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('day', choices=['day' + str(i) for i in range(1, 21)])
    parser.add_argument('--tokens', type=int, default=16)
    parser.add_argument('--topk', type=int, default=2)
    parser.add_argument('--skew', type=float, default=0)
    parser.add_argument('--capacity-factor', type=float, default=1.25)
    parser.add_argument('--bandwidth', type=float, default=25)
    parser.add_argument('--seed', type=int, default=7)
    parser.add_argument('--out', type=Path, default=Path('out'))
    args = parser.parse_args()
    if not 2 <= args.tokens <= 4096 or not 1 <= args.topk <= 4 or not 0 <= args.skew <= 1 or not 0.1 <= args.capacity_factor <= 8 or not 0.1 <= args.bandwidth <= 1000 or not 0 <= args.seed <= 1000000:
        parser.error('tokens 2..4096; topk 1..4; skew 0..1; capacity-factor 0.1..8; bandwidth 0.1..1000 GB/s; seed 0..1000000')
    out = args.out.resolve()
    if out == ROOT or ROOT.is_relative_to(out):
        parser.error('choose an output subdirectory such as out, not the source directory or its parents')
    out.mkdir(parents=True, exist_ok=True)
    day = int(args.day[3:])
    days = range(1, 21) if day == 20 else [day]
    files = []
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    for current in days:
        result = daily(current, args)
        result['source_sha256'] = source_hash
        result['parameters'] = {k: v for k, v in vars(args).items() if k not in ('out', 'day')}
        target = out / ('day%02d.json' % current)
        if target.is_symlink():
            parser.error('output-file symlinks are not allowed')
        target.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n', encoding='utf-8')
        files.append(target)
    if day == 20:
        report = out / 'REPORT.md'
        if report.is_symlink() or (out / 'manifest.json').is_symlink():
            parser.error('output-file symlinks are not allowed')
        report.write_text('# MoE experiment / MoE 实验作品\n\n'
            'Generated execution evidence, not a completed student submission. / 自动生成的运行证据，需要本人补齐分析。\n\n'
            '## Evidence / 证据\n\n20 JSON files; day17 measures Python CPU only. Other time/bandwidth values are analytical assumptions. No GPU or upstream framework ran.\n'
            '20 份 JSON；第17天仅测 Python CPU，其他时间成本为模型，未运行 GPU 上游框架。\n\n'
            '## Your contribution / 本人贡献\n\nTODO: hypothesis, one controlled change, unchanged inputs, result and explanation.\n'
            '填写：假设、唯一改动、固定输入、结果及解释。\n\n'
            '## Correctness / 正确性\n\nTODO: dispatch conservation, combine oracle, exercise checker result, quantization tolerance.\n'
            '填写：分发守恒、聚合参照、练习检查结果、量化容差。\n\n'
            '## Limitations / 局限\n\nTODO: report placement regressions as well as improvements; state hardware needed to test transfer claims.\n'
            '填写：保留布局退步结果，列出验证真实传输所需硬件。\n', encoding='utf-8')
        files.append(report)
        manifest = {'python': platform.python_version(), 'source_sha256': source_hash,
                    'files': {f.name: hashlib.sha256(f.read_bytes()).hexdigest() for f in files}}
        (out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print('PASS', args.day, str(out / ('day%02d.json' % day)), '(CPU teaching lab; no GPU execution)')


if __name__ == '__main__':
    main()
