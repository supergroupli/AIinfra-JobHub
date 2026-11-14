# Diagnostic teaching labs / 故障诊断教学实验

Python 3.9+ standard library. No packages, accounts, GPU, Ray, PyTorch or Kubernetes required. All fixtures are original synthetic teaching data, not captured production incidents.

Python 3.9+ 标准库，无需 GPU 或第三方包。全部 fixture 是原创教学数据，不是真实生产事故。

Unzip the whole archive, enter the `diagnostics` directory containing `lab.py`, then run:

```bash
python3 --version
python3 lab.py kv-capacity --out out/kv-capacity
python3 lab.py tail-queue --out out/tail-queue
python3 lab.py prefix-miss --out out/prefix-miss
python3 lab.py async-timing --out out/async-timing
python3 lab.py ddp-scaling --out out/ddp-scaling
python3 lab.py small-collectives --out out/small-collectives
python3 lab.py retry-storm --out out/retry-storm
python3 lab.py bounded-queue --out out/bounded-queue
python3 lab.py probe-confusion --out out/probe-confusion
```

On Windows, `py -3` may replace `python3`. 解压整个包，进入含 `lab.py` 的目录；Windows 可将 `python3` 改为 `py -3`。

Every command writes `diagnosis.json` to its `--out` directory with `evidence: synthetic-cpu-analysis`, the fixture SHA-256, and calculated values. Reusing an output directory overwrites its `diagnosis.json`; use separate directories for comparisons. No timestamp or measured hardware claims are added.

每次输出含输入文件哈希及计算结果；相同输出目录会覆盖旧 `diagnosis.json`。对照实验请使用不同目录。

Copy a fixture, change one assumption, then compare predictions and outputs:

```bash
python3 lab.py kv-capacity --input my-capacity.json --out out/my-capacity
```

The corresponding bilingual cases at `../../cases/` explain context, staged clues, hypotheses, regression checks and source documentation. Files above one MiB, malformed JSON and invalid numeric inputs fail explicitly. The DDP exercise rejects unequal local batch sizes because its simple equal-rank averaging contract would no longer represent a global sample mean. Retry counting assumes a committed side effect followed by lost acknowledgement, not arbitrary task failures. The queue’s cap is admission capacity before each service step, not worker concurrency. Probe timing assumes the first check after one period and ignores scheduling jitter.

如果报 `can't open file lab.py`，请先进入解压后的 `diagnostics` 目录；若缺少 `fixtures`，重新完整解压。`Invalid input` 应先核对字段类型与本案例假设；不要为了消除报错把未运行框架写成已运行。
