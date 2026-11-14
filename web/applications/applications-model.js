"use strict";
const ApplicationsModel = (() => {
  const STORAGE_KEY = "infra-commons:applications-v1";
  const FORMAT = "jobhub-applications", MAX_RECORDS = 100, MAX_BYTES = 4 * 1024 * 1024;
  const statuses = ["planned", "applied", "interview", "offer", "closed"];
  const fields = ["id", "company", "role", "url", "status", "appliedAt", "nextAt", "notes"];
  const fail = code => { throw new Error(code); };
  const plain = value => value !== null && typeof value === "object" && !Array.isArray(value);
  function date(value) {
    if (typeof value !== "string") return false;
    if (value === "") return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y,m,d] = value.split("-").map(Number);
    if (y < 1900 || y > 9999 || m < 1 || m > 12 || d < 1) return false;
    return d <= new Date(Date.UTC(y,m,0)).getUTCDate();
  }
  function today(now = new Date()) {
    return [now.getFullYear(), String(now.getMonth()+1).padStart(2,"0"), String(now.getDate()).padStart(2,"0")].join("-");
  }
  function https(value) {
    if (typeof value !== "string" || value.length > 2000) fail("url");
    if (!value) return "";
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password || /[\u0000-\u0020\u007f]/.test(value)) fail("url");
      if (parsed.href.length > 2000) fail("url");
      return parsed.href;
    } catch (_) { return fail("url"); }
  }
  function record(value) {
    if (!plain(value) || Object.keys(value).length !== fields.length || !fields.every(k=>Object.hasOwn(value,k))) fail("record");
    if (typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value.id)) fail("id");
    const result = {};
    for (const [key,max,required] of [["company",120,true],["role",160,true],["notes",4000,false]]) {
      if (typeof value[key] !== "string" || value[key].length > max || (required && !value[key].trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value[key])) fail(key);
      result[key] = value[key];
    }
    if (!statuses.includes(value.status)) fail("status");
    if (!date(value.appliedAt) || !date(value.nextAt)) fail("date");
    return {id:value.id,company:result.company,role:result.role,url:https(value.url),status:value.status,appliedAt:value.appliedAt,nextAt:value.nextAt,notes:result.notes};
  }
  function records(value) {
    if (!Array.isArray(value) || value.length > MAX_RECORDS) fail("limit");
    const result = value.map(record);
    if (new Set(result.map(r=>r.id)).size !== result.length) fail("duplicate");
    return result;
  }
  function parse(text) {
    if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_BYTES) fail("size");
    let data;
    try { data = JSON.parse(text); } catch (_) { return fail("json"); }
    if (!plain(data) || data.format !== FORMAT || data.version !== 1 || Object.keys(data).sort().join() !== "format,records,version") fail("version");
    return records(data.records);
  }
  const backup = list => JSON.stringify({format:FORMAT,version:1,records:records(list)},null,2);
  function merge(local, incoming) {
    const existing = records(local), additions = records(incoming), ids = new Set(existing.map(r=>r.id));
    const added = additions.filter(r=>!ids.has(r.id));
    if (existing.length + added.length > MAX_RECORDS) fail("limit");
    return {records:[...existing,...added],added:added.length,conflicts:additions.length-added.length};
  }
  function upsert(list, value) {
    const result = records(list), validated = record(value), index = result.findIndex(r=>r.id===validated.id);
    if (index === -1) result.push(validated); else result[index] = validated;
    return records(result);
  }
  const remove = (list,id) => records(list).filter(r=>r.id!==id);
  const due = (r, localDate = today()) => date(localDate) && localDate !== "" && r.status !== "closed" && r.nextAt !== "" && r.nextAt <= localDate;
  function markdown(list, language = "zh") {
    const en = language === "en";
    // Escape punctuation before entity-encoding brackets: input can never form HTML or Markdown links.
    const safe = value => value.replace(/\\/g,"\\\\").replace(/[\`*_{}\[\]()#+.!|\-]/g,"\\$&").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\r?\n/g,"\n    ");
    const out = [en?"# My application drafts":"# 我的投递草稿","",en?"Private draft. Do not publish personal notes. No automatic applications, emails, reminders or cloud sync.":"个人草稿，请勿公开个人笔记。没有自动投递、邮件发送、提醒或云同步。",""];
    const status = en ? {planned:"Planned",applied:"Applied",interview:"Interview",offer:"Offer",closed:"Closed"} : {planned:"待投递",applied:"已投递",interview:"面试中",offer:"收到 Offer",closed:"已结束"};
    for (const r of records(list)) {
      out.push(`## ${safe(r.company)} · ${safe(r.role)}`,"",`${en?"Status":"状态"}: ${status[r.status]}`,`${en?"Application date":"投递日期"}: ${r.appliedAt || "—"}`,`${en?"Next step date":"下一步日期"}: ${r.nextAt || "—"}`);
      // Encode Markdown delimiters even when URL's parser leaves them unescaped.
      if (r.url) out.push(`${en?"Official URL (user supplied)":"官方链接（用户填写，未核验）"}: <${r.url.replace(/[<>\\`\s]/g,c=>encodeURIComponent(c))}>`);
      out.push("",safe(r.notes),"");
    }
    return out.join("\n");
  }
  function createStore(storage) {
    let list = [], error = "", blocked = false;
    try { const saved = storage.getItem(STORAGE_KEY); if (saved !== null) list = parse(saved); }
    catch (_) { error = "load"; blocked = true; }
    function persist() {
      if (blocked) { error = "load"; return false; }
      try { storage.setItem(STORAGE_KEY,backup(list)); error = ""; return true; }
      catch (_) { error = "save"; return false; }
    }
    return {
      get records() { return list.map(r=>({...r})); }, get error() { return error; }, get blocked() { return blocked; },
      set(next) { list = records(next); return persist(); },
      retry(replaceUnreadable = false) { if (replaceUnreadable) blocked = false; return persist(); }
    };
  }
  return {STORAGE_KEY,FORMAT,MAX_RECORDS,MAX_BYTES,statuses,date,today,https,record,records,parse,backup,merge,upsert,remove,due,markdown,createStore};
})();
if (typeof module !== "undefined" && module.exports) module.exports = ApplicationsModel;
