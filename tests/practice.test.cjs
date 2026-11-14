"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../web/practice/practice-model.js');
const q=(id='vllm-day-1-q-1',fingerprint='a'.repeat(64))=>({id,fingerprint,course:'vllm',day:1,number:Number(id.split('-').at(-1)),title:{zh:'第一课',en:'First lesson'},question:{zh:'模拟器能证明什么？',en:'What can a mock establish?'},options:[{zh:'接口',en:'Interface'},{zh:'GPU 性能',en:'GPU performance'}],answer:0,explanation:{zh:'模拟器不运行 GPU 模型。',en:'A mock does not run a GPU model.'}});
const bank=()=>({version:1,courses:[{id:'vllm',title:{zh:'vLLM',en:'vLLM'}}],questions:[q(),q('vllm-day-1-q-2','b'.repeat(64))]});
const now=new Date('2026-11-14T01:02:03.000Z');
test('question banks reject broken source mappings, unsafe IDs and invalid bilingual questions',()=>{
 assert.equal(M.bank(bank()).questions.length,2);
 for(const patch of [{course:'evil'},{id:'vllm-day-1-q-1',day:2},{fingerprint:'bad'},{answer:9},{options:[{zh:'x'}]},{question:{zh:'x'}}]){const b=bank();Object.assign(b.questions[0],patch);assert.throws(()=>M.bank(b),/bank/);}
 const b=bank();b.questions.push(b.questions[0]);assert.throws(()=>M.bank(b),/bank/);
});
test('first and latest answers differ after retry, and version changes never inherit progress',()=>{
 const question=q();let list=M.answer([],question,1,now);assert.equal(list[0].firstCorrect,false);assert.equal(list[0].review,'again');
 list=M.answer(list,question,0,now);assert.equal(list[0].firstCorrect,false);assert.equal(list[0].lastCorrect,true);assert.equal(list[0].attempts,2);
 const revised=q(question.id,'c'.repeat(64));assert.equal(M.current(list,revised),undefined);assert.equal(M.match(revised,list,'unanswered'),true);assert.equal(M.summary(list,[revised]).stale,1);
 list=M.answer(list,revised,0,now);assert.equal(list.length,2);assert.equal(M.summary(list,[revised]).firstCorrect,1);
 assert.throws(()=>M.answer(list,question,-1,now),/choice/);
});
test('review plans do not count as attempts and filters use latest current-version records',()=>{
 const questions=bank().questions;let list=M.plan([],questions[0],'later',now);assert.equal(M.summary(list,questions).answered,0);assert.equal(M.match(questions[0],list,'later'),true);
 list=M.answer(list,questions[1],1,now);assert.equal(M.match(questions[1],list,'wrong'),true);assert.equal(M.match(questions[1],list,'again'),true);
 list=M.answer(list,questions[1],0,now);assert.equal(M.match(questions[1],list,'wrong'),false);assert.equal(M.match(questions[1],list,'again'),true);
 list=M.plan(list,questions[1],'none',now);assert.equal(M.match(questions[1],list,'again'),false);assert.equal(M.summary(list,questions).answered,1);
});
test('backup validation and merge preserve local conflicts while segregating stale and unknown questions',()=>{
 const b=bank(),local=M.answer([],b.questions[0],1,now),incoming=M.answer([],b.questions[0],0,now);incoming.push(...M.answer([],b.questions[1],0,now),...M.answer([],q(b.questions[0].id,'c'.repeat(64)),0,now),...M.answer([],q('vllm-day-1-q-9'),0,now));
 const result=M.merge(local,M.parse(M.serialize(incoming)),b.questions);assert.equal(result.kept,1);assert.equal(result.added,2);assert.equal(result.stale,1);assert.equal(result.unknown,1);assert.equal(result.records[0].lastCorrect,false);
 for(const patch of [{version:2},{records:[{...local[0],attempts:-1}]},{records:[{...local[0],firstCorrect:true}]},{records:[local[0],local[0]]},{records:[{...local[0],updatedAt:'2026-02-31T01:02:03.000Z'}]},{extra:true}])assert.throws(()=>M.parse(JSON.stringify({format:M.FORMAT,version:1,records:local,...patch})));
 assert.throws(()=>M.parse('x'.repeat(M.MAX_BYTES+1)),/size/);
 assert.throws(()=>M.merge([],[{...local[0],lastCorrect:true,firstCorrect:true}],b.questions),/record/);
});
test('storage rejection preserves in-memory work, corrupt originals are not silently overwritten, reset is scoped',()=>{
 const other='infra-commons:notes-v2:vllm:1',values=new Map([[other,'keep']]);let fail=true;
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(fail)throw Error('quota');values.set(key,value);},removeItem:key=>values.delete(key)};
 const store=M.createStore(storage);assert.equal(store.set(M.answer([],q(),0,now)),false);assert.equal(store.records.length,1);fail=false;assert.equal(store.retry(),true);assert.equal(M.parse(values.get(M.KEY)).length,1);assert.equal(store.reset(),true);assert.equal(values.get(other),'keep');assert.equal(values.has(M.KEY),false);
 values.set(M.KEY,'broken');const corrupt=M.createStore(storage);assert.equal(corrupt.blocked,true);corrupt.set(M.answer([],q(),0,now));assert.equal(values.get(M.KEY),'broken');assert.equal(corrupt.records.length,1);
 assert.equal(M.createStore(null).error,'load');
});
function harness(config={}) {
 class Element {
  constructor(tag='div',id=''){this.tagName=tag;this.id=id;this.children=[];this.listeners={};this.dataset={};this.value='';this.textContent='';this.files=[];this.hidden=false;this.disabled=false;this.checked=false;this.classList={toggle(){}};}
  append(...els){this.children.push(...els);}replaceChildren(...els){this.children=[...els];}setAttribute(key,value){this[key]=value;}focus(){focused=this.id;}remove(){}click(){return this.dispatch('click');}addEventListener(name,callback){(this.listeners[name]??=[]).push(callback);}async dispatch(name){for(const cb of this.listeners[name]||[])await cb({preventDefault(){}});}
 }
 let focused='',failSave=!!config.failSave,fetchFail=!!config.fetchFail;const nodes={},all=[],html=fs.readFileSync(path.join(__dirname,'../web/practice/index.html'),'utf8');
 for(const match of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/g)){const id=match[2].match(/\bid="([^"]+)"/)?.[1]||'',n=new Element(match[1],id);if(id)nodes[id]=n;for(const [attr,key] of [['data-i18n','i18n'],['data-link','link']]){const value=match[2].match(new RegExp(attr+'="([^"]+)"'))?.[1];if(value)n.dataset[key]=value;}n.hidden=/\bhidden\b/.test(match[2]);all.push(n);}
 const stored=new Map(config.initial||[]),writes=[],location=new URL('https://example.org/practice/'+(config.query||''));
 const storage={getItem:key=>{if(config.failRead)throw Error('denied');return stored.get(key)??null;},setItem:(key,value)=>{if(failSave&&key===M.KEY)throw Error('quota');stored.set(key,value);writes.push(key);},removeItem:key=>stored.delete(key)};
 const document={getElementById:id=>{assert.ok(nodes[id],id);return nodes[id];},createElement:tag=>new Element(tag),querySelectorAll:s=>all.filter(n=>s==='[data-i18n]'?n.dataset.i18n:s==='[data-link]'?n.dataset.link:false),documentElement:{},body:new Element('body')};
 const context={PracticeModel:M,document,window:{localStorage:storage,confirm:()=>config.confirm!==false},location,history:{replaceState:(_,__,url)=>{location.href=url;}},URL,URLSearchParams,Blob,TextEncoder,setTimeout(){},fetch:async()=>{if(fetchFail)throw Error('offline');return {ok:true,json:async()=>config.bank||bank()};}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../web/practice/practice.js'),'utf8'),context);
 const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
 return {nodes,stored,writes,location,flush,event:(id,name='click')=>nodes[id].dispatch(name),select:async i=>{const input=nodes['practice-options'].children[i].children[0];input.checked=true;await input.dispatch('change');},get focused(){return focused;},setFailure:v=>{failSave=v;},setFetchFailure:v=>{fetchFail=v;}};
}
test('actual UI reveals answers after submit, prevents duplicate submission, and preserves first result after retry',async()=>{
 const h=harness();await h.flush();assert.equal(h.nodes['practice-feedback'].hidden,true);assert.equal(h.nodes['practice-question-title'].textContent,q().question.zh);
 await h.event('practice-answer-form','submit');assert.match(h.nodes['practice-message'].textContent,/先选择/);assert.equal(h.stored.has(M.KEY),false);
 await h.select(1);await h.event('practice-answer-form','submit');assert.equal(h.nodes['practice-feedback'].hidden,false);assert.match(h.nodes['practice-result'].textContent,/再想/);assert.equal(M.parse(h.stored.get(M.KEY))[0].attempts,1);
 await h.event('practice-answer-form','submit');assert.equal(M.parse(h.stored.get(M.KEY))[0].attempts,1);
 await h.event('practice-redo');assert.equal(h.nodes['practice-feedback'].hidden,true);await h.select(0);await h.event('practice-answer-form','submit');const r=M.parse(h.stored.get(M.KEY))[0];assert.equal(r.attempts,2);assert.equal(r.firstCorrect,false);assert.equal(r.lastCorrect,true);
});
test('actual UI supports deep links, next question, wrong filters and language changes without losing the selection',async()=>{
 const h=harness({query:'?course=vllm&question=vllm-day-1-q-2&lang=en'});await h.flush();assert.match(h.nodes['practice-source'].textContent,/Q2/);await h.select(1);await h.event('practice-language');assert.equal(h.nodes['practice-options'].children[1].children[0].checked,true);await h.event('practice-answer-form','submit');assert.equal(M.parse(h.stored.get(M.KEY))[0].id,'vllm-day-1-q-2');
 await h.event('practice-next');assert.match(h.nodes['practice-source'].textContent,/Q1/);assert.equal(h.nodes['practice-feedback'].hidden,true);assert.equal(h.location.searchParams.get('question'),'vllm-day-1-q-1');
 h.nodes['practice-status'].value='wrong';await h.event('practice-status','change');assert.match(h.nodes['practice-source'].textContent,/Q2/);assert.equal(h.nodes['practice-list'].children.length,1);
 const unknown=harness({query:'?course=evil&question=evil'});await unknown.flush();assert.match(unknown.nodes['practice-message'].textContent,/未识别/);assert.equal(unknown.location.searchParams.get('question'),'vllm-day-1-q-1');
});
test('actual UI retains answers during storage failure, exports current memory and retries saving',async()=>{
 const h=harness({failSave:true});await h.flush();await h.select(0);await h.event('practice-answer-form','submit');assert.match(h.nodes['practice-storage'].textContent,/保存失败/);assert.equal(h.stored.has(M.KEY),false);await h.event('practice-export');assert.equal(M.parse(h.nodes['practice-export-text'].value)[0].attempts,1);h.setFailure(false);await h.event('practice-save');assert.equal(M.parse(h.stored.get(M.KEY)).length,1);
 const read=harness({failRead:true});await read.flush();await read.select(0);await read.event('practice-answer-form','submit');assert.equal(read.nodes['practice-feedback'].hidden,false);assert.match(read.nodes['practice-storage'].textContent,/原存档没有被覆盖/);
});
test('actual UI import is explicit, local records win, edited previews expire and reset only removes this tool key',async()=>{
 const original=M.answer([],q(),1,now),source=M.answer(M.answer([],q(),0,now),bank().questions[1],0,now),other='infra-commons:notes-v2:vllm:1';
 const h=harness({initial:[[M.KEY,M.serialize(original)],[other,'keep']]});await h.flush();h.nodes['practice-import-text'].value=M.serialize(source);await h.event('practice-preview');assert.equal(M.parse(h.stored.get(M.KEY)).length,1);assert.equal(h.nodes['practice-confirm'].disabled,false);await h.event('practice-confirm');const merged=M.parse(h.stored.get(M.KEY));assert.equal(merged.length,2);assert.equal(merged[0].lastCorrect,false);
 h.nodes['practice-import-text'].value=M.serialize(source);await h.event('practice-preview');await h.event('practice-import-text','input');assert.equal(h.nodes['practice-confirm'].disabled,true);await h.event('practice-reset');assert.equal(h.stored.has(M.KEY),false);assert.equal(h.stored.get(other),'keep');
 const cancelled=harness({initial:[[M.KEY,M.serialize(original)]],confirm:false});await cancelled.flush();await cancelled.event('practice-reset');assert.equal(M.parse(cancelled.stored.get(M.KEY)).length,1);
});
test('actual UI recovers from bank loading failure and handles empty banks without fake questions',async()=>{
 const h=harness({fetchFail:true});await h.flush();assert.equal(h.nodes['practice-error'].hidden,false);h.setFetchFailure(false);await h.event('practice-retry');assert.equal(h.nodes['practice-error'].hidden,true);assert.equal(h.nodes['practice-workspace'].hidden,false);
 const empty=harness({bank:{version:1,courses:[],questions:[]}});await empty.flush();assert.equal(empty.nodes['practice-empty'].hidden,false);assert.equal(empty.nodes['practice-question'].hidden,true);assert.equal(empty.nodes['practice-list'].children.length,0);
 const hostile=bank();hostile.questions[0].question.zh='<img src=x onerror=alert(1)>';const safe=harness({bank:hostile});await safe.flush();assert.equal(safe.nodes['practice-question-title'].textContent,'<img src=x onerror=alert(1)>');assert.equal(safe.nodes['practice-question-title'].children.length,0);
});
