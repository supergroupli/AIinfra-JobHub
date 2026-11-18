#!/usr/bin/env python3
"""Offline post-training systems lab. Actual scalar policy updates; modeled systems costs.

No verl, AReaL, neural network, GPU, network connection or downloaded model is used.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import platform
import random
import re
import sys

ROOT = Path(__file__).resolve().parent


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def reward(text, expected):
    match = re.fullmatch(r'#### (-?\d+)', text.strip())
    return int(match is not None and int(match.group(1)) == expected)


def advantages(values):
    if not values:
        raise ValueError('an advantage group must be nonempty')
    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / len(values)
    return [(x - mean) / math.sqrt(variance + 1e-8) for x in values]


def clipped_objective(ratio, advantage, epsilon=.2):
    if ratio <= 0 or not 0 < epsilon < 1:
        raise ValueError('ratio must be positive; epsilon must be between 0 and 1')
    return min(ratio * advantage, min(1 + epsilon, max(1 - epsilon, ratio)) * advantage)


def bernoulli_kl(p, q):
    if not (0 < p < 1 and 0 < q < 1):
        raise ValueError('probabilities must be strictly between 0 and 1')
    return p * math.log(p / q) + (1 - p) * math.log((1 - p) / (1 - q))


def sigmoid(theta):
    return 1 / (1 + math.exp(-max(-40, min(40, theta))))


def rollout(theta, seed, count=32):
    rng = random.Random(seed)
    p = sigmoid(theta)
    rows = []
    for i in range(count):
        a, b = rng.randrange(10), rng.randrange(10)
        action = int(rng.random() < p)
        response = '#### %d' % (a + b if action else a + b + 1)
        rows.append({'id': i, 'a': a, 'b': b, 'action': action, 'response': response,
                     'reward': reward(response, a + b), 'logprob': math.log(p if action else 1-p)})
    return rows


def train(seed, lr, steps=40, state=None):
    """REINFORCE for a scalar Bernoulli policy; deliberately NOT PPO/GRPO or an LLM."""
    theta, start = (state['theta'], state['step']) if state else (0.0, 0)
    history = []
    for step in range(start, start + steps):
        rows = rollout(theta, seed + step * 997)
        p = sigmoid(theta)
        # Exact derivative of log Bernoulli(action; sigmoid(theta)) is action - p.
        gradient = sum(row['reward'] * (row['action'] - p) for row in rows) / len(rows)
        theta += lr * gradient
        history.append({'step': step + 1, 'batch_reward': sum(r['reward'] for r in rows)/len(rows),
                        'gradient': gradient, 'theta': theta, 'probability': sigmoid(theta)})
    return {'theta': theta, 'step': start + steps, 'history': history}


def accept_version(behavior, trainer, max_lag):
    lag = trainer - behavior
    return 0 <= lag <= max_lag


def deduplicate(events):
    seen = {}
    for row in events:
        key = row['id']
        if key in seen and row != seen[key]:
            raise ValueError('conflicting retry for ' + key)
        seen[key] = row
    return list(seen.values())


def async_queue(producer_ms, consumer_ms, capacity, count=12):
    """Single producer / single consumer discrete events. Block producer when queue is full."""
    queue, produced, consumed, now, blocked = [], 0, 0, 0, 0
    next_production, finish, trace, in_flight = producer_ms, None, [], None
    waiting_producer = False
    while consumed < count:
        candidates = [t for t in (next_production, finish) if t is not None]
        now = min(candidates)
        # Consume first on ties, so a newly freed slot is usable at this timestamp.
        if finish == now:
            consumed += 1
            trace.append({'at_ms': now, 'event': 'consumed', 'batch': in_flight, 'queued': len(queue)})
            finish, in_flight = None, None
        if next_production == now:
            if len(queue) < capacity:
                queue.append(produced); produced += 1
                trace.append({'at_ms': now, 'event': 'produced', 'queued': len(queue)})
                next_production = now + producer_ms if produced < count else None
            else:
                blocked += 1
                waiting_producer = True
                next_production = None
        if finish is None and queue:
            in_flight = queue.pop(0); finish = now + consumer_ms
        if waiting_producer and len(queue) < capacity:
            next_production, waiting_producer = now, False
    return {'elapsed_model_ms': now, 'blocked_events': blocked, 'produced': produced,
            'consumed': consumed, 'max_queued': max(e['queued'] for e in trace), 'events': trace}


def daily(day, args):
    if day == 1:
        return {'stages': ['prompt', 'rollout', 'reward', 'update', 'evaluate'],
                'policy': 'one scalar Bernoulli over correct vs off-by-one answer',
                'initial_probability': .5, 'claim_boundary': 'not a language model or generalization benchmark'}
    if day == 2:
        train_ids, val_ids, test_ids = set(range(12)), set(range(12, 16)), set(range(16, 20))
        return {'train_ids': sorted(train_ids), 'validation_ids': sorted(val_ids), 'test_ids': sorted(test_ids),
                'overlap': sorted(train_ids & val_ids), 'injected_leak': sorted(train_ids & (val_ids | {2}))}
    if day == 3:
        samples = ['#### 5', 'I think 5', '#### 50', '#### 5\n#### 6', ' #### 5 ']
        return {'expected': 5, 'cases': [{'response': x, 'reward': reward(x, 5)} for x in samples]}
    if day == 4:
        first, repeat, changed = rollout(0, args.seed), rollout(0, args.seed), rollout(0, args.seed+1)
        return {'rows': first, 'same_seed_equal': first == repeat, 'different_seed_equal': first == changed,
                'batch_sha256': digest(first)}
    if day == 5:
        logprobs, mask = [-1, -2, -3, -4, -9], [0, 0, 1, 1, 0]
        return {'token_roles': ['prompt', 'prompt', 'response', 'response', 'pad'], 'logprobs': logprobs,
                'response_mask': mask, 'response_mean_logprob': sum(a*b for a,b in zip(logprobs,mask))/sum(mask),
                'wrong_unmasked_mean': sum(logprobs)/len(logprobs)}
    if day == 6:
        return {'rewards': [0, 1, 1, 0], 'advantages': advantages([0,1,1,0]),
                'constant_group': advantages([1,1,1,1]), 'variance': 'population, epsilon=1e-8'}
    if day == 7:
        return {'epsilon': .2, 'rows': [{'ratio': r, 'advantage': a, 'objective': clipped_objective(r,a)}
                for r in (.5, 1, 1.5) for a in (-1, 1)]}
    if day == 8:
        return {'reference_p': .5, 'rows': [{'policy_p': p, 'kl_nats': bernoulli_kl(p,.5),
                 'reward_minus_kl': p - .2*bernoulli_kl(p,.5)} for p in (.5,.7,.9)], 'beta': .2}
    if day == 9:
        params = 1_000_000_000
        return {'parameters': params, 'training_fp32_adam_gib': params*16/2**30,
                'rollout_bf16_weights_gib': params*2/2**30, 'sharded_train_gib': params*16/args.shards/2**30,
                'not_counted': ['activations','KV cache','temporary buffers','fragmentation']}
    if day == 10:
        r,t,w = args.rollout_ms,args.train_ms,10
        return {'batches': 12, 'serial_model_ms': 12*(r+t+w),
                'ideal_pipeline_model_ms': r+t+w+11*max(r,t+w),
                'assumptions': 'independent resources, whole-batch handoff, sync included with trainer; no staleness cost'}
    if day == 11:
        return async_queue(args.rollout_ms,args.train_ms,args.buffer)
    if day == 12:
        return {'trainer_version': 8, 'max_lag': args.max_lag,
                'rows': [{'behavior_version': b, 'lag': 8-b, 'accepted': accept_version(b,8,args.max_lag)} for b in (4,6,7,8,9)],
                'note': 'version labels are authoritative; elapsed age alone cannot identify policy version'}
    if day == 13:
        chunks = [{'version': 3,'index': 0,'value': .1}, {'version': 4,'index': 1,'value': .2}]
        versions = {row['version'] for row in chunks}
        return {'mixed_chunks': chunks, 'publish_mixed': len(versions)==1,
                'complete_bundle': {'version': 4,'values': [.2,.2], 'sha256': digest([.2,.2])},
                'publish_rule': 'validate complete bundle and checksum, then atomically switch active version'}
    if day == 14:
        events=[{'id':'a','reward':1},{'id':'b','reward':0},{'id':'a','reward':1}]
        return {'delivery_events':events, 'unique':deduplicate(events),
                'naive_reward_mean': 2/3, 'deduplicated_reward_mean': .5}
    if day == 15:
        whole=train(args.seed,args.lr,20); first=train(args.seed,args.lr,10)
        saved=json.loads(json.dumps({'theta': first['theta'], 'step': first['step']}))
        resumed=train(args.seed,args.lr,10,saved)
        return {'checkpoint':saved,'uninterrupted_theta':whole['theta'],'resumed_theta':resumed['theta'],
                'exact_match': whole['theta']==resumed['theta'], 'seed_rule':'seed + global_step * 997'}
    if day == 16:
        result=train(args.seed,args.lr)
        before=rollout(0,args.seed+100000,256); after=rollout(result['theta'],args.seed+100000,256)
        return {'method':'actual scalar REINFORCE; neither PPO nor GRPO', **result,
                'heldout_rng_seed':args.seed+100000, 'before_accuracy':sum(x['reward'] for x in before)/256,
                'after_accuracy':sum(x['reward'] for x in after)/256,
                'boundary':'same constructed task family; no evidence of language reasoning generalization'}
    if day == 17:
        latencies=[10,10,11,12,13,14,15,20,30,120]
        # Only this serial, gap-free workload makes summed latency equal elapsed time.
        elapsed_model_ms = sum(latencies)
        return {'synthetic_latencies_ms': latencies,'mean_model_ms':sum(latencies)/len(latencies),
                'p95_nearest_rank_ms': sorted(latencies)[math.ceil(.95*len(latencies))-1],
                'workload_assumption': 'serial, no overlap or idle gaps',
                'elapsed_model_ms': elapsed_model_ms,
                'goodput_per_model_second':8/(elapsed_model_ms/1000), 'completed':10,'accepted':8}
    if day == 18:
        return {'framework':'verl', 'reference_tag':'v0.9.1', 'executed_framework':False,
                'contract':{'dataset':'prompt / reward target / split', 'rollout':'tokens / response mask / behavior logprob',
                'trainer':'policy / optimizer / reference policy', 'evidence':'resolved commit / image digest / metrics'},
                'sources':['https://github.com/verl-project/verl/releases/tag/v0.9.1']}
    if day == 19:
        return {'framework':'AReaL', 'reference_tag':'v2.1.1', 'executed_framework':False,
                'services':['agent','inference','training','weight update'],
                'acceptance_examples':daily(12,args)['rows'], 'failure_drill':['pause weight publish','reject future version','retry by stable trajectory ID'],
                'sources':['https://github.com/areal-project/AReaL/releases/tag/v2.1.1']}
    raise ValueError('day must be between 1 and 19')


def write_json(path, value):
    if path.is_symlink():
        raise ValueError('refusing to replace a symlink: '+str(path))
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('day', type=int, choices=range(1,21))
    parser.add_argument('--out', default='out')
    parser.add_argument('--seed',type=int,default=7)
    parser.add_argument('--lr',type=float,default=.3)
    parser.add_argument('--shards',type=int,default=4)
    parser.add_argument('--rollout-ms',type=int,default=40)
    parser.add_argument('--train-ms',type=int,default=60)
    parser.add_argument('--buffer',type=int,default=2)
    parser.add_argument('--max-lag',type=int,default=2)
    args=parser.parse_args()
    try:
        if not 0 <= args.seed <= 100000 or not .001 <= args.lr <= 2 or not 1 <= args.shards <= 64 or not 1 <= args.buffer <= 64 or not 0 <= args.max_lag <= 20 or not all(1 <= n <= 10000 for n in (args.rollout_ms,args.train_ms)):
            raise ValueError('arguments outside supported teaching ranges; see --help')
        out=Path(args.out).resolve()
        if out == ROOT or ROOT.is_relative_to(out):
            raise ValueError('choose a generated output directory, not the lab or an ancestor')
        out.mkdir(parents=True,exist_ok=True)
        configuration={k:v for k,v in vars(args).items() if k not in ('day','out')}
        sources={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in ROOT.glob('*.py')}
        days=range(1,20) if args.day==20 else [args.day]
        for day in days:
            record={'day':day,'evidence':'executed-cpu-teaching-model', 'framework_executed':False,
                    'configuration':configuration,'configuration_sha256':digest(configuration),
                    'source_sha256':sources,'python':platform.python_version(),'result':daily(day,args)}
            write_json(out/('day%02d.json'%day),record)
        if args.day==20:
            files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.glob('day*.json')) if re.fullmatch(r'day(?:0[1-9]|1\d)\.json',p.name)}
            write_json(out/'day20.json',{'day':20,'evidence':'executed-cpu-teaching-model','framework_executed':False,
                       'configuration':configuration,'source_sha256':sources,'files':files,
                       'acceptance':['20 daily investigations','student exercise checks','one controlled change','raw data and limitations'],
                       'not_proven':['LLM training','GPU throughput','production readiness']})
        print('Wrote',out/('day%02d.json'%args.day),'(CPU teaching model; no framework/GPU run)')
    except (ValueError,OSError) as exc:
        parser.exit(2,str(exc)+'\n')


if __name__=='__main__':
    main()
