"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("../web/visitor-globe.js");
const empty={version:1,provider:null,scriptUrl:null,statsUrl:null};
const enabled={version:1,provider:"mapmyvisitors",scriptUrl:"https://mapmyvisitors.com/globe.js?d=PublicWidgetKey1234567890&t=tt&w=300&co=eff4e6",statsUrl:"https://mapmyvisitors.com/web/example1"};

test("configuration only accepts the official provider and an explicit safe public key",()=>{
  assert.deepEqual(M.validateConfig(empty),empty);const validated=M.validateConfig(enabled);
  assert.equal(M.validateConfig({...enabled,statsUrl:null}).statsUrl,null);
  assert.equal(validated.pixelUrl,"https://mapmyvisitors.com/map.png?d=PublicWidgetKey1234567890");
  for(const config of [null,{...empty,provider:"custom"},{...empty,scriptUrl:enabled.scriptUrl},{...enabled,version:2},{...enabled,extra:"not accepted"}])assert.throws(()=>M.validateConfig(config));
  for(const scriptUrl of ["javascript:alert(1)","https://evil.test/globe.js?d=PublicWidgetKey1234567890","http://mapmyvisitors.com/globe.js?d=PublicWidgetKey1234567890","https://mapmyvisitors.com:8443/globe.js?d=PublicWidgetKey1234567890","https://user@mapmyvisitors.com/globe.js?d=PublicWidgetKey1234567890","https://mapmyvisitors.com/map.js?d=PublicWidgetKey1234567890",enabled.scriptUrl+"&callback=alert",enabled.scriptUrl+"&d=RepeatedPublicKey",enabled.scriptUrl+"#fragment",enabled.scriptUrl.replace("PublicWidgetKey1234567890","%3Cscript%3E"),enabled.scriptUrl.replace("co=eff4e6","co=red")])assert.throws(()=>M.validateConfig({...enabled,scriptUrl}));
  for(const statsUrl of ["https://evil.test/web/example1",enabled.statsUrl+"?next=https://evil.test",enabled.statsUrl+"#hash","https://mapmyvisitors.com/add/","https://mapmyvisitors.com/web/"])assert.throws(()=>M.validateConfig({...enabled,statsUrl}));
});
test("nested pages load local configuration from the script path and exclude private tools",()=>{
  assert.equal(M.configURL("https://example.test/JobHub/visitor-globe.js?v=1","https://example.test/JobHub/learn/rsi-infra/"),"https://example.test/JobHub/visitor-globe-config.json");
  assert.throws(()=>M.configURL("https://external.test/visitor-globe.js","https://example.test/"));
  for(const page of ["/JobHub/applications/","/JobHub/hiring/","/JobHub/portfolio/","/JobHub/search/","/JobHub/%61pplications/"])assert.equal(M.publicPage(page),false);
  assert.equal(M.publicPage("/JobHub/learn/vllm/"),true);
});

