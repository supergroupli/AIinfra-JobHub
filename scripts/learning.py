"""Static, bilingual learning documents. All submitted prose is escaped as text."""
import html
import json
import re
from urllib.parse import urlencode

if __package__:
    from .teaching_models import MODELS
else:
    from teaching_models import MODELS

PRIMER_EXAMPLES = {
    "primer-predict": ("纸上也能试。四句话里，“我”之后三次是“喜欢”，一次是“看见”。选出现最多的一块，第一步写出“我喜欢”。",
                       "Try it on paper. In four sentences, “I” is followed by “like” three times and “see” once. Choosing the most frequent next piece gives “I like”."),
    "primer-tokens": ("同样的“苹果汁”，一份小词表把它读成“苹果”“汁”，编号为 7、8。另一份收录了整词，一个编号 12 就能表示它。",
                      "One toy vocabulary reads “apple juice” as “apple” and “ juice”, with IDs 7 and 8. A vocabulary containing the whole phrase uses the single ID 12."),
    "primer-queue": ("纸上算一次。如果前面有 2 人、每人用 2 秒，自己每秒生成 1 块，回答共 3 块，那么第 5 秒看见首块，第 7 秒看见完整回答。",
                     "Work it out on paper. If two people ahead take two seconds each and your three pieces take one second each, the first appears at second 5 and the reply finishes at second 7.")
}
INTERACTIVE_KINDS = {"timeline", "kv-cache", "prefix-cache", *MODELS, *PRIMER_EXAMPLES}

CATEGORIES = {
    "foundations": {"zh": "系统基础", "en": "Foundations"},
    "inference": {"zh": "推理引擎", "en": "Inference"},
    "cache": {"zh": "缓存与数据", "en": "Cache & data"},
    "kernels": {"zh": "GPU 内核", "en": "GPU kernels"},
    "training": {"zh": "分布式训练", "en": "Distributed training"},
    "platform": {"zh": "平台与编排", "en": "Platform"},
    "communication": {"zh": "集合通信", "en": "Communication"},
}
LEVELS = {
    "beginner": {"zh": "入门", "en": "Beginner"},
    "intermediate": {"zh": "进阶", "en": "Intermediate"},
    "advanced": {"zh": "深入", "en": "Advanced"},
}

ENVIRONMENT_FIELDS = (
    ("reference", ("上游资料基线", "Upstream reference baseline")),
    ("minimum", ("必做实验环境", "Required lab environment")),
    ("verified", ("已验证范围", "Validated scope")),
    ("unverified", ("实机扩展与限制", "Hardware extensions and limits")),
)


def environment_card(course):
    environment = course.get("environment")
    if not environment:
        return ""
    return ('<aside class="course-environment">' +
            label("h2", "先确认版本与实验环境", "Check versions and lab environment") + '<dl>' +
            "".join('<div>' + label("dt", *title) + localized("dd", environment[key]) + '</div>'
                    for key, title in ENVIRONMENT_FIELDS) + '</dl></aside>')


def esc(value):
    return html.escape(str(value), quote=True)


def localized(tag, value, attrs=""):
    return f'<{tag} data-zh="{esc(value["zh"])}" data-en="{esc(value["en"])}" {attrs}>{esc(value["zh"])}</{tag}>'


def label(tag, zh, en, attrs=""):
    return localized(tag, {"zh": zh, "en": en}, attrs)


def source_links(resources):
    return '<ul class="reading-list">' + "".join(
        f'<li><a href="{esc(item["url"])}" target="_blank" rel="noopener noreferrer">{esc(item["title"])} <span aria-hidden="true">↗</span></a></li>'
        for item in resources
    ) + "</ul>"


