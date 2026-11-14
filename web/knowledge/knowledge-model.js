'use strict';
const KnowledgeModel=(()=>{
  const categories=['serving','performance','platform'];
  const id=value=>typeof value==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
  const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=12000;
  const pair=value=>plain(value)&&text(value.zh)&&text(value.en);
  const pairs=(value,min,max)=>Array.isArray(value)&&value.length>=min&&value.length<=max&&value.every(pair);
  function safeURL(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[\s\\\u0000-\u001f]/.test(value)?url.href:null;}catch{return null;}}
  function validate(data){
    if(!plain(data)||data.version!==1||!/^\d{4}-\d{2}-\d{2}$/.test(data.reviewedAt)||!Array.isArray(data.topics)||!data.topics.length||data.topics.length>200)throw new Error('catalog');
    const ids=new Set();for(const t of data.topics){
      if(!plain(t)||!id(t.id)||ids.has(t.id)||!categories.includes(t.category)||!pair(t.title)||!pair(t.summary)||!pairs(t.explain,2,8)||!pairs(t.diagram,3,5)||!pairs(t.tradeoffs,1,6)||!pair(t.mistake))throw new Error('topic');ids.add(t.id);
      if(!plain(t.example)||!pair(t.example.setup)||!pairs(t.example.steps,2,8)||!pair(t.example.result)||!plain(t.check)||!pair(t.check.question)||!pair(t.check.answer))throw new Error('lesson');
      if(!Array.isArray(t.lessons)||!t.lessons.length||t.lessons.length>5||!t.lessons.every(l=>plain(l)&&id(l.course)&&Number.isInteger(l.day)&&l.day>=1&&l.day<=10))throw new Error('references');
      if(!Array.isArray(t.sources)||!t.sources.length||!t.sources.every(s=>plain(s)&&text(s.title)&&safeURL(s.url)))throw new Error('sources');
      if(!Array.isArray(t.related)||!t.related.every(id))throw new Error('related');
    }
    if(data.topics.some(t=>t.related.some(x=>!ids.has(x)||x===t.id)))throw new Error('related');return data;
  }
  const local=(p,lang)=>p[lang==='en'?'en':'zh'];
  function select(topics,requested){return topics.find(t=>t.id===requested)||null;}
  function filter(topics,query='',category=''){
    const terms=String(query).trim().toLocaleLowerCase().slice(0,160).split(/\s+/).filter(Boolean);
    return topics.filter(t=>(!category||t.category===category)&&terms.every(term=>[t.id,t.title.zh,t.title.en,t.summary.zh,t.summary.en,...t.explain.flatMap(p=>[p.zh,p.en])].join(' ').toLocaleLowerCase().includes(term)));
  }
  const topicURL=(topic,lang='zh')=>`?topic=${encodeURIComponent(topic)}&lang=${lang==='en'?'en':'zh'}`;
  const lessonURL=(ref,lang='zh')=>`../learn/${encodeURIComponent(ref.course)}/?lang=${lang==='en'?'en':'zh'}#day-${ref.day}`;
  return {categories,validate,filter,select,topicURL,lessonURL,safeURL,local};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=KnowledgeModel;
