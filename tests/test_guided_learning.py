"""Publication boundaries for downloadable, bilingual teaching materials."""
import copy
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from scripts.build import package_labs, validate_teaching_step, validate_tracks
from scripts.learning import course_body, course_markdown

ROOT = Path(__file__).resolve().parents[1]


class GuidedLearningTest(unittest.TestCase):
    def courses(self):
        return [json.loads(path.read_text()) for path in sorted((ROOT / "content/courses").glob("*.json"))]

    def test_all_guided_courses_are_complete(self):
        self.assertEqual(len(self.courses()), 15)
        for course in self.courses():
            self.assertEqual(course["lab"]["path"], course["id"])
            validate_tracks([course])
            self.assertGreaterEqual(len({step["interactive"] for step in course["steps"] if step.get("interactive")}), 3)
            for step in course["steps"]:
                validate_teaching_step(step, course["id"], required=True)
                self.assertTrue(any(item.get("command") for item in step["walkthrough"]))
                self.assertTrue(any(item.get("expected") for item in step["walkthrough"]))

    def test_quiz_cannot_publish_invalid_answer_or_missing_translation(self):
        step = self.courses()[0]["steps"][0]
        for answer in (-1, len(step["quiz"][0]["options"]), True, "0"):
            invalid = copy.deepcopy(step)
            invalid["quiz"][0]["answer"] = answer
            with self.subTest(answer=answer), self.assertRaises(ValueError):
                validate_teaching_step(invalid, "invalid")
        invalid = copy.deepcopy(step)
        invalid["quiz"][0]["explanation"].pop("en")
        with self.assertRaises(ValueError):
            validate_teaching_step(invalid, "missing translation")

    def test_lab_path_cannot_escape_its_course(self):
        course = self.courses()[0]
        course["lab"]["path"] = "../../private"
        with self.assertRaises(ValueError):
            validate_tracks([course])

    def test_downloads_include_explanations_commands_errors_and_quizzes(self):
        for course in self.courses():
            for lang in ("zh", "en"):
                document = course_markdown(course, lang)
                for step in course["steps"]:
                    self.assertIn(step["explanation"][0]["body"][lang], document)
                    self.assertIn(step["troubleshooting"][0]["fix"][lang], document)
                    self.assertIn(step["quiz"][0]["explanation"][lang], document)
                    for item in step["walkthrough"]:
                        if "command" in item:
                            self.assertIn(item["command"], document)

    def test_new_prose_and_commands_are_escaped_in_html(self):
        course = self.courses()[0]
        payload = '<img src=x onerror="alert(1)">'
        step = course["steps"][0]
        step["explanation"][0]["body"]["zh"] = payload
        step["walkthrough"][0]["command"] = payload
        step["quiz"][0]["explanation"]["en"] = payload
        document = course_body(course)
        self.assertNotIn(payload, document)
        self.assertIn("&lt;img", document)

    def test_zip_extracts_with_expected_root_without_generated_results(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            lab = root / "labs" / "demo"
            lab.mkdir(parents=True)
            (lab / "README.md").write_text("Read me")
            (lab / "lab.py").write_text("print('ready')")
            (lab / "outputs").mkdir()
            (lab / "outputs" / "personal-report.md").write_text("Do not distribute")
            (lab / ".local").write_text("Do not distribute")
            package_labs([{"lab": {"path": "demo"}}], root)
            with zipfile.ZipFile(root / "labs/demo.zip") as archive:
                self.assertEqual(set(archive.namelist()), {"demo/README.md", "demo/lab.py"})


if __name__ == "__main__":
    unittest.main()
