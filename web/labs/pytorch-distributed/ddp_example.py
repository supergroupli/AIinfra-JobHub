#!/usr/bin/env python3
"""Actual two-rank DDP correctness + checkpoint recovery, torch 2.6.0.
Default Gloo uses CPUs; the optional NCCL path requires two compatible GPUs.
"""
import argparse
import datetime
import hashlib
import json
import os
import platform
from pathlib import Path
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP


def make_model(device):
    model = torch.nn.Linear(1, 1, bias=False).to(device)
    with torch.no_grad():
        model.weight.zero_()
    return model


def global_baseline(steps, device):
    model = make_model(device)
    optimizer = torch.optim.SGD(model.parameters(), lr=.1, momentum=.2)
    x = torch.tensor([[1.], [2.]], device=device)
    weights = []
    for _ in range(steps):
        optimizer.zero_grad()
        ((model(x) - 2*x)**2).mean().backward()
        optimizer.step()
        weights.append(model.weight.detach().cpu().item())
    return weights


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend', choices=['gloo', 'nccl'], default='gloo')
    parser.add_argument('--out', default='out/ddp')
    parser.add_argument('--steps', type=int, default=4)
    args = parser.parse_args()
    if args.steps < 2 or args.steps > 8:
        parser.error('Use 2..8 steps so the missing-optimizer control remains visible above float32 rounding')
    if torch.__version__.split('+')[0] != '2.6.0':
        raise SystemExit('Use torch==2.6.0 for this teaching baseline.')
    if 'LOCAL_RANK' not in os.environ:
        raise SystemExit('Launch with torchrun --standalone --nproc-per-node=2 ddp_example.py')
    local = int(os.environ['LOCAL_RANK'])
    device = torch.device('cuda', local) if args.backend == 'nccl' else torch.device('cpu')
    if args.backend == 'nccl':
        torch.cuda.set_device(device)
    torch.set_num_threads(1)
    dist.init_process_group(args.backend, timeout=datetime.timedelta(seconds=45))
    rank = dist.get_rank()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    document = {'status': 'FAILED', 'rank': rank, 'world_size': dist.get_world_size(),
                'backend': args.backend, 'torch': torch.__version__,
                'python': platform.python_version(), 'platform': platform.platform(),
                'started_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'evidence': 'measured-pytorch-' + args.backend,
                'source_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                'boundary': 'One host, two ranks, one scalar weight. Correctness and optimizer recovery only; not training throughput or model quality.',
                'trace': [], 'resumed_trace': []}
    try:
        if dist.get_world_size() != 2:
            raise RuntimeError('This experiment requires exactly two ranks')
        baseline = global_baseline(args.steps, device)
        model = make_model(device)
        kwargs = {'device_ids': [local]} if args.backend == 'nccl' else {}
        ddp = DDP(model, **kwargs)
        optimizer = torch.optim.SGD(ddp.parameters(), lr=.1, momentum=.2)
        x = torch.tensor([[rank + 1.]], device=device)
        target = 2*x
        midpoint = args.steps // 2
        checkpoint = out / ('checkpoint-rank%d.pt' % rank)
        for step in range(args.steps):
            optimizer.zero_grad()
            before = model.weight.detach().cpu().item()
            loss = ((ddp(x) - target)**2).mean()
            loss.backward()
            gradient = model.weight.grad.detach().cpu().item()
            optimizer.step()
            weight = model.weight.detach().cpu().item()
            torch.testing.assert_close(model.weight.detach(), torch.full_like(model.weight, baseline[step]))
            document['trace'].append({'step': step+1, 'weight_before': before,
                                      'local_input': rank+1, 'local_loss': loss.detach().cpu().item(),
                                      'averaged_gradient': gradient, 'weight_after': weight,
                                      'global_batch_reference': baseline[step]})
            if step+1 == midpoint:
                torch.save({'model': model.state_dict(), 'optimizer': optimizer.state_dict(),
                            'completed_steps': midpoint}, checkpoint)
        # Restore into new objects; SGD momentum must also resume, not just weights.
        state = torch.load(checkpoint, map_location=device, weights_only=True)
        resumed_model = make_model(device)
        resumed_model.load_state_dict(state['model'])
        resumed = DDP(resumed_model, **kwargs)
        resumed_optimizer = torch.optim.SGD(resumed.parameters(), lr=.1, momentum=.2)
        resumed_optimizer.load_state_dict(state['optimizer'])
        for step in range(state['completed_steps'], args.steps):
            resumed_optimizer.zero_grad()
            ((resumed(x) - target)**2).mean().backward()
            resumed_optimizer.step()
            weight = resumed_model.weight.detach().cpu().item()
            torch.testing.assert_close(resumed_model.weight.detach(), torch.full_like(resumed_model.weight, baseline[step]))
            document['resumed_trace'].append({'step': step+1, 'weight': weight,
                                              'global_batch_reference': baseline[step]})
        values = [torch.zeros_like(resumed_model.weight) for _ in range(2)]
        dist.all_gather(values, resumed_model.weight.detach())
        torch.testing.assert_close(values[0], values[1])
        assert abs(document['trace'][0]['weight_after'] - 1.0) < 1e-6
        # This deliberately incomplete recovery is a control, not an actual failure.
        wrong = make_model(device)
        wrong.load_state_dict(state['model'])
        wrong_optimizer = torch.optim.SGD(wrong.parameters(), lr=.1, momentum=.2)
        full_x = torch.tensor([[1.], [2.]], device=device)
        for _ in range(state['completed_steps'], args.steps):
            wrong_optimizer.zero_grad()
            ((wrong(full_x) - 2*full_x)**2).mean().backward()
            wrong_optimizer.step()
        wrong_weight = wrong.weight.detach().cpu().item()
        assert abs(wrong_weight - baseline[-1]) > 1e-6
        document.update(status='PASS', weight=model.weight.detach().cpu().item(),
                        resumed_weight=resumed_model.weight.detach().cpu().item(),
                        resume_matches=True, baseline_weights=baseline,
                        missing_optimizer_control_weight=wrong_weight,
                        rank_weights=[value.detach().cpu().item() for value in values])
    except Exception as error:
        document['error'] = type(error).__name__ + ': ' + str(error)
        raise
    finally:
        try:
            path = out / ('rank-%d.json' % rank)
            path.write_text(json.dumps(document, indent=2) + '\n', encoding='utf-8')
            print(json.dumps({'rank': rank, 'status': document['status'], 'artifact': str(path)}), flush=True)
        finally:
            dist.destroy_process_group()


if __name__ == '__main__':
    main()
