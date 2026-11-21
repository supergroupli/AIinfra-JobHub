"use strict";

const BenchReport = (() => {
  const samples = typeof module !== "undefined" && module.exports ? require("./bench-samples.js") : BenchSamples;
  const labURL = "https://supergroupli.github.io/AIinfra-JobHub/bench/";

  // A code span keeps an imported name literal even when it contains Markdown,
  // HTML or backticks. Names are never placed in a table cell or link target.
  function literal(value) {
    const text = String(value).replace(/[\r\n\u2028\u2029]+/gu, " ");
    const longest = (text.match(/`+/g) || []).reduce((length, run) => Math.max(length, run.length), 0);
    const fence = "`".repeat(longest + 1);
    return fence + " " + text + " " + fence;
  }

  // Construct the public link from a versioned example and the *active*
  // thresholds. Imported data, notes and unrelated URL parameters stay local.
  function publicReplay(value, trace, targets, lang) {
    if (!value || trace.source !== "synthetic") return "";
    let incoming;
    try { incoming = new URL(value); } catch { return ""; }
    if (!["https:", "http:"].includes(incoming.protocol) || incoming.username || incoming.password) return "";
    const id = incoming.searchParams.get("case");
    if (!Object.prototype.hasOwnProperty.call(samples, id)) return "";
    const builtin = samples[id].trace;
    if (trace.windowMs !== builtin.windowMs || trace.requests.length !== builtin.requests.length ||
        JSON.stringify(trace.requests) !== JSON.stringify(builtin.requests)) return "";
    const url = new URL(labURL);
    url.search = new URLSearchParams({case: id, ttft: targets.ttftMs, e2e: targets.e2eMs, lang}).toString();
    return url.href;
  }

  function markdown({trace, targets, analysis, decision, reason, citedIds, lang, caseTitle, replayUrl}) {
    const locale = lang === "en" ? "en" : "zh";
    const t = (zh, en) => locale === "en" ? en : zh;
    const count = trace.requests.length;
    const replay = publicReplay(replayUrl, trace, targets, locale);
    const choices = {
      a: t("保留 A", "Keep A"),
      b: t("上线 B", "Ship B"),
      more: t("补充证据后决定", "Gather more evidence before deciding")
    };
    const decisionText = Object.prototype.hasOwnProperty.call(choices, decision) ? choices[decision] : "";
    const notes = typeof reason === "string" ? reason.trim().replace(/\r\n?|[\u2028\u2029]/gu, "\n") : "";
    const selected = new Set(citedIds);
    const evidence = analysis.rows.filter(row => selected.has(row.id));
    if (!decisionText || !notes || !evidence.length) throw new Error("A decision, a reason and a cited request are required.");

    const source = trace.source === "measured"
      ? t("提供者标注为实测", "Marked as measured by the data provider")
      : t("合成计时数据", "Synthetic timings");
    const rate = value => String(Number(value.toPrecision(7)));
    const p95 = value => value === null ? t("无成功请求", "No successful requests") : String(value);
    const metric = (label, format) => "| " + label + " | " + format(analysis.a) + " | " + format(analysis.b) + " |";
    const result = [
      "# " + t("推理压测复盘", "Inference benchmark review"), "",
      t("案例", "Dataset") + " " + literal(caseTitle), "",
      "**" + t("数据来源", "Data source") + "** · " + source + " · " + literal(trace.schema), "",
      t("两种配置各回放 " + count + " 条请求。两次的到达序列一致，共同观测窗口为 " + trace.windowMs + " ms。",
        "Each run replays " + count + " requests on the same arrival schedule over a shared " + trace.windowMs + " ms window."), "",
      t("达标条件为成功完成，TTFT ≤ " + targets.ttftMs + " ms 且端到端时延 ≤ " + targets.e2eMs + " ms。",
        "An on-time request succeeds with TTFT ≤ " + targets.ttftMs + " ms and end-to-end latency ≤ " + targets.e2eMs + " ms."), "",
      "## " + t("上线判断", "Deployment decision"), "",
      "**" + decisionText + "**", "",
      ...notes.split("\n").map(line => "    " + line), "",
      "## " + t("两套配置的对照结果", "Paired results"), "",
      "| " + t("指标", "Metric") + " | A | B |", "| --- | ---: | ---: |",
      metric(t("成功数 / 全部请求", "Successful / all requests"), s => s.completed + " / " + count),
      metric(t("达标数 / 全部请求", "Within both targets / all requests"), s => s.good + " / " + count),
      metric(t("成功但超标的请求", "Successful but late"), s => s.late),
      metric(t("错误 / 超时", "Errors / timeouts"), s => s.errors + " / " + s.timeouts),
      metric(t("完成吞吐量（请求/秒）", "Successful throughput (requests/s)"), s => rate(s.throughput)),
      metric(t("有效吞吐量（达标请求/秒）", "Goodput (on-time requests/s)"), s => rate(s.goodput)),
      metric(t("成功请求 TTFT P95（ms）", "Successful TTFT p95 (ms)"), s => p95(s.firstP95)),
      metric(t("成功请求端到端 P95（ms）", "Successful end-to-end p95 (ms)"), s => p95(s.endP95)), "",
      "## " + t("分组达标数 / 该组全部请求", "On-time / all requests by group"), ""
    ];
    for (const group of analysis.groups) {
      result.push("- " + literal(group.name) + " · A " + group.aGood + " / " + group.total + " · B " + group.bGood + " / " + group.total);
    }

    const outcomes = {
      onTime: t("双项达标", "within both targets"),
      firstLate: t("首 token 超标", "TTFT over target"),
      endLate: t("端到端超标", "end-to-end latency over target"),
      bothLate: t("两项均超标", "both targets missed"),
      error: t("错误", "error"),
      timeout: t("超时", "timeout")
    };
    result.push("", "## " + t("引用的逐请求证据", "Cited request evidence"), "");
    for (const row of evidence) {
      result.push("- " + literal(row.id) + " · " + literal(row.group) + " · " + t("发送时刻", "Sent at") + " T+" + row.sentMs + " ms");
      for (const side of ["a", "b"]) {
        const run = row[side];
        const first = run.firstMs === null ? t("未收到首块", "no first chunk") : run.firstMs + " ms";
        result.push("  - " + side.toUpperCase() + " · " + run.status + " · TTFT " + first + " · " +
          t("端到端", "End-to-end") + " " + run.endMs + " ms · " + outcomes[row[side + "Outcome"]]);
      }
    }
    result.push("", "## " + t("复算方法", "Reproduce the calculation"), "",
      t("TTFT 从发送算到首个含 token 的非空响应块。端到端时延从发送算到成功完成、错误或超时。完成吞吐量用成功数除以共同窗口秒数，有效吞吐量用双项达标数除以同一窗口秒数。",
        "TTFT runs from send to the first nonempty, token-bearing chunk. End-to-end latency runs from send to completion, error or timeout. Successful throughput divides successes by the shared window in seconds. Goodput uses the same window and counts requests that meet both targets."), "",
      t("P95 只使用成功请求。将时延升序排列，取从 1 开始的第 ⌈0.95 × 成功数⌉ 项。成功数为 0 时 P95 无定义。错误与超时都计入全部请求数。",
        "For p95, sort successful-request latencies in ascending order and take the one-based rank ⌈0.95 × successes⌉. With zero successes the percentile is unavailable. Errors and timeouts remain in the total request count."), "");
    if (replay) {
      result.push(t("打开同一份案例，页面会自动应用本文的两个时延目标。", "Open the same example with both of this review’s latency targets applied.") +
        " [" + t("复算此案例", "Replay this example") + "](" + replay + ")");
    } else {
      result.push(t("将本次导出的计时 JSON 随稿交给评审者。在复盘台选择「使用自己的计时数据」并打开文件，即可按相同条件复算。",
        "Include the exported timing JSON with the review. In the lab, choose “Use my own timings” and open the file to rerun the comparison.") +
        " [" + t("推理压测复盘台", "Inference benchmark lab") + "](" + labURL + "?lang=" + locale + ")");
    }
    return result.join("\n") + "\n";
  }

  return {markdown};
})();

if (typeof module !== "undefined" && module.exports) module.exports = BenchReport;
