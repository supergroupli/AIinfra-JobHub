import copy
import json
import unittest
from datetime import date
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import html
import re

from scripts.build import validate_reviews, validate_framework_checks
from scripts.learning import course_body

ROOT = Path(__file__).resolve().parents[1]
REPO = "supergroupli/AIinfra-JobHub"


class ReviewPublicationTest(unittest.TestCase):
    def record(self):
        return {"id":"test-only", "title":{"zh":"测试作品", "en":"Test work"}, "summary":{"zh":"本人贡献", "en":"Own contribution"}, "author":"Test author", "portfolio":"https://github.com/example/project", "source":f"https://github.com/{REPO}/issues/1", "status":"queued", "consent":True, "updatedAt":"2026-11-13", "expiresAt":"2026-12-13"}

    def test_reproduced_claim_needs_a_reviewer_and_pinned_evidence(self):
        entry=self.record()
        self.assertEqual(len(validate_reviews([entry],REPO,date(2026,11,13))),1)
        entry["status"]="reproduced"
        with self.assertRaises(ValueError):validate_reviews([entry],REPO,date(2026,11,13))
        entry["reviewer"]="Named reviewer"
        with self.assertRaises(ValueError):validate_reviews([entry],REPO,date(2026,11,13))
        entry["evidence"]="https://github.com/example/project/commit/"+"a"*40
        self.assertEqual(len(validate_reviews([entry],REPO,date(2026,11,13))),1)
        entry["evidence"]="https://github.com/example/project"
        with self.assertRaises(ValueError):validate_reviews([entry],REPO,date(2026,11,13))

    def test_missing_consent_wrong_source_and_expiry_are_not_published(self):
        for mutation in ({"consent":False}, {"source":"https://example.com/1"}, {"status":"in-review"}, {"updatedAt":"2027-01-01"}):
            entry={**self.record(),**mutation}
            with self.subTest(mutation=mutation), self.assertRaises(ValueError): validate_reviews([entry],REPO,date(2026,11,13))
        self.assertEqual(validate_reviews([self.record()],REPO,date(2026,12,14)),[])

    def test_help_drafts_include_lesson_context_without_private_notes(self):
        course=json.loads((ROOT/"content/courses/vllm.json").read_text())
        document=course_body(course,REPO)
        urls=[html.unescape(x) for x in re.findall(r'href="([^"]+)"',document) if '/issues/new?' in x]
        self.assertEqual(len(urls),10)
        for day,url in enumerate(urls,1):
            query=parse_qs(urlparse(url).query)
            self.assertEqual(query["template"],["03-project-feedback.yml"])
            self.assertIn(f"vllm Day {day}",query["target"][0])
            self.assertNotIn("body",query)

    def test_verified_framework_claim_is_bound_to_current_source_hashes(self):
        records=json.loads((ROOT/"content/framework-checks.json").read_text())
        courses=[{"id":"ray"},{"id":"pytorch-distributed"}]
        verified=validate_framework_checks(records,courses,date(2026,11,13))
        self.assertEqual(set(verified),{"ray","pytorch-distributed"})
        changed=copy.deepcopy(records)
        first=next(iter(changed[0]["sources"]))
        changed[0]["sources"][first]="0"*64
        with self.assertRaises(ValueError):validate_framework_checks(changed,courses,date(2026,11,13))


if __name__ == "__main__":unittest.main()
