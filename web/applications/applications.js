"use strict";
(() => {
  const M = ApplicationsModel, $ = id => document.getElementById(id), languageKey = "infra-commons:language";
  const strings = {
    zh: {
      skip:"跳到投递记录",brand:"聘枢",opportunities:"找机会",career:"求职准备",talent:"人才广场",applications:"投递记录",title:"把每次机会，变成清晰的下一步。",intro:"记下想投的岗位、已经发生的面试和下一步行动。求职有节奏，准备有方向。",newRecord:"＋ 添加投递记录",privateTitle:"你的求职草稿本",privacy:"仅保存在当前设备、当前浏览器；不上传，不自动投递、不发送邮件，也不云同步。清理浏览器会丢失记录，请定期导出备份。此页不是加密保险箱，共用设备请勿填写敏感资料。",noPublish:"导出的文件包含个人笔记，请勿提交到公开 GitHub 仓库。",recordsTitle:"我的机会清单",search:"搜索公司、职位或笔记",filterStatus:"筛选状态",all:"全部状态",planned:"待投递",applied:"已投递",interview:"面试中",offer:"收到 Offer",closed:"已结束",dueOnly:"只看今天及逾期行动",undo:"撤销删除",addTitle:"添加一条真实机会",editTitle:"编辑投递记录",formHint:"先去企业官方渠道核实岗位。这里的记录只帮助你整理，不代表已向企业投递。",company:"公司 *",role:"职位 *",url:"官方岗位链接（可选，仅 HTTPS）",status:"当前状态",appliedAt:"实际投递日期（可选）",nextAt:"下一步日期（可选）",notes:"行动与笔记（可选，最多 4,000 字符）",notesHint:"写清下一步，例如补充作品链接、准备性能诊断题。请勿存放身份证件、密码或他人的私密信息。",save:"保存到本机",saveEdit:"保存修改",cancel:"取消编辑",backupTitle:"给求职进度留个备份",backupHint:"换设备前导出 JSON，再到新设备导入。导入前会展示预览；ID 相同的记录保留本机版本，不覆盖笔记。最多保存 100 条记录，备份文件上限 4 MiB。",exportJson:"导出 JSON 备份",exportMd:"导出 Markdown",file:"选择 JSON 备份文件",paste:"或粘贴 JSON 备份",preview:"校验并预览导入",previewTitle:"导入预览",confirmImport:"确认合并到本机",cancelImport:"取消导入",exportFallback:"导出文本（下载未弹出时可手动复制）",exportText:"个人草稿，请勿公开",nextTitle:"下一步，把准备变成证据。",nextIntro:"用作品说明你解决过什么问题，再把合适的机会放进自己的投递清单。",goCareer:"完善求职作品",goTalent:"了解人才展示",goJobs:"查看招聘机会 ↗",footer:"开源学习，共同成长。个人记录仅在你的浏览器中保存。",home:"返回首页",emptyTitle:"从一条你核实过的机会开始",emptyBody:"还没有记录。添加真实的目标岗位，写下下一步行动；我们不会生成虚构招聘信息。",noMatch:"没有符合当前筛选的记录",noMatchBody:"尝试清空搜索、切换状态，或关闭到期筛选。",edit:"编辑",remove:"删除",official:"打开你填写的岗位链接 ↗",unverified:"链接由你填写，平台未核验",applicationDate:"投递日期",nextDate:"下一步日期",undated:"未填写",dueLabel:"今天或已逾期",saved:"记录已保存在本机。",memorySaved:"记录已保留在当前页面内存，请立即导出 JSON 备份。",removed:"记录已删除，可以撤销。",restored:"已恢复删除的记录。",deleted:"已删除：",loadError:"无法读取本机存档，旧存档尚未被覆盖。本次编辑只保存在页面内存。请先导出当前记录；只有明确点击下方按钮，才会用当前清单替换原存档。",saveError:"浏览器保存失败（可能禁用了存储或空间不足）。当前记录仍在页面内存，关闭或刷新会丢失未保存修改，请立即导出 JSON 备份。",retry:"重试本机保存",replace:"明确用当前清单替换无法读取的存档",replaceConfirm:"旧存档将被当前清单替换，无法撤销。确认你已自行保留所需旧数据，并继续？",imported:"已合并备份，相同 ID 的记录保留了本机版本。",readFailed:"无法读取文件，请重新选择文件或粘贴 JSON。",fileLoaded:"文件已读取，请点击「校验并预览导入」。",exported:"已准备导出文件。若未出现下载，可展开下方导出文本复制。",noUndo:"已没有可撤销的删除。",noChanges:"没有新增记录，本机内容保持不变。",limit:"最多保存 100 条记录，请先整理已有记录。",error:"内容校验失败：",err_json:"JSON 格式不正确。",err_version:"备份格式或版本不支持，仅接受本站 version 1 备份。",err_size:"备份文件不能超过 4 MiB。",err_record:"记录字段缺失或包含不支持的字段。",err_id:"记录 ID 必须是 1–80 位字母、数字、下划线或短横线，且首位为字母或数字。",err_company:"公司不能为空，且不能超过 120 字符。",err_role:"职位不能为空，且不能超过 160 字符。",err_url:"请填写不含凭据、空格的 HTTPS 链接，最多 2,000 字符。",err_status:"投递状态不合法。",err_date:"日期必须是 1900–9999 年之间真实存在的 YYYY-MM-DD 日期，或留空。",err_notes:"笔记不能超过 4,000 字符，也不能包含非法控制字符。",err_limit:"最多保存 100 条记录。",err_duplicate:"备份中存在重复 ID，请先修正。",err_unknown:"请检查内容后重试。",kept:"保留本机版本",added:"将新增"
    },
    en: {
      skip:"Skip to application tracker",brand:"JobHub",opportunities:"Opportunities",career:"Career prep",talent:"Talent",applications:"My applications",title:"Give every opportunity a clear next step.",intro:"Keep track of roles, interviews and your next action. A calmer, more deliberate job search starts here.",newRecord:"＋ Add an application",privateTitle:"Your private job-search notebook",privacy:"Stored only in this browser on this device. No uploads, automatic applications, emails or cloud sync. Clearing browser data deletes records, so export backups regularly. This is not encrypted storage; avoid sensitive data on shared devices.",noPublish:"Exports contain personal notes. Do not commit them to a public GitHub repository.",recordsTitle:"My opportunity list",search:"Search company, role or notes",filterStatus:"Filter by status",all:"All statuses",planned:"Planned",applied:"Applied",interview:"Interview",offer:"Offer",closed:"Closed",dueOnly:"Only today and overdue actions",undo:"Undo deletion",addTitle:"Add a real opportunity",editTitle:"Edit application",formHint:"Verify the position on the employer’s official channels. Saving a record here does not submit an application.",company:"Company *",role:"Role *",url:"Official role URL (optional, HTTPS only)",status:"Current status",appliedAt:"Actual application date (optional)",nextAt:"Next step date (optional)",notes:"Actions and notes (optional, up to 4,000 characters)",notesHint:"Specify the next action, such as adding project evidence or practicing a performance diagnosis. Do not store identity documents, passwords or others’ private information.",save:"Save on this device",saveEdit:"Save changes",cancel:"Cancel edit",backupTitle:"Keep a backup of your progress",backupHint:"Export JSON before changing devices, then import it on your new device. Preview before merging; matching IDs keep the local version without overwriting notes. Maximum 100 records; backup limit 4 MiB.",exportJson:"Export JSON backup",exportMd:"Export Markdown",file:"Choose a JSON backup",paste:"Or paste a JSON backup",preview:"Validate and preview import",previewTitle:"Import preview",confirmImport:"Confirm merge on this device",cancelImport:"Cancel import",exportFallback:"Export text (copy if download did not start)",exportText:"Personal draft — do not publish",nextTitle:"Turn your preparation into evidence.",nextIntro:"Show which problems you have solved, then add suitable opportunities to your own application list.",goCareer:"Build your career evidence",goTalent:"Explore talent profiles",goJobs:"View opportunities ↗",footer:"Open learning, shared growth. Personal records stay in your browser.",home:"Back to home",emptyTitle:"Start with an opportunity you have verified",emptyBody:"No records yet. Add a real target role and your next action. We do not create fictional job listings.",noMatch:"No records match these filters",noMatchBody:"Clear your search, choose another status, or turn off the due filter.",edit:"Edit",remove:"Delete",official:"Open your saved role link ↗",unverified:"User-supplied link; not verified by JobHub",applicationDate:"Applied on",nextDate:"Next step",undated:"Not set",dueLabel:"Today or overdue",saved:"Records saved on this device.",memorySaved:"Records remain in this page’s memory. Export a JSON backup now.",removed:"Record deleted. You can undo this action.",restored:"Deleted record restored.",deleted:"Deleted: ",loadError:"The saved data could not be read. It has not been overwritten. Edits stay in page memory. Export your current records first; only the explicit replacement button below can overwrite the unreadable saved data.",saveError:"Browser storage failed (it may be disabled or full). Records remain in page memory. Closing or refreshing loses unsaved changes; export a JSON backup now.",retry:"Retry saving locally",replace:"Explicitly replace unreadable data with this list",replaceConfirm:"This replaces the old stored data with the current list and cannot be undone. Continue only if you have retained any old data you need. Continue?",imported:"Backup merged. Matching IDs kept the local version.",readFailed:"Could not read the file. Select it again or paste the JSON.",fileLoaded:"File loaded. Click “Validate and preview import” next.",exported:"Export prepared. If no download appears, expand the export text below and copy it.",noUndo:"No deletion to undo.",noChanges:"No new records. Local content was unchanged.",limit:"Maximum 100 records. Please organize existing records first.",error:"Validation failed: ",err_json:"Invalid JSON.",err_version:"Unsupported backup format or version. Use a version 1 JobHub backup.",err_size:"The backup must not exceed 4 MiB.",err_record:"Record fields are missing or unsupported fields were included.",err_id:"Record IDs must be 1–80 ASCII letters, numbers, underscores or hyphens, starting with a letter or number.",err_company:"Company is required, up to 120 characters.",err_role:"Role is required, up to 160 characters.",err_url:"Use an HTTPS URL without credentials or spaces, up to 2,000 characters.",err_status:"Invalid application status.",err_date:"Use a real YYYY-MM-DD date between years 1900 and 9999, or leave it blank.",err_notes:"Notes must be at most 4,000 characters, without invalid control characters.",err_limit:"Maximum 100 records.",err_duplicate:"The backup has duplicate IDs. Correct it before importing.",err_unknown:"Check the content and try again.",kept:"Keep local version",added:"Will add"
    }
  };
  let lang = "zh";
  try { const saved = JSON.parse(localStorage.getItem(languageKey)); if (["en","zh"].includes(saved)) lang = saved; } catch (_) {}
  const params = new URLSearchParams(location.search);
  if (["en","zh"].includes(params.get("lang"))) lang = params.get("lang");
  const t = key => strings[lang][key] || key;
  // Access localStorage through an adapter: even accessing it can throw in restricted browsers.
  const store = M.createStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
  let editing = null, undo = null, pending = null, feedback = null, readSequence = 0;
  const formFields = ["company","role","url","status","appliedAt","nextAt","notes"];
  function node(tag,text,className) { const el=document.createElement(tag); if(text!==undefined)el.textContent=text; if(className)el.className=className; return el; }
  function say(key,error = false) { feedback = {key,error}; renderFeedback(); }
  function renderFeedback() { $("feedback").textContent=feedback ? t(feedback.key)+(feedback.detail?t(feedback.detail):"") : ""; $("feedback").classList.toggle("is-error",Boolean(feedback?.error)); }
  function error(err) { feedback = {key:"error",error:true,detail:Object.hasOwn(strings[lang],`err_${err.message}`)?`err_${err.message}`:"err_unknown"}; renderFeedback(); }
  function renderStorage() {
    $("storage-warning").hidden=!store.error;
    $("storage-message").textContent=t(store.error==="load"?"loadError":"saveError");
    $("storage-retry").textContent=t(store.blocked?"replace":"retry");
  }
  function invalidateImport() { pending=null; $("import-preview").hidden=true; }
  function persist(records,key="saved") { store.set(records); invalidateImport(); renderRecords(); renderStorage(); say(store.error?"memorySaved":key,Boolean(store.error)); }
  function clearForm() { editing=null; $("record-form").reset(); $("form-title").textContent=t("addTitle"); $("save").textContent=t("save"); $("cancel").hidden=true; }
  function edit(record) { editing=record.id; formFields.forEach(key=>{$(key).value=record[key];}); $("form-title").textContent=t("editTitle"); $("save").textContent=t("saveEdit"); $("cancel").hidden=false; $("record-form").scrollIntoView({behavior:"smooth",block:"start"}); $("company").focus({preventScroll:true}); }
  function renderUndo() { $("undo-panel").hidden=!undo; $("undo-message").textContent=undo?t("deleted")+undo.company+" · "+undo.role:""; }
  function renderRecords() {
    const list=store.records, localDate=M.today(), search=$("search").value.trim().toLocaleLowerCase(), status=$("filter-status").value;
    const visible=list.filter(r=>(status==="all"||r.status===status)&&(!$("due-only").checked||M.due(r,localDate))&&(!search||[r.company,r.role,r.notes].join("\n").toLocaleLowerCase().includes(search)));
    $("summary").textContent=lang==="zh"?`${list.length} / 100 条记录 · ${list.filter(r=>M.due(r,localDate)).length} 条行动到期`:`${list.length} / 100 records · ${list.filter(r=>M.due(r,localDate)).length} actions due`;
    $("due-note").textContent=lang==="zh"?`按此设备本地日期 ${localDate} 标记今天及逾期行动，已结束记录不计入。仅在打开此页时展示，没有后台提醒或通知。`:`Due actions use this device’s local date (${localDate}); closed records are excluded. Displayed only while this page is open. No background reminders or notifications.`;
    const container=$("records"); container.replaceChildren();
    if (!visible.length) { const empty=node("div",undefined,"applications-empty"); empty.append(node("h3",t(list.length?"noMatch":"emptyTitle")),node("p",t(list.length?"noMatchBody":"emptyBody"))); container.append(empty); }
    for (const r of visible) {
      const card=node("article",undefined,"application-card"+(M.due(r,localDate)?" is-due":""));
      card.append(node("span",t(r.status),"application-status"),node("p",r.company,"application-company"),node("h3",r.role));
      const dates=node("dl"); dates.append(node("dt",t("applicationDate")),node("dd",r.appliedAt||t("undated")),node("dt",t("nextDate")),node("dd",(r.nextAt||t("undated"))+(M.due(r,localDate)?` · ${t("dueLabel")}`:""))); card.append(dates);
      if(r.url) { const a=node("a",t("official"),"text-link"); a.href=r.url; a.target="_blank"; a.rel="noopener noreferrer"; a.title=t("unverified"); card.append(a); }
      if(r.notes)card.append(node("p",r.notes,"application-notes"));
      const actions=node("div",undefined,"applications-actions"), editButton=node("button",t("edit"),"button outline"), deleteButton=node("button",t("remove"),"button outline");
      editButton.type=deleteButton.type="button"; editButton.setAttribute("aria-label",`${t("edit")} ${r.company} · ${r.role}`); deleteButton.setAttribute("aria-label",`${t("remove")} ${r.company} · ${r.role}`);
      editButton.addEventListener("click",()=>edit(r)); deleteButton.addEventListener("click",()=>{ undo=r; if(editing===r.id)clearForm(); persist(M.remove(store.records,r.id),"removed"); renderUndo(); $("undo").focus(); });
      actions.append(editButton,deleteButton); card.append(actions); container.append(card);
    }
    renderUndo();
  }
  function renderPreview() {
    if(!pending) { $("import-preview").hidden=true; return; }
    const result=M.merge(store.records,pending), localIds=new Set(store.records.map(r=>r.id));
    $("import-preview").hidden=false;
    $("import-summary").textContent=lang==="zh"?`校验通过：${pending.length} 条。将新增 ${result.added} 条，${result.conflicts} 条 ID 冲突保留本机版本。合并后共 ${result.records.length} 条。点击确认前不会导入。`:`Validated ${pending.length} records. Add ${result.added}; keep ${result.conflicts} existing IDs. Total after merge: ${result.records.length}. Nothing is imported until you confirm.`;
    $("import-records").replaceChildren(); pending.forEach(r=>$("import-records").append(node("li",`${t(localIds.has(r.id)?"kept":"added")} · ${r.company} · ${r.role} · ${t(r.status)}`)));
    $("confirm-import").disabled=result.added===0;
  }
  function renderLanguage() {
    document.documentElement.lang=lang==="zh"?"zh-CN":"en";
    document.title=lang==="zh"?"我的投递记录 · 聘枢 AI Infra JobHub":"My applications · AI Infra JobHub";
    document.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=t(el.dataset.i18n);});
    document.querySelectorAll("[data-language-link]").forEach(el=>{const url=new URL(el.dataset.languageLink,location.href);url.searchParams.set("lang",lang);el.href=url.href;});
    $("language").textContent=lang==="zh"?"EN ↗":"中文 ↗"; $("language").setAttribute("aria-label",lang==="zh"?"Switch to English":"切换到中文");
    $("form-title").textContent=t(editing?"editTitle":"addTitle"); $("save").textContent=t(editing?"saveEdit":"save");
    renderRecords(); renderStorage(); renderPreview(); renderFeedback();
  }
  $("record-form").addEventListener("submit",event=>{
    event.preventDefault();
    const id=editing||(globalThis.crypto?.randomUUID?crypto.randomUUID():`application-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const next={id,...Object.fromEntries(formFields.map(key=>[key,$(key).value]))}; next.company=next.company.trim(); next.role=next.role.trim(); next.url=next.url.trim();
    try { persist(M.upsert(store.records,next)); clearForm(); } catch(err) { error(err); }
  });
  $("cancel").addEventListener("click",clearForm);
  $("new-record").addEventListener("click",()=>{clearForm();$("company").focus({preventScroll:true});});
  ["search","filter-status","due-only"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",renderRecords));
  $("undo").addEventListener("click",()=>{
    if(!undo)return say("noUndo");
    try { const restored=M.upsert(store.records,undo); undo=null; persist(restored,"restored"); } catch(err) { error(err); }
  });
  $("storage-retry").addEventListener("click",()=>{
    if(store.blocked&&!window.confirm(t("replaceConfirm")))return;
    store.retry(store.blocked); renderStorage(); say(store.error?"memorySaved":"saved",Boolean(store.error));
  });
  $("preview").addEventListener("click",()=>{invalidateImport();try {pending=M.parse($("import-text").value); M.merge(store.records,pending); renderPreview();}catch(err){invalidateImport();error(err);}});
  $("confirm-import").addEventListener("click",()=>{
    if(!pending)return;
    try { const result=M.merge(store.records,pending); if(!result.added){invalidateImport();return say("noChanges");} persist(result.records,"imported"); $("import-text").value=""; $("import-file").value=""; undo=null; renderUndo(); }catch(err){error(err);}
  });
  $("cancel-import").addEventListener("click",invalidateImport);
  $("import-text").addEventListener("input",()=>{readSequence++; invalidateImport();});
  $("import-file").addEventListener("change",async()=>{
    invalidateImport(); const sequence=++readSequence, file=$("import-file").files[0]; if(!file)return;
    // Clear previous text so a failed new file cannot accidentally import the previous backup.
    $("import-text").value="";
    if(file.size>M.MAX_BYTES)return error(new Error("size"));
    try { const text=await file.text(); if(sequence!==readSequence)return; $("import-text").value=text; say("fileLoaded"); } catch(_) { if(sequence===readSequence)say("readFailed",true); }
  });
  function exportFile(kind) {
    const text=kind==="json"?M.backup(store.records):M.markdown(store.records,lang);
    $("export-text").value=text; $("export-details").hidden=false;
    try { const blob=new Blob([text],{type:kind==="json"?"application/json;charset=utf-8":"text/markdown;charset=utf-8"}), url=URL.createObjectURL(blob), a=node("a"); a.href=url; a.download=`jobhub-applications-${M.today()}.${kind==="json"?"json":"md"}`; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); } catch(_) { $("export-details").open=true; }
    say("exported");
  }
  $("export-json").addEventListener("click",()=>exportFile("json")); $("export-md").addEventListener("click",()=>exportFile("md"));
  $("language").addEventListener("click",()=>{lang=lang==="zh"?"en":"zh";try{localStorage.setItem(languageKey,JSON.stringify(lang));}catch(_){}const url=new URL(location.href);url.searchParams.set("lang",lang);history.replaceState(null,"",url.href);renderLanguage();});
  window.addEventListener("focus",renderRecords);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderRecords();});
  renderLanguage();
})();
