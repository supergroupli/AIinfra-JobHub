"use strict";
const CareerModel = (() => {
  const roles = ["inference-engineer", "performance-engineer", "platform-engineer"];
  const bi = value => value && ["zh", "en"].every(lang => typeof value[lang] === "string" && value[lang].trim());
  function validate(data) {
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.roles) || data.roles.length !== roles.length) throw new Error("Invalid career schema");
    if (new Set(data.roles.map(r => r.id)).size !== roles.length) throw new Error("Duplicate career role");
    for (const role of data.roles) {
      if (!roles.includes(role.id) || !/^[a-z0-9-]+$/.test(role.project) || ![role.title,role.capstone,role.summary,role.scope,role.bad].every(bi)) throw new Error("Invalid role");
      if (!["zh", "en"].every(lang => [role.skills?.[lang],role.critique?.[lang]].every(v => Array.isArray(v) && v.length >= 3 && v.every(x=>typeof x === "string" && x.trim())))) throw new Error("Invalid bilingual list");
      if (!Array.isArray(role.days) || role.days.length !== 7) throw new Error("Seven days required");
      role.days.forEach((d,i) => { if (d.day !== i+1 || ![d.title,d.action,d.artifact,d.check].every(bi) || !/^[a-z0-9-]+$/.test(d.course) || !Number.isInteger(d.lesson) || d.lesson<1 || d.lesson>10) throw new Error("Invalid career day"); });
      if (!Array.isArray(role.rubric) || role.rubric.length !== 3 || role.rubric.map(r=>r.id).join() !== "basic,independent,reproduced") throw new Error("Invalid rubric levels");
      for (const r of role.rubric) if (!bi(r.title) || !Array.isArray(r.items) || r.items.length < 3 || !r.items.every(bi)) throw new Error("Invalid rubric");
      if (!Array.isArray(role.good) || role.good.length<5 || !role.good.every(f=>bi(f.label)&&bi(f.value))) throw new Error("Incomplete example");
    }
    return data;
  }
  const keys = role => [...role.days.map(d=>`day:${d.day}`), ...role.rubric.flatMap(r=>r.items.map((_,i)=>`${r.id}:${i}`))];
  function normalize(saved, data) {
    const result = {};
    for (const role of data.roles) {
      const allowed = new Set(keys(role));
      result[role.id] = Array.isArray(saved?.[role.id]) ? [...new Set(saved[role.id].filter(k=>typeof k === "string" && allowed.has(k)))] : [];
    }
    return result;
  }
  function markdown(role, selected, language = "zh") {
    const lang = language === "en" ? "en" : "zh", en = lang === "en", p = value => value[lang];
    const done = new Set(Array.isArray(selected) ? selected : []), check = (key,text) => `- [${done.has(key)?"x":" "}] ${text}`;
    const out = [`# ${p(role.title)} — ${en?"Career preparation":"作品与求职准备"}`, "", en?"Self-reported checks, not certification or independent review. A seven-day preparation plan, not an employment promise.":"勾选为个人自述，不是认证或独立评审结果。7天是准备计划，不是就业承诺。", "", p(role.scope), "", `## ${en?"Seven-day plan":"7天准备路线"}`, ""];
    for (const d of role.days) out.push(`### Day ${d.day} · ${p(d.title)}`, "", p(d.action), "", `${en?"Deliver":"交付"}: ${p(d.artifact)}`, check(`day:${d.day}`,p(d.check)), `https://supergroupli.github.io/AIinfra-JobHub/learn/${d.course}/?lang=${lang}#day-${d.lesson}`, "");
    out.push(`## ${en?"Capstone":"结课项目"} · ${p(role.capstone)}`, "", p(role.summary), "");
    for (const r of role.rubric) { out.push(`### ${p(r.title)}`, ""); r.items.forEach((x,i)=>out.push(check(`${r.id}:${i}`,p(x)))); out.push(""); }
    out.push(`## ${en?"My evidence — fill this yourself":"我的证据 — 请自己填写"}`, "", en?"- Source commit and environment: TODO\n- My change and tests: TODO\n- Raw results and their evidence type: TODO\n- Failed or inconclusive outcome: TODO\n- Independent reviewer and actual record (leave pending if none): TODO\n- Remaining gaps for the chosen role: TODO":"- 源码commit与环境：待填\n- 本人改动与测试：待填\n- 原始结果与证据类别：待填\n- 失败或没有结论的结果：待填\n- 独立评审者及实际记录（没有则保持待评审）：待填\n- 目标岗位仍缺少的能力：待填", "", `## ${en?"Teaching example — NOT your work or real measurements":"教学示例 — 不是你的成果或真实测量"}`, "");
    for (const f of role.good) out.push(`### ${p(f.label)}`, "", p(f.value), "");
    out.push(`### ${en?"Example needing revision":"需要修改的示例"}`, "", p(role.bad), "", ...role.critique[lang].map(x=>`- ${x}`), "", `## ${en?"Continue":"下一步"}`, "", `https://supergroupli.github.io/AIinfra-JobHub/projects/?project=${role.project}&lang=${lang}`, `https://supergroupli.github.io/AIinfra-JobHub/portfolio/?project=${role.project}&lang=${lang}`, "");
    return out.join("\n");
  }
  return {roles,validate,keys,normalize,markdown};
})();
if (typeof module !== "undefined" && module.exports) module.exports = CareerModel;
