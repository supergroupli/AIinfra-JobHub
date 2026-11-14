#!/usr/bin/env python3
"""Bounded RSI-infrastructure teaching harness. Python standard library only.

No generated code execution, network, model calls or autonomous self-modification.
Simulated cost is a declared teaching objective, not CPU/GPU performance.
"""
import argparse
from collections import OrderedDict
import hashlib
import json
import math
from pathlib import Path
import platform
import random
import statistics
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parent
DEFAULT_INPUT = ROOT / 'fixtures' / 'workloads.json'
ALGORITHMS = ('loop', 'formula', 'buggy')
BASELINE = {'algorithm': 'loop', 'cache_size': 0, 'batch_size': 1}
CANDIDATES = [
    BASELINE,
    {'algorithm': 'formula', 'cache_size': 0, 'batch_size': 1},
    {'algorithm': 'buggy', 'cache_size': 0, 'batch_size': 1},
    {'algorithm': 'formula', 'cache_size': 8, 'batch_size': 4},
    {'algorithm': 'loop', 'cache_size': 2, 'batch_size': 2},
    {'algorithm': 'loop', 'cache_size': 4, 'batch_size': 4},
    {'algorithm': 'formula', 'cache_size': 2, 'batch_size': 2},
    {'algorithm': 'formula', 'cache_size': 4, 'batch_size': 4},
    {'algorithm': 'formula', 'cache_size': 8, 'batch_size': 1},
    {'algorithm': 'buggy', 'cache_size': 4, 'batch_size': 2},
    {'algorithm': 'loop', 'cache_size': 8, 'batch_size': 4},
    {'algorithm': 'formula', 'cache_size': 4, 'batch_size': 2},
]


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def integer(value, low, high, name):
    if type(value) is not int or not low <= value <= high:
        raise ValueError('%s must be an integer in [%s, %s]' % (name, low, high))
    return value


def load_workloads(path):
    path = Path(path)
    if path.stat().st_size > 1024 * 1024:
        raise ValueError('input exceeds 1 MiB')
    raw = path.read_bytes()
    data = json.loads(raw)
    if not isinstance(data, dict) or set(data) != {'version', 'train', 'validation', 'holdout'} or data['version'] != 1:
        raise ValueError('workload schema must be version 1 with three splits')
    ids = set()
    for split in ('train', 'validation', 'holdout'):
        tasks = data[split]
        if not isinstance(tasks, list) or not 1 <= len(tasks) <= 16:
            raise ValueError('each split needs 1..16 tasks')
        for task in tasks:
            if not isinstance(task, dict) or set(task) != {'id', 'inputs'}:
                raise ValueError('task fields must be id and inputs')
            ident = task['id']
            if not isinstance(ident, str) or not ident or len(ident) > 80 or ident in ids:
                raise ValueError('task IDs must be unique across splits')
            ids.add(ident)
            if not isinstance(task['inputs'], list) or not 1 <= len(task['inputs']) <= 64:
                raise ValueError('task inputs need 1..64 integers')
            for n in task['inputs']:
                integer(n, 0, 5000, 'workload input')
    return data, hashlib.sha256(raw).hexdigest()


def config(value):
    if not isinstance(value, dict) or set(value) != {'algorithm', 'cache_size', 'batch_size'}:
        raise ValueError('only algorithm, cache_size, batch_size may change')
    if value['algorithm'] not in ALGORITHMS or type(value['cache_size']) is not int or value['cache_size'] not in (0, 2, 4, 8) or type(value['batch_size']) is not int or value['batch_size'] not in (1, 2, 4):
        raise ValueError('configuration outside the finite allowlist')
    return dict(value)


def reference(n):
    """Independent scalar oracle; arithmetic is exact integer arithmetic."""
    return sum(i * i for i in range(n))


def compute(n, algorithm):
    if algorithm == 'loop':
        total = 0
        for i in range(n):
            total += i * i
        return total
    if algorithm == 'formula':
        return n * (n - 1) * (2 * n - 1) // 6
    if algorithm == 'buggy':
        return n * (n + 1) * (2 * n + 1) // 6
    raise ValueError('unknown algorithm')


