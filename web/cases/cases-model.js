'use strict';
const CasesModel=(()=>{
 const categories=['inference','performance','platform'];
 const local=(value,lang)=>value?.[lang==='en'?'en':'zh']||'';
 function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
 function validate(data){
  if(!data||data.version!==1||!Array.isArray(data.cases)||data.cases.length>100)throw new Error('Invalid case catalog');
  const ids=new Set();const bilingual=v=>v&&['zh','en'].every(l=>typeof v[l]==='string'&&v[l].trim());
  for(const c of data.cases){
   if(!c||typeof c.id!=='string'||!/^[a-z0-9-]+$/.test(c.id)||ids.has(c.id)||!categories.includes(c.category))throw new Error('Invalid case identity');ids.add(c.id);
   for(const k of ['title','summary','context','resolution','limits','challenge'])if(!bilingual(c[k]))throw new Error('Missing bilingual text');
   for(const k of ['diagram','hypotheses','investigation','regression'])if(!Array.isArray(c[k])||!c[k].length||!c[k].every(bilingual))throw new Error('Missing teaching steps');
   if(!Array.isArray(c.evidence)||!c.evidence.length||!c.evidence.every(e=>bilingual(e.title)&&bilingual(e.body)&&typeof e.log==='string'))throw new Error('Invalid evidence');
   if(!Array.isArray(c.lessons)||!c.lessons.every(l=>/^[a-z0-9-]+$/.test(l.course)&&Number.isInteger(l.day)&&l.day>=1&&l.day<=10))throw new Error('Invalid lesson');
   if(!Array.isArray(c.sources)||!c.sources.length||!c.sources.every(s=>typeof s.title==='string'&&safeURL(s.url)))throw new Error('Invalid source');
   if(typeof c.command!=='string'||typeof c.expected!=='string')throw new Error('Missing runnable task');
  }return data.cases;
 }
 function flatten(v){if(typeof v==='string')return v;if(Array.isArray(v))return v.map(flatten).join(' ');if(v&&typeof v==='object')return Object.values(v).map(flatten).join(' ');return '';}
 function filter(items,query='',category=''){const q=String(query).slice(0,300).trim().toLocaleLowerCase();return items.filter(c=>(!category||c.category===category)&&(!q||flatten(c).toLocaleLowerCase().includes(q)));}
 function select(items,id){return items.find(c=>c.id===id)||null;}
 return {categories,local,safeURL,validate,filter,select};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CasesModel;
