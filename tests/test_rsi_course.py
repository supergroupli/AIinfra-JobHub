"""Published RSI teaching content must match its actual local lab."""
import json
import math
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
COURSE = json.loads((ROOT / 'content/courses/rsi-infra.json').read_text())
LAB = ROOT / 'web/labs/rsi-infra'


class RSICourseTests(unittest.TestCase):
    def test_twenty_substantial_bilingual_days_and_forty_explained_questions(self):
        self.assertEqual(COURSE['durationDays'], 20)
        self.assertEqual([s['day'] for s in COURSE['steps']], list(range(1, 21)))
        self.assertEqual(sum(len(s['quiz']) for s in COURSE['steps']), 40)
        for day in COURSE['steps']:
            with self.subTest(day=day['day']):
                for lang in ('zh', 'en'):
                    self.assertGreater(len(day['lesson'][lang]), 80)
                    self.assertGreaterEqual(len(day['explanation']), 3)
                    self.assertTrue(all(len(p['body'][lang]) > 30 for p in day['explanation']))
                    self.assertTrue(all(q['explanation'][lang] for q in day['quiz']))
                self.assertTrue(3 <= len(day['diagram']['nodes']) <= 6)
                self.assertEqual(day['walkthrough'][0]['command'], f"python3 lab.py day{day['day']} --out out")
                self.assertIn(f"python3 -m json.tool out/day{day['day']:02d}.json", [step.get('command') for step in day['walkthrough']])
                self.assertGreaterEqual(len(day['troubleshooting']), 2)
                for quiz in day['quiz']:
                    self.assertTrue(0 <= quiz['answer'] < len(quiz['options']))
        self.assertEqual({s['interactive'] for s in COURSE['steps'] if 'interactive' in s}, {'rsi-budget', 'rsi-gain', 'rsi-retests'})

    def test_primary_readings_and_no_claim_of_framework_reproduction(self):
        hosts={'arxiv.org','github.com','deepmind.google','sakana.ai','scikit-learn.org','docs.python.org','sre.google','www.infinigence-ai.com','docs.vllm.ai','docs.sglang.ai'}
        for source in COURSE['resources']:
            parsed=urlparse(source['url']);self.assertEqual(parsed.scheme,'https');self.assertIn(parsed.hostname,hosts)
        self.assertIn('不复现', COURSE['hardware']['zh'])
        self.assertIn('does not reproduce', COURSE['hardware']['en'])
        self.assertIn('不是生产', COURSE['steps'][5]['quiz'][1]['options'][1]['zh'])
        self.assertIn('-4.0', COURSE['steps'][15]['walkthrough'][0]['expected']['en'])
        self.assertIn('engine_commands_executed=false', COURSE['steps'][16]['walkthrough'][0]['expected']['en'])

    def test_original_worked_arithmetic_and_correctness_counterexample(self):
        self.assertEqual(sum([10,11,9,100,10])/5,28)
        self.assertAlmostEqual(1/(.6+.4/2),1.25)
        self.assertEqual(sum(i*i for i in range(4)),14)
        self.assertEqual(4*3*7//6,14)
        self.assertEqual(4*5*9//6,30)
        self.assertEqual((10-2-2)//2,3)
        self.assertEqual(len(set(['t1','t2','t2','t3','t4'])),4)
        self.assertTrue(math.isclose(100/90,200/180))

    def test_published_final_command_reproduces_all_daily_artifacts_and_stated_outcomes(self):
        with tempfile.TemporaryDirectory() as directory:
            run=subprocess.run([sys.executable,'lab.py','day20','--out',directory],cwd=LAB,text=True,capture_output=True,timeout=30)
            self.assertEqual(run.returncode,0,run.stdout+run.stderr)
            output=Path(directory)
            daily={n:json.loads((output/f'day{n:02d}.json').read_text()) for n in range(1,21)}
            for n,row in daily.items():
                self.assertEqual(row['day'],n)
                self.assertEqual(len(row['input_sha256']),64)
                self.assertEqual(len(row['source_sha256']),64)
            self.assertEqual(daily[1]['baseline']['cost_ms'],229)
            self.assertAlmostEqual(daily[1]['candidate']['cost_ms'],13.3)
            self.assertTrue(daily[2]['contract_changed'])
            self.assertFalse(daily[5]['buggy_candidate']['correct'])
            self.assertEqual(len(daily[6]['rejected_proposals']),3)
            self.assertEqual(daily[7]['failed_units'],2)
            self.assertEqual(daily[7]['remaining_units'],0)
            self.assertEqual(daily[8]['candidate_count'],12)
            self.assertTrue(daily[12]['same_as_uninterrupted'])
            self.assertEqual(daily[12]['charged_units'],4)
            self.assertFalse(daily[13]['claim_accepted'])
            self.assertTrue(daily[13]['evaluator_edit_detected'])
            self.assertEqual(len(daily[14]['experience']),4)
            self.assertTrue(daily[15]['rank_changed'])
            self.assertTrue(daily[16]['equal_total_units'])
            self.assertEqual(daily[16]['heldout_cost_difference_ms'],-4.0)
            self.assertFalse(daily[17]['engine_commands_executed'])
            self.assertTrue(daily[18]['promoted'])
            self.assertTrue(daily[18]['rollback']['restored'])
            for n in (4,9):
                self.assertEqual(daily[n]['evidence'],'measured-cpu')
                self.assertEqual(len(daily[n]['samples']),7)
            self.assertTrue((output/'REPORT.md').is_file());self.assertTrue((output/'manifest.json').is_file())


if __name__=='__main__': unittest.main()
