# 系统基础实验包 / AI Infra foundations lab

面向会运行 Python、理解列表与函数的初学者。普通电脑、Python **3.9+**、仅标准库；不需要 pip、模型、GPU、API key 或网络服务。

For learners who can run Python and understand lists/functions. A laptop and Python **3.9+** are enough. Standard library only: no packages, model, GPU, API key or network service.

## 先开始 / Start here

1. 从课程页面下载 ZIP，完整解压。不要在 ZIP 预览中直接运行。
2. 打开终端，进入包含 `lab.py` 的 `foundations` 文件夹。如果终端在解压后的上一级目录，运行 `cd foundations`。Windows 也可以在资源管理器打开此目录后“在终端中打开”。
3. 执行下面命令。Windows 若没有 `python3`，可用 `py -3` 替换。

Download and fully extract the course ZIP. Open a terminal inside `foundations`, where `lab.py` lives. From its parent use `cd foundations`. On Windows, use `py -3` instead of `python3` if necessary.

```bash
python3 --version
python3 lab.py day1
```

预期 / Expected:

```text
Teaching simulation / 教学模拟; not LLM or GPU measurements.
DAY 1: first visible token = 32 ms; completion = 65 ms (synthetic)
Saved to: .../foundations/artifacts
```

用编辑器打开 `artifacts/day01-timeline.json`。你的第一项工作是解释为什么 32 ms 与 65 ms 是不同指标。

Open `artifacts/day01-timeline.json`. Your first task is to explain why 32 ms and 65 ms are different metrics.

## 十天安排 / Ten-day guide

所有命令均从 `foundations` 执行；每个实验可独立运行，不依赖前一天已生成的文件。第 10 天重新生成全部证据。重复运行会覆盖同名输出文件；使用 `--out different-folder` 保留对照。

Run commands inside `foundations`. Each day can run independently. Day 10 regenerates all evidence. Reruns replace same-named output files; use `--out different-folder` to keep comparisons.

| Day | Command | What you inspect / 检查什么 | Your task / 独立任务 |
|---|---|---|---|
| 1 | `python3 lab.py day1` | 32 ms first output, 65 ms completion / 首输出与整体完成 | Draw and explain five stages / 画图并解释五段 |
| 2 | `python3 lab.py day2` | KV: 0.25 / 2 / 1 / 8 GiB | Predict then change concurrency / 先预测再改变并发 |
| 3 | `python3 lab.py day3` | 24 total, 22 success, p95=35 ms, 21 TPOT samples | Implement `student.py` / 独立实现指标 |
| 4 | `python3 lab.py day4` | Ideal 1/12 and 64 FLOP/byte; varying CPU times | Repeat and explain limits / 重复并解释局限 |
| 5 | `python3 lab.py day5` | Burst completion FIFO=96, batch4=30 ms | Change arrival spacing / 修改到达间隔 |
| 6 | `python3 lab.py day6` | Only exact-repeat cache hit / 仅完全重复命中 | Break then fix a key in a copy / 副本里构造并修复错误键 |
| 7 | `python3 lab.py day7` | Estimate fit: true/true/false | Budget two fallbacks / 计算两种降级方案 |
| 8 | `python3 lab.py day8` | Manifest + six traces + CSV | Recompute from raw trace / 从原始记录重算 |
| 9 | `python3 lab.py day9` | Service p95=8/8/20; waits can look alike | Explain burst vs slow service / 区分突发和执行变慢 |
| 10 | `python3 lab.py day10 --out final-artifacts` | Complete artifacts + report scaffold / 全部证据及报告骨架 | Fill contribution; rerun own checks / 填写贡献并验收自己代码 |

## 怎么读代码 / Reading the code

先读每天对应的 `day1`、`day2` 等短函数；再读其调用的 `kv_bytes`、`summarize`、`queue`。不需要一次读完所有代码。

Read the short `day1`, `day2`, etc. function for your day first. Then follow calls to `kv_bytes`, `summarize` or `queue`; do not read everything at once.

- `queue([0, 3])`: both requests require 8 simulated ms. The second starts at 8 and waits 5. / 两条各需 8 ms，第二条在 8 开始，等待 5。
- `batch_size=4`: groups up to four already-arrived requests; cost is `2 + max(service)`. No extra batch waiting timer. / 最多合并四条已到达请求，成本为 `2+最长服务`，没有额外凑批等待计时器。
- `summarize`: latency statistics use successes; failure rate includes all requests. One-token output is excluded from TPOT. / 成功请求统计延迟，所有请求统计失败率，单 token 不纳入 TPOT。
- `kv_bytes`: full-history dense KV estimate only; no sharing, compression, sharding or runtime overhead. / 仅完整历史的稠密缓存估算，无共享、压缩、分片和运行时开销。

## 独立挑战与分步提示 / Independent challenge and hints

打开 `student.py`，独立实现两个函数，不从 `lab.py` 或 `solutions.py` 导入答案。

Open `student.py` and independently implement two functions without importing their answers from `lab.py` or `solutions.py`.

### A. failure_rate(records)

