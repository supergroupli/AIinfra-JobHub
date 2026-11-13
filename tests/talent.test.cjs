"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../web/talent/talent-model.js");
const today = "2026-11-13";
const person = (extra = {}) => ({
  id:"builder-one", name:"Example tester", status:"approved", consent:true,
  targetRole:{zh:"推理实习",en:"Inference internship"}, summary:{zh:"实现缓存指标",en:"Implemented cache metrics"},
  tags:["vLLM","KV Cache"], workMode:"remote-regional", location:"Shanghai", languages:"English, Mandarin", availability:"December / UTC+8",
  github:"https://github.com/example", portfolio:"https://example.org/work", source:"https://github.com/supergroupli/AIinfra-JobHub/issues/1", updatedAt:today, expiresAt:"2026-12-01", ...extra
});
const review = (extra = {}) => ({
  id:"review-one",title:{zh:"缓存实验评审",en:"Cache experiment review"},summary:{zh:"请检查对照方法",en:"Check the controls"},author:"Example tester",portfolio:"https://example.org/work",source:"https://github.com/supergroupli/AIinfra-JobHub/issues/2",status:"queued",consent:true,updatedAt:today,expiresAt:"2026-12-01",...extra
});

test("talent listings require current consent and valid calendar dates", () => {
  const records = [person(), person({id:"expired",updatedAt:"2026-10-01",expiresAt:"2026-11-12"}), person({id:"withdrawn",status:"withdrawn"}), person({id:"private",consent:false}), person({id:"pending",status:"pending"}), person({id:"future",updatedAt:"2026-11-14"}), person({id:"impossible",expiresAt:"2026-11-31"})];
  assert.deepEqual(M.activePeople(records,today).map(p=>p.id),["builder-one"]);
  assert.equal(M.validDate("2024-02-29"),true);
  assert.equal(M.validDate("2026-02-29"),false);
  assert.equal(M.activePeople([person({updatedAt:"2026-11-01",expiresAt:today})],today).length,1);
  assert.equal(M.activePeople([person({expiresAt:"2027-12-01"})],today).length,0);
});

test("filters combine direction, arrangements, text and selections without ability scores", () => {
  const people=[person(),person({id:"platform-builder",targetRole:undefined,tags:["Kubernetes"],workMode:"onsite",location:"Berlin",languages:"German",availability:"January",summary:{zh:"平台部署",en:"Platform deployment"}})];
  assert.deepEqual(M.filterPeople(people,{direction:"inference",workMode:"remote-regional",query:"实习"},today).map(p=>p.id),["builder-one"]);
  assert.equal(M.filterPeople(people,{direction:"platform",query:"Berlin"},today).length,1);
  assert.equal(M.filterPeople(people,{direction:"inference",workMode:"onsite"},today).length,0);
  assert.deepEqual(M.filterPeople(people,{selectedOnly:true,selected:["platform-builder"]},today).map(p=>p.id),["platform-builder"]);
  assert.equal(M.filterPeople(people,{direction:"invented"},today).length,0);
});

