"use strict";

const $ = (selector) => document.querySelector(selector);
const h = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = (value) => {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? h(url.href) : "#"; }
  catch { return "#"; }
};
const storage = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(`infra-commons:${key}`)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`infra-commons:${key}`, JSON.stringify(value)); } catch { /* Progress remains available for this visit. */ } }
};
const savedProgress = storage.get("course-progress-v2", []);
const state = {lang: storage.get("language", "zh") === "en" ? "en" : "zh", data: null, skills: new Set(), query: "", workMode: "", courseQuery: "", category: "", level: "", hardware: "", path: "", requirement: "", progress: new Set(Array.isArray(savedProgress) ? savedProgress.filter(x => typeof x === "string") : [])};
const technologies = ["vLLM", "SGLang", "LMCache", "Mooncake", "Dynamo", "KV Cache", "Serving", "CUDA", "Triton", "PyTorch", "Ray", "NCCL", "Kubernetes", "Distributed Systems", "Observability", "RSI"];
const messages = {
  zh: {
    rsiBadge:"新增 · 共同进阶必修", rsiTitle:"RSI Infra：20 天搭建可验证的改进闭环", rsiBody:"从任务契约、候选生成和独立评测，到经验积累、相同预算消融与回滚。普通电脑即可开始，完成一份带原始证据的结课报告。", rsiAction:"进入 RSI Infra 必修课 ↗",
    knowledgeTitle:"原理知识库", knowledgeBody:"把调度、内存、通信和可靠性连起来，用逐步算例读懂取舍。", knowledgeAction:"读原理与算例 ↗", casesTitle:"故障诊断实验室", casesBody:"从具体日志与数据开始，提出假设、运行检查，再看解析。", casesAction:"开始排障练习 ↗", practiceTitle:"练习与复习中心", practiceBody:"按课程做题、查看解析，把错题和需要再练的内容留下来。", practiceAction:"做题与重练错题 ↗", searchTitle:"搜索学习内容", searchBody:"跨课程检索讲解、代码步骤、常见报错、专题和项目。", searchAction:"带着问题找答案 ↗",
    applicationTracker:"投递记录", hiringBrief:"整理招聘需求", findStart:"从哪里开始？做一次入门自查 ↗",
    navCareer:"求职准备", navTalent:"人才速览", growthTitle:"选择你的下一步。", growthIntro:"围绕一个作品准备求职，或从具体贡献认识下一位工程伙伴。", growthBuilderTitle:"我在准备下一次机会", growthBuilderBody:"按岗位安排 7 天作品与投递准备：独立实现、检查证据、整理简历，再发起有针对性的申请。已有作品可直接进入结课自评。", growthBuilderAction:"打开求职准备路线 ↗", growthTeamTitle:"我在寻找工程人才", growthTeamBody:"按技术、地区、语言与协作方式浏览自愿公开的名片，查看本人贡献和作品证据，把想进一步了解的人加入本机阅读清单。", growthTeamAction:"进入人才速览 ↗", growthReviews:"作品评审队列", growthOpportunities:"发布真实机会", founderName:"项目发起人：李超群", founderCompany:"所属公司：元智引擎公司",
    gpuExtensions: "含 GPU / 高速互连选做实验",
    requiredHeading: "必修课", electiveHeading: "选修课", commonRequired: "共同必修", roleRequired: "岗位必修", elective: "方向选修", requiredGroup: "必修 · 共 {days} 天", electiveGroup: "选修 · {count} 门，按需选择", selectedRequirement: "课程性质", allRequirements: "必修 + 选修", roleLabel: "目标岗位", allRoles: "全部方向", requiredCount: "{count} 门必修 · {days} 天",
    guidedBadge: "图解 · 配套实验 · 逐题解析",
    navProjects: "实战项目", navPortfolio: "作品档案",
    courseSearchLabel: "探索技术与岗位", courseSearchPlaceholder: "搜索 vLLM、Mooncake、分布式训练…", courseLevelLabel: "学习深度", allLevels: "所有深度", beginner: "入门", intermediate: "进阶", advanced: "深入", courseHardwareLabel: "实践条件", allHardware: "所有环境", cpuFriendly: "可从 CPU 起步", gpuRequired: "需兼容 GPU", multiGpu: "多卡 / 多节点实测", allCourses: "全部课程", clearCatalog: "重置学习库筛选", catalogCount: "{count} 门课程 · 10 / 20 天学习安排", pathDuration: "{count} 门课程 · 按顺序共 {days} 天", choosePath: "查看这条路径", openCourse: "打开学习手册", continueCourse: "继续学习", tenDays: "{days} 天实战", noCourses: "没有符合这些条件的课程", noCoursesBody: "换一个技术关键词，或重置筛选查看完整学习库。", relatedRoles: "关联岗位", metricCourses: "门实战课程", metricDays: "个每日学习任务", metricLanguages: "双语学习手册",
    brandName: "聘枢", brandTagline: "AI Infra JobHub", navResume: "投简历 ↗", resumeTitle: "让你的下一次机会，从一封邮件开始。", resumeDescription: "欢迎发送简历与公开作品链接，并注明目标方向、工作地区和远程偏好。", resumeNote: "邮件投递不会自动公开到 GitHub；公开作品名片由你另行选择提交。", sendResume: "发送简历",
    searchPlaceholder: "技术、公司、地区或关键词", communityTitle: "一个人的经验，\n可以成为很多人的起点。",
    beginTrack: "查看学习任务", outcome: "完成后，你将得到", evidence: "交付物", localProgress: "勾选表示你已完成自我记录。进度仅保存在本浏览器，不是课程认证；清除浏览器数据后会丢失。",
    loadError: "内容加载失败。请刷新页面重试；本地预览需通过 HTTP 服务打开。",
    jobsEmptyTitle: "第一份真实的机会，从你开始。", jobsEmptyBody: "社区正在起步，目前还没有审核发布的职位。欢迎带着具体的技术问题、职责与报酬范围，发起一次合作。",
    peopleEmptyTitle: "把你的作品，放在这里。", peopleEmptyBody: "目前还没有公开的开发者名片。完成一份实验、分享一个项目，让愿意一起做事的人找到你。",
    noResultsTitle: "暂时没有匹配的结果", noResultsBody: "试着减少技术标签、放宽协作方式，或换一个关键词。",
    results: "{count} 条结果", matches: "技术交集：{tags}", updated: "最近确认", validUntil: "展示至（UTC）", apply: "前往官方申请入口 ↗", source: "查看来源 / 更新或撤回 ↗", portfolio: "查看作品 ↗", profile: "GitHub 主页 ↗", eligibility: "工作地区与雇佣限制", compensation: "报酬", languages: "语言", availability: "时间安排", seniority: "经验要求",
    "remote-global": "全球远程", "remote-regional": "指定地区远程", hybrid: "混合办公", onsite: "线下办公",
    "full-time": "全职", internship: "实习", contract: "合同合作", research: "研究", "open-source": "开源协作",
    submitJobTitle: "发布一个具体的机会", submitJobBody: "填写 GitHub 职位表单，说明职责、技术方向、报酬、地区限制和官方申请入口。提交内容会立即成为公开 Issue；维护者审核并合入数据后，才会展示在网站。",
    submitProfileTitle: "让作品成为你的介绍", submitProfileBody: "填写 GitHub 自荐表单，分享你愿意公开的作品、技术方向、协作地区和联系入口。提交内容会立即公开；维护者确认本人同意后再收录。",
    discussionTitle: "一起讨论，一起完成", discussionBody: "在 GitHub Discussions 中分享实验、请教问题、寻找协作者。发帖和回复需要 GitHub 账号；讨论内容公开。",
    repositoryTitle: "由社区共同维护", repositoryBody: "路线、页面和公开目录都在 GitHub 仓库维护。你可以通过 Issue 提建议，通过 Pull Request 改进内容。",
    openGitHub: "前往 GitHub ↗", notConnected: "这是本地启动版本，尚未连接仓库。上传到你的 GitHub 仓库并运行部署后，这个入口会自动启用。",
    publicReminder: "请只提交愿意公开的信息。简历中的电话、住址、证件和私密求职意向不要放进公开 Issue。",
    privacyTitle: "公开资料与隐私", privacy1: "网站展示的职位和名片来自主动提交，经维护者审核收录。公开 Issue 在审核前就已公开，其他人可以访问；GitHub 账号不等于雇主身份或能力认证。",
    privacy2: "需要更新或撤下时，请编辑原 Issue 并提出请求。维护者从目录删除后重新发布网站。Git 历史、已有克隆、搜索缓存或第三方副本可能仍保留旧内容；涉及敏感信息时还需使用 GitHub 的删除支持流程。",
    privacy3: "学习进度和语言偏好保存在本浏览器。这些进度不会上传。首页地球会注明访问统计是否接入；启用后，MapMyVisitors 会处理访问 IP、浏览器信息并估计国家或地区。统计脚本不读取学习笔记、投递或招聘草稿，也不会加载到投递、招聘草稿、作品编辑和搜索页面。你可以通过邮件客户端将简历发送至 career@yzinfra.com，邮件由该邮箱运营方接收和处理，不会由网站自动发布到 GitHub。针对具体职位，也可使用企业官方申请入口。网站不提供私聊或简历上传存储；邮件和网页访问仍适用各服务提供方的数据处理政策。"
  },
  en: {
    rsiBadge:"NEW · ADVANCED COMMON CORE", rsiTitle:"RSI Infra: build a verifiable improvement loop in 20 study days", rsiBody:"From task contracts, candidate proposals and independent evaluation to experience, equal-budget ablations and rollback. Start on a laptop and build a capstone report with raw evidence.", rsiAction:"Open the RSI Infra core course ↗",
    knowledgeTitle:"Core concepts", knowledgeBody:"Connect scheduling, memory, communication and reliability through step-by-step worked examples.", knowledgeAction:"Explore principles & examples ↗", casesTitle:"Diagnosis labs", casesBody:"Start from logs and data. Form a hypothesis, run a check, then read the explanation.", casesAction:"Investigate a case ↗", practiceTitle:"Practice & review", practiceBody:"Practice by course, read explanations and return to mistakes or topics you want to revisit.", practiceAction:"Practice & revisit mistakes ↗", searchTitle:"Search learning materials", searchBody:"Search across daily explanations, code steps, troubleshooting, concepts and projects.", searchAction:"Find an explanation ↗",
    applicationTracker:"Application tracker", hiringBrief:"Write a hiring brief", findStart:"Where should I start? Find a first task ↗",
    navCareer:"Career prep", navTalent:"Find builders", growthTitle:"Choose your next step.", growthIntro:"Prepare for a role with one project, or meet an engineer through their contribution.", growthBuilderTitle:"Prepare for my next opportunity", growthBuilderBody:"A seven-day plan for independent work, evidence, a portfolio and targeted applications. If you already have a project, start with the capstone self-review.", growthBuilderAction:"Open my preparation plan ↗", growthTeamTitle:"Meet engineers through their work", growthTeamBody:"Browse voluntary profiles by technology and collaboration needs. Read contributions and evidence, then save a local reading shortlist for further review.", growthTeamAction:"Browse builders ↗", growthReviews:"Project review queue", growthOpportunities:"Share a real opportunity", founderName:"Project initiator: Li Chaoqun (李超群)", founderCompany:"Company: 元智引擎公司",
    gpuExtensions: "Optional GPU / fast-interconnect labs",
    requiredHeading: "Core courses", electiveHeading: "Electives", commonRequired: "Common core", roleRequired: "Role core", elective: "Elective", requiredGroup: "Core · {days} days", electiveGroup: "Electives · choose from {count}", selectedRequirement: "Course requirement", allRequirements: "Core + electives", roleLabel: "Target role", allRoles: "All roles", requiredCount: "{count} core courses · {days} days", curriculumNote: "Foundations and RSI Infra are common core in all three paths. Take the advanced RSI course after role-specific core courses; use lab checks to identify what you already know.",
    guidedBadge: "Diagrams · Lab kit · Explained quizzes", guidedEyebrow: "NEW TO AI INFRA? START HERE", guidedTitle: "Build an experiment. Understand a system.", guidedDescription: "Every course includes guided experiments, diagrams, downloadable code and explained quizzes. Start with CPU foundations, then follow the core courses and choose electives for your target role.", guidedFoundations: "① Foundations · Start on a laptop", guidedVllm: "② vLLM · Simulation / GPU labs",
    wechatEntry: "Careers & technical exchange · Connect on WeCom ↗", wechatTitle: "AI Infra careers and technical conversations", wechatDescription: "Looking for an AI infrastructure role, or interested in inference, caching, GPUs and platform engineering? Scan to add 元智引擎 on WeCom and introduce your interests.", wechatIntro: "When adding the contact, include your technical focus, career or collaboration interests, and a portfolio link.", wechatPhone: "On mobile, open and save the original image, then recognize the QR code in WeChat.", wechatScan: "Scan to connect on WeCom", wechatOriginal: "Open the original QR image ↗", wechatJobsTitle: "Bring your work. Talk about your next opportunity.", wechatJobsDescription: "You can also connect on WeCom to introduce your target role, technical focus and availability.",
    navProjects: "Projects", navPortfolio: "Portfolio", buildEyebrow: "THE NEXT STEP / FROM LEARNING TO PRACTICE", buildTitle: "Turn what you know into work you can show.", buildIntro: "Choose an engineering problem, leave a reproducible record, then let your work introduce you.", projectsTitle: "Build a reproducible engineering project", projectsIntro: "Explore serving workloads, cache experiments and GPU kernels. Each project defines its scope, deliverables and acceptance checks, with CPU-friendly starting points.", exploreProjects: "Explore the project library ↗", portfolioTitle: "Make your contribution easy to understand", portfolioIntro: "Document the problem, environment, method, raw evidence and limitations. Keep a draft, export Markdown, then choose how to share it.", portfolioLocal: "Drafts stay in this browser", portfolioEvidence: "Distinguish measurements, simulations and designs", createPortfolio: "Build my project portfolio ↗", preparePortfolio: "Need a project introduction? Prepare your engineering portfolio ↗",
    courseSearchLabel: "Explore technologies and roles", courseSearchPlaceholder: "Search vLLM, Mooncake, distributed training…", courseLevelLabel: "Depth", allLevels: "All levels", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", courseHardwareLabel: "Practice environment", allHardware: "All environments", cpuFriendly: "Start on a CPU", gpuRequired: "Compatible GPU needed", multiGpu: "Multi-GPU / multi-node", allCourses: "All courses", clearCatalog: "Reset library filters", catalogCount: "{count} courses · 10 / 20-day study plans", pathDuration: "{count} courses · {days} days in sequence", choosePath: "Explore this path", openCourse: "Open the study guide", continueCourse: "Continue learning", tenDays: "{days}-DAY GUIDE", noCourses: "No courses match these filters", noCoursesBody: "Try another technology or reset the filters to see the full library.", relatedRoles: "Related roles", metricCourses: "practical courses", metricDays: "daily learning tasks", metricLanguages: "bilingual guides",
    brandName: "AI Infra JobHub", brandTagline: "聘枢 · Learn. Build. Connect.", navResume: "Send CV ↗", resumeTitle: "Your next opportunity can start with an email.", resumeDescription: "Send your resume and public portfolio links, with your target roles, preferred locations and remote-work preferences.", resumeNote: "Email submissions are not automatically published to GitHub. Sharing a public portfolio is a separate choice.", sendResume: "Send my resume",
    skip: "Skip to content", navLearn: "Learning", navJobs: "Opportunities", navPeople: "Builders", navCommunity: "Community", eyebrow: "OPEN COMMUNITY · FOR AI INFRA BUILDERS EVERYWHERE",
    heroLine1: "Build the systems.", heroLine2: "Find your people.", heroDescription: "From your first learning note to a reproducible project and your next collaboration. A shared home for the people building AI infrastructure.", startLearning: "Explore the learning library", exploreJobs: "Explore opportunities", heroNote: "Community-led · Free to join · Let your work speak",
    journeyLearn: "Understand a system", journeyBuild: "Make something real", journeyBuildNote: "Code / Experiments / Engineering notes", journeyConnect: "Meet your next collaborator", journeyConnectNote: "Careers / Open source / Global collaboration", journeyBottom: "Every contribution can be a new beginning.", ecosystem: "Starting with the inference ecosystem", ecosystemNext: "More paths, built together ↗",
    learnTitle: "Understand the principles. Build a system.", downloadTemplate: "Get the portfolio template ↓", learnDescription: "Follow a 10- or 20-day plan from concepts to experiments and a shareable project. RSI Infra is advanced core in all three paths; start it after your role foundations.", loading: "Loading learning paths…", learningNote: "Progress and notes stay in this browser and can be exported. Finishing a guide does not imply production expertise.", hardwareNote: "Bring your own compute",
    jobsTitle: "Find a problem worth solving.", postJob: "Post an opportunity", jobsDescription: "Full-time roles, internships, research and open-source collaboration. Start with the technology, then check location, language and remote eligibility.", searchLabel: "Search opportunities and builders", searchPlaceholder: "Technology, company, location or keyword", workModeLabel: "Working arrangement", anyMode: "All arrangements", remoteGlobal: "Remote worldwide", remoteRegional: "Remote in specified regions", hybrid: "Hybrid", onsite: "On-site", matchingNote: "Selected technologies match by any overlap and also filter builders below. No personal ability scores.", resetFilters: "Clear filters", publicJobs: "Public opportunities",
    peopleTitle: "Meet the people behind the work.", addProfile: "Share my public portfolio", peopleDescription: "A benchmark, a source walkthrough or an independent project can start a conversation. Profiles are shared voluntarily, never scraped.", peopleFilterNote: "Uses the search and filters above",
    communityTitle: "One person's experience.\nEveryone's starting point.", communityDescription: "Ask a question, share an experiment, discuss an engineering challenge or help someone finish their first project. Let's build this community together.", joinDiscussion: "Join GitHub Discussions", principle1: "Open knowledge", principle1Note: "Link official sources and share practical paths so others can reproduce your work.", principle2: "Specific opportunities", principle2Note: "Make responsibilities, compensation, location and technical needs clear.", principle3: "Mutual respect", principle3Note: "Welcome different backgrounds, different contributions and people just getting started.", footerNote: "An independent community, not officially affiliated with the projects listed.", sourceCode: "Project repository ↗", privacy: "Public data & privacy",
    beginTrack: "Explore the tasks", outcome: "Your deliverable", evidence: "Evidence", localProgress: "Checkmarks are your own progress notes. Progress stays in this browser, is not a certification and is lost if you clear browser data.", loadError: "Content could not load. Please refresh and try again. Local previews need an HTTP server.",
    jobsEmptyTitle: "The first real opportunity starts with you.", jobsEmptyBody: "This community is just getting started, with no reviewed listings yet. Share a concrete technical challenge, responsibilities and compensation range to begin a collaboration.",
    peopleEmptyTitle: "Your work belongs here.", peopleEmptyBody: "There are no public builder profiles yet. Share an experiment or project so people who want to work with you can find you.",
    noResultsTitle: "No matches yet", noResultsBody: "Try fewer technology filters, another working arrangement or a different keyword.", results: "{count} results", matches: "Shared technologies: {tags}", updated: "Last confirmed", validUntil: "Listed until (UTC)", apply: "Official application page ↗", source: "Source / request update or removal ↗", portfolio: "View work ↗", profile: "GitHub profile ↗", eligibility: "Location & employment eligibility", compensation: "Compensation", languages: "Languages", availability: "Availability", seniority: "Experience",
    "remote-global": "Remote worldwide", "remote-regional": "Remote in specified regions", "full-time": "Full-time", internship: "Internship", contract: "Contract", research: "Research", "open-source": "Open-source collaboration",
    submitJobTitle: "Share a specific opportunity", submitJobBody: "Use the GitHub form to describe responsibilities, technologies, compensation, eligible locations and the official application page. Your submission becomes a public issue immediately. It appears on this site after a maintainer reviews and merges the data.",
    submitProfileTitle: "Let your work introduce you", submitProfileBody: "Use the GitHub form to share work, technologies, collaboration regions and contact links you want to make public. The issue is public immediately; a maintainer confirms your consent before listing it.",
    discussionTitle: "Talk it through. Build it together.", discussionBody: "Use GitHub Discussions to share experiments, ask questions and find collaborators. Posting and replying require a GitHub account. Discussions are public.",
    repositoryTitle: "Maintained by the community", repositoryBody: "The learning paths, website and public directory live in GitHub. Suggest changes through an issue or contribute through a pull request.", openGitHub: "Continue to GitHub ↗", notConnected: "This is a local starter, not yet connected to a repository. This link activates automatically when you deploy it from your GitHub repository.", publicReminder: "Submit only information you want public. Keep phone numbers, home addresses, identity documents and confidential job searches out of public issues.",
    privacyTitle: "Public data & privacy", privacy1: "Listings and profiles are voluntarily submitted and curated. Issues are already public before review. A GitHub account is not employer verification or a skills certification.", privacy2: "To update or withdraw, edit the original issue and request removal. Maintainers remove the listing and republish the site. Git history, existing clones, search caches and third-party copies may retain old data. Sensitive information may also require GitHub's removal support process.", privacy3: "Learning progress and language preferences stay in this browser. Your progress is not uploaded. The homepage globe states whether visitor statistics are connected. When enabled, MapMyVisitors processes visitor IP addresses and browser information to estimate countries or regions. Statistics code does not read learning notes or drafts and is excluded from application tracking, hiring drafts, portfolio editing and search pages. You can email your resume to career@yzinfra.com through your email client. The mailbox operator receives and processes the email; the website does not automatically publish it to GitHub. You can also apply through each employer's official page. This website has no private messaging or resume-upload storage. Email and hosting providers' data policies still apply."
  }
};
document.querySelectorAll("[data-i18n]").forEach(el => { const key = el.dataset.i18n; if (!(key in messages.zh)) messages.zh[key] = el.textContent; });
const t = (key, values = {}) => String(messages[state.lang][key] ?? messages.zh[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
const pick = (value) => typeof value === "object" && value ? value[state.lang] ?? value.en ?? "" : value;
const tagsHtml = (tags) => `<div class="tags">${tags.map(tag => `<span class="tag">${h(tag)}</span>`).join("")}</div>`;
const link = (label, href, className = "text-link") => `<a class="${className}" href="${safeUrl(href)}" target="_blank" rel="noopener noreferrer">${h(label)}</a>`;
const currentRecords = (kind) => (state.data?.[kind] ?? []).filter(x => x.status === "approved" && x.consent === true && x.expiresAt >= new Date().toISOString().slice(0, 10));

function translatePage() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-language-link]").forEach(a => { const url = new URL(a.dataset.languageLink, location.href); url.searchParams.set("lang", state.lang); a.href = url.href; });
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-placeholder]").forEach(el => { el.placeholder = t(el.dataset.placeholder); });
  $("#language-toggle").innerHTML = `${state.lang === "zh" ? "EN" : "中文"} <span aria-hidden="true">↗</span>`;
  $("#language-toggle").setAttribute("aria-label", state.lang === "zh" ? "Switch to English" : "切换为中文");
  if (!$("#load-error").hidden) $("#load-error").textContent = t("loadError");
  renderPaths(); renderCategories(); renderTracks(); renderFilters(); renderListings();
}

