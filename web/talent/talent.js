"use strict";

(() => {
  const M = TalentModel;
  const key = "infra-commons:talent-shortlist-v1";
  const languageKey = "infra-commons:language";
  const $ = id => document.getElementById(id);
  const strings = {
    zh: {
      brand:"聘枢",tagline:"AI Infra JobHub",skip:"跳到人才速览",learn:"学习库",career:"求职准备",talent:"人才速览",jobs:"工作与合作",pageTitle:"人才速览与作品评审 · 聘枢 · AI Infra JobHub",
      eyebrow:"PEOPLE & PROOF / 让贡献被看见",title:"从一份作品，认识下一位同行。",intro:"按技术和协作条件找到公开名片，查看本人贡献与原始作品，再开始一次有内容的交流。",browse:"查看人才速览 ↓",reviewLink:"参与作品评审 ↗",readOrder:"阅读一份作品的顺序",contribution:"本人做了什么",contributionNote:"从明确的贡献开始",evidence:"证据在哪里",evidenceNote:"查看代码、实验与局限",availability:"是否适合交流",availabilityNote:"确认方向、地区与时间",publicProfiles:"当前公开名片",publicReviews:"当前公开评审记录",evidenceValue:"作品优先",noRanking:"按最近确认时间展示，无能力排名",libraryTitle:"找到值得细看的作品。",shareProfile:"公开我的作品名片 ↗",publicNote:"名片由本人选择公开，经维护者审核收录。作品和技能由本人描述，评审记录可单独查看。",
      searchLabel:"技术、贡献、地区、语言或时间",searchPlaceholder:"vLLM、上海、English、实习…",directionLabel:"技术方向（按标签）",allDirections:"所有方向",inference:"推理与缓存",performance:"GPU 与分布式性能",platform:"平台与可靠性",modeLabel:"协作方式",allModes:"所有方式","remote-global":"全球远程","remote-regional":"指定地区远程",hybrid:"混合办公",onsite:"线下办公",selectedOnly:"只看我的清单",reset:"清空筛选",loading:"正在加载公开名片…",peopleError:"公开名片暂时无法加载。已保存的清单保持不变。",retry:"重新加载",buildPortfolio:"先整理作品档案 ↗",noProfiles:"第一份公开作品，从你开始。",noProfilesBody:"当前没有已审核、未过期的公开人才名片。欢迎先整理自己的工程作品，再由本人主动提交公开名片；也欢迎招聘方带着具体岗位需求发布机会。",noMatches:"没有符合条件的名片",noMatchesBody:"试试减少关键词或放宽方向与协作方式；只看清单时，请先加入想进一步了解的作品。",peopleCount:"{visible} / {total} 份公开名片",notProvided:"未提供",targetRole:"目标岗位 / 方向",contributionLabel:"本人贡献 · 自述",location:"地区",languages:"语言",time:"时间安排",add:"加入清单",remove:"已加入 ✓",selectAria:"加入阅读清单：",removeAria:"移出阅读清单：",portfolio:"查看作品 ↗",github:"GitHub 主页 ↗",source:"提交来源 / 更新状态 ↗",confirmed:"最近确认",expires:"展示至（UTC）",
      shortlistTitle:"我的候选阅读清单",shortlistNote:"选择想进一步了解的作品，导出后自行评阅与联系。清单只保存名片 ID 在当前浏览器，不会通知候选人；撤下或过期名片会从清单移除。",shortlistCount:"已选 {count} 份当前有效名片",shortlistUnverified:"已保存 {count} 个名片 ID，等待目录确认有效性",export:"导出清单 .md ↓",clearShortlist:"清空阅读清单",exportSource:"查看清单文本 / 手动复制",storageError:"浏览器无法保存清单；本次访问仍可选择和导出，离开前请备份。",exported:"已请求下载。也可展开下方文本手动复制。",exportFailed:"无法启动下载；请展开下方文本手动复制保存。",selectionLimit:"清单最多保存 100 份名片，请先移除部分再添加。",
      reviewTitle:"让作品得到具体反馈。",requestReview:"提交作品评审请求 ↗",reviewNote:"请求和反馈在 GitHub 公开进行。维护者确认后更新状态；“已复现”只指链接中指定的版本与环境，不是能力认证。",queued:"待领取","in-review":"评审中","changes-requested":"需修改",reproduced:"已复现",reviewStatusLabel:"评审状态",allReviews:"全部状态",reviewLoading:"正在加载评审记录…",reviewError:"评审记录暂时无法加载，请重试。",reviewCount:"{visible} / {total} 份当前评审记录",noReviews:"还没有公开的作品评审请求",noReviewsBody:"准备好仓库、固定版本、运行步骤和你想获得的具体反馈后，提交评审请求。愿意帮助他人的工程师可以在请求 Issue 中领取评审。",noReviewMatches:"这个状态下暂无评审记录",noReviewMatchesBody:"换一个状态查看其他记录。只有真实存在的请求与反馈才会展示。",reviewPrepare:"先看结课作品验收要求 ↗",author:"作品作者",reviewer:"评审者",viewRequest:"查看请求 / 参与评审 ↗",reviewEvidence:"查看复现证据 ↗",feedbackEvidence:"查看反馈证据 ↗",reviewScope:"复现范围以证据中的 commit、环境与结果为准。",footer:"公开作品连接交流；具体岗位通过官方申请入口投递。",maintain:"查看目录来源 ↗"
    },
    en: {
      brand:"AI Infra JobHub",tagline:"聘枢 · Learn. Build. Connect.",skip:"Skip to talent",learn:"Learn",career:"Career preparation",talent:"Talent",jobs:"Opportunities",pageTitle:"Talent & project reviews · AI Infra JobHub",
      eyebrow:"PEOPLE & PROOF / MAKE CONTRIBUTIONS VISIBLE",title:"Meet your next collaborator through their work.",intro:"Explore voluntarily public profiles by technology and working conditions. Read the contribution and original project before starting a useful conversation.",browse:"Explore profiles ↓",reviewLink:"Review a project ↗",readOrder:"HOW TO READ A PROJECT",contribution:"What did they contribute?",contributionNote:"Start with their specific work",evidence:"Where is the evidence?",evidenceNote:"Read code, experiments and limits",availability:"Is a conversation a fit?",availabilityNote:"Check focus, location and timing",publicProfiles:"active public profiles",publicReviews:"active review records",evidenceValue:"Work first",noRanking:"Newest confirmation first; no ability ranking",libraryTitle:"Find work worth a closer look.",shareProfile:"Share my public profile ↗",publicNote:"Profiles are shared by their owners and curated by maintainers. Contributions and skills are self-described; review records are available separately.",
      searchLabel:"Technology, contribution, location, language or timing",searchPlaceholder:"vLLM, Shanghai, English, internship…",directionLabel:"Technical focus (by tags)",allDirections:"All directions",inference:"Inference & caching",performance:"GPU & distributed performance",platform:"Platform & reliability",modeLabel:"Work arrangement",allModes:"All arrangements","remote-global":"Remote worldwide","remote-regional":"Remote in specified regions",hybrid:"Hybrid",onsite:"On-site",selectedOnly:"Only my shortlist",reset:"Reset filters",loading:"Loading public profiles…",peopleError:"Public profiles could not be loaded. Your saved shortlist is unchanged.",retry:"Try again",buildPortfolio:"Prepare my portfolio first ↗",noProfiles:"The first public project starts with you.",noProfilesBody:"There are currently no approved, unexpired public profiles. Prepare your engineering work and choose to share your own profile. Recruiters can contribute a concrete opportunity through the opportunities page.",noMatches:"No profiles match these filters",noMatchesBody:"Try a shorter query or broader technical and working preferences. To use shortlist-only mode, first select some work to read.",peopleCount:"{visible} / {total} public profiles",notProvided:"Not provided",targetRole:"Target role / focus",contributionLabel:"Contribution · self-described",location:"Location",languages:"Languages",time:"Availability",add:"Shortlist",remove:"Selected ✓",selectAria:"Add to reading list: ",removeAria:"Remove from reading list: ",portfolio:"View portfolio ↗",github:"GitHub profile ↗",source:"Submission / current status ↗",confirmed:"Last confirmed",expires:"Listed through (UTC)",
      shortlistTitle:"My candidate reading list",shortlistNote:"Select projects to explore, then export for your own review and outreach. Only profile IDs are saved in this browser; nobody is notified. Withdrawn or expired profiles are removed from the list.",shortlistCount:"{count} active profiles selected",shortlistUnverified:"{count} saved profile IDs; awaiting directory validation",export:"Export shortlist .md ↓",clearShortlist:"Clear reading list",exportSource:"View text / copy manually",storageError:"This browser could not save the list. You can still select and export during this visit; back it up before leaving.",exported:"Download requested. You can also expand the text below and copy it manually.",exportFailed:"The download could not start. Expand the text below to copy and save it manually.",selectionLimit:"The list can hold up to 100 profiles. Remove one before adding another.",
      reviewTitle:"Give projects specific feedback.",requestReview:"Request a project review ↗",reviewNote:"Requests and feedback are public on GitHub. Maintainers update the directory after confirmation. Reproduced refers only to the version and environment in its evidence; it is not a qualification.",queued:"Awaiting reviewer","in-review":"In review","changes-requested":"Changes requested",reproduced:"Reproduced",reviewStatusLabel:"Review status",allReviews:"All statuses",reviewLoading:"Loading review records…",reviewError:"Review records could not be loaded. Please try again.",reviewCount:"{visible} / {total} active review records",noReviews:"No public project review requests yet",noReviewsBody:"Prepare a repository, pinned version, reproduction steps and a specific feedback question, then submit a request. Engineers who want to help can claim a review in its issue.",noReviewMatches:"No reviews with this status",noReviewMatchesBody:"Choose another status to see other records. Only actual requests and feedback are displayed.",reviewPrepare:"Read the capstone acceptance criteria ↗",author:"Project author",reviewer:"Reviewer",viewRequest:"View request / join review ↗",reviewEvidence:"Read reproduction evidence ↗",feedbackEvidence:"Read feedback evidence ↗",reviewScope:"Reproduction is scoped to the commit, environment and results in the evidence.",footer:"Public work starts a conversation. Apply for specific roles through their official application pages.",maintain:"View directory source ↗"
    }
  };
  let language = "zh", selected = [], storageFailed = false, exportState = "", repository = "supergroupli/AIinfra-JobHub";
  let people = [], reviews = [], peopleReady = false, reviewsReady = false, peopleFailed = false, reviewsFailed = false;
  try { language = JSON.parse(localStorage.getItem(languageKey)) === "en" ? "en" : "zh"; } catch { /* Defaults to Chinese. */ }
  if (["zh", "en"].includes(new URLSearchParams(location.search).get("lang"))) language = new URLSearchParams(location.search).get("lang");
  try { const saved = JSON.parse(localStorage.getItem(key)); selected = Array.isArray(saved) ? [...new Set(saved.filter(id => typeof id === "string" && /^[a-z0-9-]+$/.test(id)))].slice(0,100) : []; } catch { storageFailed = true; }
  const text = (name, values = {}) => Object.entries(values).reduce((s, [key, value]) => s.replaceAll("{" + key + "}", value), strings[language][name] || name);
  const local = value => M.localized(value, language) || text("notProvided");
  function node(tag, value, className) { const item = document.createElement(tag); if (value !== undefined) item.textContent = value; if (className) item.className = className; return item; }
  function link(label, value, className) { const url = M.safeUrl(value); if (!url) return null; const a = node("a", label, className); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; return a; }
  function appendLink(parent, label, url) { const a = link(label, url); if (a) parent.append(a); }
  function saveSelection() { try { localStorage.setItem(key, JSON.stringify(selected)); storageFailed = false; } catch { storageFailed = true; } }
  function syncSelection() { if (!peopleReady) return; const active = M.cleanSelection(selected, people); if (JSON.stringify(active) !== JSON.stringify(selected)) { selected = active; saveSelection(); } }
  function translate() {
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    document.title = text("pageTitle");
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = text(el.dataset.i18n); });
    document.querySelectorAll("[data-placeholder]").forEach(el => { el.placeholder = text(el.dataset.placeholder); });
    $("talent-language").textContent = language === "en" ? "中文 ↗" : "EN ↗";
    $("talent-language").setAttribute("aria-label", language === "en" ? "切换为中文" : "Switch to English");
    $("shortlist-markdown").setAttribute("aria-label", language === "en" ? "Shortlist Markdown" : "阅读清单 Markdown");
  }
  function setLinks() {
    const base = "https://github.com/" + repository;
    ["share-profile", "empty-profile"].forEach(id => { $(id).href = base + "/issues/new?template=02-profile.yml"; });
    $("request-review").href = base + "/issues/new?template=04-review.yml";
    $("maintain-directory").href = base + "/tree/main/content";
  }
  function profileCard(person) {
    const chosen = selected.includes(person.id);
    const article = node("article", undefined, "talent-card" + (chosen ? " is-selected" : ""));
    const top = node("div", undefined, "talent-card-top"), identity = node("div");
    identity.append(node("h3", person.name), node("p", text("targetRole") + ": " + local(person.targetRole), "talent-role"));
    const button = node("button", text(chosen ? "remove" : "add"), "talent-select");
    button.type = "button"; button.dataset.person = person.id;
    button.setAttribute("aria-pressed", String(chosen)); button.setAttribute("aria-label", text(chosen ? "removeAria" : "selectAria") + person.name);
    button.addEventListener("click", () => {
      syncSelection();
      if (selected.includes(person.id)) selected = selected.filter(id => id !== person.id);
      else if (selected.length < 100 && M.activePeople(people).some(p => p.id === person.id)) selected.push(person.id);
      else { $("shortlist-export-status").textContent = text("selectionLimit"); return; }
      saveSelection(); exportState = ""; renderPeople();
      const replacement = document.querySelector('[data-person="' + person.id + '"]');
      (replacement || $("talent-selected-only")).focus();
    });
    top.append(identity, button); article.append(top);
    const tags = node("div", undefined, "tags"); person.tags.filter(tag => typeof tag === "string").forEach(tag => tags.append(node("span", tag, "tag"))); article.append(tags);
    article.append(node("span", text("contributionLabel"), "talent-card-label"), node("p", local(person.summary), "talent-contribution"));
    const facts = node("dl", undefined, "talent-facts");
    [["modeLabel", strings[language][person.workMode]], ["location", person.location], ["languages", person.languages], ["time", person.availability]].forEach(([label, value]) => { const pair = node("div"); pair.append(node("dt", text(label)), node("dd", value || text("notProvided"))); facts.append(pair); });
    article.append(facts); const links = node("div", undefined, "talent-card-links");
    appendLink(links, text("portfolio"), person.portfolio); appendLink(links, text("github"), person.github); appendLink(links, text("source"), person.source); article.append(links);
    article.append(node("p", text("confirmed") + ": " + person.updatedAt + " · " + text("expires") + ": " + person.expiresAt, "talent-dates"));
    return article;
  }
  function renderShortlist() {
    $("shortlist-count").textContent = text(peopleReady ? "shortlistCount" : "shortlistUnverified", { count: selected.length });
    $("export-shortlist").disabled = !peopleReady || !selected.length;
    $("clear-shortlist").disabled = !peopleReady || !selected.length;
    $("shortlist-storage").textContent = storageFailed ? text("storageError") : "";
    $("shortlist-export-status").textContent = exportState ? text(exportState) : "";
    if (!$("shortlist-source").hidden && peopleReady) $("shortlist-markdown").value = M.shortlistMarkdown(people, selected, language);
  }
  function renderPeople() {
    $("talent-error").hidden = !peopleFailed;
    $("talent-grid").replaceChildren();
    if (!peopleReady) { $("talent-total").textContent = "—"; $("talent-count").textContent = text(peopleFailed ? "peopleError" : "loading"); $("talent-empty").hidden = true; renderShortlist(); return; }
    syncSelection();
    const active = M.activePeople(people);
    const filtered = M.filterPeople(people, { query: $("talent-search").value, direction: $("talent-direction").value, workMode: $("talent-work-mode").value, selectedOnly: $("talent-selected-only").checked, selected });
    $("talent-total").textContent = active.length;
    $("talent-count").textContent = text("peopleCount", {visible: filtered.length, total: active.length});
    filtered.forEach(person => $("talent-grid").append(profileCard(person)));
    $("talent-empty").hidden = filtered.length > 0;
    $("talent-empty-title").textContent = text(active.length ? "noMatches" : "noProfiles");
    $("talent-empty-description").textContent = text(active.length ? "noMatchesBody" : "noProfilesBody");
    renderShortlist();
  }
  function reviewCard(review) {
    const article = node("article", undefined, "review-card");
    article.append(node("span", text(review.status), "review-badge " + review.status), node("h3", local(review.title)), node("p", text("author") + ": " + review.author, "review-author"), node("p", local(review.summary), "review-summary"));
    if (review.reviewer) article.append(node("p", text("reviewer") + ": " + review.reviewer, "reviewer"));
    const links = node("div", undefined, "talent-card-links");
    appendLink(links, text("portfolio"), review.portfolio); appendLink(links, text("viewRequest"), review.source);
    if (M.evidenceUrl(review.evidence)) appendLink(links, text(review.status === "reproduced" ? "reviewEvidence" : "feedbackEvidence"), review.evidence);
    article.append(links);
    if (review.status === "reproduced") article.append(node("p", text("reviewScope"), "talent-dates"));
    article.append(node("p", text("confirmed") + ": " + review.updatedAt + " · " + text("expires") + ": " + review.expiresAt, "talent-dates"));
    return article;
  }
  function renderReviews() {
    $("review-error").hidden = !reviewsFailed; $("review-grid").replaceChildren();
    if (!reviewsReady) { $("review-total").textContent = "—"; $("review-count").textContent = text(reviewsFailed ? "reviewError" : "reviewLoading"); $("review-empty").hidden = true; return; }
    const active = M.activeReviews(reviews, M.dateKey(), repository);
    const filtered = active.filter(r => !$("review-status").value || r.status === $("review-status").value);
    $("review-total").textContent = active.length; $("review-count").textContent = text("reviewCount", {visible: filtered.length, total: active.length});
    filtered.forEach(review => $("review-grid").append(reviewCard(review)));
    $("review-empty").hidden = filtered.length > 0;
    $("review-empty-title").textContent = text(active.length ? "noReviewMatches" : "noReviews");
    $("review-empty-description").textContent = text(active.length ? "noReviewMatchesBody" : "noReviewsBody");
  }
  async function readJSON(url) {
    const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 15000);
    try { const response = await fetch(url, {cache:"no-cache", signal:abort.signal}); if (!response.ok) throw new Error("Unavailable"); return await response.json(); }
    finally { clearTimeout(timeout); }
  }
  async function loadPeople() {
    peopleFailed = false; peopleReady = false; renderPeople();
    try { const data = await readJSON("../data.json?v=talent-v1"); if (!Array.isArray(data.people)) throw new Error("Invalid catalog"); people = data.people; if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(data.repository || "")) repository = data.repository; peopleReady = true; setLinks(); }
    catch { peopleFailed = true; }
    renderPeople(); renderReviews();
  }
  async function loadReviews() {
    reviewsFailed = false; reviewsReady = false; renderReviews();
    try { const data = await readJSON("../reviews.json?v=reviews-v1"); if (!Array.isArray(data)) throw new Error("Invalid review catalog"); reviews = data; reviewsReady = true; }
    catch { reviewsFailed = true; }
    renderReviews();
  }
  $("talent-language").addEventListener("click", () => {
    language = language === "zh" ? "en" : "zh";
    try { localStorage.setItem(languageKey, JSON.stringify(language)); } catch { /* Language still works for this visit. */ }
    const url = new URL(location.href); url.searchParams.set("lang", language); history.replaceState(null, "", url);
    translate(); renderPeople(); renderReviews();
  });
  $("talent-search").addEventListener("input", renderPeople);
  ["talent-direction", "talent-work-mode", "talent-selected-only"].forEach(id => $(id).addEventListener("change", renderPeople));
  $("reset-talent").addEventListener("click", () => { $("talent-search").value = ""; $("talent-direction").value = ""; $("talent-work-mode").value = ""; $("talent-selected-only").checked = false; renderPeople(); });
  $("clear-shortlist").addEventListener("click", () => { selected = []; saveSelection(); exportState = ""; renderPeople(); });
  $("export-shortlist").addEventListener("click", () => {
    syncSelection(); if (!peopleReady || !selected.length) { renderPeople(); return; }
    const content = M.shortlistMarkdown(people, selected, language); $("shortlist-source").hidden = false; $("shortlist-markdown").value = content;
    let url;
    try { url = URL.createObjectURL(new Blob([content], {type:"text/markdown;charset=utf-8"})); const a = node("a"); a.href = url; a.download = "jobhub-shortlist-" + M.dateKey() + ".md"; document.body.append(a); a.click(); a.remove(); exportState = "exported"; }
    catch { exportState = "exportFailed"; $("shortlist-source").open = true; }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
    renderShortlist();
  });
  $("review-status").addEventListener("change", renderReviews);
  $("retry-talent").addEventListener("click", loadPeople); $("retry-reviews").addEventListener("click", loadReviews);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { renderPeople(); renderReviews(); } });
  let lastDay = M.dateKey();
  setInterval(() => { if (M.dateKey() !== lastDay) { lastDay = M.dateKey(); renderPeople(); renderReviews(); } }, 60000);
  translate(); setLinks(); loadPeople(); loadReviews();
})();
