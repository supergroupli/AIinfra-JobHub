import copy
import json
import unittest
from pathlib import Path
from scripts.build import validate_paths
from scripts.learning import interactive_panel, INTERACTIVE_KINDS
from scripts.teaching_models import MODELS

ROOT = Path(__file__).resolve().parents[1]


class CurriculumTest(unittest.TestCase):
    def test_required_elective_partition_rejects_duplicates_and_unknown_courses(self):
        paths = json.loads((ROOT / "content/paths.json").read_text())
        courses = [{"id": path.stem} for path in (ROOT / "content/courses").glob("*.json")]
        validate_paths(paths, courses)
        for mutation in ("duplicate", "unknown", "order"):
            bad = copy.deepcopy(paths)
            if mutation == "duplicate":
                bad[0]["electiveCourses"].append(bad[0]["requiredCourses"][0])
            elif mutation == "unknown":
                bad[0]["requiredCourses"].append("missing")
            else:
                bad[0]["courses"].reverse()
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                validate_paths(bad, courses)

    def test_models_render_their_controls_and_no_javascript_example(self):
        for kind, model in MODELS.items():
            with self.subTest(kind=kind):
                self.assertIn(kind, INTERACTIVE_KINDS)
                html = interactive_panel(kind, 4)
                self.assertIn(model["example"]["zh"], html)
                self.assertIn("<noscript>", html)
                for key, *_ in model["inputs"]:
                    self.assertIn(f'id="sim-4-{kind}-{key}"', html)
                    self.assertIn(f'data-sim-input="{key}"', html)


if __name__ == "__main__":
    unittest.main()
