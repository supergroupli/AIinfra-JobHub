'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Blob } = require('node:buffer');
const model = require('../web/hiring/hiring-model.js');
const html = fs.readFileSync(path.join(__dirname, '../web/hiring/index.html'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../web/hiring/hiring.js'), 'utf8');

function storeFixture() {
  const entries = new Map();
  return { entries, fail: false, getItem(key) { if (this.fail) throw new Error('Storage unavailable'); return entries.get(key) || null; }, setItem(key, value) { if (this.fail) throw new Error('Storage unavailable'); entries.set(key, value); } };
}
function mount(store, search = '') {
  const ids = new Map(), translated = [], copied = [], downloads = [], blobs = new Map();
  const location = new URL('https://example.test/AIinfra-JobHub/hiring/' + search);
  let document;
  function node(tag = 'div') {
    let ownText = '', id = ''; const handlers = new Map(), attributes = new Map();
    const item = {
      tagName: tag.toUpperCase(), dataset: {}, children: [], value: '', disabled: false, hidden: false,
      get id() { return id; }, set id(value) { id = value; ids.set(value, this); },
      get textContent() { return ownText + this.children.map(child => child.textContent).join(''); },
      set textContent(value) { ownText = String(value); this.children = []; },
      set innerHTML(value) { throw new Error('Unsafe innerHTML: ' + value); },
      append(...children) { children.forEach(child => { this.children.push(child); child.parent = this; }); },
      replaceChildren(...children) { this.children = []; ownText = ''; this.append(...children); },
      setAttribute(name, value) { attributes.set(name, value); }, getAttribute(name) { return attributes.get(name) || null; },
      addEventListener(name, callback) { if (!handlers.has(name)) handlers.set(name, []); handlers.get(name).push(callback); },
      async emit(name, target = this) { for (const callback of handlers.get(name) || []) await callback({ target, preventDefault() {} }); },
      async click() { if (this.tagName === 'A' && this.download) downloads.push({ filename: this.download, blob: blobs.get(this.href) }); await this.emit('click'); },
      remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); },
      focus() { document.activeElement = this; }, select() { this.selected = true; }, closest() { return this.parent || this; }
    };
    return item;
  }
  for (const match of html.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) { const item = node(match[1]); item.id = match[2]; const href = /\bhref="([^"]+)"/.exec(match[0]); if (href) item.href = href[1]; }
  for (const match of html.matchAll(/data-i18n="([^"]+)"/g)) { const item = node(); item.dataset.i18n = match[1]; translated.push(item); }
  document = { documentElement: {}, body: node('body'), getElementById(id) { assert.ok(ids.has(id), 'Unknown ID: ' + id); return ids.get(id); }, createElement: node, querySelectorAll(selector) { assert.equal(selector, '[data-i18n]'); return translated; } };
  class DownloadURL extends URL { static createObjectURL(blob) { const id = 'blob:hiring-' + blobs.size; blobs.set(id, blob); return id; } static revokeObjectURL(id) { blobs.delete(id); } }
  const context = { document, localStorage: store, URL: DownloadURL, URLSearchParams, Blob, setTimeout() {}, navigator: { clipboard: { async writeText(value) { copied.push(value); } } } };
  context.window = { HiringModel: model, location, localStorage: store, history: { replaceState(_state, _title, next) { location.href = String(next); } } };
  vm.runInNewContext(source, context, { timeout: 1000 });
  return { ids, copied, downloads, translated, location, document,
    async edit(id, value) { const input = ids.get('hiring-' + id); input.value = value; await ids.get('hiring-form').emit('input', input); },
    async click(id) { await ids.get(id).click(); },
    markdown() { return ids.get('hiring-source').value; },
    async import(value) { ids.get('hiring-import-source').value = value; await ids.get('hiring-import-source').emit('input'); await ids.get('hiring-import-preview').click(); }
  };
}

