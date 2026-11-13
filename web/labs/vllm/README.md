# 聘枢 · vLLM 实验包 / vLLM guided lab

本实验包配合聘枢的 10 天 vLLM 课程。普通电脑可完成 CPU 路线；真实推理需要兼容 GPU。模拟数据不证明 vLLM 性能。

This pack accompanies the 10-day course. A laptop can complete the CPU route; actual inference needs a compatible GPU. Simulations do not establish vLLM performance.

## 1. 下载后如何开始 / Start after downloading

解压 `vllm.zip`，在终端进入解压出来的 `vllm` 文件夹。以后所有命令都从这个目录运行。CPU 路线需要 Python 3.9+，不需要 pip 安装。Windows 可将 `python3` 换为 `py -3`。所有数据写入本地 `out/`；每个实验使用新子目录，避免覆盖前一轮。

Unzip and enter the `vllm` folder. Run all commands there. CPU tools need Python 3.9+ and no packages. On Windows replace `python3` with `py -3`. Use a new output subdirectory for every experiment to retain previous results.

```bash
cd vllm
python3 lab.py selfcheck
python3 lab.py env
python3 lab.py simulate --out out/baseline
python3 lab.py check out/baseline
python3 lab.py report out/baseline
```

看到 `PASS`，并找到 `out/baseline/REPORT.md`。虚拟基线应包含 12 个成功请求、1380ms 总虚拟时间；p95=1270ms，采用 nearest-rank、仅成功请求。数字由明确的教学常数决定，不是设备计时。

Expect `PASS` and a report. The deterministic baseline has 12 successes, 1380ms virtual total time and p95=1270ms using nearest-rank successful-request latency. These follow teaching constants, not hardware measurements.

## 2. 真正运行本机 HTTP / Run actual local HTTP

终端 A / Terminal A:

```bash
python3 lab.py mock
```

终端 B 也进入 `vllm` 文件夹 / Terminal B, also inside `vllm`:

```bash
python3 lab.py request --out out/first
python3 lab.py request --stream --out out/stream
python3 lab.py bench --concurrency 2 --out out/http-c2
python3 lab.py request --model wrong-model --out out/wrong-model
python3 lab.py request --prompt INJECT_ERROR --out out/error
python3 lab.py request --prompt INJECT_TIMEOUT --timeout 0.05 --out out/timeout
```

按 `Ctrl+C` 停止 A。mock 只监听 `127.0.0.1:8000`，返回 `MOCK OK`，没有模型/tokenizer，也不伪造 token 数。HTTP 的计时是实际本机耗时，整体证据仍标 `simulated`，因为服务是假的。流式指标是首个非空 content 事件延迟，不保证一个事件恰好一个 token。未收到 `[DONE]` 的流式结果归为错误。

Stop A with `Ctrl+C`. The mock binds only to localhost, returns fixed text and has no model/tokenizer or token count. HTTP timings are real local elapsed times, but evidence remains `simulated` because the service is synthetic. First-content-event latency is not necessarily one-token TTFT. Incomplete streams without `[DONE]` are errors.

## 3. GPU 可选路线 / Optional GPU route

**核对资料，不代表本站已经 GPU 实测。** 教学版本固定为 **vLLM 0.33.0**，模型为 **Qwen/Qwen2.5-0.5B-Instruct**，模型与 tokenizer revision 固定为 **7ae557604adf67be50417f59c2c2f167def9a775**。

**Source-checked, not GPU-tested by this site.** Use the pinned version/model/revision above. The version-pinned documentation and model files are linked below.

本示例选择 Linux x86_64 + NVIDIA GPU + Python 3.12。0.33.0 官方 GPU 页列出 NVIDIA compute capability >=7.5；驱动必须适配安装 wheel 的 CUDA。官方 CUDA 13 镜像常规要求 R580 或更新驱动。用 `nvidia-smi` 检查驱动和空闲显存。本课建议空闲 8 GiB 以上作为较宽松教学预算，并不保证兼容所有设备。Mac/Windows 原生、旧驱动或没有兼容 GPU 时直接继续 CPU 路线，不需要购买算力。

