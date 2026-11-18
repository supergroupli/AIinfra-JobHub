# 后训练 Infra / Post-training systems lab

20 天，从轨迹契约走到可复核作品。全部必做实验只使用 Python 3.9+ 标准库。
Twenty days from trajectory contracts to a reviewable portfolio. Required work uses only Python 3.9+ standard library.

## What actually runs / 实际运行范围

- `lab.py` executes real Python computations and a **one-parameter Bernoulli REINFORCE update**. The policy chooses between a constructed correct answer and an off-by-one answer. It does not learn arithmetic or language.
- Queue timelines, throughput and memory are **declared teaching models**, never GPU measurements. Days 7/8 evaluate scalar objectives, not complete PPO/GRPO training.
- Days 18/19 produce integration contracts for verl/AReaL; they do **not** install or start either framework. No network, account, API key, server or model download is needed for required work.
- 标量策略更新在 CPU 上实际计算，但不是大模型训练。队列、吞吐和内存均为教学假设；第 18/19 天只生成真实框架接入计划。

## Start / 开始

Extract the complete ZIP, then open a terminal inside `post-training`, beside `lab.py`.
完整解压 ZIP，进入包含 `lab.py` 的 `post-training` 目录。

```sh
python3 --version
python3 lab.py 1 --out out
python3 -m json.tool out/day01.json
python3 check_exercises.py --reference
```

On Windows, `py -3` can replace `python3`. Each daily command is independent; it does not require previous outputs. Reusing an output directory replaces generated files with the same names. Use `--out out-comparison` for comparisons.

Windows 可以用 `py -3`。日课均可独立运行，相同目录中的同名生成结果会被覆盖，对照实验请另建输出目录。

## Twenty investigations / 20 天路线

Every row runs as `python3 lab.py DAY --out out`, followed by `python3 -m json.tool out/dayNN.json`.
每天先运行对应编号，再读 JSON；网页提供完整解释、图解、报错与两道解析题。

| Day | Investigation / 调查主题 | What to inspect / 核对字段 |
|---|---|---|
| 1 | Loop and claim boundary / 闭环与结论边界 | `stages`, `policy` |
| 2 | Split leakage / 数据泄漏 | `overlap`, `injected_leak` |
| 3 | Reward parsing / 奖励解析 | Five format/correctness cases / 五种输入 |
| 4 | Sampling reproducibility / 采样复现 | `rows`, `batch_sha256` |
| 5 | Response masks / 响应掩码 | `response_mean_logprob` |
| 6 | Group advantages / 组内优势 | Population variance; zero-signal group / 总体方差与零信号 |
| 7 | PPO clipping / 裁剪目标 | Both advantage signs / 正负优势 |
| 8 | Reference KL / 参考策略 | Direction and nats / 方向与单位 |
| 9 | Memory ledger / 内存账本 | FP32 Adam vs BF16 weights / 状态与权重 |
| 10 | Pipeline / 流水线 | Serial 1320 vs modeled pipeline 880 ms / 模型成本 |
| 11 | Backpressure / 反压 | Bounded queue events / 有界队列事件 |
| 12 | Staleness / 轨迹陈旧 | Reject old AND future versions / 过旧与未来版本 |
| 13 | Weight publication / 权重发布 | Reject mixed versions / 拒绝混合版本 |
| 14 | Idempotency / 幂等 | Deduplicated reward / 去重奖励 |
| 15 | Recovery / 恢复 | Serialized checkpoint matches continuous run / 序列化恢复一致 |
| 16 | Scalar REINFORCE / 标量更新 | Forty updates and independent RNG evaluation / 40步与独立随机序列 |
| 17 | Observability / 可观测性 | Nearest-rank P95 and defined goodput / 分位数与有效吞吐 |
| 18 | verl integration / verl 接入 | Contract only, framework not executed / 只生成契约 |
| 19 | AReaL integration / AReaL 接入 | Service ownership and failure drills / 服务与故障演练 |
| 20 | Portfolio / 作品 | Regenerated days 1–19 and SHA-256 manifest / 重跑与校验清单 |

## Student exercises / 自己动手

Implement `masked_mean`, `accept_trajectory` and `unique_rewards` in `exercises.py` on days 5, 12 and 14. The independent fixed cases live in `check_exercises.py`; `reference.py` is a worked answer to read after your attempt.

