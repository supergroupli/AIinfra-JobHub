"""Keep a first visit, the paper lesson and the offline workbook usable together."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZipFile

from scripts.build import package_labs, validate_tracks, write_course_pages
from scripts.learning import PRIMER_EXAMPLES, course_body, course_markdown

ROOT = Path(__file__).resolve().parents[1]


class Nodes(HTMLParser):
    def __init__(self, document):
        super().__init__()
        self.tags = []
        self.feed(document)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class InferencePrimerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.course = json.loads((ROOT / "content/courses/inference-101.json").read_text())
        cls.foundations = json.loads((ROOT / "content/courses/foundations.json").read_text())

    def test_first_lesson_works_on_paper_and_the_built_reader_loads_only_its_own_extras(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            write_course_pages([self.course, self.foundations], out, "test/JobHub", [])
            page = (out / "learn/inference-101/index.html").read_text()
            other = (out / "learn/foundations/index.html").read_text()
            self.assertIn('href="../inference-101/#day-1"', other)
            self.assertNotIn('src="../../labs/inference-101/activities.js"', other)
            self.assertNotIn("course-study-tools", page)
            self.assertIn("test.github.io/JobHub/learn/inference-101/", page)
            self.assertIn('href="../foundations/#day-1"', page)
            self.assertIn('src="../../labs/inference-101/activities.js"', page)
            self.assertLess(page.index('src="../../labs/inference-101/activities.js"'), page.index('src="../../primer-card.js"'))
            self.assertIn("test.github.io/JobHub/learn/inference-101/", (out / "sitemap.xml").read_text())
            tags = Nodes(page).tags
            ids = [attrs["id"] for _, attrs in tags if "id" in attrs]
            self.assertEqual(len(ids), len(set(ids)))
            note_days = [int(attrs["data-notes"]) for tag, attrs in tags if tag == "textarea" and "data-notes" in attrs]
            self.assertEqual(note_days, list(range(1, 11)))
            self.assertIn("download-card", ids)
            first = page.split('id="day-1"', 1)[1].split('id="day-2"', 1)[0]
            self.assertIn('data-primer-lab="predict"', first)
            self.assertIn(PRIMER_EXAMPLES["primer-predict"][0], first)
            self.assertNotIn("lab.py", first)
            self.assertNotIn('class="lab-download"', first)

    def test_lessons_cover_the_three_experiments_and_each_has_a_bilingual_check(self):
        validate_tracks([self.course])
        self.assertEqual(self.course["format"], "primer")
        self.assertEqual({s["interactive"] for s in self.course["steps"] if "interactive" in s}, set(PRIMER_EXAMPLES))
        self.assertEqual(self.course["steps"][-1]["interactive"], "primer-queue")
        self.assertTrue(all(len(s["quiz"]) >= 2 for s in self.course["steps"]))
        page = course_body(self.course)
        for code, expected in PRIMER_EXAMPLES.items():
            self.assertIn('data-primer-lab="' + code.removeprefix("primer-") + '"', page)
            for lang, text in zip(("zh", "en"), expected):
                self.assertIn(text, course_markdown(self.course, lang))

    def test_offline_zip_runs_the_same_lab_assets_and_optional_script(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            shutil.copytree(ROOT / "web/labs/inference-101", out / "labs/inference-101")
            package_labs([self.course], out)
            with ZipFile(out / "labs/inference-101.zip") as archive:
                self.assertTrue({f"inference-101/{name}" for name in ("index.html", "lab.css", "activities.js", "lab.py", "README.md")}.issubset(archive.namelist()))
                entry = Nodes(archive.read("inference-101/index.html").decode())
                self.assertEqual({attrs["data-primer-lab"] for _, attrs in entry.tags if "data-primer-lab" in attrs}, {"predict", "tokens", "queue"})
                archive.extractall(out / "extracted")
            for ahead, pieces, first, full in ((0, 3, 1, 3), (2, 3, 5, 7), (2, 5, 5, 9), (1, 1, 3, 3)):
                result = subprocess.run([sys.executable, "lab.py", "--ahead", str(ahead), "--pieces", str(pieces)],
                                        cwd=out / "extracted/inference-101", text=True, capture_output=True, check=True)
                self.assertEqual(result.stdout.strip(), f"first={first} s, full={full} s")


if __name__ == "__main__":
    unittest.main()
