"""Check publication contracts for the advanced courses and version metadata."""
import copy
import json
import unittest
from pathlib import Path
from scripts.build import validate_tracks
from scripts.learning import course_hero, course_markdown
from scripts.frontier_models import MODELS

ROOT = Path(__file__).resolve().parents[1]
IDS = ("post-training", "llm-d", "moe-systems")


class FrontierCoursesTest(unittest.TestCase):
    def test_new_curricula_have_complete_days_and_relevant_interactives(self):
        used = set()
        for ident in IDS:
            course = json.loads((ROOT / f"content/courses/{ident}.json").read_text())
            validate_tracks([course])
            self.assertEqual(course["durationDays"], 20)
            self.assertEqual(len(course["steps"]), 20)
            self.assertEqual(sum(len(day["quiz"]) for day in course["steps"]), 40)
            self.assertEqual(len({day["title"]["en"] for day in course["steps"]}), 20)
            kinds = {day["interactive"] for day in course["steps"] if day.get("interactive")}
            self.assertEqual(len(kinds), 3)
            self.assertFalse(used & kinds)
            used |= kinds
            for day in course["steps"]:
                self.assertTrue(day["diagram"]["caption"]["en"])
                self.assertTrue(any(step.get("command") for step in day["walkthrough"]))
        self.assertEqual(used, set(MODELS))

    def test_environment_is_translated_escaped_and_preserved_offline(self):
        course = json.loads((ROOT / "content/courses/post-training.json").read_text())
        course["environment"]["reference"] = {"zh": "<script>基线</script>", "en": "<script>baseline</script>"}
        page = course_hero(course)
        self.assertIn("&lt;script&gt;基线&lt;/script&gt;", page)
        self.assertNotIn("<script>基线", page)
        for lang in ("zh", "en"):
            markdown = course_markdown(course, lang)
            for value in course["environment"].values():
                self.assertIn(value[lang], markdown)
        for field in ("reference", "minimum", "verified", "unverified"):
            bad = copy.deepcopy(course)
            del bad["environment"][field]["en"]
            with self.assertRaises(ValueError):
                validate_tracks([bad])


if __name__ == "__main__":
    unittest.main()