function renderPaths() {
  if (!state.data) return;
  $("#course-role").innerHTML = `<option value="">${h(t("allRoles"))}</option>` + state.data.paths.map(path => `<option value="${h(path.id)}">${h(pick(path.title))}</option>`).join("");
  $("#course-role").value = state.path;
  const links = ids => ids.map(id => `<a href="./learn/${encodeURIComponent(id)}/?lang=${state.lang}">${h(state.data.tracks.find(x => x.id === id)?.title[state.lang] ?? id)}</a>`).join(' <span aria-hidden="true">·</span> ');
  $("#career-paths").innerHTML = state.data.paths.map(path => `<article class="path-card${state.path === path.id ? " is-selected" : ""}"><span class="path-number">PATH ${h(path.number)}</span><h3>${h(pick(path.title))}</h3><p>${h(pick(path.description))}</p><div class="path-core"><strong>${h(t("requiredGroup", {days:Curriculum.daysFor(path.requiredCourses, state.data.tracks)}))}</strong><div class="path-chain">${links(path.requiredCourses)}</div></div><details class="path-electives"><summary>${h(t("electiveGroup", {count:path.electiveCourses.length}))}</summary><div class="path-chain">${links(path.electiveCourses)}</div></details><button class="text-button" type="button" data-path="${h(path.id)}" aria-pressed="${state.path === path.id}">${h(t("choosePath"))} ↗</button></article>`).join("");
}