- 输入是含 `status` 的字典列表；不是 `ok` 都计为失败。空列表返回 `None`。
- 提示 1：分母应包含成功、错误与超时。
- 提示 2：先判断列表是否为空，再统计非 `ok` 的记录数。
- 手算：`ok,error,timeout` 三条的失败率是 `2/3`，不是 `0` 或 `2/1`。

Input is a list of dictionaries with `status`. Every non-`ok` record is a failure; an empty list returns `None`. The denominator includes successes, errors and timeouts. Check emptiness first, then count non-`ok` records. For `ok,error,timeout`, the rate is `2/3`.

### B. nearest_rank(values, q)

- 本课分位数定义为排序后第 `ceil(q*n)` 个值，计数从 1 开始。
- Python 索引从 0 开始，因此最后索引要减 1。可以使用标准库 `math.ceil`。
- 空列表返回 `None`。`q<=0` 或 `q>1` 时抛出 `ValueError`。
- 手算：`[30,10,20]` 的 p50 是 `20`；`[1,...,20]` 的 p95 是 `19`。

Nearest rank returns the `ceil(q*n)`-th sorted value, counting from one; subtract one for a Python index. You may use `math.ceil`. Return `None` for empty input; raise `ValueError` for `q<=0` or `q>1`. Check p50 of `[30,10,20]` = `20`, and p95 of `[1,...,20]` = `19`.

```bash
python3 check.py
```

初始显示 `NOT YET` 是预期状态，因为函数还需要你完成；完成后显示 `PASS: student boundary checks`。这些小测试覆盖选定的边界用例，不代表完整工程认证。

Initially, `NOT YET` is expected because you must implement the functions. Completion prints `PASS: student boundary checks`. These checks cover selected boundary cases, not professional certification.

完成自己的尝试后再看 `solutions.py`。以下命令只验证**参考解法**，不能当成你的独立练习通过：

After your own attempt, inspect `solutions.py`. This verifies **only the supplied reference**, not your independent work:

```bash
python3 check.py --reference
```

## 最终作品 / Final portfolio

```bash
python3 lab.py day10 --out final-artifacts
python3 check.py
```

`REPORT.md` 必须由你填完“我的独立贡献”的 TODO。至少附：自己改过的代码、独立验收输出、一个反例、局限与下一步。默认报告会重建，所以建议复制为 `MY_REPORT.md` 后再编辑，或下次输出到另一个目录。

Fill the contribution TODO in `REPORT.md`, including your code edits, independent checks, a counterexample, limits and next steps. The generated report is rebuilt on rerun; copy it to `MY_REPORT.md` before editing or use another output folder next time.

展示时明确：你基于课程脚手架完成了哪些修改。不要把未修改的课程代码说成自己从零设计；不要把确定性模拟的 96/30 比值说成 vLLM/GPU 加速。

State what you changed on top of the course scaffold. Do not present unchanged examples as your original system, or the deterministic 96/30 ratio as a vLLM/GPU speedup.

## 常见问题 / Troubleshooting

| Symptom / 现象 | Fix / 处理 |
|---|---|
| `python3` missing | Install Python 3.9+; Windows can use `py -3`. / 确认 Python 版本，Windows 尝试 `py -3`。 |
| `can't open file lab.py` | Enter the extracted folder containing this file. / 进入完整解压后含 lab.py 的目录。 |
| `PermissionError` writing files | Extract into a writable user folder or use `--out` with a writable path. / 解压到可写位置，或指定可写输出路径。 |
| `NOT YET` from check | Complete `student.py`; hints above. / 完成独立函数，按上面的提示检查。 |
| Repeated CPU times differ | Day 4 is actual local timing and includes Python/OS effects. / 第 4 天是本机计时，会随系统负载变化。 |
| Repeated simulation times match | All model inputs and rules are deterministic. / 模拟输入和规则完全确定，因此一致。 |
| GB/GiB values differ | GiB divides by `2**30`, GB by `10**9`. / 先统一单位。 |

## Evidence boundary / 证据边界

Days 1–3 and 5–9 use deterministic teaching data or formulas. Day 4 includes actual **local Python CPU list timing** alongside ideal float32 formulas; those are not the same representation. No model inference, real tokenizer, GPU/RDMA transfer, production scheduling, HTTP server or actual KV allocator is implemented. Day 10 gathers these outputs. Simulation files explicitly identify synthetic data.

第 1–3、5–9 天使用确定性教学数据或公式。第 4 天含本机 Python CPU 列表计时及理想 float32 算式，两者数据表示不同。未执行真实模型、tokenizer、GPU/RDMA、生产调度、HTTP 服务或真实 KV 分配。第 10 天汇总这些结果，不能越过证据边界宣称性能。

Primary reading / 官方阅读:

- [Hugging Face cache explanation](https://huggingface.co/docs/transformers/main/en/cache_explanation)
- [vLLM automatic prefix caching](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/)
- [vLLM production metrics](https://docs.vllm.ai/en/latest/usage/metrics/)
- [Python statistics](https://docs.python.org/3/library/statistics.html)

The lecture's nearest-rank rule is explicitly implemented; it need not equal another tool's interpolated quantiles. Match definitions before comparisons.

本实验显式采用最近秩，不要求与其他工具的插值分位数相同，比较前先统一定义。
