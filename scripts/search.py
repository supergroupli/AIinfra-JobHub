"""Build a public, bilingual learning index; never read browser/user records."""
import json
import re


def text_for(value, language):
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "\n".join(text_for(item, language) for item in value)
    if isinstance(value, dict):
        if "zh" in value and "en" in value:
            return text_for(value[language], language)
        return "\n".join(text_for(item, language) for key, item in value.items()
                         if key not in ("url", "id", "sources", "reading"))
    return ""


def build_search(courses, projects, topics, cases, out):
    entries = []

    def add(kind, ident, title, summary, body, course="", day=0):
        if not isinstance(ident, str) or not re.fullmatch(r"[a-z0-9-]+", ident):
            raise ValueError("Invalid search target")
        for value in (title, summary):
            if not isinstance(value, dict) or not all(isinstance(value.get(lang), str) and value[lang].strip() for lang in ("zh", "en")):
                raise ValueError("Search entries need bilingual titles and summaries")
        entries.append({"id": f"{kind}:{ident}:{day}", "kind": kind, "target": ident,
                        "course": course, "day": day, "title": title, "summary": summary,
                        "text": {lang: text_for(body, lang) for lang in ("zh", "en")}})

    for course in courses:
        for step in course["steps"]:
            # Do not reveal quiz solutions as search snippets.
            body = [course["title"], course["tags"]] + [step.get(key, "") for key in
                    ("lesson", "explanation", "task", "walkthrough", "troubleshooting", "noGpu")]
            add("lesson", course["id"], step["title"], step["lesson"], body, course["id"], step["day"])
    for topic in topics:
        add("concept", topic["id"], topic["title"], topic["summary"],
            [topic.get(key, "") for key in ("explain", "example", "tradeoffs", "mistake")])
    for case in cases:
        # Learners still open the case to reveal its resolution.
        add("case", case["id"], case["title"], case["summary"],
            [case.get(key, "") for key in ("context", "evidence", "hypotheses", "command")])
    for project in projects:
        add("project", project["id"], project["title"], project["summary"],
            [project.get(key, "") for key in ("problem", "scenario", "tags", "steps", "acceptance")])
    if len({entry["id"] for entry in entries}) != len(entries):
        raise ValueError("Duplicate search entries")
    folder = out / "search"
    folder.mkdir(exist_ok=True, parents=True)
    data = {"version": 1, "courses": [{"id": c["id"], "title": c["title"], "dayCount": len(c["steps"])} for c in courses], "entries": entries}
    (folder / "index.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return data
