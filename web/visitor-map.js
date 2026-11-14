"use strict";
const JobHubVisitorMap = (() => {
  function validateConfig(value) {
    const fail = () => { throw Error("Invalid visitor map configuration"); };
    if (!value || value.version !== 1 || Object.keys(value).sort().join() !== "imageUrl,provider,statsUrl,version") return fail();
    if (value.provider === null) {
      if (value.imageUrl !== null || value.statsUrl !== null) return fail();
      return value;
    }
    if (value.provider !== "mapmyvisitors") return fail();
    function official(text, path) {
      if (typeof text !== "string" || text.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(text)) return fail();
      const url = new URL(text);
      if (url.origin !== "https://mapmyvisitors.com" || url.username || url.password || url.hash || !path.test(url.pathname)) return fail();
      return url;
    }
    const image = official(value.imageUrl, /^\/map\.png$/), stats = official(value.statsUrl, /^\/web\/[A-Za-z0-9_-]{1,80}\/?$/);
    if (stats.search || !/^[A-Za-z0-9_-]{12,200}$/.test(image.searchParams.get("d") || "")) return fail();
    const seen = new Set();
    for (const [key, item] of image.searchParams) {
      if (seen.has(key) || !["d", "cl"].includes(key) || (key === "cl" && !/^[0-9a-f]{6}$/i.test(item))) return fail();
      seen.add(key);
    }
    return {version:1, provider:"mapmyvisitors", imageUrl:image.href, statsUrl:stats.href};
  }
  function publicPage(pathname) {
    return !pathname.split("/").some(part => {
      try { part = decodeURIComponent(part); } catch { return true; }
      return ["applications", "hiring", "portfolio", "search"].includes(part.toLowerCase());
    });
  }
  function configURL(scriptURL, pageURL) {
    const page = new URL(pageURL), script = new URL(scriptURL, page);
    if (script.origin !== page.origin) throw Error("Configuration must be local");
    return new URL("./visitor-map-config.json", script).href;
  }
  const copy = {
    zh: {eyebrow:"OUR GLOBAL COMMUNITY",title:"看看，大家从哪里来。",intro:"每一次访问，都是一次与 AI Infra 社区的连接。地图由 MapMyVisitors 提供，点击可查看访问量与国家 / 地区分布。",stats:"查看国家 / 地区统计 ↗",retry:"重新加载地图",loading:"正在加载访客分布地图…",loaded:"访客地图已加载，点击地图查看完整统计。",error:"地图暂时无法加载。你仍可打开统计页，或稍后重试。",caption:"官方访客分布地图 · 点击查看详细统计",alt:"聘枢公开页面访客分布地图，由 MapMyVisitors 提供",scope:"统计已接入的公开页面访问，不等于在线人数或独立学员数。国家 / 地区为 IP 近似定位；地图更新可能有延迟。"},
    en: {eyebrow:"OUR GLOBAL COMMUNITY",title:"See where our visitors come from.",intro:"Every visit is a connection with the AI Infra community. MapMyVisitors provides this map; open it for visit totals and country / region statistics.",stats:"View country / region statistics ↗",retry:"Reload visitor map",loading:"Loading the visitor distribution map…",loaded:"Visitor map loaded. Open the map for full statistics.",error:"The map could not be loaded. You can still open the statistics page or try again later.",caption:"Official visitor distribution map · open for details",alt:"Map of visits to AI Infra JobHub public pages, provided by MapMyVisitors",scope:"Counts cover enabled public pages, not online users or unique learners. Countries / regions are approximate IP locations; map updates may be delayed."}
  };
  function mount(env) {
    const {document:doc, location} = env;
    if (!publicPage(location.pathname)) return null;
    const root = doc.getElementById("visitor-map");
    if (!root) {
      // The homepage already contains one real image. Other public pages use one counter.
      if (doc.getElementById("visitor-map-counter")) return null;
      const counter = doc.createElement("img");
      counter.id = "visitor-map-counter"; counter.width = 1; counter.height = 1;
      counter.alt = ""; counter.hidden = true; counter.referrerPolicy = "strict-origin-when-cross-origin";
      doc.body.append(counter);
      env.fetch(configURL(env.scriptURL, location.href), {cache:"no-cache", credentials:"same-origin"})
        .then(response => { if (!response.ok) throw Error("Configuration unavailable"); return response.json(); })
        .then(validateConfig).then(config => { if (config.provider) counter.src = config.imageUrl; }).catch(() => {});
      return null;
    }
    const get = id => doc.getElementById(id);
    let image = get("visitor-map-image"), phase = "loading", generation = 0, timer = null;
    const source = image.getAttribute("src");
    const t = key => copy[doc.documentElement.lang.startsWith("en") ? "en" : "zh"][key];
    function render() {
      root.querySelectorAll("[data-map-key]").forEach(el => { el.textContent = t(el.dataset.mapKey); });
      get("visitor-map-status").textContent = t(phase);
      get("visitor-map-retry").hidden = phase !== "error";
      get("visitor-map-error").hidden = phase !== "error";
      image.hidden = phase === "error"; image.alt = t("alt");
    }
    function watch(checkCached = true) {
      const current = ++generation;
      if (timer !== null) env.clearTimeout(timer);
      phase = "loading"; render();
      const result = success => {
        if (current !== generation) return;
        if (timer !== null) env.clearTimeout(timer);
        phase = success ? "loaded" : "error"; render();
      };
      image.addEventListener("load", () => result(image.naturalWidth > 1 && image.naturalHeight > 1));
      image.addEventListener("error", () => result(false));
      timer = env.setTimeout(() => result(false), 20000);
      if (checkCached && image.complete) result(image.naturalWidth > 1 && image.naturalHeight > 1);
    }
    get("visitor-map-retry").addEventListener("click", () => {
      const next = image.cloneNode(false);
      next.hidden = false; next.removeAttribute("src");
      image.replaceWith(next); image = next; watch(false); image.src = source;
    });
    if (env.MutationObserver) new env.MutationObserver(render).observe(doc.documentElement, {attributes:true,attributeFilter:["lang"]});
    watch();
    return {get state() {return phase;}};
  }
  return {validateConfig, publicPage, configURL, mount};
})();
if (typeof module !== "undefined" && module.exports) module.exports = JobHubVisitorMap;
else if (typeof document !== "undefined") JobHubVisitorMap.mount({document,location,scriptURL:document.currentScript.src,fetch:window.fetch.bind(window),setTimeout:window.setTimeout.bind(window),clearTimeout:window.clearTimeout.bind(window),MutationObserver:window.MutationObserver});
