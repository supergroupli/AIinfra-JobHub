# llm-d control-plane lab / 分布式推理控制面实验

This package runs **original Python teaching models** on a laptop. It does not install or execute llm-d, Kubernetes, a model, GPUs or RDMA. Every latency, throughput and cost value is a **declared synthetic assumption**, not measured performance. The code itself executes real filtering, accounting and scheduling operations; its displayed milliseconds are not timings of those operations.

本实验包在普通电脑运行原创 Python 教学模型，不安装或执行 llm-d、Kubernetes、模型、GPU 或 RDMA。所有延迟、容量和成本都是声明的合成假设。Python 确实执行过滤、记账和调度运算，但显示的毫秒数不是这些运算的实测时间。

## Start / 开始

Python **3.9+**, standard library only. Extract the **entire ZIP**, enter the `llm-d` directory containing `lab.py`, then run. On Windows, `py -3` may replace `python3`.

只需 Python **3.9+** 标准库。完整解压 ZIP 后进入含 `lab.py` 的 `llm-d` 目录。无需账户、网络、第三方包、模型下载或服务器。

```bash
python3 --version
python3 lab.py day1 --out out/baseline
python3 lab.py day1 --variant stress --out out/stress
python3 -m json.tool out/baseline/day01.json
python3 check.py --reference
```

`day1` through `day19` run independently of previous output. `--variant stress` selects the specifically documented changed fixture for that day, **not a load generator**. Day20 independently runs all nineteen baseline/stress pairs and generates `day20.json` and a `REPORT.md` template. Day20 includes both variants whichever CLI variant is supplied. The files include source SHA-256 and the local Python version. The hash identifies bytes, not correctness or independent reproduction.

第1–19天均可独立运行，不依赖前一天文件。`stress` 是当天明确列出的扰动算例，并不对真实服务施压。第20天重新生成全部19组对照；无论指定哪种 variant，都会包含两组。哈希用于识别文件内容，不能证明结论正确。

Use separate output directories for comparisons; rerunning a command in the same directory replaces that day's generated JSON and, on day20, `REPORT.md`. Complete your portfolio in a separate copy so rerunning does not erase your writing. The program refuses source-directory output and output-file symlinks; it is not a security sandbox.

基线和扰动使用不同输出目录；同目录重跑会覆盖当天生成的 JSON，第20天还会覆盖 `REPORT.md`。请复制报告后再填写本人内容，避免重跑覆盖。程序不是安全沙箱。

## Twenty experiments / 二十个实验

Every row runs with `python3 lab.py dayN --out out/baseline`, then `python3 lab.py dayN --variant stress --out out/stress`. Inspect `dayNN.json` with `python3 -m json.tool`. Predict before running, show a hand calculation, then make one independent change in a **copy of the source** and retain its diff/hash.

每行均先运行基线和扰动命令，先预测再观察，手算一个关键量，然后在**源码副本**中做一项自己的修改并保留差异。

| Day | Mechanism / 机制 | Baseline → stress / 变化与检查 |
| --- | --- | --- |
| 1 | Component responsibilities / 组件职责 | Output limit 20 → 200; topology unchanged, model never runs. / 输出上限变化，未执行模型。 |
| 2 | Selector and readiness / 选择器与就绪 | Eligible `[a]` → `[]`; ready wrong-model b stays excluded. / 正确端点移除后空池。 |
| 3 | Queue plus prefill score / 排队加Prefill成本 | Hot costs 30 → 140 assumed ms, cold stays85; winner hot → cold. / 热缓存也可能更慢。 |
| 4 | Exact prefix and full blocks / 连续前缀与完整块 | Six matches/four reusable → two matches/zero reusable. / 模型与分词兼容是前提。 |
| 5 | LRU replacement / LRU驱逐 | Three → two slots over A B C A D B A; inspect each resident set. / 逐事件检查驻留集合。 |
| 6 | Telemetry TTL / 遥测有效期 | Endpoint a age20 → 2000 ms; a → b under TTL1000. / 1000有效，1001过期。 |
| 7 | P/D/network capacities / 三段容量 | P50, D40, network100 → network10 req/s; bound40 → 10. / 串联取最小。 |
| 8 | Transfer break-even / 传输盈亏平衡 | KV8 → 32 MB, net savings10 → −14 assumed ms. / 保留负收益。 |
| 9 | First-token timeline / 首token时间线 | Queue10 → 80; TTFT66 → 136, total161 → 231 ms. / 首token口径显式声明。 |
| 10 | SLO denominator / SLO分母 | Good fraction1 → 9/12; nearest-rank P95 80 → 250 ms. / 包含失败请求。 |
| 11 | Token reservation / Token预留 | Third request200 → 600 tokens; admission true → false. / 拒绝后预留仍800。 |
| 12 | Retry budget / 重试预算 | One timeout then success → two timeouts; maximum two total attempts. / 不透明重启部分流。 |
| 13 | Readiness after warmup / 预热后就绪 | Final warmed true → false; still alive, no automatic restart. / 区分存活与就绪。 |
| 14 | Rolling-update capacity / 滚动升级容量 | Unavailable1 → 2; headroom5 → −5 req/s. / 健康、正确探针等假设需成立。 |
| 15 | Scale-down stabilization / 缩容窗口 | Sustained low samples → alternating high/low; inspect desired count. / 期望副本不是立即容量。 |
| 16 | Weighted fair sharing / 加权公平 | Saturated A8/B4 → limited B demand yields A10/B2. / 请求成本假设相同。 |
| 17 | Fault handling / 故障处理 | One failed endpoint → all unavailable; selected b → None. / 模型不测恢复时间。 |
| 18 | Cost per good request / 单位有效请求成本 | B goodput180 → 80; preferred B → A. / 成本无真实币种。 |
| 19 | Pinned validation plan / 固定版本计划 | Change variable cache-affinity → TTL; no deployment executes. / 保留未执行标记。 |
| 20 | Portfolio export / 作品导出 | Nineteen independent comparison pairs plus report TODOs. / 填本人改动、解释与局限。 |

