# LMCache in 10 Days: reproducible lab kit / 可复现实验包

Complete all ten days on a laptop using **Python 3.9+ standard library**. No pip dependencies, account, network service or GPU is required for the mandatory path. The output is explicitly `simulated`: formulas and small state machines teach systems reasoning, not official engine performance. Real framework work is optional and separate below.

必做路线无需GPU/云账户/服务端。每一天先手算，再运行基线和对照，最后改一个条件；不能只按运行按钮就当自己完成项目。网页版含逐日图解、测验和交互模型，本包提供离线代码与验收。

## Start / 开始

Download `lmcache.zip` from the course page. Open a terminal in the download directory:

```sh
unzip lmcache.zip
cd lmcache
python3 --version
python3 lab.py selfcheck
python3 lab.py day1 --out out/day01-base
python3 lab.py day1 --variant changed --out out/day01-changed
```

Windows: extract with your file manager, open a terminal inside `lmcache`, and use `py -3` instead of `python3`. Keep this working directory for every later command. A successful selfcheck prints `PASS`; it validates model invariants, not a student's implementation.

Windows可右键解压后在目录里打开终端；后续始终在实验目录中运行。`--variant changed`是随包提供的对照，不等于你自己的代码贡献。

## Daily map / 每日目标

| Day | Concept / 概念 | Evidence / 验收 |
|---|---|---|
| 1 | 画清楚缓存的边界 / Draw the cache boundary | `Four components; payload is KV tensors. File:out/day01-base/day01.json.` |
| 2 | 拆分版本、ABI 与模型兼容检查 / Separate version, ABI and model checks | `compatible_in_this_fixture=true. File:out/day02-base/day02.json.` |
| 3 | 设计可靠的缓存身份 / Design reliable cache identity | `equal=true; digests match. File:out/day03-base/day03.json.` |
| 4 | 用存取轨迹识别缓存复用 / Identify cache reuse through retrieval traces | `retrieved_total=512. File:out/day04-base/day04.json.` |
| 5 | 理解块大小与容量 / Understand chunks and capacity | `full_chunks=3; tail232. File:out/day05-base/day05.json.` |
| 6 | 给存储层做成本模型 / Model the storage tiers | `restore_ms25; beneficial=true. File:out/day06-base/day06.json.` |
| 7 | 让跨实例复用保持正确 / Make cross-instance reuse correct | `accept=true. File:out/day07-base/day07.json.` |
| 8 | 区分缓存复用与 P/D 传输 / Separate reuse from P/D transfer | `lookup-and-reuse; critical path100ms. File:out/day08-base/day08.json.` |
| 9 | 观察失败与回退行为 / Observe failure and fallback | `failures0; middle request recomputes. File:out/day09-base/day09.json.` |
| 10 | Reproducible portfolio / 可复现作品 | Nine raw JSONs, CSV, manifest, your challenge implementation and an explained report |

For Day N, replace `day1` with `dayN`; use a fresh output directory for each variant. Read the corresponding `dayNN.json`, calculate at least one field by hand and write why the control changes—or fails to change—the result. Edit a copy of the relevant day function for your own experiment and retain its diff.

每天把命令的day1改为dayN；两个variant用不同目录。找到代码里对应day函数，手算一项结果，然后自己改输入而不是只使用给定对照。不能把“没有变化”删掉，它常是最有价值的反例。

## Independent challenge / 独立挑战

`student.py` contains two deliberately unfinished functions with precise input/output contracts. Implement them without importing `solutions.py`. The acceptance checks include invalid inputs and counterexamples. `check.py` loads files relative to its own location, so another course's solution cannot accidentally satisfy these checks.

```sh
python3 check.py
```

Initially this exits 1 with `NOT YET`; that is expected. Implement both functions and rerun until `PASS: your student implementation`. Only after an attempt, inspect `solutions.py` or run the separate reference check:

```sh
python3 check.py --reference
```

`--reference` explicitly tests supplied answers, not your work. A passing reference is not a personal certificate. Add one additional boundary example and explain why it matters in your report.

先完成student.py，再运行默认检查；参考解通过不算自己的通过。在报告里加一个你自己构造的边界案例，解释它为什么会让粗心的实现出错。

## Final artifact / 结课作品

```sh
python3 lab.py day10 --out out/final-base
python3 lab.py day10 --variant changed --out out/final-changed
python3 check.py
```

