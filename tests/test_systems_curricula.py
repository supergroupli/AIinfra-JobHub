"""Meaningful CPU, framing and evidence-boundary checks for systems courses."""
import copy
import csv
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
COURSES = ('mooncake', 'ray', 'kubernetes')


def load(course):
    path = ROOT / 'web/labs' / course / 'lab.py'
    spec = importlib.util.spec_from_file_location('systems_' + course, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ChunkSocket:
    def __init__(self, chunks):
        self.chunks = iter(chunks)

    def recv(self, count):
        chunk = next(self.chunks, b'')
        assert len(chunk) <= count
        return chunk


class SystemsCurriculaTests(unittest.TestCase):
    def invoke(self, course, *args, expected=0):
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
        result = subprocess.run([sys.executable, *args], cwd=ROOT / 'web/labs' / course,
                                env=env, text=True, capture_output=True, timeout=15)
        self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
        return result.stdout

    def test_partial_tcp_reads_and_truncation(self):
        lab = load('mooncake')
        self.assertEqual(lab.recv_exact(ChunkSocket([b'a', b'bc']), 3), b'abc')
        self.assertEqual(lab.recv_exact(ChunkSocket([]), 0), b'')
        with self.assertRaises(EOFError):
            lab.recv_exact(ChunkSocket([b'ab']), 3)

    def test_real_tcp_preserves_bytes_and_labels_evidence(self):
        lab = load('mooncake')
        for size in (1, 65537):
            result = lab.tcp_roundtrip(size)
            self.assertTrue(result['verified'])
            self.assertEqual(result['received_bytes'], size)
            self.assertEqual(result['sha256'], hashlib.sha256(bytes(i % 251 for i in range(size))).hexdigest())
            self.assertEqual(result['evidence'], 'measured-local-tcp')
            self.assertIn('Not Mooncake', result['boundary'])
        with self.assertRaises(ValueError):
            lab.tcp_roundtrip(1048577)

    def test_transfer_units_capacity_lifetime_and_identity(self):
        lab = load('mooncake')
        self.assertAlmostEqual(lab.transfer_ms(100_000_000, 10), 10.2)
        self.assertEqual(lab.transfer_ms(0, 1), .2)
        self.assertEqual(lab.replicas(8, 2), 20)
        with self.assertRaises(ValueError):
            lab.transfer_ms(10, 0)
        with self.assertRaises(ValueError):
            lab.replicas(8, 2, 1)
        self.assertEqual(lab.experiment(3)['owned_snapshot'], 'ABC')
        self.assertEqual(lab.experiment(3)['borrowed_after_mutation'], 'ZBC')
        self.assertNotEqual(lab.key('a', 'v1', [1]), lab.key('b', 'v1', [1]))
        self.assertFalse(lab.experiment(7)['compatible'])
        self.assertEqual(lab.experiment(9)['apply_count'], 1)

    def test_bounded_work_preserves_ids_and_accepts_empty_input(self):
        lab = load('ray')
        for limit in (1, 2, 7):
            result, peak = lab.bounded_map(range(101), limit)
            self.assertEqual(result, [x*x for x in range(101)])
            self.assertLessEqual(peak, limit)
        self.assertEqual(lab.bounded_map([], 2), ([], 0))
        with self.assertRaises(ValueError):
            lab.bounded_map([1], 0)

    def test_backlog_fractional_resources_and_partial_batch(self):
        lab = load('ray')
        self.assertEqual(lab.capacity(4, 1.5), 2)
        self.assertEqual(lab.capacity(0, 1), 0)
        self.assertEqual(lab.backlog(50, 2, 50, 10), 100)
        self.assertEqual(lab.backlog(30, 2, 50, 10), 0)
        with self.assertRaises(ValueError):
            lab.backlog(10, 1, 0, 10)
        self.assertEqual(lab.experiment(7)['batch_sizes'], [3, 3, 2])
        self.assertEqual(len(lab.experiment(7)['output']), 8)
        self.assertEqual(lab.experiment(9)['retry_side_effect_count'], 2)
        self.assertEqual(lab.experiment(6)['sum'], 328350)

    def test_cpu_memory_gpu_bottlenecks_and_scaling_bounds(self):
        lab = load('kubernetes')
        self.assertEqual(lab.slots(4000, 8192, 500, 1024), 8)
        self.assertEqual(lab.slots(4000, 1024, 500, 1024), 1)
        self.assertEqual(lab.slots(500, 8192, 500, 1024), 1)
        self.assertEqual(lab.slots(4000, 8192, 500, 1024, 0, 1), 0)
        self.assertEqual(lab.slots(4000, 8192, 500, 1024, 2, 1), 2)
        self.assertEqual(lab.desired_replicas(2, 90, 60), 3)
        self.assertEqual(lab.desired_replicas(2, 0, 60), 1)
        self.assertEqual(lab.desired_replicas(2, 999, 60), 10)
        with self.assertRaises(ValueError):
            lab.slots(4000, 8192, 0, 1024)

    def test_manifest_catches_service_and_probe_mismatch(self):
        lab = load('kubernetes')
        original = json.loads((ROOT / 'web/labs/kubernetes/manifests.json').read_text())
        self.assertEqual(lab.validate_manifest(original)['status'], 'PASS')
        wrong = copy.deepcopy(original)
        service = next(item for item in wrong['items'] if item['kind'] == 'Service')
        service['spec']['selector']['app'] = 'nonexistent'
        with self.assertRaises(AssertionError):
            lab.validate_manifest(wrong)
        wrong = copy.deepcopy(original)
        deployment = next(item for item in wrong['items'] if item['kind'] == 'Deployment')
        deployment['spec']['template']['spec']['containers'][0]['readinessProbe']['httpGet']['port'] = 9999
        with self.assertRaises(AssertionError):
            lab.validate_manifest(wrong)

    def test_ten_daily_commands_and_report_hashes(self):
        with tempfile.TemporaryDirectory() as tmp:
            for course in COURSES:
                out = Path(tmp) / course
                for day in range(1, 11):
                    with self.subTest(course=course, day=day):
                        self.invoke(course, 'lab.py', 'day' + str(day), '--out', str(out))
                with (out / 'summary.csv').open(newline='') as source:
                    rows = list(csv.DictReader(source))
                self.assertEqual(len(rows), 9)
                for row in rows:
                    raw = (out / ('day%02d.json' % int(row['day']))).read_bytes()
                    self.assertEqual(row['sha256'], hashlib.sha256(raw).hexdigest())
                    self.assertEqual(row['evidence'], json.loads(raw)['evidence'])
                self.assertIn('TODO', (out / 'REPORT.md').read_text())
                self.assertIn('source_sha256', json.loads((out / 'environment.json').read_text()))

    def test_independent_assignment_does_not_claim_reference_completion(self):
        for course in COURSES:
            self.assertIn('PASS', self.invoke(course, 'lab.py', 'selfcheck'))
            self.assertIn('REFERENCE ONLY', self.invoke(course, 'check.py', '--reference'))
            self.assertIn('NOT YET', self.invoke(course, 'check.py', expected=1))


if __name__ == '__main__':
    unittest.main()
