#!/usr/bin/env python3
"""Validate curated public records and build a dependency-free static site."""
import json
import hashlib
import os
import re
import shutil
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

if __package__:
    from .learning import CATEGORIES, LEVELS, INTERACTIVE_KINDS, course_body, course_hero, course_markdown, course_nav, esc
    from .practice import build_practice
    from .search import build_search
    from .handbooks import validate_supplements, write_handbooks
else:
    from learning import CATEGORIES, LEVELS, INTERACTIVE_KINDS, course_body, course_hero, course_markdown, course_nav, esc
    from practice import build_practice
    from search import build_search
    from handbooks import validate_supplements, write_handbooks

ROOT = Path(__file__).resolve().parents[1]
TECHNOLOGIES = {"Serving", "KV Cache", "vLLM", "SGLang", "LMCache", "Mooncake", "Dynamo", "CUDA", "Triton", "PyTorch", "Ray", "NCCL", "Kubernetes", "Distributed Systems", "Observability", "RSI"}
WORK_MODES = {"remote-global", "remote-regional", "hybrid", "onsite"}
KINDS = {"full-time", "internship", "contract", "research", "open-source"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def https_url(value):
    if not isinstance(value, str):
        return False
    parsed = urlparse(value)
    return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password


def bilingual(value):
    return isinstance(value, dict) and all(nonempty(value.get(lang)) for lang in ("zh", "en"))


def iso_date(value):
    require(isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value), "Use YYYY-MM-DD dates")
    return date.fromisoformat(value)


def validate_records(records, kind, repository, today):
    require(isinstance(records, list), f"{kind}: expected an array")
    ids = set()
    for item in records:
        require(isinstance(item, dict), f"{kind}: records must be objects")
        ident = item.get("id")
        require(isinstance(ident, str) and re.fullmatch(r"[a-z0-9-]+", ident), f"{kind}: invalid id")
        require(ident not in ids, f"{kind}: duplicate id {ident}")
        ids.add(ident)
        require(item.get("status") in ("approved", "pending", "withdrawn"), f"{ident}: invalid status")
        require(bilingual(item.get("summary")), f"{ident}: summary must have zh and en")
        tags = item.get("tags")
        require(isinstance(tags, list) and tags and all(isinstance(t, str) and t in TECHNOLOGIES for t in tags), f"{ident}: invalid tags")
        require(isinstance(item.get("workMode"), str) and item["workMode"] in WORK_MODES, f"{ident}: invalid workMode")
        for key in ("location", "languages", "availability"):
            require(nonempty(item.get(key)), f"{ident}: {key} is required")
        require(https_url(item.get("source")), f"{ident}: https source required")
        source = urlparse(item["source"])
        require(bool(repository) and source.hostname == "github.com" and re.fullmatch(r"/" + re.escape(repository) + r"/issues/[1-9]\d*", source.path) is not None and not source.query and not source.fragment, f"{ident}: source must link to this repository's submission issue")
        updated, expires = iso_date(item.get("updatedAt")), iso_date(item.get("expiresAt"))
        require(updated <= today, f"{ident}: updatedAt cannot be in the future")
        require(0 < (expires - updated).days <= 90, f"{ident}: expiry must be 1–90 days after confirmation")
        require(item.get("consent") is True, f"{ident}: explicit public display consent required")
        if kind == "jobs":
            for key in ("title", "company", "compensation", "eligibility", "seniority"):
                require(nonempty(item.get(key)), f"{ident}: {key} is required")
            require(isinstance(item.get("kind"), str) and item["kind"] in KINDS, f"{ident}: invalid kind")
            require(https_url(item.get("applyUrl")), f"{ident}: official https application URL required")
        else:
            require(nonempty(item.get("name")), f"{ident}: name required")
            profile = urlparse(item.get("github", ""))
            require(https_url(item.get("github")) and profile.hostname == "github.com" and re.fullmatch(r"/[A-Za-z0-9-]+/?", profile.path) is not None, f"{ident}: GitHub profile required")
            require(https_url(item.get("portfolio")), f"{ident}: public portfolio URL required")
            require("targetRole" not in item or bilingual(item["targetRole"]), f"{ident}: targetRole must be bilingual")
    return [x for x in records if x["status"] == "approved" and iso_date(x["expiresAt"]) >= today]


