import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / 'web/labs/rsi-infra/lab.py'
spec = importlib.util.spec_from_file_location('rsi_lab_tested', LAB)
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


class RSILabTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data, cls.input_hash = lab.load_workloads(lab.DEFAULT_INPUT)
        cls.args = argparse.Namespace(seed=7, budget=8, memory_limit=1536, repetitions=3)

    def invoke(self, *args, ok=True):
        result = subprocess.run([sys.executable, str(LAB), *args], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0 if ok else 2, result.stdout + result.stderr)
        return result

    def test_all_twenty_actual_commands_and_export_hashes(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / 'reports'
            for day in range(1, 21):
                with self.subTest(day=day):
                    self.invoke('day' + str(day), '--out', str(out), '--repetitions', '3')
                    value = json.loads((out / ('day%02d.json' % day)).read_text())
                    self.assertEqual(value['day'], day)
                    self.assertEqual(value['input_sha256'], self.input_hash)
                    self.assertEqual(value['source_sha256'], hashlib.sha256(LAB.read_bytes()).hexdigest())
            manifest = json.loads((out / 'manifest.json').read_text())
            self.assertEqual(len(manifest['outputs']), 21)
            for filename, expected in manifest['outputs'].items():
                self.assertEqual(hashlib.sha256((out / filename).read_bytes()).hexdigest(), expected)
            self.assertIn('generated execution evidence', (out / 'REPORT.md').read_text())

    def test_exact_independent_oracle_and_per_output_rejection(self):
        for n in (0, 1, 2, 3, 32, 511, 5000):
            self.assertEqual(lab.compute(n, 'formula'), lab.reference(n))
        wrong = lab.evaluate({'algorithm': 'buggy', 'cache_size': 0, 'batch_size': 1}, [{'id': 'check', 'inputs': [0, 1]}], 1536)
        self.assertFalse(wrong['correct']); self.assertEqual(wrong['mismatches'][0], {'task': 'check', 'input': 1, 'expected': 0, 'actual': 1})

    def test_cost_model_memory_limit_and_correctness_precede_ranking(self):
        result = lab.daily(1, self.data, self.args)
        self.assertEqual(result['baseline']['cost_ms'], 229)
        self.assertEqual(result['candidate']['cost_ms'], 13.3)
        self.assertEqual(result['candidate']['peak_bytes'], 768)
        rejected = lab.evaluate(lab.CANDIDATES[3], self.data['train'], 1536)
        self.assertEqual(rejected['status'], 'rejected-memory'); self.assertIsNone(rejected['cost_ms'])
        pareto = lab.daily(10, self.data, self.args)['pareto_candidates']
        self.assertTrue(pareto)
        self.assertTrue(all(c['algorithm'] != 'buggy' and lab.evaluate(c, self.data['validation'], 1536)['status'] == 'accepted' for c in pareto))

    def test_budget_includes_failed_trials_and_negative_transfer_is_preserved(self):
        result = lab.daily(7, self.data, self.args)
        self.assertEqual((result['used_units'], result['failed_units'], result['remaining_units']), (8, 2, 0))
        comparison = lab.daily(16, self.data, self.args)
        self.assertTrue(comparison['equal_total_units'])
        self.assertEqual(comparison['heldout_cost_difference_ms'], -4)
        for arm in ('with_experience', 'without_experience'):
            value = comparison[arm]
            self.assertEqual(value['used_units'], 8)
            self.assertEqual([r['phase'] for r in value['ledger']], ['train'] * 4 + ['validation'] * 3 + ['holdout'])
            self.assertEqual(value['failed_units'], sum(r['budget_units'] for r in value['ledger'] if r['status'] != 'accepted'))

    def test_holdout_changes_do_not_change_policy_or_validation_choice(self):
        before = lab.run_arm(self.data, 8, 1536, 7, True)
        changed = copy.deepcopy(self.data)
        changed['holdout'][0]['inputs'] = [1, 1, 1, 1]
        after = lab.run_arm(changed, 8, 1536, 7, True)
        for field in ('chosen', 'training', 'selection', 'algorithm_priors'):
            self.assertEqual(before[field], after[field])
        self.assertNotEqual(before['holdout']['cost_ms'], after['holdout']['cost_ms'])

    def test_cpu_timings_are_actual_samples_with_correctness_and_pairing(self):
        result = lab.cpu_timings(self.data, 3, 7)
        self.assertEqual(result['evidence'], 'measured-cpu')
        self.assertEqual(len(result['samples']), 3)
        for row in result['samples']:
            self.assertGreater(row['loop_ns'], 0); self.assertGreater(row['formula_ns'], 0)
            self.assertEqual(set(row['order']), {'loop', 'formula'})
            self.assertEqual(row['paired_difference_ns'], row['loop_ns'] - row['formula_ns'])

    def test_recovery_rejects_conflicting_retry_and_promotions_can_roll_back(self):
        result = lab.daily(12, self.data, self.args)
        self.assertEqual((result['attempted_appends'], result['unique_trials'], result['charged_units']), (5, 4, 4))
        self.assertTrue(result['same_as_uninterrupted'])
        conflict = copy.deepcopy(result['journal'][0]); conflict['budget_units'] = 9
        with self.assertRaises(ValueError): lab.replay(result['journal'] + [conflict])
        promotion = lab.daily(18, self.data, self.args)
        self.assertTrue(promotion['promoted']); self.assertTrue(promotion['rollback']['restored'])
        low_memory = argparse.Namespace(**{**vars(self.args), 'memory_limit': 512})
        self.assertFalse(lab.daily(18, self.data, low_memory)['promoted'])

    def test_input_and_config_limits_do_not_accept_commands_or_cross_split_ids(self):
        with self.assertRaises(ValueError): lab.config({**lab.BASELINE, 'command': 'touch should-not-exist'})
        for change in (lambda d: d['holdout'][0].update(id=d['train'][0]['id']), lambda d: d['train'][0].update(inputs=[True]), lambda d: d['train'][0].update(inputs=[5001]), lambda d: d.update(version=2)):
            with tempfile.TemporaryDirectory() as directory:
                data = copy.deepcopy(self.data); change(data)
                source = Path(directory) / 'bad.json'; source.write_text(json.dumps(data))
                with self.assertRaises(ValueError): lab.load_workloads(source)
        with tempfile.TemporaryDirectory() as directory:
            for flag, value in [('--budget', '3'), ('--repetitions', '32'), ('--memory-limit', '0'), ('--seed', '-1')]:
                self.invoke('day1', '--out', directory, flag, value, ok=False)

    def test_outputs_cannot_replace_lab_sources_or_follow_file_symlinks(self):
        with self.assertRaises(ValueError): lab.safe_out(LAB.parent)
        with self.assertRaises(ValueError): lab.safe_out(LAB.parent / 'fixtures')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); target = root / 'preserve.txt'; target.write_text('unchanged')
            (root / 'day01.json').symlink_to(target)
            self.invoke('day1', '--out', str(root), ok=False)
            self.assertEqual(target.read_text(), 'unchanged')


if __name__ == '__main__':
    unittest.main()
