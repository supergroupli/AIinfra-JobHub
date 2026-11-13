"use strict";

// Exercise the actual browser script with a small DOM/storage substitute.
// The checks focus on retaining user data and exporting it safely.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Blob } = require("node:buffer");
const sourcePath = path.join(__dirname, "..", "web", "portfolio", "portfolio.js");
const source = readFileSync(sourcePath, "utf8");
const html = readFileSync(path.join(__dirname, "..", "web", "portfolio", "index.html"), "utf8");
const draftKey = "infra-commons:portfolio-draft-v1";

function storageFixture() {
  const records = new Map();
  const failedKeys = new Set();
  return {
    records,
    failedKeys,
    localStorage: {
      getItem(key) { return records.get(key) ?? null; },
      setItem(key, value) {
        if (failedKeys.has(key)) throw new Error("Storage unavailable");
        records.set(key, value);
      }
    },
    draft() { return JSON.parse(records.get(draftKey)); }
  };
}

function mountPortfolio(store, { search = "", fetchCatalog, clipboardFailure = false } = {}) {
  const location = new URL(`https://example.test/portfolio/${search}`);
  const ids = new Map();
  const fields = new Map();
  const copied = [];
  const downloads = [];
  const blobs = new Map();
  const requests = [];
  let document;

  function element(tag = "div", dataset = {}) {
    const listeners = new Map();
    const attributes = new Map();
    let ownText = "";
    const item = {
      tagName: tag.toUpperCase(), dataset, children: [], value: "", hidden: false,
      disabled: true, open: false, selected: false, parent: null,
      get textContent() { return ownText + this.children.map(child => child.textContent).join(""); },
      set textContent(value) { ownText = String(value); this.children = []; },
      set innerHTML(_value) { throw new Error("User content must never be rendered as HTML"); },
      append(child) { this.children.push(child); child.parent = this; },
      replaceChildren() { this.children = []; ownText = ""; },
      setAttribute(name, value) { attributes.set(name, value); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      addEventListener(name, callback) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(callback);
      },
      async emit(name) {
        await Promise.all((listeners.get(name) ?? []).map(callback => callback({ target: this, preventDefault() {} })));
      },
      async click() {
        if (this.tagName === "A" && this.download) downloads.push({ filename: this.download, blob: blobs.get(this.href) });
        await this.emit("click");
      },
      remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); },
      focus() { document.activeElement = this; },
      select() { this.selected = true; }
    };
    return item;
  }

  // Derive the known controls from the page, so new fields participate in
  // save/restore tests without a second hand-maintained form definition.
  for (const match of html.matchAll(/<(input|textarea|select)\b[^>]*data-field="([^"]+)"[^>]*>/g)) {
    const id = /\bid="([^"]+)"/.exec(match[0])[1];
    const field = element(match[1], { field: match[2] });
    fields.set(match[2], field);
    ids.set(id, field);
  }
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
    if (!ids.has(match[1])) ids.set(match[1], element());
  }
  const translated = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(match => element("span", { i18n: match[1] }));
  document = {
    documentElement: {}, title: "", activeElement: null, body: element("body"),
    getElementById(id) { assert.ok(ids.has(id), `Unexpected DOM id: ${id}`); return ids.get(id); },
    querySelectorAll(selector) {
      if (selector === "[data-field]") return [...fields.values()];
      if (selector === "[data-i18n]") return translated;
      throw new Error(`Unexpected selector: ${selector}`);
    },
    createElement(tag) { return element(tag); }
  };
  class DownloadURL extends URL {
    static createObjectURL(blob) {
      const url = `blob:portfolio-${blobs.size + 1}`;
      blobs.set(url, blob);
      return url;
    }
    static revokeObjectURL(url) { blobs.delete(url); }
  }
  const context = vm.createContext({
    document, location, URL: DownloadURL, URLSearchParams, Blob, AbortController,
    history: { replaceState(_state, _title, url) { location.href = String(url); } },
    localStorage: store.localStorage,
    navigator: { clipboard: { async writeText(value) { if (clipboardFailure) throw new Error("Clipboard denied"); copied.push(value); } } },
    fetch(url, options) {
      requests.push({ url, options });
      return fetchCatalog ? fetchCatalog() : Promise.reject(new Error("Offline"));
    },
    setTimeout() { return 1; },
    clearTimeout() {}
  });
  new vm.Script(source, { filename: sourcePath }).runInContext(context, { timeout: 1000 });
  return {
    ids, fields, copied, downloads, requests, document, location,
    async edit(name, value) {
      assert.ok(fields.has(name), `Unknown form field: ${name}`);
      fields.get(name).value = value;
      await ids.get("portfolio-form").emit("input");
    },
    async click(id) { await ids.get(id).click(); },
    markdown() { return ids.get("markdown-source").value; },
    preview() { return ids.get("portfolio-preview").textContent; },
    async settle() { await new Promise(resolve => setImmediate(resolve)); }
  };
}