function requirementLabel(course) {
  const result = Curriculum.classify(course.id, state.data.paths, state.path);
  if (result.common) return t("commonRequired");
  if (result.kind === "elective") return t("elective");
  if (state.path) return t("roleRequired");
  return t("roleRequired") + " · " + result.requiredFor.map(id => pick(state.data.paths.find(p => p.id === id).title)).join(" / ");
}

function renderCategories() {
  if (!state.data) return;
  const categories = [["", t("allCourses")], ...Object.entries(state.data.categories).map(([key, label]) => [key, pick(label)])];
  $("#course-categories").innerHTML = categories.map(([key, label]) => `<button class="filter-tag" type="button" data-category="${h(key)}" aria-pressed="${state.category === key}">${h(label)}</button>`).join("");
}

function filteredCourses() {
  const query = state.courseQuery.trim().toLocaleLowerCase();
  const path = state.data.paths.find(x => x.id === state.path);
  let courses = state.data.tracks.filter(course => {
    const haystack = [course.title.zh, course.title.en, course.description.zh, course.description.en, ...course.tags, ...course.roles.zh, ...course.roles.en].join(" ").toLocaleLowerCase();
    const hardwareMatch = !state.hardware || (state.hardware === "cpu" ? ["cpu", "gpu-optional"].includes(course.hardwareTier) : course.hardwareTier === state.hardware);
    return (!query || haystack.includes(query)) && (!state.category || course.category === state.category) && (!state.level || course.level === state.level) && hardwareMatch && (!path || path.courses.includes(course.id)) && (!state.requirement || Curriculum.classify(course.id, state.data.paths, state.path).kind === state.requirement);
  });
  if (path) courses = courses.sort((a, b) => path.courses.indexOf(a.id) - path.courses.indexOf(b.id));
  return courses;
}