def course_hero(course):
    ident = course["id"]
    days = len(course["steps"])
    if course.get("format") == "primer":
        return primer_hero(course)
    facts = [
        (("每天投入", "Daily commitment"), course["hoursPerDay"]),
        (("先修知识", "Prerequisites"), course["prerequisites"]),
        (("实践环境", "Hardware"), course["hardware"]),
        (("最终作品", "Final deliverable"), course["outcome"]),
    ]
    if course.get("curriculum"):
        facts.insert(0, (("课程定位", "Curriculum role"), course["curriculum"]["label"]))
    roles = {lang: " · ".join(course["roles"][lang]) for lang in ("zh", "en")}
    return (
        '<div class="breadcrumbs">' + label("a", "学习库", "Learning library", 'href="../../#learn"') +
        ' <span aria-hidden="true">/</span> ' + localized("span", course["title"]) + '</div>' +
        '<div class="course-kicker">' + localized("span", CATEGORIES[course["category"]]) + ' · ' +
        label("span", f"{days} 天实战学习", f"{days}-day practical guide") + ' · ' + localized("span", LEVELS[course["level"]]) + '</div>' +
        localized("h1", course["title"]) + localized("p", course["description"], 'class="course-summary"') +
        (label("a", "第一次听说模型推理？先用浏览器上一节启蒙课", "New to inference? Try the first lesson in your browser",
               'class="text-link" data-course-link href="../inference-101/#day-1"') if ident in ("foundations", "vllm") else "") +
        '<div class="course-facts">' + "".join('<div class="course-fact">' + label("small", *name) + localized("span", value) + '</div>' for name, value in facts) + '</div>' +
        '<p class="course-roles">' + label("strong", "关联方向：", "Related roles: ") + localized("span", roles) + '</p>' +
        '<div class="course-actions">' + label("a", f"下载 {days} 天学习文档 ↓", f"Download the {days}-day guide ↓", f'class="button primary" id="download-guide" href="./{ident}.zh.md" download') +
        label("button", "导出我的学习记录 ↓", "Export my learning record ↓", 'class="button outline" id="export-progress" type="button" disabled') +
        (label("a", "下载实验代码 ZIP ↓", "Download lab ZIP ↓", f'class="button outline" href="../../labs/{esc(course["lab"]["path"])}.zip" download') if course.get("lab") and re.fullmatch(r"[a-z0-9-]+", course["lab"].get("path", "")) else "") +
        label("a", "作品记录模板 ↗", "Portfolio template ↗", 'class="text-link" href="../../resources/portfolio-template.md" download') + '</div>' +
        label("p", f'资料核对：{course["lastVerified"]}。目标是完成一轮系统学习与可复现作品；实际命令需匹配你锁定的版本。资料核对不代表所有硬件实验已在本平台运行。',
              f'Sources checked: {course["lastVerified"]}. Complete a structured learning cycle and a reproducible project. Match commands to your pinned release. Source review does not mean all hardware experiments were run by this platform.', 'class="course-research-note"') +
        environment_card(course) + verification_card(course) +
        '<p id="storage-status" class="course-research-note" role="status" hidden></p><details id="backup-panel" class="backup-panel"></details>'
    )


def primer_hero(course):
    ident = esc(course["id"])
    return ('<div class="breadcrumbs">' + label("a", "学习库", "Learning library", 'href="../../#learn" data-course-link') + ' / ' +
            label("span", "零基础预备课", "First steps") + '</div>' + localized("h1", course["title"]) +
            localized("p", course["description"], 'class="course-summary"') +
            '<div class="primer-start">' + label("a", "开始第一节", "Start lesson one", 'class="button primary" href="#day-1"') +
            localized("span", course["hoursPerDay"]) + '</div>' +
            '<details class="primer-materials">' + label("summary", "离线学习与我的记录", "Offline materials and my learning record") +
            '<div class="course-actions">' + label("a", "下载整门课的讲义", "Download the illustrated guide",
                  f'id="download-guide" class="text-link" href="./{ident}.zh.md" download') +
            label("a", "下载离线实验包", "Download the offline labs",
                  f'class="text-link" href="../../labs/{ident}.zip" download') +
            label("button", "导出我的学习记录", "Export my learning record", 'class="button outline" id="export-progress" type="button" disabled') +
            '</div>' + label("p", "解压后打开 index.html 即可离线操作三个实验。", "To use the three labs offline, extract the ZIP and open index.html.") +
            '<details id="backup-panel" class="backup-panel"></details></details>' +
            '<p id="storage-status" class="course-research-note" role="status" hidden></p>')


def course_study_tools(course, bench_case):
    if course.get("format") == "primer":
        return ""
    ident = course["id"]
    links = [
        ("practiceCourse", "练习本课题目 / 重练错题 ↗", f"../../practice/?course={ident}"),
        ("knowledgeLibrary", "原理与计算专题 ↗", "../../knowledge/"),
        ("diagnosisLabs", "故障诊断实验室 ↗", "../../cases/")
    ]
    if bench_case:
        links.append(("benchLab", "推理压测复盘台", f"../../bench/?case={bench_case}"))
    links.append(("searchCourse", "搜索本课讲解与报错 ↗", f"../../search/?course={ident}&kind=lesson"))
    return ('<section class="section-shell course-study-tools" aria-label="Learning tools">' +
            '<p data-i18n="studyToolsNote">先读原理，动手验证，再用练习检查理解。</p><div class="course-actions">' +
            "".join(f'<a class="text-link" href="{esc(url)}" data-i18n="{key}">{title}</a>' for key, title, url in links) +
            '</div></section>')


def course_next_steps(course, project_query):
    if course.get("format") == "primer":
        return ('<section class="course-endcap section-shell"><div>' +
                label("h2", "想把第一个实验带到自己的电脑上？", "Ready to run the experiment on your own computer?") +
                label("p", "第 9 节可以练习运行一个小脚本。会打开终端、运行 Python 文件后，进入系统基础，画出一条请求的时间线，再学 vLLM 怎样提供推理服务。",
                      "Lesson 9 lets you try a small script. Once you can open a terminal and run a Python file, trace a request in Systems Foundations. Then explore how vLLM serves a model.") +
                '</div><div class="course-actions">' + label("a", "回到第 9 节", "Revisit lesson 9", 'class="button outline" href="#day-9"') +
                label("a", "打开系统基础第一天", "Open Foundations Day 1", 'class="button primary" data-course-link href="../foundations/#day-1"') +
                label("a", "练习本课题目", "Practice the questions", f'class="text-link" data-course-link href="../../practice/?course={esc(course["id"])}"') +
                '</div></section>')
    return ('<section class="course-endcap section-shell"><div><div class="eyebrow" data-i18n="nextChapter">下一步 · 把学习变成作品</div>'
            '<h2 data-i18n="nextTitle">让别人看见你解决问题的过程。</h2><p data-i18n="nextDescription">整理代码、实验记录和局限，带着作品认识同行或寻找工作。名片由你主动选择公开。</p></div>'
            '<div class="course-actions"><a class="button primary" href="../../career/" data-i18n="careerPrep">结课自评与求职准备 ↗</a>'
            f'<a class="button outline" href="../../portfolio/{esc(project_query)}" data-i18n="createPortfolio">制作作品档案 ↗</a>'
            f'<a class="button outline" href="../../projects/{esc(project_query)}" data-i18n="projects">实战项目</a>'
            '<a class="text-link" href="../../#opportunities" data-i18n="findWork">寻找工作与合作</a></div></section>')


