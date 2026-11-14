"""Keep legacy ten-day guides and new twenty-day courses consistent end to end."""
import copy
import json
import re
import tempfile
import unittest
from pathlib import Path

from scripts.build import validate_tracks, write_course_pages
from scripts.learning import course_hero, course_body, course_markdown, course_nav

ROOT = Path(__file__).resolve().parents[1]


class CourseDurationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.legacy = json.loads((ROOT / "content/courses/vllm.json").read_text())

    def extended(self):
        course = copy.deepcopy(self.legacy)
        course["id"] = "duration-fixture"
        course["lab"]["path"] = course["id"]
        course["durationDays"] = 20
        course["steps"] += copy.deepcopy(course["steps"])
        for number, step in enumerate(course["steps"], 1):
            step["day"] = number
        return course

    def test_explicit_duration_is_strict_and_legacy_omission_stays_ten(self):
        validate_tracks([self.legacy, self.extended()])
        for duration in (0, 11, 19, 21, "20", True, 20.0, None):
            course = self.extended()
            course["durationDays"] = duration
            with self.subTest(duration=duration), self.assertRaises(ValueError):
                validate_tracks([course])
        for mutation in ("missing-duration", "missing-day", "repeated-day", "bool-day"):
            course = self.extended()
            if mutation == "missing-duration": course.pop("durationDays")
            if mutation == "missing-day": course["steps"].pop()
            if mutation == "repeated-day": course["steps"][19]["day"] = 19
            if mutation == "bool-day": course["steps"][0]["day"] = True
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                validate_tracks([course])

    def test_twenty_day_rendering_keeps_all_content_pagination_and_bilingual_downloads(self):
        course = self.extended()
        body, hero, nav = course_body(course), course_hero(course), course_nav(course)
        self.assertIn("20 天实战学习", hero)
        self.assertIn("Download the 20-day guide", hero)
        self.assertIn('href="#day-20"', nav)
        self.assertIn("DAY 20 / 20", body)
        day10 = body.split('id="day-10"', 1)[1].split('id="day-11"', 1)[0]
        self.assertIn('href="#day-11"', day10)
        day20 = body.split('id="day-20"', 1)[1]
        self.assertNotIn('href="#day-21"', day20)
        self.assertIn("Build my portfolio", day20)
        meta = json.loads(re.search(r'<script type="application/json" id="course-meta">(.*?)</script>', body).group(1))
        self.assertEqual(meta["durationDays"], 20)
        self.assertEqual(len(meta["steps"]), 20)
        for language in ("zh", "en"):
            markdown = course_markdown(course, language)
            self.assertEqual(sum(line.startswith("## ") for line in markdown.splitlines()), 20)
            self.assertIn("20-day guide" if language == "en" else "20 天实战学习", markdown.splitlines()[0])
            self.assertIn(course["steps"][19]["lesson"][language], markdown)

    def test_generated_html_has_correct_native_progress_title_and_no_remaining_duration_placeholder(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_course_pages([self.legacy, self.extended()], root, "example/JobHub", [])
            for ident, days in (("vllm", 10), ("duration-fixture", 20)):
                html = (root / "learn" / ident / "index.html").read_text()
                self.assertIn(f'<progress id="course-progress" max="{days}"', html)
                self.assertIn(f'{days} 天学习目录', html)
                self.assertIn(f' · {days} 天实战 · 聘枢</title>', html)
                self.assertNotIn("__COURSE_DAYS__", html)
                self.assertIn(f'?course={ident}', html)
                self.assertEqual((root / "learn" / ident / f"{ident}.en.md").read_text().splitlines()[0].count(f"{days}-day guide"), 1)


if __name__ == "__main__":
    unittest.main()
