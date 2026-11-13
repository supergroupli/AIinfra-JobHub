#!/usr/bin/env python3
"""CPU-only teaching experiments. Synthetic clocks are not hardware measurements."""
import argparse
import csv
import hashlib
import json
import math
import platform
import statistics
import time
from pathlib import Path

BOUNDARY = "Teaching simulation / 教学模拟; not LLM or GPU measurements."


def save_json(folder, name, value):
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def percentile(values, q):
    """Nearest rank: sorted[ceil(q*n)-1]; no samples => None."""
    if not 0 < q <= 1:
        raise ValueError("q must be in (0, 1]")
    ordered = sorted(values)
    return ordered[max(0, math.ceil(len(ordered) * q) - 1)] if ordered else None


def kv_bytes(layers, kv_heads, head_dim, tokens, sequences, bytes_per_element=2):
    values = (layers, kv_heads, head_dim, tokens, sequences, bytes_per_element)
    if any(not isinstance(v, int) or isinstance(v, bool) or v <= 0 for v in values):
        raise ValueError("all dimensions must be positive integers")
    return 2 * layers * kv_heads * head_dim * tokens * sequences * bytes_per_element


def make_records():
    """24 synthetic requests; 22 successes, one error and one timeout."""
    records = []
    for i in range(24):
        arrival = i * 100
        status = "error" if i == 22 else "timeout" if i == 23 else "ok"
        tokens = 1 if i == 0 else 5
        first = arrival + 20 + (i % 4) * 5
        end = first + (tokens - 1) * 10
        records.append({"request_id": "r%02d" % i, "arrival_ms": arrival,
                        "first_ms": first if status == "ok" else None,
                        "end_ms": end if status == "ok" else arrival + (15 if status == "error" else 200),
                        "output_tokens": tokens if status == "ok" else 0, "status": status,
                        "source": "synthetic"})
    return records


def summarize(records):
    success = [r for r in records if r["status"] == "ok"]
    ttft = [r["first_ms"] - r["arrival_ms"] for r in success]
    e2e = [r["end_ms"] - r["arrival_ms"] for r in success]
    tpot = [(r["end_ms"] - r["first_ms"]) / (r["output_tokens"] - 1)
            for r in success if r["output_tokens"] > 1]
    window = max((r["end_ms"] for r in records), default=0) - min((r["arrival_ms"] for r in records), default=0)
    return {"total": len(records), "success": len(success),
            "errors": sum(r["status"] == "error" for r in records),
            "timeouts": sum(r["status"] == "timeout" for r in records),
            "failure_rate": (len(records) - len(success)) / len(records) if records else None,
            "ttft_p50_ms": percentile(ttft, .5), "ttft_p95_ms": percentile(ttft, .95),
            "e2e_p95_ms": percentile(e2e, .95),
            "tpot_mean_ms": statistics.mean(tpot) if tpot else None,
            "tpot_samples": len(tpot), "window_ms": window,
            "successful_requests_per_s": len(success) / (window / 1000) if window > 0 else None,
            "measurement": "synthetic clock; not real model throughput"}


def queue(arrivals, services=None, batch_size=1):
    """Non-preemptive FIFO; batch cost 2+max(service), no batching timer.

    Teaching assumption: batch items run in parallel at a cost unrelated to a GPU.
    A batch includes only requests already arrived when the server becomes free.
    """
    if batch_size < 1 or not isinstance(batch_size, int):
        raise ValueError("batch_size must be a positive integer")
    services = [8] * len(arrivals) if services is None else services
    if len(services) != len(arrivals) or any(s <= 0 for s in services):
        raise ValueError("one positive service duration is required per arrival")
    requests = sorted(zip(range(len(arrivals)), arrivals, services), key=lambda r: (r[1], r[0]))
    now, cursor, results = 0, 0, []
    while cursor < len(requests):
        now = max(now, requests[cursor][1])
        end = cursor + 1
        while end < len(requests) and end - cursor < batch_size and requests[end][1] <= now:
            end += 1
        batch = requests[cursor:end]
        duration = max(r[2] for r in batch) + (2 if batch_size > 1 else 0)
        for ident, arrival, _ in batch:
            results.append({"request_id": "r%02d" % ident, "arrival_ms": arrival,
                            "start_ms": now, "end_ms": now + duration,
                            "wait_ms": now - arrival, "service_ms": duration,
                            "batch_size_actual": len(batch), "source": "synthetic"})
        now += duration
        cursor = end
    return results


def queue_summary(rows):
    return {"requests": len(rows), "wait_p95_ms": percentile([r["wait_ms"] for r in rows], .95),
            "service_p95_ms": percentile([r["service_ms"] for r in rows], .95),
            "completion_ms": max((r["end_ms"] for r in rows), default=0)}