def verification_card(course):
    record = course.get("verification")
    if not record:
        return ""
    return ('<aside class="verification-card">' + label("strong", "真实 CPU 框架实验已验证", "Real CPU framework experiment verified") +
            localized("p", record["scope"]) + f'<p>{esc(record["environment"])} · {esc(record["checkedAt"])}</p>' +
            label("a", "查看原始结果与文件校验值 ↗", "View raw results & file checksums ↗", f'class="text-link" href="../../{esc(record["manifest"])}" target="_blank" rel="noopener noreferrer"') + ' · ' +
            label("a", "查看实际运行日志 ↗", "View the actual run logs ↗", f'class="text-link" href="{esc(record["runUrl"])}" target="_blank" rel="noopener noreferrer"') +
            label("p", "这是平台验证样例，只验证所列正确性；不代表 GPU 吞吐、生产能力或学员作品认证。原始结果也包含在实验 ZIP 中。", "This is a platform verification sample for the stated correctness checks, not GPU throughput, production capability or certification of a learner. Raw results are also included in the lab ZIP.") + '</aside>')


def course_nav(course):
    return "".join(
        f'<a class="day-button" href="#day-{step["day"]}" data-day-link="{step["day"]}" aria-current="{ "step" if step["day"] == 1 else "false" }">'
        f'<span class="day-index">{step["day"]:02d}</span>' + localized("span", step["title"], 'class="day-label"') +
        '<span class="day-status" aria-hidden="true"></span></a>' for step in course["steps"]
    )


def code_panel(content, caption, language="bash"):
    return ('<div class="code-block lesson-code"><div class="code-toolbar">' + localized("p", caption) +
            label("button", "复制代码", "Copy code", 'class="copy-code" type="button" disabled') +
            '</div><pre tabindex="0"><code class="language-' + esc(language) + '">' + esc(content) + '</code></pre>' +
            '<span class="copy-status" role="status"></span></div>')


def lab_download(course):
    lab = course.get("lab")
    if not lab or not re.fullmatch(r"[a-z0-9-]+", lab.get("path", "")):
        return ""
    return ('<aside class="lab-download">' + label("span", "动手实验包 / ZIP", "HANDS-ON LAB / ZIP", 'class="lab-eyebrow"') +
            localized("h3", lab["title"]) + localized("p", lab["description"]) +
            label("a", "下载代码与实验资料 ↓", "Download code & lab materials ↓", f'class="button primary" href="../../labs/{esc(lab["path"])}.zip" download') +
            label("p", "先下载并解压，按第 1 天说明进入实验目录。命令在你的电脑执行。", "Download and extract first, then enter the lab directory as shown on day 1. Run commands on your own computer.", 'class="lab-hint"') + '</aside>')


def explanation_blocks(step, include_interactive=True):
    chunks = []
    for item in step.get("explanation", []):
        chunks += ['<div class="explanation-block">', localized("h4", item["title"]), localized("p", item["body"]), '</div>']
    diagram = step.get("diagram")
    if diagram:
        chunks += ['<figure class="lesson-diagram">', localized("figcaption", diagram["title"]), '<ol class="diagram-flow">']
        for index, node in enumerate(diagram["nodes"], 1):
            chunks += [f'<li><span class="diagram-number" aria-hidden="true">{index:02d}</span>', localized("span", node), '</li>']
        chunks += ['</ol>', localized("p", diagram["caption"], 'class="diagram-caption"'), '</figure>']
    if include_interactive and step.get("interactive") in INTERACTIVE_KINDS:
        chunks.append(interactive_panel(step["interactive"], step["day"]))
    return "".join(chunks)


def slider(widget_id, key, zh, en, value, minimum, maximum, increment=1):
    ident = widget_id + "-" + key
    return ('<label class="sim-control" for="' + ident + '">' + label("span", zh, en) +
            f'<span class="sim-current" data-value-for="{key}">{value}</span></label>' +
            f'<input id="{ident}" data-sim-input="{key}" type="range" min="{minimum}" max="{maximum}" step="{increment}" value="{value}" disabled>')


