"use strict";
(() => {
  const M=SearchModel,$=id=>document.getElementById(id),params=new URLSearchParams(location.search);
  const copy={
    zh:{brand:"聘枢",skip:"跳到学习搜索",learn:"学习库",concepts:"原理知识库",cases:"故障诊断",practice:"练习与复习",title:"带着一个问题，找到下一步。",intro:"搜索每日课程的讲解、实验与报错，也可以查原理、故障案例和项目。结果直接定位到具体内容。",queryLabel:"你想弄懂什么？",submit:"搜索",kindLabel:"内容类型",allKinds:"全部内容",lesson:"每日课程",concept:"原理专题",case:"故障案例",project:"实战项目",courseLabel:"课程（仅筛选日课）",allCourses:"全部课程",reset:"清空筛选",hint:"多个关键词以空格分隔，结果需同时包含它们。中文和英文都可搜索。",try:"试试：",retryTopic:"重试",loadError:"学习索引暂时无法加载。",retry:"重试加载",more:"再显示 20 条",indexNote:"索引来自本站公开学习内容；不会搜索你的笔记、答题记录或投递草稿。",start:"不知道从哪开始？做入门自查 ↗",loading:"正在加载公开学习索引…",empty:"没有找到符合条件的内容",emptyBody:"尝试一个较短的关键词，或清空内容类型和课程筛选。也可以在下方返回完整学习库。",open:"打开具体内容 ↗",count:(n,total)=>`找到 ${n} 条内容 · 已显示 ${Math.min(total,n)} 条`,page:"搜索学习内容 · 聘枢 AI Infra JobHub"},
    en:{brand:"AI Infra JobHub",skip:"Skip to learning search",learn:"Learning library",concepts:"Core concepts",cases:"Diagnosis labs",practice:"Practice & review",title:"Bring a question. Find your next step.",intro:"Search daily explanations, experiments and troubleshooting, alongside core concepts, diagnosis cases and projects. Every result opens the specific learning material.",queryLabel:"What do you want to understand?",submit:"Search",kindLabel:"Content type",allKinds:"All content",lesson:"Daily lesson",concept:"Core concept",case:"Diagnosis case",project:"Practice project",courseLabel:"Course (daily lessons only)",allCourses:"All courses",reset:"Clear filters",hint:"Separate keywords with spaces. Results must contain every keyword. Both Chinese and English content are searched.",try:"Try:",retryTopic:"Retry",loadError:"The learning index could not be loaded.",retry:"Retry loading",more:"Show 20 more",indexNote:"This index contains public learning materials only. Your notes, answer history and application drafts are not searched.",start:"Unsure where to begin? Find a starting point ↗",loading:"Loading the public learning index…",empty:"No content matches these filters",emptyBody:"Try one shorter keyword, or clear the content type and course filters. You can also return to the full learning library below.",open:"Open this material ↗",count:(n,total)=>`${n} results · ${Math.min(total,n)} shown`,page:"Search learning materials · AI Infra JobHub"}
  };
  let language="zh";try{language=JSON.parse(localStorage.getItem("infra-commons:language"))==="en"?"en":"zh";}catch{}
  if(["zh","en"].includes(params.get("lang")))language=params.get("lang");
  let data=null,failed=false,limit=20,sequence=0;
  const t=key=>copy[language][key],node=(tag,value,className)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(className)n.className=className;return n;};
  $("learning-query").value=(params.get("q")||"").slice(0,120);
  $("learning-kind").value=M.kinds.includes(params.get("kind"))?params.get("kind"):"";
  let requestedCourse=params.get("course")||"";
  function link(label,url,className){const a=node("a",label,className);a.href=url;return a;}
  function updateURL(){const url=new URL(location.href);for(const [key,value] of Object.entries({q:$("learning-query").value.slice(0,120),kind:$("learning-kind").value,course:$("learning-course").value,lang:language}))value?url.searchParams.set(key,value):url.searchParams.delete(key);history.replaceState(null,"",url);}
  function render(){
    document.documentElement.lang=language==="en"?"en":"zh-CN";document.title=t("page");
    document.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=t(el.dataset.i18n);});
    document.querySelectorAll("[data-language-link]").forEach(a=>{const url=new URL(a.dataset.languageLink,location.href);url.searchParams.set("lang",language);a.href=url.href;});
    $("search-language").textContent=language==="en"?"中文 ↗":"EN ↗";$("search-language").setAttribute("aria-label",language==="en"?"切换为中文":"Switch to English");
    $("learning-query").placeholder=language==="en"?"KV cache, tail latency, all-reduce…":"KV cache、尾延迟、all-reduce…";
    $("search-error").hidden=!failed;$("search-retry").disabled=!failed;$("search-more").hidden=true;
    const container=$("search-results");container.replaceChildren();
    if(!data){$("search-count").textContent=t(failed?"loadError":"loading");return;}
    const course=$("learning-course").value;
    const options=[node("option",t("allCourses"))];options[0].value="";
    for(const c of data.courses){const option=node("option",c.title[language]);option.value=c.id;options.push(option);}
    $("learning-course").replaceChildren(...options);$("learning-course").value=course;
    const results=M.search(data.entries,$("learning-query").value,{kind:$("learning-kind").value,course,lang:language});
    $("search-count").textContent=t("count")(results.length,limit);
    if(!results.length){const empty=node("div",undefined,"search-empty");empty.append(node("h2",t("empty")),node("p",t("emptyBody")),link(t("learn"),`../?lang=${language}#learn`,"text-link"));container.append(empty);}
    for(const {entry,snippet} of results.slice(0,limit)){
      const card=node("article",undefined,"learning-search-card");card.tabIndex=-1;
      card.append(node("div",t(entry.kind)+(entry.kind==="lesson"?` · ${entry.course} · DAY ${entry.day}`:""),"search-result-kind"));
      const heading=node("h2");heading.append(link(entry.title[language],M.href(entry,language)));card.append(heading,node("p",snippet),link(t("open"),M.href(entry,language),"text-link"));container.append(card);
    }
    $("search-more").hidden=results.length<=limit;
  }
  function search(){limit=20;updateURL();render();}
  async function load(){const current=++sequence;failed=false;data=null;render();try{const response=await fetch("./index.json",{cache:"no-cache"});if(!response.ok)throw new Error("HTTP");const next=M.validate(await response.json());if(current!==sequence)return;data=next;const target=data.courses.some(c=>c.id===requestedCourse)?requestedCourse:"";const option=node("option",target);option.value=target;$("learning-course").replaceChildren(option);$("learning-course").value=target;if(target)$("learning-kind").value="lesson";}catch(_){if(current!==sequence)return;failed=true;}render();}
  $("search-form").addEventListener("submit",event=>{event.preventDefault();search();});
  $("learning-kind").addEventListener("change",()=>{if($("learning-kind").value!=="lesson"){$("learning-course").value="";requestedCourse="";}search();});
  $("learning-course").addEventListener("change",()=>{requestedCourse=$("learning-course").value;if(requestedCourse)$("learning-kind").value="lesson";search();});
  $("search-reset").addEventListener("click",()=>{$("learning-query").value="";$("learning-kind").value="";$("learning-course").value="";requestedCourse="";search();$("learning-query").focus();});
  document.querySelectorAll("[data-query]").forEach(button=>button.addEventListener("click",()=>{$("learning-query").value=language==="en"&&button.dataset.enQuery?button.dataset.enQuery:button.dataset.query;$("learning-kind").value="";$("learning-course").value="";requestedCourse="";search();}));
  $("search-more").addEventListener("click",()=>{const firstNew=limit;limit+=20;render();$("search-results").children[firstNew]?.focus();});
  $("search-language").addEventListener("click",()=>{language=language==="zh"?"en":"zh";try{localStorage.setItem("infra-commons:language",JSON.stringify(language));}catch{}updateURL();render();});
  $("search-retry").addEventListener("click",load);
  load();
})();
