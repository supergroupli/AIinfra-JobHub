"""Validate linked teaching supplements and publish portable reading copies."""
import re
from urllib.parse import urlparse


def require(condition, message):
    if not condition:
        raise ValueError(message)


def pair(value):
    return isinstance(value, dict) and all(isinstance(value.get(lang), str) and value[lang].strip() for lang in ("zh", "en"))


def validate_supplements(topics, cases, courses):
    lesson_ids = {(course["id"], step["day"]) for course in courses for step in course["steps"]}
    for kind, records in (("concept", topics), ("case", cases)):
        require(isinstance(records, list) and records, f"{kind}: empty library")
        ids = set()
        for item in records:
            ident = item.get("id")
            require(isinstance(ident, str) and re.fullmatch(r"[a-z0-9-]+", ident) and ident not in ids, f"{kind}: invalid or duplicate ID")
            ids.add(ident)
            require(pair(item.get("title")) and pair(item.get("summary")), f"{ident}: missing bilingual title/summary")
            require(isinstance(item.get("diagram"), list) and 3 <= len(item["diagram"]) <= 8 and all(pair(node) for node in item["diagram"]), f"{ident}: missing flow diagram")
            require(isinstance(item.get("lessons"), list) and item["lessons"] and all((ref.get("course"), ref.get("day")) in lesson_ids for ref in item["lessons"]), f"{ident}: broken lesson reference")
            require(isinstance(item.get("sources"), list) and item["sources"], f"{ident}: missing sources")
            for source in item["sources"]:
                url = urlparse(source.get("url", ""))
                require(isinstance(source.get("title"), str) and source["title"].strip() and url.scheme == "https" and url.hostname and not url.username and not url.password, f"{ident}: invalid source")
            if kind == "concept":
                for key in ("explain", "tradeoffs"):
                    require(isinstance(item.get(key), list) and item[key] and all(pair(p) for p in item[key]), f"{ident}: missing {key}")
                example = item.get("example", {})
                require(pair(example.get("setup")) and pair(example.get("result")) and len(example.get("steps", [])) >= 2 and all(pair(p) for p in example["steps"]), f"{ident}: incomplete worked example")
                require(pair(item.get("mistake")) and pair(item.get("check", {}).get("question")) and pair(item.get("check", {}).get("answer")), f"{ident}: missing self-check")
            else:
                for key in ("context", "resolution", "limits", "challenge"):
                    require(pair(item.get(key)), f"{ident}: missing {key}")
                for key in ("hypotheses", "investigation", "regression"):
                    require(isinstance(item.get(key), list) and item[key] and all(pair(p) for p in item[key]), f"{ident}: missing {key}")
                require(isinstance(item.get("evidence"), list) and item["evidence"] and all(pair(p.get("title")) and pair(p.get("body")) and isinstance(p.get("log"), str) for p in item["evidence"]), f"{ident}: missing evidence")
                require(all(isinstance(item.get(key), str) and item[key].strip() for key in ("command", "expected")), f"{ident}: missing runnable lab")
        if kind == "concept":
            require(all(isinstance(item.get("related"), list) and all(ref in ids and ref != item["id"] for ref in item["related"]) for item in records), "Unknown related concept")


def md(value):
    return re.sub(r"([\\`*_{}\[\]<>#!|])", r"\\\1", str(value))


def fence(value):
    runs = re.findall(r"`+", value)
    delimiter = "`" * max(3, max((len(run) + 1 for run in runs), default=3))
    return f"{delimiter}text\n{value}\n{delimiter}"


def write_handbooks(topics, cases, out, base):
    for section, records in (("knowledge", topics), ("cases", cases)):
        for lang in ("zh", "en"):
            en = lang == "en"
            t = lambda zh, english: english if en else zh
            title = t("原理知识手册", "Core concepts handbook") if section == "knowledge" else t("故障诊断案例手册（含解析）", "Diagnosis case handbook (includes solutions)")
            lines = ["# " + title, "", "聘枢 · AI Infra JobHub", "", t("原创教学算例与假设数据，不是生产性能测量。按来源阅读原始文档，并用自己的实验检查结论。", "Original worked examples and assumed data, not production measurements. Consult the primary sources and check conclusions with your own experiments."), ""]
            for item in records:
                lines += ["## " + md(item["title"][lang]), "", md(item["summary"][lang]), "", " → ".join(md(p[lang]) for p in item["diagram"]), ""]
                if section == "knowledge":
                    for p in item["explain"]:
                        lines += [md(p[lang]), ""]
                    lines += ["### " + t("一步步计算", "Worked example"), "", md(item["example"]["setup"][lang]), ""]
                    lines += [f"{i}. {md(p[lang])}" for i, p in enumerate(item["example"]["steps"], 1)]
                    lines += ["", md(item["example"]["result"][lang]), "", "### " + t("取舍与边界", "Tradeoffs and limits"), ""]
                    lines += ["- " + md(p[lang]) for p in item["tradeoffs"]]
                    lines += ["", "### " + t("常见误区", "Common mistake"), "", md(item["mistake"][lang]), "", "### " + t("自查与解析", "Self-check and explanation"), "", md(item["check"]["question"][lang]), "", md(item["check"]["answer"][lang]), ""]
                else:
                    lines += [md(item["context"][lang]), "", "### " + t("证据", "Evidence"), ""]
                    for p in item["evidence"]:
                        lines += ["#### " + md(p["title"][lang]), "", md(p["body"][lang]), "", fence(p["log"]), ""]
                    for key, heading in (("hypotheses", t("可检验假设", "Testable hypotheses")), ("investigation", t("调查步骤", "Investigation"))):
                        lines += ["### " + heading, ""] + [f"{i}. {md(p[lang])}" for i, p in enumerate(item[key], 1)] + [""]
                    lines += ["### " + t("运行教学分析", "Run the teaching analysis"), "", fence(item["command"]), "", fence(item["expected"]), "", "### " + t("解析与修复", "Explanation and fix"), "", md(item["resolution"][lang]), "", "### " + t("回归检查", "Regression checks"), ""]
                    lines += ["- " + md(p[lang]) for p in item["regression"]]
                    lines += ["", md(item["limits"][lang]), "", "### " + t("独立挑战", "Independent challenge"), "", md(item["challenge"][lang]), ""]
                lines += ["### " + t("继续学习", "Continue learning"), ""]
                for ref in item["lessons"]:
                    url = f"{base}learn/{ref['course']}/?lang={lang}#day-{ref['day']}" if base else f"../learn/{ref['course']}/?lang={lang}#day-{ref['day']}"
                    lines += [f"- [{ref['course']} · Day {ref['day']}]({url})"]
                lines += ["", "### " + t("原始资料", "Primary sources"), ""]
                lines += [f"- [{md(s['title'])}](<{s['url'].replace('<', '%3C').replace('>', '%3E')}>)" for s in item["sources"]]
                lines += [""]
            folder = out / section
            folder.mkdir(parents=True, exist_ok=True)
            (folder / f"handbook.{lang}.md").write_text("\n".join(lines), encoding="utf-8")
