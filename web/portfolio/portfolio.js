"use strict";

(() => {
  const prefix = "infra-commons:";
  const draftKey = prefix + "portfolio-draft-v1";
  const form = document.getElementById("portfolio-form");
  const fields = [...document.querySelectorAll("[data-field]")];
  const byName = Object.fromEntries(fields.map(field => [field.dataset.field, field]));
  const translations = {
    zh: {
      wechatTitle: "带着作品，直接聊聊。", wechatDescription: "扫码添加「元智引擎」企业微信，介绍你的技术方向、求职或合作意向，并分享你愿意提供的作品。", wechatPhone: "手机浏览可打开原图保存，再在微信中识别二维码。", wechatScan: "扫码添加企业微信", wechatOriginal: "打开二维码原图 ↗",
      pageTitle: "作品档案生成器 · 聘枢 AI Infra JobHub", skip: "跳到作品表单", brandName: "聘枢", brandTagline: "AI Infra JobHub", navLearn: "学习库", navProjects: "项目实战", navJobs: "工作与合作", backProjects: "← 返回项目实战", title: "让作品，说清你的贡献。", intro: "把真实问题、复现过程和结果边界，整理成一份可带走的项目档案。用于开源 README、作品集或求职沟通。", flow1: "记录真实过程", flow2: "导出 Markdown", flow3: "由你选择分享", localNote: "表单内容不会上传，也不会自动公开或发邮件。草稿仅保存在本浏览器；清除浏览器数据会丢失草稿，请下载备份。", projectPrompt: "来自项目库的写作提示", promptOnly: "仅供参考 · 不填入草稿", promptEvidence: "可整理的证据", promptBoundary: "证据边界", editorTitle: "记录项目", sectionIdentity: "项目与证据范围", fieldTitle: "项目名称", hintTitle: "用具体系统与问题命名，例如「vLLM 共享前缀负载的缓存实验」。", fieldRole: "目标岗位 / 协作方向", hintRole: "写你希望参与的工程问题，例如推理系统、GPU 性能优化、平台工程。", fieldEvidence: "主要证据类型", evidenceChoose: "请选择证据类型", evidenceMeasured: "实测 · 实际运行所得", evidenceSimulated: "模拟 · 简化模型或仿真", evidenceDesign: "设计 · 尚未执行的方案", fieldDate: "记录日期", hintEvidence: "三种形式都可记录。混合项目请在结果中逐条标注，只有实际运行的测量才称为实测。", sectionOwnership: "问题与本人贡献", fieldProblem: "要解决的问题", hintProblem: "说明使用场景、约束和问题为何重要。先描述问题，再描述工具。", fieldContribution: "我的具体贡献", hintContribution: "区分你写的代码、执行的实验、分析与团队或上游已有工作。", sectionReproduce: "可复现的过程", fieldEnvironment: "环境与固定版本", hintEnvironment: "记录硬件、系统、驱动、库版本 / commit、模型 revision 与工作负载。未运行的环境请写「计划」。", fieldMethod: "方法与对照", hintMethod: "写清基线、变量、运行命令、样本量、预热与重复次数，让别人能复查你的比较。", fieldEvidenceLinks: "原始证据 / 日志 / 结果链接", hintLinks: "每行一个公开 HTTPS 链接，指向运行记录、原始结果、图表或代码。分享前检查是否包含凭据或非公开数据。", sectionResults: "结果、边界与下一步", fieldResults: "观察到的结果", hintResults: "写数值、单位、测量条件与不确定性；也可以记录未改善或失败的尝试。模拟结果和预期收益请明确标注。", fieldLimitations: "限制与尚未验证的部分", hintLimitations: "例如缺少多节点环境、负载覆盖有限、无法复现的结果。不把单次实验推广为生产结论。", fieldNext: "下一步 / 待复现项", hintNext: "列出最值得继续验证的假设、工程改进，或希望获得的协作帮助。", fieldRepository: "公开仓库链接", hintRepository: "仅支持 HTTPS。暂未公开可以留空；有固定 commit 或 release 链接更方便复查。", saveDraft: "保存草稿", autosaveNote: "编辑时自动保存；保存失败时可在此重试。切换语言不会翻译或更改你的输入。", previewTitle: "作品预览", livePreview: "实时更新", previewNote: "输入会原样呈现，不生成未经验证的成果。空白字段会标为「未记录」。", copyMarkdown: "复制 Markdown", downloadMarkdown: "下载 .md ↓", markdownSource: "查看 Markdown 源文 / 手动复制", markdownLabel: "可选择并复制的 Markdown", nextTitle: "作品准备好，再选择下一步。", nextNote: "先将档案放入你选择的公开仓库或作品集，再主动提交名片。邮件投递由你在邮件客户端中确认。", shareProfile: "主动公开作品名片", emailPortfolio: "投递简历与作品", footerNote: "聘枢 · AI Infra JobHub。用真实的工程记录，连接下一次合作。", backLearning: "继续学习 ↗", emptyDraft: "编辑后自动保存到本浏览器", restoredDraft: "已恢复本浏览器的草稿", savedDraft: "已保存在本浏览器", saveError: "草稿暂时无法保存。输入仍在当前页面，请下载备份后再离开。", readError: "无法读取本地草稿。当前编辑仍可使用，请及时下载备份。", missing: "未记录", untitled: "未命名项目", declaration: "本文为本人整理的项目记录。实测、模拟与设计应分别标注；不代表平台认证。", invalidRepository: "仅支持有效 HTTPS 链接。原输入仍保留在草稿中，但不会作为链接导出。", invalidEvidence: "部分行不是有效 HTTPS 链接。原输入保留在草稿；导出仅包含有效链接，并注明遗漏。", omittedLinks: "有无效或非 HTTPS 的链接未纳入导出，请回到草稿检查。", copied: "Markdown 已复制，可粘贴到 README 或作品集。", copyFallback: "无法自动复制。已展开 Markdown 源文，请全选后手动复制。", downloadStarted: "已请求下载 Markdown，请检查浏览器下载记录。", downloadFailed: "无法开始下载。请复制下方 Markdown 源文保存。", projectUnavailable: "未能加载该项目提示。你仍可独立编辑和导出，草稿不会受影响。", projectLoading: "正在读取项目写作提示…", exportOrigin: "整理于 聘枢 · AI Infra JobHub", languageUnsaved: "语言已切换；浏览器未能保存语言偏好。"
    },
    en: {
      wechatTitle: "Start a conversation with your work.", wechatDescription: "Scan to connect with 元智引擎 on WeCom. Introduce your technical focus, career or collaboration interests, and the work you choose to share.", wechatPhone: "On mobile, open and save the original image, then recognize the QR code in WeChat.", wechatScan: "Scan to connect on WeCom", wechatOriginal: "Open the original QR image ↗",
      pageTitle: "Portfolio builder · AI Infra JobHub", skip: "Skip to the project form", brandName: "AI Infra JobHub", brandTagline: "聘枢 · Learn. Build. Connect.", navLearn: "Learning library", navProjects: "Build projects", navJobs: "Work & collaboration", backProjects: "← Back to projects", title: "Make your contribution visible.", intro: "Turn a real problem, a reproducible process and honest limitations into a portable project record for a README, portfolio or job conversation.", flow1: "Record the real work", flow2: "Export Markdown", flow3: "Choose what to share", localNote: "Your form content is never uploaded, published or emailed automatically. Drafts stay in this browser; clearing browser data removes them. Download a backup.", projectPrompt: "Writing prompts from the project library", promptOnly: "Reference only · never fills your draft", promptEvidence: "Evidence you can collect", promptBoundary: "What the evidence can support", editorTitle: "Your project record", sectionIdentity: "Project and evidence scope", fieldTitle: "Project name", hintTitle: "Name the system and the problem, such as “vLLM cache experiments with shared-prefix workloads”.", fieldRole: "Target role / collaboration area", hintRole: "Name the engineering work you want to do: inference systems, GPU performance, platform engineering, or another area.", fieldEvidence: "Primary evidence type", evidenceChoose: "Choose an evidence type", evidenceMeasured: "Measured · from an actual run", evidenceSimulated: "Simulated · model or simulation", evidenceDesign: "Design · not yet executed", fieldDate: "Record date", hintEvidence: "All three types belong here. For mixed projects, label each result separately. Call it measured only when you actually ran it.", sectionOwnership: "The problem and your contribution", fieldProblem: "Problem to solve", hintProblem: "Describe the scenario, constraints and why it matters. Explain the problem before the tool.", fieldContribution: "My specific contribution", hintContribution: "Separate code, experiments and analysis you did from existing team or upstream work.", sectionReproduce: "A reproducible process", fieldEnvironment: "Environment and pinned versions", hintEnvironment: "Record hardware, OS, drivers, library versions / commits, model revision and workload. Mark unexecuted environments as planned.", fieldMethod: "Method and baseline", hintMethod: "Describe the baseline, variables, commands, sample size, warmup and repetitions so others can check the comparison.", fieldEvidenceLinks: "Raw evidence / logs / result links", hintLinks: "One public HTTPS link per line: run logs, raw results, charts or code. Check for credentials or nonpublic data before sharing.", sectionResults: "Results, limitations and next steps", fieldResults: "Observed results", hintResults: "Include values, units, conditions and uncertainty, including failed attempts. Label simulations and expected improvements explicitly.", fieldLimitations: "Limitations and unverified claims", hintLimitations: "For example: no multi-node hardware, limited workload coverage or unreproduced results. A single experiment is not a production conclusion.", fieldNext: "Next steps / work to reproduce", hintNext: "List the next hypothesis to test, engineering improvements or collaboration you need.", fieldRepository: "Public repository URL", hintRepository: "HTTPS only. Leave blank if it is not public yet. A pinned commit or release helps others verify the work.", saveDraft: "Save draft", autosaveNote: "Edits save automatically; use this button to retry a failed save. Switching language never translates or changes your input.", previewTitle: "Project preview", livePreview: "Live preview", previewNote: "Your own words are shown as text. No achievements are invented; blank fields say “Not recorded”.", copyMarkdown: "Copy Markdown", downloadMarkdown: "Download .md ↓", markdownSource: "View Markdown / copy manually", markdownLabel: "Markdown text you can select and copy", nextTitle: "Ready to share? Choose your next step.", nextNote: "Add the record to a public repository or portfolio you choose, then submit your profile yourself. Confirm email applications in your mail client.", shareProfile: "Share a public project profile", emailPortfolio: "Send a resume and portfolio", footerNote: "AI Infra JobHub · 聘枢. Connect through an honest record of your engineering work.", backLearning: "Continue learning ↗", emptyDraft: "Edits save in this browser", restoredDraft: "Restored this browser's draft", savedDraft: "Saved in this browser", saveError: "Your draft could not be saved. Your input is still on this page; download a backup before leaving.", readError: "The local draft could not be read. You can still edit and export; download a backup of your work.", missing: "Not recorded", untitled: "Untitled project", declaration: "This is a self-authored project record. Label measured, simulated and planned work separately. It is not a platform certification.", invalidRepository: "Enter a valid HTTPS URL. The original stays in your draft, but is not exported as a link.", invalidEvidence: "Some lines are not valid HTTPS URLs. Originals stay in your draft; only valid links are exported, with an omission note.", omittedLinks: "Invalid or non-HTTPS URLs were omitted. Check the original draft before sharing.", copied: "Markdown copied. Paste it into a README or portfolio.", copyFallback: "Automatic copy is unavailable. Markdown is expanded below; select it and copy manually.", downloadStarted: "Markdown download requested. Check your browser's downloads.", downloadFailed: "The download could not start. Copy the Markdown below to save your record.", projectUnavailable: "This project's prompts could not be loaded. You can still edit and export; your draft is unaffected.", projectLoading: "Loading project writing prompts…", exportOrigin: "Prepared with AI Infra JobHub · 聘枢", languageUnsaved: "Language changed; the browser could not save the preference."
    }
  };
  let lang = "zh";
  try { if (JSON.parse(localStorage.getItem(prefix + "language")) === "en") lang = "en"; } catch {}
  const queryLanguage = new URLSearchParams(location.search).get("lang");
  if (queryLanguage === "en" || queryLanguage === "zh") lang = queryLanguage;
  let saveState = "emptyDraft";
  let project = null;
  let projectLoadState = "";
  let markdown = "";
  const text = key => translations[lang][key];
  const today = new Date();
  byName.recordDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Copy only known string fields. Stored objects cannot inject markup or keys.
  try {
    const raw = localStorage.getItem(draftKey);
    if (raw !== null) {
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== 1 || !saved.fields || typeof saved.fields !== "object" || Array.isArray(saved.fields)) throw new Error("Unsupported draft");
      for (const field of fields) {
        const value = saved.fields[field.dataset.field];
        if (typeof value === "string") field.value = value;
      }
      if (!["", "measured", "simulated", "design"].includes(byName.evidenceType.value)) byName.evidenceType.value = "";
      saveState = "restoredDraft";
    }
  } catch {
    saveState = "readError";
  }

  function values() {
    return Object.fromEntries(fields.map(field => [field.dataset.field, field.value]));
  }

  function safeHttps(value) {
    try {
      const url = new URL(value.trim());
      if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
      return url.href;
    } catch { return null; }
  }

  // Export user prose as prose, not active HTML or authored Markdown links.
  function escapeMarkdown(value) {
    return value.replace(/\r\n?/g, "\n").replace(/[\\`*_[\]{}<>#!|]/g, "\\$&").replace(/^(\s*)([-+])(?=\s)/gm, "$1\\$2");
  }

  function evidenceLabel(value) {
    return text({ measured: "evidenceMeasured", simulated: "evidenceSimulated", design: "evidenceDesign" }[value] || "missing");
  }

  function sections(record) {
    const links = record.evidenceLinks.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const safeLinks = links.map(safeHttps).filter(Boolean);
    const repository = safeHttps(record.repository);
    const linkWarning = safeLinks.length !== links.length;
    return [
      ["fieldRole", record.targetRole],
      ["fieldProblem", record.problem],
      ["fieldContribution", record.contribution],
      ["fieldEnvironment", record.environment],
      ["fieldMethod", record.method],
      ["fieldEvidenceLinks", safeLinks.join("\n"), linkWarning],
      ["fieldResults", record.results],
      ["fieldLimitations", record.limitations],
      ["fieldNext", record.nextSteps],
      ["fieldRepository", repository || "", Boolean(record.repository.trim() && !repository)]
    ];
  }

  function buildMarkdown(record, entries) {
    const title = record.projectTitle.trim().replace(/\s+/g, " ") || text("untitled");
    const lines = [
      `# ${escapeMarkdown(title)}`, "",
      `${text("fieldDate")}: ${escapeMarkdown(record.recordDate || text("missing"))}`,
      `${text("fieldEvidence")}: ${evidenceLabel(record.evidenceType)}`, "",
      `> ${text("declaration")}`, ""
    ];
    for (const [label, content, omitted] of entries) {
      const isLink = label === "fieldEvidenceLinks" || label === "fieldRepository";
      const body = content.trim() ? isLink ? content.split("\n").map(url => `<${url.replace(/</g, "%3C").replace(/>/g, "%3E")}>`).join("\n") : escapeMarkdown(content.trim()) : text("missing");
      lines.push(`## ${text(label)}`, "", body, "");
      if (omitted) lines.push(`> ${text("omittedLinks")}`, "");
    }
    lines.push("---", "", text("exportOrigin"), "");
    return lines.join("\n");
  }

  function appendText(parent, tag, value, className) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    parent.append(element);
    return element;
  }

  function renderPreview() {
    const record = values();
    const entries = sections(record);
    markdown = buildMarkdown(record, entries);
    document.getElementById("markdown-source").value = markdown;
    const preview = document.getElementById("portfolio-preview");
    preview.replaceChildren();
    appendText(preview, "h3", record.projectTitle.trim() || text("untitled"));
    appendText(preview, "p", `${text("fieldDate")}: ${record.recordDate || text("missing")}\n${text("fieldEvidence")}: ${evidenceLabel(record.evidenceType)}`, "portfolio-document-meta");
    for (const [label, content, omitted] of entries) {
      const section = document.createElement("section");
      appendText(section, "h4", text(label));
      appendText(section, "p", content.trim() || text("missing"), content.trim() ? "" : "is-empty");
      if (omitted) appendText(section, "p", text("omittedLinks"));
      preview.append(section);
    }
    const invalidRepository = Boolean(record.repository.trim() && !safeHttps(record.repository));
    const invalidLinks = record.evidenceLinks.split(/\r?\n/).some(line => line.trim() && !safeHttps(line));
    for (const [name, id, invalid, message] of [
      ["repository", "repository-error", invalidRepository, "invalidRepository"],
      ["evidenceLinks", "evidence-links-error", invalidLinks, "invalidEvidence"]
    ]) {
      byName[name].setAttribute("aria-invalid", String(invalid));
      const error = document.getElementById(id);
      error.hidden = !invalid;
      error.textContent = invalid ? text(message) : "";
    }
  }

  function renderSaveStatus() {
    const status = document.getElementById("draft-status");
    status.dataset.state = /Error$/.test(saveState) ? "error" : "saved";
    if (status.textContent !== text(saveState)) status.textContent = text(saveState);
  }

  function saveDraft() {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), fields: values() }));
      saveState = "savedDraft";
    } catch {
      saveState = "saveError";
    }
    renderSaveStatus();
  }

  function localized(value) {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") return typeof value[lang] === "string" ? value[lang] : typeof value.zh === "string" ? value.zh : typeof value.en === "string" ? value.en : "";
    return "";
  }

  function renderProject() {
    const status = document.getElementById("project-load-status");
    status.hidden = !projectLoadState;
    status.textContent = projectLoadState ? text(projectLoadState) : "";
    const context = document.getElementById("project-context");
    context.hidden = !project;
    if (!project) return;
    document.getElementById("project-context-title").textContent = localized(project.title);
    document.getElementById("project-context-goal").textContent = localized(project.summary);
    document.getElementById("project-context-boundary").textContent = localized(project.evidenceBoundary);
    const list = document.getElementById("project-context-evidence");
    list.replaceChildren();
    const evidence = project.deliverables && (project.deliverables[lang] || project.deliverables.zh || project.deliverables.en);
    if (Array.isArray(evidence)) evidence.filter(item => typeof item === "string").forEach(item => appendText(list, "li", item));
  }

  function translate() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = text("pageTitle");
    document.querySelectorAll("[data-i18n]").forEach(element => {
      const translated = text(element.dataset.i18n);
      if (translated) element.textContent = translated;
    });
    const toggle = document.getElementById("portfolio-language");
    toggle.textContent = lang === "zh" ? "EN ↗" : "中文 ↗";
    toggle.setAttribute("aria-label", lang === "zh" ? "Switch to English" : "切换为中文");
    renderSaveStatus();
    renderPreview();
    renderProject();
  }

  function showManualCopy(message) {
    document.getElementById("export-status").textContent = text(message);
    document.getElementById("markdown-details").open = true;
    const source = document.getElementById("markdown-source");
    source.focus();
    source.select();
  }

  form.addEventListener("submit", event => event.preventDefault());
  const edited = () => {
    renderPreview();
    saveDraft();
    document.getElementById("export-status").textContent = "";
  };
  form.addEventListener("input", edited);
  form.addEventListener("change", edited);
  document.getElementById("save-draft").addEventListener("click", saveDraft);
  document.getElementById("portfolio-language").addEventListener("click", () => {
    lang = lang === "zh" ? "en" : "zh";
    const url = new URL(location.href);
    url.searchParams.delete("lang");
    history.replaceState(null, "", url);
    translate();
    document.getElementById("export-status").textContent = "";
    try { localStorage.setItem(prefix + "language", JSON.stringify(lang)); }
    catch { document.getElementById("export-status").textContent = text("languageUnsaved"); }
  });
  document.getElementById("copy-markdown").addEventListener("click", async () => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(markdown);
      document.getElementById("export-status").textContent = text("copied");
    } catch { showManualCopy("copyFallback"); }
  });
  document.getElementById("download-markdown").addEventListener("click", () => {
    let url;
    try {
      url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
      const anchor = document.createElement("a");
      const base = byName.projectTitle.value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "-").slice(0, 80) || "ai-infra-portfolio";
      anchor.href = url;
      anchor.download = `${base}.md`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      document.getElementById("export-status").textContent = text("downloadStarted");
    } catch { showManualCopy("downloadFailed"); }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  });

  // Project context is read-only guidance. It never assigns a form value or
  // writes a draft, even when the fetch completes after the user starts typing.
  const projectId = new URLSearchParams(location.search).get("project");
  if (projectId) {
    projectLoadState = "projectLoading";
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 8000) : null;
    Promise.resolve().then(() => fetch("../projects/projects.json", controller ? { signal: controller.signal } : {}))
      .then(response => {
        if (!response.ok) throw new Error("Project catalog unavailable");
        return response.json();
      })
      .then(catalog => {
        const projects = Array.isArray(catalog) ? catalog : catalog.projects;
        project = Array.isArray(projects) ? projects.find(item => item && item.id === projectId) || null : null;
        projectLoadState = project ? "" : "projectUnavailable";
        renderProject();
      })
      .catch(() => { projectLoadState = "projectUnavailable"; renderProject(); })
      .finally(() => { if (timeout !== null) clearTimeout(timeout); });
  }
  translate();
  ["save-draft", "copy-markdown", "download-markdown"].forEach(id => { document.getElementById(id).disabled = false; });
})();