def contract(data, memory_limit):
    return {'version': 1, 'task': 'sum of squares for i in range(n)',
            'correctness': 'exact integer equality for every output; no averaging',
            'objective': 'mean simulated task cost_ms, lower is better',
            'memory_limit_bytes': memory_limit, 'split_hash': digest(data),
            'editable': ['algorithm', 'cache_size', 'batch_size'],
            'protected': ['reference', 'cost model', 'data split', 'memory limit', 'budget accounting'],
            'cost_model': 'loop=max(1,n/10), formula/buggy=1, cache hit=0.1; launch overhead=2/batch; memory=128*cache+256*batch'}


def evaluate(candidate, tasks, memory_limit):
    candidate = config(candidate)
    memory = candidate['cache_size'] * 128 + candidate['batch_size'] * 256
    if memory > memory_limit:
        return {'status': 'rejected-memory', 'correct': None, 'cost_ms': None, 'peak_bytes': memory, 'mismatches': [], 'hits': 0, 'requests': sum(len(t['inputs']) for t in tasks)}
    totals, mismatches, hits = [], [], 0
    for task in tasks:
        cache = OrderedDict()
        cost = 0.0
        for n in task['inputs']:
            if n in cache:
                value = cache.pop(n)
                cache[n] = value
                hits += 1
                cost += .1
            else:
                value = compute(n, candidate['algorithm'])
                cost += max(1, n / 10) if candidate['algorithm'] == 'loop' else 1
                if candidate['cache_size']:
                    cache[n] = value
                    if len(cache) > candidate['cache_size']:
                        cache.popitem(last=False)
            expected = reference(n)
            if value != expected:
                mismatches.append({'task': task['id'], 'input': n, 'expected': expected, 'actual': value})
        cost += math.ceil(len(task['inputs']) / candidate['batch_size']) * 2
        totals.append(cost)
    return {'status': 'accepted' if not mismatches else 'rejected-correctness',
            'correct': not mismatches, 'cost_ms': round(statistics.mean(totals), 6),
            'peak_bytes': memory, 'mismatches': mismatches, 'hits': hits,
            'requests': sum(len(t['inputs']) for t in tasks)}


def trial(candidate, tasks, memory_limit, phase, number):
    return {'trial_id': '%s-%03d' % (phase, number), 'phase': phase, 'candidate': config(candidate),
            'candidate_sha256': digest(candidate), 'budget_units': 1,
            **evaluate(candidate, tasks, memory_limit)}


def policy(training, candidates):
    """Update a simple proposer: rank by observed algorithm-group costs only.

    No held-out results are read. Unseen groups get an explicit conservative prior.
    This is a bounded toy policy update, not an LLM that rewrites its own code.
    """
    scores = {}
    for algorithm in ALGORITHMS:
        records = [r for r in training if r['candidate']['algorithm'] == algorithm]
        good = [r['cost_ms'] for r in records if r['status'] == 'accepted']
        scores[algorithm] = statistics.mean(good) if good else 10**9
    return sorted(candidates, key=lambda c: (scores[c['algorithm']], c['batch_size'], c['cache_size'], digest(c))), scores


def run_arm(data, budget, memory_limit, seed, use_experience):
    training_count = budget // 2
    selection_count = budget - training_count - 1
    training = [trial(CANDIDATES[i % len(CANDIDATES)], data['train'], memory_limit, 'train', i) for i in range(training_count)]
    pool = list(CANDIDATES)
    random.Random(seed).shuffle(pool)
    scores = None
    if use_experience:
        pool, scores = policy(training, pool)
    selected = [trial(pool[i % len(pool)], data['validation'], memory_limit, 'validation', i) for i in range(selection_count)]
    accepted = [r for r in selected if r['status'] == 'accepted']
    chosen = min(accepted, key=lambda r: (r['cost_ms'], r['peak_bytes'], r['candidate_sha256']))['candidate'] if accepted else BASELINE
    final = trial(chosen, data['holdout'], memory_limit, 'holdout', 0)
    ledger = training + selected + [final]
    return {'policy': 'experience-v1' if use_experience else 'seeded-order-v0', 'training': training,
            'selection': selected, 'chosen': chosen, 'holdout': final, 'ledger': ledger,
            'algorithm_priors': scores, 'used_units': sum(r['budget_units'] for r in ledger),
            'failed_units': sum(r['budget_units'] for r in ledger if r['status'] != 'accepted'),
            'selection_fallback': not bool(accepted)}