def validate_reviews(records, repository, today):
    require(isinstance(records, list), "reviews: expected an array")
    seen = set()
    for item in records:
        require(isinstance(item, dict), "reviews: expected objects")
        ident = item.get("id")
        require(isinstance(ident, str) and re.fullmatch(r"[a-z0-9-]+", ident) and ident not in seen, "reviews: invalid or duplicate id")
        seen.add(ident)
        require(item.get("status") in ("queued", "in-review", "changes-requested", "reproduced"), f"{ident}: invalid review status")
        require(item.get("consent") is True, f"{ident}: public consent required")
        require(bilingual(item.get("title")) and bilingual(item.get("summary")), f"{ident}: bilingual review text required")
        require(nonempty(item.get("author")) and https_url(item.get("portfolio")), f"{ident}: author and public work required")
        source = urlparse(item.get("source", ""))
        require(https_url(item.get("source")) and source.hostname == "github.com" and repository and re.fullmatch(r"/"+re.escape(repository)+r"/issues/[1-9]\d*", source.path) and not source.query and not source.fragment, f"{ident}: review source must be a submission issue in this repository")
        updated, expires = iso_date(item.get("updatedAt")), iso_date(item.get("expiresAt"))
        require(updated <= today and 0 < (expires-updated).days <= 90, f"{ident}: invalid review dates")
        if item["status"] in ("in-review", "changes-requested", "reproduced"):
            require(nonempty(item.get("reviewer")), f"{ident}: named reviewer required")
        if item["status"] == "reproduced" or "evidence" in item:
            evidence = urlparse(item.get("evidence", ""))
            require(https_url(item.get("evidence")) and evidence.hostname == "github.com" and re.fullmatch(r"/[A-Za-z0-9-]+/[A-Za-z0-9_.-]+/(?:issues/[1-9]\d*|commit/[0-9a-fA-F]{40})", evidence.path) and not evidence.query and (not evidence.fragment or re.fullmatch(r"(?:issuecomment-\d+|r\d+)", evidence.fragment)), f"{ident}: reproduction requires a GitHub issue or pinned commit evidence link")
    return [item for item in records if iso_date(item["expiresAt"]) >= today]


