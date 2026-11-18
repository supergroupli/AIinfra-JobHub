"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("../web/engineering-models.js");
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9);

test("RL models distinguish pipeline interval, version budget and persistent memory", () => {
  assert.deepEqual(m.rlPipeline(4,12),{serial:30,interval:14});
  assert.equal(m.rlPipeline(16,12).interval,14); // More rollout workers do not speed up training.
  assert.deepEqual(m.rlStaleness(0,10,0),{lag:0,budget:0,admissible:true});
  assert.equal(m.rlStaleness(21,10,2).admissible,false);
  assert.equal(m.rlStaleness(20,10,2).admissible,true);
  assert.deepEqual(m.rlMemory(1,2,1),{training:8,rollout:2,colocated:10});
  assert.throws(()=>m.rlPipeline(0,12),RangeError);
  assert.throws(()=>m.rlStaleness(20,0,2),RangeError);
  assert.throws(()=>m.rlStaleness(20,10,1.5),RangeError);
  assert.throws(()=>m.rlMemory(1,2,0),RangeError);
});

test("serving models expose warm-cache reversals, transport bottlenecks and rollout overload", () => {
  assert.equal(m.routingCost(80,10,80).winner,"warm");
  assert.equal(m.routingCost(100,10,80).winner,"cold");
  assert.equal(m.routingCost(10,10,0).winner,"tie");
  assert.deepEqual(m.pdCapacity(2,4,200),{stages:[50,40,25],bound:25});
  assert.equal(m.pdCapacity(16,16,200).bound,25);
  assert.equal(m.pdCapacity(2,4,800).bound,40);
  assert.deepEqual(m.rolloutAvailability(4,1,25),{available:3,capacity:30,arrival:25,overloaded:false});
  assert.equal(m.rolloutAvailability(4,1,35).overloaded,true);
  assert.equal(m.rolloutAvailability(1,4,1).capacity,0);
  assert.throws(()=>m.routingCost(0,0,101),RangeError);
  assert.throws(()=>m.pdCapacity(2,4,0),RangeError);
  assert.throws(()=>m.rolloutAvailability(4,-1,25),RangeError);
});

test("MoE models conserve payload units and separate load from hardware performance", () => {
  assert.deepEqual(m.moeBalance(1024,8,50),{maximum:1024,capacity:320,imbalance:4});
  near(m.moeBalance(1024,8,12.5).imbalance,1);
  near(m.moeBalance(1024,8,0).maximum,2048/7);
  assert.match(m.describe("moe-balance",{tokens:1024,experts:8,share:75},"en").summary,/violates distinct-expert/);
  assert.match(m.describe("moe-balance",{tokens:1024,experts:2,share:25},"zh").summary,/不满足真实/);
  assert.equal(m.moeTraffic(1024,0,25).lowerMs,0);
  near(m.moeTraffic(1024,75,25).remoteMB,25.165824);
  near(m.moeTraffic(1024,75,25).lowerMs,1.00663296);
  const cold=m.moeRoofline(16,4096,900,100), batched=m.moeRoofline(128,4096,900,100);
  near(cold.memoryMs,33816576/900e6);
  near(cold.computeMs,536870912/100e9);
  assert.equal(cold.lowerMs,cold.memoryMs);
  assert.ok(batched.intensity > cold.intensity);
  assert.throws(()=>m.moeBalance(1024,1,50),RangeError);
  assert.throws(()=>m.moeTraffic(1024,101,25),RangeError);
  assert.throws(()=>m.moeRoofline(16,4096,0,100),RangeError);
});

test("every new browser model has finite bilingual output including zero boundaries", () => {
  const fixtures = {
    "rl-pipeline": {workers:4,train:12}, "rl-staleness":{age:0,interval:10,budget:0},
    "rl-memory":{parameters:1,shards:2,tp:1}, "routing-cost":{hot:0,cold:0,reuse:100},
    "pd-capacity":{prefill:2,decode:4,network:200},
    "rollout-availability":{replicas:1,unavailable:1,arrival:0},
    "moe-balance":{tokens:1024,experts:8,share:50},
    "moe-traffic":{tokens:1024,remote:0,bandwidth:25},
    "moe-roofline":{tokens:16,power:12,bandwidth:900,peak:100}
  };
  for(const [kind,values] of Object.entries(fixtures)) {
    const zh=m.describe(kind,values,"zh"), en=m.describe(kind,values,"en");
    assert.deepEqual(zh.values,en.values);
    assert.ok(zh.values.every(v=>Number.isFinite(v)&&v>=0));
    assert.notEqual(zh.summary,en.summary);
    assert.ok(!/NaN|Infinity/.test(zh.summary+en.summary));
  }
});

test("new role courses are required only in their intended learning paths", () => {
  const {classify,daysFor}=require("../web/curriculum.js");
  const paths=require("../content/paths.json");
  assert.equal(classify("post-training",paths,"training-engineer").kind,"required");
  assert.equal(classify("llm-d",paths,"platform-engineer").kind,"required");
  assert.equal(classify("moe-systems",paths,"performance-engineer").kind,"required");
  assert.equal(classify("post-training",paths,"inference-engineer").kind,"elective");
  assert.equal(classify("rsi-infra",paths).common,true);
  const courses=[...new Set(paths.flatMap(p=>p.courses))].map(id=>require(`../content/courses/${id}.json`));
  assert.equal(daysFor(paths.find(p=>p.id==="training-engineer").requiredCourses,courses),70);
});