function renderTracks() {
  if (!state.data) return;
  const symbols = {foundations: "[ ]", vllm: "vL", sglang: "SG", lmcache: "KV", mooncake: "MC", dynamo: "DY", triton: "TL", "pytorch-distributed": "PT", ray: "RY", kubernetes: "K8", nccl: "NC", "rsi-infra": "RSI"};
  const hardwareLabels = {cpu: "cpuFriendly", "gpu-optional": "cpuFriendly", "gpu-required": "gpuRequired", "multi-gpu": "multiGpu"};
  const courses = filteredCourses();
  $("#metric-courses").textContent = state.data.tracks.length;
  $("#metric-days").textContent = state.data.tracks.reduce((total, x) => total + x.steps.length, 0);
  const selectedPath = state.data.paths.find(x => x.id === state.path);
  $("#catalog-count").textContent = t("catalogCount", {count: courses.length}) + (selectedPath ? ` · ${pick(selectedPath.title)}` : "");
  const renderCards = items => items.map(track => {
    const done = track.steps.filter(step => state.progress.has(`${track.id}:${step.day}`)).length;
    const nextDay = track.steps.find(step => !state.progress.has(`${track.id}:${step.day}`))?.day ?? track.steps.length;
    const href = `./learn/${encodeURIComponent(track.id)}/?lang=${state.lang}#day-${nextDay}`;
    return `<article class="course-card"><div class="course-top"><span class="course-code" aria-hidden="true">${h(symbols[track.id] ?? "↗")}</span><span class="course-category">${h(pick(state.data.categories[track.category]))}</span><span class="track-number">${h(track.number)}</span></div><span class="requirement-label ${Curriculum.classify(track.id, state.data.paths, state.path).kind}">${h(requirementLabel(track))}</span><h3><a href="${href}">${h(pick(track.title))}</a></h3><p>${h(pick(track.description))}</p>${tagsHtml(track.tags)}${track.lab ? `<p class="guided-badge">${h(t("guidedBadge"))}</p>` : ""}<div class="course-meta"><span>${h(t("tenDays", {days:track.steps.length}))}</span><span>${h(t(track.level))}</span><span>${h(pick(track.hoursPerDay))}</span></div><div class="hardware-label">${h(t(hardwareLabels[track.hardwareTier]))}</div><div class="course-footer"><a class="text-link" href="${href}">${h(t(done ? "continueCourse" : "openCourse"))} ↗</a><span class="course-progress" aria-label="${done} / ${track.steps.length}">${done}/${track.steps.length}</span></div></article>`;
  }).join("");
  $("#tracks").innerHTML = ["required", "elective"].map(kind => {
    const items = courses.filter(course => Curriculum.classify(course.id, state.data.paths, state.path).kind === kind);
    return items.length ? `<div class="course-group-heading"><h3>${h(t(kind === "required" ? "requiredHeading" : "electiveHeading"))}</h3><span>${items.length} · ${h(selectedPath ? pick(selectedPath.title) : t("allRoles"))}</span></div>${renderCards(items)}` : "";
  }).join("") || `<div class="empty-state"><div><h3>${h(t("noCourses"))}</h3><p>${h(t("noCoursesBody"))}</p></div><button class="text-button" data-clear-catalog type="button">${h(t("clearCatalog"))}</button></div>`;
}

