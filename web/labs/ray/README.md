# Ray 任务、对象与服务：10 日实验 / Ten days of tasks, objects and serving

主线是 Python 3.9+ 标准库，Windows/macOS/Linux 均可，不需 GPU 或 Ray 安装。第 2/6/7 天实际执行本机 Python 工作，其余为设计/模拟。**本机线程结果不是 Ray 调度器或分布式性能实测**。可选固定版本 Ray Core / Serve 路线在下方。

Required: Python 3.9+ standard library on Windows/macOS/Linux; no GPU/Ray installation. Days 2/6/7 execute local Python work, while other days are design/simulation. **Thread results are not Ray scheduler or distributed performance measurements.** Optional pinned Ray Core / Serve examples follow.

## 开始 / Start

下载并解压，进入 `ray/`。每日先写预测，再运行，再解释 evidence 字段。

Download/unzip and enter `ray/`. Predict, execute, then explain the evidence label.

```sh
cd ray
python3 --version
python3 lab.py selfcheck
python3 lab.py day1
python3 -m json.tool out/day01.json
```

依次执行 `python3 lab.py dayN`（N=1…10）。每次实验可用 `--out out/variant` 保留结果。第 10 天重跑前九天，导出 JSON、CSV、environment.json 和 REPORT.md。

Run each `python3 lab.py dayN`, N=1…10. Use `--out out/variant` to preserve variants. Day 10 reruns prior experiments and exports the portfolio.

| 日 / Day | 核心问题 / Question | 应得结果 / Expected | 独立变化 / Independent variation |
|---|---|---|---|
| 1 | Core/Data/Train/Serve 职责 / Layer responsibilities | 四层及输入→变换→输出 / Four layers and input→transform→output | 给批处理与在线请求分别选层 / Choose layers for batch vs online |
| 2 | 有界并发 / Bounded concurrency | 8 平方数之和 140，pending≤2 / sum 140, pending≤2 | limit=1 和 4 时输出不变 / Compare limits 1 and 4 |
| 3 | ObjectRef 与对象字节 / References vs payload | 8×64=512 MiB vs 64 MiB | 加远程节点复制，说明模型失效处 / Include remote copies |
| 4 | Actor 状态 / Actor state | 2→5→4；重放得到 4 / replay gives 4 | 添加重复事件，观察 double apply / Add a duplicate event |
| 5 | 逻辑资源 / Logical resources | floor(4/1.5)=2，余 1 CPU / 1 CPU left | 请求 0.5 时可放 8 个 / Try 0.5 CPU |
| 6 | 背压与对象驻留 / Backpressure and lifetime | 100 任务 sum=328350；pending≤4；积压 100 / backlog 100 | arrival=30 时积压不再增长 / Try arrival 30/s |
| 7 | 不整除的尾批 / Partial final batch | 批大小 [3,3,2]；8 条结果 / eight records | 输入 7/9 条，检查无丢失重复 / Test 7 and 9 rows |
| 8 | 在线契约 / Online contract | value=7 → square=49 | 拒绝字符串、缺字段和过大整数 / Reject malformed input |
| 9 | 重试副作用 / Retry effects | a,b,a → 两次提交 / two commits | 清空 seen 再重放说明局限 / Clear dedup state and replay |
| 10 | 证据作品 / Portfolio | 9 JSON + CSV + environment + report | 实现容量函数并写一个失败复盘 / Implement capacity and analyze failure |

并发示例保持了任务 ID→结果关系，不假定完成顺序。bounded_map 限制的是已提交未收回的任务数；它与 worker 数不是同一概念。整数平方任务非常短，线程运行甚至可能更慢，不能用此实验声称 Ray 加速。第 6 天 64 MiB/对象是单独的假设容量计算，代码没有真实分配 6.4 GiB。

Results are restored by task ID, independent of completion order. The bound covers submitted outstanding work, which differs from worker count. Tiny CPU-bound squares may be slower with threads. The 64 MiB/object estimate is hypothetical; the program does not allocate 6.4 GiB.

## 独立验收 / Independent check

