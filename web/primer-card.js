"use strict";

(() => {
  const card = document.querySelector(".primer-card");
  if (!card) return;
  const notes = card.querySelector("[data-notes]");
  const lab = card.closest(".day-content").querySelector('[data-primer-lab="queue"]');
  const record = document.getElementById("record-run");
  const download = document.getElementById("download-card");
  const status = document.getElementById("card-status");
  const message = (zh, en) => document.documentElement.lang === "en" ? en : zh;
  const notices = {
    recorded: ["已记下这次结果。可以再改一个条件。", "Run recorded. Try changing one setting."],
    duplicate: ["这组条件已在卡片中。试着只改一个条件。", "This run is already on your card. Try changing one setting."],
    full: ["笔记已达字符上限。精简几句后可以再记。", "The note is full. Shorten it before adding a run."],
    empty: ["先记下一次结果，或在卡片里写下自己的观察。", "Record a result or write an observation first."],
    downloaded: ["已请求下载 Markdown 实验卡。", "Your Markdown card download was requested."]
  };
  let lastNotice = "";
  function showNotice(key) {
    lastNotice = key;
    status.textContent = key ? message(...notices[key]) : "";
  }

  download.disabled = false;
  record.disabled = !lab?.dataset.firstSeconds;
  record.addEventListener("click", () => {
    const ahead = lab.querySelector('[data-primer-control="ahead"]').value;
    const pieces = lab.querySelector('[data-primer-control="length"]').value;
    const {firstSeconds, totalSeconds} = lab.dataset;
    const line = message(
      `前面 ${ahead} 人，回答 ${pieces} 块。第 ${firstSeconds} 秒看见首块，第 ${totalSeconds} 秒收到完整回答。`,
      `People ahead: ${ahead}. Reply pieces: ${pieces}. First piece at ${firstSeconds} s, full reply at ${totalSeconds} s.`
    );
    if (notes.value.split("\n").includes(line)) { showNotice("duplicate"); return; }
    const joined = notes.value ? notes.value + (notes.value.endsWith("\n") ? "" : "\n") + line : line;
    if (joined.length > notes.maxLength) { showNotice("full"); return; }
    notes.value = joined;
    notes.dispatchEvent(new Event("input", {bubbles: true}));
    showNotice("recorded");
  });

  notes.addEventListener("input", () => showNotice(""));
  document.getElementById("course-language").addEventListener("click", () => showNotice(lastNotice));
  download.addEventListener("click", () => {
    const entry = notes.value.trim();
    if (!entry) { showNotice("empty"); notes.focus(); return; }
    const report = [
      "# " + message("我的第一张推理实验卡", "My first inference experiment card"), "",
      message("聘枢 · 从零认识 AI 推理", "AI Infra JobHub · AI inference from zero"), "",
      message("排队教学模型。一个服务窗口，每位前面的人用 2 秒，轮到我时每秒生成 1 块。时长来自这组规则。",
        "Teaching queue model. One service window, two seconds per person ahead, one output piece per second on my turn. The durations follow these rules."), "",
      "## " + message("我的观察和解释", "My observations and explanation"), "",
      ...entry.split(/\r\n?|\n/).map(line => "    " + line), ""
    ];
    const url = URL.createObjectURL(new Blob([report.join("\n")], {type: "text/markdown;charset=utf-8"}));
    const a = document.createElement("a");
    a.href = url;
    a.download = "inference-101-experiment.md";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotice("downloaded");
  });
})();
