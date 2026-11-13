# PyTorch分布式训练 / Distributed training · 聘枢实验包

## 开始 / Start

下载并解压ZIP，在终端进入 `pytorch-distributed` 文件夹（父目录执行 `cd pytorch-distributed`）。标准库路线需要Python3.9+，无需pip安装、GPU或付费API。Windows可将python3换为py -3。所有命令在这个目录运行。

Extract the ZIP and enter `pytorch-distributed`. The standard-library path uses Python3.9+, no packages/GPU/API. Windows may use py -3. Run all commands inside this directory.

```bash
python3 lab.py selfcheck
python3 lab.py day1
python3 lab.py day10 --out final-work
```

`day10`重跑前9天并生成`final-work/REPORT.md`、`manifest.csv`和原始JSON；报告包含TODO，必须自己填写贡献、解释和局限。不要将下载示例称为独立开发。每天可用`--out`选择新目录，避免覆盖原始实验。

`day10` replays days1–9, exports raw JSON plus a manifest and report scaffold. Fill every TODO with your contribution, reasoning and limits. Downloaded examples are not independent work. Use a new `--out` directory to retain each experiment.

## 独立挑战 / Independent challenge

在`student.py`实现`weighted_gradient`。提示：先验证means与counts长度相同、计数为正整数，再用sum(mean×count)/sum(count)。不等批量不能简单平均rank。 先手算两个用例，再运行验收；额外增加你自己的反例。

Implement `weighted_gradient` in student.py. Hint: Validate equal lengths and positive integer counts, then sum(mean×count)/sum(count). Rank averages do not handle unequal batches. Hand-calculate two cases, then check and add your own counterexample.

```bash
python3 check.py
```

第一次显示`NOT YET`是正常现象；正确实现后应显示`PASS: your implementation`。参考解法在`solutions.py`，建议先独立尝试再看。

The initial `NOT YET` is intentional. Your completed implementation should pass. Try independently before reading solutions.py.

```bash
python3 check.py --reference
```

这只检查参考解，不表示你完成了挑战。/ This validates the reference only, not your work.

## 十天对照 / Ten-day map

| Day | 内容 / Topic | 运行命令 / Command | 预期 / Expected |
|---|---|---|---|
| 1 | 保存一个可信的单进程基线 / Preserve a trustworthy single-process baseline | `python3 lab.py day1` | weight=1.875，四步trace可见，最终loss=0.0390625。 / weight=1.875, four trace rows, final loss=.0390625. |
| 2 | 理解 rank、进程组与集体通信 / Understand ranks, process groups and collectives | `python3 lab.py day2` | allreduce_sum=[10,10,10,10]，allgather=[1,2,3,4]。 / allreduce_sum=[10,10,10,10], allgather=[1,2,3,4]. |
| 3 | 把单机训练改造成 DDP / Convert the baseline to DDP | `python3 lab.py day3` | local_mean_gradients=[−4,−16]；rank_average=global_mean=−10。 / Local gradients are [−4,−16]; rank average and global mean both equal −10. |
| 4 | 验证数据覆盖与每轮采样 / Verify data coverage and epoch sampling | `python3 lab.py day4` | padded_total=6，dropped_total=4；epoch1给出另一排列。 / padded_total=6, dropped_total=4; epoch1 gives another order. |
| 5 | 用 torchrun 处理启动与失衡 / Use torchrun and diagnose process imbalance | `python3 lab.py day5` | step_times_ms=[40,90]，synchronous_step_lower_bound_ms=90。 / step_times_ms=[40,90]; synchronized lower bound=90ms. |
| 6 | 保持梯度累积与精度语义一致 / Preserve accumulation and precision semantics | `python3 lab.py day6` | scaled_sum=−10，unscaled_sum=−20，global_gradient=−10。 / scaled_sum=−10, unscaled_sum=−20, global_gradient=−10. |
| 7 | 观察通信、计算与扩展效率 / Observe communication, compute and scaling | `python3 lab.py day7` | two_rank_total_ms=70，speedup≈1.42857，efficiency≈0.71429。 / Total70ms, speedup≈1.42857, efficiency≈.71429. |
| 8 | 理解 FSDP2 的分片与临时聚合 / Understand FSDP2 sharding and temporary gathering | `python3 lab.py day8` | replicated_bytes_per_rank=16000000，ideal_sharded=4000000。 / Replicated bytes/rank=16000000; ideal sharded=4000000. |
| 9 | 让训练可以正确恢复 / Make training recover correctly | `python3 lab.py day9` | match=true，full_weight=resumed_weight=1.96875。 / match=true; both weights=1.96875. |
| 10 | 交付一个可恢复的训练工程 / Deliver a recoverable training project | `python3 lab.py day10` | 生成REPORT.md、manifest.csv和9个JSON；个人挑战须单独PASS。 / REPORT.md, manifest.csv and nine JSON files; own challenge needs a separate PASS. |

