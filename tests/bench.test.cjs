"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {createHash} = require("node:crypto");
const M = require("../web/bench/bench-model.js");
const samples = require("../web/bench/bench-samples.js");
const report = require("../web/bench/bench-report.js");
const projects = require("../web/projects/projects.json").projects;

function ok(firstMs, endMs) {
  return {status: "ok", firstMs, endMs};
}

function makeTrace(requests = [{id: "R1", group: "chat", sentMs: 100, a: ok(80, 400), b: ok(90, 450)}]) {
  return {schema: M.SCHEMA, source: "measured", windowMs: 1000, targets: {ttftMs: 120, e2eMs: 600}, requests};
}

function reportInput(id = "batch-v1", lang = "en") {
  const sample = samples[id];
  const trace = M.normalize(sample.trace);
  return {
    trace, targets: trace.targets, analysis: M.analyze(trace, trace.targets),
    decision: "a", reason: "The long prompts missed their first-token deadline.",
    citedIds: ["R03"], lang, caseTitle: sample.title[lang],
    replayUrl: "https://supergroupli.github.io/AIinfra-JobHub/bench/?case=" + id
  };
}

test("shared v1 examples retain the timing data referenced by published reviews and link to actual lessons and projects", () => {
  // Changing a trace already linked in downloaded work samples requires a new case ID.
  const digests = {
    "batch-v1": "ac4c3e882a1ad5f27ba8a178091d1a8b97677e13d72fc823efc9f12d7a396381",
    "prefix-v1": "6201017da01270c8effc233e53a8b44ffea40db3b002c7924888ab5b6c98a11c",
    "upgrade-v1": "e15394685605a2959372894d30037892ff62ae6a6204601acc79ccddc966e3a0"
  };
  for (const [id, hash] of Object.entries(digests)) {
    const sample = samples[id];
    const trace = M.normalize(sample.trace);
    assert.equal(createHash("sha256").update(JSON.stringify(trace)).digest("hex"), hash, id);
    assert.equal(trace.source, "synthetic");
    assert.equal(trace.windowMs, 10000);
    assert.equal(trace.requests.length, 20);
    assert.deepEqual(trace.targets, {ttftMs: 120, e2eMs: 600});
    for (const lang of ["en", "zh"]) {
      assert.ok(sample.title[lang].trim());
      assert.ok(sample.question[lang].trim());
    }
    const course = require("../content/courses/" + sample.course + ".json");
    assert.ok(course.steps.some(step => step.day === sample.day), id);
    assert.ok(projects.some(project => project.id === sample.project), id);
  }
});

test("larger batches reverse the throughput ranking under the default simultaneous targets; relaxing TTFT changes it back", () => {
  const trace = M.normalize(samples["batch-v1"].trace);
  const {a, b} = M.analyze(trace, trace.targets);
  assert.deepEqual([a.completed, b.completed, a.errors, a.timeouts], [16, 20, 1, 3]);
  assert.deepEqual([a.throughput, b.throughput], [1.6, 2]);
  assert.deepEqual([a.good, b.good, a.goodput, b.goodput], [16, 10, 1.6, 1]);
  const loose = M.analyze(trace, {ttftMs: 250, e2eMs: 600});
  assert.deepEqual([loose.a.good, loose.b.good], [16, 20]);
  assert.equal(loose.a.throughput, a.throughput);
  assert.equal(loose.b.firstP95, b.firstP95);
  assert.deepEqual(trace.targets, {ttftMs: 120, e2eMs: 600});
});

test("aggregate gains for prefix routing coexist with a regression for unique prefixes", () => {
  const trace = M.normalize(samples["prefix-v1"].trace);
  const result = M.analyze(trace, trace.targets);
  assert.deepEqual([result.a.good, result.b.good], [14, 15]);
  assert.deepEqual(result.groups, [
    {name: "shared-prefix", total: 12, aGood: 6, bGood: 12},
    {name: "unique-prefix", total: 8, aGood: 8, bGood: 3}
  ]);
  const affected = M.filterRows(result.rows, "unique-prefix", "different");
  assert.equal(affected.length, 5);
  assert.ok(affected.every(row => row.aOutcome === "onTime" && row.bOutcome !== "onTime"));
});

test("rollout p95 uses successful requests while the throughput calculation accounts for timeouts and errors", () => {
  const trace = M.normalize(samples["upgrade-v1"].trace);
  const result = M.analyze(trace, trace.targets);
  assert.deepEqual([result.a.completed, result.b.completed], [20, 15]);
  assert.deepEqual([result.a.goodput, result.b.goodput], [1.5, 1.5]);
  assert.deepEqual([result.a.endP95, result.b.endP95], [897, 496]);
  assert.deepEqual([result.b.errors, result.b.timeouts], [1, 4]);
  const failed = M.filterRows(result.rows, "during-rollout", "failed");
  assert.equal(failed.length, 5);
  assert.ok(failed.some(row => row.b.firstMs !== null && row.b.status !== "ok"));
  // A and B have different outcomes on five requests, but neither met both targets.
  assert.deepEqual(M.filterRows(result.rows, "", "different"), []);
});

