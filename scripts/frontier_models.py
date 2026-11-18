"""Transparent arithmetic models for the three advanced course labs."""


def bi(zh, en):
    return {"zh": zh, "en": en}


MODELS = {
    "rl-pipeline": {
        "title": bi("训练闭环：串行还是流水线？", "Training loop: serial or pipelined?"),
        "description": bi("固定每批 128 条轨迹、每个采样 worker 每秒 4 条、奖励阶段 8 秒、每批权重同步设置不可重叠的 2 秒全局屏障。假定其余阶段资源独立、无限缓冲且没有争用；流水线值是填满后的理想批间隔，不是第一批延迟。异步训练还需检查样本版本。", "Assume 128 trajectories per batch, 4 trajectories/s per rollout worker, 8 s for rewards and a non-overlapping 2 s global weight-sync barrier per batch. Other stages have independent resources, unlimited buffering and no contention. The pipeline value is an ideal steady-state batch interval, not first-batch latency. Async training also needs sample-version checks."),
        "inputs": [("workers", bi("采样 worker 数", "Rollout workers"), 4, 1, 16, 1), ("train", bi("训练阶段 / s", "Training stage / s"), 12, 1, 60, 1)],
        "formula": "rollout = 128/(4×workers); serial = rollout+8+train+2; interval = max(rollout,8,train)+2",
        "rows": [bi("串行每批耗时", "Serial batch time"), bi("理想稳态批间隔", "Ideal steady-state interval")],
        "defaults": [30, 14], "unit": "s",
        "example": bi("默认：串行 30 秒，理想稳态间隔 14 秒；没有证明训练质量相同。", "Default: 30 s serial, 14 s ideal steady-state interval; equal training quality is not established.")
    },
    "rl-staleness": {
        "title": bi("轨迹进入训练时，策略已经更新几次？", "How old is a trajectory's policy?"),
        "description": bi("用固定更新间隔估算策略版本差，向上取整是保守近似。真实系统应记录生成和消费时的 policy version；这里既不模拟重要性采样，也不能从版本差推断奖励或收敛。", "Estimate policy-version lag from a fixed update interval, rounded up conservatively. Real systems must record generation and consumption policy versions. This does not model importance sampling or predict reward or convergence."),
        "inputs": [("age", bi("轨迹年龄 / s", "Trajectory age / s"), 20, 0, 120, 1), ("interval", bi("更新间隔 / s", "Update interval / s"), 10, 1, 30, 1), ("budget", bi("允许的版本差", "Allowed version lag"), 1, 0, 12, 1)],
        "formula": "estimated_lag = ceil(age / update_interval); admissible = estimated_lag ≤ budget",
        "rows": [bi("估算版本差", "Estimated version lag"), bi("允许版本差", "Allowed version lag")],
        "defaults": [2, 1], "unit": "versions",
        "example": bi("默认：估算落后 2 个版本，超过 1 个版本的预算。", "Default: estimated lag 2 exceeds the 1-version budget.")
    },
    "rl-memory": {
        "title": bi("训练与采样的内存账本", "Training and rollout memory ledger"),
        "description": bi("训练按 FP32 Adam 的参数、梯度和两个动量共 16 bytes/参数；采样仅按 BF16 权重 2 bytes/参数。比较理想均匀分片后每设备的持久状态。省略激活、KV cache、临时缓冲和复制开销，不能保证装得下。", "Training counts FP32 Adam weights, gradients and two moments: 16 bytes/parameter. Rollout counts BF16 weights only: 2 bytes/parameter. Compare ideally sharded persistent state per device. Activations, KV cache, temporary buffers and copies are excluded; fitting is not guaranteed."),
        "inputs": [("parameters", bi("参数量 / 十亿", "Parameters / billion"), 1, 1, 32, 1), ("shards", bi("训练分片数", "Training shards"), 2, 1, 16, 1), ("tp", bi("采样权重分片数", "Rollout weight shards"), 1, 1, 16, 1)],
        "formula": "train_GB = 16×parameters/shards; rollout_GB = 2×parameters/tp; colocated = train_GB+rollout_GB",
        "rows": [bi("每设备训练状态", "Training state/device"), bi("每设备采样权重", "Rollout weights/device")],
        "defaults": [8, 2], "unit": "GB",
        "example": bi("默认：训练 8 GB，采样权重 2 GB；共置相加为 10 GB，仅为部分账本。", "Default: training 8 GB, rollout weights 2 GB; colocated sum 10 GB is only a partial ledger.")
    },
    "routing-cost": {
        "title": bi("缓存命中，为什么仍然更慢？", "Why can a cache hit still be slower?"),
        "description": bi("固定完整 Prefill 为 100 ms，假定其耗时随未缓存比例线性变化。只比较当前队列等待加 Prefill，忽略传输、Decode、块对齐和遥测误差；实际路由需要测量。", "Full prefill takes an assumed 100 ms and scales linearly with the uncached fraction. Compare current queue wait plus prefill only, excluding transfer, decode, block alignment and telemetry error. Real routing requires measurement."),
        "inputs": [("hot", bi("热节点排队 / ms", "Warm queue / ms"), 80, 0, 300, 10), ("cold", bi("冷节点排队 / ms", "Cold queue / ms"), 10, 0, 300, 10), ("reuse", bi("可复用前缀 / %", "Reusable prefix / %"), 80, 0, 100, 10)],
        "formula": "warm = hot_queue + 100×(1−reuse/100); cold = cold_queue+100",
        "rows": [bi("热缓存节点", "Warm-cache endpoint"), bi("冷缓存节点", "Cold-cache endpoint")],
        "defaults": [100, 110], "unit": "ms",
        "example": bi("默认：热节点 100 ms，冷节点 110 ms。增大热节点队列可反转选择。", "Default: warm 100 ms, cold 110 ms. Increasing the warm queue can reverse the choice.")
    },
    "pd-capacity": {
        "title": bi("P、D 与传输：谁限制容量？", "Prefill, decode or transfer: which limits capacity?"),
        "description": bi("假定每个 P worker 每请求占用 40 ms，每个 D worker 每请求占用 100 ms，每请求仅传一次 8 MB KV。各阶段独立，忽略批处理、排队和协议开销；最小容量是理想上界，不是可承诺的吞吐。", "Assume 40 ms/request per P worker, 100 ms/request per D worker and one 8 MB KV transfer per request. Independent stages; batching, queuing and protocol overhead are excluded. The minimum capacity is an ideal bound, not promised throughput."),
        "inputs": [("prefill", bi("P worker 数", "P workers"), 2, 1, 16, 1), ("decode", bi("D worker 数", "D workers"), 4, 1, 16, 1), ("network", bi("有效传输带宽 / MB/s", "Effective transfer bandwidth / MB/s"), 200, 40, 1600, 40)],
        "formula": "P = workers×1000/40; D = workers×1000/100; transfer = bandwidth/8; bound = min(P,D,transfer)",
        "rows": [bi("P 容量", "P capacity"), bi("D 容量", "D capacity"), bi("传输容量", "Transfer capacity")],
        "defaults": [50, 40, 25], "unit": "req/s",
        "example": bi("默认：50、40、25 req/s，上界 25 req/s，由传输限制。", "Default: 50, 40 and 25 req/s; transfer limits the bound to 25 req/s.")
    },
    "rollout-availability": {
        "title": bi("滚动升级期间，还剩多少服务容量？", "How much capacity remains during a rollout?"),
        "description": bi("这里 rollout 指部署滚动升级。固定每个健康副本容量 10 req/s，以 replicas−maxUnavailable 估算可用副本下限。假定没有额外故障、readiness 正确、请求均匀，省略启动与排空时间；不是可用性保证。", "Here rollout means a deployment upgrade. Assume 10 req/s per healthy replica and estimate the available-replica floor as replicas−maxUnavailable. No extra failures, correct readiness and even traffic are assumed; startup and drain times are omitted. This is not an availability guarantee."),
        "inputs": [("replicas", bi("期望副本数", "Desired replicas"), 4, 1, 16, 1), ("unavailable", bi("最多不可用副本", "Max unavailable replicas"), 1, 0, 16, 1), ("arrival", bi("请求到达 / req/s", "Arrival / req/s"), 25, 0, 160, 5)],
        "formula": "available = max(0,replicas−maxUnavailable); capacity = 10×available",
        "rows": [bi("升级期容量下限估算", "Estimated rollout capacity floor"), bi("请求到达量", "Arrival rate")],
        "defaults": [30, 25], "unit": "req/s",
        "example": bi("默认：至少 3 个可用副本，估算 30 req/s，对比到达 25 req/s。", "Default: floor 3 available replicas, estimated 30 req/s against 25 req/s arrival.")
    },
    "moe-balance": {
        "title": bi("专家热点会撑破容量吗？", "Will an expert hotspot exceed capacity?"),
        "description": bi("固定 top-k=2、capacity factor=1.25。指定专家接收一部分分配，其余均匀落到其他专家；用可分割的流量近似，并未执行真实 top-k 路由。同一 token 的不同专家约束与实际丢弃规则未建模。", "Fix top-k=2 and capacity factor=1.25. One designated expert receives a share of assignments; the rest is uniform across other experts. This divisible-flow approximation does not execute top-k routing or model distinct-expert constraints per token and actual dropping policy."),
        "inputs": [("tokens", bi("Token 数", "Token count"), 1024, 128, 2048, 128), ("experts", bi("专家数", "Experts"), 8, 2, 16, 1), ("share", bi("指定专家分配占比 / %", "Designated expert assignment share / %"), 50, 0, 100, 5)],
        "formula": "s = share/100; A = 2×tokens; maximum = max(A×s,A×(1−s)/(experts−1)); capacity = ceil(1.25×A/experts)",
        "rows": [bi("最大专家负载估算", "Estimated maximum expert load"), bi("每专家容量", "Capacity per expert")],
        "defaults": [1024, 320], "unit": "assignments",
        "example": bi("默认：最大负载 1024，容量 320；最大负载是平均值的 4 倍。", "Default: maximum load 1024, capacity 320; maximum load is 4× the average.")
    },
    "moe-traffic": {
        "title": bi("Dispatch 与 Combine 要搬多少数据？", "How much data do dispatch and combine move?"),
        "description": bi("固定 hidden=4096、top-k=2，dispatch 和 combine 均用 2 bytes/元素。只数远端张量 payload，假设没有合并同目的地副本，不含元数据、对齐、拥塞和启动开销。实际 DeepEP 精度和布局可能不同。", "Fix hidden=4096, top-k=2 and 2 bytes/element for both dispatch and combine. Count remote tensor payload only, without coalescing same-destination copies, metadata, alignment, contention or startup overhead. Actual DeepEP precision and layout may differ."),
        "inputs": [("tokens", bi("Token 数", "Token count"), 1024, 128, 4096, 128), ("remote", bi("远端分配 / %", "Remote assignments / %"), 75, 0, 100, 5), ("bandwidth", bi("有效带宽 / GB/s", "Effective bandwidth / GB/s"), 25, 1, 100, 1)],
        "formula": "full_MB = 2×tokens×4096×2×2/10⁶; remote_MB = full_MB×remote/100; lower_ms = remote_MB/bandwidth_GBps",
        "rows": [bi("全部分配均远端的参照", "All-remote reference"), bi("当前远端 payload", "Current remote payload")],
        "defaults": [33.554432, 25.165824], "unit": "MB",
        "example": bi("默认：远端 25.17 MB，纯传输下界约 1.01 ms；MB、GB 用十进制。", "Default: remote 25.17 MB, payload-only transfer floor about 1.01 ms; decimal MB and GB.")
    },
    "moe-roofline": {
        "title": bi("每个专家的 Token 数如何影响 GEMM？", "How do tokens per expert affect GEMM?"),
        "description": bi("单个 BF16 GEMM：[M,H]×[H,H]→[M,H]。每个输入、权重冷读一次，输出写一次；不含激活函数、量化、融合与通信。计算和内存的较大值仅为理想耗时下界，不是 DeepGEMM 实测。", "One BF16 GEMM: [M,H]×[H,H]→[M,H]. Read input and cold weights once, write output once. Activation, quantization, fusion and communication are excluded. The larger compute/memory time is an ideal lower bound, not a DeepGEMM measurement."),
        "inputs": [("tokens", bi("每专家 Token 数 M", "Tokens per expert M"), 16, 1, 256, 1), ("power", bi("Hidden 指数 k（H=2ᵏ）", "Hidden exponent k (H=2ᵏ)"), 12, 8, 13, 1), ("bandwidth", bi("内存带宽 / GB/s", "Memory bandwidth / GB/s"), 900, 100, 3000, 100), ("peak", bi("峰值 / TFLOP/s", "Peak / TFLOP/s"), 100, 10, 1000, 10)],
        "formula": "FLOPs = 2MH²; bytes = 2(2MH+H²); memory_ms = bytes/(BW×10⁶); compute_ms = FLOPs/(peak×10⁹)",
        "rows": [bi("内存耗时下界", "Memory time floor"), bi("计算耗时下界", "Compute time floor")],
        "defaults": [0.03757397333333334, 0.00536870912], "unit": "ms",
        "example": bi("默认：内存约 0.0376 ms，计算约 0.0054 ms，理想下界由内存限制。", "Default: memory about 0.0376 ms, compute about 0.0054 ms; memory limits the ideal floor.")
    },
}
