"""Offline control-plane teaching experiments. No llm-d or Kubernetes runs here."""
import argparse
from collections import OrderedDict
import hashlib
import json
import math
from pathlib import Path
import platform

ROOT = Path(__file__).resolve().parent


def route(endpoints):
    eligible = [e for e in endpoints if e['ready'] and e['age_ms'] <= 1000]
    if not eligible:
        return None
    return min(eligible, key=lambda e: (e['queue_ms'] + e['prefill_ms'], e['id']))['id']


def capacity(p, d, network):
    limits = {'prefill': p * 1000 / 40, 'decode': d * 1000 / 100, 'network': network / 8}
    return {'limits_rps': limits, 'capacity_rps': min(limits.values()), 'bottlenecks': [k for k, v in limits.items() if v == min(limits.values())]}


def percentile(values, percent):
    if not values:
        return None
    return sorted(values)[max(0, math.ceil(len(values) * percent / 100) - 1)]


def prefix_length(left, right):
    count = 0
    for a, b in zip(left, right):
        if a != b:
            break
        count += 1
    return count


def daily(day, stress=False):
    """All times/capacities below are declared synthetic inputs, never timings."""
    if day == 1:
        return {'request': {'id': 'r1', 'model': 'demo-v1', 'prompt_tokens': 120, 'output_limit': 20 if not stress else 200}, 'hops': ['client', 'proxy', 'endpoint-picker', 'model-server', 'client'], 'picker_returns': 'endpoint address', 'model_executed': False}
    if day == 2:
        pods = [{'id': 'a', 'model': 'demo-v1', 'ready': not stress}, {'id': 'b', 'model': 'demo-v2', 'ready': True}, {'id': 'c', 'model': 'demo-v1', 'ready': False}]
        return {'selector': {'model': 'demo-v1'}, 'pods': pods, 'eligible': [p['id'] for p in pods if p['model'] == 'demo-v1' and p['ready']], 'empty_pool_action': 'reject or bounded wait; never choose the wrong model'}
    if day == 3:
        endpoints = [{'id': 'hot', 'ready': True, 'age_ms': 0, 'queue_ms': 120 if stress else 10, 'prefill_ms': 20}, {'id': 'cold', 'ready': True, 'age_ms': 0, 'queue_ms': 5, 'prefill_ms': 80}]
        return {'endpoints': endpoints, 'cost_ms': {e['id']: e['queue_ms'] + e['prefill_ms'] for e in endpoints}, 'selected': route(endpoints)}
    if day == 4:
        cached = [10, 11, 12, 13, 14, 15, 16, 17]
        request = [10, 11, 99 if stress else 12, 13, 14, 15, 80, 81]
        matched = prefix_length(cached, request)
        return {'cached_tokens': cached, 'request_tokens': request, 'matching_prefix_tokens': matched, 'block_size': 4, 'reusable_full_block_tokens': matched // 4 * 4, 'same_model_tokenizer_adapter_required': True}
    if day == 5:
        slots, cache, events = (2 if stress else 3), OrderedDict(), []
        for key in ['A', 'B', 'C', 'A', 'D', 'B', 'A']:
            hit = key in cache
            if hit: cache.move_to_end(key)
            else: cache[key] = True
            evicted = cache.popitem(last=False)[0] if len(cache) > slots else None
            events.append({'key': key, 'hit': hit, 'evicted': evicted, 'resident': list(cache)})
        return {'slots': slots, 'events': events, 'hits': sum(e['hit'] for e in events), 'references_and_inflight_requests_omitted': True}
    if day == 6:
        endpoints = [{'id': 'a', 'ready': True, 'age_ms': 2000 if stress else 20, 'queue_ms': 0, 'prefill_ms': 10}, {'id': 'b', 'ready': True, 'age_ms': 30, 'queue_ms': 20, 'prefill_ms': 20}]
        return {'ttl_ms': 1000, 'endpoints': endpoints, 'selected': route(endpoints), 'policy': 'exclude stale telemetry in this teaching policy'}
    if day == 7:
        return {'assumptions': {'prefill_ms': 40, 'decode_ms': 100, 'kv_MB_per_request': 8}, 'p_replicas': 2, 'd_replicas': 4, 'network_MBps': 80 if stress else 800, **capacity(2, 4, 80 if stress else 800)}
    if day == 8:
        mb, bandwidth, setup, saved = (32 if stress else 8), 1000, 2, 20
        transfer = setup + mb / bandwidth * 1000
        return {'kv_MB': mb, 'network_MBps': bandwidth, 'setup_ms': setup, 'prefill_saved_ms': saved, 'transfer_ms': transfer, 'net_saved_ms': saved - transfer, 'disaggregate_wins_in_model': transfer < saved}
    if day == 9:
        stages = {'proxy_ms': 3, 'queue_ms': 80 if stress else 10, 'prefill_ms': 40, 'transfer_ms': 8, 'first_decode_ms': 5, 'remaining_decode_ms': 95}
        return {'stages': stages, 'ttft_ms': sum(stages.values()) - stages['remaining_decode_ms'], 'total_ms': sum(stages.values()), 'first_token_convention': 'first token emitted after first_decode; not necessarily the engine convention'}
    if day == 10:
        latencies = [40, 45, 48, 50, 55, 60, 65, 70, 75, 250 if stress else 80]
        failures = 2 if stress else 0
        return {'successful_ttft_ms': latencies, 'failed': failures, 'total_requests': len(latencies) + failures, 'p95_ms': percentile(latencies, 95), 'slo_ms': 100, 'slo_good_fraction_all_requests': sum(x <= 100 for x in latencies) / (len(latencies) + failures), 'quantile_method': 'nearest rank; only 10 successes, not a stable tail estimate'}
    if day == 11:
        budget, requests, used, rows = 1000, [300, 500, 600 if stress else 200], 0, []
        for tokens in requests:
            accepted = used + tokens <= budget
            if accepted: used += tokens
            rows.append({'estimated_tokens': tokens, 'admitted': accepted, 'reserved_after': used})
        return {'reservation_budget_tokens': budget, 'requests': rows, 'release_after_completion_required': True}
    if day == 12:
        states = ['timeout-before-stream', 'timeout-before-stream', 'success'] if stress else ['timeout-before-stream', 'success']
        max_attempts = 2
        attempted = states[:max_attempts]
        return {'backend_outcomes': states, 'max_attempts_including_first': max_attempts, 'attempted': attempted, 'succeeded': 'success' in attempted, 'after_first_token_policy': 'do not transparently restart a partial stream', 'generation_may_have_run_before_timeout': True}
    if day == 13:
        states = [{'second': 0, 'alive': True, 'weights_loaded': False, 'warmed': False}, {'second': 30, 'alive': True, 'weights_loaded': True, 'warmed': False}, {'second': 60, 'alive': True, 'weights_loaded': True, 'warmed': not stress}]
        for row in states: row['ready'] = row['alive'] and row['weights_loaded'] and row['warmed']
        return {'states': states, 'restart_needed': False, 'policy': 'readiness requires this model warmup; liveness alone does not'}
    if day == 14:
        replicas, unavailable, demand = 4, (2 if stress else 1), 25
        available = max(0, replicas - unavailable)
        return {'replicas': replicas, 'max_unavailable': unavailable, 'conservative_available': available, 'rps_per_replica': 10, 'capacity_rps': available * 10, 'demand_rps': demand, 'spare_rps': available * 10 - demand, 'assumptions': ['otherwise healthy replicas', 'correct readiness', 'capacity additivity', 'maxSurge capacity not counted']}
    if day == 15:
        queue, replicas, calm = ([4, 12, 4, 12, 4, 12] if stress else [4, 12, 13, 4, 3, 2]), 2, 0
        events = []
        for depth in queue:
            if depth > 10:
                replicas = min(4, replicas + 1); calm = 0
            elif depth < 5:
                calm += 1
                if calm >= 3: replicas = max(1, replicas - 1); calm = 0
            else: calm = 0
            events.append({'queue': depth, 'desired_replicas': replicas, 'consecutive_low': calm})
        return {'events': events, 'scale_down_after_low_samples': 3, 'warmup_delay_omitted': True, 'policy_is_not_llmd_autoscaler': True}
    if day == 16:
        demand = {'A': 100, 'B': 2 if stress else 100}
        allocated = {'A': 0, 'B': 0}; schedule = []
        while len(schedule) < 12 and any(allocated[k] < demand[k] for k in demand):
            for tenant in ['A', 'A', 'B']:
                if len(schedule) < 12 and allocated[tenant] < demand[tenant]:
                    schedule.append(tenant); allocated[tenant] += 1
        return {'weights': {'A': 2, 'B': 1}, 'demand': demand, 'schedule': schedule, 'allocated': allocated, 'assumption': 'equal request costs; request fairness is not token or GPU-time fairness'}
    if day == 17:
        ready = [False, False, False] if stress else [False, True, True]
        endpoints = [{'id': chr(97+i), 'ready': state, 'age_ms': 0, 'queue_ms': i*10, 'prefill_ms': 20} for i, state in enumerate(ready)]
        selected = route(endpoints)
        return {'endpoints': endpoints, 'selected': selected, 'action': 'bounded rejection' if selected is None else 'route to healthy endpoint', 'failure_detection_delay_omitted': True}
    if day == 18:
        costs, good = [2, 3], [100, 80 if stress else 180]
        rows = [{'system': k, 'hourly_cost_units': cost, 'slo_good_requests_per_hour': n, 'cost_per_good_request': cost/n} for k, cost, n in zip(['A', 'B'], costs, good)]
        return {'rows': rows, 'preferred': min(rows, key=lambda x: x['cost_per_good_request'])['system'], 'cost_units_are_synthetic': True}
    if day == 19:
        return {'upstream': 'https://github.com/llm-d/llm-d', 'tag': 'v1.0.0', 'source_checked': '2026-11-18', 'deployment_executed': False, 'required_artifacts': ['git commit', 'chart versions', 'container digests', 'model revision', 'hardware and network', 'request trace', 'raw metrics', 'rollback plan'], 'change': 'cache-affinity policy' if not stress else 'telemetry TTL', 'stop_condition': 'stop if model mismatch, request corruption or SLO regression', 'commands': ['git clone --branch v1.0.0 --depth 1 https://github.com/llm-d/llm-d.git upstream-llm-d', 'git -C upstream-llm-d rev-parse HEAD'], 'no_cluster_mutation': True}
    if day == 20:
        pairs = [{'day': n, 'baseline': daily(n), 'stress': daily(n, True)} for n in range(1, 20)]
        return {'comparisons': pairs, 'student_conclusion_required': True, 'real_framework_run': False}
    raise ValueError('day must be 1..20')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('day', choices=['day%d' % n for n in range(1, 21)])
    parser.add_argument('--variant', choices=['baseline', 'stress'], default='baseline')
    parser.add_argument('--out', type=Path, default=Path('out'))
    args = parser.parse_args()
    destination = args.out.resolve()
    if destination == ROOT or ROOT in destination.parents and destination.parts[len(ROOT.parts)] != 'out':
        parser.error('Use a separate output directory or the lab out/ directory.')
    destination.mkdir(parents=True, exist_ok=True)
    day = int(args.day[3:])
    payload = {'day': day, 'variant': args.variant, 'evidence': 'synthetic-control-plane-model', 'framework_executed': False, 'python': platform.python_version(), 'source_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'result': daily(day, args.variant == 'stress')}
    target = destination / ('day%02d.json' % day)
    if target.is_symlink(): parser.error('Output file must not be a symlink.')
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if day == 20:
        report = destination / 'REPORT.md'
        if report.is_symlink(): parser.error('Report must not be a symlink.')
        report.write_text('# llm-d control-plane learning portfolio / 学习作品\n\nGenerated evidence: synthetic-control-plane-model; no framework deployment.\n生成证据为CPU教学模型，无真实框架部署。\n\n## My hypothesis / 本人假设\nTODO\n\n## One changed variable and code diff / 单变量与源码差异\nTODO\n\n## Predictions and observations / 预测与观察\nTODO\n\n## Counterexample and limitations / 反例与局限\nTODO\n\n## Clean reproduction command / 干净复现命令\nTODO\n\n## Real-system validation plan / 真实系统验证计划\nTODO\n', encoding='utf-8')
    print(str(target))


if __name__ == '__main__':
    main()
