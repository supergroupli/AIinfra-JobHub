"""Publication-boundary tests: consent, moderation, expiry and link safety."""
import copy
import unittest
from datetime import date

from scripts.build import validate_records


class PublicationRulesTest(unittest.TestCase):
    def setUp(self):
        self.today = date(2026, 11, 13)
        self.repository = "community/test"
        self.job = {
            "id": "fixture-job", "status": "approved", "consent": True,
            "title": "Test role", "company": "Test fixture only",
            "summary": {"zh": "测试数据，不是职位", "en": "Test fixture, not a real job"},
            "tags": ["vLLM"], "workMode": "remote-regional", "location": "Test region",
            "languages": "English", "availability": "Test hours", "eligibility": "Test region only",
            "source": "https://github.com/community/test/issues/1",
            "updatedAt": "2026-11-01", "expiresAt": "2026-12-01",
            "kind": "full-time", "compensation": "Test compensation", "seniority": "Test level",
            "applyUrl": "https://example.org/test-only",
        }

    def validate(self, *items):
        return validate_records(list(items), "jobs", self.repository, self.today)

    def test_only_reviewed_active_records_publish(self):
        pending = dict(self.job, id="pending", status="pending")
        withdrawn = dict(self.job, id="withdrawn", status="withdrawn")
        expired = dict(self.job, id="expired", expiresAt="2026-11-12")
        self.assertEqual(self.validate(pending, self.job, withdrawn, expired), [self.job])

    def test_no_implicit_consent(self):
        for consent in (False, None, "true"):
            with self.subTest(consent=consent), self.assertRaises(ValueError):
                self.validate(dict(self.job, consent=consent))

    def test_reject_unsafe_application_links(self):
        for url in ("javascript:alert(1)", "data:text/html,test", "http://example.org", "https://user:secret@example.org"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                self.validate(dict(self.job, applyUrl=url))

    def test_require_submission_issue_in_own_repository(self):
        for url in ("https://github.com/other/repo/issues/1", "https://github.com/community/test/issues/1/extra", "https://github.com.evil.test/community/test/issues/1"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                self.validate(dict(self.job, source=url))

    def test_reject_duplicate_ids_and_stale_confirmation(self):
        with self.assertRaises(ValueError):
            self.validate(self.job, copy.deepcopy(self.job))
        with self.assertRaises(ValueError):
            self.validate(dict(self.job, expiresAt="2027-11-01"))
        with self.assertRaises(ValueError):
            self.validate(dict(self.job, updatedAt="2026-11-14"))

    def test_expiry_day_is_inclusive(self):
        self.assertEqual(len(self.validate(dict(self.job, expiresAt="2026-11-13"))), 1)

    def test_profile_requires_public_evidence_and_github_identity(self):
        person = dict(self.job, name="Test builder", github="https://github.com/test-builder", portfolio="https://example.org/project")
        self.assertEqual(len(validate_records([person], "people", self.repository, self.today)), 1)
        for changes in ({"github": "https://example.org/person"}, {"portfolio": "javascript:alert(1)"}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                validate_records([dict(person, **changes)], "people", self.repository, self.today)


if __name__ == "__main__":
    unittest.main()
