"use strict";
const test=require("node:test"), assert=require("node:assert/strict"), fs=require("node:fs"), path=require("node:path"), vm=require("node:vm");
const M=require("../web/applications/applications-model.js");
const sample=(id="a-1",patch={})=>({id,company:"Real employer entered by user",role:"Inference engineer",url:"https://example.org/careers/role",status:"planned",appliedAt:"",nextAt:"",notes:"",...patch});

test("application CRUD keeps IDs stable and deletion can be restored",()=>{
  let list=M.upsert([],sample()); list=M.upsert(list,sample("a-1",{status:"interview",notes:"Prepare a benchmark report"}));
  assert.equal(list.length,1); assert.equal(list[0].status,"interview");
  const removed=list[0]; list=M.remove(list,"a-1"); assert.equal(list.length,0);
  assert.deepEqual(M.upsert(list,removed),[removed]);
  assert.throws(()=>M.upsert(Array.from({length:100},(_,i)=>sample(`a-${i}`)),sample("new")),/limit/);
});

test("backup validates shape, lengths, dates, identifiers and versions before a merge",()=>{
  assert.deepEqual(M.parse(M.backup([sample()])),[sample()]);
  const envelope={format:M.FORMAT,version:1,records:[sample()]};
  for(const patch of [{version:2},{records:{}},{records:[sample(),sample()]},{records:[sample("a",{nextAt:"2025-02-29"})]},{records:[sample("a",{company:5})]},{records:[sample("a",{notes:"x".repeat(4001)})]},{records:[sample("a",{url:"javascript:alert(1)"})]},{records:[sample("a",{url:"https://user:secret@example.org/"})]},{records:[sample("a",{extra:true})]},{records:[sample("bad id")]}]) assert.throws(()=>M.parse(JSON.stringify({...envelope,...patch})));
  assert.throws(()=>M.parse(" ".repeat(M.MAX_BYTES+1)),/size/);
  const result=M.merge([sample("a",{notes:"Local private note"})],[sample("a",{notes:"Incoming conflict"}),sample("b")]);
  assert.equal(result.added,1);assert.equal(result.conflicts,1);assert.equal(result.records[0].notes,"Local private note");
});

test("due dates are calendar dates, including leap years, and closed records are excluded",()=>{
  assert.equal(M.date("2024-02-29"),true);assert.equal(M.date("2025-02-29"),false);assert.equal(M.date("2026-04-31"),false);assert.equal(M.date("1899-01-01"),false);assert.equal(M.date("2026-1-01"),false);
  assert.equal(M.today(new Date(2026,0,2,0,1)),"2026-01-02");
  assert.equal(M.due(sample("a",{nextAt:"2026-01-02"}),"2026-01-02"),true);
  assert.equal(M.due(sample("a",{nextAt:"2026-01-03"}),"2026-01-02"),false);
  assert.equal(M.due(sample("a",{nextAt:"2026-01-01",status:"closed"}),"2026-01-02"),false);
  assert.equal(M.due(sample(),"2026-01-02"),false);
});

test("Markdown escapes injected HTML, links and headings; only validated HTTPS links survive",()=>{
  const md=M.markdown([sample("a",{company:"<img src=x onerror=alert(1)>",role:"[click](javascript:alert(1))",notes:"# heading\n<script>alert(1)</script>\n![image](https://evil.test/a)",url:"https://example.org/role?q=<tag>"})],"en");
  assert.ok(!md.includes("<img"));assert.ok(!md.includes("<script>"));assert.ok(!md.includes("[click]("));assert.ok(!md.includes("![image]("));
  assert.ok(md.includes("&lt;script&gt;"));assert.ok(md.includes("<https://example.org/role?q=%3Ctag%3E>"));assert.ok(md.includes("Private draft"));
});

test("storage failures retain current records, and unreadable originals require explicit replacement",()=>{
  let failure=true, saved=null;
  const store=M.createStore({getItem:()=>null,setItem:(_,text)=>{if(failure)throw Error("quota");saved=text;}});
  assert.equal(store.set([sample()]),false);assert.equal(store.error,"save");assert.equal(store.records.length,1);
  failure=false;assert.equal(store.retry(),true);assert.equal(M.parse(saved).length,1);
  let writes=0;const corrupt=M.createStore({getItem:()=>"not JSON",setItem:()=>writes++});
  corrupt.set([sample()]);assert.equal(writes,0);assert.equal(corrupt.blocked,true);
  corrupt.retry(true);assert.equal(writes,1);assert.equal(corrupt.blocked,false);
});

