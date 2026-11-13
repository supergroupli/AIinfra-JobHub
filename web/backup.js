"use strict";

const JobHubBackup = (() => {
  const LIMIT = 1024 * 1024;
  const portfolioFields = ["projectTitle", "targetRole", "evidenceType", "recordDate", "problem", "contribution", "environment", "method", "evidenceLinks", "results", "limitations", "nextSteps", "repository"];
  const object = value => value && typeof value === "object" && !Array.isArray(value);
  const check = condition => { if (!condition) throw new Error("Invalid or incompatible backup"); };
  const string = (value, limit) => { check(typeof value === "string" && value.length <= limit); return value; };

  function normalize(data, kind) {
    check(object(data));
    if (kind === "course") {
      check(Array.isArray(data.completed) && data.completed.length <= 10);
      check(data.completed.every(n => Number.isInteger(n) && n >= 1 && n <= 10));
      check(object(data.notes) && Object.keys(data.notes).every(k => /^(?:[1-9]|10)$/.test(k)));
      check(Number.isInteger(data.lastDay) && data.lastDay >= 1 && data.lastDay <= 10);
      const notes = Object.fromEntries(Array.from({length:10}, (_, i) => [String(i+1), string(data.notes[i+1] ?? "", 10000)]));
      return {completed: [...new Set(data.completed)].sort((a,b)=>a-b), notes, lastDay:data.lastDay};
    }
    check(kind === "portfolio" && Object.keys(data).every(key => portfolioFields.includes(key)));
    const fields = Object.fromEntries(portfolioFields.map(key => [key, string(data[key] ?? "", 20000)]));
    check(["", "measured", "simulated", "design"].includes(fields.evidenceType));
    if (fields.recordDate) {
      check(/^\d{4}-\d{2}-\d{2}$/.test(fields.recordDate));
      const date = new Date(fields.recordDate + "T00:00:00Z");
      check(Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === fields.recordDate);
    }
    return fields;
  }

  function serialize(kind, courseId, data) {
    const text=JSON.stringify({format:"jobhub-backup", version:1, kind, ...(kind === "course" ? {courseId} : {}), exportedAt:new Date().toISOString(), data:normalize(data,kind)}, null, 2);
    check(new TextEncoder().encode(text).length<=LIMIT);
    return text;
  }
  function parse(source, kind, courseId) {
    check(typeof source === "string" && source.length <= LIMIT);
    const value = JSON.parse(source);
    check(object(value) && value.format === "jobhub-backup" && value.version === 1 && value.kind === kind);
    if (kind === "course") check(value.courseId === courseId);
    return normalize(value.data, kind);
  }
  function merge(current, incoming, kind, replace = false) {
    current = normalize(current, kind); incoming = normalize(incoming, kind);
    if (replace) return incoming;
    if (kind === "course") return {
      completed: [...new Set([...current.completed,...incoming.completed])].sort((a,b)=>a-b),
      notes: Object.fromEntries(Object.keys(current.notes).map(k=>[k,current.notes[k].trim() ? current.notes[k] : incoming.notes[k]])),
      lastDay: current.lastDay
    };
    return Object.fromEntries(portfolioFields.map(k=>[k,current[k].trim() ? current[k] : incoming[k]]));
  }

  function mount({element, kind, courseId, read, apply, language}) {
    if (!element) return;
    let pending = null, message = "", sequence = 0;
    const copy = {
      title:["备份与恢复", "Backup & restore"],
      note:["备份只包含当前课程或当前作品。JSON 可重新导入，原有 Markdown 下载用于阅读与分享。文件只在本浏览器处理。", "Back up this course or this portfolio. JSON can be imported again; Markdown exports are for reading and sharing. Files stay in this browser."],
      export:["生成 JSON 备份", "Generate JSON backup"], download:["下载 JSON", "Download JSON"],
      input:["粘贴备份 JSON，或选择备份文件", "Paste backup JSON or choose a backup file"],
      preview:["检查并预览导入", "Validate & preview import"],
      merge:["合并：保留已有非空内容，课程完成记录取并集", "Merge: preserve existing nonempty fields and combine completed days"],
      replace:["替换：覆盖当前课程记录或当前作品草稿", "Replace: overwrite this course record or this portfolio draft"],
      apply:["确认导入", "Apply import"],
      invalid:["无法导入：请使用本站 JSON 备份，核对类型、课程、版本及内容长度。原记录未更改。", "Cannot import: check the JobHub JSON backup type, course, version and size. Existing records were not changed."],
      ready:["检查通过。选择合并或替换，再确认导入。", "Validation passed. Choose merge or replace, then apply."],
      done:["已导入并保存在本浏览器。", "Imported and saved in this browser."],
      unsaved:["已恢复到页面，但浏览器保存失败。请生成备份后再离开。", "Restored on this page, but browser storage failed. Generate a backup before leaving."],
      generated:["备份已生成，可下载或复制下方 JSON。", "Backup generated. Download or copy the JSON below."],
      output:["备份 JSON（可全选复制）", "Backup JSON (select to copy)"],
      limit:["最大 1 MiB；旧版 Markdown 学习记录暂不支持自动导入。", "Maximum 1 MiB; older Markdown learning records cannot be imported automatically."]
    };
    const pick = key => copy[key][language() === "en" ? 1 : 0];
    const translated = [];
    function node(tag, key, parent = element) {
      const el = document.createElement(tag);
      if (key) translated.push([el,key]);
      parent.append(el); return el;
    }
    node("summary","title"); node("p","note");
    const actions = node("div"); actions.className = "course-actions";
    const exportButton = node("button","export",actions); exportButton.type="button"; exportButton.className="button outline";
    const download = node("button","download",actions); download.type="button"; download.className="button outline"; download.disabled=true;
    const outputLabel=node("label","output"); outputLabel.htmlFor="backup-output";
    const output=node("textarea"); output.id="backup-output"; output.readOnly=true; output.rows=3; output.spellcheck=false;
    const inputLabel=node("label","input"); inputLabel.htmlFor="backup-input";
    const input=node("textarea"); input.id="backup-input"; input.rows=4; input.maxLength=LIMIT; input.spellcheck=false;
    const file=node("input"); file.type="file"; file.accept=".json,application/json"; file.setAttribute("aria-labelledby","backup-file-label");
    inputLabel.id="backup-file-label"; node("p","limit");
    const preview=node("button","preview"); preview.type="button"; preview.className="button outline";
    const panel=node("div"); panel.hidden=true; panel.className="backup-preview";
    const description=node("p",null,panel);
    const mode=node("select",null,panel); mode.id="backup-mode";
    for(const key of ["merge","replace"]) {const option=node("option",key,mode); option.value=key;}
    const applyButton=node("button","apply",panel); applyButton.type="button"; applyButton.className="button primary";
    const status=node("p"); status.setAttribute("role","status"); status.className="backup-status";
    function translate() {
      translated.forEach(([el,key])=>{el.textContent=pick(key);});
      mode.setAttribute("aria-label",language()==="en" ? "Import mode" : "导入方式");
      status.textContent=message ? pick(message) : "";
      if(pending) description.textContent=kind==="course" ? (language()==="en" ? `${pending.completed.length} completed days; ${Object.values(pending.notes).filter(x=>x.trim()).length} days with notes. Course: ${courseId}.` : `${pending.completed.length} 天完成记录，${Object.values(pending.notes).filter(x=>x.trim()).length} 天有笔记。课程：${courseId}。`) : (language()==="en" ? `${Object.values(pending).filter(x=>x.trim()).length} nonempty fields. Title: ${pending.projectTitle || "(empty)"}` : `${Object.values(pending).filter(x=>x.trim()).length} 个非空字段。作品：${pending.projectTitle || "（空）"}`);
    }
    const invalidate=()=>{pending=null; panel.hidden=true; message=""; translate();};
    input.addEventListener("input",()=>{sequence++; preview.disabled=false; invalidate();});
    file.addEventListener("change",async()=>{
      const current=++sequence; invalidate(); preview.disabled=false; const selected=file.files[0]; if(!selected)return; preview.disabled=true;
      try {check(selected.size<=LIMIT); const text=await selected.text(); if(current!==sequence)return; invalidate(); input.value=text;}
      catch {if(current===sequence){message="invalid"; translate();}}
      finally {if(current===sequence)preview.disabled=false;}
    });
    preview.addEventListener("click",()=>{
      try {pending=parse(input.value,kind,courseId); mode.value="merge"; panel.hidden=false; message="ready";}
      catch {pending=null; panel.hidden=true; message="invalid";}
      translate();
    });
    applyButton.addEventListener("click",()=>{
      if(!pending)return;
      let next;
      try {next=merge(read(),pending,kind,mode.value==="replace");}
      catch {message="invalid"; translate(); return;}
      const saved=apply(next); pending=null; panel.hidden=true; message=saved===false ? "unsaved" : "done"; translate();
    });
    exportButton.addEventListener("click",()=>{
      try {output.value=serialize(kind,courseId,read()); download.disabled=false; message="generated";}
      catch {message="invalid";}
      translate();
    });
    download.addEventListener("click",()=>{
      if(!output.value)return;
      const url=URL.createObjectURL(new Blob([output.value],{type:"application/json;charset=utf-8"}));
      const anchor=document.createElement("a"); anchor.href=url; anchor.download=(courseId || "portfolio")+"-backup.json";
      anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    translate();
    new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  }
  return {parse, serialize, merge, normalize, mount, portfolioFields};
})();
if (typeof module !== "undefined" && module.exports) module.exports=JobHubBackup;
