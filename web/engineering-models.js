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
  function describe(kind, v, lang) {
    const pick = (zh, en) => lang === "en" ? en : zh;
    const fmt = n => Number(n.toFixed(2)).toLocaleString(lang === "en" ? "en-US" : "zh-CN");
    let d;
    switch (kind) {
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
      default: throw new RangeError("Unknown teaching model");
    }
  }
  return { roofline, overlapBound, transferCost, cacheTiers, pdBalance, tileWaste, trainingMemory, collectiveCost, taskQueue, placementBudget, describe };
})();
if (typeof module !== "undefined" && module.exports) module.exports = EngineeringModels;