def interactive_panel(kind, day):
    widget_id = f"sim-{day}-{kind}"
    if kind in PRIMER_EXAMPLES:
        activity = kind.removeprefix("primer-")
        return (f'<div data-primer-lab="{activity}" data-lesson="{day}">' +
                label("p", *PRIMER_EXAMPLES[kind]) + '</div>')
    if kind in MODELS:
        model = MODELS[kind]
        chunks = [f'<section class="learning-simulator" data-simulator="{kind}">',
                  label("div", "交互实验 · 教学模型", "INTERACTIVE LAB · TEACHING MODEL", 'class="lab-eyebrow"'),
                  localized("h3", model["title"]), localized("p", model["description"]), '<div class="sim-controls">']
        for key, title, value, minimum, maximum, increment in model["inputs"]:
            chunks.append(slider(widget_id, key, title["zh"], title["en"], value, minimum, maximum, increment))
        chunks += ['</div>', f'<p class="sim-formula">{esc(model["formula"])}</p>', '<div class="sim-comparison">']
        maximum = max(model["defaults"])
        for index, row in enumerate(model["rows"]):
            value = model["defaults"][index]
            chunks += ['<div>', localized("span", row), f'<strong data-model-value="{index}">{value} {esc(model["unit"])}</strong>',
                       f'<div class="sim-bar" aria-hidden="true"><span class="stage-{ "prefill" if index == 0 else "decode" }" data-model-bar="{index}" style="width:{value / maximum * 100:.3f}%"></span></div></div>']
        chunks += ['</div>', f'<output class="sim-result" aria-live="polite">{esc(model["example"]["zh"])}</output>',
                   label("p", "调整参数，先预测再观察。教学假设不代表真实系统的性能或容量承诺。", "Predict before adjusting. Teaching assumptions do not guarantee real system performance or capacity.", 'class="sim-boundary"'),
                   '<noscript>', label("p", "启用 JavaScript 可调整参数；当前显示默认算例。", "Enable JavaScript to adjust parameters; the default example is shown."), '</noscript></section>']
        return "".join(chunks)
    titles = {"timeline": ("把一次请求拆开看", "Inside one request"), "kv-cache": ("算一算 KV cache 占多少空间", "Estimate the KV cache footprint"), "prefix-cache": ("共享前缀怎样改变等待时间？", "How can a shared prefix change waiting time?")}
    chunks = [
        f'<section class="learning-simulator" data-simulator="{kind}">',
        label("div", "交互实验 · 教学模型", "INTERACTIVE LAB · TEACHING MODEL", 'class="lab-eyebrow"'),
        label("h3", *titles[kind])
    ]
    if kind == "timeline":
        chunks += [
            label("p", "拖动三个阶段的时长，观察首 token 等待与请求总时长。这里假设首 token 在 Prefill 结束时产生，Decode 表示其余 token 的生成；省略网络与客户端开销。", "Adjust the three durations to compare time to first token and total latency. This simplified model emits its first token at the end of prefill; decode generates the remaining tokens. Network and client overheads are omitted."),
            '<div class="sim-controls">',
            slider(widget_id, "queue", "排队 / ms", "Queue / ms", 40, 0, 200, 10),
            slider(widget_id, "prefill", "Prefill / ms", "Prefill / ms", 80, 10, 200, 10),
            slider(widget_id, "decode", "Decode / ms", "Decode / ms", 240, 20, 1000, 20),
            '</div><div class="sim-bar" aria-hidden="true"><span data-bar="queue" class="stage-queue" style="width:11.111%"></span><span data-bar="prefill" class="stage-prefill" style="width:22.222%"></span><span data-bar="decode" class="stage-decode" style="width:66.667%"></span></div>',
            label("p", "黄色：排队 · 绿色：Prefill · 蓝色：Decode", "Yellow: queue · Green: prefill · Blue: decode", 'class="sim-legend"'),
            '<output class="sim-result" aria-live="polite">TTFT = 120 ms · Total = 360 ms</output>'
        ]
    elif kind == "kv-cache":
        chunks += [
            label("p", "固定 32 层、每个 head 维度 128、每元素 2 bytes；下方的 heads 是 KV heads。GQA 使用 KV heads，而不是 query heads。估算适用于普通 attention 的未分片 KV，未计权重、激活、页对齐或其他内存开销，不适用于 MLA 等不同缓存结构。", "Fixed: 32 layers, head dimension 128, 2 bytes per element. Heads below means KV heads. For GQA, use KV heads, not query heads. This estimates unsharded conventional attention KV only, excluding weights, activations, page alignment and other overheads; it does not model MLA or other cache layouts."),
            '<div class="sim-controls">',
            slider(widget_id, "tokens", "每条序列的缓存 token 数", "Cached tokens per sequence", 2048, 256, 8192, 256),
            slider(widget_id, "batch", "同时缓存的序列数", "Cached sequences", 4, 1, 16),
            slider(widget_id, "heads", "KV heads", "KV heads", 8, 1, 32),
            '</div><p class="sim-formula">bytes = 2 × 32 × KV heads × 128 × 2 × tokens × sequences</p><output class="sim-result" aria-live="polite">1.000 GiB</output>',
            label("p", "前面的 2 代表 K 和 V；1 GiB = 2³⁰ bytes。假设序列等长且不共享缓存。", "The leading 2 counts K and V; 1 GiB = 2³⁰ bytes. Sequences have equal lengths with no shared cached blocks.", 'class="sim-legend"')
        ]
    else:
        chunks += [
            label("p", "假设完整 Prefill 为 100 ms、后续 Decode 为 200 ms，复用开销为 10 ms，Prefill 时间与 token 数线性相关。热缓存仅跳过已有前缀的 Prefill；输出 token 的生成时间保持不变。实际系统不保证线性，也有块边界和调度成本。", "Assume 100 ms for full prefill, 200 ms for subsequent decode, 10 ms reuse overhead, and prefill time linear in token count. A warm cache only skips prefill of cached prefix tokens; generation time stays unchanged. Real engines have nonlinear costs, block boundaries and scheduling overhead."),
            '<div class="sim-controls">',
            slider(widget_id, "shared", "共享且可复用的前缀 / %", "Shared, reusable prefix / %", 60, 0, 90, 10),
            '</div><div class="sim-comparison"><div>',
            label("span", "关闭缓存", "Cache off"),
            '<strong>300 ms</strong><div class="sim-bar" aria-hidden="true"><span class="stage-decode" style="width:96.77%"></span></div></div><div>',
            label("span", "开启但冷缓存", "Enabled, cold cache"),
            '<strong>310 ms</strong><div class="sim-bar" aria-hidden="true"><span class="stage-queue" style="width:100%"></span></div></div><div>',
            label("span", "开启且热缓存", "Enabled, warm cache"),
            '<strong data-warm-total>250 ms</strong><div class="sim-bar" aria-hidden="true"><span data-bar="warm" class="stage-prefill" style="width:80.645%"></span></div></div></div><output class="sim-result" aria-live="polite">Warm prefill + reuse = 50 ms · Total = 250 ms</output>',
            label("p", "把共享比例拖到 0%，看看复用开销如何让缓存变慢。这里的数值只是公式演示，不是 vLLM 基准测试结果。", "Set the shared prefix to 0% to see reuse overhead make caching slower. These numbers illustrate a formula; they are not vLLM benchmark results.", 'class="sim-legend"')
        ]
    chunks += [
        label("p", "教学模拟，不能用作硬件容量承诺或引擎性能结论。", "A teaching model, not a hardware capacity guarantee or engine performance measurement.", 'class="sim-boundary"'),
        '<noscript>',
        label("p", "启用 JavaScript 可调整参数；上方显示默认算例。", "Enable JavaScript to adjust parameters; the default worked example is shown above."),
        '</noscript></section>'
    ]
    return "".join(chunks)