def validate_tracks(tracks):
    require(isinstance(tracks, list) and tracks, "At least one learning track is required")
    ids = set()
    for item in tracks:
        ident = item.get("id")
        require(isinstance(ident, str) and re.fullmatch(r"[a-z0-9-]+", ident) and ident not in ids, "Invalid/duplicate track id")
        ids.add(ident)
        for key in ("title", "subtitle", "description", "hardware", "outcome", "hoursPerDay", "prerequisites"):
            require(bilingual(item.get(key)), f"{ident}: missing bilingual {key}")
        require(nonempty(item.get("number")), f"{ident}: missing number")
        require(isinstance(item.get("tags"), list) and item["tags"] and all(nonempty(tag) for tag in item["tags"]), f"{ident}: invalid tags")
        require(item.get("category") in CATEGORIES, f"{ident}: invalid category")
        require(item.get("level") in LEVELS, f"{ident}: invalid level")
        require(item.get("hardwareTier") in ("cpu", "gpu-optional", "gpu-required", "multi-gpu"), f"{ident}: invalid hardware tier")
        require(iso_date(item.get("lastVerified")) <= datetime.now(timezone.utc).date(), f"{ident}: future source check date")
        require(isinstance(item.get("roles"), dict) and all(isinstance(item["roles"].get(lang), list) and item["roles"][lang] and all(nonempty(role) for role in item["roles"][lang]) for lang in ("zh", "en")), f"{ident}: missing role mapping")
        require(isinstance(item.get("resources"), list) and item["resources"], f"{ident}: no resources")
        for resource in item["resources"]:
            require(nonempty(resource.get("title")) and https_url(resource.get("url")), f"{ident}: invalid resource")
        if "lab" in item:
            lab = item["lab"]
            require(isinstance(lab, dict) and lab.get("path") == ident and bilingual(lab.get("title")) and bilingual(lab.get("description")), f"{ident}: invalid lab package")
        if "environment" in item:
            environment = item["environment"]
            require(isinstance(environment, dict) and all(bilingual(environment.get(key)) for key in ("reference", "minimum", "verified", "unverified")), f"{ident}: incomplete version and environment information")
        duration = item.get("durationDays", 10)
        require(type(duration) is int and duration in (10, 20), f"{ident}: durationDays must be 10 or 20")
        require(isinstance(item.get("steps"), list) and len(item["steps"]) == duration, f"{ident}: lesson count must match durationDays ({duration})")
        for number, step in enumerate(item["steps"], 1):
            require(type(step.get("day")) is int and step["day"] == number, f"{ident}: day numbers must run from 1 to {duration}")
            require(all(bilingual(step.get(key)) for key in ("title", "lesson", "task", "evidence", "noGpu")), f"{ident} day {number}: missing lesson content")
            require(isinstance(step.get("checklist"), dict) and all(isinstance(step["checklist"].get(lang), list) and 2 <= len(step["checklist"][lang]) <= 5 and all(nonempty(check) for check in step["checklist"][lang]) for lang in ("zh", "en")), f"{ident} day {number}: missing acceptance checks")
            require(len(step["checklist"]["zh"]) == len(step["checklist"]["en"]), f"{ident} day {number}: translated checklists must align")
            require(isinstance(step.get("reading"), list) and step["reading"] and all(nonempty(link.get("title")) and https_url(link.get("url")) for link in step["reading"]), f"{ident} day {number}: missing official reading")
            if "code" in step:
                code = step["code"]
                require(isinstance(code, dict) and code.get("language") in ("python", "bash", "text", "yaml", "json", "cpp") and nonempty(code.get("content")) and bilingual(code.get("caption")), f"{ident} day {number}: invalid code sample")
            validate_teaching_step(step, f"{ident} day {number}", required="lab" in item)


def validate_framework_checks(checks, courses, today):
    require(isinstance(checks, list), "framework checks must be an array")
    ids = {course["id"] for course in courses}
    validated = {}
    for record in checks:
        ident = record.get("courseId")
        require(ident in ids and ident not in validated, "framework checks: unknown or repeated course")
        require(iso_date(record.get("checkedAt")) <= today, "framework checks: future date")
        require(bilingual(record.get("scope")) and nonempty(record.get("environment")), "framework checks: describe scope and environment")
        require(isinstance(record.get("commit"), str) and re.fullmatch(r"[0-9a-f]{40}", record["commit"]), "framework checks: exact commit required")
        run = urlparse(record.get("runUrl", ""))
        require(https_url(record.get("runUrl")) and run.hostname == "github.com" and re.fullmatch(r"/[A-Za-z0-9-]+/[A-Za-z0-9_.-]+/actions/runs/[1-9]\d*", run.path), "framework checks: run evidence required")
        require(record.get("manifest") == f'labs/{ident}/validation/{record["checkedAt"]}/manifest.json', "framework checks: invalid manifest path")
        manifest_path = ROOT / "web" / record["manifest"]
        manifest = json.loads(manifest_path.read_text())
        require(manifest.get("status") == "PASS" and manifest.get("commit") == record["commit"] and manifest.get("run_url") == record["runUrl"], "framework checks: inconsistent evidence manifest")
        sources = record.get("sources")
        require(isinstance(sources, dict) and sources, "framework checks: source hashes required")
        for name, digest in sources.items():
            require(re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]*\.py", name), "framework checks: invalid source path")
            require(hashlib.sha256((ROOT / "web/labs" / ident / name).read_bytes()).hexdigest() == digest, f"{ident}: framework example changed; rerun verification or remove the stale verification record")
        require(isinstance(manifest.get("files"), dict) and manifest["files"], "framework checks: raw evidence required")
        for name, digest in manifest["files"].items():
            require(re.fullmatch(r"[A-Za-z0-9_-]+\.(?:json|txt)", name), "framework checks: invalid evidence file")
            require(hashlib.sha256((manifest_path.parent / name).read_bytes()).hexdigest() == digest, "framework checks: raw evidence hash mismatch")
        validated[ident] = record
    return validated