// Small event-capable DOM, running the real browser script rather than a copy of its logic.
function harness(options={}) {
  class Element {
    constructor(tag="div",id="") {this.tagName=tag;this.id=id;this.value="";this.textContent="";this.children=[];this.listeners={};this.dataset={};this.hidden=false;this.checked=false;this.disabled=false;this.files=[];this.className="";this.classList={toggle:()=>{},add:()=>{}};}
    append(...els){this.children.push(...els);} replaceChildren(...els){this.children=[...els];} setAttribute(k,v){this[k]=v;} focus(){} scrollIntoView(){} remove(){} click(){return this.dispatch("click");}
    addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);} async dispatch(name){for(const fn of this.listeners[name]||[])await fn({preventDefault(){}});}
    reset(){for(const id of ["company","role","url","appliedAt","nextAt","notes"])els[id].value="";els.status.value="planned";}
  }
  const html=fs.readFileSync(path.join(__dirname,"../web/applications/index.html"),"utf8"),els={},all=[];
  for(const match of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/g)) {
    const id=match[2].match(/\bid="([^"]+)"/)?.[1]||"",el=new Element(match[1],id);if(id)els[id]=el;
    for(const [attr,key] of [["data-i18n","i18n"],["data-language-link","languageLink"]]) {const value=match[2].match(new RegExp(attr+'="([^"]+)"'))?.[1];if(value)el.dataset[key]=value;}
    el.hidden=/\bhidden\b/.test(match[2]);all.push(el);
  }
  els.status.value="planned";els["filter-status"].value="all";
  const storage=new Map(options.initialSaved===undefined?[]:[[M.STORAGE_KEY,options.initialSaved]]),writes=[];let failSave=!!options.failSave;
  const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>{if(failSave&&key===M.STORAGE_KEY)throw Error("quota");storage.set(key,value);writes.push({key,value});}};
  const document={getElementById:id=>{assert.ok(els[id],id);return els[id];},createElement:tag=>new Element(tag),querySelectorAll:selector=>all.filter(el=>selector==="[data-i18n]"?el.dataset.i18n:selector==="[data-language-link]"?el.dataset.languageLink:false),documentElement:{},body:new Element("body"),addEventListener(){}};
  const sandbox={ApplicationsModel:M,document,localStorage,location:{search:"",href:"https://example.org/applications/"},history:{replaceState(){}},URL,URLSearchParams,Blob,TextEncoder,setTimeout:()=>{},crypto:{randomUUID:()=>`generated-${writes.length}-${Math.random()}`.replace(/\./g,"-")},window:{addEventListener(){},confirm:()=>options.confirm!==false}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../web/applications/applications.js"),"utf8"),sandbox);
  return {els,storage,writes,setFailure:value=>{failSave=value;},fill:(patch={})=>{const record=sample("ignored",patch);for(const key of ["company","role","url","status","appliedAt","nextAt","notes"])els[key].value=record[key];},event:(id,event="click")=>els[id].dispatch(event)};
}

test("actual UI keeps failed saves in memory, exports them and retries persistence",async()=>{
  const h=harness({failSave:true}); h.fill({company:"My entered company",notes:"Local note"});await h.event("record-form","submit");
  assert.equal(h.els["storage-warning"].hidden,false);assert.equal(h.els.records.children.length,1);
  await h.event("export-json");assert.equal(M.parse(h.els["export-text"].value)[0].company,"My entered company");
  h.setFailure(false);await h.event("storage-retry");assert.equal(M.parse(h.storage.get(M.STORAGE_KEY)).length,1);assert.equal(h.els["storage-warning"].hidden,true);
});

test("actual UI requires import confirmation, invalidates preview after editing, and preserves conflicts",async()=>{
  const h=harness(); h.fill({notes:"Keep local"});await h.event("record-form","submit");
  const existing=M.parse(h.storage.get(M.STORAGE_KEY))[0];
  h.els["import-text"].value=M.backup([{...existing,notes:"Replace local?"},sample("incoming")]);await h.event("preview");
  assert.equal(M.parse(h.storage.get(M.STORAGE_KEY)).length,1);assert.equal(h.els["import-preview"].hidden,false);
  await h.event("import-text","input");await h.event("confirm-import");assert.equal(M.parse(h.storage.get(M.STORAGE_KEY)).length,1);
  await h.event("preview");await h.event("confirm-import");const final=M.parse(h.storage.get(M.STORAGE_KEY));assert.equal(final.length,2);assert.equal(final[0].notes,"Keep local");
});

test("actual UI handles editing, undo, language changes and hostile text without HTML",async()=>{
  const h=harness();h.fill({company:"<img onerror=alert(1)>",notes:"Do not publish"});await h.event("record-form","submit");
  const card=h.els.records.children[0], actions=card.children.at(-1);assert.equal(card.children[1].textContent,"<img onerror=alert(1)>");
  await actions.children[0].click();h.els.notes.value="Edited note";await h.event("record-form","submit");assert.equal(M.parse(h.storage.get(M.STORAGE_KEY))[0].notes,"Edited note");
  const before=h.storage.get(M.STORAGE_KEY);await h.event("language");assert.equal(h.storage.get(M.STORAGE_KEY),before);assert.equal(h.els.save.textContent,"Save on this device");
  await h.els.records.children[0].children.at(-1).children[1].click();assert.equal(M.parse(h.storage.get(M.STORAGE_KEY)).length,0);
  await h.event("undo");assert.equal(M.parse(h.storage.get(M.STORAGE_KEY))[0].notes,"Edited note");
  const source=fs.readFileSync(path.join(__dirname,"../web/applications/applications.js"),"utf8");assert.ok(!/innerHTML|insertAdjacentHTML|fetch\(|XMLHttpRequest/.test(source));
});

test("actual UI blocks replacing unreadable saved data when explicit confirmation is declined",async()=>{
  const h=harness({initialSaved:"broken JSON",confirm:false});h.fill();await h.event("record-form","submit");await h.event("storage-retry");
  assert.equal(h.storage.get(M.STORAGE_KEY),"broken JSON");assert.equal(h.els["storage-warning"].hidden,false);
  await h.event("export-json");assert.equal(M.parse(h.els["export-text"].value).length,1);
});

test("actual UI clears stale import previews when a newly selected file fails",async()=>{
  const h=harness();h.els["import-text"].value=M.backup([sample()]);await h.event("preview");assert.equal(h.els["import-preview"].hidden,false);
  h.els["import-file"].files=[{size:100,text:async()=>{throw Error("read failed");}}];await h.event("import-file","change");await h.event("confirm-import");
  assert.equal(h.els["import-preview"].hidden,true);assert.equal(h.els["import-text"].value,"");assert.equal(h.storage.get(M.STORAGE_KEY),undefined);
});