def walkthrough_blocks(step):
    if not step.get("walkthrough"):
        return ""
    chunks = ['<section class="walkthrough-section">', label("h3", "一步一步做实验", "Follow the experiment, step by step"), '<ol class="walkthrough-list">']
    for index, item in enumerate(step["walkthrough"], 1):
        chunks += [
            f'<li><span class="walkthrough-number" aria-hidden="true">{index:02d}</span><div class="walkthrough-body">',
            localized("h4", item["title"]),
            localized("p", item["body"])
        ]
        if item.get("command"):
            chunks.append(code_panel(item["command"], {"zh": "在实验目录的终端执行", "en": "Run in a terminal in the lab directory"}))
        if item.get("expected"):
            chunks += ['<div class="expected-result">', label("strong", "对照结果", "Compare your result"), localized("p", item["expected"]), '</div>']
        chunks.append('</div></li>')
    chunks.append('</ol></section>')
    return "".join(chunks)


def feedback_blocks(step, primer=False):
    chunks = []
    if step.get("troubleshooting"):
        chunks += ['<section class="troubleshooting-section">', label("h3", "遇到问题，从这里查", "Troubleshoot common problems")]
        for item in step["troubleshooting"]:
            chunks += ['<details class="trouble-card">', localized("summary", item["symptom"]), localized("p", item["fix"]), '</details>']
        chunks.append('</section>')
    if step.get("quiz"):
        chunks += [
            '<section class="lesson-quiz">',
            label("div", "CHECK YOUR UNDERSTANDING", "CHECK YOUR UNDERSTANDING", 'class="lab-eyebrow"'),
            label("h3", "先想一想，再看解析", "Think first, then review the explanation"),
            (label("p", "先选一个答案。读完解析后，可以回到上面的例子再试一次。", "Try an answer. After reading the explanation you can revisit the example and try again.", 'class="quiz-note"') if primer else
             label("p", "答题帮助发现理解上的缺口；通过小测不等于完成实验或获得认证。答案不上传。", "Use these questions to spot gaps. Passing a quiz does not complete the lab or certify your skills. Answers are not uploaded.", 'class="quiz-note"'))
        ]
        for index, item in enumerate(step["quiz"], 1):
            ident = f'q-{step["day"]}-{index}'
            chunks += [
                f'<form class="quiz-question" data-answer="{int(item["answer"])}"><fieldset>',
                localized("legend", {lang: f'{index:02d}. {item["question"][lang]}' for lang in ("zh", "en")})
            ]
            for number, option in enumerate(item["options"]):
                chunks += [
                    f'<label class="quiz-option"><input type="radio" name="{ident}" value="{number}"><span class="option-letter" aria-hidden="true">{chr(65 + number)}</span>',
                    localized("span", option),
                    '</label>'
                ]
            chunks += [
                '</fieldset><div class="quiz-actions">',
                label("button", "检查答案", "Check answer", 'class="button outline" type="submit" disabled'),
                label("button", "重新思考", "Try again", 'class="text-link quiz-retry" type="button" hidden'),
                '</div><p class="quiz-status" role="status"></p><div class="quiz-explanation" hidden>',
                localized("p", item["explanation"]),
                '</div><details class="quiz-reference">',
                label("summary", "查看参考答案与解析", "Reference answer and explanation"),
                localized("p", {lang: f'{chr(65 + item["answer"])}. {item["options"][item["answer"]][lang]}' for lang in ("zh", "en")}),
                localized("p", item["explanation"]),
                '</details></form>'
            ]
        chunks.append('</section>')
    return "".join(chunks)