def validate_teaching_step(step, context, required=False):
    """Reject incomplete guided lessons before publishing either language."""
    fields = {
        "explanation": (2, ("title", "body")),
        "walkthrough": (2, ("title", "body")),
        "troubleshooting": (2, ("symptom", "fix")),
        "quiz": (2, ("question", "explanation")),
    }
    for key, (minimum, names) in fields.items():
        if key not in step and not required:
            continue
        entries = step.get(key)
        require(isinstance(entries, list) and len(entries) >= minimum, f"{context}: incomplete {key}")
        for entry in entries:
            require(isinstance(entry, dict) and all(bilingual(entry.get(name)) for name in names), f"{context}: invalid bilingual {key}")
            if key == "walkthrough":
                require("command" not in entry or nonempty(entry["command"]), f"{context}: empty lab command")
                require("expected" not in entry or bilingual(entry["expected"]), f"{context}: invalid expected output")
            if key == "quiz":
                options = entry.get("options")
                require(isinstance(options, list) and len(options) >= 2 and all(bilingual(option) for option in options), f"{context}: invalid quiz options")
                answer = entry.get("answer")
                require(type(answer) is int and 0 <= answer < len(options), f"{context}: invalid quiz answer")
    if required or "diagram" in step:
        diagram = step.get("diagram")
        require(isinstance(diagram, dict) and bilingual(diagram.get("title")) and bilingual(diagram.get("caption")), f"{context}: invalid diagram")
        nodes = diagram.get("nodes")
        require(isinstance(nodes, list) and 3 <= len(nodes) <= 6 and all(bilingual(node) for node in nodes), f"{context}: invalid diagram nodes")
    if "interactive" in step:
        require(step["interactive"] in INTERACTIVE_KINDS, f"{context}: unknown interactive diagram")


def package_labs(courses, out):
    """Ship only source material, with a stable extraction root for commands."""
    for course in courses:
        if "lab" not in course:
            continue
        ident = course["lab"]["path"]
        folder = out / "labs" / ident
        require(folder.is_dir() and not folder.is_symlink(), f"{ident}: missing lab source directory")
        require((folder / "README.md").is_file(), f"{ident}: missing lab README")
        with zipfile.ZipFile(out / "labs" / f"{ident}.zip", "w", zipfile.ZIP_DEFLATED) as archive:
            for source in sorted(folder.rglob("*")):
                require(not source.is_symlink(), f"{ident}: lab packages cannot contain symlinks")
                if not source.is_file():
                    continue
                parts = source.relative_to(folder).parts
                if any(part.startswith(".") or part in ("__pycache__", "out", "outputs", "results", "output", "artifacts") for part in parts) or source.suffix == ".pyc":
                    continue
                archive.write(source, str(source.relative_to(out / "labs")))


def validate_paths(paths, courses):
    ids = {course["id"] for course in courses}
    seen = set()
    require(isinstance(paths, list) and paths, "Career paths must be a nonempty array")
    for path in paths:
        require(nonempty(path.get("id")) and path["id"] not in seen, "Duplicate or missing career path id")
        seen.add(path["id"])
        require(bilingual(path.get("title")) and bilingual(path.get("description")), "Career paths must be bilingual")
        require(isinstance(path.get("courses"), list) and path["courses"] and all(ident in ids for ident in path["courses"]), f"{path['id']}: unknown course reference")
        required, electives = path.get("requiredCourses"), path.get("electiveCourses")
        require(isinstance(required, list) and required and isinstance(electives, list), f"{path['id']}: required/elective groups missing")
        require(all(ident in ids for ident in required + electives), f"{path['id']}: unknown requirement reference")
        require(len(set(required + electives)) == len(required + electives), f"{path['id']}: overlapping/duplicate requirements")
        require(path["courses"] == required + electives, f"{path['id']}: course order must match required then elective")


