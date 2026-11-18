"use strict";

const EngineeringModels = (() => {
  const finite = (value, minimum = 0) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number < minimum) throw new RangeError("Invalid model input");
    return number;
  };
  const positive = value => finite(value, Number.EPSILON);
  const integer = value => {
    value = positive(value);
    if (!Number.isSafeInteger(value)) throw new RangeError("Expected a positive integer");
    return value;
  };
  const fraction = value => {
    value = finite(value);
    if (value > 100) throw new RangeError("Percentage exceeds 100");
    return value / 100;
  };
  function transferCost(sizeMB, bandwidthGBps, overheadMs) {
    return { transferMs: finite(sizeMB) / positive(bandwidthGBps) + finite(overheadMs), recomputeMs: 200 };
  }
  function roofline(intensity, bandwidthGBps, peakTFLOPs) {
    const memoryBound = positive(intensity) * positive(bandwidthGBps) / 1000;
    const peak = positive(peakTFLOPs);
    return { memoryBound, peak, bound: Math.min(memoryBound, peak), bottleneck: memoryBound < peak ? "bandwidth" : memoryBound > peak ? "compute" : "balanced" };
  }
  function overlapBound(computeMs, communicationMs) {
    computeMs = positive(computeMs); communicationMs = positive(communicationMs);
    const sequential = computeMs + communicationMs, ideal = Math.max(computeMs, communicationMs);
    return { sequential, ideal, speedup: sequential / ideal };
  }
  function cacheTiers(localPercent, remotePercent, remoteMs) {
    const local = fraction(localPercent), remote = fraction(remotePercent);
    return { expectedMs: 1 + (1 - local) * (finite(remoteMs) + (1 - remote) * 100), directMs: 100 };
  }
  function pdBalance(prefillWorkers, decodeWorkers, decodeMs) {
    const prefill = integer(prefillWorkers) * 1000 / 40;
    const decode = integer(decodeWorkers) * 1000 / positive(decodeMs);
    return { prefill, decode, capacity: Math.min(prefill, decode), bottleneck: prefill < decode ? "prefill" : prefill > decode ? "decode" : "balanced" };
  }
  function tileWaste(elements, block) {
    elements = integer(elements); block = integer(block);
    if (!Number.isInteger(Math.log2(block))) throw new RangeError("Use a power-of-two teaching tile");
    const tiles = Math.ceil(elements / block), allocated = tiles * block;
    if (!Number.isSafeInteger(allocated)) throw new RangeError("Tile count too large");
    return { elements, tiles, allocated, padded: allocated - elements, utilization: elements / allocated };
  }
  function trainingMemory(parametersBillion, ranks) {
    const replicatedGB = positive(parametersBillion) * 16;
    return { replicatedGB, shardedGB: replicatedGB / integer(ranks) };
  }
  function collectiveCost(ranks, sizeMB, bandwidthGBps) {
    ranks = integer(ranks);
    const referenceMs = finite(sizeMB) / positive(bandwidthGBps);
    const volumeFactor = 2 * (ranks - 1) / ranks;
    return { ringMs: 2 * (ranks - 1) * .01 + volumeFactor * referenceMs, referenceMs, volumeFactor };
  }
  function taskQueue(arrival, workers, serviceMs) {
    arrival = finite(arrival);
    const capacity = integer(workers) * 1000 / positive(serviceMs);
    return { arrival, capacity, backlog: Math.max(0, arrival - capacity) * 60 };
  }
  function placementBudget(memoryGiB, gpus, request) {
    const memorySlots = Math.floor(32 / positive(memoryGiB));
    const gpuSlots = Math.floor(integer(gpus) / integer(request));
    return { memorySlots, gpuSlots, replicas: Math.min(memorySlots, gpuSlots) };
  }
  function rsiBudget(budget, cost, failurePercent) {
    const attempts = Math.floor(finite(budget) / positive(cost));
    return {attempts, expectedValid: attempts * (1 - fraction(failurePercent))};
  }
  function rsiGain(sharePercent, localSpeedup) {
    const share = fraction(sharePercent), local = finite(localSpeedup, 1);
    return {whole: 1 / (1 - share + share / local), local};
  }
  function rsiRetests(trials, alphaPercent) {
    trials = integer(trials);
    const alpha = fraction(alphaPercent);
    return {singlePercent: alpha * 100, familyPercent: -Math.expm1(trials * Math.log1p(-alpha)) * 100};
  }
  function rlPipeline(workers, train) {
    const rollout = 128 / (4 * integer(workers));
    train = positive(train);
    return {serial: rollout + 8 + train + 2, interval: Math.max(rollout, 8, train) + 2};
  }
  function rlStaleness(age, interval, budget) {
    budget = finite(budget);
    if (!Number.isSafeInteger(budget)) throw new RangeError("Expected an integer budget");
    const lag = Math.ceil(finite(age) / positive(interval));
    return {lag, budget, admissible: lag <= budget};
  }
  function rlMemory(parameters, shards, tp) {
    parameters = positive(parameters);
    const training = 16 * parameters / integer(shards), rollout = 2 * parameters / integer(tp);
    return {training, rollout, colocated: training + rollout};
  }
  function routingCost(hot, cold, reuse) {
    const warmMs = finite(hot) + 100 * (1 - fraction(reuse)), coldMs = finite(cold) + 100;
    return {warmMs, coldMs, winner: warmMs < coldMs ? "warm" : warmMs > coldMs ? "cold" : "tie"};
  }
  function pdCapacity(prefill, decode, network) {
    const stages = [integer(prefill) * 25, integer(decode) * 10, positive(network) / 8];
    return {stages, bound: Math.min(...stages)};
  }
  function rolloutAvailability(replicas, unavailable, arrival) {
    unavailable = finite(unavailable);
    if (!Number.isSafeInteger(unavailable)) throw new RangeError("Expected an integer replica budget");
    const available = Math.max(0, integer(replicas) - unavailable);
    arrival = finite(arrival);
    return {available, capacity: available * 10, arrival, overloaded: arrival > available * 10};
  }
  function moeBalance(tokens, experts, share) {
    const assignments = 2 * integer(tokens), n = integer(experts), s = fraction(share);
    if (n < 2) throw new RangeError("At least two experts for top-k=2");
    const maximum = Math.max(assignments * s, assignments * (1 - s) / (n - 1));
    return {maximum, capacity: Math.ceil(1.25 * assignments / n), imbalance: maximum / (assignments / n)};
  }
  function moeTraffic(tokens, remote, bandwidth) {
    const fullMB = 2 * integer(tokens) * 4096 * 2 * 2 / 1e6, remoteMB = fullMB * fraction(remote);
    return {fullMB, remoteMB, lowerMs: remoteMB / positive(bandwidth)};
  }
  function moeRoofline(tokens, hidden, bandwidth, peak) {
    const m = integer(tokens), h = integer(hidden);
    const flops = 2 * m * h * h, bytes = 2 * (2 * m * h + h * h);
    const memoryMs = bytes / (positive(bandwidth) * 1e6), computeMs = flops / (positive(peak) * 1e9);
    return {memoryMs, computeMs, lowerMs: Math.max(memoryMs, computeMs), intensity: flops / bytes};
  }
  function describe(kind, v, lang) {
    const pick = (zh, en) => lang === "en" ? en : zh;
    const fmt = n => Number(n.toFixed(2)).toLocaleString(lang === "en" ? "en-US" : "zh-CN");
    let d;
    switch (kind) {
      case "rl-pipeline":
        d = rlPipeline(v.workers, v.train);
        return {values:[d.serial,d.interval],unit:"s",summary:pick(`串行 ${fmt(d.serial)} s，理想稳态批间隔 ${fmt(d.interval)} s。第一批仍需穿过全部阶段；未验证异步训练质量。`,`Serial ${fmt(d.serial)} s, ideal steady-state interval ${fmt(d.interval)} s. The first batch still traverses all stages; async training quality is not established.`)};
      case "rl-staleness":
        d = rlStaleness(v.age, v.interval, v.budget);
        return {values:[d.lag,d.budget],unit:"versions",summary:pick(`估算落后 ${d.lag} 个版本，预算 ${d.budget}：${d.admissible ? "预算内" : "超出预算"}。实际准入需读取轨迹版本标签。`,`Estimated lag ${d.lag}, budget ${d.budget}: ${d.admissible ? "within budget" : "over budget"}. Actual admission needs trajectory-version tags.`)};
      case "rl-memory":
        d = rlMemory(v.parameters, v.shards, v.tp);
        return {values:[d.training,d.rollout],unit:"GB",summary:pick(`训练 ${fmt(d.training)} GB，采样权重 ${fmt(d.rollout)} GB，共置相加 ${fmt(d.colocated)} GB。还需激活、KV 与临时缓冲。`,`Training ${fmt(d.training)} GB, rollout weights ${fmt(d.rollout)} GB, colocated sum ${fmt(d.colocated)} GB. Activations, KV and temporary buffers are additional.`)};
      case "routing-cost":
        d = routingCost(v.hot, v.cold, v.reuse);
        return {values:[d.warmMs,d.coldMs],unit:"ms",summary:pick(`热节点 ${fmt(d.warmMs)} ms，冷节点 ${fmt(d.coldMs)} ms；${d.winner === "tie" ? "估算相等" : d.winner === "warm" ? "热节点更快" : "冷节点更快"}。仅为排队与 Prefill 成本模型。`,`Warm ${fmt(d.warmMs)} ms, cold ${fmt(d.coldMs)} ms; ${d.winner === "tie" ? "equal estimates" : d.winner + " endpoint is faster"}. Queue-plus-prefill model only.`)};
      case "pd-capacity":
        d = pdCapacity(v.prefill, v.decode, v.network);
        return {values:d.stages,unit:"req/s",summary:pick(`三个阶段容量取最小，上界 ${fmt(d.bound)} req/s。增加非瓶颈阶段的副本不会提高这个上界。`,`The minimum of three stage capacities bounds throughput at ${fmt(d.bound)} req/s. Scaling a non-bottleneck stage does not raise this bound.`)};
      case "rollout-availability":
        d = rolloutAvailability(v.replicas, v.unavailable, v.arrival);
        return {values:[d.capacity,d.arrival],unit:"req/s",summary:pick(`估算至少 ${d.available} 个可用副本，${d.overloaded ? "到达量超过容量下限" : "到达量未超过容量下限"}。还需验证 readiness、排空与故障。`,`Estimated floor ${d.available} available replicas; arrivals ${d.overloaded ? "exceed" : "do not exceed"} the capacity floor. Validate readiness, draining and failures separately.`)};
      case "moe-balance":
        d = moeBalance(v.tokens, v.experts, v.share);
        return {values:[d.maximum,d.capacity],unit:"assignments",summary:pick(`最大负载约 ${fmt(d.maximum)}，容量 ${d.capacity}，最大/平均为 ${fmt(d.imbalance)}。${v.share > 50 || (v.experts === 2 && v.share !== 50) ? "此分布不满足真实 top-k=2 的不同专家约束，仅为流量算例。" : "这是分配流量模型，不是实际丢弃统计。"}`,`Maximum load about ${fmt(d.maximum)}, capacity ${d.capacity}, maximum/mean ${fmt(d.imbalance)}. ${v.share > 50 || (v.experts === 2 && v.share !== 50) ? "This distribution violates distinct-expert top-k=2 constraints; it is a flow example only." : "This is an assignment-flow model, not measured dropping."}`)};
      case "moe-traffic":
        d = moeTraffic(v.tokens, v.remote, v.bandwidth);
        return {values:[d.fullMB,d.remoteMB],unit:"MB",summary:pick(`远端 payload ${fmt(d.remoteMB)} MB，纯传输下界 ${fmt(d.lowerMs)} ms。未计协议、拓扑和计算。`,`Remote payload ${fmt(d.remoteMB)} MB, payload-only transfer floor ${fmt(d.lowerMs)} ms. Protocol, topology and computation are omitted.`)};
      case "moe-roofline":
        d = moeRoofline(v.tokens, 2 ** v.power, v.bandwidth, v.peak);
        return {values:[d.memoryMs,d.computeMs],unit:"ms",summary:pick(`算术强度 ${fmt(d.intensity)} FLOP/byte，理想耗时下界 ${d.lowerMs.toPrecision(4)} ms。增大 M 可摊薄权重读取，但不是实测加速保证。`,`Arithmetic intensity ${fmt(d.intensity)} FLOP/byte, ideal time floor ${d.lowerMs.toPrecision(4)} ms. Larger M amortizes weight reads; this does not guarantee measured speedup.`)};
      case "roofline":
        d = roofline(v.intensity, v.bandwidth, v.peak);
        return { values: [d.memoryBound, d.peak], unit: "TFLOP/s", summary: pick(`理论上界 ${fmt(d.bound)} TFLOP/s；限制因素：${d.bottleneck === "bandwidth" ? "内存带宽" : d.bottleneck === "compute" ? "峰值算力" : "两者相等"}。请与真实内核测量分别记录。`, `Theoretical bound ${fmt(d.bound)} TFLOP/s; limiting factor: ${d.bottleneck}. Record this separately from actual kernel measurements.`) };
      case "overlap-bound":
        d = overlapBound(v.compute, v.communication);
        return { values: [d.sequential, d.ideal], unit: "ms", summary: pick(`串行 ${fmt(d.sequential)} ms，理想重叠 ${fmt(d.ideal)} ms；加速上限 ${fmt(d.speedup)} 倍。`, `Sequential ${fmt(d.sequential)} ms, ideal overlap ${fmt(d.ideal)} ms; speedup bound ${fmt(d.speedup)}×.`) };
      case "transfer-cost":
        d = transferCost(v.size, v.bandwidth, v.overhead);
        return { values: [d.transferMs, d.recomputeMs], unit: "ms", summary: pick(`传输 ${fmt(d.transferMs)} ms；相对假设重算节省 ${fmt(200 - d.transferMs)} ms（负值表示更慢）。`, `Transfer ${fmt(d.transferMs)} ms; saving versus assumed recomputation ${fmt(200 - d.transferMs)} ms (negative means slower).`) };
      case "cache-tiers":
        d = cacheTiers(v.local, v.remote, v.latency);
        return { values: [d.expectedMs, d.directMs], unit: "ms", summary: pick(`条件概率加权平均 ${fmt(d.expectedMs)} ms；这不是 p95 延迟。`, `Conditional-probability weighted mean ${fmt(d.expectedMs)} ms; this is not p95 latency.`) };
      case "pd-balance":
        d = pdBalance(v.prefill, v.decode, v.cost);
        return { values: [d.prefill, d.decode], unit: "req/s", summary: pick(`容量上界 ${fmt(d.capacity)} req/s；瓶颈：${d.bottleneck === "balanced" ? "两阶段平衡" : d.bottleneck}。`, `Capacity bound ${fmt(d.capacity)} req/s; bottleneck: ${d.bottleneck}.`) };
      case "tile-waste":
        d = tileWaste(v.elements, 2 ** v.power);
        return { values: [d.elements, d.padded], unit: "slots", scale: d.allocated, summary: pick(`块大小 ${2 ** v.power}，${d.tiles} 块，屏蔽 ${d.padded} 个槽位；有效比例 ${fmt(d.utilization * 100)}%。`, `Tile size ${2 ** v.power}; ${d.tiles} tiles, ${d.padded} masked slots, ${fmt(d.utilization * 100)}% valid.`) };
      case "training-memory":
        d = trainingMemory(v.parameters, v.ranks);
        return { values: [d.replicatedGB, d.shardedGB], unit: "GB", summary: pick(`每 rank：复制 ${fmt(d.replicatedGB)} GB，理想全分片 ${fmt(d.shardedGB)} GB。实际峰值还需额外内存。`, `Per rank: ${fmt(d.replicatedGB)} GB replicated, ${fmt(d.shardedGB)} GB ideally sharded. Peak usage needs additional memory.`) };
      case "collective-cost":
        d = collectiveCost(v.ranks, v.size, v.bandwidth);
        return { values: [d.ringMs, d.referenceMs], unit: "ms", summary: pick(`Ring ${fmt(d.ringMs)} ms；每 rank 发送量约为输入的 ${fmt(d.volumeFactor)} 倍，未计实际拓扑。`, `Ring ${fmt(d.ringMs)} ms; each rank sends about ${fmt(d.volumeFactor)} times the input size, without actual topology costs.`) };
      case "task-queue":
        d = taskQueue(v.arrival, v.workers, v.service);
        return { values: [d.arrival, d.capacity], unit: "tasks/s", summary: pick(`60 秒流体近似积压 ${fmt(d.backlog)} 个任务。实际队列还受波动和失败影响。`, `Approximate fluid backlog after 60 seconds: ${fmt(d.backlog)} tasks. Real queues also depend on variability and failures.`) };
      case "placement-budget":
        d = placementBudget(v.memory, v.gpus, v.request);
        return { values: [d.memorySlots, d.gpuSlots], unit: "replicas", summary: pick(`这个简化节点最多容纳 ${d.replicas} 个副本；还需检查其他调度约束。`, `This simplified node fits at most ${d.replicas} replicas; other scheduling constraints still need checking.`) };
      case "rsi-budget":
        d = rsiBudget(v.budget, v.cost, v.failure);
        return {values:[d.attempts,d.expectedValid],unit:pick("次","trials"),summary:pick(`预算支持 ${d.attempts} 次尝试，有效结果期望 ${fmt(d.expectedValid)} 次；失败也按同样成本计费，期望值不是完成保证。`,`Budget supports ${d.attempts} attempts, with ${fmt(d.expectedValid)} valid outcomes in expectation. Failures cost the same; expectation is not a guarantee.`)};
      case "rsi-gain":
        d = rsiGain(v.share, v.local);
        return {values:[d.whole,d.local],unit:"×",summary:pick(`局部 ${fmt(d.local)} 倍加速，仅得到整体 ${fmt(d.whole)} 倍理论加速。假定其余成本不变，没有新增通信或内存开销。`,`A ${fmt(d.local)}× local speedup gives ${fmt(d.whole)}× theoretical overall speedup, assuming unchanged remaining work and no added communication or memory costs.`)};
      case "rsi-retests":
        d = rsiRetests(v.trials, v.alpha);
        return {values:[d.singlePercent,d.familyPercent],unit:"%",scale:100,summary:pick(`独立检验假设下，至少一次误报的概率约 ${fmt(d.familyPercent)}%；选择最好结果后仍需独立留出验证。相关试验不能直接套用此值。`,`Under independent tests, probability of at least one false positive is about ${fmt(d.familyPercent)}%. Validate selected winners on a separate holdout; correlated trials do not follow this value.`)};
      default: throw new RangeError("Unknown teaching model");
    }
  }
  return { roofline, overlapBound, transferCost, cacheTiers, pdBalance, tileWaste, trainingMemory, collectiveCost, taskQueue, placementBudget, rsiBudget, rsiGain, rsiRetests, rlPipeline, rlStaleness, rlMemory, routingCost, pdCapacity, rolloutAvailability, moeBalance, moeTraffic, moeRoofline, describe };
})();
if (typeof module !== "undefined" && module.exports) module.exports = EngineeringModels;
