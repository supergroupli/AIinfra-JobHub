"use strict";
const JobHubVisitorGlobe = (() => {
  const fail = () => { throw new Error("Unsupported visitor widget configuration"); };
  function officialURL(value, path) {
    if(typeof value!=="string" || value.length>2048 || /[\s\\\u0000-\u001f\u007f]/.test(value)) return fail();
    let url;try{url=new URL(value);}catch{return fail();}
    if(url.origin!=="https://mapmyvisitors.com" || url.username || url.password || url.hash || !path.test(url.pathname)) return fail();
    return url;
  }
  function validateConfig(value) {
    if(!value || Array.isArray(value) || value.version!==1 || Object.keys(value).sort().join()!=="provider,scriptUrl,statsUrl,version")return fail();
    if(value.provider===null){if(value.scriptUrl!==null||value.statsUrl!==null)return fail();return {version:1,provider:null,scriptUrl:null,statsUrl:null};}
    if(value.provider!=="mapmyvisitors")return fail();
    const script=officialURL(value.scriptUrl,/^\/globe\.js$/),stats=value.statsUrl===null?null:officialURL(value.statsUrl,/^\/web\/[A-Za-z0-9_-]{1,80}\/?$/);
    if(stats?.search)return fail();
    const allowed=new Set(["d","t","w","cl","co","ct","cmo","cmn"]),seen=new Set();
    for(const [key,item] of script.searchParams){
      if(!allowed.has(key)||seen.has(key))return fail();seen.add(key);
      if(key==="d"&&!/^[A-Za-z0-9_-]{12,200}$/.test(item))return fail();
      if(key==="t"&&!/^[A-Za-z0-9_-]{1,40}$/.test(item))return fail();
      if(key==="w"&&item!=="a"&&(!/^\d{2,4}$/.test(item)||Number(item)<50||Number(item)>1000))return fail();
      if(["cl","co","ct","cmo","cmn"].includes(key)&&!/^([a-fA-F0-9]{6})$/.test(item))return fail();
    }
    if(!seen.has("d"))return fail();
    return {version:1,provider:"mapmyvisitors",scriptUrl:script.href,statsUrl:stats?.href||null,pixelUrl:"https://mapmyvisitors.com/map.png?d="+encodeURIComponent(script.searchParams.get("d"))};
  }
  // Runs only in the sandboxed frame; provider code never shares the site's globals.
  function widgetBootstrap(){
    const channel="jobhub-visitor-widget-v1";let shown=false,lastLink="",paused=false;
    const send=(type,value)=>parent.postMessage({channel,type,value},"*");
    function applyMotion(){const jq=window.globe_jq;if(!jq?.fn?.velocity)return;jq(".mmvst_globe,.mmvst_map_f,.mmvst_map_b,.mmvst_dots").velocity(paused?"pause":"resume",true);}
    function inspect(){
      const inner=document.querySelector(".mmvst_inner"),svg=inner?.querySelector("svg");
      if(!shown&&inner&&svg&&getComputedStyle(inner).display!=="none"&&inner.getBoundingClientRect().height>0){shown=true;send("display");applyMotion();}
      const href=document.querySelector("#mmvst_a")?.href;
      if(href&&href!==lastLink){lastLink=href;send("stats",href);}
    }
    window.addEventListener("message",event=>{if(event.source!==parent||event.data?.channel!==channel||event.data?.type!=="motion"||typeof event.data.value!=="boolean")return;paused=event.data.value;applyMotion();});
    window.addEventListener("error",event=>{if(event.target?.tagName==="SCRIPT"||event.message)send("error");},true);
    new MutationObserver(inspect).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["style","href"]});
    window.addEventListener("load",inspect);
    document.addEventListener("DOMContentLoaded",()=>{const script=document.getElementById("mmvst_globe");script?.addEventListener("error",()=>send("error"));inspect();});
    window.jobHubWidgetScriptLoaded=()=>send("scriptLoaded");
  }
  function widgetDocument(config){
    const validated=validateConfig(config);if(!validated.provider)return fail();
    const src=validated.scriptUrl.replaceAll("&","&amp;").replaceAll('"',"&quot;");
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="https://mapmyvisitors.com/" target="_blank"><style>html,body{margin:0;background:transparent}body{box-sizing:border-box;padding:10px;width:100%;overflow:hidden}#widget{max-width:380px;margin:auto}.mmvst_outer{margin:auto!important}</style></head><body><div id="widget"><script>('+widgetBootstrap.toString()+')();</script><script id="mmvst_globe" src="'+src+'" onload="jobHubWidgetScriptLoaded()"></script></div></body></html>';
  }
  function publicPage(pathname) {return !pathname.split("/").some(part=>{try{part=decodeURIComponent(part);}catch{return true;}return ["applications","hiring","portfolio","search"].includes(part.toLowerCase());});}
  function configURL(scriptURL,pageURL){const page=new URL(pageURL),script=new URL(scriptURL,page);if(script.origin!==page.origin)throw Error("Configuration must be local");return new URL("./visitor-globe-config.json",script).href;}
  function canAnimate({paused,reduced,visible,hidden,provider}) {return !paused&&!reduced&&visible&&!hidden&&!provider;}
  // Coarse original outlines are decorative geography, never visitor locations.
  const lands=[
    [[-168,68],[-142,71],[-126,62],[-119,52],[-125,44],[-113,30],[-98,17],[-83,10],[-79,20],[-97,29],[-81,27],[-69,45],[-54,52],[-65,62],[-93,73],[-120,75],[-168,68]],
    [[-81,12],[-63,10],[-49,-1],[-35,-7],[-43,-23],[-53,-34],[-68,-55],[-76,-43],[-73,-24],[-80,-6],[-81,12]],
    [[-17,35],[9,37],[32,31],[42,13],[51,11],[44,-13],[32,-32],[18,-35],[10,-16],[-1,4],[-15,13],[-17,35]],
    [[-10,36],[-10,58],[10,71],[29,70],[34,59],[60,68],[100,76],[140,69],[178,64],[159,51],[140,44],[129,33],[121,20],[106,8],[100,1],[86,21],[75,7],[68,24],[49,29],[42,41],[29,41],[22,36],[-10,36]],
    [[113,-22],[122,-14],[137,-12],[153,-26],[148,-39],[131,-33],[116,-35],[113,-22]],
    [[-53,60],[-44,62],[-20,79],[-41,84],[-63,76],[-53,60]],
    [[46,-13],[50,-17],[47,-26],[43,-24],[46,-13]]
  ];
  function project(lon,lat,rotation){const r=Math.PI/180,p=lat*r,l=lon*r+rotation,tilt=.19;return {x:Math.cos(p)*Math.sin(l),y:Math.sin(p)*Math.cos(tilt)-Math.cos(p)*Math.cos(l)*Math.sin(tilt),z:Math.sin(p)*Math.sin(tilt)+Math.cos(p)*Math.cos(l)*Math.cos(tilt)};}
  function draw(canvas,rotation,ratio=1){
    const ctx=canvas.getContext?.("2d");if(!ctx)return false;
    const size=Math.max(180,Math.min(480,canvas.getBoundingClientRect?.().width||360)),scale=Math.min(2,Math.max(1,ratio));
    if(canvas.width!==Math.round(size*scale)||canvas.height!==Math.round(size*scale)){canvas.width=Math.round(size*scale);canvas.height=Math.round(size*scale);}
    ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,size,size);
    const center=size/2,radius=size*.43,fill=ctx.createRadialGradient(center-radius*.4,center-radius*.45,5,center,center,radius);
    fill.addColorStop(0,"#285c4b");fill.addColorStop(1,"#103b32");ctx.fillStyle=fill;ctx.beginPath();ctx.arc(center,center,radius,0,Math.PI*2);ctx.fill();
    function curve(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();let pen=false;for(const point of points){const p=project(point[0],point[1],rotation);if(p.z<0){pen=false;continue;}const x=center+radius*p.x,y=center-radius*p.y;if(pen)ctx.lineTo(x,y);else ctx.moveTo(x,y);pen=true;}ctx.stroke();}
    for(let lat=-60;lat<=60;lat+=30)curve(Array.from({length:121},(_,i)=>[-180+i*3,lat]),"rgba(194,222,181,.2)",.65);
    for(let lon=-180;lon<180;lon+=30)curve(Array.from({length:61},(_,i)=>[lon,-90+i*3]),"rgba(194,222,181,.2)",.65);
    for(const land of lands){const fine=[];for(let i=0;i<land.length-1;i++){const a=land[i],b=land[i+1],steps=Math.ceil(Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]))/3);for(let j=0;j<steps;j++)fine.push([a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps]);}curve(fine,"#c9dfa9",1.4);}
    ctx.strokeStyle="rgba(158,188,132,.55)";ctx.lineWidth=1;ctx.beginPath();ctx.arc(center,center,radius,0,Math.PI*2);ctx.stroke();return true;
  }
  const copy={
    zh:{eyebrow:"LEARNING WITHOUT BORDERS",title:"让学习，连接世界。",intro:"来自哪里并不重要。让一份可复现的作品，成为彼此认识的起点。",total:"公开页面访问量",countries:"访问国家 / 地区",illustration:"地球示意 · 不代表访客分布",stats:"查看访问量与国家统计 ↗",pause:"暂停示意动画",resume:"继续示意动画",pauseWidget:"暂停地球动画",resumeWidget:"继续地球动画",frameTitle:"MapMyVisitors 公开页面访问地球",reduced:"已按系统偏好关闭动态",retry:"重试加载统计",load:"载入访问统计组件",unconfigured:"尚未接入访问统计。这里只显示本地地球示意，访问量与国家数据暂不可用。",configError:"统计配置暂不可用。地球仍是示意，未加载外部统计。",loading:"正在加载统计组件，尚未确认访客数据。",scriptLoaded:"统计组件已载入，访问数据暂未显示。",widgetPresent:"访问数据由 MapMyVisitors 提供，国家或地区为近似定位。",providerError:"访问数据暂不可用，请稍后重试。",deferred:"已按减少动态偏好保留静态示意，可按需载入统计组件。",localNote:"当前未发送外部统计请求。数字“—”表示暂无数据，并非零访问。",providerNote:"仅统计已接入的公开页面访问，排除投递、招聘草稿、作品编辑和搜索页。计数与国家划分以 MapMyVisitors 为准，不等于在线人数或注册用户数。国家/地区按 IP 近似定位，不代表国籍或精确位置。",noCanvas:"你的浏览器不支持地球绘制；访问统计状态仍可阅读。"},
    en:{eyebrow:"LEARNING WITHOUT BORDERS",title:"Let learning connect the world.",intro:"Where you start matters less than the work you can share. A reproducible project can begin a useful conversation.",total:"Public-page visits",countries:"Visitor countries / regions",illustration:"Illustrative globe · not visitor locations",stats:"View visits & country statistics ↗",pause:"Pause illustration",resume:"Resume illustration",pauseWidget:"Pause globe animation",resumeWidget:"Resume globe animation",frameTitle:"MapMyVisitors public-page visitor globe",reduced:"Motion reduced by system preference",retry:"Retry statistics",load:"Load visitor statistics widget",unconfigured:"Visitor statistics are not connected yet. This is a locally drawn illustration; visit and country data are unavailable.",configError:"Statistics configuration is unavailable. The globe remains an illustration; no external statistics were loaded.",loading:"Loading the statistics widget. Visitor data has not been confirmed.",scriptLoaded:"The statistics component loaded. Visitor data is not displayed yet.",widgetPresent:"Visitor data is provided by MapMyVisitors. Countries and regions are approximate locations.",providerError:"Visitor data is unavailable. Please try again later.",deferred:"A static illustration respects your reduced-motion preference. You can load the statistics widget when needed.",localNote:"No external statistics request has been sent. “—” means data is unavailable, not zero visits.",providerNote:"Counts cover enabled public pages, excluding application records, hiring drafts, portfolio editing and search. MapMyVisitors defines visits and locations; these are not online-user or registered-user counts. Country/region is an approximate IP-based location, not nationality or precise position.",noCanvas:"Your browser cannot draw the globe. The statistics status remains readable."}
  };
  function mount(env){
    const {document:doc,location,fetch:read,scriptURL}=env,root=doc.getElementById("visitor-globe");
    if(!publicPage(location.pathname))return null;
    const get=id=>doc.getElementById(id),reduced=env.matchMedia?.("(prefers-reduced-motion: reduce)")||{matches:false};
    let configured=null,phase="unconfigured",seq=0,pixel=null,script=null,timer=null,frame=null,rotation=-.6,lastTime=0,paused=false,visible=!env.IntersectionObserver,hasWidget=false,widgetObserver=null,canvasAvailable=false;
    const canvas=root?get("visitor-globe-canvas"):null,lang=()=>doc.documentElement.lang.startsWith("en")?"en":"zh",t=key=>copy[lang()][key];
    const animationState=()=>({paused,reduced:reduced.matches,visible,hidden:doc.hidden,provider:hasWidget});
    function render(){if(!root)return;root.querySelectorAll("[data-globe-key]").forEach(el=>{el.textContent=t(el.dataset.globeKey);});get("visitor-globe-status").textContent=t(phase);get("visitor-globe-note").textContent=t(configured?.provider?"providerNote":"localNote");for(const id of ["visitor-globe-total","visitor-globe-countries"])get(id).textContent="—";get("visitor-globe-placeholder").hidden=hasWidget;get("visitor-globe-pause").hidden=false;get("visitor-globe-pause").disabled=reduced.matches;get("visitor-globe-pause").textContent=t(reduced.matches?"reduced":hasWidget?(paused?"resumeWidget":"pauseWidget"):(paused?"resume":"pause"));get("visitor-globe-pause").setAttribute("aria-pressed",String(paused||reduced.matches));get("visitor-globe-retry").hidden=!["configError","providerError"].includes(phase);get("visitor-globe-load").hidden=phase!=="deferred";const stats=get("visitor-globe-stats");stats.hidden=!configured?.statsUrl;if(configured?.statsUrl)stats.href=configured.statsUrl;else stats.removeAttribute("href");if(get("visitor-globe-metrics"))get("visitor-globe-metrics").hidden=hasWidget;get("visitor-globe-provider").dataset.ready=String(hasWidget);if(script)script.title=t("frameTitle");}
    function animate(time){frame=null;if(!canAnimate(animationState()))return;if(!lastTime||time-lastTime>=40){rotation+=Math.min(80,lastTime?time-lastTime:40)*.00009;lastTime=time;if(canvas)draw(canvas,rotation,env.devicePixelRatio);}frame=env.requestAnimationFrame(animate);}
    function syncAnimation(){script?.contentWindow?.postMessage({channel:"jobhub-visitor-widget-v1",type:"motion",value:paused||reduced.matches||!visible||doc.hidden},"*");if(frame!==null){env.cancelAnimationFrame(frame);frame=null;}lastTime=0;if(canvasAvailable&&canAnimate(animationState())&&env.requestAnimationFrame)frame=env.requestAnimationFrame(animate);}
    function showError(){if(!root)return;seq++;widgetObserver?.disconnect();get("visitor-globe-provider").replaceChildren();script=null;phase="providerError";hasWidget=false;render();syncAnimation();}
    function startProvider(){
      if(!configured?.provider)return;
      if(!root){if(pixel)return;pixel=doc.createElement("img");pixel.width=1;pixel.height=1;pixel.alt="";pixel.hidden=true;pixel.referrerPolicy="no-referrer";pixel.src=configured.pixelUrl;doc.body.append(pixel);return;}
      seq++;const request=seq;if(timer!==null)env.clearTimeout(timer);widgetObserver?.disconnect();get("visitor-globe-provider").replaceChildren();hasWidget=false;phase="loading";render();syncAnimation();
      script=doc.createElement("iframe");script.title=t("frameTitle");script.setAttribute("sandbox","allow-scripts allow-popups allow-popups-to-escape-sandbox");script.referrerPolicy="no-referrer";script.srcdoc=widgetDocument({version:configured.version,provider:configured.provider,scriptUrl:configured.scriptUrl,statsUrl:configured.statsUrl});
      script.addEventListener("error",()=>{if(request!==seq)return;if(timer!==null)env.clearTimeout(timer);showError();});
      // A frame load does not confirm that either the provider script or its data loaded.
      get("visitor-globe-provider").append(script);timer=env.setTimeout(()=>{if(request===seq&&!hasWidget)showError();},20000);
    }
    async function loadConfig(){const request=++seq;configured=null;phase="unconfigured";render();let url;try{url=configURL(scriptURL,location.href);const response=await read(url,{cache:"no-cache",credentials:"same-origin"});if(!response.ok)throw Error("Configuration unavailable");const value=validateConfig(await response.json());if(request!==seq)return;configured=value;if(!value.provider){phase="unconfigured";render();return;}if(root&&reduced.matches){phase="deferred";render();return;}startProvider();}catch(_){if(request!==seq)return;phase="configError";render();}}
    if(root){
      if(canvas){canvasAvailable=draw(canvas,rotation,env.devicePixelRatio);if(!canvasAvailable){canvas.setAttribute("aria-label",t("noCanvas"));canvas.hidden=true;}}
      get("visitor-globe-pause").addEventListener("click",()=>{paused=!paused;render();syncAnimation();});
      get("visitor-globe-retry").addEventListener("click",()=>configured?.provider?startProvider():loadConfig());get("visitor-globe-load").addEventListener("click",startProvider);
      env.addEventListener?.("message",event=>{
        if(!script||event.source!==script.contentWindow||event.data?.channel!=="jobhub-visitor-widget-v1")return;
        const {type,value}=event.data;
        if(type==="error"){if(timer!==null)env.clearTimeout(timer);showError();return;}
        if(type==="scriptLoaded"&&!hasWidget){phase="scriptLoaded";render();return;}
        if(type==="stats"){try{const url=officialURL(value,/^\/web\/[A-Za-z0-9_-]{1,80}\/?$/);if(url.search)return;configured.statsUrl=url.href;render();}catch{}return;}
        if(type==="display"){hasWidget=true;phase="widgetPresent";if(timer!==null)env.clearTimeout(timer);render();syncAnimation();}
      });
      doc.addEventListener("visibilitychange",syncAnimation);reduced.addEventListener?.("change",()=>{render();syncAnimation();});
      env.addEventListener?.("resize",()=>{if(canvas)draw(canvas,rotation,env.devicePixelRatio);});
      if(env.ResizeObserver)new env.ResizeObserver(()=>{if(canvas)draw(canvas,rotation,env.devicePixelRatio);}).observe(root);
      if(env.IntersectionObserver)new env.IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);syncAnimation();},{threshold:0.05}).observe(root);
      if(env.MutationObserver)new env.MutationObserver(render).observe(doc.documentElement,{attributes:true,attributeFilter:["lang"]});
      render();syncAnimation();
    }
    loadConfig();return {reload:loadConfig,get state(){return {phase,configured:Boolean(configured?.provider),hasWidget,paused,animationRunning:frame!==null};}};
  }
  return {validateConfig,widgetDocument,widgetBootstrap,publicPage,configURL,canAnimate,project,draw,mount};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=JobHubVisitorGlobe;
else if(typeof document!=="undefined")JobHubVisitorGlobe.mount({document,location,fetch:window.fetch.bind(window),scriptURL:document.currentScript?.src||new URL("./visitor-globe.js",location.href).href,matchMedia:window.matchMedia?.bind(window),requestAnimationFrame:window.requestAnimationFrame?.bind(window),cancelAnimationFrame:window.cancelAnimationFrame?.bind(window),setTimeout:window.setTimeout.bind(window),clearTimeout:window.clearTimeout.bind(window),addEventListener:window.addEventListener.bind(window),MutationObserver:window.MutationObserver,IntersectionObserver:window.IntersectionObserver,ResizeObserver:window.ResizeObserver,devicePixelRatio:window.devicePixelRatio});