def public_site_url(repository):
    if not repository:
        return ""
    owner, repo = repository.split("/")
    return f"https://{owner}.github.io/" + ("" if repo.lower() == f"{owner.lower()}.github.io" else f"{repo}/")


def validate_projects(document, courses):
    require(isinstance(document, dict) and document.get("schemaVersion") == 1, "Unsupported project library schema")
    require(iso_date(document.get("updatedAt")) <= datetime.now(timezone.utc).date(), "Project review date cannot be in the future")
    projects = document.get("projects")
    require(isinstance(projects, list) and projects, "Project library cannot be empty")
    course_ids = {course["id"] for course in courses}
    ids = set()
    for project in projects:
        ident = project.get("id")
        require(isinstance(ident, str) and re.fullmatch(r"[a-z0-9-]+", ident) and ident not in ids, "Invalid or duplicate project id")
        ids.add(ident)
        for key in ("title", "summary", "level", "duration", "problem", "scenario", "environment", "evidenceBoundary"):
            require(bilingual(project.get(key)), f"{ident}: missing bilingual {key}")
        require(nonempty(project.get("category")) and isinstance(project.get("cpuStart"), bool), f"{ident}: invalid project filters")
        require(isinstance(project.get("tags"), list) and project["tags"] and all(nonempty(tag) for tag in project["tags"]), f"{ident}: missing project tags")
        for key in ("roles", "deliverables", "acceptance"):
            value = project.get(key)
            require(isinstance(value, dict) and all(isinstance(value.get(lang), list) and value[lang] and all(nonempty(item) for item in value[lang]) for lang in ("zh", "en")), f"{ident}: missing bilingual {key}")
            require(len(value["zh"]) == len(value["en"]), f"{ident}: translated {key} must align")
        steps = project.get("steps")
        require(isinstance(steps, list) and 3 <= len(steps) <= 6 and all(bilingual(step.get("title")) and bilingual(step.get("body")) for step in steps), f"{ident}: incomplete project steps")
        prerequisites = project.get("prerequisites")
        require(isinstance(prerequisites, list) and prerequisites and all(item.get("id") in course_ids and bilingual(item.get("title")) for item in prerequisites), f"{ident}: unknown prerequisite course")
        sources = project.get("sources")
        require(isinstance(sources, list) and sources and all(nonempty(item.get("title")) and https_url(item.get("url")) for item in sources), f"{ident}: invalid official source")
    return projects


def write_course_pages(courses, out, repository, projects):
    template = (ROOT / "web/course.html").read_text(encoding="utf-8")
    base = public_site_url(repository)
    bench_cases = {"foundations": "batch-v1", "vllm": "prefix-v1", "llm-d": "upgrade-v1"}
    for course in courses:
        folder = out / "learn" / course["id"]
        folder.mkdir(parents=True)
        project = next((item for item in projects if any(ref["id"] == course["id"] for ref in item["prerequisites"])), None)
        project_query = f'?project={project["id"]}' if project else ""
        bench_case = bench_cases.get(course["id"])
        bench_link = (
            f'<a class="text-link" href="../../bench/?case={bench_case}" data-i18n="benchLab">推理压测复盘台</a>'
            if bench_case else ""
        )
        replacements = {
            "__COURSE_TITLE__": esc(course["title"]["zh"]),
            "__COURSE_DAYS__": str(len(course["steps"])),
            "__COURSE_DESCRIPTION__": esc(course["description"]["zh"]),
            "__COURSE_URL__": esc(f"{base}learn/{course['id']}/"),
            "__REPO_URL__": esc(f"https://github.com/{repository}" if repository else "https://github.com"),
            "__COURSE_HERO__": course_hero(course),
            "__COURSE_NAV__": course_nav(course),
            "__COURSE_CONTENT__": course_body(course, repository),
            "__PROJECT_URL__": esc(f"../../projects/{project_query}"),
            "__PORTFOLIO_URL__": esc(f"../../portfolio/{project_query}"),
            "__PRACTICE_URL__": esc(f"../../practice/?course={course['id']}"),
            "__BENCH_LINK__": bench_link,
            "__SEARCH_URL__": esc(f"../../search/?course={course['id']}&kind=lesson"),
        }
        page = template
        for key, value in replacements.items():
            page = page.replace(key, value)
        (folder / "index.html").write_text(page, encoding="utf-8")
        for lang in ("zh", "en"):
            (folder / f"{course['id']}.{lang}.md").write_text(course_markdown(course, lang, base), encoding="utf-8")
    if base:
        locations = [base] + [f"{base}{section}/" for section in ("start", "knowledge", "cases", "bench", "practice", "search", "projects", "portfolio", "career", "applications", "talent", "hiring")] + [f"{base}learn/{course['id']}/" for course in courses]
        (out / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(f"<url><loc>{esc(location)}</loc></url>" for location in locations) + "</urlset>\n", encoding="utf-8")