第 5/12/14 天分别完成三个函数。首次运行学生检查会返回非零状态和 `NOT YET`，因为函数尚未实现，这是预期现象。只通过参考模式不算完成自己的练习。

```sh
python3 check_exercises.py --reference
python3 check_exercises.py
```

Reference mode should pass 15 cases. Student mode passes only after all three functions meet their contracts. Tests include empty masks, mismatched lengths, future policy versions and conflicting retries.

参考模式应通过 15 个边界用例；学生模式需完成全部函数。参考测试通过只能说明参考实现，不代表已经完成学生实现。

## Controlled comparisons / 受控对照

```sh
python3 lab.py 4 --seed 7 --out out-seed7
python3 lab.py 4 --seed 8 --out out-seed8
python3 lab.py 9 --shards 1 --out out-one-shard
python3 lab.py 9 --shards 8 --out out-eight-shards
python3 lab.py 11 --buffer 1 --out out-small-queue
python3 lab.py 11 --buffer 8 --out out-large-queue
python3 lab.py 12 --max-lag 0 --out out-current-policy
python3 lab.py 16 --lr 0.3 --out out-baseline
python3 lab.py 16 --lr 0.03 --out out-small-lr
python3 lab.py 20 --out out-final
```

Change one factor, predict the effect, inspect raw fields and keep both results. Buffer capacity counts waiting batches, excluding the in-flight training batch. Sampling age alone does not identify a policy version. Memory excludes activations/KV/temporary allocations. Record these assumptions with every plot.

每次只改一个因素。队列容量不含正在训练的一批；年龄不等同于策略版本；显存账本不含激活、KV 和临时分配。图表必须附这些假设。

## Real-framework extension / 真实框架扩展（未执行）

Sources checked 2026-11-18. Reading baselines are **verl v0.9.1** and **AReaL v2.1.1**. These tags identify upstream source references, not a platform-tested GPU environment. A tag can move; record its resolved full commit. Read installation and examples from the selected checkout, because moving `latest` documentation may differ.

资料核对日期 2026-11-18。以下操作需要网络，作用是获取固定标签源码并记录修订；不会自动安装 GPU 环境，也不是本站已跑通的训练命令。先核对当前标签的文档、模型要求、驱动、容器与依赖，再选择真实训练示例。

```sh
git clone --depth 1 --branch v0.9.1 https://github.com/verl-project/verl.git verl-v0.9.1
git -C verl-v0.9.1 rev-parse HEAD
git clone --depth 1 --branch v2.1.1 https://github.com/areal-project/AReaL.git areal-v2.1.1
git -C areal-v2.1.1 rev-parse HEAD
```

For a genuine extension, retain the resolved commits, installation instructions used, dependency snapshot, image digest, model/tokenizer revisions, GPU/driver/CUDA inventory, data revision, exact command and unedited logs. First validate reward/mask/version correctness, then measure time. Do not substitute this lab’s scalar success rate for a model-quality result.

真实扩展至少记录完整 commit、实际安装说明、依赖快照、容器 digest、模型/tokenizer 修订、GPU/驱动/CUDA、数据修订、原始命令和日志。先检查奖励、mask 与版本，再测性能。

Official sources / 一手资料：

- [verl v0.9.1](https://github.com/verl-project/verl/releases/tag/v0.9.1)
- [AReaL v2.1.1](https://github.com/areal-project/AReaL/releases/tag/v2.1.1)
- [verl official quickstart — moving reference](https://verl.readthedocs.io/en/latest/start/quickstart.html)
- [PPO original paper](https://arxiv.org/abs/1707.06347)

## Acceptance / 验收

Submit your completed `REPORT_TEMPLATE.md`, modified exercise source, student check output, one controlled comparison and all raw JSON files. Day 20 hashes nineteen regenerated daily records and the Python source. A hash establishes content identity, not independent reproduction or correctness. A reviewer should explain the reward parser, a negative-advantage clipping case, rejection of a future version and the recovery seed rule before accepting the work.

交付自己的报告、练习实现、检查输出、一个对照及原始 JSON。哈希仅证明内容一致，不自动证明正确性或第三方复现。评审应能核对奖励解析、负优势裁剪、未来版本拒绝与恢复种子规则。
