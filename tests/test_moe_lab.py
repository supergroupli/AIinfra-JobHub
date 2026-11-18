import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'web/labs/moe-systems'


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, FOLDER / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


lab = load('moe_test_lab', 'lab.py')
checker = load('moe_test_checker', 'check_exercises.py')
reference = load('moe_test_reference', 'reference.py')


class MoELabTests(unittest.TestCase):
    def args(self, **changes):
        values = dict(tokens=16, topk=2, skew=0, capacity_factor=1.25, bandwidth=25, seed=7)
        return argparse.Namespace(**dict(values, **changes))

    def test_dispatch_conservation_and_independent_oracle_across_workloads(self):
        for tokens in (2, 7, 16, 31):
            for topk in (1, 2, 4):
                for skew in (0, 0.5, 1):
                    with self.subTest(tokens=tokens, topk=topk, skew=skew):
                        data = lab.workload(tokens, topk, skew)
                        buckets = lab.dispatch(data)
                        self.assertEqual(sum(map(len, buckets)), tokens * topk)
                        self.assertEqual({r['token'] for b in buckets for r in b}, set(range(tokens)))
                        self.assertLess(lab.max_error(lab.execute(data), lab.oracle(data)), 1e-12)
                        for row in data['routes']:
                            self.assertAlmostEqual(sum(w for _, w in row), 1)

    def test_wrong_mapping_detected_even_when_counts_are_conserved(self):
        result = lab.daily(5, self.args())
        self.assertTrue(result['assignment_count_unchanged'])
        self.assertLess(result['correct_error'], 1e-12)
        self.assertGreater(result['permuted_token_error'], 1)

    def test_capacity_dropping_changes_semantics_and_expansion_restores(self):
        dropped = lab.daily(7, self.args(skew=1))
        full = lab.daily(7, self.args(skew=1, capacity_factor=2))
        self.assertEqual(dropped['capacity'], 10)
        self.assertGreaterEqual(dropped['dropped_assignments'], 6)
        self.assertGreater(dropped['error_after_drop'], 0)
        self.assertEqual(full['dropped_assignments'], 0)
        self.assertLess(full['error_after_drop'], 1e-12)

    def test_quantization_zero_outlier_and_error_bound(self):
        self.assertEqual(lab.quantize([0, 0])['restored'], [0, 0])
        for values in ([0, 1, 100], [-2, -0.1, 0.7, 2], [1]):
            result = lab.quantize(values)
            self.assertTrue(all(-127 <= x <= 127 for x in result['integers']))
            self.assertTrue(all(abs(a - b) <= result['scale'] / 2 + 1e-12 for a, b in zip(values, result['restored'])))
        self.assertIn('NOT-FP8', lab.daily(9, self.args())['scheme'])

    def test_traffic_payload_and_roofline_units(self):
        data = lab.workload()
        traffic = lab.traffic(data)
        self.assertEqual(traffic['remote_assignments'] + traffic['local_assignments'], 32)
        payload = lab.daily(12, self.args())
        faster = lab.daily(12, self.args(bandwidth=50))
        self.assertEqual(payload['roundtrip_payload_bytes'], traffic['remote_assignments'] * 16384)
        self.assertAlmostEqual(payload['payload_lower_bound_us'], faster['payload_lower_bound_us'] * 2)
        roof = lab.roofline(1, h=4, bandwidth=1, tflops=1)
        self.assertEqual(roof['flops'], 32)
        self.assertEqual(roof['cold_bytes'], 48)
        self.assertEqual(roof['lower_bound_ms'], max(roof['compute_ms'], roof['memory_ms']))

    def test_actual_cpu_timings_and_reference_checker_boundaries(self):
        measured = lab.daily(17, self.args())
        self.assertEqual(measured['evidence'], 'measured-python-cpu-only')
        self.assertEqual(len(measured['samples_ns']), 7)
        self.assertTrue(all(type(n) is int and n > 0 for n in measured['samples_ns']))
        self.assertFalse(measured['gpu_executed'])
        checker.check(reference)
        student = load('moe_test_student', 'exercises.py')
        with self.assertRaises(NotImplementedError):
            checker.check(student)

    def test_all_commands_from_a_clean_lab_copy_and_manifest(self):
        import shutil
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary) / 'moe-systems'
            shutil.copytree(FOLDER, folder, ignore=shutil.ignore_patterns('out', '__pycache__'))
            for day in range(1, 21):
                result = subprocess.run([sys.executable, 'lab.py', f'day{day}', '--out', 'out'], cwd=folder, capture_output=True, text=True, timeout=15)
                self.assertEqual(result.returncode, 0, result.stderr)
                record = json.loads((folder / 'out' / f'day{day:02d}.json').read_text())
                self.assertEqual(record['day'], day)
                self.assertFalse(record['gpu_executed'])
            manifest = json.loads((folder / 'out/manifest.json').read_text())
            self.assertEqual(len(manifest['files']), 21)
            for filename, digest in manifest['files'].items():
                self.assertEqual(hashlib.sha256((folder / 'out' / filename).read_bytes()).hexdigest(), digest)
            self.assertIn('TODO', (folder / 'out/REPORT.md').read_text())

    def test_invalid_cli_values_are_rejected(self):
        for flag, value in (('--tokens', '0'), ('--topk', '5'), ('--skew', 'nan'), ('--bandwidth', '0'), ('--capacity-factor', '-1')):
            result = subprocess.run([sys.executable, str(FOLDER / 'lab.py'), 'day1', flag, value], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
