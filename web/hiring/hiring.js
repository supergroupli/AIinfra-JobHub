(function () {
  'use strict';
  const model = window.HiringModel;
  const $ = id => document.getElementById(id);
  const copy = {
    zh: {
      skip: '跳到岗位表单', navLearn: '学习库', navProjects: '项目实战', navTalent: '发现人才', back: '← 工作与合作', title: '把岗位写清楚，让合适的人看见。', intro: '从真实工程问题出发，写清必须技能、作品证据、薪资和雇佣边界。给候选人足够的信息，也让团队更早对齐。', step1: '写实际要做的事', step2: '补齐候选人关心的条件', step3: '核对后，由你提交',
      privacy: '草稿仅保存在本浏览器，不上传、不自动发布，也不为候选人打分。清除浏览器数据会丢失草稿，请下载 JSON 备份。工具不会验证公司身份或保证招聘结果。', promptsTitle: '用工程问题，明确岗位。', templateLabel: '选择参考方向', promptsNote: '以下仅为讨论提示，不会写入或覆盖草稿，不代表团队已有成果、工资或真实岗位。面试问题用于讨论工程过程。', editorTitle: '整理岗位需求', privateDraft: '本地草稿', requiredNote: '标有 * 的字段用于提交前检查。尚未确认可留空，预览会明确标为待补充。', save: '保存 / 重试', previewTitle: '候选人看到的岗位', live: '实时预览', checkNote: '只检查是否填写与格式，不核验内容。薪资、资格和新人支持需要由发布者确认。', copy: '复制 Markdown', download: '下载 .md ↓', sourceTitle: '查看源文 / 手动复制', sourceLabel: '可选择并复制的 Markdown', backupTitle: '备份与恢复', backupDownload: '下载 JSON 备份', backupNote: '导入只补充当前草稿中的空白字段；已有内容优先保留。先查看校验与合并预览，再确认应用。文件只在本地读取。', importTitle: '导入备份', importFile: '选择 JSON 文件（最多 1 MiB）', importSource: '或粘贴聘枢岗位 JSON 备份', importPreview: '校验并预览合并', importConfirm: '确认补充空白字段', publishTitle: '内容核实后，再公开。', publishNote: '先复制准备稿，确认你有权代表公司。下方仅打开空白 GitHub 结构化表单，草稿不会加入链接或自动提交。请按字段粘贴并核对；Issue 提交后立即公开，网站收录还需维护者审核。不要提交私人简历或保密数据。', publishLink: '打开 GitHub 职位表单 ↗', footer: '聘枢 · AI Infra JobHub。项目发起人：李超群｜所属公司：元智引擎公司。', talentLink: '发现人才与作品 ↗', choose: '请选择；未确认可留空', workPrompt: '工作问题提示', interviews: '面试讨论提示', missing: '待补充', optional: '未填写（可选）', unpaid: '不适用（无薪）', fix: '待修正', checkComplete: '必需字段已填写 · 仍需人工核实', checkCount: '项需要补充或修正', empty: '尚未填写。编辑时自动保存，切换语言不会更改输入。', saved: '已保存在本浏览器。请下载 JSON 备份以防浏览器数据被清除。', restored: '已恢复本浏览器中的岗位草稿。', saveError: '本地保存失败。当前输入仍在页面中，请立即下载 JSON 备份；也可点击“保存 / 重试”。', loadError: '未能读取或校验本地草稿。原存储没有被覆盖；请检查之前下载的备份，或在继续编辑前保存原存储。', copied: '已复制 Markdown。公开前请再次核对。', copyError: '自动复制不可用。下方已展开源文，请选择后手动复制。', downloaded: '已发起 Markdown 下载；请确认浏览器已保存文件。', backupDownloaded: '已发起 JSON 备份下载；请确认浏览器已保存文件。', downloadError: '无法下载。请复制下方 Markdown；JSON 备份可从已展开的备份文本框复制保存。', importInvalid: '无法导入：请使用版本 1 的聘枢岗位 JSON 备份（≤ 1 MiB），检查字段名、文本类型与选项；当前草稿未更改。', importStale: '草稿或导入内容已变化，请重新校验并预览。', importNone: '没有可补充的空白字段；当前草稿保持不变。', importDone: '已补充空白字段，原有内容保留。请检查岗位预览。', importAdd: '将补充', importKeep: '保留当前内容', importValue: '待补入的内容', importNote: '确认后仅补入以下空白字段；本次尚未更改草稿。', fileError: '无法读取文件，或文件超过 1 MiB。当前草稿未更改。', pageTitle: '岗位需求工作台 · 聘枢 AI Infra JobHub', linkError: '格式无效：请填写不含账号密码的 HTTPS 链接。', dateError: '日期无效：请选择明天至未来 90 天内的真实日期。'
    },
    en: {
      skip: 'Skip to hiring form', navLearn: 'Learn', navProjects: 'Projects', navTalent: 'Find talent', back: '← Work and collaboration', title: 'Define the work. Help the right people find it.', intro: 'Start with real engineering problems. Make required skills, portfolio evidence, pay and hiring restrictions explicit, so candidates and your team can make informed decisions.', step1: 'Describe the actual work', step2: 'Clarify candidate essentials', step3: 'Review, then submit yourself',
      privacy: 'Drafts stay in this browser. Nothing is uploaded or published automatically, and candidates are not scored. Clearing browser data deletes drafts; download a JSON backup. This tool does not verify companies or guarantee hires.', promptsTitle: 'Define a role through engineering problems.', templateLabel: 'Choose a reference direction', promptsNote: 'These are discussion prompts only. They never fill or overwrite your draft and do not represent actual results, pay or vacancies. Interview prompts support conversations about engineering work.', editorTitle: 'Describe your hiring needs', privateDraft: 'Local draft', requiredNote: 'Fields marked * are checked before submission. Leave unconfirmed terms blank; the preview marks them as TODO.', save: 'Save / retry', previewTitle: 'The candidate’s view', live: 'Live preview', checkNote: 'Checks only presence and format, not truth. The author must confirm pay, eligibility and junior support.', copy: 'Copy Markdown', download: 'Download .md ↓', sourceTitle: 'View source / copy manually', sourceLabel: 'Selectable Markdown source', backupTitle: 'Back up and restore', backupDownload: 'Download JSON backup', backupNote: 'Import fills empty fields only and keeps existing draft content. Review validation and the merge preview before confirming. Files are read locally.', importTitle: 'Import a backup', importFile: 'Choose a JSON file (up to 1 MiB)', importSource: 'Or paste a JobHub hiring JSON backup', importPreview: 'Validate and preview merge', importConfirm: 'Confirm filling empty fields', publishTitle: 'Verify the details before sharing.', publishNote: 'Copy your draft and confirm you are authorized to represent the company. The link opens a blank structured GitHub form; your draft is never put in its URL or submitted automatically. Paste into the appropriate fields and review. The issue becomes public immediately upon submission; website listing also requires maintainer review. Do not include private resumes or confidential data.', publishLink: 'Open GitHub opportunity form ↗', footer: 'AI Infra JobHub · Founded by Li Chaoqun, 元智引擎公司.', talentLink: 'Discover people and portfolios ↗', choose: 'Choose, or leave unconfirmed', workPrompt: 'Work problem prompts', interviews: 'Interview discussion prompts', missing: 'TODO', optional: 'Not supplied (optional)', unpaid: 'Not applicable (unpaid)', fix: 'Needs correction', checkComplete: 'Required fields supplied · verify manually', checkCount: 'items to complete or correct', empty: 'No draft yet. Edits save automatically; switching language preserves your input.', saved: 'Saved in this browser. Download a JSON backup in case browser data is cleared.', restored: 'Restored the hiring draft from this browser.', saveError: 'Local save failed. Your input is still on this page. Download a JSON backup now, or use “Save / retry”.', loadError: 'The local draft could not be read or validated. Existing storage was not overwritten. Check a previous backup or preserve the stored data before editing.', copied: 'Markdown copied. Review it before sharing publicly.', copyError: 'Automatic copying is unavailable. The source is expanded below; select and copy it manually.', downloaded: 'Markdown download requested. Check that your browser saved the file.', backupDownloaded: 'JSON backup download requested. Check that your browser saved the file.', downloadError: 'Download unavailable. Copy the Markdown below; JSON backup text is available in the expanded backup text field.', importInvalid: 'Import rejected. Use a version 1 JobHub hiring JSON backup (≤ 1 MiB) with valid field names, text values and options. The draft is unchanged.', importStale: 'The draft or import text changed. Validate and preview again.', importNone: 'No empty fields to fill. Your current draft stays unchanged.', importDone: 'Empty fields filled; existing content kept. Review the hiring preview.', importAdd: 'Will fill', importKeep: 'Keep current content', importValue: 'Incoming content', importNote: 'Only the empty fields below will be filled after confirmation. The draft has not changed yet.', fileError: 'The file could not be read, or exceeds 1 MiB. The draft is unchanged.', pageTitle: 'Hiring brief · AI Infra JobHub', linkError: 'Invalid format: use an HTTPS URL without embedded credentials.', dateError: 'Invalid date: choose a real date 1–90 days from today.'
    }
  };
  let lang = 'zh', draft = model.blank(), template = 'inference', pendingImport = null, fileRevision = 0, saveMessage = 'empty';
  try { const stored = JSON.parse(localStorage.getItem('infra-commons:language') || 'null'); if (stored === 'en' || stored === 'zh') lang = stored; } catch (_) { /* The draft status explains storage failures. */ }
  const queryLanguage = new URLSearchParams(window.location.search).get('lang');
  if (queryLanguage === 'en' || queryLanguage === 'zh') lang = queryLanguage;
  const text = key => copy[lang][key];
  function element(tag, value, className) { const node = document.createElement(tag); if (value !== undefined) node.textContent = value; if (className) node.className = className; return node; }
  function status(id, key, error = false) { $(id).textContent = text(key); $(id).dataset.error = String(error); }
  function storage() { return window.localStorage; }
  function persist() {
    let result;
    try { result = model.save(storage(), draft); } catch (_) { result = { ok: false }; }
    saveMessage = result.ok ? 'saved' : 'saveError';
    status('hiring-save-status', saveMessage, !result.ok);
  }
  function renderForm() {
    const form = $('hiring-form'); form.replaceChildren();
    for (const [section, title] of Object.entries(model.sections)) {
      const group = element('fieldset'); group.append(element('legend', title[lang]));
      for (const field of model.fields.filter(item => item.section === section)) {
        const wrapper = element('div', undefined, 'hiring-field');
        const label = element('label', field.label[lang] + (field.required ? ' *' : '')); label.htmlFor = 'hiring-' + field.id;
        const input = element(field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input');
        input.id = 'hiring-' + field.id; input.name = field.id; input.dataset.field = field.id;
        if (field.type === 'select') {
          const blankOption = element('option', text('choose')); blankOption.value = ''; input.append(blankOption);
          for (const value of field.options) { const option = element('option', model.options[value][lang]); option.value = value; input.append(option); }
        } else { if (field.type !== 'textarea') input.type = field.type; else input.rows = 3; input.maxLength = field.maxLength; }
        if (field.type === 'url') { input.inputMode = 'url'; input.spellcheck = false; input.placeholder = 'https://…'; }
        input.value = draft[field.id];
        wrapper.append(label, input);
        if (model.hints[field.id]) { const hint = element('p', model.hints[field.id][lang], 'hiring-hint'); hint.id = 'hint-' + field.id; input.setAttribute('aria-describedby', hint.id); wrapper.append(hint); }
        if (field.type === 'url' || field.type === 'date') { const error = element('p', '', 'hiring-status'); error.id = 'error-' + field.id; error.hidden = true; error.dataset.error = 'true'; wrapper.append(error); input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), error.id].filter(Boolean).join(' ')); }
        group.append(wrapper);
      }
      form.append(group);
    }
  }
  function renderPrompt() {
    const record = model.templates.find(item => item.id === template);
    const target = $('hiring-prompt-content'); target.replaceChildren();
    const grid = element('div', undefined, 'hiring-prompt-grid'), work = element('div'), questions = element('div');
    work.append(element('h3', text('workPrompt')), element('p', record.work[lang]));
    const list = element('ol'); record.interviews.forEach(question => list.append(element('li', question[lang])));
    questions.append(element('h3', text('interviews')), list); grid.append(work, questions);
    const links = element('div', undefined, 'hiring-reference-links');
    record.links.forEach(reference => { const link = element('a', reference.title[lang] + ' ↗'); const url = new URL(reference.href, window.location.href); url.searchParams.set('lang', lang); link.href = url.href; links.append(link); });
    target.append(grid, links);
  }
  function renderPreview() {
    const check = model.completeness(draft), count = check.missing.length + check.invalid.length;
    $('hiring-check-summary').textContent = count ? count + ' ' + text('checkCount') : text('checkComplete');
    const list = $('hiring-missing'); list.replaceChildren();
    for (const kind of ['missing', 'invalid']) for (const id of check[kind]) {
      const item = element('li'), link = element('a', (kind === 'invalid' ? text('fix') + ': ' : '') + model.fields.find(field => field.id === id).label[lang]);
      link.href = '#hiring-' + id; item.append(link); list.append(item);
    }
    for (const field of model.fields.filter(item => item.type === 'url' || item.type === 'date')) {
      const invalid = check.invalid.includes(field.id), input = $('hiring-' + field.id), error = $('error-' + field.id);
      input.setAttribute('aria-invalid', String(invalid)); error.hidden = !invalid; error.textContent = invalid ? text(field.type === 'date' ? 'dateError' : 'linkError') : '';
    }
    const preview = $('hiring-preview'); preview.replaceChildren();
    for (const [section, label] of Object.entries(model.sections)) {
      preview.append(element('h3', label[lang])); const terms = element('dl');
      for (const field of model.fields.filter(item => item.section === section)) {
        const raw = draft[field.id].trim(); const labelNode = element('dt', field.label[lang]);
        const value = element('dd', undefined, raw ? '' : 'is-empty');
        if (raw && field.type === 'url' && model.safeHTTPS(raw)) { const link = element('a', raw); link.href = model.safeHTTPS(raw); link.target = '_blank'; link.rel = 'noopener noreferrer'; value.append(link); }
        else value.textContent = raw ? (check.invalid.includes(field.id) ? text('fix') + ': ' : '') + model.display(field, raw, lang) : field.id === 'currency' && draft.payPeriod === 'unpaid' ? text('unpaid') : text(field.required ? 'missing' : 'optional');
        terms.append(labelNode, value);
      }
      preview.append(terms);
    }
    $('hiring-source').value = model.markdown(draft, lang);
  }
  function invalidateImport() {
    if (pendingImport) status('hiring-import-status', 'importStale');
    pendingImport = null; $('hiring-import-confirm').disabled = true; $('hiring-import-result').replaceChildren();
  }
  function renderLanguage() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'; document.title = text('pageTitle');
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = text(node.dataset.i18n); });
    $('hiring-language').textContent = lang === 'en' ? '中文 ↗' : 'EN ↗'; $('hiring-language').setAttribute('aria-label', lang === 'en' ? '切换到中文' : 'Switch to English');
    const select = $('hiring-template'); select.replaceChildren();
    model.templates.forEach(item => { const option = element('option', item.title[lang]); option.value = item.id; select.append(option); }); select.value = template;
    renderForm(); renderPrompt(); renderPreview();
    status('hiring-save-status', saveMessage, saveMessage === 'saveError' || saveMessage === 'loadError');
    $('hiring-export-status').textContent = ''; $('hiring-import-status').textContent = ''; invalidateImport();
  }
  function previewImport() {
    invalidateImport();
    try {
      const incoming = model.parse($('hiring-import-source').value), merged = model.merge(draft, incoming);
      pendingImport = incoming;
      const target = $('hiring-import-result'); target.append(element('p', text('importNote'), 'hiring-hint'));
      for (const kind of ['added', 'kept']) for (const id of merged[kind]) {
        const row = element('div', undefined, 'hiring-import-row'), field = model.fields.find(item => item.id === id);
        row.append(element('strong', text(kind === 'added' ? 'importAdd' : 'importKeep') + ': ' + field.label[lang]));
        row.append(element('p', model.display(field, kind === 'added' ? incoming[id] : draft[id], lang))); target.append(row);
      }
      $('hiring-import-confirm').disabled = !merged.added.length;
      if (!merged.added.length) status('hiring-import-status', 'importNone'); else $('hiring-import-status').textContent = merged.added.length + ' ' + text('importAdd') + ' · ' + merged.kept.length + ' ' + text('importKeep');
    } catch (_) { pendingImport = null; status('hiring-import-status', 'importInvalid', true); }
  }
  function download(content, filename, mime, success) {
    let url;
    try { url = URL.createObjectURL(new Blob([content], { type: mime })); const link = element('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); status('hiring-export-status', success); }
    catch (_) { if (url) URL.revokeObjectURL(url); $('hiring-source-details').open = true; $('hiring-import-source').value = model.serialize(draft); $('hiring-import-source').closest('details').open = true; invalidateImport(); status('hiring-export-status', 'downloadError', true); }
  }
  try { const restored = model.load(storage()); draft = restored.fields; saveMessage = restored.error ? 'loadError' : restored.restored ? 'restored' : 'empty'; } catch (_) { saveMessage = 'loadError'; }
  renderLanguage();
  $('hiring-form').addEventListener('submit', event => event.preventDefault());
  $('hiring-form').addEventListener('input', event => {
    const id = event.target.dataset.field;
    if (!model.fields.some(field => field.id === id)) return;
    draft[id] = event.target.value; invalidateImport(); renderPreview(); persist();
  });
  $('hiring-template').addEventListener('change', event => { template = event.target.value; renderPrompt(); });
  $('hiring-language').addEventListener('click', () => {
    lang = lang === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem('infra-commons:language', JSON.stringify(lang)); } catch (_) { /* Draft save status remains separate. */ }
    try { const url = new URL(window.location.href); url.searchParams.set('lang', lang); window.history.replaceState(null, '', url); } catch (_) { /* Language still switches when history is unavailable. */ }
    renderLanguage();
  });
  $('hiring-save').addEventListener('click', persist);
  $('hiring-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(model.markdown(draft, lang)); status('hiring-export-status', 'copied'); }
    catch (_) { $('hiring-source-details').open = true; $('hiring-source').focus(); $('hiring-source').select(); status('hiring-export-status', 'copyError', true); }
  });
  $('hiring-download').addEventListener('click', () => download(model.markdown(draft, lang), 'jobhub-hiring-brief.md', 'text/markdown;charset=utf-8', 'downloaded'));
  $('hiring-backup-download').addEventListener('click', () => download(model.serialize(draft), 'jobhub-hiring-backup.json', 'application/json;charset=utf-8', 'backupDownloaded'));
  $('hiring-import-source').addEventListener('input', () => { fileRevision += 1; invalidateImport(); });
  $('hiring-import-preview').addEventListener('click', previewImport);
  $('hiring-import-confirm').addEventListener('click', () => {
    if (!pendingImport) return;
    draft = model.merge(draft, pendingImport).fields; invalidateImport(); renderForm(); renderPreview(); persist(); status('hiring-import-status', 'importDone');
  });
  $('hiring-import-file').addEventListener('change', async event => {
    const revision = ++fileRevision, file = event.target.files[0]; invalidateImport(); if (!file) return;
    if (file.size > model.MAX_BYTES) { status('hiring-import-status', 'fileError', true); return; }
    try { const source = await file.text(); if (revision !== fileRevision) return; $('hiring-import-source').value = source; previewImport(); }
    catch (_) { if (revision === fileRevision) status('hiring-import-status', 'fileError', true); }
  });
}());
