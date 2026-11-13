# Triton GPU内核 / Triton kernels · 聘枢实验包

## 开始 / Start

下载并解压ZIP，在终端进入 `triton` 文件夹（父目录执行 `cd triton`）。标准库路线需要Python3.9+，无需pip安装、GPU或付费API。Windows可将python3换为py -3。所有命令在这个目录运行。

Extract the ZIP and enter `triton`. The standard-library path uses Python3.9+, no packages/GPU/API. Windows may use py -3. Run all commands inside this directory.

```bash
python3 lab.py selfcheck
python3 lab.py day1
python3 lab.py day10 --out final-work
```

`day10`重跑前9天并生成`final-work/REPORT.md`、`manifest.csv`和原始JSON；报告包含TODO，必须自己填写贡献、解释和局限。不要将下载示例称为独立开发。每天可用`--out`选择新目录，避免覆盖原始实验。

`day10` replays days1–9, exports raw JSON plus a manifest and report scaffold. Fill every TODO with your contribution, reasoning and limits. Downloaded examples are not independent work. Use a new `--out` directory to retain each experiment.

## 独立挑战 / Independent challenge

在`student.py`实现`masked_sum`。提示：先检查两个列表长度，再用mask筛选元素，空输入返回0。 先手算两个用例，再运行验收；额外增加你自己的反例。

Implement `masked_sum` in student.py. Hint: Validate equal list lengths, select by mask, and return zero for empty input. Hand-calculate two cases, then check and add your own counterexample.

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
| 1 | 建立 GPU 内核的编程模型 / Build a mental model of a GPU kernel | `python3 lab.py day1` | programs=3，第三块 valid=[true,true,false,false]。 / programs=3; the third block has valid=[true,true,false,false]. |
| 2 | 用 mask 处理向量边界 / Use masks to handle vector boundaries | `python3 lab.py day2` | lengths中5个元素的输出为[1,2,3,4,5]；10元素有2个填充位置。 / The five-element output is [1,2,3,4,5]; the ten-element case has two padded lanes. |
| 3 | 先定义正确性，再讨论速度 / Define correctness before speed | `python3 lab.py day3` | exact_equal=false，allclose=true，finite=true。 / exact_equal=false, allclose=true, finite=true. |
| 4 | 实现数值稳定的融合 softmax / Implement a numerically stable fused softmax | `python3 lab.py day4` | sum约为1，shift_invariant=true；概率约0.09003/0.24473/0.66524。 / sum≈1, shift_invariant=true; probabilities≈0.09003/0.24473/0.66524. |
| 5 | 从归约走向前向归一化 / Move from reductions to forward normalization | `python3 lab.py day5` | constant=[0,0,0]；normal约[-1.22474,0,1.22474]。 / constant=[0,0,0]; normal≈[-1.22474,0,1.22474]. |
| 6 | 用 tiling 理解矩阵乘法 / Understand matrix multiplication through tiling | `python3 lab.py day6` | product=[[4,5],[10,11]]，与reference一致。 / product=[[4,5],[10,11]], matching reference. |
| 7 | 有边界地自动调参 / Autotune within a clear boundary | `python3 lab.py day7` | wasted_lanes依次为3/7/15，correct均true。 / wasted_lanes are 3/7/15; all correctness checks pass. |
| 8 | 测量内核，而不是启动误差 / Measure the kernel instead of timing artifacts | `python3 lab.py day8` | samples_ms包含5个非负数；minimum≤median，具体数值随机器变化。 / Five nonnegative samples; minimum≤median. Exact values depend on the machine. |
| 9 | 给内核一个可用的调用契约 / Give the kernel a usable integration contract | `python3 lab.py day9` | mismatched_lengths_rejected=true，empty_output=[]。 / mismatched_lengths_rejected=true; empty_output=[]. |
| 10 | 交付一个有证据的融合算子 / Ship a fused operator with evidence | `python3 lab.py day10` | 生成9个day JSON、manifest.csv、REPORT.md；报告仍需填写TODO。 / Nine daily JSON files, manifest.csv and REPORT.md are generated; fill all TODOs. |

## 真实框架选做 / Optional actual framework

Linux x86_64 + compatible NVIDIA GPU + CUDA12.4-compatible driver; Python3.10–3.12. / 兼容NVIDIA GPU及驱动。

本示例选用固定教学基线而非宣称最新版本。GPU依赖安装会下载较大软件；没有环境直接完成标准库路线。真实框架脚本 `kernel_gpu.py` 已提供源代码，但**平台未安装/运行该框架或GPU脚本**；以下成功条件是预期验收，并非已测性能。

This is a pinned teaching baseline, not a claim about the latest release. Framework installs are larger downloads; use the stdlib path without the required environment. `kernel_gpu.py` is source-checked but **not framework/GPU-executed here**. Expected success is an acceptance condition, not a measured performance claim.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cu124
python -m pip install triton==3.2.0
python kernel_gpu.py
```

成功时打印status=PASS和实际torch/triton/GPU。测试向量长度1/257/1025与5×37稳定softmax，只证明正确性。记录环境、kernel源码和断言结果；基准计时须另做预热/同步。

On success it prints PASS and versions/device. It checks tail lengths and softmax, not speed. Benchmarking needs separately defined warmup and synchronization.

## 证据与局限 / Evidence boundaries

逻辑分块和CPU列表不代表真实GPU线程布局或性能；day8仅测本机Python CPU代码。

Logical tiles and CPU lists do not establish GPU layout/performance; only day8 measures local Python CPU work.

JSON里的模拟/设计标签必须保留。manifest哈希检测文件变化，不证明GPU来源或个人身份。分享前填写REPORT.md中的TODO，附自己的代码差异与一条失败或无收益案例；尚未同伴复现就如实标记。

Preserve simulated/design labels. Hashes detect file changes, not GPU provenance or authorship. Fill the report with your own diff and one failed/no-benefit case; mark peer reproduction pending until it happens.

## 官方依据 / Official sources

- [Triton v3.2.0 release](https://github.com/triton-lang/triton/releases/tag/v3.2.0)
- [Triton vector addition tutorial](https://triton-lang.org/main/getting-started/tutorials/01-vector-add.html)
- [Triton fused softmax tutorial](https://triton-lang.org/main/getting-started/tutorials/02-fused-softmax.html)

Sources checked / 资料核对：2026-11-13。
