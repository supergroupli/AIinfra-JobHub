"use strict";

const TalentModel = (() => {
  const directions = {
    inference: ["Serving", "KV Cache", "vLLM", "SGLang", "LMCache", "Mooncake", "Dynamo"],
    performance: ["CUDA", "Triton", "PyTorch", "NCCL", "Distributed Systems"],
    platform: ["Kubernetes", "Ray", "Dynamo", "Observability", "Distributed Systems"]
  };
  const reviewStates = ["queued", "in-review", "changes-requested", "reproduced"];
  const string = value => typeof value === "string" ? value : "";
  const localized = (value, lang = "zh") => typeof value === "string" ? value : string(value?.[lang]) || string(value?.zh) || string(value?.en);
  const safeUrl = value => {
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : ""; }
    catch { return ""; }
  };
  const validDate = value => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T00:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  const dateKey = () => new Date().toISOString().slice(0, 10);
  const fresh = (record, today) => validDate(today) && validDate(record?.updatedAt) && validDate(record?.expiresAt) && record.updatedAt <= today && record.expiresAt >= today && record.expiresAt > record.updatedAt && (Date.parse(record.expiresAt) - Date.parse(record.updatedAt)) <= 90 * 86400000;
  const idIsSafe = value => typeof value === "string" && /^[a-z0-9-]+$/.test(value);
  const repoIssue = (value, repository) => {
    if (!safeUrl(value) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) return false;
    const url = new URL(value);
    const prefix = "/" + repository + "/issues/";
    return url.hostname === "github.com" && url.pathname.startsWith(prefix) && /^[1-9]\d*$/.test(url.pathname.slice(prefix.length)) && !url.search && !url.hash;
  };
  const evidenceUrl = value => {
    if (!safeUrl(value)) return false;
    const url = new URL(value);
    return url.hostname === "github.com" && /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:issues\/[1-9]\d*|commit\/[a-f0-9]{40})$/i.test(url.pathname) && !url.search && (!url.hash || /^#(?:issuecomment-\d+|r\d+)$/.test(url.hash));
  };
  function unique(records) {
    const seen = new Set();
    return records.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
  }
  function activePeople(records, today = dateKey()) {
    if (!Array.isArray(records)) return [];
    return unique(records.filter(p => p && idIsSafe(p.id) && p.status === "approved" && p.consent === true && fresh(p, today) && string(p.name).trim() && Array.isArray(p.tags) && safeUrl(p.portfolio) && safeUrl(p.source)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  }
  function activeReviews(records, today = dateKey(), repository = "supergroupli/AIinfra-JobHub") {
    if (!Array.isArray(records)) return [];
    return unique(records.filter(r => r && idIsSafe(r.id) && r.consent === true && fresh(r, today) && reviewStates.includes(r.status) && localized(r.title) && localized(r.summary) && string(r.author).trim() && safeUrl(r.portfolio) && repoIssue(r.source, repository) && (!['in-review', 'reproduced'].includes(r.status) || string(r.reviewer).trim()) && (r.status !== "reproduced" || evidenceUrl(r.evidence))))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  }
  function filterPeople(records, { query = "", direction = "", workMode = "", selectedOnly = false, selected = [] } = {}, today = dateKey()) {
    query = string(query).trim().toLocaleLowerCase();
    const selectedIds = new Set(selected);
    return activePeople(records, today).filter(p => {
      const fields = [p.name, localized(p.targetRole, "zh"), localized(p.targetRole, "en"), localized(p.summary, "zh"), localized(p.summary, "en"), ...p.tags, p.location, p.languages, p.availability].map(string).join(" ").toLocaleLowerCase();
      return (!query || fields.includes(query)) && (!direction || (directions[direction] || []).some(tag => p.tags.includes(tag))) && (!workMode || p.workMode === workMode) && (!selectedOnly || selectedIds.has(p.id));
    });
  }
  function cleanSelection(value, people, today = dateKey()) {
    const allowed = new Set(activePeople(people, today).map(p => p.id));
    return [...new Set(Array.isArray(value) ? value.filter(id => idIsSafe(id) && allowed.has(id)) : [])].slice(0, 100);
  }
  const markdownText = value => string(value).replace(/[\r\n\u2028\u2029]+/g, " ").replace(/([\\`*_{}\[\]<>#!|])/g, "\\$1");
  function shortlistMarkdown(people, selected, lang = "zh", today = dateKey()) {
    const ids = new Set(cleanSelection(selected, people, today));
    const current = activePeople(people, today).filter(p => ids.has(p.id));
    const pick = (zh, en) => lang === "en" ? en : zh;
    const missing = pick("未提供", "Not provided");
    const lines = ["# " + pick("聘枢 · 候选阅读清单", "AI Infra JobHub · Candidate reading list"), "", pick("导出日期（UTC）：", "Exported (UTC): ") + today, "", pick("来自本人主动公开的名片。此清单用于人工阅读与交流，没有能力评分或雇佣推荐；联系前请打开来源确认最新状态。", "From voluntarily public profiles. For human review and conversation, without ability scores or hiring recommendations. Check the source for current availability before contacting anyone."), ""];
    for (const p of current) {
      lines.push("## " + markdownText(p.name), "");
      for (const [label, value] of [[pick("目标方向", "Target role"), localized(p.targetRole, lang)], [pick("本人贡献", "Contribution"), localized(p.summary, lang)], [pick("技术", "Technologies"), p.tags.join(" / ")], [pick("协作方式", "Work arrangement"), p.workMode], [pick("地区", "Location"), p.location], [pick("语言", "Languages"), p.languages], [pick("时间安排", "Availability"), p.availability]]) lines.push("- " + label + ": " + markdownText(value || missing));
      lines.push("- " + pick("作品", "Portfolio") + ": <" + safeUrl(p.portfolio) + ">", "- " + pick("提交来源 / 更新状态", "Source / current status") + ": <" + safeUrl(p.source) + ">", "- " + pick("最近确认", "Last confirmed") + ": " + p.updatedAt, "- " + pick("展示至（UTC）", "Listed through (UTC)") + ": " + p.expiresAt, "");
    }
    if (!current.length) lines.push(pick("没有当前有效的已选名片。", "No currently active profiles selected."), "");
    return lines.join("\n");
  }
  return { directions, reviewStates, localized, safeUrl, validDate, dateKey, fresh, evidenceUrl, activePeople, activeReviews, filterPeople, cleanSelection, shortlistMarkdown };
})();
if (typeof module !== "undefined" && module.exports) module.exports = TalentModel;
