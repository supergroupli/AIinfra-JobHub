"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const storageKey = "infra-commons:language";
  let savedLang;
  try { savedLang = JSON.parse(localStorage.getItem(storageKey)); } catch {}
  const requestedLang = params.get("lang");
  let lang = ["en", "zh"].includes(requestedLang) ? requestedLang : savedLang === "en" ? "en" : "zh";
  const t = (zh, en) => lang === "en" ? en : zh;
  const publicCase = key => Object.prototype.hasOwnProperty.call(BenchSamples, key);
  let caseId = publicCase(params.get("case")) ? params.get("case") : "batch-v1";
  let trace = BenchModel.normalize(BenchSamples[caseId].trace);
  let imported = null;
  let importVersion = 0;
  let ticket = 0;
  let fileStatus = null;
  let page = 0;
  const pageSize = 10;
  const drafts = new Map();
  let analysis;
  const originalText = new Map([...document.querySelectorAll("[data-en]")].map(node => [node, node.textContent]));

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function option(value, label) {
    const node = element("option", label);
    node.value = value;
    return node;
  }

  function number(value) {
    if (value === null) return "—";
    return new Intl.NumberFormat(lang === "en" ? "en-US" : "zh-CN", {maximumFractionDigits: 3, maximumSignificantDigits: 8}).format(value);
  }

  function targets() {
    return {ttftMs: $("ttft").valueAsNumber, e2eMs: $("e2e").valueAsNumber};
  }

  function setTargets(limits) {
    $("ttft").value = limits.ttftMs;
    $("e2e").value = limits.e2eMs;
  }

  function draft() {
    const limits = targets();
    const identity = caseId || "private-" + importVersion;
    const key = [identity, limits.ttftMs, limits.e2eMs].join("/");
    if (!drafts.has(key)) drafts.set(key, {decision: "", reason: "", cited: new Set()});
    return drafts.get(key);
  }

  function localURL(path) {
    const url = new URL(path, location.href);
    url.searchParams.set("lang", lang);
    return url.href;
  }

  function replayURL() {
    if (!caseId || !BenchModel.validTargets(targets())) return "";
    const url = new URL("./", location.href);
    const limits = targets();
    url.search = new URLSearchParams({case: caseId, ttft: limits.ttftMs, e2e: limits.e2eMs, lang}).toString();
    return url.href;
  }

  function syncAddress() {
    const safe = replayURL() || localURL("./");
    if (location.href !== safe) history.replaceState(null, "", safe);
  }

  function caseName() {
    return caseId ? BenchSamples[caseId].title[lang] : t("本地计时数据", "Local timings");
  }

  const outcomes = {
    onTime: ["双项达标", "Within targets"], firstLate: ["首 token 超标", "TTFT over target"],
    endLate: ["端到端超标", "End time over target"], bothLate: ["两项均超标", "Both over target"],
    error: ["错误", "Error"], timeout: ["超时", "Timeout"]
  };

  const groupLabels = {
    "short-prompt": ["短提示词", "Short prompts"], "long-prompt": ["长提示词", "Long prompts"],
    "shared-prefix": ["共享前缀", "Shared prefixes"], "unique-prefix": ["独特前缀", "Unique prefixes"],
    "before-rollout": ["升级前", "Before rollout"], "during-rollout": ["升级期间", "During rollout"]
  };

  function groupLabel(name) {
    return caseId && Object.hasOwn(groupLabels, name) ? t(...groupLabels[name]) : name;
  }

  const counterchecks = {
    "batch-v1": {
      prompt: ["把首 token 目标从 120 ms 放宽到 250 ms，端到端仍限 600 ms。先猜哪组会新增达标请求，再看结果。", "If you raise the TTFT limit from 120 to 250 ms and keep the end-to-end limit at 600 ms, which run gains on-time requests? Predict before you check."],
      action: ["试用 250 / 600 ms", "Try 250 / 600 ms"]
    },
    "prefix-v1": {
      prompt: ["单独查看无法复用前缀的请求，再和上方总体达标数比较。哪些用户会支持不同的上线决定？", "Inspect only the unique-prefix traffic, then compare it with the overall counts. Which users might reach a different deployment decision?"],
      action: ["查看独特前缀请求", "Inspect unique-prefix requests"]
    },
    "upgrade-v1": {
      prompt: ["成功请求的 P95 较低时，哪些请求被排除在分位数之外？找出一条已返回首块、随后失败的记录。", "When successful-request P95 drops, which requests are missing from the percentile? Find one that returned a first chunk and then failed."],
      action: ["查看错误与超时", "Inspect errors and timeouts"]
    }
  };

  function renderText() {
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    document.title = t("推理压测复盘台 · 聘枢", "Inference benchmark lab") + " · AI Infra JobHub";
    originalText.forEach((zh, node) => { node.textContent = t(zh, node.dataset.en); });
    document.querySelectorAll("[data-path]").forEach(node => { node.href = localURL(node.dataset.path); });
    $("language").textContent = t("EN", "中文");
    $("language").setAttribute("aria-label", t("Switch to English", "切换为中文"));
    const cases = Object.entries(BenchSamples).map(([key, sample]) => option(key, sample.title[lang]));
    if (imported) cases.push(option("private", t("本地导入的数据", "Locally imported timings")));
    $("case").replaceChildren(...cases);
    $("case").value = caseId || "private";
    $("mobile-case").textContent = caseName();
    $("question").textContent = caseId ? BenchSamples[caseId].question[lang] : t(
      "比较两个配置在相同请求和相同观测窗口下的表现。先看总体，再检查差异最大的分组。",
      "Compare the two runs under the same arrivals and time window. Check the aggregate, then inspect the group with the largest difference."
    );
    $("source-tag").textContent = caseId ? t("教学合成数据", "Synthetic example") : trace.source === "measured"
      ? t("本地导入 · 提供者标为实测", "Local import · marked measured by its author")
      : t("本地导入 · 合成数据", "Local import · synthetic");
    const sample = caseId && BenchSamples[caseId];
    $("experiment").hidden = !sample;
    $("course-link").hidden = !sample;
    $("project-link").hidden = !sample;
    if (sample) {
      $("experiment-prompt").textContent = t(...counterchecks[caseId].prompt);
      $("try-experiment").textContent = t(...counterchecks[caseId].action);
      $("course-link").href = localURL("../learn/" + sample.course + "/#day-" + sample.day);
      $("project-link").href = localURL("../projects/?project=" + sample.project);
    }
    $("file-status").textContent = fileStatus ? t(...fileStatus) : "";
    $("download-status").textContent = "";
  }

  function renderChart(limits) {
    const n = trace.requests.length;
    $("window-label").textContent = t("每种配置 " + n + " 条请求 · 共同观测窗口 ", n + " requests per run · shared window of ") + number(trace.windowMs / 1000) + " s";
    const bars = ["a", "b"].map(side => {
      const stat = analysis[side];
      const row = element("div");
      const head = element("div");
      head.className = "bar-head";
      head.append(element("strong", t("配置 ", "Run ") + side.toUpperCase()));
      const count = element("span");
      count.append(element("b", String(stat.good)), " / " + n);
      head.append(count);
      const track = element("div");
      track.className = "bar-track";
      track.setAttribute("role", "img");
      const failed = stat.errors + stat.timeouts;
      track.setAttribute("aria-label", t(stat.good + " 达标，" + stat.late + " 完成但超标，" + failed + " 错误或超时",
        stat.good + " within targets, " + stat.late + " late, " + failed + " errors or timeouts"));
      for (const [style, value] of [["good", stat.good], ["late", stat.late], ["failed", failed]]) {
        const segment = element("span");
        segment.className = style;
        segment.style.width = (100 * value / n) + "%";
        track.append(segment);
      }
      row.append(head, track);
      return row;
    });
    $("comparison-chart").replaceChildren(...bars);
    $("chart-caption").textContent = t(
      "TTFT ≤ " + limits.ttftMs + " ms 且端到端 ≤ " + limits.e2eMs + " ms。达标吞吐 A " + number(analysis.a.goodput) + "、B " + number(analysis.b.goodput) + " 请求/秒。",
      "TTFT ≤ " + limits.ttftMs + " ms and end to end ≤ " + limits.e2eMs + " ms. Goodput is " + number(analysis.a.goodput) + " req/s for A and " + number(analysis.b.goodput) + " req/s for B."
    );
  }

  function tableRow(label, a, b) {
    const tr = element("tr");
    const th = element("th", label);
    th.scope = "row";
    tr.append(th, element("td", a), element("td", b));
    return tr;
  }

  function renderTables() {
    const n = trace.requests.length;
    const metrics = [
      [t("成功 / 总数", "Completed / total"), s => s.completed + " / " + n],
      [t("达标 / 总数", "On time / total"), s => s.good + " / " + n],
      [t("完成吞吐（请求/秒）", "Completion throughput (req/s)"), s => number(s.throughput)],
      [t("达标吞吐（请求/秒）", "Goodput (req/s)"), s => number(s.goodput)],
      ["P95 TTFT (ms)", s => number(s.firstP95)],
      [t("P95 端到端（ms）", "P95 end to end (ms)"), s => number(s.endP95)],
      [t("错误 / 超时", "Errors / timeouts"), s => s.errors + " / " + s.timeouts]
    ];
    $("metrics").replaceChildren(...metrics.map(([label, value]) => tableRow(label, value(analysis.a), value(analysis.b))));
    $("groups").replaceChildren(...analysis.groups.map(group =>
      tableRow(groupLabel(group.name), group.aGood + " / " + group.total, group.bGood + " / " + group.total)
    ));
    const group = $("group").value;
    $("group").replaceChildren(option("", t("全部分组", "All groups")), ...analysis.groups.map(item => option(item.name, groupLabel(item.name))));
    if (analysis.groups.some(item => item.name === group)) $("group").value = group;
  }

  function citationButton(button, id) {
    const cited = draft().cited.has(id);
    const label = cited ? t("已引用", "Cited") : t("引用", "Cite");
    button.textContent = label;
    button.setAttribute("aria-label", label + " " + id);
    button.setAttribute("aria-pressed", String(cited));
  }

  function requestRow(row) {
    const tr = element("tr");
    const id = element("th", row.id);
    id.scope = "row";
    id.append(element("small", groupLabel(row.group)));
    tr.append(id, element("td", number(row.sentMs) + " ms"));
    for (const side of ["a", "b"]) {
      const run = row[side];
      const cell = element("td", number(run.firstMs) + " / " + number(run.endMs) + " ms");
      cell.append(element("small", t(...outcomes[row[side + "Outcome"]])));
      tr.append(cell);
    }
    const action = element("td");
    const button = element("button");
    button.type = "button";
    button.className = "small-btn";
    button.dataset.id = row.id;
    citationButton(button, row.id);
    action.append(button);
    tr.append(action);
    return tr;
  }

  function renderRequests() {
    const filtered = BenchModel.filterRows(analysis.rows, $("group").value, $("filter").value);
    const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
    page = Math.min(lastPage, Math.max(page, 0));
    const start = page * pageSize;
    const items = filtered.slice(start, start + pageSize);
    $("requests").replaceChildren(...items.map(requestRow));
    $("prev").disabled = page === 0;
    $("next").disabled = page === lastPage;
    $("row-count").textContent = filtered.length ? (start + 1) + "–" + (start + items.length) + " / " + filtered.length
      : t("当前筛选下没有请求。可以改选其他分组或查看全部。", "No requests match. Try another group or show all requests.");
  }

  function renderDraft() {
    const value = draft();
    $("decision").value = value.decision;
    if ($("reason").value !== value.reason) $("reason").value = value.reason;
    $("cited").textContent = value.cited.size ? t("已引用请求 ", "Cited requests · ") + [...value.cited].join(", ") : t("已引用 0 条请求", "No requests cited yet");
    const ready = Boolean(value.decision && value.reason.trim() && value.cited.size);
    $("download-report").disabled = !ready;
    $("report-hint").textContent = ready ? t("复盘稿已包含本次条件、指标和引用记录。", "Your report includes the targets, metrics and cited records.")
      : t("选择一个判断，引用至少一条请求，再写下理由即可导出。", "Choose a position, cite at least one request and write your reasoning to export.");
    $("replay").hidden = !caseId;
    $("private-replay").hidden = Boolean(caseId);
    if (caseId) $("replay").href = replayURL();
    else $("replay").removeAttribute("href");
  }

  function calculate() {
    const limits = targets();
    const valid = BenchModel.validTargets(limits);
    ["ttft", "e2e"].forEach(id => $(id).setAttribute("aria-invalid", String(!$(id).validity.valid || !$(id).value)));
    $("results").hidden = !valid;
    $("target-message").textContent = valid ? "" : t("两项目标都需要填入 1–3,600,000 之间的整数毫秒。", "Enter a whole number from 1 to 3,600,000 ms for each target.");
    $("download-status").textContent = "";
    if (!valid) {
      analysis = null;
      $("comparison-chart").replaceChildren();
      $("chart-caption").textContent = $("target-message").textContent;
      return;
    }
    analysis = BenchModel.analyze(trace, limits);
    syncAddress();
    renderChart(limits);
    renderTables();
    renderRequests();
    renderDraft();
  }

  function activate(key) {
    caseId = key === "private" ? null : key;
    trace = caseId ? BenchModel.normalize(BenchSamples[caseId].trace) : imported;
    page = 0;
    $("group").value = "";
    $("filter").value = "all";
    setTargets(trace.targets);
    renderText();
    calculate();
  }

  const formatErrors = {
    schema: ["格式标识应为 jobhub-bench/v1", "Expected schema jobhub-bench/v1"],
    source: ["来源应为 synthetic 或 measured", "Expected synthetic or measured"],
    window: ["共同窗口至少为 1 ms", "The shared window must be at least 1 ms"],
    targets: ["目标应为 1–3,600,000 的整数毫秒", "Targets must be whole milliseconds from 1 to 3,600,000"],
    count: ["需要 1–2,000 条成对记录", "Provide 1–2,000 paired records"],
    record: ["需要成对的请求记录", "Expected a paired request record"],
    name: ["编号或分组需要 1–80 个可打印字符", "IDs and groups need 1–80 printable characters"],
    duplicate: ["请求编号重复", "Duplicate request ID"],
    sent: ["发送时刻需在观测窗口内", "The start must be within the observation window"],
    status: ["状态应为 ok、error 或 timeout", "Expected ok, error or timeout"],
    end: ["结束耗时需在剩余窗口内", "End duration must fit within the remaining window"],
    first: ["首响应耗时需在结束耗时以内。未收到首块的失败请求填 null", "First response time must fit within end time. Use null for a failure without a first chunk"]
  };

  async function importFile(file) {
    if (!file) return;
    const current = ++ticket;
    fileStatus = [ "正在读取文件…", "Reading file…" ];
    $("file-status").textContent = t(...fileStatus);
    let nextTrace;
    try {
      if (file.size > BenchModel.MAX_BYTES) throw new BenchModel.TraceError("size", "");
      nextTrace = BenchModel.normalize(JSON.parse(await file.text()));
    } catch (error) {
      if (ticket !== current) return;
      const message = formatErrors[error.code];
      if (message) fileStatus = message.map(part => error.field + " · " + part);
      else if (error.code === "size") fileStatus = ["文件超过 4 MiB。", "File exceeds 4 MiB."];
      else fileStatus = ["无法读取有效的 JSON。请检查文件和格式示例。", "Could not read valid JSON. Check the file against the format example."];
      $("file-status").textContent = t(...fileStatus);
      return;
    }
    if (ticket !== current) return;
    for (const key of drafts.keys()) if (key.startsWith("private-")) drafts.delete(key);
    imported = nextTrace;
    importVersion += 1;
    fileStatus = ["已载入 " + imported.requests.length + " 条成对计时。", "Loaded " + imported.requests.length + " paired timings."];
    activate("private");
  }

  function download(contents, type, filename) {
    const url = URL.createObjectURL(new Blob([contents], {type}));
    const link = element("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  $("language").addEventListener("click", () => {
    lang = lang === "zh" ? "en" : "zh";
    try { localStorage.setItem(storageKey, JSON.stringify(lang)); } catch {}
    renderText();
    calculate();
  });
  $("case").addEventListener("change", () => {
    ticket++;
    fileStatus = null;
    activate($("case").value);
  });
  $("file").addEventListener("change", () => {
    const file = $("file").files[0];
    $("file").value = "";
    importFile(file);
  });
  for (const id of ["ttft", "e2e"]) $(id).addEventListener("input", calculate);
  $("reset").addEventListener("click", () => { setTargets(trace.targets); calculate(); });
  $("try-experiment").addEventListener("click", () => {
    if (caseId === "batch-v1") {
      setTargets({ttftMs: 250, e2eMs: 600});
      calculate();
      $("ttft").focus();
      return;
    }
    $("group").value = caseId === "prefix-v1" ? "unique-prefix" : "";
    $("filter").value = caseId === "upgrade-v1" ? "failed" : "all";
    page = 0;
    renderRequests();
    $("request-scroll").focus();
  });
  for (const id of ["group", "filter"]) $(id).addEventListener("change", () => { page = 0; renderRequests(); });
  $("prev").addEventListener("click", () => { page--; renderRequests(); });
  $("next").addEventListener("click", () => { page++; renderRequests(); });
  $("requests").addEventListener("click", event => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;
    const {cited} = draft();
    const id = button.dataset.id;
    if (cited.has(id)) cited.delete(id);
    else cited.add(id);
    citationButton(button, id);
    renderDraft();
  });
  $("decision").addEventListener("change", () => { draft().decision = $("decision").value; renderDraft(); });
  $("reason").addEventListener("input", () => { draft().reason = $("reason").value; renderDraft(); });
  $("download-trace").addEventListener("click", () => {
    if (!analysis) return;
    const json = JSON.stringify({...trace, targets: targets()}, null, 2);
    download(json + "\n", "application/json;charset=utf-8", "jobhub-" + (caseId || "local") + ".json");
    $("download-status").textContent = t("已请求下载计时数据。", "Timing download requested.");
  });
  $("download-report").addEventListener("click", () => {
    const value = draft();
    if (!analysis || !value.decision || !value.reason.trim() || !value.cited.size) return;
    const report = BenchReport.markdown({
      trace, targets: targets(), analysis, decision: value.decision, reason: value.reason,
      citedIds: [...value.cited], lang, caseTitle: caseName(), replayUrl: replayURL()
    });
    download(report, "text/markdown;charset=utf-8", "jobhub-review-" + (caseId || "local") + "-" + lang + ".md");
    $("download-status").textContent = t("已请求下载复盘稿。", "Review download requested.");
  });

  const shared = {ttftMs: Number(params.get("ttft")), e2eMs: Number(params.get("e2e"))};
  const knownCase = !params.has("case") || publicCase(params.get("case"));
  const hasLimits = params.has("ttft") || params.has("e2e");
  const applyShared = knownCase && hasLimits && BenchModel.validTargets(shared);
  setTargets(applyShared ? shared : trace.targets);
  if (!knownCase || (hasLimits && !applyShared)) {
    fileStatus = ["链接中的案例或目标无法识别，已载入案例默认条件。", "The link contains an unknown case or invalid targets. Dataset defaults were loaded."];
  }
  renderText();
  calculate();
  $("lab").hidden = false;
})();
