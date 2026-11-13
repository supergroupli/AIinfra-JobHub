# NCCL集合通信 / Collective communication · 聘枢实验包

## 开始 / Start

下载并解压ZIP，在终端进入 `nccl` 文件夹（父目录执行 `cd nccl`）。标准库路线需要Python3.9+，无需pip安装、GPU或付费API。Windows可将python3换为py -3。所有命令在这个目录运行。

Extract the ZIP and enter `nccl`. The standard-library path uses Python3.9+, no packages/GPU/API. Windows may use py -3. Run all commands inside this directory.

```bash
python3 lab.py selfcheck
python3 lab.py day1
python3 lab.py day10 --out final-work
```

`day10`重跑前9天并生成`final-work/REPORT.md`、`manifest.csv`和原始JSON；报告包含TODO，必须自己填写贡献、解释和局限。不要将下载示例称为独立开发。每天可用`--out`选择新目录，避免覆盖原始实验。

`day10` replays days1–9, exports raw JSON plus a manifest and report scaffold. Fill every TODO with your contribution, reasoning and limits. Downloaded examples are not independent work. Use a new `--out` directory to retain each experiment.

## 独立挑战 / Independent challenge

在`student.py`实现`bus_bandwidth`。提示：毫秒除1000变秒；payload字节除时间再除1e9为GB/s；AllReduce乘2(p−1)/p。非法时间或rank必须拒绝。 先手算两个用例，再运行验收；额外增加你自己的反例。

Implement `bus_bandwidth` in student.py. Hint: Convert ms to seconds; divide payload bytes by seconds and 1e9 for GB/s; normalize AllReduce by2(p−1)/p. Reject invalid time/rank inputs. Hand-calculate two cases, then check and add your own counterexample.

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
| 1 | 先学会集合通信的语义 / Understand collective semantics first | `python3 lab.py day1` | sum=[[4,6],[4,6]]，average=[[2,3],[2,3]]。 / sum=[[4,6],[4,6]], average=[[2,3],[2,3]]. |
| 2 | rank、设备与通信域 / Map ranks, devices and communicators | `python3 lab.py day2` | global=[0,1,2,3]，local与device=[0,1,0,1]。 / global=[0,1,2,3]; local/device=[0,1,0,1]. |
| 3 | 读懂 GPU 拓扑与传输路径 / Read GPU topology and transport paths | `python3 lab.py day3` | paths的serialization_ms依次4、2、1。 / Serialization times are4,2,1ms. |
| 4 | 运行一次可信的基线 / Run a credible baseline | `python3 lab.py day4` | rows含3档字节数；每档startup_ms=.03，total≥startup。 / Three message sizes; startup_ms=.03 for each and total≥startup. |
| 5 | 区分算法带宽与总线带宽 / Interpret algorithm and bus bandwidth | `python3 lab.py day5` | algbw_GBs=10，busbw_GBs=15。 / algbw_GBs=10; busbw_GBs=15. |
| 6 | 扫描消息大小，识别不同区间 / Sweep message sizes and identify regimes | `python3 lab.py day6` | 4档消息，每档startup=.03ms；transfer随字节数线性增加。 / Four sizes, startup=.03ms each; transfer grows linearly with bytes. |
| 7 | 通信与计算的时间关系 / Understand communication–compute ordering | `python3 lab.py day7` | sequential=65ms，ideal_full_overlap=40ms，上界speedup=1.625。 / Serial65ms, ideal overlap40ms, speedup bound1.625. |
| 8 | 把通信问题放回训练与推理 / Connect collectives to model workloads | `python3 lab.py day8` | unfused−fused≈0.09ms，相同payload=4194304字节。 / unfused−fused≈.09ms; same payload=4194304bytes. |
| 9 | 用最少变量排查一次问题 / Diagnose a problem with controlled changes | `python3 lab.py day9` | count_mismatch_detected=true；兼容输入输出[[4,6],[4,6]]。 / Mismatch detected=true; compatible outputs=[[4,6],[4,6]]. |
| 10 | 完成一份可信的通信性能报告 / Publish a credible communication report | `python3 lab.py day10` | 生成REPORT.md、manifest.csv和9个day JSON，TODO需要个人填写。 / REPORT.md, manifest.csv and nine daily JSON files; fill personal TODOs. |

## 真实框架选做 / Optional actual framework

Linux x86_64, Python3.10–3.12, two compatible NVIDIA GPUs and CUDA12.4-compatible driver. / 两张兼容GPU和匹配驱动。

本示例选用固定教学基线而非宣称最新版本。GPU依赖安装会下载较大软件；没有环境直接完成标准库路线。真实框架脚本 `collective_gpu.py` 已提供源代码，但**平台未安装/运行该框架或GPU脚本**；以下成功条件是预期验收，并非已测性能。

This is a pinned teaching baseline, not a claim about the latest release. Framework installs are larger downloads; use the stdlib path without the required environment. `collective_gpu.py` is source-checked but **not framework/GPU-executed here**. Expected success is an acceptance condition, not a measured performance claim.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cu124
torchrun --standalone --nproc-per-node=2 collective_gpu.py
```

rank0输出实际NCCL版本、payload/ranks、10次采样的最大rank平均CUDA-event耗时与algbw/busbw；数值因设备不同，不提供固定速度。每轮先重置输入再归约，并验证求和正确。仅限单节点2rank。

Rank0 reports runtime NCCL version, payload/ranks, maximum rank mean over10 CUDA-event samples, algbw and busbw. No fixed speed is promised. Inputs reset before each reduction; sums are checked. Single node/two ranks only.

## 证据与局限 / Evidence boundaries

所有lab.py通信时间来自alpha-beta假设，未调用NCCL。实际GPU例仅单机2卡，输出实际NCCL版本；未在平台运行。

lab.py times come from alpha-beta assumptions, not NCCL calls. The GPU example is single-node/two-GPU, reports actual NCCL version and has not been run here.

JSON里的模拟/设计标签必须保留。manifest哈希检测文件变化，不证明GPU来源或个人身份。分享前填写REPORT.md中的TODO，附自己的代码差异与一条失败或无收益案例；尚未同伴复现就如实标记。

Preserve simulated/design labels. Hashes detect file changes, not GPU provenance or authorship. Fill the report with your own diff and one failed/no-benefit case; mark peer reproduction pending until it happens.

## 官方依据 / Official sources

- [NCCL collective operations](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html)
- [NCCL-tests bandwidth conventions](https://github.com/NVIDIA/nccl-tests/blob/master/doc/PERFORMANCE.md)
- [PyTorch pinned installation versions](https://pytorch.org/get-started/previous-versions/)

Sources checked / 资料核对：2026-11-13。