test("first-token and completion deadlines are inclusive, independent and evaluated on the same successful request", () => {
  const trace = makeTrace([
    {id: "boundary", group: "g", sentMs: 0, a: ok(120, 600), b: ok(121, 600)},
    {id: "late", group: "g", sentMs: 0, a: ok(120, 601), b: ok(121, 601)},
    {id: "partial", group: "h", sentMs: 0, a: {status: "error", firstMs: 1, endMs: 2}, b: {status: "timeout", firstMs: null, endMs: 1000}}
  ]);
  const result = M.analyze(M.normalize(trace), trace.targets);
  assert.deepEqual(result.rows.map(row => [row.aOutcome, row.bOutcome]), [
    ["onTime", "firstLate"], ["endLate", "bothLate"], ["error", "timeout"]
  ]);
  assert.deepEqual([result.a.good, result.b.good], [1, 0]);
  assert.equal(M.validTargets({ttftMs: 1000, e2eMs: 100}), true);
  assert.throws(() => M.analyze(trace, {ttftMs: 0, e2eMs: 100}), M.TraceError);
});

test("p95 uses the nearest rank among successes and returns null for an all-failed run", () => {
  const rows = Array.from({length: 20}, (_, i) => ({
    id: "r" + i, group: "g", sentMs: 0,
    a: ok(i + 1, 10 * (i + 1)),
    b: {status: "timeout", firstMs: i === 19 ? 25 : null, endMs: 900}
  })).reverse();
  rows.push({id: "extra", group: "g", sentMs: 0, a: {status: "error", firstMs: 999, endMs: 1000}, b: {status: "error", firstMs: null, endMs: 1000}});
  const trace = M.normalize(makeTrace(rows));
  const result = M.analyze(trace, trace.targets);
  assert.deepEqual([result.a.firstP95, result.a.endP95], [19, 190]);
  assert.deepEqual([result.b.firstP95, result.b.endP95, result.b.goodput], [null, null, 0]);
  assert.deepEqual([result.b.errors, result.b.timeouts], [1, 20]);
});

test("normalization checks time ordering, shared-window boundaries, source labels, unique IDs and finite numeric fields", () => {
  const invalid = [
    ["schema", t => { t.schema = "unknown/v2"; }],
    ["source", t => { t.source = "verified"; }],
    ["window", t => { t.windowMs = Infinity; }],
    ["window", t => { t.windowMs = 0; }],
    ["targets", t => { t.targets.ttftMs = 1.5; }],
    ["targets", t => { t.targets.e2eMs = M.MAX_TARGET_MS + 1; }],
    ["count", t => { t.requests = []; }],
    ["count", t => { t.requests = Array(M.MAX_REQUESTS + 1).fill(t.requests[0]); }],
    ["duplicate", t => { t.requests.push({...t.requests[0], id: " R1 "}); }],
    ["name", t => { t.requests[0].group = "one\ntwo"; }],
    ["name", t => { t.requests[0].id = "x".repeat(81); }],
    ["sent", t => { t.requests[0].sentMs = -1; }],
    ["status", t => { t.requests[0].a.status = "ok-ish"; }],
    ["end", t => { t.requests[0].a.endMs = 901; }],
    ["end", t => { t.requests[0].a.endMs = "400"; }],
    ["end", t => { t.requests[0].a.endMs = NaN; }],
    ["first", t => { t.requests[0].a.firstMs = 401; }],
    ["first", t => { t.requests[0].a.firstMs = null; }],
    ["first", t => { t.requests[0].b = {status: "timeout", endMs: 500}; }]
  ];
  for (const [expected, mutate] of invalid) {
    const trace = makeTrace();
    mutate(trace);
    assert.throws(() => M.normalize(trace), err => err instanceof M.TraceError && err.code === expected && Boolean(err.field), expected);
  }
  const trace = makeTrace();
  trace.requests[0].a = ok(0, 900);
  assert.equal(M.normalize(trace).requests[0].a.endMs, 900);
});