async function mount({config=empty,home=true,path="/JobHub/",reduced=false,failConfig=false,canvas=true}={}){
  class El{
    constructor(tag="div"){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.events={};this.textContent="";this.messages=[];this.contentWindow={postMessage:(...args)=>this.messages.push(args)};}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=[...nodes];}
    setAttribute(key,value){this.attrs[key]=String(value);}
    removeAttribute(key){delete this.attrs[key];delete this[key];}
    addEventListener(type,callback){(this.events[type]??=[]).push(callback);}
    emit(type){for(const callback of this.events[type]||[])callback({target:this});}
    querySelector(selector){const types=selector.toUpperCase().split(",").map(v=>v.trim());return this.children.find(n=>types.includes(n.tagName))||null;}
    getBoundingClientRect(){return {width:300};}
  }
  const ids=new Map(),names=["visitor-globe","visitor-globe-canvas","visitor-globe-status","visitor-globe-note","visitor-globe-total","visitor-globe-countries","visitor-globe-placeholder","visitor-globe-provider","visitor-globe-pause","visitor-globe-retry","visitor-globe-load","visitor-globe-stats","visitor-globe-metrics"];
  if(home)for(const id of names)ids.set(id,new El());
  const ctx={setTransform(){},clearRect(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){},createRadialGradient(){return {addColorStop(){}};}};
  if(home){ids.get("visitor-globe-canvas").getContext=()=>canvas?ctx:null;ids.get("visitor-globe").querySelectorAll=()=>[];}
  const doc={documentElement:{lang:"zh-CN"},hidden:false,body:new El("body"),events:{},getElementById:id=>ids.get(id)||null,createElement:tag=>new El(tag),addEventListener(type,callback){this.events[type]=callback;}};
  const windowEvents={},queries=[],observers=[],intersections=[],frames=new Map(),timers=new Map(),media={matches:reduced,addEventListener(type,callback){this.change=callback;}};let frameId=0,timerId=0,fetchCount=0;
  const env={addEventListener:(type,fn)=>{windowEvents[type]=fn;},document:doc,location:new URL("https://example.test"+path),scriptURL:"https://example.test/JobHub/visitor-globe.js",fetch:async(url)=>{queries.push(url);fetchCount++;if(failConfig&&fetchCount===1)throw Error("offline");return {ok:true,json:async()=>config};},matchMedia:()=>media,requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(target){this.target=target;}disconnect(){this.target=null;}},IntersectionObserver:class{constructor(fn){intersections.push(fn);}observe(){}},devicePixelRatio:2};
  const api=M.mount(env),flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();
  const remoteNodes=()=>[...doc.body.children,...(ids.get("visitor-globe-provider")?.children||[])].filter(n=>n.src?.startsWith("https://mapmyvisitors.com/")||n.srcdoc?.includes("https://mapmyvisitors.com/globe.js"));
  return {api,ids,doc,env,windowEvents,media,queries,frames,timers,observers,intersections,flush,remoteNodes,El,click:id=>ids.get(id).emit("click")};
}
test("unconfigured homepage draws only an illustration, keeps unavailable counts and sends no external request",async()=>{
  const page=await mount();assert.equal(page.api.state.phase,"unconfigured");assert.deepEqual(page.queries,["https://example.test/JobHub/visitor-globe-config.json"]);assert.equal(page.remoteNodes().length,0);
  assert.equal(page.ids.get("visitor-globe-total").textContent,"—");assert.equal(page.ids.get("visitor-globe-countries").textContent,"—");assert.match(page.ids.get("visitor-globe-status").textContent,/尚未接入/);assert.equal(page.ids.get("visitor-globe-stats").hidden,true);
  page.doc.documentElement.lang="en";page.observers.find(o=>o.target===page.doc.documentElement).fn();assert.match(page.ids.get("visitor-globe-status").textContent,/not connected/);
  const noCanvas=await mount({canvas:false});assert.equal(noCanvas.ids.get("visitor-globe-canvas").hidden,true);assert.match(noCanvas.ids.get("visitor-globe-status").textContent,/尚未接入/);
});
test("animation pauses manually, offscreen, in hidden tabs and for reduced-motion preferences",async()=>{
  const page=await mount();assert.equal(page.api.state.animationRunning,false);page.intersections[0]([{isIntersecting:true}]);assert.equal(page.api.state.animationRunning,true);
  page.click("visitor-globe-pause");assert.equal(page.api.state.animationRunning,false);assert.equal(page.ids.get("visitor-globe-pause").attrs["aria-pressed"],"true");page.click("visitor-globe-pause");assert.equal(page.api.state.animationRunning,true);
  page.doc.hidden=true;page.doc.events.visibilitychange();assert.equal(page.api.state.animationRunning,false);page.doc.hidden=false;page.doc.events.visibilitychange();assert.equal(page.api.state.animationRunning,true);
  page.intersections[0]([{isIntersecting:false}]);assert.equal(page.api.state.animationRunning,false);page.intersections[0]([{isIntersecting:true}]);page.media.matches=true;page.media.change();assert.equal(page.api.state.animationRunning,false);assert.equal(page.ids.get("visitor-globe-pause").disabled,true);
  const p=M.project(35,20,.4);assert.ok(Math.abs(p.x*p.x+p.y*p.y+p.z*p.z-1)<1e-10);
});
test("sandboxed provider load is distinct from display and data; errors and retries never invent a count",async()=>{
  const page=await mount({config:enabled});assert.equal(page.api.state.phase,"loading");assert.equal(page.remoteNodes().length,1);const frame=page.remoteNodes()[0];assert.equal(frame.tagName,"IFRAME");assert.equal(frame.attrs.sandbox,"allow-scripts allow-popups allow-popups-to-escape-sandbox");assert.equal(frame.referrerPolicy,"no-referrer");assert.match(frame.srcdoc,/id="mmvst_globe"/);assert.doesNotMatch(frame.srcdoc,/async=/);
  const message=(source,type,value)=>page.windowEvents.message({source,data:{channel:"jobhub-visitor-widget-v1",type,value}});
  frame.emit("load");assert.equal(page.api.state.phase,"loading");message({},"display");assert.equal(page.api.state.hasWidget,false);
  message(frame.contentWindow,"scriptLoaded");assert.equal(page.api.state.phase,"scriptLoaded");assert.equal(page.api.state.hasWidget,false);assert.match(page.ids.get("visitor-globe-status").textContent,/暂未显示/);
  frame.emit("error");assert.equal(page.api.state.phase,"providerError");assert.equal(page.ids.get("visitor-globe-retry").hidden,false);assert.equal(page.ids.get("visitor-globe-total").textContent,"—");message(frame.contentWindow,"scriptLoaded");assert.equal(page.api.state.phase,"providerError");
  page.click("visitor-globe-retry");assert.equal(page.api.state.phase,"loading");assert.equal(page.remoteNodes().length,1);const fresh=page.remoteNodes()[0];assert.notEqual(fresh,frame);message(fresh.contentWindow,"scriptLoaded");
  message(fresh.contentWindow,"display");assert.equal(page.api.state.phase,"widgetPresent");assert.equal(page.ids.get("visitor-globe-placeholder").hidden,true);assert.equal(page.ids.get("visitor-globe-total").textContent,"—");assert.match(page.ids.get("visitor-globe-status").textContent,/MapMyVisitors/);
  page.click("visitor-globe-pause");assert.equal(fresh.messages.at(-1)[0].value,true);assert.equal(page.ids.get("visitor-globe-pause").hidden,false);
  message(fresh.contentWindow,"stats","https://evil.test/web/anything");assert.equal(page.ids.get("visitor-globe-stats").href,enabled.statsUrl);
  const noStats=await mount({config:{...enabled,statsUrl:null}});assert.equal(noStats.ids.get("visitor-globe-stats").hidden,true);noStats.windowEvents.message({source:noStats.remoteNodes()[0].contentWindow,data:{channel:"jobhub-visitor-widget-v1",type:"stats",value:"https://mapmyvisitors.com/web/actualProviderPage"}});assert.equal(noStats.ids.get("visitor-globe-stats").hidden,false);assert.equal(noStats.ids.get("visitor-globe-stats").href,"https://mapmyvisitors.com/web/actualProviderPage");
});
test("reduced motion defers third-party animation until explicitly requested",async()=>{
  const page=await mount({config:enabled,reduced:true});assert.equal(page.api.state.phase,"deferred");assert.equal(page.remoteNodes().length,0);assert.equal(page.ids.get("visitor-globe-stats").href,enabled.statsUrl);page.click("visitor-globe-load");assert.equal(page.remoteNodes().length,1);assert.equal(page.api.state.phase,"loading");
});
test("public child pages use only the public-key pixel, once, while excluded pages never load configuration",async()=>{
  const page=await mount({config:enabled,home:false,path:"/JobHub/learn/rsi-infra/"});assert.equal(page.remoteNodes().length,1);const img=page.remoteNodes()[0];assert.equal(img.tagName,"IMG");assert.equal(img.width,1);assert.equal(img.height,1);assert.equal(img.referrerPolicy,"no-referrer");assert.equal(new URL(img.src).searchParams.size,1);assert.equal(new URL(img.src).searchParams.get("d"),"PublicWidgetKey1234567890");await page.api.reload();assert.equal(page.remoteNodes().length,1);
  const unconfigured=await mount({home:false});assert.equal(unconfigured.remoteNodes().length,0);
  for(const path of ["/JobHub/applications/","/JobHub/hiring/","/JobHub/portfolio/","/JobHub/search/"]){const privatePage=await mount({config:enabled,home:false,path});assert.equal(privatePage.queries.length,0);assert.equal(privatePage.api,null);}
});
test("configuration failures and script timeouts show unavailable states and can retry",async()=>{
  const page=await mount({failConfig:true});assert.equal(page.api.state.phase,"configError");assert.equal(page.remoteNodes().length,0);page.click("visitor-globe-retry");await page.flush();assert.equal(page.api.state.phase,"unconfigured");
  const bad=await mount({config:{...enabled,scriptUrl:"https://evil.test/x.js"}});assert.equal(bad.api.state.phase,"configError");assert.equal(bad.remoteNodes().length,0);
  const timed=await mount({config:enabled});[...timed.timers.values()][0]();assert.equal(timed.api.state.phase,"providerError");assert.equal(timed.ids.get("visitor-globe-total").textContent,"—");
});