test("shortlist exports drop expired, withdrawn and unknown records", () => {
  const people=[person(),person({id:"gone",status:"withdrawn"}),person({id:"expired",updatedAt:"2026-10-01",expiresAt:"2026-11-12"})];
  assert.deepEqual(M.cleanSelection(["builder-one","builder-one","gone","expired","unknown"],people,today),["builder-one"]);
  const md=M.shortlistMarkdown(people,["gone","expired","builder-one"],"en",today);
  assert.equal((md.match(/^## /gm)||[]).length,1);
  assert.ok(md.includes("Inference internship"));
  assert.ok(md.includes("Last confirmed: "+today));
  assert.ok(md.includes("without ability scores"));
  assert.ok(M.shortlistMarkdown(people,["unknown"],"en",today).includes("No currently active profiles"));
});

test("reproduction status requires an attributed review and persistent evidence", () => {
  const proof="https://github.com/example/project/commit/"+"a".repeat(40);
  const records=[review(),review({id:"unsupported",status:"reproduced"}),review({id:"bad-proof",status:"reproduced",reviewer:"Peer",evidence:"https://example.org/claim"}),review({id:"no-reviewer",status:"in-review"}),review({id:"valid-proof",status:"reproduced",reviewer:"Peer",evidence:proof}),review({id:"wrong-repo",source:"https://github.com/other/repository/issues/1"})];
  assert.deepEqual(M.activeReviews(records,today).map(r=>r.id),["review-one","valid-proof"]);
  assert.equal(M.evidenceUrl("https://github.com/example/project/issues/1#issuecomment-123"),true);
  assert.equal(M.evidenceUrl("https://github.com/example/project/tree/main"),false);
  assert.equal(M.evidenceUrl("https://github.com@example.org/project/issues/1"),false);
  assert.equal(M.activeReviews([review({status:"withdrawn"})],today).length,0);
});

test("untrusted profile text cannot introduce Markdown links or HTML", () => {
  const p=person({name:"[Click](javascript:alert(1))\n# Heading",summary:{zh:"<script>alert(1)</script>",en:"<script>alert(1)</script>"},targetRole:undefined});
  const md=M.shortlistMarkdown([p],[p.id],"en",today);
  assert.ok(md.includes("\\[Click\\]"));
  assert.ok(!md.includes("\n# Heading"));
  assert.ok(!md.includes("<script>"));
  assert.ok(md.includes("Target role: Not provided"));
  assert.equal(M.safeUrl("javascript:alert(1)"),"");
  assert.equal(M.safeUrl("https://name:secret@example.org/"),"");
  assert.equal(M.activePeople([person({portfolio:"javascript:alert(1)"})],today).length,0);
});

// Run the actual UI script against a minimal DOM/storage environment. These
// assertions protect local selections on network failure and stop text becoming HTML.
function mountTalent({data,failed=false,saved=[],blockedStorage=false}={}) {
  const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
  const folder=path.join(__dirname,"../web/talent");
  const html=fs.readFileSync(path.join(folder,"index.html"),"utf8");
  const ids=new Map(), storage=new Map([["infra-commons:talent-shortlist-v1",JSON.stringify(saved)]]);
  function element(tag="div") {
    const handlers={},attributes={};
    return {tagName:tag.toUpperCase(),children:[],dataset:{},hidden:false,disabled:false,value:"",checked:false,
      set textContent(value){this.ownText=String(value);this.children=[];},get textContent(){return (this.ownText||"")+this.children.map(c=>c.textContent).join("");},
      set innerHTML(_){throw new Error("Text cannot become HTML");},
      append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;this.ownText="";},
      setAttribute(k,v){attributes[k]=v;},getAttribute(k){return attributes[k]??null;},
      addEventListener(type,fn){handlers[type]=fn;},async emit(type){return handlers[type]?.({target:this});},focus(){},remove(){}
    };
  }
  for(const match of html.matchAll(/id="([^"]+)"/g)) ids.set(match[1],element());
  const translated=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m=>{const e=element();e.dataset.i18n=m[1];return e;});
  const flatten=e=>[e,...e.children.flatMap(flatten)];
  const document={documentElement:{},title:"",hidden:false,body:element(),createElement:element,getElementById:id=>{assert.ok(ids.has(id),id);return ids.get(id);},querySelectorAll:selector=>selector==="[data-i18n]"?translated:[],querySelector:selector=>{const id=/data-person="([^"]+)"/.exec(selector)?.[1];return [...ids.values()].flatMap(flatten).find(e=>e.dataset.person===id)||null;},addEventListener(){}};
  const location=new URL("https://example.org/talent/?lang=zh");
  const context=vm.createContext({TalentModel:M,document,location,URL,URLSearchParams,history:{replaceState(){}},AbortController,Blob,localStorage:{getItem:k=>storage.get(k)??null,setItem(k,v){if(blockedStorage)throw new Error("blocked");storage.set(k,v);}},setTimeout(){return 1;},clearTimeout(){},setInterval(){},fetch:async url=>{if(failed)throw new Error("offline");return {ok:true,json:async()=>String(url).includes("reviews.json")?[]:{repository:"supergroupli/AIinfra-JobHub",people:data||[]}};}});
  new vm.Script(fs.readFileSync(path.join(folder,"talent.js"),"utf8")).runInContext(context);
  return {ids,storage,flatten,async ready(){for(let i=0;i<12;i++)await Promise.resolve();}};
}

test("failed fetch preserves saved IDs and does not present a fake empty directory",async()=>{
  const page=mountTalent({failed:true,saved:["builder-one"]});await page.ready();
  assert.equal(page.ids.get("talent-error").hidden,false);
  assert.equal(page.ids.get("talent-empty").hidden,true);
  assert.equal(page.ids.get("export-shortlist").disabled,true);
  assert.equal(page.storage.get("infra-commons:talent-shortlist-v1"),'["builder-one"]');
});

test("actual page keeps local selections, renders text safely and removes withdrawn IDs",async()=>{
  const actualToday=M.dateKey();
  const expires=new Date(Date.parse(actualToday)+86400000).toISOString().slice(0,10);
  const p=person({name:"<img src=x onerror=alert(1)>",updatedAt:actualToday,expiresAt:expires});
  const page=mountTalent({data:[p,person({id:"gone",status:"withdrawn",updatedAt:actualToday,expiresAt:expires})],saved:["gone"]});await page.ready();
  assert.equal(page.ids.get("talent-grid").children.length,1);
  assert.ok(page.ids.get("talent-grid").textContent.includes(p.name));
  assert.equal(page.storage.get("infra-commons:talent-shortlist-v1"),'[]');
  const button=page.flatten(page.ids.get("talent-grid")).find(e=>e.dataset.person===p.id);
  await button.emit("click");
  assert.equal(page.storage.get("infra-commons:talent-shortlist-v1"),'["builder-one"]');
  assert.equal(page.ids.get("export-shortlist").disabled,false);
  await page.ids.get("clear-shortlist").emit("click");
  assert.equal(page.ids.get("export-shortlist").disabled,true);
});
