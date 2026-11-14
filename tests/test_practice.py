import copy
import json
import tempfile
import unittest
from pathlib import Path
from scripts.practice import question_bank, build_practice

ROOT = Path(__file__).resolve().parents[1]
class PracticeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.courses = [json.loads(p.read_text()) for p in (ROOT/'content/courses').glob('*.json')]
    def test_every_original_question_and_source_is_preserved(self):
        bank=question_bank(self.courses)
        expected_count=sum(len(step['quiz']) for course in self.courses for step in course['steps'])
        self.assertEqual(len(bank['questions']),expected_count)
        self.assertEqual(len({q['id'] for q in bank['questions']}),expected_count)
        by_id={c['id']:c for c in self.courses}
        for q in bank['questions']:
            source=by_id[q['course']]['steps'][q['day']-1]['quiz'][q['number']-1]
            for key in ('question','options','answer','explanation'):self.assertEqual(q[key],source[key])
            self.assertRegex(q['fingerprint'],r'^[a-f0-9]{64}$')
    def test_fingerprint_changes_with_content_but_not_course_input_order(self):
        before=question_bank(self.courses)
        self.assertEqual(before,question_bank(list(reversed(self.courses))))
        changed=copy.deepcopy(self.courses)
        changed[0]['steps'][0]['quiz'][0]['explanation']['en']+=' Clarified.'
        after=question_bank(changed)
        self.assertEqual([q['id'] for q in before['questions']],[q['id'] for q in after['questions']])
        self.assertEqual(sum(a['fingerprint']!=b['fingerprint'] for a,b in zip(before['questions'],after['questions'])),1)
    def test_rejects_invalid_answers_and_incomplete_bilingual_options(self):
        for mutate in (lambda q:q.update(answer=True),lambda q:q.update(answer=99),lambda q:q['options'][0].pop('en'),lambda q:q['explanation'].update(zh='')):
            courses=copy.deepcopy(self.courses);mutate(courses[0]['steps'][0]['quiz'][0])
            with self.assertRaises(ValueError):question_bank(courses)
    def test_builds_portable_question_json_without_private_state(self):
        with tempfile.TemporaryDirectory() as out:
            bank=build_practice(self.courses,Path(out))
            self.assertEqual(json.loads((Path(out)/'practice/questions.json').read_text()),bank)
            self.assertNotIn('records',bank)