def cpu_timings(data, repetitions, seed):
    inputs = data['train'][0]['inputs'] * 4
    for algorithm in ('loop', 'formula'):
        assert [compute(n, algorithm) for n in inputs] == [reference(n) for n in inputs]
    rng, rows = random.Random(seed), []
    # Warm-up both implementations before measuring each paired trial.
    for algorithm in ('loop', 'formula'):
        for n in inputs:
            compute(n, algorithm)
    for i in range(repetitions):
        order = ['loop', 'formula']
        rng.shuffle(order)
        elapsed = {}
        for algorithm in order:
            start = time.perf_counter_ns()
            values = [compute(n, algorithm) for n in inputs]
            elapsed[algorithm] = time.perf_counter_ns() - start
            assert values == [reference(n) for n in inputs]
        rows.append({'pair': i, 'order': order, 'loop_ns': elapsed['loop'], 'formula_ns': elapsed['formula'],
                     'paired_difference_ns': elapsed['loop'] - elapsed['formula']})
    return {'evidence': 'measured-cpu', 'clock': 'perf_counter_ns', 'repetitions': repetitions,
            'environment': {'python': sys.version.split()[0], 'platform': platform.platform(),
                            'machine': platform.machine(), 'implementation': platform.python_implementation(),
                            'clock_resolution_seconds': time.get_clock_info('perf_counter').resolution},
            'requests_per_sample': len(inputs), 'samples': rows,
            'median_loop_ns': statistics.median(r['loop_ns'] for r in rows),
            'median_formula_ns': statistics.median(r['formula_ns'] for r in rows),
            'median_paired_difference_ns': statistics.median(r['paired_difference_ns'] for r in rows),
            'boundary': 'Python integer implementations on this CPU only. Oracle checks run outside timed regions; no statistical significance, GPU result or general RSI claim.'}


def replay(records):
    seen, kept = {}, []
    for record in records:
        if record['trial_id'] in seen:
            if seen[record['trial_id']] != digest(record):
                raise ValueError('same trial ID has conflicting content')
            continue
        seen[record['trial_id']] = digest(record)
        kept.append(record)
    return kept