Each output directory contains `day01.json`…`day09.json`, `results.csv`, `manifest.json` and `REPORT.md`. Day 10 reruns the first nine models; it is the report exercise, not an additional engine benchmark. The manifest includes the Python version, source hash and daily file hashes. Keep both directories and your modified source. Fill every `TODO` in the report: question, control, own contribution, exact evidence, counterexample, assumptions and next experiment.

每天的原始JSON标明`evidence=simulated`，CSV不能替代原始数据。修改过的源码也要保留；只有结果图没有输入条件不可复现。报告模板不会自动替你完成解释，所有TODO必须由本人填写。

Suggested review / 评审：ask a peer to recompute one number, explain one failure case, and run your code from a clean extraction. Describe this portfolio as a **CPU systems model** until you add actual framework evidence. Do not publish tokens, credentials or personal request data in a public repository.

## Optional real LMCache route / 真实框架扩展

Pinned package: **LMCache 0.5.7.post1**, Python 3.12, Linux. This release's CUDA wheel aligns with Torch 2.14.0; native ABI compatibility is a separate check from matching package names. The following full-package route starts the real MP service and performs bounded CPU-buffer store/retrieve checks. It does **not** launch an LLM, demonstrate TTFT improvements, or validate a vLLM/LMCache combination. A compatible package/native runtime is still required. **Not executed in this course build.**

固定版本0.5.7.post1，使用Linux/Python3.12和兼容的原生运行库。官方CLI的CPU缓冲区路线可以验证真实缓存服务读写；它不同于上面的纯Python模拟，也不同于LLM推理加速。不要把三者混在报告里。

Terminal A, new environment / 终端A，隔离环境：

```sh
python3.12 -m venv .venv-lmcache
source .venv-lmcache/bin/activate
python -m pip install uv
uv pip install "lmcache==0.5.7.post1"
python -m pip check
python -c "import importlib.metadata as m; print(m.version('lmcache')); import torch; print(torch.__version__); import lmcache.cuda_ops"
python -m pip freeze > lmcache-environment.txt
lmcache server --help > lmcache-server-help.txt
lmcache bench server --help > lmcache-bench-help.txt
```

Expected / 预期：version/import probes pass. If `cuda_ops` reports an undefined symbol, preserve the error and the Torch/wheel versions; this is an ABI failure, not a cache miss. Do not force unrelated wheels with `--no-deps` to hide the conflict.

Terminal A, server only / 终端A，仅启动服务：

```sh
lmcache server --host localhost --port 5555 --l1-size-gb 2 --eviction-policy LRU
```

Terminal B, activate the SAME environment and test / 新终端B，进入相同目录与环境后：

```sh
source .venv-lmcache/bin/activate
lmcache ping kvcache --url http://localhost:8080 --format json --output lmcache-health.json
lmcache bench server --rpc-url tcp://localhost:5555 --url http://localhost:8080 --mode cpu --transfer-mode lmcache_driven --start 0 --end 2 --format json --output lmcache-server-check.json
```

Expected / 预期：ping succeeds; the bounded run completes with zero checksum failures. Preserve raw JSON, exit code and log. Two request sequences are a correctness smoke test, not a throughput study. The 2 GB L1 is a real memory budget; lower it only with a correspondingly small test shape/working set, and record the change. Stop the server with Ctrl-C.

接口地址不同：5555是请求通道，8080是管理HTTP；不要把HTTP请求发到ZMQ端口。`--mode cpu` paired with `--transfer-mode lmcache_driven` follows the official CPU shared-memory path. Unknown flags mean compare the saved installed `--help` to the pinned package; documentation can advance independently.

For a later LLM integration, record an explicit engine version and pass three separate gates: native ABI import, connector import, then one model request with correct output. Official compatibility guidance does not guarantee a universal version pair. Modern MP uses `LMCacheMPConnector`; legacy in-process instructions belong to a separate implementation. This course intentionally claims only standalone-service validation for the real route.

Sources (checked 2026-11-13): [0.5.7.post1 release](https://github.com/LMCache/LMCache/releases/tag/v0.5.7.post1), [installation](https://docs.lmcache.ai/getting_started/installation.html), [compatibility](https://docs.lmcache.ai/getting_started/compatibility.html), [MP quickstart](https://docs.lmcache.ai/getting_started/quickstart.html), [ping CLI](https://docs.lmcache.ai/cli/ping.html), [bounded server benchmark and CPU transfer mode](https://docs.lmcache.ai/cli/bench.html#server).