## 真实框架选做 / Optional actual framework

CPU Gloo teaching target: Ubuntu22.04 x86_64, Python3.11 and torch2.6.0 CPU. GPU option requires two compatible NVIDIA GPUs and a separate cu124 environment. / CPU Gloo教学目标为Ubuntu22.04、Python3.11；GPU选做另需两卡。

2026-11-13平台CPU验证已通过：[run43455249219](https://github.com/supergroupli/AIinfra-JobHub/actions/runs/43455249219)，commit`28b14e7892a875cdee959ad8d8efb41408a3a3e9`。原始rank JSON和依赖快照保存在`validation/2026-11-13/`。这是平台运行样例，不是学员自己的运行或独立同伴复现。

Platform CPU validation passed on2026-11-13 in the linked run/commit. Original rank JSONs and dependency snapshots are included in validation/2026-11-13/. These are platform samples, not a student's execution or independent peer reproduction.

本示例使用固定教学版本。`ddp_example.py`执行两个真实进程的DDP，逐步对照单进程全局batch基线，再从中途checkpoint恢复模型和SGD momentum，并运行漏恢复optimizer的反例。平台实际验证状态、运行commit和原始证据见 [验证记录](https://github.com/supergroupli/AIinfra-JobHub/blob/main/docs/FRAMEWORK_VALIDATION.md)。CPU Gloo验证不会同时证明GPU/NCCL、FSDP或多机环境通过。

This pinned example runs two real DDP processes, compares each step with a single-process global batch, restores model and SGD momentum, and demonstrates an incomplete optimizer restore. See the [validation record](https://github.com/supergroupli/AIinfra-JobHub/blob/main/docs/FRAMEWORK_VALIDATION.md) for actual status, commit and raw evidence. CPU Gloo evidence does not establish GPU/NCCL, FSDP or multi-host validation.

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu
torchrun --standalone --nproc-per-node=2 ddp_example.py --backend gloo --out out/real-ddp
```

查看`out/real-ddp/rank-0.json`和`rank-1.json`：预期status=PASS、resume_matches=true；第一步weight_after=1.0，默认4步约为2.053，两个rank与全局基线一致。`missing_optimizer_control_weight`应与正确恢复的最终值不同。每步loss是该rank自己的局部loss，不应把它与全局均值混为一谈；averaged_gradient则经过DDP同步。文件还记录版本、平台、源码哈希和完整trace。

Inspect rank-0.json and rank-1.json: status=PASS, resume_matches=true, first weight_after=1.0 and final weight about2.053 for the default four steps. Both ranks match the global baseline; missing_optimizer_control_weight differs. Loss is local to each rank, while averaged_gradient is synchronized. Versions, platform, source hash and full traces are retained.

独立改造：手算第一步−4和−16如何平均成−10；将`--steps`改为6（允许2–8步），解释正常恢复为何继续匹配基线；再阅读漏恢复optimizer的对照，解释为什么只保存权重不够。保留自己的源码差异和JSON，不能只提交status=PASS截图。

Your extension: derive how local gradients−4 and−16 average to−10, try --steps 6 (range2–8), explain successful recovery and why weights alone are insufficient. Retain your code diff and JSON, not just a PASS screenshot.

GPU NCCL选做需另建环境安装torch2.6.0 cu124版，并在两张兼容GPU上启动`torchrun --standalone --nproc-per-node=2 ddp_example.py --backend nccl --out out/real-nccl`。本轮不运行GPU环境。 / The optional NCCL command needs a separate torch2.6.0 cu124 environment and two compatible GPUs; GPU execution is not part of this validation.

## 证据与局限 / Evidence boundaries

所有lab.py结果是标量代数/设计，非DDP或FSDP执行。真实DDP例验证一个单权重模型的同步与恢复，不能推出大模型训练吞吐或收敛质量。

lab.py uses scalar algebra/design, not DDP/FSDP. The actual example checks synchronization and recovery of a one-weight model, not large-model throughput or convergence.

JSON里的模拟/设计标签必须保留。manifest哈希检测文件变化，不证明GPU来源或个人身份。分享前填写REPORT.md中的TODO，附自己的代码差异与一条失败或无收益案例；尚未同伴复现就如实标记。

Preserve simulated/design labels. Hashes detect file changes, not GPU provenance or authorship. Fill the report with your own diff and one failed/no-benefit case; mark peer reproduction pending until it happens.

## 官方依据 / Official sources

- [PyTorch pinned installation versions](https://pytorch.org/get-started/previous-versions/)
- [PyTorch DDP tutorial](https://docs.pytorch.org/tutorials/intermediate/ddp_tutorial.html)
- [PyTorch distributed package](https://docs.pytorch.org/docs/stable/distributed.html)

Sources checked / 资料核对：2026-11-13。
