"""Block broken project references or executable source links before publication."""
import copy
import json
import unittest
from pathlib import Path

from scripts.build import validate_projects

ROOT = Path(__file__).resolve().parents[1]


class ProjectPublicationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.document = json.loads((ROOT / "web/projects/projects.json").read_text())
        cls.courses = [json.loads(path.read_text()) for path in (ROOT / "content/courses").glob("*.json")]

    def test_project_library_has_valid_course_links_and_evidence(self):
        projects = validate_projects(self.document, self.courses)
        self.assertTrue(any(project["cpuStart"] for project in projects))

    def test_broken_links_or_missing_evidence_block_publication(self):
        for mutation in ("course", "source", "evidence", "duplicate"):
            document = copy.deepcopy(self.document)
            project = document["projects"][0]
            if mutation == "course":
                project["prerequisites"][0]["id"] = "not-a-course"
            elif mutation == "source":
                project["sources"][0]["url"] = "javascript:alert(1)"
            elif mutation == "evidence":
                project["evidenceBoundary"].pop("en")
            else:
                document["projects"].append(copy.deepcopy(project))
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                validate_projects(document, self.courses)


if __name__ == "__main__":
    unittest.main()
