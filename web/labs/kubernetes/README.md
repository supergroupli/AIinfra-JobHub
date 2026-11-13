# Kubernetes 推理平台基础：10 日实验 / Ten-day platform foundations

主线仅需 Python 3.9+ 标准库，可在 Windows/macOS/Linux 跑，不需 Docker、GPU 或集群。`manifests.json` 是合法 Kubernetes JSON List，包含 ConfigMap、Deployment 和 ClusterIP Service；Kubernetes 接受 JSON 和 YAML。**离线检查只检查本教学清单的关键关联，不等于 API Server 验证，不宣称已运行集群。** Nginx 返回教学网页，不运行 LLM。

The required route needs Python 3.9+ standard library, without Docker/GPU/cluster. `manifests.json` is a Kubernetes JSON List containing ConfigMap, Deployment and ClusterIP Service. **Its offline checker covers selected relationships in this teaching manifest; it is not API-server validation or evidence of a running cluster.** Nginx serves a teaching page, not an LLM.

## 开始 / Start

下载解压后进入 `kubernetes/`。先读 requests、labels、ports，再运行校验。

Download/unzip and enter `kubernetes/`. Read requests, labels and ports before checking.

```sh
cd kubernetes
python3 --version
python3 lab.py selfcheck
python3 lab.py day1
python3 -m json.tool manifests.json
```

按课程顺序执行 `python3 lab.py dayN`（N=1…10）；`--out out/my-run` 可独立保存变体。第 10 天会重跑 1–9 天并输出完整作品材料。

Run `python3 lab.py dayN`, N=1…10. Preserve variants using `--out out/my-run`. Day 10 reruns days 1–9 and exports the portfolio.

| 日 / Day | 看什么 / Inspect | 应得结果 / Expected | 独立挑战 / Independent challenge |
|---|---|---|---|
| 1 | 清单关联 / Manifest links | 教学检查 PASS / scoped check PASS | 改错 Service selector，观察失败 / Break the selector |
| 2 | 请求预算 / Request budgets | 4000m/500m 和 8192Mi/1024Mi 均为 8 / capacity 8 | 只把内存减半，容量变 4 / Halve memory |
| 3 | GPU 可分配资源 / GPU allocatable | 0 GPU→0 副本；2 GPU→2 副本 / 0 or 2 replicas | 解释 device plugin 的作用 / Explain device plugins |
| 4 | 存储生命周期 / Storage lifetime | emptyDir 过容器重启，不跨 Pod 删除 / survives container, not Pod deletion | 说明权重下载的校验与重试 / Design artifact checks/retries |
| 5 | 三类探针 / Three probes | startup 完成前无流量；ready=false 不强制重启 / readiness alone does not restart | 模拟依赖失败并选对探针 / Choose a probe for dependency failure |
| 6 | 流量路由 / Routing | Service 8080→container 80 | 找出 selector/port 错配 / Diagnose selector/port mismatch |
| 7 | 扩容模型 / Scaling model | ceil(2×90/60)=3 | 加上 min/max 边界 / Test min/max |
| 8 | 滚动发布余量 / Rollout headroom | 2+1=3 Pod；内存请求 128→192Mi | 一个空余 Pod 都容不下时会怎样 / Explain a blocked surge |
| 9 | 事件驱动排障 / Event-led diagnosis | 三种失败对应三种首查方向 / Three distinct diagnoses | 不删 Pod 先收集 events/logs / Gather evidence first |
| 10 | 平台作品 / Portfolio | 9 JSON + CSV + environment + REPORT.md | 完成双资源容量函数 / Implement both resource constraints |

调度算例中的节点是扣除系统保留后的 allocatable；忽略已有 Pod、亲和性、污点、拓扑和每 Pod 开销。requests 用于调度，limits 用于运行时约束，不能用二者中更好看的一个数替代另一个。HPA 算例只演示比例公式；实际 HPA 还有就绪状态、缺指标、容差、稳定窗口等处理。GPU 示例是整数扩展资源，不是显存自动切分。

Capacity models use allocatable resources and omit existing workloads, affinities, taints, topology and overhead. Requests and limits have different meanings. The HPA ratio omits real readiness, missing-metric, tolerance and stabilization logic. Integer GPU resources are not automatic GPU-memory slicing.

## 独立验收 / Independent assignment

实现 `student.py:replica_slots`：先分别计算 CPU 和内存可容纳数量，再取较小值；检查非法 requests，支持零预算。测试分别让 CPU、内存成为瓶颈。说明不同 requests 对 rollout 余量的影响，附一份清单差异。

