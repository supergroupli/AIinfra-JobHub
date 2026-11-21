"use strict";
(() => {
  const copy={
    zh:{afterPrimerReview:"你自述六项技术基础均能独立完成。学完启蒙后，可以尝试对应岗位的项目。",inferenceFirst:"我第一次接触模型推理，想从启蒙课开始",inferenceFirstHelp:"会编程也可以勾选。",firstActivity:"启蒙第一课会做什么？",primerStart:"我第一次听说推理，开始第一课",later:"学完启蒙课，再看岗位路线",paper:"用纸笔走一遍",brand:"聘枢",skip:"跳到起步自查",start:"从这里开始",learn:"学习库",projects:"实战项目",career:"求职准备",title:"从你会的出发，找到下一步。",intro:"第一次听说“推理”，可以直接用手机或电脑给小模型发个开头，看它怎样接着写。已经做过实验，可以按现有基础选下一门课。",begin:"按我的基础选课",experienced:"已有经验？直接挑战项目 ↗",map1:"选一句开头，猜它会接哪个词",map2:"点“发送”，观察第一块文字",map3:"换个开头，解释结果有什么变化",mapNote:"手机或电脑都能做，第一课约 5–10 分钟。",formTitle:"按你的情况安排",role:"我想探索的方向",hardware:"可用设备",hours:"每周可用时间",basics:"六项基础自查",basicsNote:"按现在能独立做的选择。不确定就选“还没接触”；这只会帮助安排复习，不会限制浏览课程或项目。",show:"查看我的建议 ↘",reset:"重置本页选择",resultTitle:"你的起步建议",boundary:"这里按明确规则选择资源，不打能力分、不决定录用。自述“能独立完成”不等于已验证；要用实际代码、结果与解释来检验。",methodTitle:"这些建议是怎样产生的？",rule1:"勾选“我第一次接触模型推理”，起步建议会优先安排启蒙课。如果终端和 Python 都选“还没接触”，同样从浏览器启蒙课开始。其他基础缺口会对应到具体练习。",rule2:"方向：目标岗位决定后续三节课、项目和求职准备路线。它不声称完整覆盖该岗位，也不要求先修完所有课。",rule3:"设备与时间：CPU 路线始终开放；GPU 只增加可选实机实验。每周时间只调整节奏，课程里的 Day 不等于你必须一天完成。",footer:"聘枢 · 用可核查的贡献连接学习与工作。",stored:"选择仅存本浏览器，未向招聘方提交。清除浏览器数据会丢失记录；可下载建议留存。",storageError:"浏览器记录未能读取或保存。本页仍可使用；离开前请下载建议。",resetError:"本次选择已重置，但浏览器存储清除失败；刷新后旧记录可能再次出现。本页仍可继续使用。",resetDone:"已重置本页选择；其他工具记录与语言设置保持不变。",updated:"建议已按当前选择更新。",review:"先补哪些基础？",reviewEmpty:"你自述六项基础均能独立完成，因此没有追加复习课。可以直接挑战项目，遇到具体问题再回查课程；这不表示能力已验证。",hour:"今天先用 1 小时",artifact:"第一份产出",setup:"没有 Python，或配置卡住了？",openLesson:"打开完整 Day 1 教学 ↗",downloadLab:"下载 CPU 实验包 ↓",route:"然后按方向继续",project:"直接挑战对应项目 ↗",careerLink:"进入这个方向的求职准备 ↗",download:"下载我的建议 .md ↓",downloaded:"已请求下载 Markdown。它是可阅读副本，暂不支持自动导入恢复。",downloadError:"下载未能开始，请允许浏览器下载后重试。",unknown:"链接里的方向未识别，已按保存的选择或推理方向继续。",hoursUnit:"小时 / 周",routeNote:"不必一次学完。先完成一个能复查的产出，再决定是否继续下一节。"},
    en:{afterPrimerReview:"You reported independence in all six technical basics. After the primer, try the project for your chosen role.",inferenceFirst:"I am new to model inference and want to start with the primer",inferenceFirstHelp:"You can choose this even if you already code.",firstActivity:"What will I do in my first lesson?",primerStart:"New to inference? Start lesson one",later:"After the primer, explore my role",paper:"Work through it on paper",brand:"AI Infra JobHub",skip:"Skip to starting-point check",start:"Start here",learn:"Learn",projects:"Projects",career:"Career preparation",title:"Start with what you know. Find your next step.",intro:"New to inference? Send a short prompt to a tiny model on your phone or computer and watch it continue the text. If you already run experiments, use the self-check to choose your next course.",begin:"Choose courses for my background",experienced:"Experienced? Try a project ↗",map1:"Choose a prompt and predict the next word",map2:"Press Send and observe the first piece",map3:"Change the prompt and explain the difference",mapNote:"Use your phone or computer. Allow about 5–10 minutes for the first lesson.",formTitle:"Plan around your situation",role:"The direction I want to explore",hardware:"Available hardware",hours:"Time available each week",basics:"Six foundation checks",basicsNote:"Choose what you can do independently today. Choose “new / unsure” if needed; it only suggests review and never restricts access to a course or project.",show:"View my suggestions ↘",reset:"Reset this page’s choices",resultTitle:"Your starting plan",boundary:"Explicit rules select resources here, with no ability score or hiring decision. A self-report of independence is not verified capability; check it through actual code, results and explanations.",methodTitle:"How are these suggestions made?",rule1:"Choose the new-to-inference option to start with the primer. The primer also comes first when both terminal use and Python are new to you. Other gaps link to specific exercises.",rule2:"Direction: the target role selects three next lessons, a project and a career preparation path. This is not a complete role curriculum; finishing all courses is not a prerequisite.",rule3:"Hardware and time: a CPU route is always available; GPUs add optional real-device experiments. Weekly hours only change the pace; a lesson labelled Day does not need to fit into one calendar day.",footer:"AI Infra JobHub · Connect learning and work through verifiable contributions.",stored:"Choices stay in this browser and are not sent to recruiters. Clearing browser data removes them; download a copy to keep.",storageError:"Browser data could not be read or saved. This page still works; download your plan before leaving.",resetError:"Current choices were reset, but stored data could not be cleared. Old choices may return after a reload; you can still use this page.",resetDone:"Reset only this page’s choices. Other tools’ records and language preferences are unchanged.",updated:"Suggestions updated for your current choices.",review:"Which foundations should I review?",reviewEmpty:"You reported independence in all six foundations, so no extra review lessons were added. Try a project and return to a lesson for a specific gap; this does not verify your capability.",hour:"Start with one hour today",artifact:"Your first artifact",setup:"No Python, or setup is taking longer?",openLesson:"Open the full Day 1 lesson ↗",downloadLab:"Download the CPU lab ↓",route:"Then continue in your direction",project:"Try the matching project ↗",careerLink:"Open this role’s career preparation ↗",download:"Download my plan .md ↓",downloaded:"Markdown download requested. This is a readable copy; automatic import is not available.",downloadError:"The download could not start. Allow downloads in this browser and try again.",unknown:"The role in the link was not recognized. Using saved choices or the inference direction.",hoursUnit:"hours / week",routeNote:"You do not need to finish everything at once. Create one reviewable artifact before deciding on the next lesson."}
  };
  const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),languageKey="infra-commons:language";
  let storage;try{storage=window.localStorage;}catch{storage=null;}
  const loaded=StartModel.load(storage);let state=loaded.state,storageMode=loaded.ok?"stored":"storageError",actionKey="";
  let savedLanguage="zh";try{savedLanguage=JSON.parse(storage.getItem(languageKey));}catch{}
  let lang=["zh","en"].includes(params.get("lang"))?params.get("lang"):savedLanguage==="en"?"en":"zh";
  const validRole=value=>Object.prototype.hasOwnProperty.call(StartModel.roles,value);
  let unknownRole=params.has("role")&&!validRole(params.get("role"));
  if(validRole(params.get("role")))state=StartModel.normalize({...state,role:params.get("role")});
  const t=key=>copy[lang][key];
  const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
  const localURL=url=>{const parsed=new URL(url,location.href);if(parsed.origin===location.origin)parsed.searchParams.set("lang",lang);return parsed.href;};
  const link=(text,url,className)=>{const n=el("a",text,className);n.href=localURL(url);return n;};
  function selectOptions(select,options,value){select.replaceChildren(...options.map(([id,title])=>{const option=el("option",title);option.value=id;return option;}));select.value=String(value);}
  function updateURL(){try{const url=new URL(location.href);url.searchParams.set("lang",lang);url.searchParams.set("role",state.role);history.replaceState(null,"",url);}catch{}}
  function renderStatus(){$("start-storage-status").textContent=t(storageMode);$("start-action-status").textContent=actionKey?t(actionKey):"";}
  function renderForm(){
    $("start-inference-first").checked = state.newToInference;
    selectOptions($("start-role"),Object.entries(StartModel.roles).map(([id,r])=>[id,r.title[lang]]),state.role);
    selectOptions($("start-hardware"),Object.entries(StartModel.hardware).map(([id,r])=>[id,r[lang]]),state.hardware);
    selectOptions($("start-hours"),[2,5,10].map(h=>[h,`${h} ${t("hoursUnit")}`]),state.hours);
    $("start-skills").replaceChildren(...StartModel.skills.map(s=>{const box=el("div",undefined,"start-skill"),label=el("label",s.title[lang]),desc=el("p",s.prompt[lang]),select=el("select");select.id=`start-skill-${s.id}`;select.name=s.id;label.htmlFor=select.id;desc.id=`${select.id}-help`;select.setAttribute("aria-describedby",desc.id);selectOptions(select,Object.entries(StartModel.levels).map(([id,l])=>[id,l[lang]]),state.skills[s.id]);box.append(label,desc,select);return box;}));
  }
  function renderPlan(){
    const plan=StartModel.recommend(state,lang),root=document.createDocumentFragment();
    if(unknownRole)root.append(el("p",t("unknown"),"start-note"));
    const first = plan.firstHour;
    const browser = first.mode === "browser";
    const hour = el("section", undefined, "start-plan-section start-hour");
    hour.append(el("h3", browser ? first.title : t("hour")));
    hour.append(el("p", browser ? first.reason : first.title));
    const steps = el("ol");
    first.steps.forEach(step => steps.append(el("li", step)));
    hour.append(steps);
    if (first.commands.length) {
      const pre = el("pre");
      pre.append(el("code", first.commands.join("\n")));
      hour.append(pre);
    }
    const artifact = el("p", first.artifact, "start-artifact");
    const fallback = el("details");
    fallback.append(el("summary", t(browser ? "paper" : "setup")), el("p", first.fallback));
    fallback.open = !browser && (state.skills.python !== "comfortable" || state.skills.linux !== "comfortable");
    const actions = el("div", undefined, "start-actions");
    actions.append(link(t(browser ? "primerStart" : "openLesson"), first.url, browser ? "button primary" : "text-link"));
    if (first.download) actions.append(link(t("downloadLab"), first.download, "text-link"));
    hour.append(el("h4", t("artifact")), artifact, fallback, actions);

    const rest = browser ? el("details", undefined, "start-after-primer") : root;
    if (browser) {
      root.append(hour, rest);
      rest.append(el("summary", t("later")), el("p", first.bridge.detail), link(first.bridge.title, first.bridge.url, "text-link"));
    }
    rest.append(el("p", plan.roleTitle, "start-summary"), el("p", plan.pacing, "start-pacing"), el("p", plan.hardwareNote, "start-note"));
    const review = el("section", undefined, "start-plan-section");
    review.append(el("h3", t("review")));
    if (!plan.reviews.length) {
      review.append(el("p", t(browser ? "afterPrimerReview" : "reviewEmpty")));
    } else {
      const list = el("ol", undefined, "start-review-list");
      for (const lesson of plan.reviews) {
        const row = el("li");
        row.append(link(`${lesson.course} · Day ${lesson.day} · ${lesson.title}`, lesson.url));
        const reasons = el("ul");
        lesson.reasons.forEach(reason => reasons.append(el("li", reason)));
        row.append(reasons);
        list.append(row);
      }
      review.append(list);
    }
    rest.append(review);
    if (!browser) rest.append(hour);
    const route=el("section",undefined,"start-plan-section");route.append(el("h3",t("route")),el("p",plan.routeReason));const routeList=el("ol",undefined,"start-route-list");plan.route.forEach((r,i)=>{const row=el("li");row.append(el("small",`0${i+1} / ${r.course} / DAY ${r.day}`),link(r.title,r.url));routeList.append(row);});route.append(routeList,el("p",t("routeNote")));const next=el("div",undefined,"start-actions");next.append(link(t("project"),plan.projectURL,"button primary"),link(t("careerLink"),plan.careerURL,"text-link"));route.append(next);rest.append(route);
    const download=el("button",t("download"),"button outline");download.type="button";download.id="start-download";download.addEventListener("click",downloadPlan);const dl=el("div",undefined,"start-actions");dl.append(download);root.append(dl);$("start-plan").replaceChildren(root);$("hero-project").href=localURL(plan.projectURL);
    const navCareer=document.querySelector('nav [data-language-link="../career/"]');if(navCareer)navCareer.href=localURL(plan.careerURL);
  }
  function render(){document.documentElement.lang=lang==="zh"?"zh-CN":"en";document.title=`${t("start")} · AI Infra JobHub`;document.querySelectorAll("[data-i18n]").forEach(n=>n.textContent=t(n.dataset.i18n));document.querySelectorAll("[data-language-link]").forEach(n=>n.href=localURL(n.dataset.languageLink));$("start-language").textContent=lang==="zh"?"EN ↗":"中文 ↗";$("start-language").setAttribute("aria-label",lang==="zh"?"Switch to English":"切换为中文");renderForm();renderPlan();renderStatus();}
  function readForm(){state=StartModel.normalize({newToInference:$("start-inference-first").checked,role:$("start-role").value,hardware:$("start-hardware").value,hours:Number($("start-hours").value),skills:Object.fromEntries(StartModel.skills.map(s=>[s.id,$(`start-skill-${s.id}`).value]))});}
  function persist(){storageMode=StartModel.save(storage,state)?"stored":"storageError";}
  function downloadPlan(){try{const url=URL.createObjectURL(new Blob([StartModel.markdown(state,lang)],{type:"text/markdown;charset=utf-8"})),a=el("a");a.href=url;a.download=`jobhub-start-${state.role}.${lang}.md`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);actionKey="downloaded";}catch{actionKey="downloadError";}renderStatus();}
  $("start-form").addEventListener("change",()=>{readForm();unknownRole=false;persist();updateURL();renderPlan();actionKey="updated";renderStatus();});
  $("start-form").addEventListener("submit",event=>{event.preventDefault();readForm();persist();updateURL();renderPlan();actionKey="updated";renderStatus();$("start-result").focus({preventScroll:true});$("start-result").scrollIntoView({behavior:"auto",block:"start"});});
  $("start-reset").addEventListener("click",()=>{state=StartModel.normalize(null);unknownRole=false;storageMode=StartModel.reset(storage)?"stored":"resetError";actionKey=storageMode==="stored"?"resetDone":"resetError";updateURL();render();});
  $("start-language").addEventListener("click",()=>{lang=lang==="zh"?"en":"zh";try{storage.setItem(languageKey,JSON.stringify(lang));}catch{}updateURL();render();});
  render();
})();
