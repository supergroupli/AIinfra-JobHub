(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HiringModel = factory();
}(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const FORMAT = 'jobhub-hiring-backup';
  const STORAGE_KEY = 'infra-commons:hiring-brief-v1';
  const PUBLIC_FORM = 'https://github.com/supergroupli/AIinfra-JobHub/issues/new?template=01-job.yml';
  const MAX_BYTES = 1024 * 1024;
  const pair = (zh, en) => ({ zh, en });
  const fields = [
    ['company', 'identity', '公司 / 项目名称', 'Company / project', true],
    ['companyUrl', 'identity', '官方网站 HTTPS 链接', 'Official website (HTTPS)', true, 'url'],
    ['role', 'identity', '岗位名称', 'Role title', true],
    ['experience', 'identity', '经验要求与可接受的替代证据', 'Experience requirements and alternative evidence', true, 'textarea'],
    ['kind', 'identity', '机会类型', 'Opportunity type', true, 'select', ['full-time', 'internship', 'contract', 'research', 'open-source']],
    ['technologies', 'work', '涉及的技术方向', 'Technologies involved', true],
    ['problem', 'work', '实际要解决的工作问题', 'Real problem to solve', true, 'textarea'],
    ['responsibilities', 'work', '职责与入职后的工作范围', 'Responsibilities and initial scope', true, 'textarea'],
    ['mustHave', 'evidence', '必须技能：注明最低要求', 'Required skills: specify the minimum', true, 'textarea'],
    ['niceToHave', 'evidence', '加分技能：不作为硬性门槛', 'Optional skills: not hard requirements', false, 'textarea'],
    ['evidence', 'evidence', '希望看到的作品与能力证据', 'Useful portfolio and ability evidence', true, 'textarea'],
    ['juniorSupport', 'evidence', '实习 / 应届支持与指导安排', 'Intern / graduate eligibility and mentorship', true, 'textarea'],
    ['arrangement', 'location', '协作方式', 'Work arrangement', true, 'select', ['remote-global', 'remote-regional', 'hybrid', 'onsite']],
    ['location', 'location', '工作地点与可雇佣国家 / 地区', 'Work location and eligible countries / regions', true, 'textarea'],
    ['eligibility', 'location', '工作许可 / 签证支持 / 雇佣限制', 'Work authorization / sponsorship / hiring restrictions', true, 'textarea'],
    ['language', 'location', '工作语言与沟通要求', 'Working languages and communication', true],
    ['timezone', 'location', '时区与重叠时段', 'Timezone and overlap window', true],
    ['hours', 'location', '每周工时 / 实习周期 / 值班要求', 'Weekly hours / internship duration / on-call', true],
    ['compensation', 'pay', '薪资范围或明确的无薪说明', 'Compensation range or explicit unpaid statement', true],
    ['currency', 'pay', '薪资币种', 'Currency', true],
    ['payPeriod', 'pay', '计薪周期', 'Pay period', true, 'select', ['year', 'month', 'day', 'hour', 'project', 'unpaid']],
    ['applicationUrl', 'apply', '官方 HTTPS 申请入口', 'Official HTTPS application URL', true, 'url'],
    ['expiry', 'apply', '展示截止日期（最长 90 天）', 'Listing expiry (within 90 days)', true, 'date']
  ].map(([id, section, zh, en, required, type = 'text', options]) => ({ id, section, label: pair(zh, en), required, type, options, maxLength: type === 'textarea' ? 12000 : 2000 }));
  const sections = {
    identity: pair('岗位身份与资格', 'Role and eligibility'), work: pair('从真实问题开始', 'Start from the work'), evidence: pair('技能、作品与新人支持', 'Skills, evidence and junior support'),
    location: pair('地区、资格与协作时间', 'Location, authorization and hours'), pay: pair('写清报酬', 'Be explicit about compensation'), apply: pair('申请与有效期', 'Application and expiry')
  };
  const options = {
    'full-time': pair('全职', 'Full-time'), internship: pair('实习', 'Internship'), contract: pair('合同合作', 'Contract'), research: pair('研究', 'Research'), 'open-source': pair('开源合作', 'Open-source'),
    'remote-global': pair('远程 · 全球', 'Remote · global'), 'remote-regional': pair('远程 · 指定地区', 'Remote · regional'), hybrid: pair('混合办公', 'Hybrid'), onsite: pair('现场办公', 'Onsite'),
    year: pair('每年', 'Per year'), month: pair('每月', 'Per month'), day: pair('每天', 'Per day'), hour: pair('每小时', 'Per hour'), project: pair('按项目', 'Per project'), unpaid: pair('无薪合作', 'Unpaid')
  };
  const hints = {
    companyUrl: pair('附可核验的官方来源；本工具不会核验你是否有权代表该公司。', 'Use a verifiable official source; this tool does not verify your authority to represent the company.'),
    experience: pair('区分必须条件与偏好。说明是否接受课程项目、开源贡献或实习作为证据。', 'Separate requirements from preferences. State whether course projects, open-source work or internships count as evidence.'),
    technologies: pair('例如 vLLM、SGLang、NCCL。只写岗位实际涉及的技术。', 'For example vLLM, SGLang, NCCL. Include technologies actually used in the role.'),
    mustHave: pair('写能做什么及工作所需的最低程度；不要把整个技术生态都列为必须。', 'Describe what someone must be able to do and the minimum needed for the work.'),
    evidence: pair('说明需要哪些可复核记录，以及是否接受无 GPU 的模拟项目。不要要求公开保密数据。', 'Name auditable artifacts and whether CPU simulations are accepted. Do not request confidential data.'),
    juniorSupport: pair('明确是否接受实习生 / 应届生、导师安排与入职任务；不接受也请明确写出。', 'State whether interns / graduates are eligible, mentorship and initial tasks. State explicitly if they are not eligible.'),
    location: pair('远程不代表全球可雇佣。列出实际可签约的国家 / 地区。', 'Remote does not imply worldwide hiring. List the countries / regions where you can hire.'),
    eligibility: pair('写明工作许可、签证支持、在校生限制等。尚未确认请写待确认。', 'State work authorization, sponsorship and student restrictions. Mark unresolved items as pending.'),
    timezone: pair('注明时区及必需重叠时段，不只写“灵活”。', 'Specify a timezone and required overlap hours, rather than only “flexible”.'),
    compensation: pair('填写已确认范围、税前 / 税后及奖金边界；未知就留待补充，不由工具估算。', 'Use a confirmed range and clarify gross / net pay and bonuses. Leave unknown terms pending; the tool does not estimate pay.'),
    currency: pair('使用明确币种，例如 CNY / USD。无薪合作可留空。', 'Use a clear currency such as CNY / USD. May be blank for unpaid work.'),
    applicationUrl: pair('仅接受不含账号密码的 HTTPS 链接；请自行核实是官方入口。', 'Use an HTTPS URL without embedded credentials. Verify the official destination yourself.'),
    expiry: pair('需晚于今天，且不超过 90 天；到期后重新核实岗位。', 'Use a date 1–90 days from today. Reconfirm the opportunity when it expires.')
  };
  const templates = [
    {
      id: 'inference', title: pair('推理服务工程师', 'Inference engineer'),
      work: pair('要支持什么模型和请求形态？延迟、吞吐、成本中哪个约束优先？当前痛点在排队、KV cache、调度还是发布流程？请填入团队的真实场景。', 'Which models and request shapes matter? Which latency, throughput or cost constraint takes priority? Is the current issue queueing, KV cache, scheduling or rollout? Supply your team’s actual context.'),
      interviews: [pair('如何定义 TTFT、端到端延迟和失败率的测量口径？', 'How would you define measurement boundaries for TTFT, end-to-end latency and failure rate?'), pair('长短请求混合时，你会保留哪些原始证据来分析排队与资源瓶颈？', 'What raw evidence would you keep to investigate queueing and resource constraints under mixed request lengths?'), pair('一个优化只改善平均值却恶化尾延迟，你会怎样检查与回退？', 'How would you investigate and roll back a change that improves the mean but worsens tail latency?')],
      links: [{ href: '../projects/?project=serving-baseline', title: pair('项目：推理服务基线', 'Project: serving baseline') }, { href: '../learn/vllm/', title: pair('学习：vLLM', 'Course: vLLM') }, { href: '../learn/sglang/', title: pair('学习：SGLang', 'Course: SGLang') }]
    },
    {
      id: 'performance', title: pair('性能工程师', 'Performance engineer'),
      work: pair('要分析哪条性能路径？硬件、精度、输入尺寸和基线如何固定？需要候选人解释瓶颈、实现优化还是建立评测方法？不要把提示里的问题当成已有成果。', 'Which performance path needs attention? How will hardware, precision, input shapes and baselines be fixed? Should the hire explain bottlenecks, implement changes or build evaluation methods? These prompts are not achieved results.'),
      interviews: [pair('如何区分计算、内存和通信瓶颈？你会先收集什么证据？', 'How would you distinguish compute, memory and communication bottlenecks? What evidence would you collect first?'), pair('比较两个 kernel 前，怎样验证数值正确性与测量可重复性？', 'Before comparing two kernels, how would you check numerical correctness and repeatability?'), pair('单卡收益没有扩展到多卡时，你会怎样设计下一轮对照实验？', 'If a single-GPU gain does not scale to multiple GPUs, how would you design the next controlled experiment?')],
      links: [{ href: '../projects/?project=vllm-cache', title: pair('项目：缓存实验', 'Project: cache experiment') }, { href: '../learn/triton/', title: pair('学习：Triton', 'Course: Triton') }, { href: '../learn/nccl/', title: pair('学习：NCCL', 'Course: NCCL') }]
    },
    {
      id: 'platform', title: pair('AI 平台工程师', 'AI platform engineer'),
      work: pair('团队服务哪些用户和作业？当前最需要解决的是资源配额、失败恢复、可观测性还是部署？明确值班、权限边界和可接受的入职学习时间。', 'Who uses the platform and which jobs run on it? Is the priority quotas, failure recovery, observability or deployment? Clarify on-call duties, permission boundaries and onboarding time.'),
      interviews: [pair('一个任务反复重试但始终失败时，如何避免重试放大故障？', 'How would you prevent retries from amplifying an incident when a job keeps failing?'), pair('GPU 资源紧张时，怎样让排队与配额策略可观察、可解释？', 'When GPUs are scarce, how would you make queueing and quota decisions observable and explainable?'), pair('设计一次安全的故障演练，你会如何限定影响范围、验收与回退？', 'How would you bound, evaluate and roll back a safe failure drill?')],
      links: [{ href: '../projects/?project=ray-backpressure', title: pair('项目：背压与失败处理', 'Project: backpressure and failures') }, { href: '../learn/kubernetes/', title: pair('学习：Kubernetes', 'Course: Kubernetes') }, { href: '../learn/ray/', title: pair('学习：Ray', 'Course: Ray') }]
    }
  ];
  const known = new Set(fields.map(field => field.id));
  function blank() { return Object.fromEntries(fields.map(field => [field.id, ''])); }
  function record(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function validateDraft(value) {
    if (!record(value)) throw new Error('fields');
    if (Object.keys(value).some(key => !known.has(key))) throw new Error('unknown-field');
    const result = blank();
    for (const field of fields) {
      if (!Object.prototype.hasOwnProperty.call(value, field.id)) continue;
      const item = value[field.id];
      if (typeof item !== 'string' || item.length > field.maxLength || /\u0000/.test(item)) throw new Error('invalid-field');
      if (field.options && item && !field.options.includes(item)) throw new Error('invalid-option');
      result[field.id] = item;
    }
    return result;
  }
  function serialize(draft) { return JSON.stringify({ format: FORMAT, version: 1, fields: validateDraft(draft) }, null, 2); }
  function parse(source) {
    if (typeof source !== 'string' || new TextEncoder().encode(source).length > MAX_BYTES) throw new Error('size');
    const value = JSON.parse(source);
    if (!record(value) || value.format !== FORMAT || value.version !== 1 || Object.keys(value).some(key => !['format', 'version', 'fields'].includes(key))) throw new Error('format');
    return validateDraft(value.fields);
  }
  function merge(current, incoming) {
    const result = validateDraft(current), other = validateDraft(incoming);
    const added = [], kept = [];
    for (const field of fields) {
      if (!other[field.id].trim()) continue;
      if (result[field.id].trim()) { kept.push(field.id); continue; }
      result[field.id] = other[field.id]; added.push(field.id);
    }
    return { fields: result, added, kept };
  }
  function load(storage) {
    try { const saved = storage.getItem(STORAGE_KEY); return { fields: saved ? parse(saved) : blank(), restored: !!saved, error: null }; }
    catch (error) { return { fields: blank(), restored: false, error }; }
  }
  function save(storage, draft) {
    try { storage.setItem(STORAGE_KEY, serialize(draft)); return { ok: true }; }
    catch (error) { return { ok: false, error }; }
  }
  function safeHTTPS(value) {
    if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f]/.test(value) || !/^https:\/\//i.test(value)) return null;
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url.href : null; } catch (_) { return null; }
  }
  function dateStatus(value, today = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const time = Date.parse(value + 'T00:00:00Z');
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return false;
    const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const delta = (time - start) / 86400000;
    return delta > 0 && delta <= 90;
  }
  function completeness(draft, today) {
    const value = validateDraft(draft), missing = [], invalid = [];
    for (const field of fields) {
      if (field.id === 'currency' && value.payPeriod === 'unpaid') continue;
      if (field.required && !value[field.id].trim()) missing.push(field.id);
      else if (value[field.id].trim() && ((field.type === 'url' && !safeHTTPS(value[field.id])) || (field.type === 'date' && !dateStatus(value[field.id], today)))) invalid.push(field.id);
    }
    return { missing, invalid };
  }
  function escapeMarkdown(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_{}\[\]()#+.!|~\-]/g, '\\$&');
  }
  function display(field, value, lang) { return field.options && options[value] ? options[value][lang] : value; }
  function markdown(draft, lang = 'zh', today) {
    lang = lang === 'en' ? 'en' : 'zh';
    const value = validateDraft(draft), status = completeness(value, today);
    const t = (zh, en) => lang === 'en' ? en : zh;
    const lines = ['# ' + t('岗位需求草稿', 'Hiring brief draft'), '', t('由发布者填写，尚未发布或核验；请核对所有条件后自行提交。', 'Written by the author; not published or verified. Review all terms before submitting yourself.'), ''];
    for (const [id, label] of Object.entries(sections)) {
      lines.push('## ' + label[lang], '');
      for (const field of fields.filter(item => item.section === id)) {
        let item = value[field.id].trim();
        if (!item && field.id === 'currency' && value.payPeriod === 'unpaid') item = t('不适用（无薪）', 'Not applicable (unpaid)');
        else if (!item) item = field.required ? t('待补充', 'TODO') : t('未填写（可选）', 'Not supplied (optional)');
        let rendered = escapeMarkdown(display(field, item, lang));
        if (field.type === 'url' && safeHTTPS(item)) rendered = '[' + escapeMarkdown(item) + '](' + safeHTTPS(item).replace(/[()]/g, character => character === '(' ? '%28' : '%29') + ')';
        if (status.invalid.includes(field.id)) rendered = t('待修正：', 'Needs correction: ') + rendered;
        lines.push('### ' + field.label[lang], '', rendered, '');
      }
    }
    lines.push('## ' + t('提交前待补项', 'Before submission'), '');
    for (const id of status.missing) lines.push('- [ ] ' + t('待补充：', 'TODO: ') + fields.find(field => field.id === id).label[lang]);
    for (const id of status.invalid) lines.push('- [ ] ' + t('待修正：', 'Fix: ') + fields.find(field => field.id === id).label[lang]);
    if (!status.missing.length && !status.invalid.length) lines.push(t('必需字段已填写；这不代表内容已核实或能保证招到人。', 'Required fields are supplied. This does not verify the content or guarantee a hire.'));
    lines.push('', t('公开表单（由你自行填写并提交；Issue 提交后立即公开）：', 'Public form (complete and submit yourself; the issue becomes public immediately):'), PUBLIC_FORM, '');
    return lines.join('\n');
  }
  return { FORMAT, STORAGE_KEY, PUBLIC_FORM, MAX_BYTES, fields, sections, options, hints, templates, blank, validateDraft, serialize, parse, merge, load, save, safeHTTPS, dateStatus, completeness, escapeMarkdown, display, markdown };
}));
