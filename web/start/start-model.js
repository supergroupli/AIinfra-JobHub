"use strict";
const StartModel = (() => {
  const storageKey = "infra-commons:learning-start-v1";
  const base = "https://supergroupli.github.io/AIinfra-JobHub/";
  const roles = {
    "inference-engineer": { title: {zh:"推理工程师",en:"Inference engineer"}, project:"serving-baseline", lessons:[['vllm',1],['vllm',2],['vllm',4]], reason:{zh:"先锁定环境，再定义接口与基准，逐步做出可复核的服务记录。",en:"Pin an environment, define an API, then build a baseline with reviewable service records."} },
    "performance-engineer": { title: {zh:"性能工程师",en:"Performance engineer"}, project:"distributed-training", lessons:[['foundations',4],['foundations',8],['pytorch-distributed',1]], reason:{zh:"先区分计算和数据搬运，固定测量协议，再保存分布式训练前的单进程基线。",en:"Separate compute from data movement, define a measurement protocol and preserve a single-process baseline before distributed training."} },
    "platform-engineer": { title: {zh:"平台工程师",en:"Platform engineer"}, project:"ray-backpressure", lessons:[['ray',2],['ray',6],['kubernetes',2]], reason:{zh:"先理解任务提交与有界并发，再把资源预算写成声明，服务才便于排障与扩展。",en:"Understand task submission and bounded concurrency, then declare resource budgets to make services easier to diagnose and scale."} }
  };
  const hardware = {cpu:{zh:"普通电脑 / CPU",en:"Laptop / CPU"},single:{zh:"单 GPU",en:"One GPU"},multi:{zh:"多 GPU",en:"Multiple GPUs"}};
  const levels = {unknown:{zh:"还没接触 / 不确定",en:"New to this / unsure"},review:{zh:"接触过，需要复习",en:"Some experience; need a refresher"},comfortable:{zh:"能独立完成并解释",en:"Can do and explain independently"}};
  const skills = [
    {id:"linux",title:{zh:"终端与文件",en:"Terminal & files"},prompt:{zh:"能进入目录、运行命令，并找到输出文件吗？不要求使用 Linux。",en:"Can you change directories, run a command and find its output? Linux is not required."},course:"foundations",day:1,reason:{zh:"先练习解压、进入 lab.py 所在目录、读取输出。系统基础 Day 1 的实验步骤可以练这条最短路径；它不是完整 Linux 课程。",en:"Practice extracting the lab, entering the directory with lab.py and locating output. Foundations Day 1 covers this short workflow, not a complete Linux course."}},
    {id:"python",title:{zh:"Python 基础",en:"Python basics"},prompt:{zh:"能运行脚本、阅读函数，并修改列表或字典中的一个值吗？",en:"Can you run a script, read a function and change a value in a list or dictionary?"},course:"foundations",day:1,reason:{zh:"从读取 day1 函数和生成 JSON 开始；先改一个值再解释结果。课程默认会基本函数、列表和字典，不等于从零 Python 教学。",en:"Start by reading day1 and generating JSON; change one value and explain the result. The course assumes basic functions, lists and dictionaries rather than teaching Python from zero."}},
    {id:"http",title:{zh:"HTTP 请求",en:"HTTP requests"},prompt:{zh:"能说明请求、响应、状态码和超时各是什么吗？",en:"Can you explain requests, responses, status codes and timeouts?"},course:"vllm",day:2,reason:{zh:"用 vLLM Day 2 的 CPU 接口实验练习输入校验与错误响应，先理解契约，再接真实模型。",en:"Use the CPU API exercise in vLLM Day 2 to practice validation and error responses before connecting a real model."}},
    {id:"metrics",title:{zh:"指标与分位数",en:"Metrics & percentiles"},prompt:{zh:"能区分首输出等待、整体延迟、p95 和失败率吗？",en:"Can you distinguish time to first output, end-to-end latency, p95 and failure rate?"},course:"foundations",day:3,reason:{zh:"先用固定请求记录计算指标，并保留失败和超时；否则优化结果可能来自统计口径变化。",en:"Calculate metrics from fixed request records while retaining failures and timeouts; otherwise a changed definition can look like an optimization."}},
    {id:"tensors",title:{zh:"张量与内存",en:"Tensors & memory"},prompt:{zh:"能用形状、元素字节数和并发量估算内存吗？",en:"Can you estimate memory from shape, bytes per element and concurrency?"},course:"foundations",day:2,reason:{zh:"先手算张量与 KV 容量，再改变一个维度，避免把内存不足当成参数调试。",en:"Calculate tensor and KV capacity, then change one dimension to understand memory requirements before tuning parameters."}},
    {id:"concurrency",title:{zh:"并发与排队",en:"Concurrency & queues"},prompt:{zh:"能解释并发增加时，为什么吞吐和等待不一定同时改善吗？",en:"Can you explain why higher concurrency does not always improve throughput and waiting time together?"},course:"foundations",day:5,reason:{zh:"先用两条请求手算等待，再跑批处理模拟器；把服务时间和排队时间分开。",en:"Calculate waiting for two requests, then run the batching simulator; separate service time from queuing time."}}
  ];
  const lessons = {
    "foundations:1":{zh:"画出一条 AI 请求的旅程",en:"Map the journey of an AI request"},
    "foundations:2":{zh:"理解 token、张量与 KV cache",en:"Understand tokens, tensors and KV cache"},
    "foundations:3":{zh:"把用户体验翻译成指标",en:"Translate user experience into metrics"},
    "foundations:4":{zh:"区分计算瓶颈与数据搬运瓶颈",en:"Separate compute from data movement"},
    "foundations:5":{zh:"用模拟器理解排队与批处理",en:"Learn queuing and batching with a simulator"},
    "foundations:8":{zh:"建立可复现的基准协议",en:"Create a reproducible benchmark protocol"},
    "vllm:1":{zh:"锁定环境与最小可运行模型",en:"Pin the environment and a minimal model"},
    "vllm:2":{zh:"把服务变成可测试的 API",en:"Make the service a testable API"},
    "vllm:4":{zh:"建立基准线而非追逐最快数字",en:"Establish a baseline instead of chasing a peak"},
    "ray:2":{zh:"正确地提交和等待远程任务",en:"Submit and await remote tasks correctly"},
    "ray:6":{zh:"用有界并发控制内存和尾部等待",en:"Bound concurrency to control memory and tail waits"},
    "kubernetes:2":{zh:"把资源预算写进清单",en:"Declare a resource budget"},
    "pytorch-distributed:1":{zh:"保存一个可信的单进程基线",en:"Preserve a trustworthy single-process baseline"}
  };
  const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
  function normalize(input) {
    const data=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
    const chosen=data.skills&&typeof data.skills==="object"&&!Array.isArray(data.skills)?data.skills:{};
    return {version:1,newToInference:own(data,"newToInference") && data.newToInference === true,role:typeof data.role==="string"&&own(roles,data.role)?data.role:"inference-engineer",hardware:typeof data.hardware==="string"&&own(hardware,data.hardware)?data.hardware:"cpu",hours:[2,5,10].includes(data.hours)?data.hours:5,skills:Object.fromEntries(skills.map(s=>[s.id,typeof chosen[s.id]==="string"&&own(levels,chosen[s.id])?chosen[s.id]:"unknown"]))};
  }
  const langOf=lang=>lang==="en"?"en":"zh";
  const courseURL=(course,day,lang)=>`../learn/${course}/?lang=${langOf(lang)}#day-${day}`;
  function firstSession(state, lang) {
    const en = lang === "en";
    const newToTools = state.skills.linux === "unknown" && state.skills.python === "unknown";
    if (state.newToInference || newToTools) {
      const reason = state.newToInference
        ? {zh: "你选择了从模型推理启蒙开始。第一课会带你观察小模型如何接着写，再用自己的话解释它为什么选了这个词。", en: "You chose to start with model inference. Watch a tiny model continue a prompt, then explain its choice in your own words."}
        : {zh: "如果刚接触终端和 Python，可以先用手机或电脑打开第一课，在浏览器里动手。", en: "If terminal use and Python are both new to you, open this first lesson on your phone or computer and try it in the browser."};
      return {
        mode: "browser",
        course: "inference-101",
        day: 1,
        url: courseURL("inference-101", 1, lang),
        cpuReady: true,
        title: en ? "AI inference from zero" : "从零认识 AI 推理",
        reason: reason[lang],
        steps: en ? [
          "Start with “I”. Guess which piece of text will come next, then press Send.",
          "Count the training sentences where “I” is followed by “like”. Check your count against the model’s first choice.",
          "Switch the prompt to “I see” and try again. Write down the two prompts, the next piece in each case and one reason they differ."
        ] : [
          "选“我”作开头。先猜它会接哪个词，再点发送。",
          "在四句样例里数一数，“我”后面有几次是“喜欢”。把你的计数与模型的第一次选择对照。",
          "换成“我看见”再试。记下两个开头、各自接出的文字，并写一句话解释结果为什么变了。"
        ],
        commands: [],
        fallback: en
          ? "Read the four sample sentences in the lesson. Circle the word after “I” each time, then repeat for “see”. Choose the most frequent next word for each prompt."
          : "读课文里的四句样例，圈出每个“我”后面的词，再圈出“看见”后面的词。分别选出跟在它们后面次数最多的词。",
        artifact: en
          ? "Two prompt-and-output pairs and your explanation of how the model made its choice."
          : "两组输入和输出，加上你对小模型如何做选择的一句解释。",
        bridge: {
          url: courseURL("foundations", 1, lang),
          title: en ? "Continue to Foundations, day 1" : "学完启蒙后，进入系统基础第 1 天",
          detail: en
            ? "Keep using the browser for the ten short lessons. When you are ready to run code, use Foundations to turn the request journey into a Python experiment on your own computer."
            : "十节短课都可以在浏览器完成。准备好尝试代码时，再上系统基础，把请求的过程变成一次能在自己电脑上运行的 Python 实验。"
        }
      };
    }
    return {mode:"terminal",course:"foundations",day:1,url:courseURL("foundations",1,lang),cpuReady:true,download:"../labs/foundations.zip",commands:["python3 --version","python3 lab.py day1"],title:en?"Make one request timeline visible":"让一条请求的时间线变得可见",steps:en?[
      "0–10 min · Open Foundations Day 1, download and fully extract the lab ZIP. Python 3.9+ is required. No packages, GPU or API key are needed.",
      "10–25 min · Open a terminal in the foundations folder containing lab.py. Run the commands below. On Windows, py -3 can replace python3.",
      "25–45 min · Open artifacts/day01-timeline.json. Draw the five stages and explain why the synthetic first output is at 32 ms while completion is at 65 ms.",
      "45–60 min · Write three sentences: what the script does, one possible failure stage, and why these numbers are not a real performance benchmark. Keep the JSON and your diagram."
    ]:[
      "0–10 分钟 · 打开系统基础 Day 1，下载并完整解压实验包。需要 Python 3.9+；无需安装第三方包、GPU 或 API key。",
      "10–25 分钟 · 在含 lab.py 的 foundations 文件夹打开终端，执行下面两条命令。Windows 可用 py -3 替换 python3。",
      "25–45 分钟 · 打开 artifacts/day01-timeline.json，画出五个阶段，解释模拟首输出为什么在 32 ms，而全部完成在 65 ms。",
      "45–60 分钟 · 写三句话：脚本做了什么、哪一阶段可能失败、为什么这些数字不是实际性能测试。保存 JSON 和自己的图。"
    ],fallback:en?"No Python yet or setup takes longer? Use the visible Day 1 walkthrough to calculate 32/65 ms and draw the flow by hand. Save the diagram as a first artifact; label the code run as not yet executed and resume setup later. One hour is a suggested timebox, not a completion guarantee.":"尚未安装 Python，或环境配置超时？先用 Day 1 页面里的算例手算 32/65 ms 并画流程图，保存第一份图解；代码执行标为尚未完成，之后再补环境。1 小时是建议时间盒，不保证每个人都能完成配置。",artifact:en?"Your annotated flow diagram, day01-timeline.json if executed, and a three-sentence explanation labelled ‘teaching simulation’.":"本人标注的流程图、实际运行后保存的 day01-timeline.json，以及标明“教学模拟”的三句说明。"};
  }
  function recommend(input,language="zh") {
    const state=normalize(input),lang=langOf(language),en=lang==="en",role=roles[state.role];
    const gaps=skills.filter(s=>state.skills[s.id]!=="comfortable");
    const grouped=new Map();
    for(const s of gaps) {
      const key=`${s.course}:${s.day}`;
      if(!grouped.has(key))grouped.set(key,{course:s.course,day:s.day,title:lessons[key][lang],url:courseURL(s.course,s.day,lang),reasons:[],skills:[]});
      grouped.get(key).reasons.push(`${s.title[lang]} (${levels[state.skills[s.id]][lang]}): ${s.reason[lang]}`);grouped.get(key).skills.push(s.id);
    }
    const reviews=[...grouped.values()].sort((a,b)=>(a.course==="foundations"?a.day:20+a.day)-(b.course==="foundations"?b.day:20+b.day));
    const pacing={
      2:{zh:"每周约 2 小时：拆成 2 次 30 分钟练习 + 1 次 60 分钟复盘。先做一节课；有剩余再前进。",en:"About 2 hours/week: two 30-minute exercises and one 60-minute review. Start with one lesson and continue only if time remains."},
      5:{zh:"每周约 5 小时：3 次 60 分钟实验 + 2 次 60 分钟复盘或项目。按验收推进，不按课程天数追赶。",en:"About 5 hours/week: three 60-minute labs and two 60-minute reviews or project sessions. Progress by checks completed, not by lesson-day labels."},
      10:{zh:"每周约 10 小时：4 次 90 分钟实验 + 2 次 2 小时项目。预留排错时间，能解释结果再进入下一节。",en:"About 10 hours/week: four 90-minute labs and two 2-hour project sessions. Reserve debugging time; explain a result before moving on."}
    };
    const hardwareNote=state.hardware==="cpu"?(en?"Every recommendation starts with a CPU teaching route. You can produce useful code and evidence without a GPU; simulation output is not real model or GPU performance.":"所有建议均可先走 CPU 教学路线。没有 GPU 也能写代码和积累证据；模拟结果不代表真实模型或 GPU 性能。"):(en?"Your GPU is optional. Begin with the same CPU checks, then follow the course hardware notes to verify compatibility, memory and dependencies before a separate real-device experiment. GPU availability does not validate your results.":"GPU 是可选扩展。先跑相同的 CPU 验收，再按课程硬件说明核对兼容性、显存与依赖，单独开展真实设备实验；有 GPU 不代表结果已被验证。");
    const firstHour = firstSession(state, lang);
    return {state,roleTitle:role.title[lang],reviews,route:role.lessons.map(([course,day])=>({course,day,title:lessons[`${course}:${day}`][lang],url:courseURL(course,day,lang)})),routeReason:role.reason[lang],pacing:pacing[state.hours][lang],hardwareNote,firstHour,experienced:gaps.length===0,careerURL:`../career/?role=${state.role}&lang=${lang}`,projectURL:`../projects/?project=${role.project}&lang=${lang}`,project:role.project};
  }
  function load(storage) {try{const raw=storage.getItem(storageKey);if(raw===null)return {state:normalize(null),ok:true};if(typeof raw!=="string"||raw.length>10000)throw new Error("Invalid record");const parsed=JSON.parse(raw);if(!parsed||parsed.version!==1)throw new Error("Unknown record version");return {state:normalize(parsed),ok:true};}catch{return {state:normalize(null),ok:false};}}
  function save(storage,state) {try{storage.setItem(storageKey,JSON.stringify(normalize(state)));return true;}catch{return false;}}
  function reset(storage) {try{storage.removeItem(storageKey);return true;}catch{return false;}}
  const absolute=url=>new URL(url.replace(/^\.\.\//,""),base).href;
  function markdown(input,language="zh") {
    const lang=langOf(language),en=lang==="en",plan=recommend(input,lang),state=plan.state;
    const first = plan.firstHour;
    const browser = first.mode === "browser";
    const firstBlock = [
      "## " + (browser ? first.title : en ? "First hour — CPU route" : "首小时 · CPU 路线"), "",
      absolute(first.url), ""
    ];
    if (first.reason) firstBlock.push(first.reason, "");
    firstBlock.push(...first.steps.map(step => "- " + step), "");
    if (first.commands.length) firstBlock.push("```bash", ...first.commands, "```", "");
    firstBlock.push(first.fallback, "", "**" + (en ? "Artifact" : "产出") + "**  " + first.artifact, "");
    if (first.download) firstBlock.push(absolute(first.download), "");
    if (first.bridge) firstBlock.push(first.bridge.detail, "", "[" + first.bridge.title + "](" + absolute(first.bridge.url) + ")", "");

    const lines = ["# " + (en ? "My AI Infra starting plan" : "我的 AI Infra 起步建议"), ""];
    if (browser) lines.push(...firstBlock);
    lines.push(
      `${en?"Target role":"目标方向"}: ${plan.roleTitle}`,
      `${en?"Hardware":"设备"}: ${hardware[state.hardware][lang]}`, "",
      en ? "Self-reported preferences only; not verified capability, certification or a hiring decision. These rules select learning resources, not a completion or employment promise." : "仅按本人自述选择学习资源，不是已验证能力、认证或录用判断，也不是完成时间或就业承诺。", "",
      "## " + (en ? "My self-report" : "我的自述"), "",
      ...skills.map(s => `- ${s.title[lang]}: ${levels[state.skills[s.id]][lang]}`), "",
      plan.pacing, plan.hardwareNote, "",
      "## " + (browser ? (en ? "What to review after the primer" : "学完启蒙课，再补哪些基础") : (en ? "Review first, with reasons" : "先补这些课，以及原因")), ""
    );
    if (!plan.reviews.length) {
      lines.push(browser
        ? (en ? "You reported independence in all six technical basics. After the primer, try the project for your chosen role." : "你自述六项技术基础均能独立完成。学完启蒙后，可以尝试对应岗位的项目。")
        : (en ? "No review lessons were added because every foundation was self-reported as independent. You can try the project immediately; this does not verify readiness." : "你自述各项基础均能独立完成，因此未追加复习课。可以直接尝试项目；这不表示能力已验证。"), "");
    }
    for (const r of plan.reviews) {
      lines.push(`### ${r.course} · Day ${r.day} · ${r.title}`, "", ...r.reasons.map(reason => "- " + reason), absolute(r.url), "");
    }
    if (!browser) lines.push(...firstBlock);
    lines.push(
      "## " + (en ? "Then follow your role" : "再按目标方向前进"), "", plan.routeReason, "",
      ...plan.route.map(r => `- ${r.course} · Day ${r.day} · ${r.title}: ${absolute(r.url)}`), "",
      absolute(plan.careerURL), absolute(plan.projectURL), "",
      en ? "These selections were stored only in this browser, not submitted to a recruiter. This Markdown is a readable copy; automatic import is not available." : "本工具仅在浏览器保存选择，未向招聘方提交。Markdown 是可阅读副本，暂不支持自动导入。", ""
    );
    return lines.join("\n");
  }
  return {storageKey,roles,hardware,levels,skills,lessons,normalize,recommend,load,save,reset,markdown};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=StartModel;
