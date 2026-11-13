"""Check curriculum completeness and the publication boundary for lesson text."""
import copy
import json
import unittest
from pathlib import Path

from scripts.build import validate_paths, validate_tracks
from scripts.learning import course_body, course_markdown, course_nav

ROOT = Path(__file__).resolve().parents[1]


class LearningLibraryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.courses = [json.loads(path.read_text()) for path in (ROOT / "content/courses").glob("*.json")]
        cls.course = next(item for item in cls.courses if item["id"] == "vllm")

    def test_published_curriculum_and_paths_are_complete(self):
        self.assertGreaterEqual(len(self.courses), 11)
        validate_tracks(self.courses)
        validate_paths(json.loads((ROOT / "content/paths.json").read_text()), self.courses)

    def test_incomplete_or_duplicate_days_block_publication(self):
        for mutation in ("missing", "duplicate", "missing-english"):
            course = copy.deepcopy(self.course)
            if mutation == "missing":
                course["steps"].pop()
            elif mutation == "duplicate":
                course["steps"][1]["day"] = 1
            else:
                course["steps"][0]["lesson"].pop("en")
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                validate_tracks([course])

    def test_unknown_path_reference_is_rejected(self):
        paths = [{"id": "test", "title": {"zh": "测试", "en": "Test"}, "description": {"zh": "测试", "en": "Test"}, "courses": ["does-not-exist"]}]
        with self.assertRaises(ValueError):
            validate_paths(paths, self.courses)

    def test_primary_source_urls_cannot_execute_script(self):
        course = copy.deepcopy(self.course)
        course["steps"][0]["reading"][0]["url"] = "javascript:alert(1)"
        with self.assertRaises(ValueError):
            validate_tracks([course])

    def test_lesson_text_and_embedded_metadata_are_escaped(self):
        course = copy.deepcopy(self.course)
        payload = '</script><script>alert("untrusted")</script>'
        course["steps"][0]["lesson"]["zh"] = payload
        course["title"]["en"] = payload
        rendered = course_body(course)
        self.assertNotIn(payload, rendered)
        self.assertIn("&lt;/script&gt;", rendered)
        self.assertIn("\\u003c/script\\u003e", rendered)

    def test_both_downloads_and_navigation_include_all_ten_days(self):
        for lang in ("zh", "en"):
            markdown = course_markdown(self.course, lang)
            self.assertEqual(sum(line.startswith("## ") for line in markdown.splitlines()), 10)
            self.assertIn(self.course["steps"][9]["lesson"][lang], markdown)
        nav = course_nav(self.course)
        for day in range(1, 11):
            self.assertIn(f'href="#day-{day}"', nav)


if __name__ == "__main__":
    unittest.main()