实现 `student.py:admission`：逻辑 CPU 预算除以每任务需求并向下取整，处理零预算和非法请求。不要导入 solutions.py。更进一步，给队列模型添加服务时长翻倍的案例，并解释为什么 CPU 容量声明不是操作系统的硬限制。

Implement `student.py:admission`, including zero-budget and invalid-request cases. Do not import the reference. Then double service duration in the backlog scenario and explain why logical CPU requests are not OS isolation limits.

```sh
python3 check.py
python3 check.py --reference
python3 lab.py day10 --out out/portfolio
```

首次 NOT YET 是预期状态。参考通过仅标记 REFERENCE ONLY，不能作为自己的完成证明。补齐 REPORT.md 的本人改动、证据、重试边界及后续工作。

Initial NOT YET is expected; REFERENCE ONLY is not personal completion. Complete the report TODOs with your own change, evidence and retry limitations.

## 可选真实 Ray 2.60.0 / Optional real Ray 2.60.0

目标环境：Ubuntu 22.04 x86_64、Python 3.11、2 个可用 CPU、建议 4 GiB 以上内存。需要联网安装，固定 `ray[serve]==2.60.0`。这些真实 SDK 路线已核对官方接口，但未在本仓库执行；失败时保留完整日志和版本，不能用主线线程数据替代。使用专用本机学习环境；不暴露集群控制端口。

Target: Ubuntu 22.04 x86_64, Python 3.11, two available CPUs and preferably at least 4 GiB RAM. These SDK examples follow official interfaces but were not executed in this repository. Save version/logs and keep their evidence separate from the standard-library route.

```sh
python3.11 -m venv .venv-ray
.venv-ray/bin/python -m pip install 'ray[serve]==2.60.0'
.venv-ray/bin/python real_ray.py
```

预期 sum=140，evidence 为 `measured-ray-local`。脚本使用 `ray.wait` 限制 pending≤2，最后 shutdown。对象存储启动报内存不足时，先检查机器内存、容器共享内存和其他进程，不应删去容量约束来掩盖问题。

Expect sum=140 and `measured-ray-local`. The script uses `ray.wait` to bound pending tasks and shuts down afterwards. If the object store cannot start, inspect available/shared memory and existing processes.

真实 Serve，终端 A（持续前台；在 ray/ 目录） / Serve terminal A (foreground, in ray/):

```sh
.venv-ray/bin/serve run --host 127.0.0.1 real_serve:app
```

终端 B / Terminal B:

```sh
curl --fail --silent http://127.0.0.1:8000/ -H 'Content-Type: application/json' -d '{"value":7}'
```

预期 square=49；发送 `{"value":"7"}` 应为 HTTP 400。完成后终端 A Ctrl-C。服务设一副本、每副本 4 个 ongoing、每调用端 4 个 queued；这些是应用控制项，不等于所有 HTTP 请求在全局共享一个固定队列。压测前另写到达率、观测窗口和错误率记录。

Expect square=49; string input returns HTTP 400. Stop terminal A with Ctrl-C. One replica has four ongoing requests, with a queued-request limit per caller. This is not a single global queue or a performance benchmark.

## 常见问题 / Common failures

- 输入为空时 pending=0 是正确结果；不能无限等待一个永不创建的 future。 / Empty input should return no tasks rather than wait forever.
- 批尾数据消失：不要只遍历整除批次，保留最后不足 batch_size 的一批。 / Preserve partial final batches.
- 重试重复写数据库：仅启用重试不会解决幂等；需要业务 ID 和持久原子提交。 / Retry policies do not replace durable idempotency.

资料核对 / Sources checked 2026-11-13: [Ray 2.60.0 release](https://github.com/ray-project/ray/releases/tag/ray-2.60.0), [pending-task backpressure](https://docs.ray.io/en/latest/ray-core/patterns/limit-pending-tasks.html), [logical resources](https://docs.ray.io/en/latest/ray-core/scheduling/resources.html), [Serve](https://docs.ray.io/en/latest/serve/getting_started.html). Keep pinned environment records because latest docs evolve.