test("portfolio edits restore verbatim after reload and language changes never modify them", async () => {
  const store = storageFixture();
  store.records.set("infra-commons:language", JSON.stringify("zh"));
  const page = mountPortfolio(store, { search: "?lang=en&from=projects" });
  assert.equal(page.document.documentElement.lang, "en", "A shared URL takes precedence over the saved language");
  const record = {
    projectTitle: "Mooncake 实验 / Version 1",
    targetRole: "推理系统工程师", evidenceType: "simulated", recordDate: "2026-10-08",
    problem: "第一行\nSecond line", contribution: "我写的调度模拟器；上游提供传输实现。",
    environment: "Python 3.12.7; planned hardware: CPU", method: "基线 A 与 B；5 次重复。",
    evidenceLinks: "https://example.org/raw_results/run_1.json", results: "模拟结果，不是集群实测。",
    limitations: "未验证 RDMA。", nextSteps: "在真实环境复现。", repository: "https://github.com/example/infra_project"
  };
  for (const [key, value] of Object.entries(record)) await page.edit(key, value);
  assert.deepEqual(store.draft().fields, record);
  await page.click("portfolio-language");
  assert.equal(JSON.parse(store.records.get("infra-commons:language")), "zh");
  assert.equal(page.location.searchParams.has("lang"), false);
  assert.equal(page.location.searchParams.get("from"), "projects");
  assert.deepEqual(store.draft().fields, record);

  const reopened = mountPortfolio(store, { search: page.location.search });
  for (const [key, value] of Object.entries(record)) assert.equal(reopened.fields.get(key).value, value);
  assert.equal(reopened.document.documentElement.lang, "zh-CN", "Reload keeps the learner's new choice");
  assert.match(reopened.ids.get("draft-status").textContent, /已恢复/);
  assert.match(reopened.markdown(), /模拟/);
  assert.match(reopened.markdown(), /<https:\/\/example\.org\/raw_results\/run_1\.json>/);
  assert.match(reopened.markdown(), /2026-10-08/);

  store.records.set("infra-commons:language", JSON.stringify("en"));
  const chineseLink = mountPortfolio(store, { search: "?lang=zh" });
  assert.equal(chineseLink.document.documentElement.lang, "zh-CN");
  assert.deepEqual(store.draft().fields, record);
});

test("a failed draft save retains current work, warns through language changes, and can export or retry", async () => {
  const store = storageFixture();
  const page = mountPortfolio(store);
  await page.edit("results", "Previously saved measurement");
  store.failedKeys.add(draftKey);
  await page.edit("results", "New measurement: 12 ms, not yet persisted");
  assert.equal(store.draft().fields.results, "Previously saved measurement");
  assert.equal(page.fields.get("results").value, "New measurement: 12 ms, not yet persisted");
  assert.match(page.ids.get("draft-status").textContent, /无法保存/);

  await page.click("portfolio-language");
  assert.match(page.ids.get("draft-status").textContent, /could not be saved/);
  await page.click("copy-markdown");
  assert.match(page.copied[0], /New measurement: 12 ms, not yet persisted/);
  await page.click("download-markdown");
  assert.equal(page.downloads.length, 1);
  assert.equal(await page.downloads[0].blob.text(), page.copied[0]);

  store.failedKeys.delete(draftKey);
  await page.click("save-draft");
  assert.equal(store.draft().fields.results, "New measurement: 12 ms, not yet persisted");
  assert.match(page.ids.get("draft-status").textContent, /Saved in this browser/);
});

