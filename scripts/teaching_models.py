"""Explicit assumptions for browser-only engineering teaching models."""

def bi(zh, en):
    return {"zh": zh, "en": en}


# key, bilingual label, default, min, max, step
MODELS = {
    "rsi-budget": {
        "title": bi("失败也花预算：还能试多少次？", "Failed trials also consume budget"),
        "description": bi("把提案、执行、检查合并为一次实验成本。假设每次成本相同、失败率固定，所有失败均记账。这里计算的是有效结果的期望，不是成功次数预测；真实实验还需记录实际时间、token和中断成本。", "Treat proposing, executing and checking as one trial cost. Assume equal costs and a fixed failure rate, charging all failures. This gives expected valid outcomes, not a predicted success count. Real experiments must record actual time, tokens and interruptions."),
        "inputs": [("budget", bi("总预算 / 单位", "Total budget / units"), 1000, 0, 2000, 50), ("cost", bi("每次实验成本 / 单位", "Cost per attempt / units"), 20, 5, 100, 5), ("failure", bi("失败率假设 / %", "Assumed failure rate / %"), 25, 0, 100, 5)],
        "formula": "attempts = floor(budget / cost); expected_valid = attempts × (1 − failure_rate)",
        "rows": [bi("全部尝试数（含失败）", "All attempts, including failures"), bi("有效结果的期望", "Expected valid outcomes")],
        "defaults": [50, 37.5], "unit": "trials",
        "example": bi("1000/20=50次尝试，25%失败率下有效次数期望37.5。失败实验仍消耗预算。", "1000/20 = 50 attempts; a 25% failure rate gives 37.5 valid outcomes in expectation. Failed attempts still cost budget.")
    },
    "rsi-gain": {
        "title": bi("局部更快，完整链路快多少？", "How much does a local improvement help overall?"),
        "description": bi("Amdahl 教学模型：原总耗时归一为1，仅其中一段被优化。假设其余阶段不变，串行相加且没有额外开销。用完整任务的测量验证结果，不能将算子加速直接当作引擎加速。", "Amdahl teaching model: normalize original runtime to one and accelerate only one component. Remaining work stays fixed, times add sequentially and no overhead is added. Check the complete task; kernel speedup is not engine speedup."),
        "inputs": [("share", bi("目标阶段原耗时占比 / %", "Original time in target stage / %"), 40, 0, 100, 5), ("local", bi("目标阶段加速倍数", "Local speedup factor"), 2, 1, 8, 0.25)],
        "formula": "overall_speedup = 1 / ((1 − share) + share / local_speedup)",
        "rows": [bi("整体理论加速", "Theoretical overall speedup"), bi("目标阶段加速", "Local speedup")],
        "defaults": [1.25, 2], "unit": "×",
        "example": bi("只将占40%的阶段加速2倍，整体为1/(0.6+0.4/2)=1.25倍。", "A 2× speedup in 40% of the work gives 1/(0.6+0.4/2)=1.25× overall.")
    },
    "rsi-retests": {
        "title": bi("试得越多，偶然赢家越容易出现", "More trials create more chances for a false winner"),
        "description": bi("假设候选实际都没有收益、每次检验相互独立且误报概率相同。反复挑最好结果会放大至少一次误报的概率；实际自适应搜索中的试验往往相关，下面的数值不能直接当作其置信度。", "Assume every candidate has no real gain, tests are independent and share a false-positive rate. Selecting the best from many tests increases the chance of at least one false positive. Adaptive trials are often correlated; these values are not their confidence levels."),
        "inputs": [("trials", bi("检验次数", "Number of tests"), 20, 1, 100, 1), ("alpha", bi("单次误报率 / %", "Per-test false-positive rate / %"), 5, 1, 20, 1)],
        "formula": "P(at least one false positive) = 1 − (1 − alpha)^trials [independent tests]",
        "rows": [bi("单次误报概率", "Per-test false positive"), bi("至少一次误报概率", "At least one false positive")],
        "defaults": [5, 64.15140775914578], "unit": "%",
        "example": bi("20次独立检验、单次5%误报，至少一次误报概率约64.15%；保留独立验证与负结果。", "Across 20 independent tests at 5% each, probability of at least one false positive is about 64.15%. Preserve independent validation and negative results.")
    },
    "roofline": {
        "title": bi("算力上限，还是带宽上限？", "Compute bound or bandwidth bound?"),
        "description": bi("算术强度是每搬运一字节所做的 FLOP。用同一精度的峰值算力和持续内存带宽构造理论上界，忽略延迟、缓存层次、形状和实现开销；它不是实测速度。GB 与 TFLOP 使用十进制。", "Arithmetic intensity is FLOP per byte transferred. Use peak compute at the same precision and sustained memory bandwidth for a theoretical bound. Latency, cache hierarchy, shapes and implementation overhead are omitted; this is not measured performance. Units are decimal."),
        "inputs": [("intensity", bi("算术强度 / FLOP/byte", "Arithmetic intensity / FLOP/byte"), 20, 1, 200, 1), ("bandwidth", bi("持续内存带宽 / GB/s", "Sustained memory bandwidth / GB/s"), 1000, 100, 3000, 100), ("peak", bi("同精度峰值 / TFLOP/s", "Peak at the same precision / TFLOP/s"), 100, 10, 500, 10)],
        "formula": "bound_TFLOPs = min(peak_TFLOPs, intensity_FLOP_per_byte × bandwidth_GBps / 1000)",
        "rows": [bi("带宽决定的上界", "Bandwidth-derived bound"), bi("峰值算力", "Peak compute")],
        "defaults": [20, 100], "unit": "TFLOP/s",
        "example": bi("默认上界 20 TFLOP/s，受带宽限制；提升强度不保证实际内核达到此上界。", "Default bound: 20 TFLOP/s, bandwidth limited. More intensity does not guarantee a real kernel reaches this bound.")
    },
    "overlap-bound": {
        "title": bi("重叠执行最多能省多少时间？", "How much time can overlap save?"),
        "description": bi("比较两段任务完全串行与完全重叠的理想情况。完全重叠要求任务独立、资源互不争用且同时就绪；真实通信和计算通常有依赖、同步与带宽竞争。这里显示最好情况，不是加速承诺。", "Compare two fully sequential tasks with ideal full overlap. Full overlap requires independent work, noncompeting resources and simultaneous readiness. Real communication and compute have dependencies, synchronization and contention. This is a best-case bound, not a speedup promise."),
        "inputs": [("compute", bi("计算 / ms", "Compute / ms"), 40, 5, 200, 5), ("communication", bi("通信 / ms", "Communication / ms"), 25, 5, 200, 5)],
        "formula": "sequential_ms = compute_ms + communication_ms; ideal_ms = max(compute_ms, communication_ms)",
        "rows": [bi("完全串行", "Sequential"), bi("理想完全重叠", "Ideal full overlap")],
        "defaults": [65, 40], "unit": "ms",
        "example": bi("默认 65 ms 降至理想 40 ms，理论加速上限 1.63 倍。", "Default: 65 ms versus ideal 40 ms; maximum ideal speedup 1.63×.")
    },
    "transfer-cost": {
        "title": bi("搬数据，还是重新计算？", "Transfer or recompute?"),
        "description": bi("用十进制 MB 与 GB/s 计算单次传输；固定重算成本为 200 ms。假设带宽稳定、无重叠、无压缩；实际网络还受到并发、注册与拓扑影响。", "Use decimal MB and GB/s for one transfer, compared with an assumed 200 ms recomputation. Constant bandwidth, no overlap or compression; real networks also depend on contention, registration and topology."),
        "inputs": [("size", bi("数据 / MB", "Payload / MB"), 1000, 100, 4000, 100), ("bandwidth", bi("带宽 / GB/s", "Bandwidth / GB/s"), 10, 1, 100, 1), ("overhead", bi("固定开销 / ms", "Fixed overhead / ms"), 1, 0, 50, 1)],
        "formula": "transfer_ms = payload_MB / bandwidth_GBps + overhead_ms",
        "rows": [bi("传输成本", "Transfer cost"), bi("假设的重算成本", "Assumed recomputation")],
        "defaults": [101, 200], "unit": "ms",
        "example": bi("默认算例：101 ms 传输，对比 200 ms 重算。", "Default: 101 ms transfer versus 200 ms recomputation.")
    },
    "cache-tiers": {
        "title": bi("缓存层数增加，一定更快吗？", "Does another cache tier always help?"),
        "description": bi("顺序查找：本地查询 1 ms；本地未命中才访问远端；远端仍未命中就重算 100 ms。远端命中率是到达远端请求中的比例，不是全部请求的比例。未建模淘汰、传输大小与尾延迟。", "Sequential lookup: 1 ms locally, then remote on a local miss, then 100 ms recomputation on a remote miss. Remote hit rate is conditional on reaching that tier. Eviction, payload sizes and tail latency are omitted."),
        "inputs": [("local", bi("本地命中 / %", "Local hit rate / %"), 50, 0, 100, 10), ("remote", bi("远端条件命中 / %", "Conditional remote hit rate / %"), 50, 0, 100, 10), ("latency", bi("远端访问 / ms", "Remote access / ms"), 20, 0, 200, 10)],
        "formula": "E[ms] = 1 + (1 − local_hit) × (remote_ms + (1 − remote_hit) × 100)",
        "rows": [bi("分层平均成本", "Expected tiered cost"), bi("直接重算", "Direct recomputation")],
        "defaults": [36, 100], "unit": "ms",
        "example": bi("默认算例：分层平均成本 36 ms。提高远端访问成本也可能让缓存变慢。", "Default: expected tiered cost 36 ms. A slower remote tier can make caching worse.")
    },
    "pd-balance": {
        "title": bi("Prefill 与 Decode 谁限制吞吐？", "Which stage limits throughput?"),
        "description": bi("假设独立两阶段流水线，每个 Prefill worker 每请求用 40 ms，Decode 时长可调。各 worker 独立、每次服务一个请求；未考虑批处理和 KV 传输。这是容量上界模型。", "Two independent stages: each prefill worker takes 40 ms per request; decode duration is adjustable. Workers serve one request at a time. Batching and KV transfers are omitted, so this is a capacity-bound model."),
        "inputs": [("prefill", bi("Prefill workers", "Prefill workers"), 2, 1, 16, 1), ("decode", bi("Decode workers", "Decode workers"), 4, 1, 16, 1), ("cost", bi("每请求 Decode / ms", "Decode per request / ms"), 120, 20, 500, 20)],
        "formula": "capacity = min(prefill_workers × 1000 / 40, decode_workers × 1000 / decode_ms)",
        "rows": [bi("Prefill 容量", "Prefill capacity"), bi("Decode 容量", "Decode capacity")],
        "defaults": [50, 33.333], "unit": "req/s",
        "example": bi("默认瓶颈：Decode；理想上界 33.33 请求/秒。", "Default bottleneck: decode; ideal bound 33.33 requests/s.")
    },
    "tile-waste": {
        "title": bi("分块与边界 mask", "Tiles and boundary masks"),
        "description": bi("把一维 N 个元素分成相同大小的块，最后一块不足的槽位由 mask 屏蔽。槽位比例只描述这个一维划分，不代表 GPU occupancy、实际执行效率或吞吐。", "Partition N elements into equal one-dimensional tiles; mask padded slots in the last tile. Slot utilization describes this partition only, not GPU occupancy, execution efficiency or throughput."),
        "inputs": [("elements", bi("有效元素 N", "Valid elements N"), 1000, 100, 4100, 100), ("power", bi("块大小指数 k（大小为 2ᵏ）", "Tile exponent k (size is 2ᵏ)"), 7, 5, 10, 1)],
        "formula": "tiles = ceil(N / block); padded = tiles × block − N",
        "rows": [bi("有效元素", "Valid elements"), bi("需 mask 的槽位", "Masked slots")],
        "defaults": [1000, 24], "unit": "slots",
        "example": bi("默认：8 块，24 个填充槽位，有效比例 97.66%。", "Default: 8 tiles, 24 padded slots, 97.66% valid.")
    },
    "training-memory": {
        "title": bi("训练状态：复制与分片", "Replicated and sharded training state"),
        "description": bi("使用 FP32 Adam 简化账本：参数 4、梯度 4、两个动量共 8 bytes，每参数合计 16 bytes。比较 DDP 完整复制与理想全分片的持久状态；不含激活、临时 gather、通信缓冲，不能据此保证模型装得下。", "Simplified FP32 Adam: 4 bytes for weights, 4 for gradients and 8 for two moments, totaling 16 bytes per parameter. Compare DDP replication with ideally fully sharded persistent state. Activations, temporary gathers and communication buffers are excluded."),
        "inputs": [("parameters", bi("参数量 / 十亿", "Parameters / billion"), 7, 1, 70, 1), ("ranks", bi("分片数量", "Shard count"), 4, 1, 16, 1)],
        "formula": "replicated_GB = params_billion × 16; ideal_sharded_GB = replicated_GB / ranks",
        "rows": [bi("每 rank 完整复制", "Replicated per rank"), bi("每 rank 理想全分片", "Ideally sharded per rank")],
        "defaults": [112, 28], "unit": "GB",
        "example": bi("默认：每 rank 112 GB 与理想 28 GB；此处 GB = 10⁹ bytes。", "Default: 112 GB versus ideal 28 GB per rank; GB = 10⁹ bytes.")
    },
    "collective-cost": {
        "title": bi("Ring AllReduce 的成本", "Ring AllReduce cost"),
        "description": bi("等带宽单 ring 模型：reduce-scatter 与 all-gather 各 N−1 步，每步传 S/N 字节。alpha 是每步固定开销，B 是有效单链路带宽。忽略重叠、拥塞与拓扑；实际 NCCL 可采用其他算法。", "Single ring with equal links: reduce-scatter and all-gather each take N−1 steps, transferring S/N bytes per step. Alpha is fixed per-step overhead and B effective link bandwidth. Overlap, contention and topology are omitted; actual NCCL can use other algorithms."),
        "inputs": [("ranks", bi("rank 数", "Ranks"), 4, 2, 16, 1), ("size", bi("每 rank 数据 / MB", "Payload per rank / MB"), 256, 16, 1024, 16), ("bandwidth", bi("有效链路带宽 / GB/s", "Effective link bandwidth / GB/s"), 25, 1, 100, 1)],
        "formula": "ring_ms = 2(N−1) × 0.01 + 2(N−1)/N × payload_MB / bandwidth_GBps",
        "rows": [bi("Ring 成本估算", "Ring cost estimate"), bi("搬运一份数据的参照", "One-payload transfer reference")],
        "defaults": [15.42, 10.24], "unit": "ms",
        "example": bi("固定 alpha=10 μs。默认 Ring 为 15.42 ms，不是硬件 benchmark。", "Fixed alpha=10 μs. Default ring cost is 15.42 ms, not a hardware benchmark.")
    },
    "task-queue": {
        "title": bi("任务生产速度超过消费速度时", "When tasks arrive faster than workers finish"),
        "description": bi("从空队列出发，用 60 秒的流体近似比较到达率和处理容量。每个 worker 独立且用时固定；不考虑随机到达、重试和调度开销。容量充足也不代表实际等待永远为零。", "Start empty and use a 60-second fluid approximation. Workers are independent with fixed service times; random arrivals, retries and scheduling overhead are omitted. Spare average capacity does not imply zero real-world waiting."),
        "inputs": [("arrival", bi("到达率 / tasks/s", "Arrival rate / tasks/s"), 8, 1, 40, 1), ("workers", bi("worker 数", "Workers"), 2, 1, 8, 1), ("service", bi("单任务用时 / ms", "Service per task / ms"), 200, 50, 1000, 50)],
        "formula": "capacity = workers × 1000 / service_ms; backlog_60s ≈ max(0, arrival − capacity) × 60",
        "rows": [bi("到达率", "Arrival rate"), bi("处理容量", "Processing capacity")],
        "defaults": [8, 10], "unit": "tasks/s",
        "example": bi("默认容量 10 tasks/s，到达 8 tasks/s；流体模型积压为 0。", "Default capacity 10 tasks/s versus 8 arrivals/s; fluid backlog is 0.")
    },
    "placement-budget": {
        "title": bi("一个节点能放多少副本？", "How many replicas fit on one node?"),
        "description": bi("固定节点可分配内存 32 GiB。每副本请求整张 GPU 和固定内存，副本数由两个整数预算中更小者决定。未考虑 CPU、亲和性、污点、MIG 或多个节点碎片；这里使用 request，而不是实时利用率。", "Fix allocatable node memory at 32 GiB. Each replica requests whole GPUs and memory; the tighter integer budget limits replicas. CPU, affinity, taints, MIG and multi-node fragmentation are excluded. Use requests, not live utilization."),
        "inputs": [("memory", bi("每副本内存 request / GiB", "Memory request per replica / GiB"), 6, 1, 32, 1), ("gpus", bi("节点可分配 GPU", "Allocatable GPUs"), 4, 1, 8, 1), ("request", bi("每副本 GPU request", "GPUs requested per replica"), 1, 1, 4, 1)],
        "formula": "replicas = min(floor(32 / memory_request), floor(node_GPUs / GPU_request))",
        "rows": [bi("内存允许的副本", "Memory-limited replicas"), bi("GPU 允许的副本", "GPU-limited replicas")],
        "defaults": [5, 4], "unit": "replicas",
        "example": bi("默认只能放 4 个副本，GPU 预算先耗尽。", "Default: 4 replicas; the GPU budget is tighter.")
    }
}
