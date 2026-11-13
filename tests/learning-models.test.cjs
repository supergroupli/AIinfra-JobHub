"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { timeline, kvCache, prefixCache } = require("../web/learning-widgets.js");

test("timeline keeps queueing in first-token latency and decode in total latency", () => {
  const model = timeline(40, 80, 240);
  assert.equal(model.ttft, 120);
  assert.equal(model.total, 360);
  assert.equal(timeline(0, 80, 240).ttft, 80);
  assert.throws(() => timeline(-1, 80, 240), RangeError);
});

test("KV estimate uses both K and V, KV heads, and binary GiB", () => {
  assert.deepEqual(kvCache(2048, 4, 8), { bytes: 1073741824, gib: 1 });
  assert.equal(kvCache(2048, 4, 2).gib, .25);
  assert.equal(kvCache(4096, 4, 8).gib, 2);
  assert.equal(kvCache(2048, 8, 8).gib, 2);
  assert.throws(() => kvCache(2048.5, 4, 8), RangeError);
  assert.throws(() => kvCache(Infinity, 4, 8), RangeError);
  assert.throws(() => kvCache(Number.MAX_SAFE_INTEGER, 4, 8), RangeError);
});

test("prefix model preserves decode cost and exposes a no-benefit workload", () => {
  assert.deepEqual(prefixCache(60), { off: 300, cold: 310, warm: 250, warmPrefill: 50 });
  assert.equal(prefixCache(0).warm, 310);
  assert.equal(prefixCache(90).warm - prefixCache(90).warmPrefill, 200);
  assert.throws(() => prefixCache(101), RangeError);
});
