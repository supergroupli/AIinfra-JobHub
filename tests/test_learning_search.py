import copy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from scripts.search import build_search, text_for
from scripts.handbooks import validate_supplements, write_handbooks

ROOT = Path(__file__).resolve().parents[1]


class LearningSearchTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.courses = [json.loads(p.read_text()) for p in (ROOT / 'content/courses').glob('*.json')]
        cls.projects = json.loads((ROOT / 'web/projects/projects.json').read_text())['projects']
        cls.topics = json.loads((ROOT / 'web/knowledge/topics.json').read_text())['topics']
        cls.cases = json.loads((ROOT / 'web/cases/cases.json').read_text())['cases']

    def test_index_preserves_deep_explanations_and_unique_destinations(self):
        with TemporaryDirectory() as directory:
            data = build_search(self.courses, self.projects, self.topics, self.cases, Path(directory))
            self.assertEqual(len(data['entries']), sum(len(c['steps']) for c in self.courses) + len(self.projects) + len(self.topics) + len(self.cases))
            self.assertEqual(len({entry['id'] for entry in data['entries']}), len(data['entries']))
            day = next(e for e in data['entries'] if e['course'] == 'vllm' and e['day'] == 1)
            self.assertIn('python3 lab.py selfcheck', day['text']['en'])
            self.assertEqual(json.loads((Path(directory) / 'search/index.json').read_text()), data)
        self.assertEqual(text_for({'zh': ['一', '二'], 'en': ['one', 'two']}, 'en'), 'one\ntwo')

    def test_quiz_answers_and_case_solutions_are_not_search_snippets(self):
        courses = copy.deepcopy(self.courses)
        courses[0]['steps'][0]['quiz'][0]['explanation'] = {'zh': 'QUIZ_SECRET', 'en': 'QUIZ_SECRET'}
        cases = copy.deepcopy(self.cases)
        cases[0]['resolution'] = {'zh': 'CASE_SOLUTION', 'en': 'CASE_SOLUTION'}
        with TemporaryDirectory() as directory:
            data = build_search(courses, [], [], cases, Path(directory))
            self.assertNotIn('QUIZ_SECRET', json.dumps(data))
            self.assertNotIn('CASE_SOLUTION', json.dumps(data))

    def test_invalid_targets_duplicates_and_broken_lessons_stop_publication(self):
        with TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                build_search(self.courses + self.courses, [], [], [], Path(directory))
            bad = copy.deepcopy(self.topics)
            bad[0]['id'] = '../elsewhere'
            with self.assertRaises(ValueError):
                build_search([], [], bad, [], Path(directory))
        for mutation in ('lesson', 'source', 'related'):
            topics = copy.deepcopy(self.topics)
            if mutation == 'lesson': topics[0]['lessons'][0]['day'] = 999
            if mutation == 'source': topics[0]['sources'][0]['url'] = 'javascript:alert(1)'
            if mutation == 'related': topics[0]['related'] = ['missing-topic']
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                validate_supplements(topics, self.cases, self.courses)

    def test_bilingual_handbooks_keep_examples_explanations_sources_and_deep_links(self):
        validate_supplements(self.topics, self.cases, self.courses)
        with TemporaryDirectory() as directory:
            root = Path(directory)
            write_handbooks(self.topics, self.cases, root, 'https://example.test/JobHub/')
            for section, records in [('knowledge', self.topics), ('cases', self.cases)]:
                for lang in ('zh', 'en'):
                    result = (root / section / f'handbook.{lang}.md').read_text()
                    self.assertEqual(sum(line.startswith('## ') for line in result.splitlines()), len(records))
                    self.assertIn(records[0]['sources'][0]['url'], result)
                    self.assertIn('https://example.test/JobHub/learn/', result)
                    self.assertIn('lang=' + lang + '#day-', result)
                    if section == 'cases': self.assertIn(records[0]['command'], result)


if __name__ == '__main__':
    unittest.main()
