# SGLang in 10 Days: reproducible lab kit / 可复现实验包

Complete all ten days on a laptop using **Python 3.9+ standard library**. No pip dependencies, account, network service or GPU is required for the mandatory path. The output is explicitly `simulated`: formulas and small state machines teach systems reasoning, not official engine performance. Real framework work is optional and separate below.

必做路线无需GPU/云账户/服务端。每一天先手算，再运行基线和对照，最后改一个条件；不能只按运行按钮就当自己完成项目。网页版含逐日图解、测验和交互模型，本包提供离线代码与验收。

## Start / 开始

Download `sglang.zip` from the course page. Open a terminal in the download directory:

```sh
unzip sglang.zip
cd sglang
python3 --version
python3 lab.py selfcheck
python3 lab.py day1 --out out/day01-base
python3 lab.py day1 --variant changed --out out/day01-changed
```

Windows: extract with your file manager, open a terminal inside `sglang`, and use `py -3` instead of `python3`. Keep this working directory for every later command. A successful selfcheck prints `PASS`; it validates model invariants, not a student's implementation.

Windows可右键解压后在目录里打开终端；后续始终在实验目录中运行。`--variant changed`是随包提供的对照，不等于你自己的代码贡献。

## Daily map / 每日目标

| Day | Concept / 概念 | Evidence / 验收 |
|---|---|---|
| 1 | 建立引擎地图与版本清单 / Map the engine and pin the environment | `Five components; not_installed_here=true. File:out/day01-base/day01.json.` |
| 2 | 校验请求协议，再选做真实服务 / Validate requests before optional real serving | `status_codes=[200,404,400,400]. File:out/day02-base/day02.json.` |
| 3 | 设计能比较的负载与指标 / Build a comparable workload | `short p95=16; long and overall p95=90. File:out/day03-base/day03.json.` |
| 4 | 理解 token 前缀与缓存淘汰 / Understand token prefixes and eviction | `common_prefix_tokens=2; hits=1; trace records evictions. File:out/day04-base/day04.json.` |
| 5 | 分析分块 prefill 的阻塞与代价 / Analyze chunked-prefill blocking and overhead | `4 chunks;25.6ms maximum block;15ms overhead. File:out/day05-base/day05.json.` |
| 6 | 量化误差与反例：精度不等于速度 / Quantization error: accuracy is not speed | `Rows for4/8 bits;8-bit max_abs_error is smaller. File:out/day06-base/day06.json.` |
| 7 | 从 GPU 缓存到 HiCache 分层 / Explore hierarchical caching | `expected_ms is approximately16. File:out/day07-base/day07.json.` |
| 8 | 判断何时值得做 PD 分离 / Decide when disaggregation helps | `transfer_ms=20; split140ms; ideal ceiling12.5requests/s. File:out/day08-base/day08.json.` |
| 9 | 把指标、错误与恢复连起来 / Connect telemetry with failure recovery | `total4; successes2; p95=30. File:out/day09-base/day09.json.` |
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

## Optional real SGLang route / 真实框架扩展

Pinned engine: **SGLang 0.5.23**. This route requires a supported Linux NVIDIA GPU environment, compatible driver/CUDA runtime and Python 3.12. The release's CUDA 13 wheel is not a macOS CPU package. Model download consumes network/storage; check available VRAM before launching. The CPU exercises above do not install this environment. These commands were checked against official documentation, **not run on a GPU in this course build**.

固定引擎版本0.5.23；准备Linux、兼容NVIDIA GPU/驱动与Python3.12。普通电脑先完成CPU路线。模型需要下载，能否装入显存取决于设备与运行配置；下面不能标为已实测。

Terminal A, install in a NEW environment / 终端A，新建隔离环境：

```sh
python3.12 -m venv .venv-sglang
source .venv-sglang/bin/activate
python -m pip install uv
uv pip install --prerelease=allow "sglang==0.5.23"
python -m pip check
python -m pip freeze > sglang-environment.txt
python -m sglang.launch_server --help > sglang-server-help.txt
nvidia-smi > sglang-gpu.txt
```

Expected / 预期：package version is 0.5.23, dependency check succeeds, and help is saved. An import error stops this route before any benchmark. Preserve the full dependency snapshot, driver output, model's resolved weight revision and launch command in the report.

Terminal A, server ONLY (foreground) / 终端A，仅启动服务，保持运行：

```sh
python -m sglang.launch_server --model-path Qwen/Qwen2.5-0.5B-Instruct --host 127.0.0.1 --port 30000
```

Terminal B after startup logs report readiness / 新终端B，等待模型就绪后：

```sh
curl --fail --max-time 120 http://127.0.0.1:30000/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"Qwen/Qwen2.5-0.5B-Instruct","messages":[{"role":"user","content":"Explain a request queue in two sentences."}],"max_tokens":48}'
```

Expected / 预期：HTTP success and a JSON completion with `choices`. The wording varies; exact text is not the acceptance criterion. Send the same prompt twice and a different-prefix prompt once; preserve request bodies, response statuses and server logs. Response time alone cannot prove a RadixAttention hit. Collect hit-token counters before claiming prefix reuse.

排错 / Troubleshooting: connection refused means inspect server readiness and port; an OOM requires a smaller supported workload or more suitable hardware, not repeated blind retries. A wrong-model error is a request issue. Stop with Ctrl-C when finished. The server binds to loopback; this is a local exercise.

Sources (checked 2026-11-13): [0.5.23 release](https://github.com/sgl-project/sglang/releases/tag/v0.5.23), [installation](https://docs.sglang.io/docs/get-started/install), [request tutorial](https://docs.sglang.io/docs/basic_usage/send_request), [server arguments](https://docs.sglang.io/docs/advanced_features/server_arguments).
