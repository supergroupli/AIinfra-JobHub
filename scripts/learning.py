"""Static, bilingual learning documents. All submitted prose is escaped as text."""
import html
import json

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
    facts = [
        (("每天投入", "Daily commitment"), course["hoursPerDay"]),
        (("先修知识", "Prerequisites"), course["prerequisites"]),
        (("实践环境", "Hardware"), course["hardware"]),
        (("最终作品", "Final deliverable"), course["outcome"]),
    ]
    roles = {lang: " · ".join(course["roles"][lang]) for lang in ("zh", "en")}
    return (
        '<div class="breadcrumbs">' + label("a", "学习库", "Learning library", 'href="../../#learn"') +
        ' <span aria-hidden="true">/</span> ' + localized("span", course["title"]) + '</div>' +
        '<div class="course-kicker">' + localized("span", CATEGORIES[course["category"]]) + ' · ' +
        label("span", "10 天实战学习", "10-day practical guide") + ' · ' + localized("span", LEVELS[course["level"]]) + '</div>' +
        localized("h1", course["title"]) + localized("p", course["description"], 'class="course-summary"') +
        '<div class="course-facts">' + "".join('<div class="course-fact">' + label("small", *name) + localized("span", value) + '</div>' for name, value in facts) + '</div>' +
        '<p class="course-roles">' + label("strong", "关联方向：", "Related roles: ") + localized("span", roles) + '</p>' +
        '<div class="course-actions">' + label("a", "下载 10 天学习文档 ↓", "Download the 10-day guide ↓", f'class="button primary" id="download-guide" href="./{ident}.zh.md" download') +
        label("button", "导出我的学习记录 ↓", "Export my learning record ↓", 'class="button outline" id="export-progress" type="button" disabled') +
        label("a", "作品记录模板 ↗", "Portfolio template ↗", 'class="text-link" href="../../resources/portfolio-template.md" download') + '</div>' +
        label("p", f'资料核对：{course["lastVerified"]}。目标是完成一轮系统学习与可复现作品；实际命令需匹配你锁定的版本。资料核对不代表所有硬件实验已在本平台运行。',
              f'Sources checked: {course["lastVerified"]}. Complete a structured learning cycle and a reproducible project. Match commands to your pinned release. Source review does not mean all hardware experiments were run by this platform.', 'class="course-research-note"') +
        '<p id="storage-status" class="course-research-note" role="status" hidden></p>'
    )


def course_nav(course):
    return "".join(
        f'<a class="day-button" href="#day-{step["day"]}" data-day-link="{step["day"]}" aria-current="{ "step" if step["day"] == 1 else "false" }">'
        f'<span class="day-index">{step["day"]:02d}</span>' + localized("span", step["title"], 'class="day-label"') +
        '<span class="day-status" aria-hidden="true"></span></a>' for step in course["steps"]
    )


def course_body(course):
    sections = []
    for step in course["steps"]:
        day = step["day"]
        chunks = [f'<section class="day-content" id="day-{day}" data-day="{day}" tabindex="-1">',
                  label("div", f"第 {day:02d} 天 / 共 10 天", f"DAY {day:02d} / 10", 'class="day-eyebrow"'),
                  localized("h2", step["title"]),
                  '<div class="lesson-block">', label("h3", "今天理解什么", "Understand the idea"), localized("p", step["lesson"]), '</div>',
                  '<div class="practice-block">', label("h3", "动手做", "Put it into practice"), localized("p", step["task"]), '</div>']
        if step.get("code"):
            code = step["code"]
            chunks += ['<div class="code-block">', localized("p", code["caption"]), f'<pre><code class="language-{esc(code["language"])}">{esc(code["content"])}</code></pre>', '</div>']
        chunks += ['<div class="deliverable-block">', label("h3", "留下什么作品", "Your deliverable"), localized("p", step["evidence"]), '</div>',
                   '<div class="acceptance-list">', label("h3", "完成前，对照检查", "Before you mark this complete"), '<ul>']
        chunks += [localized("li", {lang: step["checklist"][lang][i] for lang in ("zh", "en")}) for i in range(len(step["checklist"]["zh"]))]
        chunks += ['</ul></div><div class="alternative-block">', label("h3", "没有对应硬件，也能继续", "A path without the required hardware"), localized("p", step["noGpu"]), '</div>',
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
        if day < 10:
            chunks.append(label("a", "下一天 →", "Next day →", f'class="button primary" href="#day-{day+1}"'))
        else:
            chunks.append(label("a", "整理我的作品 ↗", "Build my portfolio ↗", 'class="button primary" href="../../resources/portfolio-template.md" download'))
        chunks += ['</nav></section>']
        sections.append("".join(chunks))
    meta = {"id": course["id"], "title": course["title"], "steps": [{"day": x["day"], "title": x["title"]} for x in course["steps"]]}
    safe_meta = json.dumps(meta, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return "\n".join(sections) + f'<script type="application/json" id="course-meta">{safe_meta}</script>'


def course_markdown(course, lang):
    english = lang == "en"
    pick = lambda value: value[lang]
    labels = {"lesson": "Understand the idea" if english else "概念讲解", "task": "Practice" if english else "动手实践", "evidence": "Deliverable" if english else "交付物", "noGpu": "Without the required hardware" if english else "无对应硬件的替代路径"}
    lines = [f'# {pick(course["title"])} · {"10-day guide" if english else "10 天实战学习"}', '', '聘枢 · AI Infra JobHub', '', pick(course["description"]), '']
    for name, key in [("Daily commitment" if english else "每日投入", "hoursPerDay"), ("Prerequisites" if english else "先修知识", "prerequisites"), ("Hardware" if english else "实践环境", "hardware"), ("Final deliverable" if english else "结课作品", "outcome")]:
        lines += [f'**{name}:** {pick(course[key])}', '']
    lines += [f'{"Sources checked" if english else "资料核对"}: {course["lastVerified"]}.', '',
              'Source review does not mean all hardware experiments were run here. Pin versions and label measured, simulated and planned work separately.' if english else '资料核对不代表所有硬件实验已由平台跑通。请固定版本，并区分实测、模拟与未执行的设计。', '']
    for step in course["steps"]:
        lines += [f'## {"Day" if english else "第"} {step["day"]}{"" if english else " 天"} · {pick(step["title"])}', '']
        for key in ("lesson", "task", "evidence"):
            lines += [f'### {labels[key]}', '', pick(step[key]), '']
            if key == "task" and step.get("code"):
                code = step["code"]
                fence = "````" if "```" in code["content"] else "```"
                lines += [pick(code["caption"]), '', fence + code["language"], code["content"], fence, '']
        lines += ['### ' + ('Acceptance checks' if english else '验收清单'), '']
        lines += [f'- [ ] {item}' for item in step["checklist"][lang]]
        lines += ['', f'### {labels["noGpu"]}', '', pick(step["noGpu"]), '', '### ' + ('Official reading' if english else '官方阅读'), '']
        lines += [f'- [{item["title"]}]({item["url"]})' for item in step["reading"]]
        lines += ['']
    return "\n".join(lines) + "\n"
