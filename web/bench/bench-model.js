"use strict";

const BenchModel = (() => {
  const SCHEMA = "jobhub-bench/v1";
  // A full canonical export of 2,000 pairs fits, even with escaped 80-unit labels.
  const MAX_BYTES = 4 * 1024 * 1024;
  const MAX_REQUESTS = 2000;
  const MAX_TARGET_MS = 3600000;

  class TraceError extends Error {
    constructor(code, field) {
      super(code + " (" + field + ")");
      this.code = code;
      this.field = field;
    }
  }

  function validTargets(value) {
    return Boolean(value && [value.ttftMs, value.e2eMs].every(
      ms => Number.isSafeInteger(ms) && ms >= 1 && ms <= MAX_TARGET_MS
    ));
  }

  function validTime(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
  }

  function name(value, field) {
    if (typeof value !== "string" || !value.trim() || value.length > 80 || /[\u0000-\u001f\u007f]/u.test(value)) {
      throw new TraceError("name", field);
    }
    return value.trim();
  }

  function readRun(run, field, availableMs) {
    if (!run || !["ok", "error", "timeout"].includes(run.status)) {
      throw new TraceError("status", field + ".status");
    }
    if (!validTime(run.endMs) || run.endMs > availableMs) {
      throw new TraceError("end", field + ".endMs");
    }
    const firstMs = run.firstMs;
    const haveFirst = validTime(firstMs) && firstMs <= run.endMs;
    if (!haveFirst && !(run.status !== "ok" && firstMs === null)) {
      throw new TraceError("first", field + ".firstMs");
    }
    return {status: run.status, firstMs, endMs: run.endMs};
  }

  // Select only timing fields. Extra properties (for example prompt text) never enter exports.
  function normalize(input) {
    if (!input || input.schema !== SCHEMA) throw new TraceError("schema", "schema");
    if (!["synthetic", "measured"].includes(input.source)) throw new TraceError("source", "source");
    if (!validTime(input.windowMs) || input.windowMs < 1) throw new TraceError("window", "windowMs");
    if (!validTargets(input.targets)) throw new TraceError("targets", "targets");
    if (!Array.isArray(input.requests) || !input.requests.length || input.requests.length > MAX_REQUESTS) {
      throw new TraceError("count", "requests");
    }
    const ids = new Set();
    const requests = input.requests.map((row, index) => {
      const field = "requests[" + index + "]";
      if (!row || typeof row !== "object") throw new TraceError("record", field);
      const id = name(row.id, field + ".id");
      if (ids.has(id)) throw new TraceError("duplicate", field + ".id");
      ids.add(id);
      const group = name(row.group, field + ".group");
      if (!validTime(row.sentMs) || row.sentMs > input.windowMs) throw new TraceError("sent", field + ".sentMs");
      const remaining = input.windowMs - row.sentMs;
      return {id, group, sentMs: row.sentMs, a: readRun(row.a, field + ".a", remaining), b: readRun(row.b, field + ".b", remaining)};
    });
    return {
      schema: SCHEMA, source: input.source, windowMs: input.windowMs,
      targets: {ttftMs: input.targets.ttftMs, e2eMs: input.targets.e2eMs}, requests
    };
  }

  function outcome(run, targets) {
    if (run.status !== "ok") return run.status;
    const lateFirst = run.firstMs > targets.ttftMs;
    const lateEnd = run.endMs > targets.e2eMs;
    if (lateFirst && lateEnd) return "bothLate";
    if (lateFirst) return "firstLate";
    if (lateEnd) return "endLate";
    return "onTime";
  }

  function p95(numbers) {
    if (!numbers.length) return null;
    const sorted = numbers.slice().sort((a, b) => a - b);
    return sorted[Math.ceil(0.95 * sorted.length) - 1];
  }

  function summarize(rows, side, seconds) {
    const completed = rows.filter(row => row[side].status === "ok");
    const good = rows.filter(row => row[side + "Outcome"] === "onTime").length;
    const errors = rows.filter(row => row[side].status === "error").length;
    const timeouts = rows.filter(row => row[side].status === "timeout").length;
    return {
      completed: completed.length, good, late: completed.length - good, errors, timeouts,
      throughput: completed.length / seconds, goodput: good / seconds,
      firstP95: p95(completed.map(row => row[side].firstMs)),
      endP95: p95(completed.map(row => row[side].endMs))
    };
  }

  function analyze(trace, targets) {
    if (!validTargets(targets)) throw new TraceError("targets", "targets");
    const groups = new Map();
    const rows = trace.requests.map(row => {
      const aOutcome = outcome(row.a, targets);
      const bOutcome = outcome(row.b, targets);
      const group = groups.get(row.group) || {name: row.group, total: 0, aGood: 0, bGood: 0};
      group.total += 1;
      group.aGood += Number(aOutcome === "onTime");
      group.bGood += Number(bOutcome === "onTime");
      groups.set(row.group, group);
      return {...row, aOutcome, bOutcome};
    });
    const seconds = trace.windowMs / 1000;
    return {rows, groups: [...groups.values()], a: summarize(rows, "a", seconds), b: summarize(rows, "b", seconds)};
  }

  function filterRows(rows, group, filter) {
    return rows.filter(row => {
      if (group && row.group !== group) return false;
      if (filter === "different") return (row.aOutcome === "onTime") !== (row.bOutcome === "onTime");
      if (filter === "failed") return row.a.status !== "ok" || row.b.status !== "ok";
      return true;
    });
  }

  return {SCHEMA, MAX_BYTES, MAX_REQUESTS, MAX_TARGET_MS, TraceError, validTargets, normalize, analyze, filterRows};
})();

if (typeof module !== "undefined" && module.exports) module.exports = BenchModel;
