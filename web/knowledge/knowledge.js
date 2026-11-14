'use strict';
(()=>{
  const M=KnowledgeModel,$=id=>document.getElementById(id),langKey='infra-commons:language';
  const words={
    zh:{brand:'聘枢',skip:'跳到专题正文',learn:'学习库',knowledge:'原理知识库',searchAll:'全文搜索',projects:'实战项目',title:'把术语连成原理，把原理算明白。',intro:'18 个专题横跨推理、性能与平台。读一张流程图，跟着算一遍，再解释一次取舍。遇到具体工程问题，也能直接返回对应课程动手验证。',download:'下载完整知识手册 .md ↓',map1:'建立原理模型',map2:'手算一个具体例子',map3:'回到实验检验边界',boundary:'数值来自原创教学假设，不是硬件实测或性能承诺。',loadError:'知识库暂时无法加载，请重试。也可下载离线手册阅读。',retry:'重新加载',directory:'专题目录与筛选',queryLabel:'搜索概念或关键词',categoryLabel:'技术方向',all:'全部方向',serving:'推理与缓存',performance:'性能与分布式训练',platform:'平台与可靠性',reset:'清空筛选',loading:'正在准备原理、算例与来源…',footer:'聘枢 · 让每个工程判断都有可解释的依据。',start:'不知道从哪开始？入门自查 ↗',principle:'先理解原理',flow:'从输入到判断',example:'跟着算一遍',tradeoffs:'什么时候适用？代价是什么？',mistake:'一个容易踩的坑',check:'先自己回答，再看解析',answer:'展开答案与推导',lessons:'回到课程动手验证',related:'把相邻概念连起来',sources:'官方资料与深入阅读',sourceNote:'原理参考以下一手资料；算例由本站独立编写。滚动文档可能变化，具体 API 与环境请以安装版本为准。',reviewed:'资料编辑核对日期：',empty:'没有符合条件的专题。试试其他关键词或清空筛选。',unknown:'链接中的专题未识别，先展示第一篇；可以在目录中重新选择。',count:'篇专题',total:'共',previous:'上一篇',next:'下一篇'},
    en:{brand:'AI Infra JobHub',skip:'Skip to topic',learn:'Learn',knowledge:'Core concepts',searchAll:'Search all',projects:'Projects',title:'Connect the concepts. Work through the numbers.',intro:'Explore 18 topics across serving, performance and platforms. Read a flow, calculate an example and explain a tradeoff. Follow the linked lessons to test your understanding with an experiment.',download:'Download the complete handbook .md ↓',map1:'Build a mental model',map2:'Calculate a concrete example',map3:'Test the limits in a lab',boundary:'Numbers are original teaching assumptions, not hardware measurements or performance promises.',loadError:'The library could not load. Please retry or download the offline handbook.',retry:'Try again',directory:'Topics and filters',queryLabel:'Search concepts or keywords',categoryLabel:'Technical focus',all:'All topics',serving:'Serving & caching',performance:'Performance & distributed training',platform:'Platforms & reliability',reset:'Reset filters',loading:'Preparing explanations, examples and sources…',footer:'AI Infra JobHub · Make engineering judgments explainable.',start:'Unsure where to start? Try the self-check ↗',principle:'Understand the principle',flow:'From input to judgment',example:'Work through the numbers',tradeoffs:'When does it help, and at what cost?',mistake:'A common trap',check:'Try the question before the explanation',answer:'Reveal the answer and reasoning',lessons:'Test it in a course',related:'Connect neighboring concepts',sources:'Primary sources and further reading',sourceNote:'Principles reference these primary sources; worked examples are original teaching material. Rolling documentation can change. Match APIs and environments to your installed version.',reviewed:'Editorial source review: ',empty:'No topics match. Try another keyword or reset the filters.',unknown:'The requested topic was not recognized. Showing the first topic; choose another from the directory.',count:'topics',total:'of',previous:'Previous',next:'Next'}
  };
  const params=new URLSearchParams(location.search);let saved='zh';try{saved=JSON.parse(localStorage.getItem(langKey));}catch{}
  let lang=['zh','en'].includes(params.get('lang'))?params.get('lang'):saved==='en'?'en':'zh',data=null,current=null,unknown=false;
  const t=key=>words[lang][key],local=p=>M.local(p,lang);
  const el=(tag,value,cls)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;if(cls)node.className=cls;return node;};
  function localLink(label,url,cls){const a=el('a',label,cls),u=new URL(url,location.href);u.searchParams.set('lang',lang);a.href=u.href;return a;}
  function topicLink(topic,label,cls){const a=el('a',label||local(topic.title),cls);a.href=M.topicURL(topic.id,lang);a.dataset.topic=topic.id;a.addEventListener('click',e=>{if(e.button&&e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();choose(topic.id,true);});return a;}
  function updateURL(push=false){const url=new URL(location.href);if(current)url.searchParams.set('topic',current.id);url.searchParams.set('lang',lang);history[push?'pushState':'replaceState'](null,'',url);}
  function choose(id,navigate=false){const target=M.select(data.topics,id);if(!target)return;current=target;unknown=false;updateURL(navigate);render();if(navigate){if(matchMedia('(max-width: 760px)').matches)$('knowledge-directory').open=false;$('knowledge-reader').scrollIntoView({block:'start',behavior:'instant'});$('knowledge-reader').focus({preventScroll:true});}}
  function renderHeader(){
    document.documentElement.lang=lang==='en'?'en':'zh-CN';document.title=`${current?local(current.title):t('knowledge')} · AI Infra JobHub`;
    document.querySelectorAll('[data-i18n]').forEach(n=>n.textContent=t(n.dataset.i18n));
    document.querySelectorAll('[data-local]').forEach(a=>{const u=new URL(a.dataset.local,location.href);u.searchParams.set('lang',lang);a.href=u.href;});
    $('knowledge-language').textContent=lang==='zh'?'EN ↗':'中文 ↗';$('knowledge-language').setAttribute('aria-label',lang==='zh'?'Switch to English':'切换为中文');
    $('knowledge-handbook').href=`./handbook.${lang}.md`;$('knowledge-reader').setAttribute('aria-label',t('knowledge'));
    $('knowledge-status').textContent=unknown?t('unknown'):'';
  }
  function renderList(){
    if(!data)return;const found=M.filter(data.topics,$('knowledge-query').value,$('knowledge-category').value);$('knowledge-count').textContent=`${found.length} / ${data.topics.length} ${t('count')}`;
    const list=$('knowledge-list');list.replaceChildren();if(!found.length)list.append(el('p',t('empty'),'knowledge-empty'));
    for(const topic of found){const a=topicLink(topic,'','knowledge-topic-link');a.replaceChildren(el('small',t(topic.category)),el('strong',local(topic.title)));if(current?.id===topic.id)a.setAttribute('aria-current','page');list.append(a);}
  }
  function renderDetail(){
    if(!current)return;const root=$('knowledge-reader'),topic=current;root.replaceChildren(el('span',t(topic.category),'eyebrow'),el('h2',local(topic.title)),el('p',local(topic.summary),'knowledge-lead'));
    root.append(el('h3',t('principle')));topic.explain.forEach(p=>root.append(el('p',local(p))));
    const flow=el('ol',undefined,'knowledge-flow');flow.setAttribute('aria-label',t('flow'));topic.diagram.forEach((p,i)=>{const n=el('li');n.append(el('span',String(i+1).padStart(2,'0')),el('strong',local(p)));flow.append(n);});root.append(flow);
    const example=el('section',undefined,'knowledge-example');example.append(el('h3',t('example')),el('p',t('boundary'),'knowledge-example-note'),el('p',local(topic.example.setup)));const steps=el('ol');topic.example.steps.forEach(p=>steps.append(el('li',local(p))));example.append(steps,el('p',local(topic.example.result),'knowledge-result'));root.append(example);
    root.append(el('h3',t('tradeoffs')));const trade=el('ul');topic.tradeoffs.forEach(p=>trade.append(el('li',local(p))));root.append(trade,el('h3',t('mistake')),el('p',local(topic.mistake),'knowledge-mistake'));
    const quiz=el('section',undefined,'knowledge-selfcheck');quiz.append(el('h3',t('check')),el('p',local(topic.check.question)));const answer=el('details');answer.id='knowledge-answer';answer.append(el('summary',t('answer')),el('p',local(topic.check.answer)));quiz.append(answer);root.append(quiz);
    root.append(el('h3',t('lessons')));const lessons=el('div',undefined,'knowledge-links');topic.lessons.forEach(ref=>lessons.append(localLink(`${ref.course} · Day ${ref.day} ↗`,M.lessonURL(ref,lang))));root.append(lessons);
    root.append(el('h3',t('related')));const related=el('div',undefined,'knowledge-links');topic.related.forEach(id=>{const next=M.select(data.topics,id);if(next)related.append(topicLink(next));});root.append(related);
    root.append(el('h3',t('sources')),el('p',t('sourceNote'),'knowledge-reviewed'));const sources=el('ul',undefined,'knowledge-source');topic.sources.forEach(source=>{const a=el('a',source.title+' ↗');a.href=M.safeURL(source.url);a.target='_blank';a.rel='noopener noreferrer';const li=el('li');li.append(a);sources.append(li);});root.append(sources,el('p',t('reviewed')+data.reviewedAt,'knowledge-reviewed'));
    const index=data.topics.indexOf(topic),nav=el('nav',undefined,'knowledge-links');nav.setAttribute('aria-label',t('directory'));if(index>0)nav.append(topicLink(data.topics[index-1],`← ${t('previous')}`));if(index<data.topics.length-1)nav.append(topicLink(data.topics[index+1],`${t('next')} →`));root.append(nav);
  }
  function render(){renderHeader();renderList();renderDetail();}
  async function load(){
    $('knowledge-error').hidden=true;$('knowledge-retry').disabled=true;
    try{const response=await fetch('./topics.json?v=20261114',{cache:'no-cache'});if(!response.ok)throw new Error('response');data=M.validate(await response.json());const requested=new URLSearchParams(location.search).get('topic');current=M.select(data.topics,requested)||data.topics[0];unknown=!!requested&&current.id!==requested;if(!unknown)updateURL();if(requested&&matchMedia('(max-width: 760px)').matches)$('knowledge-directory').open=false;render();}
    catch{$('knowledge-error').hidden=false;$('knowledge-reader').replaceChildren(el('p',t('loadError')));}
    finally{$('knowledge-retry').disabled=false;}
  }
  $('knowledge-query').addEventListener('input',renderList);$('knowledge-category').addEventListener('change',renderList);
  $('knowledge-reset').addEventListener('click',()=>{$('knowledge-query').value='';$('knowledge-category').value='';renderList();});
  $('knowledge-language').addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';try{localStorage.setItem(langKey,JSON.stringify(lang));}catch{}updateURL();render();});
  $('knowledge-retry').addEventListener('click',load);
  window.addEventListener('popstate',()=>{if(!data)return;const p=new URLSearchParams(location.search);if(['zh','en'].includes(p.get('lang')))lang=p.get('lang');const requested=p.get('topic');current=M.select(data.topics,requested)||data.topics[0];unknown=!!requested&&current.id!==requested;render();});
  renderHeader();load();
})();
