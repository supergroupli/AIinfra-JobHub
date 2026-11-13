"use strict";

(() => {
  const languageKey = "infra-commons:language";
  const strings = {
    zh: {
      brandName: "聘枢", brandTagline: "AI Infra JobHub", skip: "跳到项目库", navLearn: "学习库", navProjects: "实战项目", navPortfolio: "作品档案", navJobs: "工作与合作",
      pageTitle: "实战项目库 · 聘枢 · AI Infra JobHub", loading: "正在准备实战项目…", loadError: "项目数据暂时未能加载，请重试。", retry: "重新加载",
      eyebrow: "BUILD IN PUBLIC · 用作品说话", heroTitle: "把学到的知识，做成可复现的作品。", heroDescription: "从一个明确的问题出发，写代码、保留实验记录，再把工程判断放进作品档案。每个挑战都有步骤、交付物和验收标准。", explore: "挑选一个挑战", openPortfolio: "整理我的作品档案 ↗",
      proof1: "固定条件", proof1Note: "版本 / 设备 / 请求集", proof2: "留下证据", proof2Note: "代码 / 原始日志 / 结果", proof3: "让别人复现", proof3Note: "步骤 / 局限 / 下一步", stackFoot: "结果没有变快，也可以是一份好作品。",
      metricProjects: "个工程挑战", metricCpu: "个可从 CPU 起步", metricEvidenceValue: "原始证据", metricEvidence: "每个结论都能找到来源", libraryTitle: "选一个值得解决的问题。", backLearn: "先补齐学习路线 ↗",
      searchLabel: "搜索技术、问题与岗位", searchPlaceholder: "vLLM、背压、GPU 内核…", directionLabel: "技术方向", allDirections: "所有方向", inference: "推理与性能", kernels: "GPU 内核", distributed: "分布式系统", platform: "平台与可靠性", cpuOnly: "可从 CPU 起步", gpuRequired: "需 GPU 实测", reset: "清空筛选",
      emptyTitle: "还没有匹配这个条件的挑战", emptyDescription: "试试更短的技术关键词，或放宽方向与硬件条件。", libraryNote: "“CPU 起步”表示能完成有意义的本地实验，不代表整个 GPU 扩展已经验证。预计用时不含安装排障、硬件等待与模型下载。",
      endEyebrow: "02 / MAKE YOUR WORK LEGIBLE", endTitle: "让下一位合作伙伴看懂你的工程判断。", endDescription: "记录你负责的部分、保留原始证据、坦诚写出限制。项目可以连接学习路线与作品档案，也可以成为一次有内容的技术交流。", createPortfolio: "生成作品档案 ↗", footerNote: "独立社区项目；挑战完成情况由学习者自述，不代表认证或雇主背书。",
      projectCount: "个挑战", viewProject: "查看挑战 ↗", backProjects: "← 返回项目库", share: "复制项目链接", copied: "项目链接已复制。", copyFallback: "请选中并复制此链接：", problem: "要解决的问题", scenario: "工程场景", environment: "实验环境", steps: "动手路径", deliverables: "交付物与原始证据", acceptance: "验收标准", boundary: "测量与模拟的边界", prerequisites: "先修课程", roles: "对应岗位", sources: "官方资料", updated: "资料核对", portfolioTitle: "把过程变成作品档案", portfolioNote: "用真实记录填写你负责的部分、环境、结果与限制；不会自动发布。", feedback: "报告阻塞 / 提交复现记录 ↗", feedbackNote: "前往 GitHub 创建反馈草稿，由你检查后提交。", missingTitle: "没有找到这个项目", missingDescription: "项目链接可能已更改。返回项目库可查看当前全部挑战。", estimate: "预计投入", detailNote: "验收是自我检查与复现清单，不是平台认证。"
    },
    en: {
      brandName: "AI Infra JobHub", brandTagline: "聘枢 · Learn. Build. Connect.", skip: "Skip to projects", navLearn: "Learn", navProjects: "Projects", navPortfolio: "Portfolio", navJobs: "Opportunities",
      pageTitle: "Engineering projects · AI Infra JobHub", loading: "Preparing engineering projects…", loadError: "Project data could not be loaded. Please try again.", retry: "Try again",
      eyebrow: "BUILD IN PUBLIC · SHOW YOUR WORK", heroTitle: "Turn what you learn into work others can reproduce.", heroDescription: "Start with a concrete problem, write code and preserve experiment records. Every challenge includes steps, deliverables and acceptance criteria for your engineering portfolio.", explore: "Choose a challenge", openPortfolio: "Build my portfolio ↗",
      proof1: "Fix the conditions", proof1Note: "Versions / devices / requests", proof2: "Keep the evidence", proof2Note: "Code / raw logs / results", proof3: "Make it reproducible", proof3Note: "Steps / limits / next move", stackFoot: "A result without a speedup can still be good work.",
      metricProjects: "engineering challenges", metricCpu: "can start on CPUs", metricEvidenceValue: "Raw evidence", metricEvidence: "Trace every conclusion to its source", libraryTitle: "Choose a problem worth solving.", backLearn: "Build the foundations first ↗",
      searchLabel: "Search technologies, problems and roles", searchPlaceholder: "vLLM, backpressure, GPU kernels…", directionLabel: "Engineering direction", allDirections: "All directions", inference: "Inference & performance", kernels: "GPU kernels", distributed: "Distributed systems", platform: "Platforms & reliability", cpuOnly: "Can start on CPUs", gpuRequired: "GPU measurement needed", reset: "Clear filters",
      emptyTitle: "No challenges match these filters", emptyDescription: "Try a shorter keyword or broaden the direction and hardware filters.", libraryNote: "“Can start on CPUs” means meaningful local experiments are possible, not that a GPU extension has been validated. Time estimates exclude setup issues, hardware waits and model downloads.",
      endEyebrow: "02 / MAKE YOUR WORK LEGIBLE", endTitle: "Help your next collaborator understand your engineering decisions.", endDescription: "Describe your own contribution, keep the raw evidence and explain limitations. Connect your learning to a portfolio and a useful technical conversation.", createPortfolio: "Build a portfolio ↗", footerNote: "An independent community project. Completion is self-reported, not a certification or employer endorsement.",
      projectCount: "challenges", viewProject: "View challenge ↗", backProjects: "← All projects", share: "Copy project link", copied: "Project link copied.", copyFallback: "Select and copy this link:", problem: "The problem", scenario: "Engineering scenario", environment: "Experiment environment", steps: "Implementation path", deliverables: "Deliverables & raw evidence", acceptance: "Acceptance criteria", boundary: "Measurement & simulation boundaries", prerequisites: "Prerequisites", roles: "Relevant roles", sources: "Official references", updated: "References checked", portfolioTitle: "Turn the process into a portfolio", portfolioNote: "Use actual records to describe your contribution, environment, results and limitations. Nothing is published automatically.", feedback: "Report a blocker / share a reproduction ↗", feedbackNote: "Opens a GitHub feedback draft for you to review and submit.", missingTitle: "Project not found", missingDescription: "This project link may have changed. Return to the library to browse current challenges.", estimate: "Estimated effort", detailNote: "These criteria support self-checks and reproduction; they are not platform certification."
    }
  };

  const storedLanguage = () => {
    try { return JSON.parse(localStorage.getItem(languageKey)); }
    catch { return null; }
  };
  const queryLanguage = new URLSearchParams(location.search).get("lang");
  let language = ["zh", "en"].includes(queryLanguage) ? queryLanguage : storedLanguage() === "en" ? "en" : "zh";
  if (["zh", "en"].includes(queryLanguage)) {
    try { localStorage.setItem(languageKey, JSON.stringify(language)); } catch { /* The URL still selects this page's language. */ }
  }
  let projects = [];
  let updatedAt = "";
  let loaded = false;
  let loadSequence = 0;
  const text = key => strings[language][key] || key;
  const local = value => value?.[language] ?? "";
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[character]));
  const safeSource = value => {
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : "#"; }
    catch { return "#"; }
  };
  const idIsSafe = value => typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  const projectHref = id => `?project=${encodeURIComponent(id)}&lang=${language}`;
  const portfolioHref = id => `../portfolio/?project=${encodeURIComponent(id)}&lang=${language}`;
  const courseHref = id => `../learn/${encodeURIComponent(id)}/?lang=${language}`;
  const requestedProject = () => new URLSearchParams(location.search).get("project");
  const list = (items, className) => `<ul class="${className}">${items.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`;

  function projectURL(id) {
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("project", id);
    url.searchParams.set("lang", language);
    return url.href;
  }

  function translate() {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = text(element.dataset.i18n); });
    document.querySelectorAll("[data-placeholder]").forEach(element => { element.placeholder = text(element.dataset.placeholder); });
    const toggle = document.getElementById("projects-language");
    toggle.textContent = language === "zh" ? "EN ↗" : "中文 ↗";
    toggle.setAttribute("aria-label", language === "zh" ? "Switch to English" : "切换为中文");
    if (loaded) renderRoute(false);
    else document.title = text("pageTitle");
  }

  function renderCatalog() {
    const query = document.getElementById("project-search").value.trim().toLocaleLowerCase();
    const category = document.getElementById("project-direction").value;
    const cpuOnly = document.getElementById("project-cpu").checked;
    const filtered = projects.filter(project => {
      const haystack = [project.id, project.category, strings.zh[project.category], strings.en[project.category], ...Object.values(project.title), ...Object.values(project.summary), ...project.tags, ...project.roles.zh, ...project.roles.en].join(" ").toLocaleLowerCase();
      return (!query || haystack.includes(query)) && (!category || project.category === category) && (!cpuOnly || project.cpuStart);
    });
    document.getElementById("total-projects").textContent = projects.length;
    document.getElementById("cpu-projects").textContent = projects.filter(project => project.cpuStart).length;
    document.getElementById("project-count").textContent = `${filtered.length} / ${projects.length} ${text("projectCount")}`;
    document.getElementById("project-empty").hidden = filtered.length !== 0;
    document.getElementById("project-grid").innerHTML = filtered.map(project => `
      <article class="project-card">
        <div class="project-card-top"><span class="project-category mono">${escapeHTML(text(project.category))}</span><span class="project-hardware ${project.cpuStart ? "cpu" : ""}">${escapeHTML(text(project.cpuStart ? "cpuOnly" : "gpuRequired"))}</span></div>
        <h3><a href="${projectHref(project.id)}" data-open-project="${escapeHTML(project.id)}">${escapeHTML(local(project.title))}</a></h3>
        <p class="project-summary">${escapeHTML(local(project.summary))}</p>
        <div class="tags">${project.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div>
        <p class="project-card-roles">${escapeHTML(local(project.roles).join(" · "))}</p>
        <div class="project-card-bottom"><span>${escapeHTML(local(project.duration))} · ${escapeHTML(local(project.level))}</span><a href="${projectHref(project.id)}" data-open-project="${escapeHTML(project.id)}" aria-label="${escapeHTML(`${text("viewProject")} ${local(project.title)}`)}">${escapeHTML(text("viewProject"))}</a></div>
      </article>`).join("");
  }

  function renderDetail(project) {
    const detail = document.getElementById("detail-view");
    if (!project) {
      document.title = `${text("missingTitle")} · AI Infra JobHub`;
      detail.innerHTML = `<div class="empty-state"><h1 id="project-title" tabindex="-1">${escapeHTML(text("missingTitle"))}</h1><p>${escapeHTML(text("missingDescription"))}</p><a class="button primary" href="./" data-back-projects>${escapeHTML(text("backProjects"))}</a></div>`;
      return;
    }
    document.title = `${local(project.title)} · AI Infra JobHub`;
    const feedbackURL = `https://github.com/supergroupli/AIinfra-JobHub/issues/new?template=03-project-feedback.yml&target=${encodeURIComponent(projectURL(project.id))}`;
    detail.innerHTML = `
      <div class="project-detail-toolbar"><a class="text-link" href="./" data-back-projects>${escapeHTML(text("backProjects"))}</a><button type="button" class="text-button share-project" id="share-project">${escapeHTML(text("share"))}</button><p id="project-share-status" class="project-share-status" role="status" aria-live="polite"></p></div>
      <header class="project-detail-header"><div class="eyebrow">BUILD / ${escapeHTML(text(project.category))}</div><h1 id="project-title" tabindex="-1">${escapeHTML(local(project.title))}</h1><p class="project-intro">${escapeHTML(local(project.summary))}</p><div class="project-detail-meta"><span class="project-hardware ${project.cpuStart ? "cpu" : ""}">${escapeHTML(text(project.cpuStart ? "cpuOnly" : "gpuRequired"))}</span><span>${escapeHTML(local(project.level))}</span><span>${escapeHTML(text("estimate"))} · ${escapeHTML(local(project.duration))}</span></div></header>
      <div class="project-detail-layout"><div class="project-detail-body">
        <section class="project-section"><h2>${escapeHTML(text("problem"))}</h2><p>${escapeHTML(local(project.problem))}</p><span class="scenario-label">${escapeHTML(text("scenario"))}</span><p>${escapeHTML(local(project.scenario))}</p></section>
        <section class="project-section"><h2>${escapeHTML(text("environment"))}</h2><p>${escapeHTML(local(project.environment))}</p></section>
        <section class="project-section"><h2>${escapeHTML(text("steps"))}</h2><ol class="project-steps">${project.steps.map(step => `<li><h3>${escapeHTML(local(step.title))}</h3><p>${escapeHTML(local(step.body))}</p></li>`).join("")}</ol></section>
        <section class="project-section"><h2>${escapeHTML(text("deliverables"))}</h2>${list(local(project.deliverables), "project-bullets")}</section>
        <section class="project-section"><h2>${escapeHTML(text("acceptance"))}</h2>${list(local(project.acceptance), "project-checks")}<p class="project-library-note">${escapeHTML(text("detailNote"))}</p></section>
        <section class="project-section project-boundary"><h2>${escapeHTML(text("boundary"))}</h2><p>${escapeHTML(local(project.evidenceBoundary))}</p></section>
        <div class="project-detail-footer"><a class="text-link" href="./" data-back-projects>${escapeHTML(text("backProjects"))}</a></div>
      </div><aside class="project-sidebar">
        <section class="project-side-panel"><h2>${escapeHTML(text("portfolioTitle"))}</h2><p>${escapeHTML(text("portfolioNote"))}</p><a class="button primary" href="${portfolioHref(project.id)}">${escapeHTML(text("createPortfolio"))}</a><div class="project-feedback"><a href="${escapeHTML(feedbackURL)}" target="_blank" rel="noopener noreferrer">${escapeHTML(text("feedback"))}</a><p>${escapeHTML(text("feedbackNote"))}</p></div></section>
        <section class="project-side-panel"><h2>${escapeHTML(text("prerequisites"))}</h2><ul>${project.prerequisites.filter(course => idIsSafe(course.id)).map(course => `<li><a href="${courseHref(course.id)}">${escapeHTML(local(course.title))} ↗</a></li>`).join("")}</ul><p class="side-label">${escapeHTML(text("roles"))}</p>${list(local(project.roles), "project-role-list")}</section>
        <section class="project-side-panel"><h2>${escapeHTML(text("sources"))}</h2><ul class="project-source-list">${project.sources.map(source => `<li><a href="${escapeHTML(safeSource(source.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.title)} ↗</a></li>`).join("")}</ul><p class="project-source-date">${escapeHTML(text("updated"))} · ${escapeHTML(updatedAt)}</p></section>
      </aside></div>`;
    document.getElementById("share-project").addEventListener("click", async () => {
      const status = document.getElementById("project-share-status");
      const url = projectURL(project.id);
      try { await navigator.clipboard.writeText(url); status.textContent = text("copied"); }
      catch { status.textContent = `${text("copyFallback")} ${url}`; }
    });
  }

  function renderRoute(moveFocus) {
    const id = requestedProject();
    document.getElementById("catalog-view").hidden = Boolean(id);
    document.getElementById("detail-view").hidden = !id;
    if (id) renderDetail(projects.find(project => project.id === id));
    else { document.title = text("pageTitle"); renderCatalog(); }
    if (moveFocus) {
      const heading = document.getElementById(id ? "project-title" : "catalog-title");
      heading.setAttribute("tabindex", "-1");
      heading.focus({preventScroll: true});
      window.scrollTo({top: 0, behavior: "auto"});
    }
  }

  function navigate(id) {
    const url = new URL(location.href);
    id ? url.searchParams.set("project", id) : url.searchParams.delete("project");
    url.searchParams.set("lang", language);
    url.hash = "";
    history.pushState(null, "", url);
    renderRoute(true);
  }

  async function loadProjects() {
    const sequence = ++loadSequence;
    document.getElementById("project-load-error").hidden = true;
    document.getElementById("project-loading").hidden = false;
    try {
      const response = await fetch("./projects.json");
      if (!response.ok) throw new Error("Project data unavailable");
      const data = await response.json();
      if (data.schemaVersion !== 1 || !Array.isArray(data.projects) || !data.projects.length || data.projects.some(project => !idIsSafe(project.id))) throw new Error("Invalid project data");
      if (sequence !== loadSequence) return;
      projects = data.projects;
      updatedAt = data.updatedAt;
      loaded = true;
      renderRoute(false);
    } catch {
      if (sequence !== loadSequence) return;
      loaded = false;
      document.getElementById("catalog-view").hidden = true;
      document.getElementById("detail-view").hidden = true;
      document.getElementById("project-load-error").hidden = false;
    } finally {
      if (sequence === loadSequence) document.getElementById("project-loading").hidden = true;
    }
  }

  function resetFilters() {
    document.getElementById("project-search").value = "";
    document.getElementById("project-direction").value = "";
    document.getElementById("project-cpu").checked = false;
    if (loaded) renderCatalog();
  }

  document.getElementById("project-search").addEventListener("input", () => { if (loaded) renderCatalog(); });
  ["project-direction", "project-cpu"].forEach(id => document.getElementById(id).addEventListener("change", () => { if (loaded) renderCatalog(); }));
  ["reset-projects", "reset-empty"].forEach(id => document.getElementById(id).addEventListener("click", resetFilters));
  document.getElementById("retry-projects").addEventListener("click", loadProjects);
  document.getElementById("projects-language").addEventListener("click", () => {
    language = language === "zh" ? "en" : "zh";
    try { localStorage.setItem(languageKey, JSON.stringify(language)); } catch { /* Language still works for this page. */ }
    const url = new URL(location.href);
    url.searchParams.set("lang", language);
    history.replaceState(null, "", url);
    translate();
  });
  document.addEventListener("click", event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const open = event.target.closest("a[data-open-project]");
    const back = event.target.closest("a[data-back-projects]");
    if (!loaded || (!open && !back)) return;
    event.preventDefault();
    navigate(open ? open.dataset.openProject : null);
  });
  window.addEventListener("popstate", () => {
    const requested = new URLSearchParams(location.search).get("lang");
    if (["zh", "en"].includes(requested)) language = requested;
    translate();
  });
  window.addEventListener("storage", event => {
    if (event.key !== languageKey) return;
    const stored = storedLanguage();
    if (!["zh", "en"].includes(stored)) return;
    language = stored;
    const url = new URL(location.href);
    url.searchParams.set("lang", language);
    history.replaceState(null, "", url);
    translate();
  });
  translate();
  loadProjects();
})();