def daily(day, data, args):
    base = evaluate(BASELINE, data['validation'], args.memory_limit)
    fast_config = {'algorithm': 'formula', 'cache_size': 2, 'batch_size': 2}
    fast = evaluate(fast_config, data['validation'], args.memory_limit)
    fixed_contract = contract(data, args.memory_limit)
    common = {'day': day, 'evidence': 'simulated', 'seed': args.seed, 'contract_sha256': digest(fixed_contract)}
    if day == 1:
        result = {'stages': ['propose', 'check', 'measure', 'select', 'record'], 'baseline': base, 'candidate': fast,
                  'cost_ratio': round(base['cost_ms'] / fast['cost_ms'], 6) if fast['status'] == 'accepted' else None,
                  'scope': 'A finite optimization loop. Day 15 changes the proposer; neither proves open-ended recursive self-improvement.'}
    elif day == 2:
        changed = {**fixed_contract, 'memory_limit_bytes': args.memory_limit + 256}
        result = {'contract': fixed_contract, 'edited_contract_sha256': digest(changed), 'contract_changed': digest(changed) != digest(fixed_contract), 'candidate_fields': sorted(config(fast_config))}
    elif day == 3:
        result = {'split_ids': {s: [t['id'] for t in data[s]] for s in ('train', 'validation', 'holdout')},
                  'split_hashes': {s: digest(data[s]) for s in ('train', 'validation', 'holdout')},
                  'training_only_experience': True, 'boundary': 'All fixture files are visible for teaching. A separate evaluator service is needed for genuinely secret evaluation data.'}
    elif day in (4, 9):
        result = cpu_timings(data, args.repetitions, args.seed)
        if day == 9:
            result['paired_analysis'] = 'Inspect the sign and spread of every paired difference; a median alone does not establish confidence or transfer to another workload.'
    elif day == 5:
        edges = [{'id': 'edge-check', 'inputs': [0, 1, 2, 3, 32]}]
        result = {'oracle': 'independent range(n) sum', 'correct_candidate': evaluate(fast_config, edges, args.memory_limit),
                  'buggy_candidate': evaluate({'algorithm': 'buggy', 'cache_size': 0, 'batch_size': 1}, edges, args.memory_limit)}
    elif day == 6:
        rejected = []
        for bad in ({**fast_config, 'shell': 'not executed'}, {**fast_config, 'algorithm': 'eval'}, {**fast_config, 'cache_size': -1}):
            try:
                config(bad)
            except ValueError as error:
                rejected.append(str(error))
        result = {'rejected_proposals': rejected, 'accepted_config': config(fast_config),
                  'boundary': 'Finite data validation, not process/container isolation. There is no arbitrary candidate code execution.'}
    elif day == 7:
        ledger = [trial(CANDIDATES[i % len(CANDIDATES)], data['train'], args.memory_limit, 'budget', i) for i in range(args.budget)]
        result = {'ledger': ledger, 'limit_units': args.budget, 'used_units': len(ledger),
                  'failed_units': sum(r['status'] != 'accepted' for r in ledger), 'remaining_units': 0,
                  'boundary': 'One declared synthetic budget unit per attempted evaluation, including failures; not GPU seconds or money.'}
    elif day == 8:
        pool = list(CANDIDATES)
        random.Random(args.seed).shuffle(pool)
        result = {'candidate_count': len(pool), 'proposals': [{'config': c, 'sha256': digest(c)} for c in pool], 'proposer_version': 'seeded-order-v0'}
    elif day == 10:
        runs = [trial(c, data['validation'], args.memory_limit, 'pareto', i) for i, c in enumerate(CANDIDATES)]
        good = [r for r in runs if r['status'] == 'accepted']
        pareto = [r for r in good if not any(o['cost_ms'] <= r['cost_ms'] and o['peak_bytes'] <= r['peak_bytes'] and (o['cost_ms'] < r['cost_ms'] or o['peak_bytes'] < r['peak_bytes']) for o in good)]
        result = {'trials': runs, 'pareto_candidates': [r['candidate'] for r in pareto], 'rule': 'Correctness and memory are hard gates; cost/memory Pareto comparison follows.'}
    elif day == 11:
        result = {'parent_version': digest(BASELINE), 'candidate_version': digest(fast_config), 'data_version': digest(data),
                  'trial': trial(fast_config, data['validation'], args.memory_limit, 'lineage', 0),
                  'boundary': 'Hashes detect content identity; they do not prove correctness or independent review.'}
    elif day == 12:
        records = [trial(c, data['train'], args.memory_limit, 'recovery', i) for i, c in enumerate(CANDIDATES[:4])]
        interrupted = json.loads(json.dumps(records[:2]))
        resumed = replay(interrupted + records[1:])
        result = {'journal': resumed, 'attempted_appends': len(interrupted + records[1:]), 'unique_trials': len(resumed), 'charged_units': sum(r['budget_units'] for r in resumed),
                  'same_as_uninterrupted': resumed == records, 'boundary': 'JSON journal replay models idempotent accounting; it does not resume a killed GPU kernel.'}
    elif day == 13:
        bad = evaluate({'algorithm': 'buggy', 'cache_size': 0, 'batch_size': 1}, data['validation'], args.memory_limit)
        polluted_contract = {**fixed_contract, 'correctness': 'trust candidate-reported correctness'}
        result = {'candidate_claim': {'correct': True, 'cost_ms': .01}, 'independent_check': bad,
                  'claim_accepted': bad['status'] == 'accepted', 'evaluator_edit_detected': digest(polluted_contract) != digest(fixed_contract),
                  'final_holdout_used_for_proposals': False}
    elif day == 14:
        rows = [trial(c, data['train'], args.memory_limit, 'experience', i) for i, c in enumerate(CANDIDATES[:4])]
        result = {'experience': rows, 'experience_sha256': digest(rows), 'includes_failures': any(r['status'] != 'accepted' for r in rows),
                  'provenance': {'task_split': 'train', 'contract_sha256': digest(fixed_contract)}, 'not_included': ['validation results', 'holdout results']}
    elif day == 15:
        rows = [trial(c, data['train'], args.memory_limit, 'experience', i) for i, c in enumerate(CANDIDATES[:4])]
        pool = list(CANDIDATES)
        random.Random(args.seed).shuffle(pool)
        ordered, priors = policy(rows, pool)
        result = {'old_policy': 'seeded-order-v0', 'new_policy': 'experience-v1', 'algorithm_priors': priors,
                  'old_first': pool[0], 'new_first': ordered[0], 'rank_changed': pool != ordered,
                  'scope': 'A measured-feedback update to a bounded proposer, not self-rewriting code or evidence of unlimited recursive gains.'}
    elif day == 16:
        cold = run_arm(data, args.budget, args.memory_limit, args.seed, False)
        warm = run_arm(data, args.budget, args.memory_limit, args.seed, True)
        delta = None
        if cold['holdout']['status'] == warm['holdout']['status'] == 'accepted':
            delta = round(cold['holdout']['cost_ms'] - warm['holdout']['cost_ms'], 6)
        result = {'without_experience': cold, 'with_experience': warm, 'equal_total_units': cold['used_units'] == warm['used_units'] == args.budget,
                  'heldout_cost_difference_ms': delta, 'protocol': 'Both arms pay for the same training phase, validation selection and one final holdout evaluation. Only retention of training experience differs. Do not select/revise on holdout outcomes.'}
    elif day == 17:
        common['evidence'] = 'design'
        result = {'cpu_config': fast_config, 'migration_contract': {'pin': ['engine release/commit', 'model revision', 'driver/runtime', 'GPU topology'],
                  'independent_checks': ['numerical outputs and task quality', 'KV/state updates across steps', 'actual optimized-path execution and fallbacks'],
                  'timing': ['warmup', 'proper device synchronization', 'end-to-end workload', 'paired baseline reruns'], 'budget': ['failed trials', 'compile/setup', 'evaluation', 'rollbacks']},
                  'engine_commands_executed': False, 'scope': 'Map this contract to vLLM/SGLang; this file does not run either framework or infer a GPU speedup.'}
    elif day == 18:
        result = promotion(data, args.memory_limit, fast_config)
    elif day == 19:
        good = evaluate(fast_config, data['validation'], args.memory_limit)
        bad = evaluate({'algorithm': 'buggy', 'cache_size': 0, 'batch_size': 1}, data['validation'], args.memory_limit)
        oom = evaluate({'algorithm': 'formula', 'cache_size': 8, 'batch_size': 4}, data['validation'], args.memory_limit)
        result = {'audit': [{'case': 'incorrect result', **bad}, {'case': 'memory budget', **oom}, {'case': 'allowed candidate', **good}],
                  'failed_trial_cost_is_counted': True, 'rollback_after_failed_canary': promotion(data, args.memory_limit, fast_config)['rollback']}
    else:
        raise ValueError('day20 is assembled from all previous experiments')
    return {**common, **result}