test('hiring backup roundtrips all fields and rejects unsupported or corrupt records', () => {
  const draft = model.blank(); draft.company = '元智引擎'; draft.problem = '第一行\n真实问题'; draft.kind = 'internship';
  assert.deepEqual(model.parse(model.serialize(draft)), draft);
  for (const source of ['null', '{}', '{bad', JSON.stringify({ format: model.FORMAT, version: 2, fields: draft }), JSON.stringify({ format: model.FORMAT, version: 1, fields: { role: 10 } }), JSON.stringify({ format: model.FORMAT, version: 1, fields: { kind: 'invented' } }), '{"format":"jobhub-hiring-backup","version":1,"fields":{"__proto__":{"polluted":true}}}', ' '.repeat(model.MAX_BYTES + 1)]) assert.throws(() => model.parse(source));
  assert.throws(() => model.serialize({ ...draft, company: 'x'.repeat(2001) }));
  assert.equal({}.polluted, undefined);
});

test('hiring merge fills blanks only and leaves both source drafts intact', () => {
  const local = { ...model.blank(), role: 'Existing role', company: 'Local company' };
  const incoming = { ...model.blank(), role: 'Other role', compensation: 'Confirmed range', currency: 'USD' };
  const before = JSON.stringify({ local, incoming }), merged = model.merge(local, incoming);
  assert.equal(merged.fields.role, 'Existing role'); assert.equal(merged.fields.compensation, 'Confirmed range');
  assert.deepEqual(merged.added, ['compensation', 'currency']); assert.deepEqual(merged.kept, ['role']);
  assert.equal(JSON.stringify({ local, incoming }), before);
});

test('hiring completeness highlights eligibility, compensation and junior support without inventing terms', () => {
  const draft = model.blank(), today = new Date(2026, 10, 14);
  for (const id of ['compensation', 'currency', 'payPeriod', 'eligibility', 'juniorSupport', 'applicationUrl']) assert.ok(model.completeness(draft, today).missing.includes(id));
  draft.payPeriod = 'unpaid'; assert.ok(!model.completeness(draft, today).missing.includes('currency')); assert.ok(model.completeness(draft, today).missing.includes('compensation'));
  draft.expiry = '2026-11-14'; assert.ok(model.completeness(draft, today).invalid.includes('expiry'));
  assert.equal(model.dateStatus('2026-11-15', today), true); assert.equal(model.dateStatus('2027-02-12', today), true); assert.equal(model.dateStatus('2027-02-13', today), false); assert.equal(model.dateStatus('2027-02-30', today), false);
  const md = model.markdown(model.blank(), 'en', today); assert.ok(md.includes('TODO')); assert.ok(md.includes('Compensation range')); assert.ok(md.includes('Work authorization')); assert.ok(!md.includes('100k'));
});

test('hiring exports escape Markdown and HTML and reject unsafe application URLs', () => {
  const draft = { ...model.blank(), company: '<script>alert(1)</script>', problem: '[click](javascript:alert(1))\n# Fake heading\n![x](https://tracker.example/a)', applicationUrl: 'javascript:alert(1)' };
  const md = model.markdown(draft, 'en');
  assert.ok(!md.includes('<script>')); assert.ok(!md.includes('[click](')); assert.ok(!md.includes('\n# Fake heading')); assert.ok(!md.includes('![x](')); assert.ok(md.includes('Needs correction'));
  for (const url of ['http://example.com', 'https://user:pass@example.com', '//evil.test', 'https://a.test\\@evil.test', 'https://a.test/\nfoo', 'https://a.test/ x']) assert.equal(model.safeHTTPS(url), null);
  draft.applicationUrl = 'https://example.com/jobs/(infra)?q=1';
  assert.ok(model.markdown(draft, 'en').includes('(https://example.com/jobs/%28infra%29?q=1)'));
  assert.equal(new URL(model.PUBLIC_FORM).search, '?template=01-job.yml');
});

test('hiring prompts are bilingual and reference existing project and course routes', () => {
  const projects = require('../web/projects/projects.json').projects;
  assert.equal(model.templates.length, 3);
  for (const item of model.templates) {
    for (const lang of ['zh', 'en']) { assert.ok(item.title[lang]); assert.ok(item.work[lang]); for (const question of item.interviews) assert.ok(question[lang]); }
    for (const link of item.links) {
      const url = new URL(link.href, 'https://example.test/hiring/');
      if (url.pathname === '/projects/') assert.ok(projects.some(project => project.id === url.searchParams.get('project')));
      else { const course = url.pathname.split('/')[2]; assert.ok(fs.existsSync(path.join(__dirname, '../content/courses', course + '.json')), course); }
    }
  }
});