This example targets Linux x86_64, NVIDIA and Python 3.12. Check compute capability (official minimum 7.5), driver/runtime compatibility and free memory. The official CUDA 13 image normally requires R580 or newer. A free-memory budget of 8 GiB+ is a teaching suggestion, not a compatibility guarantee. Use the CPU route when incompatible.

```bash
nvidia-smi
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install "vllm==0.33.0"
python lab.py env
python -m pip freeze > out/requirements.lock.txt
python serve.py --dry-run
```

GPU 终端 A：安装完成后单独启动服务，保持运行，不在这里粘贴客户端命令。

GPU terminal A: after setup, start the service separately and leave it running. Do not paste client commands into this terminal.

```bash
python serve.py --cache off
```

`serve.py` 在前台启动，监听本机 8001。首次模型下载及编译可能耗时，等待成功启动日志。在第二终端激活相同环境后运行：

The launcher runs in the foreground on local port 8001. Wait for startup after initial download/compilation. In a second terminal activate the same environment:

```bash
source .venv/bin/activate
python lab.py request --port 8001 --model Qwen/Qwen2.5-0.5B-Instruct --evidence measured --out out/gpu-first
python lab.py bench --port 8001 --model Qwen/Qwen2.5-0.5B-Instruct --evidence measured --stream --out out/gpu-off
cp out/server-config.json out/gpu-off/server-config.json
cp out/environment.json out/gpu-off/environment.json
```

保留启动日志和 `requirements.lock.txt`。`server-config.json` 的 `evidence=design` 表示它是配置说明；请求结果的 `evidence=measured` 才描述实际请求。标记由操作者选择，不是平台认证。只有成功运行真实 vLLM 才使用 measured。

Keep startup logs and the dependency lock. Server config is a design artifact; measured request rows describe the actual run. Labels are operator declarations, not certification.

## 4. 十天命令索引 / Ten-day command map

| Day | 主题 / Topic | CPU command or activity |
| --- | --- | --- |
| 1 | 环境与首请求 / Environment | `python3 lab.py env`, mock + request |
| 2 | 流式与错误 / Streaming/errors | request `--stream`, fault markers |
| 3 | KV 缓存 / KV memory | `python3 lab.py kv --tokens 2048 --sequences 4` |
| 4 | 基线 / Baseline | simulate, bench, check |
| 5 | 缓存对照 / Cache controls | simulate with/without `--cache` |
| 6 | 参数实验 / Parameter sweep | simulate/bench `--concurrency 1`, 2, 4 |
| 7 | 量化误差 / Quantization error | `python3 lab.py quant` |
| 8 | 扩展方案 / Scaling design | `python3 lab.py plan` |
| 9 | 失败计数 / Failure accounting | `python3 lab.py simulate --failures --out out/faults` |
| 10 | 作品 / Portfolio | `python3 lab.py report out/baseline` |

详细步骤、图解、小测和报错处理在网页中。每一天都要求学生预测、运行、修改一个变量/代码，再解释结果。

Full steps, diagrams, quizzes and troubleshooting are on the course page. Each day asks you to predict, run, modify something and explain the result.

第 2、4、6、9 天的默认 HTTP 命令都访问 CPU mock 的 8000 端口。必须保留第 1 天 mock 服务；如已停止，先在单独终端 A 重启 `python3 lab.py mock`，客户端命令在另一个终端 B 执行。GPU 8001 与 mock 8000 不可混用。第 5 天切换 GPU 缓存配置时，在服务终端按 Ctrl+C 并等待退出，才粘贴新的启动命令。

Days 2, 4, 6 and 9 default HTTP commands target the CPU mock on port 8000. Keep the day-1 mock running, or restart `python3 lab.py mock` in separate terminal A and run clients in B. GPU port 8001 is separate. On day 5, press Ctrl+C in the GPU server terminal and wait for exit before pasting the next launch command.

## 5. 参考分析与独立挑战 / Reference analysis and challenges

### 缓存 / Cache