function clearCatalog(render = true) {
  state.courseQuery = ""; state.category = ""; state.level = ""; state.hardware = ""; state.path = ""; state.requirement = "";
  $("#course-search").value = ""; $("#course-level").value = ""; $("#course-hardware").value = ""; $("#course-role").value = ""; $("#course-requirement").value = "";
  if (render) { renderPaths(); renderCategories(); renderTracks(); }
}

function renderFilters() {
  $("#skill-filters").innerHTML = technologies.map(tag => `<button class="filter-tag" type="button" data-skill="${h(tag)}" aria-pressed="${state.skills.has(tag)}">${h(tag)}</button>`).join("");
}

function selectedRecords(kind) {
  const query = state.query.trim().toLocaleLowerCase();
  return currentRecords(kind).filter(item => {
    const fields = [item.title, item.company, item.name, item.location, item.languages, item.summary?.zh, item.summary?.en, ...(item.tags ?? [])].filter(Boolean).join(" ").toLocaleLowerCase();
    return (!query || fields.includes(query)) && (!state.workMode || item.workMode === state.workMode) && (!state.skills.size || item.tags.some(tag => state.skills.has(tag)));
  }).sort((a, b) => {
    const overlap = item => item.tags.filter(tag => state.skills.has(tag)).length;
    return overlap(b) - overlap(a) || b.updatedAt.localeCompare(a.updatedAt);
  });
}