def day1(out):
    result = {"request_id": "demo-001", "source": "synthetic", "stages": [
        {"name": "validation", "start_ms": 0, "end_ms": 2},
        {"name": "queue", "start_ms": 2, "end_ms": 12},
        {"name": "prefill", "start_ms": 12, "end_ms": 32},
        {"name": "decode", "start_ms": 32, "end_ms": 62},
        {"name": "delivery", "start_ms": 62, "end_ms": 65}],
        "first_visible_token_ms": 32, "end_ms": 65, "boundary": BOUNDARY}
    save_json(out, "day01-timeline.json", result)
    print("DAY 1: first visible token = 32 ms; completion = 65 ms (synthetic)")
    return result


def day2(out):
    rows = [{"tokens": tokens, "sequences": n, "bytes": kv_bytes(32, 8, 128, tokens, n),
             "gib": kv_bytes(32, 8, 128, tokens, n) / 2**30}
            for tokens in (2048, 8192) for n in (1, 8)]
    save_json(out, "day02-kv.json", {"assumptions": "toy 32-layer, 8 KV-head dense cache; 2-byte elements; no sharing or sharding", "rows": rows})
    print("DAY 2: KV GiB = " + ", ".join(str(r["gib"]) for r in rows))
    return rows


def day3(out):
    records = make_records()
    out.mkdir(parents=True, exist_ok=True)
    (out / "day03-requests.jsonl").write_text("".join(json.dumps(r) + "\n" for r in records), encoding="utf-8")
    result = summarize(records)
    save_json(out, "day03-summary.json", result)
    print("DAY 3: 24 requests, 22 successes, 1 error, 1 timeout; p95 TTFT = %s ms; TPOT samples = %s" % (result["ttft_p95_ms"], result["tpot_samples"]))
    return result


def day4(out):
    rows = []
    for n in (100, 1000, 10000):
        a, b = [1.0] * n, [2.0] * n
        start = time.perf_counter()
        c = [x + y for x, y in zip(a, b)]
        elapsed = (time.perf_counter() - start) * 1000
        assert c == [3.0] * n
        rows.append({"n": n, "cpu_python_elapsed_ms": elapsed})
    result = {"ideal_float32_vector_add_flops_per_byte": 1 / 12,
              "ideal_float32_matmul_n384_flops_per_byte": (2 * 384**3) / (3 * 384**2 * 4),
              "cpu_observations": rows,
              "boundary": "CPU list timings include Python overhead. Ideal float32 traffic excludes caches; not the memory layout of Python objects. No GPU benchmark."}
    save_json(out, "day04-cost.json", result)
    print("DAY 4: ideal vector add = 0.083333 FLOP/byte; n=384 matmul = 64 FLOP/byte; CPU times vary")
    return result


def day5(out):
    result = {}
    for name, arrivals in (("steady", [i * 12 for i in range(12)]), ("burst", [0] * 12)):
        for batch_size in (1, 4):
            key = "%s_batch%d" % (name, batch_size)
            rows = queue(arrivals, batch_size=batch_size)
            save_json(out, "day05-%s.json" % key, rows)
            result[key] = queue_summary(rows)
    save_json(out, "day05-comparison.json", result)
    print("DAY 5: burst FIFO completes at 96 ms; batch4 at 30 ms; steady batch4 has 10 ms vs FIFO 8 ms service")
    return result


def day6(out):
    cache, rows = {}, []
    cases = [("first", "model-v1", "team-a", [11, 22, 33]),
             ("repeat", "model-v1", "team-a", [11, 22, 33]),
             ("changed-token", "model-v1", "team-a", [11, 22, 34]),
             ("changed-model", "model-v2", "team-a", [11, 22, 33]),
             ("changed-namespace", "model-v1", "team-b", [11, 22, 33])]
    for name, model, namespace, tokens in cases:
        key = (model, namespace, tuple(tokens))
        hit = key in cache
        cache[key] = {"toy_state": list(tokens)}
        rows.append({"case": name, "hit": hit, "toy_tokens_reused": len(tokens) if hit else 0})
    save_json(out, "day06-cache.json", {"cases": rows, "boundary": "Exact-key dictionary; not vLLM block caching or measured compute savings."})
    print("DAY 6: hits = [False, True, False, False, False]; only the exact repeat reuses the toy state")
    return rows


def day7(out):
    weight_gib = 1_000_000_000 * 2 / 2**30
    rows = []
    for tokens in (2048, 8192, 16384):
        cache_gib = kv_bytes(32, 8, 128, tokens, 8) / 2**30
        required = weight_gib + cache_gib + 2
        rows.append({"tokens": tokens, "weight_gib": weight_gib, "kv_gib": cache_gib,
                     "assumed_workspace_gib": 2, "required_gib": required,
                     "budget_after_20_percent_reserve_gib": 16 * .8, "fits_estimate": required <= 16 * .8})
    save_json(out, "day07-budget.json", {"note": "Illustrative independent dimensions, not a real model configuration. Workspace=2 GiB and 20% reserve are assumptions, not guarantees.", "rows": rows})
    print("DAY 7: estimated fit for contexts 2048 / 8192 / 16384 = [True, True, False]")
    return rows