test("frame bridge waits for a visible SVG and preserves the official parser-blocking lifecycle",()=>{
  const vm=require("node:vm"),html=M.widgetDocument({...enabled,statsUrl:null});assert.match(html,/id="mmvst_globe" src="https:\/\/mapmyvisitors.com\/globe\.js/);assert.match(html,/&amp;t=tt/);assert.doesNotMatch(html,/allow-same-origin/);assert.throws(()=>M.widgetDocument({...enabled,scriptUrl:'https://evil.test/x.js'}));
  const messages=[],events={},motions=[];let observer,display="none";
  const inner={querySelector:()=>({tagName:"svg"}),getBoundingClientRect:()=>({height:300})};
  const jq=()=>({velocity:(...args)=>motions.push(args)});jq.fn={velocity:true};
  const parent={postMessage:message=>messages.push(message)},context={parent,window:{addEventListener:(type,fn)=>{events[type]=fn;},globe_jq:jq},document:{documentElement:{},querySelector:selector=>selector===".mmvst_inner"?inner:selector==="#mmvst_a"?{href:"https://mapmyvisitors.com/"}:null,addEventListener(){}},getComputedStyle:()=>({display}),MutationObserver:class{constructor(fn){observer=fn;}observe(){}}};
  vm.runInNewContext('('+M.widgetBootstrap.toString()+')()',context);observer();assert.equal(messages.some(x=>x.type==="display"),false);display="block";observer();assert.equal(messages.filter(x=>x.type==="display").length,1);observer();assert.equal(messages.filter(x=>x.type==="display").length,1);
  events.message({source:parent,data:{channel:"jobhub-visitor-widget-v1",type:"motion",value:true}});assert.deepEqual(motions.at(-1),["pause",true]);
  context.window.jobHubWidgetScriptLoaded();assert.equal(messages.at(-1).type,"scriptLoaded");events.error({message:"Invalid provider callback"});assert.equal(messages.at(-1).type,"error");
});
