"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const models = require("../web/engineering-models.js");
const { classify } = require("../web/curriculum.js");
const paths = require("../content/paths.json");

test("roofline changes bottlenecks and ideal overlap is bounded by two", () => {
  assert.equal(models.roofline(20, 1000, 100).bound, 20);
  assert.equal(models.roofline(200, 1000, 100).bottleneck, "compute");
  assert.equal(models.roofline(100, 1000, 100).bottleneck, "balanced");
  assert.deepEqual(models.overlapBound(40, 25), {sequential:65, ideal:40, speedup:1.625});
  assert.equal(models.overlapBound(25, 25).speedup, 2);
  assert.throws(() => models.roofline(20, 0, 100), RangeError);
});

test("curriculum distinguishes common core, role core and optional study", () => {
  assert.equal(classify("foundations", paths, "platform-engineer").common, true);
  assert.equal(classify("sglang", paths, "inference-engineer").kind, "required");
  assert.equal(classify("sglang", paths, "platform-engineer").kind, "elective");
  assert.equal(classify("triton", paths, "performance-engineer").kind, "required");
  assert.equal(classify("lmcache", paths).kind, "elective");
  assert.equal(classify("pytorch-distributed", paths, "inference-engineer").applicable, false);
});

test("transport uses decimal units and cache probabilities are conditional", () => {
  assert.equal(models.transferCost(1000, 10, 1).transferMs, 101);
  assert.equal(models.transferCost(1000, 1, 1).transferMs, 1001);
  assert.equal(models.cacheTiers(50, 50, 20).expectedMs, 36);
  assert.equal(models.cacheTiers(100, 0, 200).expectedMs, 1);
  assert.equal(models.cacheTiers(0, 0, 20).expectedMs, 121);
  assert.throws(() => models.transferCost(1000, 0, 1), RangeError);
  assert.throws(() => models.cacheTiers(101, 50, 20), RangeError);
});

test("pipeline and task queue models expose their bottleneck", () => {
  assert.equal(models.pdBalance(2, 4, 120).bottleneck, "decode");
  assert.equal(models.pdBalance(1, 4, 120).bottleneck, "prefill");
  assert.equal(models.pdBalance(2, 2, 40).capacity, 50);
  assert.equal(models.taskQueue(8, 2, 200).backlog, 0);
  assert.equal(models.taskQueue(12, 2, 200).backlog, 120);
  assert.throws(() => models.taskQueue(1, 1, 0), RangeError);
});

test("tile masks and placement use integer ceilings and floors", () => {
  assert.equal(models.tileWaste(1000, 128).padded, 24);
  assert.equal(models.tileWaste(1024, 128).padded, 0);
  assert.equal(models.tileWaste(1, 128).padded, 127);
  assert.throws(() => models.tileWaste(1000, 96), RangeError);
  assert.equal(models.placementBudget(6, 4, 1).replicas, 4);
  assert.equal(models.placementBudget(20, 4, 1).replicas, 1);
  assert.equal(models.placementBudget(6, 1, 2).replicas, 0);
});

test("memory and ring calculations preserve their stated byte budgets", () => {
  assert.deepEqual(models.trainingMemory(7, 4), {replicatedGB:112, shardedGB:28});
  assert.equal(models.trainingMemory(7, 1).shardedGB, 112);
  assert.equal(models.collectiveCost(1, 256, 25).ringMs, 0);
  assert.ok(Math.abs(models.collectiveCost(4, 256, 25).ringMs - 15.42) < 1e-10);
  assert.equal(models.collectiveCost(4, 256, 25).volumeFactor, 1.5);
  assert.throws(() => models.collectiveCost(4, 256, NaN), RangeError);
});