function emptyState(kind) {
  const hasRecords = currentRecords(kind).length > 0;
  const title = hasRecords ? "noResultsTitle" : kind === "jobs" ? "jobsEmptyTitle" : "peopleEmptyTitle";
  const body = hasRecords ? "noResultsBody" : kind === "jobs" ? "jobsEmptyBody" : "peopleEmptyBody";
  const action = hasRecords ? `<button class="text-button" type="button" data-clear>${h(t("resetFilters"))} ↗</button>` : `<button class="text-button" type="button" data-submit="${kind === "jobs" ? "job" : "profile"}">${h(t(kind === "jobs" ? "postJob" : "addProfile"))} ↗</button>`;
  return `<div class="empty-state"><span class="empty-icon" aria-hidden="true">${kind === "jobs" ? "↗" : "+"}</span><div><h3>${h(t(title))}</h3><p>${h(t(body))}</p></div>${action}</div>`;
}

function listingHtml(item, kind) {
  const isJob = kind === "jobs";
  const shared = item.tags.filter(tag => state.skills.has(tag));
  return `<article class="listing-card"><div class="listing-header"><div><h3>${h(isJob ? item.title : item.name)}</h3><div class="listing-meta">${isJob ? `${h(item.company)} · ${h(t(item.kind))} · ` : ""}${h(t(item.workMode))} · ${h(item.location)}</div></div>${tagsHtml(item.tags)}</div><p>${h(pick(item.summary))}</p>${isJob ? `<div class="listing-meta">${h(t("compensation"))}: ${h(item.compensation)}<br>${h(t("eligibility"))}: ${h(item.eligibility)}<br>${h(t("seniority"))}: ${h(item.seniority)}</div>` : ""}<div class="listing-meta">${h(t("languages"))}: ${h(item.languages)} · ${h(t("availability"))}: ${h(item.availability)}</div>${shared.length ? `<p class="match-note">${h(t("matches", {tags: shared.join(" · ")}))}</p>` : ""}<div class="listing-footer"><span class="listing-meta">${h(t("updated"))}: ${h(item.updatedAt)}<br>${h(t("validUntil"))}: ${h(item.expiresAt)}</span><div class="listing-links">${link(t(isJob ? "apply" : "portfolio"), isJob ? item.applyUrl : item.portfolio)}${!isJob ? link(t("profile"), item.github) : ""}${link(t("source"), item.source)}</div></div></article>`;
}

