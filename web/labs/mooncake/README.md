# Mooncake 数据通路：10 日实验 / Ten-day data-path lab

主线只需要 Python 3.9+ 标准库，Windows/macOS/Linux 均可。第 2 天实际发送本机 TCP 字节；其余天是设计、内存语义或容量模型。**没有运行 Mooncake/RDMA，也没有测 GPU 或网络链路带宽。** 可选真实 Store 路线列在下方，未纳入主线实测。

The required route uses Python 3.9+ standard library on Windows/macOS/Linux. Day 2 sends real localhost TCP bytes. Other days teach design, ownership, identity and capacity. **The required route does not run Mooncake or RDMA and does not measure GPU or link bandwidth.** Optional real Store instructions below have not been hardware-validated here.

## 开始 / Start

从课程下载 zip，解压并进入 `mooncake/`。先读实验结果的 `evidence` 和 `boundary/notice`，再解释数值。首次运行 `check.py` 应显示 NOT YET；这说明独立作业尚未完成，不是环境安装失败。

Download/unzip the course pack, then enter `mooncake/`. Read evidence labels before interpreting numbers. Initial NOT YET from `check.py` is expected until you implement the assignment.

```sh
cd mooncake
python3 --version
python3 lab.py selfcheck
python3 lab.py day1
python3 -m json.tool out/day01.json
```

每天运行 `python3 lab.py dayN`（N=1…10）。保存不同试验时用 `--out out/my-run`，不要覆盖基线。运行第 10 天会重跑第 1–9 天并生成报告。

Run `python3 lab.py dayN` for each N=1…10; use `--out out/my-run` for variants. Day 10 reruns days 1–9 and exports the portfolio.

| 日 / Day | 查看 / Inspect | 应得结果 / Expected | 亲自改变 / Change yourself |
|---|---|---|---|
| 1 | Transfer 与 Store 的职责 / Transfer vs Store responsibilities | register→submit→complete→release | 为丢失元数据写恢复顺序 / Plan metadata recovery |
| 2 | 实际帧、回执哈希 / Real frame and hash receipt | received_bytes=65536，verified=true | 把 tcp_roundtrip 默认大小改为 32768，并核对 / Try 32768 bytes |
| 3 | 借用 vs 快照 / Borrowed vs owned snapshot | ZBC vs ABC | 把修改放到完成之后 / Move mutation after completion |
| 4 | 字典 Store 的 put/get/delete / Toy Store operations | 2 bytes；删除后 null / null after delete | 添加空 bytes 对象，区别 miss / Distinguish empty bytes and miss |
| 5 | 十进制传输成本 / Decimal transfer costs | 100 MB at 10 GB/s + 0.2 ms = 10.2 ms | 比较固定开销主导的小对象 / Compare small objects |
| 6 | 复制与预留 / Copies and reserve | 8 GiB×2 / 0.8 = 20 GiB | 预留改 25% 得 21.333 GiB / Try 25% reserve |
| 7 | KV 身份兼容 / KV compatibility | 不同模型拒绝复用 / Model mismatch rejects reuse | 分别改变模型、dtype、layout / Change each identity field |
| 8 | 命名空间和失效 / Namespaces and expiry | 同租户 true，跨租户 false / same true, cross false | 说明为什么 key 前缀不是鉴权 / Explain why prefix is not authorization |
| 9 | 截断与重试 / Truncation and retry | 8 announced vs 3 bytes，应用一次 / applied once | 构造重启丢失 seen 的反例 / Lose dedup state on restart |
| 10 | 作品证据 / Portfolio | 9 JSON + CSV + environment + REPORT.md | 完成 student.py 和报告 / Complete implementation and report |

第 6 天 placement 中每个节点的 8 GiB 指已存副本数据，合计 16 GiB；20 GiB 是包含空余空间后的**总物理容量需求**。不要把已存字节和总容量混同。

Day 6 placement contains 8 GiB of stored data per named node (16 GiB total). Required 20 GiB includes free headroom. Named nodes do not by themselves establish independent failure domains.

