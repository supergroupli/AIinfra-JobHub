"use strict";
const PracticeModel = (() => {
  const KEY="infra-commons:practice-v1", FORMAT="jobhub-practice", MAX_BYTES=2*1024*1024, MAX_RECORDS=3000;
  const plain=v=>v!==null&&typeof v==="object"&&!Array.isArray(v), pair=v=>plain(v)&&["zh","en"].every(l=>typeof v[l]==="string"&&v[l].trim());
  const validId=id=>typeof id==="string"&&/^[a-z0-9-]+-day-[1-9]\d?-q-[1-9]\d?$/.test(id)&&id.length<120;
  const key=r=>r.id+"@"+r.fingerprint;
  function bank(value){
    if(!plain(value)||value.version!==1||!Array.isArray(value.courses)||!Array.isArray(value.questions)||value.questions.length>5000)throw Error("bank");
    const courseIds=new Set();for(const c of value.courses){if(!plain(c)||typeof c.id!=="string"||!/^[a-z0-9-]+$/.test(c.id)||!pair(c.title)||courseIds.has(c.id))throw Error("bank");courseIds.add(c.id);}
    const ids=new Set();for(const q of value.questions){if(!plain(q)||!validId(q.id)||ids.has(q.id)||!courseIds.has(q.course)||!Number.isInteger(q.day)||q.day<1||q.day>99||!Number.isInteger(q.number)||q.number<1||q.number>99||q.id!==`${q.course}-day-${q.day}-q-${q.number}`||typeof q.fingerprint!=="string"||!/^[a-f0-9]{64}$/.test(q.fingerprint)||!pair(q.question)||!pair(q.title)||!pair(q.explanation)||!Array.isArray(q.options)||q.options.length<2||q.options.length>8||!q.options.every(pair)||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)throw Error("bank");ids.add(q.id);}
    return value;
  }
  function record(r){
    if(!plain(r)||Object.keys(r).sort().join()!=="attempts,fingerprint,firstCorrect,id,lastChoice,lastCorrect,review,updatedAt"||!validId(r.id)||typeof r.fingerprint!=="string"||!/^[a-f0-9]{64}$/.test(r.fingerprint)||!Number.isInteger(r.attempts)||r.attempts<0||r.attempts>100000||!["none","again","later"].includes(r.review)||typeof r.updatedAt!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.updatedAt)||!Number.isFinite(Date.parse(r.updatedAt))||new Date(r.updatedAt).toISOString()!==r.updatedAt)throw Error("record");
    if(r.attempts===0?(r.firstCorrect!==null||r.lastCorrect!==null||r.lastChoice!==null):(typeof r.firstCorrect!=="boolean"||typeof r.lastCorrect!=="boolean"||!Number.isInteger(r.lastChoice)||r.lastChoice<0||r.lastChoice>7))throw Error("record");
    if(r.attempts===1&&r.firstCorrect!==r.lastCorrect)throw Error("record");return {...r};
  }
  function records(value){if(!Array.isArray(value)||value.length>MAX_RECORDS)throw Error("limit");const result=value.map(record);if(new Set(result.map(key)).size!==result.length)throw Error("duplicate");return result;}
  const serialize=list=>JSON.stringify({format:FORMAT,version:1,records:records(list)},null,2);
  function parse(text){if(typeof text!=="string"||new TextEncoder().encode(text).length>MAX_BYTES)throw Error("size");const p=JSON.parse(text);if(!plain(p)||Object.keys(p).sort().join()!=="format,records,version"||p.format!==FORMAT||p.version!==1)throw Error("format");return records(p.records);}
  const current=(list,q)=>list.find(r=>key(r)===key(q));
  function empty(q,now=new Date()){return {id:q.id,fingerprint:q.fingerprint,firstCorrect:null,lastCorrect:null,attempts:0,lastChoice:null,review:"none",updatedAt:now.toISOString()};}
  function put(list,r){const valid=record(r),next=records(list).filter(item=>key(item)!==key(valid));next.push(valid);return records(next);}
  function answer(list,q,choice,now=new Date()){if(!Number.isInteger(choice)||choice<0||choice>=q.options.length)throw Error("choice");const old=current(list,q)||empty(q,now),correct=choice===q.answer;if(old.attempts>=100000)throw Error("limit");return put(list,{...old,firstCorrect:old.attempts?old.firstCorrect:correct,lastCorrect:correct,lastChoice:choice,attempts:old.attempts+1,review:correct?old.review:"again",updatedAt:now.toISOString()});}
  function plan(list,q,review,now=new Date()){return put(list,{...(current(list,q)||empty(q,now)),review,updatedAt:now.toISOString()});}
  function match(q,list,status){const r=current(list,q);return status==="unanswered"?!r?.attempts:status==="wrong"?r?.attempts>0&&r.lastCorrect===false:status==="again"?r?.review==="again":status==="later"?r?.review==="later":status==="answered"?r?.attempts>0:true;}
  function summary(list,questions){const active=questions.map(q=>current(list,q)).filter(Boolean);return {total:questions.length,answered:active.filter(r=>r.attempts>0).length,firstCorrect:active.filter(r=>r.firstCorrect===true).length,wrong:active.filter(r=>r.lastCorrect===false).length,again:active.filter(r=>r.review==="again").length,stale:list.filter(r=>!questions.some(q=>key(q)===key(r))).length};}
  function merge(local,incoming,questions){const result=records(local),keys=new Set(result.map(key)),byId=new Map(questions.map(q=>[q.id,q]));let added=0,kept=0,unknown=0,stale=0;for(const r of records(incoming)){const q=byId.get(r.id);if(!q){unknown++;continue;}if(r.fingerprint===q.fingerprint&&r.attempts&&(r.lastChoice>=q.options.length||r.lastCorrect!==(r.lastChoice===q.answer)))throw Error("record");if(keys.has(key(r))){kept++;continue;}result.push(r);keys.add(key(r));added++;if(q.fingerprint!==r.fingerprint)stale++;}return {records:records(result),added,kept,unknown,stale};}
  function createStore(storage){let list=[],error="",blocked=false;try{const raw=storage.getItem(KEY);if(raw!==null)list=parse(raw);}catch{error="load";blocked=true;}function persist(){if(blocked){error="load";return false;}try{storage.setItem(KEY,serialize(list));error="";return true;}catch{error="save";return false;}}return {get records(){return list.map(r=>({...r}));},get error(){return error;},get blocked(){return blocked;},set(next){list=records(next);return persist();},retry(){return persist();},reset(){try{storage.removeItem(KEY);list=[];blocked=false;error="";return true;}catch{error="reset";return false;}}};}
  return {KEY,FORMAT,MAX_BYTES,MAX_RECORDS,bank,key,record,records,serialize,parse,current,answer,plan,match,summary,merge,createStore};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=PracticeModel;