Implement `student.py:replica_slots`, taking the smaller CPU/memory capacity, supporting zero budgets and rejecting invalid requests. Tests exercise each bottleneck. Include a manifest diff and explain surge headroom.

```sh
python3 check.py
python3 check.py --reference
python3 lab.py day10 --out out/portfolio
```

NOT YET 表示作业尚未实现；参考解 PASS 不代表本人完成。报告必须补本人改动、失败定位、发布/回滚判断及未验证事项。不能仅交自动生成的 TODO 模板。

NOT YET means the assignment remains unfinished. A passing reference is not personal completion. Fill report TODOs with your contribution, diagnosis, rollout/rollback criteria and unverified assumptions.

## 可选真实集群路线 / Optional real cluster route

目标：**专用学习集群 Kubernetes 1.35.9 + kubectl 1.35.9**，镜像 `nginx:1.27.5`。本仓库未运行这条路线。使用你已有并有权限的学习环境；不要把本命令用于生产 context。集群至少能容纳 3×100m CPU / 3×64Mi requests 的发布峰值，另需系统组件与实际运行内存。镜像需要外网或已配置镜像镜像源。示例没有 GPU 插件、HPA controller、LLM runtime 或可持久权重卷。

Target: a dedicated teaching cluster and kubectl at 1.35.9, with nginx:1.27.5. This optional route was not executed here. Use an existing authorized teaching context. Allow rollout headroom for three pods, system components and actual runtime memory. This sample does not install GPU plugins, HPA metrics infrastructure, LLM runtimes or persistent weights.

准备终端：将 context 值替换成你自己的专用学习 context，版本不匹配先停下来校准 / Setup terminal: replace the context value with your dedicated teaching context and verify versions:

```sh
export JOBHUB_CONTEXT=your-teaching-context
kubectl --context "$JOBHUB_CONTEXT" version
kubectl --context "$JOBHUB_CONTEXT" create namespace jobhub-lab
kubectl --context "$JOBHUB_CONTEXT" -n jobhub-lab apply --dry-run=server -f manifests.json
kubectl --context "$JOBHUB_CONTEXT" -n jobhub-lab apply -f manifests.json
kubectl --context "$JOBHUB_CONTEXT" -n jobhub-lab rollout status deployment/jobhub-demo --timeout=120s
kubectl --context "$JOBHUB_CONTEXT" -n jobhub-lab get pods,service
```

若 namespace 已存在，先确认它确实是本课程隔离空间，再跳过 create。server dry-run 仍会联系 API Server，检查权限/准入；没有创建应用资源。实际 apply 才改变集群。保留 dry-run、rollout 和 pod 输出才能写“已部署”。

If the namespace exists, first verify it belongs to this lab. Server dry-run contacts the API server and admission chain. Actual apply changes the cluster. Retain dry-run, rollout and pod outputs before claiming deployment.

终端 A（持续前台） / Terminal A (foreground):

```sh
kubectl --context "$JOBHUB_CONTEXT" -n jobhub-lab port-forward --address 127.0.0.1 service/jobhub-demo 8080:8080
```

终端 B / Terminal B:

```sh
curl --fail --silent http://127.0.0.1:8080/
```

预期返回 JobHub 教学页。端口占用时改本地端口如 18080:8080；请相应改 curl。结束时终端 A Ctrl-C。只在确认全部对象属于此实验后清理本清单对象；无需删除整个 namespace：

Expect the JobHub teaching page. If port 8080 is occupied, choose 18080:8080 and change curl accordingly. Stop terminal A with Ctrl-C. After verifying ownership, remove only these lab objects:

```sh
kubectl --context "$JOBHUB_CONTEXT" -n jobhub-lab delete -f manifests.json
```

## 排错顺序 / Diagnostic order

- Pending/FailedScheduling：先比 requests 和 allocatable，再看 taints、affinity；增加 limits 不会制造可用节点。 / Compare requests/allocatable, then taints and affinity.
- ImagePullBackOff：检查镜像标签、仓库访问、凭证；离线清单检查不会验证镜像可拉取。 / Check image/tag, registry access and credentials.
- Readiness failed：查路径、端口、启动进度；不要通过关闭 readiness 来隐藏未就绪服务。 / Check path, port and startup progress.
- 需要现场信息时使用显式 context 和 namespace 的 `describe pod`、`logs`、`get events`；不要把密钥或完整生产日志上传求职作品。 / Use scoped diagnostics and keep credentials out of your portfolio.

资料核对 / Sources checked 2026-11-13: [supported releases](https://kubernetes.io/releases/), [resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/), [probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/), [GPU scheduling](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/). Record exact versions with any real deployment evidence.