function renderListings() {
  for (const kind of ["jobs", "people"]) {
    const items = selectedRecords(kind);
    $(`#${kind}-count`).textContent = t("results", {count: items.length});
    $(`#${kind}-list`).innerHTML = items.length ? items.map(item => listingHtml(item, kind)).join("") : emptyState(kind);
  }
}

function showDialog(content) {
  $("#dialog-content").innerHTML = content;
  $("#detail-dialog").showModal();
  $("#detail-dialog").scrollTop = 0;
}


function openSubmission(kind) {
  const titles = {job: "submitJobTitle", profile: "submitProfileTitle", discussion: "discussionTitle", repository: "repositoryTitle"};
  const bodies = {job: "submitJobBody", profile: "submitProfileBody", discussion: "discussionBody", repository: "repositoryBody"};
  const suffixes = {job: "/issues/new?template=01-job.yml", profile: "/issues/new?template=02-profile.yml", discussion: "/discussions", repository: ""};
  const repo = state.data?.repository;
  const connected = typeof repo === "string" && /^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repo);
  showDialog(`<h2 id="dialog-title">${h(t(titles[kind]))}</h2><p class="dialog-intro">${h(t(bodies[kind]))}</p>${kind === "job" || kind === "profile" ? `<p class="status-note">${h(t("publicReminder"))}</p>` : ""}${connected ? `<div class="dialog-actions">${link(t("openGitHub"), `https://github.com/${repo}${suffixes[kind]}`, "button primary")}</div>` : `<p class="status-note">${h(t("notConnected"))}</p>`}`);
}

