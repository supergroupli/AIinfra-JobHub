"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const backup=require("../web/backup.js");
const course=(notes={},completed=[])=>({notes,completed,lastDay:1});

test("course backups round trip unicode notes and reject another course",()=>{
  const value=course({1:"独立实验\n<script>literal</script>"},[1,3]);
  const raw=backup.serialize("course","vllm",value);
  const restored=backup.parse(raw,"course","vllm");
  assert.equal(restored.notes[1],value.notes[1]);
  assert.deepEqual(restored.completed,[1,3]);
  assert.throws(()=>backup.parse(raw,"course","ray"));
  assert.throws(()=>backup.parse(raw,"portfolio"));
});
test("merge preserves current notes while replace affects only imported course data",()=>{
  const current=course({1:"current",3:""},[1]);
  const incoming=course({1:"incoming",3:"restored"},[2]);
  assert.equal(backup.merge(current,incoming,"course").notes[1],"current");
  assert.equal(backup.merge(current,incoming,"course").notes[3],"restored");
  assert.deepEqual(backup.merge(current,incoming,"course").completed,[1,2]);
  assert.equal(backup.merge(current,incoming,"course",true).notes[1],"incoming");
  assert.deepEqual(current.completed,[1]);
});
test("malformed backup versions, days, dates and prototype keys cannot be imported",()=>{
  const envelope=data=>JSON.stringify({format:"jobhub-backup",version:1,kind:"course",courseId:"vllm",data});
  for(const bad of [course({},[11]),course({"0":"bad"}),course({1:42}),{...course(),lastDay:0}]) assert.throws(()=>backup.parse(envelope(bad),"course","vllm"));
  assert.throws(()=>backup.parse(envelope(course()).replace('"version":1','"version":2'),"course","vllm"));
  assert.throws(()=>backup.normalize({recordDate:"2026-02-30"},"portfolio"));
  assert.throws(()=>backup.normalize(JSON.parse('{"__proto__":{"polluted":true}}'),"portfolio"));
  assert.equal({}.polluted,undefined);
});
test("portfolio restore keeps user prose and preserves existing fields when merging",()=>{
  const incoming=backup.parse(backup.serialize("portfolio",null,{projectTitle:"测试",contribution:"mine",evidenceType:"simulated",recordDate:"2024-02-29"}),"portfolio");
  const merged=backup.merge({projectTitle:"Existing"},incoming,"portfolio");
  assert.equal(merged.projectTitle,"Existing"); assert.equal(merged.contribution,"mine");
  assert.equal(incoming.projectTitle,"测试");
  assert.throws(()=>backup.parse("x".repeat(1024*1024+1),"portfolio"));
});

test("20-day backups use the caller's course length and cannot extend a 10-day course",()=>{
  const value={...course({11:"隔离边界",20:"Final review"},[1,11,20]),lastDay:20};
  const raw=backup.serialize("course","rsi-infra",value,20);
  assert.equal(JSON.parse(raw).version,1);
  const restored=backup.parse(raw,"course","rsi-infra",20);
  assert.equal(restored.notes[20],"Final review");assert.equal(restored.lastDay,20);assert.equal(Object.keys(restored.notes).length,20);
  assert.throws(()=>backup.parse(raw,"course","vllm",20));
  assert.throws(()=>backup.parse(raw,"course","rsi-infra",10));
  const forged=JSON.parse(raw);forged.courseId="vllm";forged.dayCount=20;forged.durationDays=20;
  assert.throws(()=>backup.parse(JSON.stringify(forged),"course","vllm"));
  const merged=backup.merge({...course({20:"Mine"},[10]),lastDay:19},restored,"course",false,20);
  assert.deepEqual(merged.completed,[1,10,11,20]);assert.equal(merged.notes[20],"Mine");assert.equal(merged.lastDay,19);
  assert.equal(backup.merge(merged,restored,"course",true,20).lastDay,20);
  for(const count of [0,11,21,20.5,"20",true])assert.throws(()=>backup.parse(raw,"course","rsi-infra",count));
  for(const bad of [{...value,lastDay:21},course({21:"out of range"}),course({"01":"not canonical"}),course({},[21])])assert.throws(()=>backup.normalize(bad,"course",20));
});

test("legacy version-one course backups still restore with an implicit ten-day context",()=>{
  const raw=JSON.stringify({format:"jobhub-backup",version:1,kind:"course",courseId:"vllm",data:{completed:[10],notes:{10:"Original notes"},lastDay:10}});
  const result=backup.parse(raw,"course","vllm");
  assert.deepEqual(result.completed,[10]);assert.equal(result.notes[10],"Original notes");assert.equal(Object.keys(result.notes).length,10);
});