def promotion(data, memory_limit, candidate):
    baseline = evaluate(BASELINE, data['validation'], memory_limit)
    validation = evaluate(candidate, data['validation'], memory_limit)
    holdout = evaluate(candidate, data['holdout'], memory_limit)
    accepted = validation['status'] == holdout['status'] == 'accepted' and validation['cost_ms'] < baseline['cost_ms']
    versions = {'baseline': digest(BASELINE), 'candidate': digest(candidate)}
    current = versions['candidate'] if accepted else versions['baseline']
    # A deliberately failed deployment canary is an independent trigger to restore baseline.
    rollback = {'canary_ok': False, 'before': current, 'after': versions['baseline'], 'restored': True}
    return {'validation': validation, 'holdout': holdout, 'promoted': accepted, 'versions': versions,
            'rollback': rollback, 'boundary': 'Changes a local version pointer only; no service is deployed. A holdout gate is final and must not drive another tuning round on the same holdout.'}


def safe_out(value):
    path = Path(value).absolute()
    if path.is_symlink():
        raise ValueError('output directory may not itself be a symlink')
    path = path.resolve()
    if path == ROOT or path == ROOT / 'fixtures' or ROOT / 'fixtures' in path.parents:
        raise ValueError('choose a separate output directory, not the lab source/fixtures')
    path.mkdir(parents=True, exist_ok=True)
    return path