function clearFilters() {
  state.skills.clear(); state.query = ""; state.workMode = "";
  $("#search").value = ""; $("#work-mode").value = "";
  renderFilters(); renderListings();
}

$("#language-toggle").addEventListener("click", () => { state.lang = state.lang === "zh" ? "en" : "zh"; storage.set("language", state.lang); translatePage(); });
$("#search").addEventListener("input", event => { state.query = event.target.value; renderListings(); });
$("#work-mode").addEventListener("change", event => { state.workMode = event.target.value; renderListings(); });
$("#reset-filters").addEventListener("click", clearFilters);
$("#course-search").addEventListener("input", event => { state.courseQuery = event.target.value; renderTracks(); });
$("#course-level").addEventListener("change", event => { state.level = event.target.value; renderTracks(); });
$("#course-hardware").addEventListener("change", event => { state.hardware = event.target.value; renderTracks(); });
$("#course-role").addEventListener("change", event => { state.path = event.target.value; renderPaths(); renderTracks(); });
$("#course-requirement").addEventListener("change", event => { state.requirement = event.target.value; renderTracks(); });
$("#clear-catalog").addEventListener("click", () => clearCatalog());
$("#close-dialog").addEventListener("click", () => $("#detail-dialog").close());
$("#privacy-button").addEventListener("click", () => showDialog(`<h2 id="dialog-title">${h(t("privacyTitle"))}</h2><div class="privacy-copy">${["privacy1", "privacy2", "privacy3"].map(key => `<p>${h(t(key))}</p>`).join("")}</div>`));
document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.submit) openSubmission(button.dataset.submit);
  if (button.dataset.path) {
    clearCatalog(false); state.path = button.dataset.path;
    renderPaths(); renderCategories(); renderTracks();
    $("#course-catalog").scrollIntoView({block: "start"});
  }
  if (button.hasAttribute("data-category")) {
    state.category = button.dataset.category;
    document.querySelectorAll("[data-category]").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.category === state.category)));
    renderTracks();
  }
  if (button.hasAttribute("data-clear-catalog")) clearCatalog();
  if (button.hasAttribute("data-clear")) clearFilters();
  if (button.dataset.skill) {
    const tag = button.dataset.skill;
    state.skills.has(tag) ? state.skills.delete(tag) : state.skills.add(tag);
    button.setAttribute("aria-pressed", String(state.skills.has(tag)));
    renderListings();
  }
});
// Remove expired listings even in a tab left open overnight, using a UTC date boundary.
setInterval(renderListings, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) renderListings(); });
window.addEventListener("pageshow", () => {
  const latest = storage.get("course-progress-v2", []);
  state.progress = new Set(Array.isArray(latest) ? latest.filter(x => typeof x === "string") : []);
  renderTracks();
});
window.addEventListener("storage", event => {
  if (event.key === "infra-commons:course-progress-v2") {
    const latest = storage.get("course-progress-v2", []);
    state.progress = new Set(Array.isArray(latest) ? latest.filter(x => typeof x === "string") : []);
    renderTracks();
  }
});
translatePage();
fetch("./data.json?v=curriculum-v1", {cache: "no-cache"}).then(response => { if (!response.ok) throw new Error("Content unavailable"); return response.json(); }).then(data => {
  if (!Array.isArray(data.tracks) || !Array.isArray(data.paths) || !data.categories || !Array.isArray(data.jobs) || !Array.isArray(data.people)) throw new Error("Invalid content");
  state.data = data; translatePage();
}).catch(() => { $("#load-error").hidden = false; $("#load-error").textContent = t("loadError"); $("#tracks").textContent = t("loadError"); });
