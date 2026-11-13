"""Executable, isolated checks for SGLang, LMCache and Dynamo teaching kits."""
import csv
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
COURSES = ('sglang', 'lmcache', 'dynamo')


class InferenceCurriculaTests(unittest.TestCase):
    def invoke(self, course, *args, expected_code=0):
        folder = ROOT / 'web' / 'labs' / course
        # Each subprocess has its own imports. Never share a common.py from a different kit.
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
        result = subprocess.run([sys.executable, *args], cwd=folder, env=env,
                                text=True, capture_output=True, timeout=15)
        self.assertEqual(result.returncode, expected_code, result.stdout + result.stderr)
        return result.stdout

    def export(self, course, variant, folder):
        self.invoke(course, 'lab.py', 'day10', '--variant', variant, '--out', str(folder))
        return {i: json.loads((folder / ('day%02d.json' % i)).read_text())['result']
                for i in range(1, 10)}

    def test_every_day_runs_without_packages(self):
        with tempfile.TemporaryDirectory() as temporary:
            for course in COURSES:
                for variant in ('base', 'changed'):
                    for day in range(1, 11):
                        with self.subTest(course=course, variant=variant, day=day):
                            folder = Path(temporary) / course / variant / str(day)
                            self.invoke(course, 'lab.py', 'day' + str(day), '--variant', variant, '--out', str(folder))
                            file = folder / ('day%02d.json' % min(day, 9))
                            data = json.loads(file.read_text())
                            self.assertEqual(data['evidence'], 'simulated')
                            self.assertEqual(data['variant'], variant)

    def test_report_hashes_and_raw_rows(self):
        with tempfile.TemporaryDirectory() as temporary:
            for course in COURSES:
                folder = Path(temporary) / course
                self.export(course, 'base', folder)
                manifest = json.loads((folder / 'manifest.json').read_text())
                self.assertEqual(len(manifest['files']), 9)
                for name, digest in manifest['files'].items():
                    self.assertEqual(hashlib.sha256((folder / name).read_bytes()).hexdigest(), digest)
                with (folder / 'results.csv').open(newline='') as source:
                    rows = list(csv.DictReader(source))
                self.assertEqual(len(rows), 9)
                self.assertTrue(all(row['evidence'] == 'simulated' for row in rows))
                self.assertIn('TODO', (folder / 'REPORT.md').read_text())

    def test_selfcheck_and_reference_are_distinguished_from_student(self):
        for course in COURSES:
            with self.subTest(course=course):
                self.assertIn('PASS', self.invoke(course, 'lab.py', 'selfcheck'))
                self.assertIn('REFERENCE only', self.invoke(course, 'check.py', '--reference'))
                self.assertIn('NOT YET', self.invoke(course, 'check.py', expected_code=1))

    def test_sglang_cache_and_tail_latency_counterexamples(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = self.export('sglang', 'base', Path(temporary) / 'base')
            changed = self.export('sglang', 'changed', Path(temporary) / 'changed')
        self.assertEqual(base[3]['short_p95_ms'], changed[3]['short_p95_ms'])
        self.assertEqual((base[3]['overall_p95_ms'], changed[3]['overall_p95_ms']), (90, 130))
        self.assertEqual((base[4]['hits'], changed[4]['hits']), (1, 2))
        self.assertLess(changed[5]['max_single_prefill_block_ms'], base[5]['max_single_prefill_block_ms'])
        self.assertGreater(changed[5]['interleaving_overhead_ms'], base[5]['interleaving_overhead_ms'])
        self.assertAlmostEqual(base[7]['expected_ms'], 16)
        self.assertAlmostEqual(changed[7]['expected_ms'], 46)
        self.assertEqual(changed[8]['pipeline_ceiling_requests_per_s'], 5)
        self.assertIsNone(changed[9]['successful_p95_ms'])
        self.assertEqual(changed[9]['success_rate'], 0)

    def test_lmcache_identity_alignment_and_recompute_counterexamples(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = self.export('lmcache', 'base', Path(temporary) / 'base')
            changed = self.export('lmcache', 'changed', Path(temporary) / 'changed')
        self.assertTrue(base[3]['equal'])
        self.assertFalse(changed[3]['equal'])
        self.assertEqual((base[4]['retrieved_total'], changed[4]['retrieved_total']), (512, 0))
        self.assertEqual((base[5]['uncached_tail_tokens'], changed[5]['uncached_tail_tokens']), (232, 104))
        self.assertEqual((base[6]['restore_ms'], changed[6]['restore_ms']), (25, 405))
        self.assertFalse(changed[6]['beneficial'])
        self.assertFalse(changed[7]['accept'])
        self.assertEqual((base[8]['critical_path_ms'], changed[8]['critical_path_ms']), (100, 140))
        self.assertEqual((base[9]['failures'], changed[9]['failures']), (0, 1))

    def test_dynamo_readiness_goodput_routing_and_cleanup(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = self.export('dynamo', 'base', Path(temporary) / 'base')
            changed = self.export('dynamo', 'changed', Path(temporary) / 'changed')
        self.assertEqual((len(base[2]['eligible']), len(changed[2]['eligible'])), (2, 1))
        self.assertEqual((base[3]['goodput_fraction'], changed[3]['goodput_fraction']), (.5, .25))
        self.assertEqual((base[4]['selected_worker'], changed[4]['selected_worker']), (0, 1))
        self.assertEqual((base[5]['ideal_requests_per_s'], changed[5]['ideal_requests_per_s']), (12.5, 5))
        self.assertEqual(changed[6]['latest']['a']['state'], 'removed')
        self.assertEqual((base[7]['maximum_backlog'], changed[7]['maximum_backlog']), (5, 15))
        self.assertFalse(changed[8]['fits_capacity'])
        self.assertEqual((base[9]['resources_held'], changed[9]['resources_held']), (0, 1))

    def test_invalid_physical_values_do_not_generate_infinite_rates(self):
        for course in COURSES:
            self.invoke(course, '-c', "from common import positive\nfor value in [0,-1,True,float('nan'),float('inf')]:\n try: positive(value)\n except ValueError: pass\n else: raise AssertionError(value)")

    def test_copyable_steps_and_standalone_packages(self):
        for course in COURSES:
            data = json.loads((ROOT / 'content' / 'courses' / (course + '.json')).read_text())
            self.assertEqual(data['hardwareTier'], 'gpu-optional')
            self.assertEqual(data['lab']['path'], course)
            self.assertEqual(len(data['steps']), 10)
            self.assertGreaterEqual(sum(bool(step.get('interactive')) for step in data['steps']), 3)
            first_command = data['steps'][0]['walkthrough'][0]['command']
            self.assertIn('unzip ' + course + '.zip\ncd ' + course, first_command)
            for step in data['steps']:
                self.assertGreaterEqual(len(step['explanation']), 2)
                self.assertGreaterEqual(len(step['diagram']['nodes']), 3)
                self.assertGreaterEqual(len(step['troubleshooting']), 2)
                self.assertGreaterEqual(len(step['quiz']), 2)
                for walkthrough in step['walkthrough']:
                    if 'command' in walkthrough:
                        self.assertNotIn('\\n', walkthrough['command'])
                        self.assertTrue(walkthrough.get('expected'))
            folder = ROOT / 'web' / 'labs' / course
            for name in ('common.py', 'lab.py', 'README.md', 'student.py', 'solutions.py', 'check.py'):
                self.assertTrue((folder / name).is_file())


if __name__ == '__main__':
    unittest.main()