模拟器使用 40ms prefill、每后续 token 5ms；命中时 prefill=10ms。共享请求必须先完成，后续请求开始时才能复用缓存。并发 4 时第二个共享请求可能已开始，不能提前算命中。

The model uses 40ms prefill and 5ms per subsequent token; hit prefill is 10ms. A shared request must finish before reuse. With four workers, another shared request may already have started and must miss.

**挑战：** 把输出长度从 16 改为 128，算出缓存减少总时间的百分比。保持模型中 decode 时间不变。解释为什么百分比减小；再增加独立请求比例，观察收益变化。

**Challenge:** Increase output tokens from 16 to 128, compute the total-time reduction with caching, and explain the smaller percentage. Keep decode costs fixed, then separately increase unique-prefix traffic.

真实 GPU 练习：`python token_prefix.py` 核对模板后的 token 前缀（使用 GPU 环境自带 transformers）；重启 `python serve.py --cache off` 和 `--cache on` 做对照。每次重启先保存配置，开启后第一轮包含冷转热，后续轮才视为已预热；记录预热请求。至少各 3 次独立重复，使用新目录。不同输入的聊天模板本身也可能有共同前缀，不能说完全零共享。

For real GPU tests, token_prefix.py checks templated tokens. Restart the service for disabled/enabled conditions, save settings, record warm-up and repeat each condition three times. The first enabled batch transitions from cold to warm. Distinct prompts may still share template tokens.

### 内存 / Memory

本模型估算 `2×24×2×64×2×tokens×sequences` 字节。1024 token、1 序列是 12 MiB；2048 token、4 序列是 96 MiB。公式不包含权重/激活/块填充。**挑战：** 创建假想 32 层版本，应得到同条件 16 MiB；标记为 design。

The formula yields 12 MiB for 1024 tokens × 1 sequence and 96 MiB for 2048 × 4, excluding weights/activations/padding. **Challenge:** Make a hypothetical 32-layer version; the first condition becomes 16 MiB. Label it design.

### 测量 / Measurement

nearest-rank p95 取排序第 `ceil(0.95*N)` 项。本实验只对成功请求算延迟，但所有请求进入成功率分母。12 条中 10 成功、1 错误、1 超时，成功率=10/12。没有成功样本则分位数为 null。

Nearest-rank p95 selects `ceil(0.95*N)`. Latencies use successful requests; success rate includes every submitted request. With 10 successes and two failures it is 10/12. Empty successful samples produce null percentiles.

**挑战：** 自己新增平均值统计，并解释为什么平均值与 p95 都应该保留。不要修改参考实现来让测试“看起来通过”；保留你的新实现与对照。

**Challenge:** Add mean latency and explain why it complements p95. Preserve your implementation and reference rather than changing expected checks to hide errors.

## 6. 结课作品 / Final portfolio

运行 `report` 会生成 `REPORT.md` 底稿与 `manifest.json` 文件哈希，不会替你解释实验，也不会证明 GPU 来源。填写所有 TODO，包含：问题、本人改动、固定环境与负载、原始文件、对照和失败、局限、下一次实验。读者应能按你的命令重算。没有同伴复现就写“待独立复现”。

The generated report and hashes are scaffolding, not an explanation or proof of GPU provenance. Fill all TODOs: question, personal contribution, environment/workload, raw files, controls/failures, limits and next experiment. Record peer reproduction only when it actually happened.

## 官方依据 / Primary sources

- [vLLM 0.33.0 release](https://github.com/vllm-project/vllm/releases/tag/v0.33.0)
- [Pinned GPU installation](https://docs.vllm.ai/en/v0.33.0/getting_started/installation/gpu/)
- [Pinned serve CLI](https://docs.vllm.ai/en/v0.33.0/cli/serve/)
- [Pinned Qwen model files](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/tree/7ae557604adf67be50417f59c2c2f167def9a775)
- [Model configuration](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/blob/7ae557604adf67be50417f59c2c2f167def9a775/config.json)

资料核对：2026-11-13。CPU 测试可独立运行；本包未附任何虚构的 GPU benchmark 数据。

Sources checked: 2026-11-13. CPU tests are independently runnable; no fabricated GPU benchmark data is included.