test('actual hiring UI restores drafts, switches language, and changes prompts without overwriting input', async () => {
  const store = storeFixture(), page = mount(store, '?lang=en');
  await page.edit('company', 'Private company'); await page.edit('role', 'My actual role'); await page.edit('problem', 'Line 1\n第二行');
  const saved = store.entries.get(model.STORAGE_KEY);
  page.ids.get('hiring-template').value = 'performance'; await page.ids.get('hiring-template').emit('change');
  assert.equal(store.entries.get(model.STORAGE_KEY), saved); assert.equal(page.ids.get('hiring-role').value, 'My actual role');
  assert.match(page.ids.get('hiring-prompt-content').textContent, /kernel/);
  await page.click('hiring-language'); assert.equal(page.document.documentElement.lang, 'zh-CN'); assert.equal(page.location.searchParams.get('lang'), 'zh');
  assert.equal(store.entries.get(model.STORAGE_KEY), saved); assert.ok(page.translated.every(item => item.textContent && item.textContent !== 'undefined'));
  const reopened = mount(store, page.location.search); assert.equal(reopened.ids.get('hiring-role').value, 'My actual role'); assert.equal(reopened.ids.get('hiring-problem').value, 'Line 1\n第二行');
  assert.match(reopened.ids.get('hiring-save-status').textContent, /已恢复/);
  assert.equal(page.ids.get('hiring-public-form').href, model.PUBLIC_FORM); assert.ok(!page.ids.get('hiring-public-form').href.includes('Private'));
  await page.click('hiring-copy'); assert.equal(page.copied[0], page.markdown());
  await page.click('hiring-backup-download'); assert.equal(model.parse(await page.downloads[0].blob.text()).role, 'My actual role');
});

test('actual hiring UI validates import and requires explicit confirmation, keeping current fields', async () => {
  const store = storeFixture(), page = mount(store);
  await page.edit('role', 'Keep this'); const original = store.entries.get(model.STORAGE_KEY);
  await page.import(model.serialize({ ...model.blank(), role: 'Do not replace', company: 'Incoming company' }));
  assert.equal(store.entries.get(model.STORAGE_KEY), original); assert.equal(page.ids.get('hiring-company').value, ''); assert.equal(page.ids.get('hiring-import-confirm').disabled, false);
  assert.match(page.ids.get('hiring-import-result').textContent, /Incoming company/);
  await page.click('hiring-import-confirm'); assert.equal(page.ids.get('hiring-company').value, 'Incoming company'); assert.equal(page.ids.get('hiring-role').value, 'Keep this');
  const confirmed = store.entries.get(model.STORAGE_KEY); await page.import('{"format":"other"}'); assert.equal(page.ids.get('hiring-import-confirm').disabled, true); assert.equal(store.entries.get(model.STORAGE_KEY), confirmed); assert.match(page.ids.get('hiring-import-status').textContent, /无法导入/);
  await page.import(model.serialize({ ...model.blank(), compensation: '100–120' })); await page.edit('currency', 'USD'); assert.equal(page.ids.get('hiring-import-confirm').disabled, true); await page.click('hiring-import-confirm'); assert.equal(page.ids.get('hiring-compensation').value, '');
});

test('actual hiring UI keeps unsaved edits and allows backup when localStorage fails', async () => {
  const store = storeFixture(), page = mount(store); await page.edit('role', 'Old role'); store.fail = true;
  await page.edit('role', 'Unsaved role'); assert.equal(page.ids.get('hiring-role').value, 'Unsaved role'); assert.match(page.ids.get('hiring-save-status').textContent, /保存失败/);
  await page.click('hiring-language'); assert.match(page.ids.get('hiring-save-status').textContent, /Local save failed/); assert.equal(page.ids.get('hiring-role').value, 'Unsaved role');
  await page.click('hiring-backup-download'); assert.equal(model.parse(await page.downloads[0].blob.text()).role, 'Unsaved role');
  store.fail = false; await page.click('hiring-save'); assert.equal(model.parse(store.entries.get(model.STORAGE_KEY)).role, 'Unsaved role');
  store.entries.set(model.STORAGE_KEY, '{broken'); const reopened = mount(store, '?lang=en'); assert.match(reopened.ids.get('hiring-save-status').textContent, /could not be read/); assert.equal(store.entries.get(model.STORAGE_KEY), '{broken');
});
