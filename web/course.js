"use strict";

(() => {
  const meta = JSON.parse(document.getElementById("course-meta").textContent);
  const dayCount = meta.steps.length;
  const prefix = "infra-commons:";
  const progressKey = "course-progress-v2";
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback; }
    catch { return fallback; }
  };
  const strings = {
    zh: {
      studyToolsNote:"先读原理，动手验证，再用练习检查理解。", practiceCourse:"练习本课题目 / 重练错题 ↗", knowledgeLibrary:"原理与计算专题 ↗", diagnosisLabs:"故障诊断实验室 ↗", searchCourse:"搜索本课讲解与报错 ↗",
      careerPrep:"结课自评与求职准备 ↗",
      projects: "实战项目", createPortfolio: "制作作品档案 ↗",
      brandName: "聘枢", brandTagline: "AI Infra JobHub", skip: "跳到课程正文", library: "学习库", opportunities: "工作与合作", community: "社区讨论 ↗", syllabus: `${dayCount} 天学习目录`, yourProgress: "我的进度", progressNote: "进度与笔记保存在本浏览器，可导出备份。勾选是自我记录，不是认证。", nextChapter: "下一步 · 把学习变成作品", nextTitle: "让别人看见你解决问题的过程。", nextDescription: "整理代码、实验记录和局限，带着作品认识同行或寻找工作。名片由你主动选择公开。", sharePortfolio: "分享作品名片 ↗", findWork: "寻找工作与合作", footerNote: "聘枢 · AI Infra JobHub，独立社区学习手册。", backLibrary: "返回学习库 ↗", unsaved: "浏览器暂时无法保存。当前页面仍保留你的输入，请导出学习记录后再离开。", saved: "已保存在本浏览器。", record: "学习记录", selfReported: "进度为本人自我记录，不是技能认证。请在作品中区分实测、模拟和未执行计划。", complete: "已完成自查", incomplete: "待完成", noNotes: "尚未填写笔记或作品链接。", exportDate: "导出时间（UTC）"
    },
    en: {
      studyToolsNote:"Understand the principles, test them, then check your reasoning with practice.", practiceCourse:"Practice this course / retry mistakes ↗", knowledgeLibrary:"Principles & worked examples ↗", diagnosisLabs:"Diagnosis labs ↗", searchCourse:"Search this course’s explanations ↗",
      careerPrep:"Capstone review & career prep ↗",
      projects: "Practice projects", createPortfolio: "Build my portfolio ↗",
      brandName: "AI Infra JobHub", brandTagline: "聘枢 · Learn. Build. Connect.", skip: "Skip to the lesson", library: "Learning library", opportunities: "Work & collaboration", community: "Community ↗", syllabus: `${dayCount}-day syllabus`, yourProgress: "My progress", progressNote: "Progress and notes stay in this browser and can be exported. Checkmarks are self-reported, not a certification.", nextChapter: "NEXT CHAPTER · MAKE YOUR WORK VISIBLE", nextTitle: "Show how you solve a problem.", nextDescription: "Bring code, experiment records and limitations to the community or your next application. Sharing a public profile is your choice.", sharePortfolio: "Share my portfolio ↗", findWork: "Find work & collaboration", footerNote: "聘枢 · AI Infra JobHub. An independent community learning guide.", backLibrary: "Back to the library ↗", unsaved: "Your browser could not save this change. Your input is still on this page; export your learning record before leaving.", saved: "Saved in this browser.", record: "Learning record", selfReported: "Progress is self-reported, not a skills certification. Distinguish measurements, simulations and unexecuted plans in your portfolio.", complete: "Self-check complete", incomplete: "To do", noNotes: "No notes or evidence links yet.", exportDate: "Exported at (UTC)"
    }
  };
  const queryLang = new URLSearchParams(location.search).get("lang");
  let lang = queryLang === "en" || queryLang === "zh" ? queryLang : read("language", "zh") === "en" ? "en" : "zh";
  const savedProgress = read(progressKey, []);
  let progress = new Set(Array.isArray(savedProgress) ? savedProgress.filter(x => typeof x === "string") : []);
  const storedNotes = read(`notes-v2:${meta.id}`, {});
  const legacyNotes = storedNotes && typeof storedNotes === "object" && !Array.isArray(storedNotes) ? storedNotes : {};
  const noteKey = day => `notes-v2:${meta.id}:${day}`;
  const notes = Object.fromEntries(meta.steps.map(step => {
    const value = read(noteKey(step.day), legacyNotes[step.day] ?? "");
    return [step.day, typeof value === "string" ? value : ""];
  }));
  let currentDay = 1;
  const failedSaves = new Set();
  const text = key => strings[lang][key];
  const status = document.getElementById("storage-status");
  const save = (key, value) => {
    const previouslyFailed = failedSaves.size > 0;
    try {
      localStorage.setItem(prefix + key, JSON.stringify(value));
      failedSaves.delete(key);
    } catch {
      failedSaves.add(key);
    }
    if (failedSaves.size > 0) {
      status.hidden = false; status.textContent = text("unsaved");
    } else if (previouslyFailed) {
      status.hidden = false; status.textContent = text("saved");
    }
  };

  function updateProgress() {
    const done = meta.steps.filter(step => progress.has(`${meta.id}:${step.day}`)).length;
    document.getElementById("course-progress").max = dayCount;
    document.getElementById("course-progress").value = done;
    document.getElementById("course-progress-count").textContent = `${done} / ${dayCount}`;
    document.querySelectorAll("[data-complete]").forEach(input => {
      input.checked = progress.has(`${meta.id}:${input.dataset.complete}`);
    });
    document.querySelectorAll("[data-day-link]").forEach(link => {
      const done = progress.has(`${meta.id}:${link.dataset.dayLink}`);
      link.classList.toggle("is-complete", done);
      link.querySelector(".day-status").textContent = done ? "✓" : "";
      link.setAttribute("aria-label", `Day ${link.dataset.dayLink}: ${meta.steps[Number(link.dataset.dayLink) - 1].title[lang]} · ${text(done ? "complete" : "incomplete")}`);
    });
  }

  function showDay(day, navigate = false) {
    currentDay = Number.isInteger(day) && day >= 1 && day <= dayCount ? day : 1;
    document.querySelectorAll(".day-content").forEach(section => { section.hidden = Number(section.dataset.day) !== currentDay; });
    document.querySelectorAll("[data-day-link]").forEach(link => { link.setAttribute("aria-current", Number(link.dataset.dayLink) === currentDay ? "step" : "false"); });
    document.querySelector(".sidebar-heading").textContent = `${text("syllabus")} · ${String(currentDay).padStart(2, "0")}`;
    save(`last-day-v2:${meta.id}`, currentDay);
    if (navigate) {
      const section = document.getElementById(`day-${currentDay}`);
      if (matchMedia("(max-width: 760px)").matches) document.querySelector(".sidebar-panel").open = false;
      section.scrollIntoView({block: "start", behavior: "instant"});
      section.focus({preventScroll: true});
    }
  }

  function translate() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = `${meta.title[lang]} · ${lang === "zh" ? `${dayCount} 天实战 · 聘枢` : `${dayCount}-day guide · AI Infra JobHub`}`;
    document.querySelectorAll("[data-zh][data-en]").forEach(el => { el.textContent = el.dataset[lang]; });
    document.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = text(el.dataset.i18n);
      if (el.tagName === "A" && ["createPortfolio", "projects", "careerPrep", "practiceCourse", "knowledgeLibrary", "diagnosisLabs", "searchCourse"].includes(el.dataset.i18n)) {
        const url = new URL(el.href);
        url.searchParams.set("lang", lang);
        el.href = url.href;
      }
    });
    const toggle = document.getElementById("course-language");
    toggle.textContent = lang === "zh" ? "EN ↗" : "中文 ↗";
    toggle.setAttribute("aria-label", lang === "zh" ? "Switch to English" : "切换为中文");
    document.getElementById("download-guide").href = `./${meta.id}.${lang}.md`;
    if (failedSaves.size > 0) status.textContent = text("unsaved");
    updateProgress();
    showDay(currentDay);
  }

  document.querySelectorAll("[data-complete]").forEach(input => {
    input.disabled = false;
    input.addEventListener("change", () => {
      // Apply this one checkbox to the latest record, including other tabs' days.
      const latest = read(progressKey, []);
      if (Array.isArray(latest) && !failedSaves.has(progressKey)) progress = new Set(latest.filter(x => typeof x === "string"));
      const key = `${meta.id}:${input.dataset.complete}`;
      input.checked ? progress.add(key) : progress.delete(key);
      save(progressKey, [...progress]);
      updateProgress();
    });
  });
  document.querySelectorAll("[data-notes]").forEach(input => {
    input.disabled = false;
    input.value = typeof notes[input.dataset.notes] === "string" ? notes[input.dataset.notes] : "";
    input.addEventListener("input", () => {
      notes[input.dataset.notes] = input.value;
      save(noteKey(input.dataset.notes), input.value);
    });
  });
  document.getElementById("course-language").addEventListener("click", () => {
    lang = lang === "zh" ? "en" : "zh";
    save("language", lang);
    const url = new URL(location.href);
    url.searchParams.delete("lang");
    history.replaceState(null, "", url);
    translate();
  });
  const exportButton = document.getElementById("export-progress");
  exportButton.disabled = false;
  exportButton.addEventListener("click", () => {
    const lines = [`# ${meta.title[lang]} · ${text("record")}`, "", "聘枢 · AI Infra JobHub", "", text("selfReported"), "", `${text("exportDate")}: ${new Date().toISOString()}`, ""];
    for (const step of meta.steps) {
      lines.push(`## Day ${step.day} · ${step.title[lang]}`, "", `- [${progress.has(`${meta.id}:${step.day}`) ? "x" : " "}] ${text("complete")}`, "", notes[step.day] || text("noNotes"), "");
    }
    const url = URL.createObjectURL(new Blob([lines.join("\n")], {type: "text/markdown;charset=utf-8"}));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${meta.id}-learning-record.md`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  window.addEventListener("hashchange", () => {
    const match = /^#day-(\d+)$/.exec(location.hash);
    if (match) showDay(Number(match[1]), true);
  });
  window.addEventListener("storage", event => {
    if (event.key === prefix + progressKey && !failedSaves.has(progressKey)) {
      const latest = read(progressKey, []);
      if (Array.isArray(latest)) { progress = new Set(latest.filter(x => typeof x === "string")); updateProgress(); }
    }
    const notePrefix = prefix + `notes-v2:${meta.id}:`;
    if (event.key && event.key.startsWith(notePrefix)) {
      const day = Number(event.key.slice(notePrefix.length));
      const input = document.querySelector(`[data-notes="${day}"]`);
      if (input && document.activeElement !== input && !failedSaves.has(noteKey(day))) {
        const latest = read(noteKey(day), "");
        notes[day] = typeof latest === "string" ? latest : "";
        input.value = notes[day];
      }
    }
  });
  if (matchMedia("(max-width: 760px)").matches) document.querySelector(".sidebar-panel").open = false;
  const requested = /^#day-(\d+)$/.exec(location.hash);
  currentDay = requested ? Number(requested[1]) : Number(read(`last-day-v2:${meta.id}`, 1));
  if (typeof JobHubBackup !== "undefined") JobHubBackup.mount({
    element: document.getElementById("backup-panel"), kind:"course", courseId:meta.id, dayCount, language:()=>lang,
    read:()=>({completed:meta.steps.filter(step=>progress.has(`${meta.id}:${step.day}`)).map(step=>step.day), notes:{...notes}, lastDay:currentDay>=1&&currentDay<=dayCount ? currentDay : 1}),
    apply:data=>{
      const latest=read(progressKey, []);
      const base=Array.isArray(latest)&&!failedSaves.has(progressKey) ? latest : [...progress];
      progress=new Set(base.filter(key=>typeof key==="string"&&!key.startsWith(`${meta.id}:`)));
      data.completed.forEach(day=>progress.add(`${meta.id}:${day}`));
      save(progressKey,[...progress]);
      for(const step of meta.steps) {
        notes[step.day]=data.notes[step.day];
        document.querySelector(`[data-notes="${step.day}"]`).value=notes[step.day];
        save(noteKey(step.day),notes[step.day]);
      }
      const url=new URL(location.href); url.hash=`day-${data.lastDay}`; history.replaceState(null,"",url);
      updateProgress(); showDay(data.lastDay);
      return failedSaves.size===0;
    }
  });
  translate();
})();