def day8(out):
    arrivals = [0] * 12
    source = json.dumps(arrivals, separators=(",", ":")).encode()
    rows = []
    for run in range(1, 4):
        for batch_size in (1, 4):
            result = queue(arrivals, batch_size=batch_size)
            save_json(out, "day08-run%d-batch%d.json" % (run, batch_size), result)
            rows.append({"run": run, "batch_size": batch_size, **queue_summary(result)})
    save_json(out, "day08-manifest.json", {"python": platform.python_version(), "platform": platform.platform(),
              "input_sha256": hashlib.sha256(source).hexdigest(), "arrivals_ms": arrivals,
              "service_ms": 8, "batch_overhead_ms": 2, "repeats": 3,
              "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "interpretation": "Identical deterministic repeats verify replay, not statistical confidence or hardware speedup."})
    with (out / "day08-results.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print("DAY 8: 6 runs saved with manifest and CSV; deterministic repeats should match")
    return rows


def day9(out):
    scenarios = {"baseline": ([i * 12 for i in range(12)], [8] * 12),
                 "burst": ([0] * 12, [8] * 12),
                 "slow_service": ([i * 12 for i in range(12)], [20] * 12)}
    result = {}
    for name, (arrivals, services) in scenarios.items():
        rows = queue(arrivals, services)
        save_json(out, "day09-%s-traces.json" % name, rows)
        result[name] = queue_summary(rows)
    save_json(out, "day09-diagnosis.json", result)
    print("DAY 9: baseline/burst/slow service p95 = 8/8/20 ms; burst and slow service both increase queue waits")
    return result


def day10(out):
    for fn in DAYS[:9]:
        fn(out)
    summary = json.loads((out / "day05-comparison.json").read_text(encoding="utf-8"))
    text = """# My AI Infra foundations portfolio / 我的系统基础作品

Evidence type: **teaching simulation**, plus Day 4 local CPU timing.
证据类型：**教学模拟**，仅第 4 天含本机 CPU 计时。没有运行模型，没有测量 GPU。

## Reproduce / 复现
Python 3.9+ standard library; run `python3 lab.py day10 --out artifacts`.
The environment, script hash and input hash are in day08-manifest.json.
环境、脚本哈希与输入哈希见 day08-manifest.json。

## Controlled result / 对照结果
Burst workload: FIFO completes at {fifo} simulated ms; batch4 at {batch} simulated ms.
This follows the declared parallel-batch cost assumption; it is not a vLLM speedup.
突发负载：FIFO 在模拟 {fifo} ms 完成，batch4 在模拟 {batch} ms 完成。
该结果由批处理成本假设决定，不能写成 vLLM 加速倍数。

## My contribution / 我的独立贡献
TODO: Explain the functions you changed, link the diff, and include your challenge result.
待完成：写清自己改过的函数、代码差异与挑战题结果；不要把下载示例写成独立开发。

## Counterexample / 反例
With arrivals 12 ms apart, no queue forms. The toy batch overhead increases service from 8 to 10 ms.
每 12 ms 到达一条请求时没有排队；教学批处理开销使服务从 8 ms 增至 10 ms。

## Incident / 故障解释
Compare day09 traces: burst changes arrival times; slow_service changes service time.
对照 day09 日志：突发改变到达时间，慢服务改变执行时长。单看排队增加不能区分原因。

## Limitations and next step / 局限与下一步
No GPU, tokenizer, real HTTP, KV allocator, or production scheduler is implemented.
Next: repeat a small workload on a version-pinned vLLM service and record actual units and failures.
未实现 GPU、真实 tokenizer、HTTP、KV 分配器或生产调度器。
下一步：在固定版本的 vLLM 服务上重新测量，明确指标单位并记录失败。
""".format(fifo=summary["burst_batch1"]["completion_ms"], batch=summary["burst_batch4"]["completion_ms"])
    (out / "REPORT.md").write_text(text, encoding="utf-8")
    print("DAY 10: %s generated; fill My contribution before sharing" % (out / "REPORT.md"))
    return summary


DAYS = [day1, day2, day3, day4, day5, day6, day7, day8, day9, day10]


def main():
    parser = argparse.ArgumentParser(description=BOUNDARY)
    parser.add_argument("day", choices=["day%d" % n for n in range(1, 11)])
    parser.add_argument("--out", type=Path, default=Path("artifacts"), help="Output directory (default: artifacts)")
    args = parser.parse_args()
    print(BOUNDARY)
    DAYS[int(args.day[3:]) - 1](args.out)
    print("Saved to: %s" % args.out.resolve())


if __name__ == "__main__":
    main()
