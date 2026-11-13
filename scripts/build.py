#!/usr/bin/env python3
"""Validate curated public records and build a dependency-free static site."""
import json
import os
import re
import shutil
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

if __package__:
    from .learning import CATEGORIES, LEVELS, course_body, course_hero, course_markdown, course_nav, esc
else:
    from learning import CATEGORIES, LEVELS, course_body, course_hero, course_markdown, course_nav, esc

ROOT = Path(__file__).resolve().parents[1]
TECHNOLOGIES = {"Serving", "KV Cache", "vLLM", "SGLang", "LMCache", "Mooncake", "Dynamo", "CUDA", "Triton", "PyTorch", "Ray", "NCCL", "Kubernetes", "Distributed Systems", "Observability"}
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
    return [x for x in records if x["status"] == "approved" and iso_date(x["expiresAt"]) >= today]


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
        require(isinstance(item.get("steps"), list) and len(item["steps"]) == 10, f"{ident}: courses must contain exactly 10 days")
        for number, step in enumerate(item["steps"], 1):
            require(step.get("day") == number, f"{ident}: day numbers must run from 1 to 10")
            require(all(bilingual(step.get(key)) for key in ("title", "lesson", "task", "evidence", "noGpu")), f"{ident} day {number}: missing lesson content")
            require(isinstance(step.get("checklist"), dict) and all(isinstance(step["checklist"].get(lang), list) and 2 <= len(step["checklist"][lang]) <= 5 and all(nonempty(check) for check in step["checklist"][lang]) for lang in ("zh", "en")), f"{ident} day {number}: missing acceptance checks")
            require(len(step["checklist"]["zh"]) == len(step["checklist"]["en"]), f"{ident} day {number}: translated checklists must align")
            require(isinstance(step.get("reading"), list) and step["reading"] and all(nonempty(link.get("title")) and https_url(link.get("url")) for link in step["reading"]), f"{ident} day {number}: missing official reading")
            if "code" in step:
                code = step["code"]
                require(isinstance(code, dict) and code.get("language") in ("python", "bash", "text", "yaml", "json", "cpp") and nonempty(code.get("content")) and bilingual(code.get("caption")), f"{ident} day {number}: invalid code sample")


def validate_paths(paths, courses):
    ids = {course["id"] for course in courses}
    seen = set()
    require(isinstance(paths, list) and paths, "Career paths must be a nonempty array")
    for path in paths:
        require(nonempty(path.get("id")) and path["id"] not in seen, "Duplicate or missing career path id")
        seen.add(path["id"])
        require(bilingual(path.get("title")) and bilingual(path.get("description")), "Career paths must be bilingual")
        require(isinstance(path.get("courses"), list) and path["courses"] and all(ident in ids for ident in path["courses"]), f"{path['id']}: unknown course reference")


def public_site_url(repository):
    if not repository:
        return ""
    owner, repo = repository.split("/")
    return f"https://{owner}.github.io/" + ("" if repo.lower() == f"{owner.lower()}.github.io" else f"{repo}/")


def write_course_pages(courses, out, repository):
    template = (ROOT / "web/course.html").read_text(encoding="utf-8")
    base = public_site_url(repository)
    for course in courses:
        folder = out / "learn" / course["id"]
        folder.mkdir(parents=True)
        replacements = {
            "__COURSE_TITLE__": esc(course["title"]["zh"]),
            "__COURSE_DESCRIPTION__": esc(course["description"]["zh"]),
            "__COURSE_URL__": esc(f"{base}learn/{course['id']}/"),
            "__REPO_URL__": esc(f"https://github.com/{repository}" if repository else "https://github.com"),
            "__COURSE_HERO__": course_hero(course),
            "__COURSE_NAV__": course_nav(course),
            "__COURSE_CONTENT__": course_body(course),
        }
        page = template
        for key, value in replacements.items():
            page = page.replace(key, value)
        (folder / "index.html").write_text(page, encoding="utf-8")
        for lang in ("zh", "en"):
            (folder / f"{course['id']}.{lang}.md").write_text(course_markdown(course, lang), encoding="utf-8")
    if base:
        locations = [base] + [f"{base}learn/{course['id']}/" for course in courses]
        (out / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(f"<url><loc>{esc(location)}</loc></url>" for location in locations) + "</urlset>\n", encoding="utf-8")


def build():
    config = read_json("site.config.json")
    repository = os.environ.get("GITHUB_REPOSITORY") or config.get("repository", "")
    require(isinstance(repository, str) and (not repository or re.fullmatch(r"[A-Za-z0-9-]+/[A-Za-z0-9_.-]+", repository)), "repository must be OWNER/REPO")
    now = datetime.now(timezone.utc)
    tracks = sorted([json.loads(file.read_text(encoding="utf-8")) for file in (ROOT / "content/courses").glob("*.json")], key=lambda course: course["number"])
    validate_tracks(tracks)
    paths = read_json("content/paths.json")
    validate_paths(paths, tracks)
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
    shutil.copytree(ROOT / "web", out, ignore=shutil.ignore_patterns("course.html"))
    write_course_pages(tracks, out, repository)
    (out / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / ".nojekyll").touch()
    print(f"Built dist/: {len(tracks)} tracks, {len(data['jobs'])} jobs, {len(data['people'])} public profiles.")
    if not repository:
        print("Local preview: submission links activate when deployed from a GitHub repository.")


if __name__ == "__main__":
    build()