def primer_notes(day, capstone):
    field = f'<textarea class="day-notes" id="notes-{day}" data-notes="{day}" rows="5" maxlength="10000" disabled></textarea>'
    if not capstone:
        return ('<details class="notes-panel">' + label("summary", "写一句我的发现", "Write down a discovery") +
                label("label", "我改了什么，又看到了什么？", "What did I change and what happened?", f'for="notes-{day}"') +
                field + '</details>')
    return ('<section class="primer-card" aria-labelledby="card-title">' +
            label("h3", "我的第一张推理实验卡", "My first inference experiment card", 'id="card-title"') +
            label("p", "记下当前结果，再改变一个条件，记下第二次结果。最后写一句你会怎样向同学解释这个变化。草稿保存在这个浏览器。",
                  "Record this result, change one setting and record the second result. Write how you would explain the change to a classmate. Your draft stays in this browser.") +
            label("button", "把本次条件和结果记入卡片", "Record this run on my card", 'class="button outline" id="record-run" type="button" disabled') +
            label("label", "两次观察和我的解释", "My observations and explanation", f'for="notes-{day}"') + field +
            label("button", "下载我的实验卡", "Download my experiment card", 'class="button primary" id="download-card" type="button" disabled') +
            '<p id="card-status" role="status"></p></section>')


def primer_day(step, count):
    day = step["day"]
    final = day == count
    parts = [
        f'<section class="day-content" id="day-{day}" data-day="{day}" tabindex="-1">',
        label("p", f"第 {day} 节，共 {count} 节", f"Lesson {day} of {count}", 'class="primer-position"'),
        localized("h2", step["title"]), localized("p", step["lesson"], 'class="primer-intro"')
    ]
    if step.get("interactive"):
        parts.append(interactive_panel(step["interactive"], day))
    if final:
        parts.append(primer_notes(day, capstone=True))
    parts += [explanation_blocks(step, include_interactive=False),
              '<div class="practice-block">', label("h3", "轮到你做", "Your turn"), localized("p", step["task"]), '</div>',
              walkthrough_blocks(step)]
    if step.get("code"):
        code = step["code"]
        parts.append(code_panel(code["content"], code["caption"], code["language"]))
    parts += [feedback_blocks(step, primer=True), '<details class="primer-reference">', label("summary", "对照我的结果与延伸阅读", "Check my work and read further"),
              localized("p", step["evidence"]), '<ul>']
    for index in range(len(step["checklist"]["zh"])):
        parts.append(localized("li", {lang: step["checklist"][lang][index] for lang in ("zh", "en")}))
    parts += ['</ul>', localized("p", step["noGpu"]), source_links(step["reading"]), '</details>']
    if not final:
        parts.append(primer_notes(day, capstone=False))
    parts += ['<div class="day-complete"><label>', f'<input type="checkbox" data-complete="{day}" disabled>',
              label("span", "我能用自己的话解释这节课", "I can explain this lesson in my own words"), '</label></div>',
              '<nav class="day-pagination" aria-label="课程导航 / Lessons">']
    if day > 1:
        parts.append(label("a", "上一节", "Previous lesson", f'class="button outline" href="#day-{day - 1}"'))
    if final:
        parts.append(label("a", "继续学系统基础", "Continue to systems foundations",
                           'class="button primary" data-course-link href="../foundations/#day-1"'))
    else:
        parts.append(label("a", "下一节", "Next lesson", f'class="button primary" href="#day-{day + 1}"'))
    return "".join(parts) + '</nav></section>'


