"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const M = require("../web/visitor-map.js"), config = require("../web/visitor-map-config.json");

test("the official image and statistics URL share the published body embed", () => {
  const valid = M.validateConfig(config), html = fs.readFileSync(path.join(__dirname,"../web/index.html"),"utf8");
  assert.equal(new URL(valid.imageUrl).searchParams.get("d"),"ntLJGOeKJKC9srHXo9NO33yzZqYIH9yzYRgX1K1u8JU");
  assert.equal(valid.statsUrl,"https://mapmyvisitors.com/web/1c9hd");
  const body = html.split("<body>")[1].split("</body>")[0];
  assert.ok(body.includes(valid.imageUrl.replaceAll("&","&amp;")));
  assert.equal((body.match(/https:\/\/mapmyvisitors.com\/map\.png/g)||[]).length,1);
  assert.equal((body.match(/https:\/\/mapmyvisitors.com\/web\/1c9hd/g)||[]).length,2);
  assert.ok(body.includes('visitor-map.js?v='));
  assert.doesNotMatch(html,/globe\.js|<canvas|<iframe|visitor-globe-(?:total|countries)/);
  for (const imageUrl of ["javascript:alert(1)",valid.imageUrl.replace("mapmyvisitors.com","evil.test"),valid.imageUrl+"&d=anotherkey12345",valid.imageUrl+"&callback=run",valid.imageUrl+"#hash",valid.imageUrl.replace("cl=ffffff","cl=red")]) assert.throws(()=>M.validateConfig({...config,imageUrl}));
  assert.throws(()=>M.validateConfig({...config,statsUrl:"https://evil.test/web/1c9hd"}));
});

async function mount({home=true,complete=false,width=0,failConfig=false,pathname="/JobHub/"}={}) {
  const ids=new Map(),requests=[],timers=new Map(),observers=[]; let timerId=0;
  class El {
    constructor(tag="div"){this.tagName=tag;this.attrs={};this.events={};this.children=[];this.hidden=false;this.textContent="";this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}
    set src(value){this.attrs.src=value;} get src(){return this.attrs.src;}
    getAttribute(key){return this.attrs[key]??null;}
    removeAttribute(key){delete this.attrs[key];}
    append(node){this.children.push(node);if(node.id)ids.set(node.id,node);}
    addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
    emit(name){for(const fn of this.events[name]||[])fn();}
    cloneNode(){const next=new El(this.tagName);next.id=this.id;next.attrs={...this.attrs};next.complete=true;return next;}
    replaceWith(next){ids.set(this.id,next);}
    querySelectorAll(){return [];}
  }
  if(home)for(const id of ["visitor-map","visitor-map-image","visitor-map-status","visitor-map-retry","visitor-map-error"]) {const node=new El();node.id=id;ids.set(id,node);}
  if(home){const img=ids.get("visitor-map-image");img.src=config.imageUrl;img.complete=complete;img.naturalWidth=width;img.naturalHeight=width?112:0;}
  const doc={body:new El("body"),documentElement:{lang:"zh-CN"},getElementById:id=>ids.get(id)||null,createElement:tag=>new El(tag)};
  const env={document:doc,location:new URL("https://example.test"+pathname),scriptURL:"https://example.test/JobHub/visitor-map.js?v=1",fetch:async url=>{requests.push(url);if(failConfig)throw Error("offline");return {ok:true,json:async()=>config};},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}}};
  const api=M.mount(env);await new Promise(resolve=>setImmediate(resolve));
  return {api,ids,doc,env,requests,timers,observers,image:()=>ids.get("visitor-map-image")};
}
test("homepage reuses its cached image without a second count or dependency request",async()=>{
  const p=await mount({complete:true,width:180});assert.equal(p.api.state,"loaded");assert.equal(p.requests.length,0);assert.equal(p.doc.body.children.length,0);assert.equal(p.timers.size,0);assert.equal(p.image().hidden,false);
  p.doc.documentElement.lang="en";p.observers[0]();assert.match(p.ids.get("visitor-map-status").textContent,/map loaded/);
});
test("a broken image can retry without stale events replacing the new result",async()=>{
  const p=await mount();assert.equal(p.api.state,"loading");const old=p.image();old.emit("error");assert.equal(p.api.state,"error");assert.equal(old.hidden,true);assert.equal(p.ids.get("visitor-map-retry").hidden,false);
  p.ids.get("visitor-map-retry").emit("click");const next=p.image();assert.notEqual(next,old);assert.equal(p.api.state,"loading");assert.equal(next.src,config.imageUrl);
  old.emit("error");assert.equal(p.api.state,"loading");next.naturalWidth=180;next.naturalHeight=112;next.emit("load");assert.equal(p.api.state,"loaded");assert.equal(next.hidden,false);assert.equal(p.ids.get("visitor-map-error").hidden,true);
});
test("a timeout or empty tracking pixel is never described as a loaded distribution",async()=>{
  const empty=await mount({complete:true,width:0});assert.equal(empty.api.state,"error");
  const p=await mount();[...p.timers.values()][0]();assert.equal(p.api.state,"error");p.image().naturalWidth=180;p.image().naturalHeight=112;p.image().emit("load");assert.equal(p.api.state,"loaded");
});
test("public lessons use the same key once and private pages never request statistics",async()=>{
  const p=await mount({home:false,pathname:"/JobHub/learn/rsi-infra/"});assert.deepEqual(p.requests,["https://example.test/JobHub/visitor-map-config.json"]);assert.equal(p.doc.body.children.length,1);assert.equal(p.doc.body.children[0].src,config.imageUrl);assert.equal(p.doc.body.children[0].width,1);M.mount(p.env);assert.equal(p.requests.length,1);
  for(const part of ["applications","hiring","portfolio","search","%61pplications"]){const p=await mount({home:false,pathname:`/JobHub/${part}/`});assert.equal(p.requests.length,0);assert.equal(p.doc.body.children.length,0);}
  const failed=await mount({home:false,failConfig:true});assert.equal(failed.doc.body.children[0].src,undefined);
  assert.throws(()=>M.configURL("https://evil.test/map.js","https://example.test/"));
});