def write(path, value):
    if path.is_symlink():
        raise ValueError('refusing to overwrite an output symlink')
    body = json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as tmp:
        tmp.write(body)
        temporary = Path(tmp.name)
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('day', choices=['day%d' % n for n in range(1, 21)])
    parser.add_argument('--out', default='out')
    parser.add_argument('--input', type=Path, default=DEFAULT_INPUT)
    parser.add_argument('--seed', type=int, default=7)
    parser.add_argument('--budget', type=int, default=8)
    parser.add_argument('--memory-limit', type=int, default=1536)
    parser.add_argument('--repetitions', type=int, default=7)
    args = parser.parse_args()
    try:
        integer(args.seed, 0, 1000000, 'seed');integer(args.budget, 4, 100, 'budget')
        integer(args.memory_limit, 256, 1048576, 'memory limit');integer(args.repetitions, 3, 31, 'repetitions')
        data, input_hash = load_workloads(args.input)
        out = safe_out(args.out)
        day = int(args.day[3:])
        source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
        results = []
        for n in (range(1, 20) if day == 20 else [day]):
            result = {**daily(n, data, args), 'input_sha256': input_hash, 'source_sha256': source_hash}
            write(out / ('day%02d.json' % n), result)
            results.append(result)
        if day == 20:
            comparison = next(r for r in results if r['day'] == 16)
            final = {'day': 20, 'evidence': 'mixed-teaching-evidence', 'input_sha256': input_hash,
                     'source_sha256': source_hash, 'completed_days': list(range(1, 21)),
                     'final_comparison': comparison, 'limitations': ['finite allowlisted search', 'synthetic cost and memory models', 'visible teaching holdout', 'CPU timings are machine-dependent', 'no GPU/framework execution', 'no claim of open-ended RSI']}
            write(out / 'day20.json', final)
            outputs = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.glob('day[0-9][0-9].json'))}
            manifest = {'version': 1, 'python': sys.version.split()[0], 'input_sha256': input_hash, 'source_sha256': source_hash,
                        'arguments': {k: str(v) if isinstance(v, Path) else v for k, v in vars(args).items()}, 'outputs': outputs}
            report = out / 'REPORT.md'
            if report.is_symlink():
                raise ValueError('refusing to overwrite REPORT.md symlink')
            report.write_text('# RSI Infra learning run / 学习记录\n\nThis is generated execution evidence, not a completed personal portfolio. / 这是运行记录，不代替本人的解释与作品。\n\n'
                              + '- Source SHA-256: ' + source_hash + '\n- Input SHA-256: ' + input_hash
                              + '\n- Equal total budget: ' + str(comparison['equal_total_units'])
                              + '\n- Held-out simulated cost difference (cold minus warm), ms: ' + str(comparison['heldout_cost_difference_ms'])
                              + '\n\n## Evidence / 证据\n\n- day04/day09: actual Python CPU timings; no GPU claim.\n- Other costs: declared simulation; day17: design only.\n- manifest.json: output hashes; no independent reviewer claimed.\n\n## Complete independently / 请独立补齐\n\n1. My hypothesis and one changed variable / 我的假设与单一变量。\n2. Prediction vs observed output, including failures / 预测、观察与失败。\n3. Same-budget comparison and prior collection cost / 同预算比较与经验成本。\n4. Why results may not transfer; a new untouched holdout / 迁移局限与新的留出任务。\n5. Reproduction commands, raw files and rollback criterion / 复现命令、原始文件和回滚条件。\n', encoding='utf-8')
            manifest['outputs']['REPORT.md'] = hashlib.sha256(report.read_bytes()).hexdigest()
            write(out / 'manifest.json', manifest)
        print('PASS day%02d -> %s' % (day, out / ('day%02d.json' % day)))
    except (OSError, ValueError, KeyError, TypeError, AssertionError) as error:
        print('Invalid input or failed experiment: ' + str(error), file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