test("preview treats hostile text as text and export includes only valid HTTPS links", async () => {
  const store = storageFixture();
  const page = mountPortfolio(store);
  const hostile = '<img src=x onerror="alert(1)"> [click](javascript:alert(2))';
  await page.edit("problem", hostile);
  await page.edit("repository", "javascript:alert(3)");
  await page.edit("evidenceLinks", "https://example.org/result.csv\nhttp://example.org/insecure\njavascript:alert(4)\nhttps://user:secret@example.org/private");
  assert.ok(page.preview().includes(hostile));
  assert.match(page.markdown(), /\\<img/);
  assert.doesNotMatch(page.markdown(), /(^|[^\\])<img/);
  assert.ok(!page.markdown().includes("[click](javascript:"));
  assert.match(page.markdown(), /<https:\/\/example\.org\/result\.csv>/);
  assert.ok(!page.markdown().includes("javascript:alert(3)"));
  assert.ok(!page.markdown().includes("http://example.org/insecure"));
  assert.ok(!page.markdown().includes("user:secret"));
  assert.equal(page.ids.get("repository-error").hidden, false);
  assert.equal(page.ids.get("evidence-links-error").hidden, false);
  // Invalid links remain editable instead of silently disappearing from a draft.
  assert.equal(store.draft().fields.repository, "javascript:alert(3)");
});

test("clipboard failure exposes selectable Markdown without losing data", async () => {
  const page = mountPortfolio(storageFixture(), { clipboardFailure: true });
  await page.edit("contribution", "A reproducible result worth keeping");
  await page.click("copy-markdown");
  assert.equal(page.ids.get("markdown-details").open, true);
  assert.equal(page.ids.get("markdown-source").selected, true);
  assert.equal(page.document.activeElement, page.ids.get("markdown-source"));
  assert.match(page.markdown(), /A reproducible result worth keeping/);
  assert.match(page.ids.get("export-status").textContent, /手动复制/);
});

test("late project hints never overwrite a restored draft or edits made during fetch", async () => {
  const store = storageFixture();
  const existing = mountPortfolio(store);
  await existing.edit("projectTitle", "My existing draft");
  let respond;
  const pending = new Promise(resolve => { respond = resolve; });
  const page = mountPortfolio(store, { search: "?project=vllm-cache", fetchCatalog: () => pending });
  await page.edit("problem", "A new idea written while loading");
  const before = store.records.get(draftKey);
  respond({ ok: true, async json() { return { projects: [{ id: "vllm-cache", title: { zh: "外部项目建议" }, summary: { zh: "项目目标" }, deliverables: { zh: ["原始日志"] }, evidenceBoundary: { zh: "不代表生产结果" } }] }; } });
  await page.settle();
  assert.equal(page.fields.get("projectTitle").value, "My existing draft");
  assert.equal(page.fields.get("problem").value, "A new idea written while loading");
  assert.equal(store.records.get(draftKey), before);
  assert.equal(page.ids.get("project-context-title").textContent, "外部项目建议");
  assert.equal(page.ids.get("project-context").hidden, false);
  assert.equal(page.requests[0].url, "../projects/projects.json");
});

test("a failed project fetch still permits editing and a complete Markdown download", async () => {
  const store = storageFixture();
  const page = mountPortfolio(store, { search: "?project=unknown" });
  await page.settle();
  assert.equal(page.ids.get("project-context").hidden, true);
  assert.match(page.ids.get("project-load-status").textContent, /仍可独立编辑和导出/);
  await page.edit("projectTitle", "Independent work");
  await page.edit("evidenceType", "design");
  await page.edit("nextSteps", "Run the planned baseline");
  await page.click("download-markdown");
  assert.equal(page.downloads[0].filename, "Independent-work.md");
  const exported = await page.downloads[0].blob.text();
  assert.match(exported, /设计 · 尚未执行/);
  assert.match(exported, /Run the planned baseline/);
  assert.match(exported, /未记录/);
  assert.equal(store.draft().fields.projectTitle, "Independent work");
});
