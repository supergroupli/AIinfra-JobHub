"use strict";
const SearchModel = (() => {
  const kinds = ["lesson", "concept", "case", "project"];
  const normalize = value => String(value ?? "").normalize("NFKC").toLocaleLowerCase().replace(/\s+/g," ").trim();
  const bilingual = value => value && ["zh","en"].every(l=>typeof value[l]==="string");
  function validate(data) {
    if (!data || data.version!==1 || !Array.isArray(data.entries) || data.entries.length>5000 || !Array.isArray(data.courses)) throw new Error("index");
    const ids=new Set(), courses=new Set();
    for(const c of data.courses) {
      if(!c || typeof c.id!=="string" || !/^[a-z0-9-]+$/.test(c.id) || !bilingual(c.title) || courses.has(c.id)) throw new Error("course");
      courses.add(c.id);
    }
    for(const e of data.entries) {
      if(!e || !kinds.includes(e.kind) || typeof e.id!=="string" || ids.has(e.id) || typeof e.target!=="string" || !/^[a-z0-9-]+$/.test(e.target) || ![e.title,e.summary,e.text].every(bilingual)) throw new Error("entry");
      if(e.kind==="lesson" && (!courses.has(e.course) || e.target!==e.course || !Number.isInteger(e.day) || e.day<1 || e.day>10)) throw new Error("lesson");
      ids.add(e.id);
    }
    return data;
  }
  function href(entry,language="zh") {
    if(!kinds.includes(entry.kind)||typeof entry.target!=="string"||!/^[a-z0-9-]+$/.test(entry.target)) throw new Error("target");
    const lang=language==="en"?"en":"zh",id=entry.target;
    if(entry.kind==="lesson") {
      if(!Number.isInteger(entry.day)||entry.day<1||entry.day>10)throw new Error("day");
      return `../learn/${id}/?lang=${lang}#day-${entry.day}`;
    }
    const pages={concept:["knowledge","topic"],case:["cases","case"],project:["projects","project"]},[page,key]=pages[entry.kind];
    return `../${page}/?${key}=${id}&lang=${lang}`;
  }
  function search(entries,query,{kind="",course="",lang="zh"}={}) {
    const tokens=[...new Set(normalize(query).slice(0,120).split(/[\s,，、;；]+/u).filter(Boolean))];
    return entries.filter(e=>(!kind||e.kind===kind)&&(!course||e.course===course)).map(e=>{
      const title=normalize(e.title.zh+" "+e.title.en), summary=normalize(e.summary.zh+" "+e.summary.en), body=normalize(e.text.zh+" "+e.text.en);
      let score=0;
      for(const word of tokens) {
        if(title.includes(word))score+=10;
        else if(summary.includes(word))score+=4;
        else if(body.includes(word))score++;
        else return null;
      }
      return {entry:e,score,snippet:snippet(e,tokens,lang)};
    }).filter(Boolean).sort((a,b)=>b.score-a.score || a.entry.id.localeCompare(b.entry.id));
  }
  function snippet(entry,tokens,lang) {
    lang=lang==="en"?"en":"zh";
    const summary=entry.summary[lang],text=entry.text[lang];
    const original=(!tokens.length||tokens.some(word=>normalize(summary).includes(word)))?summary:text;
    const line=(original.split("\n").find(line=>tokens.some(word=>normalize(line).includes(word)))||summary).normalize("NFKC").replace(/\s+/g," ");
    const hits=tokens.map(word=>line.toLocaleLowerCase().indexOf(word)).filter(i=>i>=0);
    const start=Math.max(0,(hits.length?Math.min(...hits):0)-60),end=start+210;
    return (start?"…":"")+line.slice(start,end)+(end<line.length?"…":"");
  }
  return {kinds,normalize,validate,href,search};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=SearchModel;