## Implement three functions / 完成三个代码挑战

Edit `exercises.py` only in your working copy. Implement:

1. `pick_endpoint`: ready and telemetry age ≤1000 ms, minimize queue+prefill, deterministic ID tie-break, return None for no eligible endpoint.
2. `pd_capacity`: minimum of P×1000/40, D×1000/100, network MB/s ÷8MB per request.
3. `available_capacity`: max(0, replicas−max_unavailable) ×10 req/s under the stated healthy/readiness assumptions.

实现端点选择、P/D容量、升级容量三个函数，包含空集合、过期、同分和零容量边界。

```bash
python3 check.py
```

The supplied TODO file intentionally exits **1** with `NOT COMPLETE`. After implementation, **15 fixed cases** must pass. `reference.py` is an answer to read after attempting; `python3 check.py --reference` checks it. The checker holds independent expected values and does not import the lab implementation. Add your own cases: equal cost with reversed input order, zero bandwidth, all endpoints stale, or unavailability above replica count. Passing fifteen public examples is not comprehensive validation or certification.

未写完 TODO 时返回 `NOT COMPLETE` 和退出码1是预期行为。参考实现有独立的固定期望值检查，不调用实验主程序来计算答案。公开15个例子并不能代替自己的边界测试，也不是认证。

## Capstone acceptance / 作品验收

```bash
python3 lab.py day20 --out out/final
python3 -m json.tool out/final/day20.json
```

Copy `REPORT.md` before writing. A reviewable submission includes:

- A concrete question and prediction, e.g. “When should a cold endpoint beat a cache hit?” / 具体问题和预测。
- Your three completed functions, source diff and new boundary tests. / 本人函数实现、源码差异及新边界测试。
- Original baseline/change JSON, commands, Python version, source hashes and units. / 原始对照记录、环境、哈希与单位。
- One counterexample or regression and an explanation of why it happens. / 至少一个反例或退步及因果解释。
- A fresh-directory reproduction performed by you; label peer reproduction only if it actually occurred. / 本人干净目录复现；同伴复现需真实发生。
- Explicit separation of synthetic decisions from unexecuted real-cluster validation. / 分清CPU教学结果与真实集群待验证计划。

Reject claims of measured llm-d/GPU speedup based only on this package. The final report is a template with TODOs, not automatic evidence of student authorship or course completion.

## Real framework extension / 真实框架扩展（未执行）

Source baseline: **llm-d v1.0.0**, official release **2026-10-20**; checked **2026-11-18**. Online v1.0 architecture and quickstart were inspected. The commands below are optional network/source-inspection steps; they do not deploy anything and are not required for the twenty offline days.

```bash
git clone --branch v1.0.0 --depth 1 https://github.com/llm-d/llm-d.git upstream-llm-d
git -C upstream-llm-d rev-parse HEAD
```

The release page resolved to commit `378b42d18dabe0b9c4ced4e6f3670d93b52db08e` when checked. Compare the clone’s output with this value; investigate a mismatch before proceeding. / 核对时发布页对应此完整commit，若克隆结果不同，先查明原因。

Before deploying, record the resolved full commit, selected guide files, Helm chart versions, container digests, model revision, accelerator/driver/network versions and available resources. Reconcile the pinned source against the official quickstart; the online page can move ahead of a tag. The current quickstart defaults to GPU vLLM and two Qwen3-32B replicas and also links platform alternatives; **it is not the laptop lab here**. Choose the guide matching your hardware and model. Do not reuse local synthetic workload values as production sizing evidence.

部署前记录完整commit、指南文件、Chart版本、镜像digest、模型revision及设备/驱动/网络。以固定标签内容核对在线指南。真实模型和集群资源由学习者另行准备；本平台未执行此扩展。

Verification sequence to carry out in your own suitable cluster:

1. Follow the pinned official baseline guide, confirm model identity and one correct request, record all resources. / 先运行正确单请求并记录资源。
2. Preserve a representative workload and request IDs; collect successful and failed requests, TTFT, completion latency and cache signals. / 保留代表性负载与全量请求记录。
3. Change one routing/cache/TTL variable with equal workload and hardware; preserve unfavorable results. / 同环境单变量对照，保留负结果。
4. Inject one bounded failure in an isolated test namespace, record detection and recovery delays, restore baseline. / 隔离环境演练故障并恢复。
5. Stop on model mismatch, corruption or unacceptable SLO regression. Report remaining unverified assumptions. / 预设停止条件并报告边界。

No `kubectl apply`, cluster mutation or GPU benchmark is executed by this package.

Primary sources:

- [llm-d v1.0.0 release](https://github.com/llm-d/llm-d/releases/tag/v1.0.0)
- [Architecture](https://llm-d.ai/docs/architecture)
- [Router](https://llm-d.ai/docs/architecture/router)
- [Disaggregation](https://llm-d.ai/docs/architecture/disaggregation)
- [Quickstart](https://llm-d.ai/docs/getting-started/quickstart)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [Google SRE: handling overload](https://sre.google/sre-book/handling-overload/)