## 独立验收 / Independent assignment

实现 `student.py:transfer_cost_ms`，不导入 solutions.py。给出 bytes、GB/s 和 ms 的单位推导，解释零字节为什么仍有固定开销。测试包括负数、零带宽、零字节及不同量级。

Implement `student.py:transfer_cost_ms` without importing the reference. Explain the units and why zero bytes may still incur fixed overhead. Checks include invalid inputs and multiple scales.

```sh
python3 check.py
python3 check.py --reference
python3 lab.py day10 --out out/portfolio
```

`--reference` 明确标为 REFERENCE ONLY，不代表本人完成；阅读后关闭参考文件并重新实现。报告保留了 TODO，必须填本人改动、预测/观察差异、一个失败案例和下一步真实环境验证计划。

The reference mode is explicitly labelled and does not establish personal completion. Fill all report TODOs with your change, prediction versus observation, failure case and real-environment validation plan.

## 可选：真实 Mooncake Store / Optional real Store

环境目标：Ubuntu 22.04 x86_64、Python 3.11、`mooncake-transfer-engine-non-cuda==0.3.14`。需要约 640 MiB 注册/缓冲内存及进程开销；先在自己的隔离学习机安装运行库 `libcurl4 libibverbs1 rdma-core librdmacm1 libnuma1 liburing2`。仅装一个 Mooncake wheel 变体。不支持环境不要强行替换成无版本 `latest`；保存安装报错和平台信息。此路线使用 TCP CPU Store，仍不验证 RDMA。

Target: Ubuntu 22.04 x86_64, Python 3.11 and the pinned non-CUDA wheel. Allow roughly 640 MiB for segments/buffers plus process overhead. Required OS runtimes are listed above; install them in your own isolated teaching host. Install only one wheel variant. This route uses CPU Store over TCP, not RDMA.

环境终端 / Setup terminal:

```sh
python3.11 -m venv .venv-mooncake
.venv-mooncake/bin/python -m pip install 'mooncake-transfer-engine-non-cuda==0.3.14'
```

终端 A：在隔离机器中启动专用 master，保持前台 / Terminal A: start a dedicated master in the isolated host:

```sh
.venv-mooncake/bin/mooncake_master
```

终端 B：回到同一实验包目录 / Terminal B: same lab directory:

```sh
.venv-mooncake/bin/python real_mooncake.py
```

预期 `verified: true`、`evidence: measured-mooncake-store-tcp`。若 master 未启动，先检查 50051 端口和进程日志；若缺动态库，检查上述 OS 依赖。关闭客户端后在终端 A 按 Ctrl-C；不要连接共享生产 master。真实 SDK 的运行记录需要由学生在该环境补充，本实验包只已验证标准库主线。

Expected: `verified: true` with `measured-mooncake-store-tcp`. A refused connection means checking the master/port 50051; missing libraries require the OS dependencies. Stop the dedicated master with Ctrl-C. Students must supply actual SDK evidence; only the standard-library route was executed for this pack.

## 常见问题 / Troubleshooting

- TCP 监听被沙箱拦截：在允许本机 loopback 的本地终端重跑；不要把模拟数字替代为实测。 / If a sandbox blocks binding, rerun in a terminal that allows loopback; do not relabel models as measurements.
- JSON 的吞吐每次变化：本机调度、连接建立和校验都计入；它不是 Mooncake/RDMA 的性能基线。 / Timing includes connection and checksum overhead and varies with scheduling.
- hash 不一致或 EOFError：先检查宣告长度、部分 recv 和缓冲生命周期；不能只增加重试次数。 / Check announced length, partial receives and buffer lifetime before adding retries.

资料核对 / Sources checked 2026-11-13: [official quick start](https://kvcache-ai.github.io/Mooncake/getting_started/quick-start.html), [release v0.3.14](https://github.com/kvcache-ai/Mooncake/releases/tag/v0.3.14), [Transfer Engine design](https://kvcache-ai.github.io/Mooncake/design/transfer-engine/index.html). Upstream docs can evolve; retain the pinned environment with any reproduced result.
