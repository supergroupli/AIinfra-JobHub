# NVIDIA Dynamo in 10 Days: reproducible lab kit / 可复现实验包

Complete all ten days on a laptop using **Python 3.9+ standard library**. No pip dependencies, account, network service or GPU is required for the mandatory path. The output is explicitly `simulated`: formulas and small state machines teach systems reasoning, not official engine performance. Real framework work is optional and separate below.

必做路线无需GPU/云账户/服务端。每一天先手算，再运行基线和对照，最后改一个条件；不能只按运行按钮就当自己完成项目。网页版含逐日图解、测验和交互模型，本包提供离线代码与验收。

## Start / 开始

Download `dynamo.zip` from the course page. Open a terminal in the download directory:

```sh
unzip dynamo.zip
cd dynamo
python3 --version
python3 lab.py selfcheck
python3 lab.py day1 --out out/day01-base
python3 lab.py day1 --variant changed --out out/day01-changed
```

Windows: extract with your file manager, open a terminal inside `dynamo`, and use `py -3` instead of `python3`. Keep this working directory for every later command. A successful selfcheck prints `PASS`; it validates model invariants, not a student's implementation.

Windows可右键解压后在目录里打开终端；后续始终在实验目录中运行。`--variant changed`是随包提供的对照，不等于你自己的代码贡献。

## Daily map / 每日目标

| Day | Concept / 概念 | Evidence / 验收 |
|---|---|---|
| 1 | 建立服务系统的三张图 / Map the serving system | `Each plane has three items; runtime not loaded. File:out/day01-base/day01.json.` |
| 2 | 模拟服务发现与就绪筛选 / Model discovery and readiness filtering | `Eligible includes worker-a and worker-b. File:out/day02-base/day02.json.` |
| 3 | 用 SLO 定义实验目标 / Define experiments with an SLO | `Success fraction.75; attainment.5. File:out/day03-base/day03.json.` |
| 4 | 比较缓存亲和与负载均衡 / Compare cache affinity and load | `Predicted[15,40]; selected_worker0. File:out/day04-base/day04.json.` |
| 5 | 判断 P/D 分离是否值得 / Decide whether P/D disaggregation helps | `Ideal capacity12.5requests/s; individual140ms. File:out/day05-base/day05.json.` |
| 6 | 用代际事件拒绝过期状态 / Reject stale state with generation events | `Final state removed; ignored0. File:out/day06-base/day06.json.` |
| 7 | 让扩缩容跟得上变化 / Reason about scaling under change | `Maximum backlog5. File:out/day07-base/day07.json.` |
| 8 | 检查部署资源预算 / Check deployment resource budgets | `Requested GPU2; fits=true. File:out/day08-base/day08.json.` |
| 9 | 验证故障、取消与恢复 / Verify failure, cancellation, and recovery | `Resources held0; releases1. File:out/day09-base/day09.json.` |
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

## Optional real Dynamo route / 真实框架扩展

Pinned runtime: **NVIDIA Dynamo 1.6.1**, matching the published stable quickstart used here. This is an intentionally selected version, not a claim that it is the newest release. You need Linux, a compatible NVIDIA GPU/driver, Docker with NVIDIA container support, model-download access and sufficient memory. The frontend and worker below share **one container filesystem** for file discovery. **No GPU/container benchmark was executed in this course build.**

固定1.6.1，与本课核对的官方教程一致；不是“自动跟最新”。需要兼容Linux/NVIDIA GPU与容器运行时。两个独立容器没有共同文件目录时，file服务发现不能自动共享；本例用同一容器。

Terminal A on host, start a named container / 宿主终端A：

```sh
docker run --gpus all --rm -it --name jobhub-dynamo -p 127.0.0.1:8000:8000 nvcr.io/nvidia/ai-dynamo/sglang-runtime:1.6.1
```

Inside that container, start only the frontend / 进入容器后，仅启动前端：

```sh
python3 -m dynamo.frontend --discovery-backend file
```

Terminal B on the same host, start the worker in the existing container / 宿主新终端B，在已有容器启动worker：

```sh
docker exec -it jobhub-dynamo python3 -m dynamo.sglang --model-path Qwen/Qwen3-0.6B --discovery-backend file
```

Terminal C, wait for readiness then request / 宿主终端C，等待前端与worker就绪后：

```sh
curl --fail --max-time 10 http://127.0.0.1:8000/health
curl --fail --max-time 120 http://127.0.0.1:8000/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"Qwen/Qwen3-0.6B","messages":[{"role":"user","content":"Explain a queue briefly."}],"max_tokens":50}'
docker image inspect nvcr.io/nvidia/ai-dynamo/sglang-runtime:1.6.1 --format '{{json .RepoDigests}}' > dynamo-image-digest.json
```

Expected / 预期：health returns HTTP success, then model response includes `choices`. A live frontend alone does not prove worker readiness. Save image digest, resolved model revision, GPU/driver, exact commands, requests and logs. This topology is one aggregated worker; it does not prove PD-disaggregated scaling or KV-aware multi-worker benefit.

排错 / Troubleshooting: missing worker—confirm both processes use the same container and `--discovery-backend file`; OOM—stop and adjust the supported model/workload or hardware. A healthy frontend with model errors requires inspecting worker registration/loading, not changing the client URL. Stop worker and frontend with Ctrl-C; the `--rm` container disappears after its shell exits.

Sources (checked 2026-11-13): [1.6.1 release](https://github.com/ai-dynamo/dynamo/releases/tag/v1.6.1), [official container quickstart](https://docs.nvidia.com/dynamo/cli/getting-started/quickstart), [versioned documentation index](https://docs.nvidia.com/dynamo/v1.6.1/llms.txt).