def course_body(course, repository=""):
    sections = []
    days = len(course["steps"])
    for step in course["steps"]:
        day = step["day"]
        if course.get("format") == "primer":
            sections.append(primer_day(step, days))
            continue
        chunks = [f'<section class="day-content" id="day-{day}" data-day="{day}" tabindex="-1">',
                  label("div", f"第 {day:02d} 天 / 共 {days} 天", f"DAY {day:02d} / {days}", 'class="day-eyebrow"'),
                  localized("h2", step["title"])]
        if day == 1 and course.get("lab"):
            chunks.append(lab_download(course))
        chunks += ['<div class="lesson-block">', label("h3", "今天理解什么", "Understand the idea"), localized("p", step["lesson"]), '</div>', explanation_blocks(step),
                   '<div class="practice-block">', label("h3", "动手做", "Put it into practice"), localized("p", step["task"]), '</div>', walkthrough_blocks(step)]
        if step.get("code"):
            code = step["code"]
            chunks.append(code_panel(code["content"], code["caption"], code["language"]))
        chunks += ['<div class="deliverable-block">', label("h3", "留下什么作品", "Your deliverable"), localized("p", step["evidence"]), '</div>',
                   '<div class="acceptance-list">', label("h3", "完成前，对照检查", "Before you mark this complete"), '<ul>']
        chunks += [localized("li", {lang: step["checklist"][lang][i] for lang in ("zh", "en")}) for i in range(len(step["checklist"]["zh"]))]
        chunks += ['</ul></div><div class="alternative-block">', label("h3", "没有对应硬件，也能继续", "A path without the required hardware"), localized("p", step["noGpu"]), '</div>', feedback_blocks(step),
                   label("h3", "阅读官方资料", "Read the primary sources"), source_links(step["reading"]),
                   '<details class="notes-panel">', label("summary", "我的笔记与作品链接", "My notes and evidence links"),
                   label("label", "只保存在当前浏览器，可随学习记录导出。", "Saved in this browser and included in your exported record.", f'for="notes-{day}"'),
                   f'<textarea class="day-notes" id="notes-{day}" data-notes="{day}" rows="5" maxlength="10000" disabled></textarea></details>',
                   '<div class="day-complete"><label>', f'<input type="checkbox" data-complete="{day}" disabled>', label("span", "我已完成今天的实践与自查", "I completed today’s practice and self-check"), '</label></div>',
                   '<nav class="day-pagination" aria-label="Adjacent lessons">']
        if day > 1:
            chunks.append(label("a", "← 前一天", "← Previous day", f'class="button outline" href="#day-{day-1}"'))
        else:
            chunks.append(label("a", "← 学习库", "← Learning library", 'class="button outline" href="../../#learn"'))
        if day < days:
            chunks.append(label("a", "下一天 →", "Next day →", f'class="button primary" href="#day-{day+1}"'))
        else:
            chunks.append(label("a", "整理我的作品 ↗", "Build my portfolio ↗", 'class="button primary" href="../../resources/portfolio-template.md" download'))
        chunks.append('</nav>')
        if repository and re.fullmatch(r"[A-Za-z0-9-]+/[A-Za-z0-9_.-]+", repository):
            query = urlencode({"template": "03-project-feedback.yml", "title": f'[Learning] {course["id"]} Day {day}', "target": f'{course["id"]} Day {day} | sources checked {course["lastVerified"]}'})
            chunks += ['<aside class="lesson-help">', label("strong", "卡在这一步？", "Stuck on this step?"),
                       label("p", "提问入口已填入课程、天数和资料核对日期。提交前补上实际版本、命令和报错，删除私密数据。Issue 提交后公开；不会附带你的私人笔记。", "The draft includes the course, day and source-check date. Add your actual versions, command and error; remove private data. Submitted issues are public. Your private notes are not included."),
                       label("a", "打开求助草稿 ↗", "Open a help request draft ↗", f'class="button outline" href="https://github.com/{esc(repository)}/issues/new?{esc(query)}" target="_blank" rel="noopener noreferrer"'),
                       label("a", "查看作品评审队列 ↗", "View the project review queue ↗", 'class="text-link" href="../../talent/#reviews"'), '</aside>']
        chunks.append('</section>')
        sections.append("".join(chunks))
    meta = {"id": course["id"], "title": course["title"], "durationDays": days, "format": course.get("format", "course"), "steps": [{"day": x["day"], "title": x["title"]} for x in course["steps"]]}
    safe_meta = json.dumps(meta, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return "\n".join(sections) + f'<script type="application/json" id="course-meta">{safe_meta}</script>'


def course_markdown(course, lang, site_url=None):
    english = lang == "en"
    primer = course.get("format") == "primer"
    days = len(course["steps"])
    pick = lambda value: value[lang]
    labels = {"lesson": "Understand the idea" if english else "概念讲解", "task": "Practice" if english else "动手实践", "evidence": "Deliverable" if english else "交付物", "noGpu": "Without the required hardware" if english else "无对应硬件的替代路径"}
    if primer:
        labels["noGpu"] = "Work it out on paper" if english else "在纸上试一次"
    guide = (f"{days} short lessons" if english else f"{days} 节启蒙课") if primer else (f"{days}-day guide" if english else f"{days} 天实战学习")
    lines = [f'# {pick(course["title"])} · {guide}', '', '聘枢 · AI Infra JobHub', '', pick(course["description"]), '']
    time_label = ("Time per lesson" if english else "每节用时") if primer else ("Daily commitment" if english else "每日投入")
    for name, key in [(time_label, "hoursPerDay"), ("Prerequisites" if english else "先修知识", "prerequisites"), ("Hardware" if english else "实践环境", "hardware"), ("Final deliverable" if english else "结课作品", "outcome")]:
        lines += [f'**{name}:** {pick(course[key])}', '']
    if course.get("curriculum"):
        lines += [f'**{"Curriculum role" if english else "课程定位"}:** {pick(course["curriculum"]["label"])}', '']
    lines += [f'{"Sources checked" if english else "资料核对"}: {course["lastVerified"]}.', '']
    if not primer:
        lines += ['Source review does not mean all hardware experiments were run here. Pin versions and label measured, simulated and planned work separately.' if english else '资料核对不代表所有硬件实验已由平台跑通。请固定版本，并区分实测、模拟与未执行的设计。', '']
    if course.get("environment"):
        for key, titles in ENVIRONMENT_FIELDS:
            lines += [f'**{titles[1 if english else 0]}:** {pick(course["environment"][key])}', '']
    if course.get("lab"):
        lab = course["lab"]
        lab_url = f'{site_url.rstrip("/")}/labs/{lab["path"]}.zip' if site_url else f'../../labs/{lab["path"]}.zip'
        lines += [f'**{pick(lab["title"])}**', '', pick(lab["description"]), '',
                  f'[{"Download lab archive" if english else "下载实验包"}]({lab_url})', '']
        if primer:
            lines += ['Use the experiments directly on the course page. To work offline, extract the ZIP and open index.html.' if english else '打开课程网页就能操作实验。想离线学习时，解压实验包并打开 index.html。', '']
        else:
            lines += ['Download the ZIP from the course page, extract it, then follow day 1 to enter the lab directory.' if english else '在课程网页下载 ZIP，解压后按照第 1 天说明进入实验目录。', '']
        if site_url:
            lines += [f'[{"Course and interactive diagrams" if english else "课程网页与交互图解"}]({site_url.rstrip("/")}/learn/{course["id"]}/?lang={lang})', '']
    for step in course["steps"]:
        heading = (f'Lesson {step["day"]}' if english else f'第 {step["day"]} 节') if primer else (f'Day {step["day"]}' if english else f'第 {step["day"]} 天')
        lines += [f'## {heading} · {pick(step["title"])}', '']
        for key in ("lesson", "task", "evidence"):
            lines += [f'### {labels[key]}', '', pick(step[key]), '']
            if key == "lesson":
                for item in step.get("explanation", []):
                    lines += [f'#### {pick(item["title"])}', '', pick(item["body"]), '']
                if step.get("diagram"):
                    diagram = step["diagram"]
                    lines += [f'#### {pick(diagram["title"])}', '', ' → '.join(pick(node) for node in diagram["nodes"]), '', pick(diagram["caption"]), '']
                if step.get("interactive"):
                    if step["interactive"] in PRIMER_EXAMPLES:
                        lines += [PRIMER_EXAMPLES[step["interactive"]][int(english)], '']
                    else:
                        lines += ['Open the course webpage to adjust the interactive teaching model. Simulated values are not engine performance measurements.' if english else '在课程网页中可调整交互教学模型。模拟数值不代表引擎性能实测。', '']
            if key == "task":
                for index, item in enumerate(step.get("walkthrough", []), 1):
                    lines += [f'#### {index}. {pick(item["title"])}', '', pick(item["body"]), '']
                    if item.get("command"):
                        fence = "````" if "```" in item["command"] else "```"
                        lines += [fence + 'bash', item["command"], fence, '']
                    if item.get("expected"):
                        lines += [f'**{"Expected result" if english else "对照结果"}:**', '', pick(item["expected"]), '']
            if key == "task" and step.get("code"):
                code = step["code"]
                fence = "````" if "```" in code["content"] else "```"
                lines += [pick(code["caption"]), '', fence + code["language"], code["content"], fence, '']
        lines += ['### ' + ('Acceptance checks' if english else '验收清单'), '']
        lines += [f'- [ ] {item}' for item in step["checklist"][lang]]
        if step.get("troubleshooting"):
            lines += ['', '### ' + ('Troubleshooting' if english else '常见问题与排查'), '']
            for item in step["troubleshooting"]:
                lines += [f'**{pick(item["symptom"])}**', '', pick(item["fix"]), '']
        if step.get("quiz"):
            lines += ['', '### ' + ('Check your understanding' if english else '理解测验'), '',
                      'Questions check understanding; they do not certify a completed experiment.' if english else '测验帮助检查理解，不代替实验验收或技能认证。', '']
            for index, item in enumerate(step["quiz"], 1):
                lines += [f'**{index}. {pick(item["question"])}**', '']
                lines += [f'- {chr(65 + number)}. {pick(option)}' for number, option in enumerate(item["options"])]
                lines += ['', f'{"Answer" if english else "参考答案"}: {chr(65 + item["answer"])}. {pick(item["explanation"])}', '']
        lines += ['', f'### {labels["noGpu"]}', '', pick(step["noGpu"]), '', '### ' + ('Official reading' if english else '官方阅读'), '']
        lines += [f'- [{item["title"]}]({item["url"]})' for item in step["reading"]]
        lines += ['']
    if primer:
        lines += (['## My first inference experiment card', '', 'Teaching queue simulation', '', '- First run and result:',
                   '- Second run and result:', '- What I changed:', '- How I explain the difference:'] if english else
                  ['## 我的第一张推理实验卡', '', '排队教学模拟', '', '- 第一次的条件和结果', '- 第二次的条件和结果', '- 我改变的条件', '- 我怎样解释这个差别'])
        lines.append('')
    return "\n".join(lines) + "\n"
