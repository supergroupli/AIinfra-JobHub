#!/usr/bin/env python3
"""Validate curated public records and build a dependency-free static site."""
import json
import os
import re
import shutil
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
TECHNOLOGIES = {"Serving", "KV Cache", "vLLM", "SGLang", "LMCache", "CUDA", "Triton", "Kubernetes", "Distributed Systems"}
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
        for key in ("title", "subtitle", "description", "hardware", "outcome"):
            require(bilingual(item.get(key)), f"{ident}: missing bilingual {key}")
        require(nonempty(item.get("number")), f"{ident}: missing number")
        require(isinstance(item.get("tags"), list) and item["tags"] and all(tag in TECHNOLOGIES for tag in item["tags"]), f"{ident}: invalid tags")
        require(isinstance(item.get("resources"), list) and item["resources"], f"{ident}: no resources")
        for resource in item["resources"]:
            require(nonempty(resource.get("title")) and https_url(resource.get("url")), f"{ident}: invalid resource")
        require(isinstance(item.get("steps"), list) and item["steps"], f"{ident}: no steps")
        for step in item["steps"]:
            require(all(bilingual(step.get(key)) for key in ("title", "task", "evidence")), f"{ident}: invalid step")


def build():
    config = read_json("site.config.json")
    repository = os.environ.get("GITHUB_REPOSITORY") or config.get("repository", "")
    require(isinstance(repository, str) and (not repository or re.fullmatch(r"[A-Za-z0-9-]+/[A-Za-z0-9_.-]+", repository)), "repository must be OWNER/REPO")
    now = datetime.now(timezone.utc)
    tracks = read_json("content/tracks.json")
    validate_tracks(tracks)
    data = {
        "repository": repository,
        "generatedAt": now.isoformat(),
        "tracks": tracks,
        "jobs": validate_records(read_json("content/jobs.json"), "jobs", repository, now.date()),
        "people": validate_records(read_json("content/people.json"), "people", repository, now.date()),
    }
    out = ROOT / "dist"
    if out.is_symlink():
        raise ValueError("dist cannot be a symlink")
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "web", out)
    (out / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / ".nojekyll").touch()
    print(f"Built dist/: {len(tracks)} tracks, {len(data['jobs'])} jobs, {len(data['people'])} public profiles.")
    if not repository:
        print("Local preview: submission links activate when deployed from a GitHub repository.")


if __name__ == "__main__":
    build()