def build():
    config = read_json("site.config.json")
    repository = os.environ.get("GITHUB_REPOSITORY") or config.get("repository", "")
    require(isinstance(repository, str) and (not repository or re.fullmatch(r"[A-Za-z0-9-]+/[A-Za-z0-9_.-]+", repository)), "repository must be OWNER/REPO")
    now = datetime.now(timezone.utc)
    tracks = sorted([json.loads(file.read_text(encoding="utf-8")) for file in (ROOT / "content/courses").glob("*.json")], key=lambda course: course["number"])
    validate_tracks(tracks)
    framework_checks = validate_framework_checks(read_json("content/framework-checks.json"), tracks, now.date())
    paths = read_json("content/paths.json")
    validate_paths(paths, tracks)
    for course in tracks:
        if course["id"] in framework_checks:
            course["verification"] = framework_checks[course["id"]]
        required_for = [path for path in paths if course["id"] in path["requiredCourses"]]
        common = len(required_for) == len(paths)
        course["curriculum"] = {
            "common": common,
            "requiredFor": [path["id"] for path in required_for],
            "label": {
                "zh": "所有路线共同必修" if common else ("岗位必修 · " + " / ".join(path["title"]["zh"] for path in required_for) if required_for else "方向选修 · 按项目需要选择"),
                "en": "Common core for every path" if common else ("Role core · " + " / ".join(path["title"]["en"] for path in required_for) if required_for else "Elective · choose for your project")
            }
        }
    projects = validate_projects(read_json("web/projects/projects.json"), tracks)
    topics = read_json("web/knowledge/topics.json")["topics"]
    cases = read_json("web/cases/cases.json")["cases"]
    validate_supplements(topics, cases, tracks)
    reviews = validate_reviews(read_json("content/reviews.json"), repository, now.date())
    summaries = [{**{key: value for key, value in course.items() if key != "steps"}, "steps": [{"day": step["day"], "title": step["title"]} for step in course["steps"]]} for course in tracks]
    data = {
        "repository": repository,
        "generatedAt": now.isoformat(),
        "tracks": summaries,
        "paths": paths,
        "categories": CATEGORIES,
        "technologies": sorted(TECHNOLOGIES),
        "jobs": validate_records(read_json("content/jobs.json"), "jobs", repository, now.date()),
        "people": validate_records(read_json("content/people.json"), "people", repository, now.date()),
    }
    out = ROOT / "dist"
    if out.is_symlink():
        raise ValueError("dist cannot be a symlink")
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "web", out, ignore=shutil.ignore_patterns("course.html", "__pycache__", "*.pyc", ".DS_Store", "out", "outputs", "results", "output", "artifacts"))
    package_labs(tracks + [{"lab": {"path": "diagnostics"}}], out)
    write_course_pages(tracks, out, repository, projects)
    build_practice(tracks, out)
    build_search(tracks, projects, topics, cases, out)
    write_handbooks(topics, cases, out, public_site_url(repository))
    (out / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / "reviews.json").write_text(json.dumps(reviews, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / ".nojekyll").touch()
    print(f"Built dist/: {len(tracks)} tracks, {len(projects)} practice projects, {len(data['jobs'])} jobs, {len(data['people'])} public profiles.")
    if not repository:
        print("Local preview: submission links activate when deployed from a GitHub repository.")


if __name__ == "__main__":
    build()