test("canonical timing JSON strips extra payloads and preserves fractional measurements and edited thresholds on reimport", () => {
  const input = makeTrace();
  input.prompt = "a top-level prompt";
  input.requests[0].id = " R1 ";
  input.requests[0].requestBody = "a request body";
  input.requests[0].a = {...ok(99.75, 456.5), response: "model output"};
  input.targets.other = 12;
  const trace = M.normalize(input);
  const targets = {ttftMs: 91, e2eMs: 451};
  const raw = JSON.stringify({...trace, targets});
  const restored = M.normalize(JSON.parse(raw));
  assert.doesNotMatch(raw, /prompt|requestBody|model output|other/);
  assert.equal(restored.requests[0].id, "R1");
  assert.equal(restored.requests[0].a.firstMs, 99.75);
  assert.deepEqual(M.analyze(restored, restored.targets), M.analyze(trace, targets));
});

test("bilingual portfolios record the selected IDs once, their timings, provenance, denominator and computation method", () => {
  for (const lang of ["zh", "en"]) {
    const input = reportInput("batch-v1", lang);
    input.citedIds = new Set(["R03", "R04", "missing"]);
    const md = report.markdown(input);
    for (const word of ["R03", "R04", "TTFT", "10000 ms", "120 ms", "600 ms", "158 ms", "980 ms", "16 / 20", "10 / 20", "0.95", input.reason]) {
      assert.ok(md.includes(word), word);
    }
    assert.match(md, lang === "en" ? /Synthetic timings/ : /合成计时数据/);
    assert.match(md, lang === "en" ? /Keep A/ : /保留 A/);
    assert.match(md, lang === "en" ? /no first chunk/ : /未收到首块/);
    assert.doesNotMatch(md, /R05|missing/);
    assert.equal((md.match(/R03/g) || []).length, 1);
  }
});

test("reports include only canonical public replay parameters and offer timing JSON for local or modified traces", () => {
  const input = reportInput();
  input.targets = {ttftMs: 250, e2eMs: 1200};
  input.analysis = M.analyze(input.trace, input.targets);
  input.replayUrl = "http://localhost:4173/bench/?case=batch-v1&ttft=5&e2e=6&note=secret#local";
  const publicMd = report.markdown(input);
  assert.ok(publicMd.includes("https://supergroupli.github.io/AIinfra-JobHub/bench/?case=batch-v1&ttft=250&e2e=1200&lang=en"));
  assert.doesNotMatch(publicMd, /localhost|note=|#local|ttft=5/);
  for (const url of ["", "javascript:alert(1)", "https://example.org/?case=constructor", "https://user:password@example.test/?case=batch-v1"]) {
    const md = report.markdown({...input, replayUrl: url});
    assert.match(md, /Include the exported timing JSON/);
    assert.doesNotMatch(md, /\?case=/);
  }
  input.trace.requests[0].a.firstMs += 1;
  input.analysis = M.analyze(input.trace, input.targets);
  assert.doesNotMatch(report.markdown(input), /\?case=/);
  input.trace.source = "measured";
  assert.match(report.markdown(input), /Marked as measured by the data provider/);
});

test("imported Markdown labels and multiline learner notes stay literal; incomplete reviews cannot be exported", () => {
  const input = reportInput();
  const id = "``` [student](https://invalid.test) | <img>";
  input.trace.requests[0].id = id;
  input.trace.requests[0].group = "[group]()";
  input.analysis = M.analyze(input.trace, input.targets);
  input.citedIds = [id];
  input.reason = "Observe the run.\r\n# injected heading\n\n<img onerror=boom>\u2028```";
  input.caseTitle = "local\n## inserted";
  const md = report.markdown(input);
  assert.ok(md.includes("```` " + id + " ````"));
  assert.ok(md.includes("` [group]() `"));
  assert.ok(md.includes("` local ## inserted `"));
  assert.ok(md.includes("\n    # injected heading\n    \n    <img onerror=boom>\n    ```"));
  assert.doesNotMatch(md, /^(# injected|## inserted|<img|\?case=)/m);
  for (const edit of [{reason: "   "}, {reason: null}, {decision: "constructor"}, {decision: ""}, {citedIds: ["missing"]}]) {
    assert.throws(() => report.markdown({...input, ...edit}), /decision, a reason and a cited request/);
  }
});

test("a full-size timing export still fits the local importer after JSON escapes and indentation", () => {
  const label = String.fromCharCode(0xd800).repeat(80);
  const requests = Array.from({length: M.MAX_REQUESTS}, (_, i) => ({
    id: String(i).padStart(4, "0") + label.slice(4),
    group: label,
    sentMs: 0.0000001234567890123456,
    a: ok(1.2345678901234567, 9.876543210987654),
    b: {status: "timeout", firstMs: null, endMs: 987.6543210987654}
  }));
  const trace = M.normalize(makeTrace(requests));
  const json = JSON.stringify(trace, null, 2) + "\n";
  assert.ok(Buffer.byteLength(json) <= M.MAX_BYTES);
  assert.deepEqual(M.normalize(JSON.parse(json)), trace);
});
