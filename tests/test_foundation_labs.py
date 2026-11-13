"""Meaningful boundary and evidence checks for the downloadable teaching lab."""
import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAB_DIR = ROOT / "web/labs/foundations"


def load(name):
    spec = importlib.util.spec_from_file_location("foundation_" + name, LAB_DIR / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


lab = load("lab")


class FoundationLabTest(unittest.TestCase):
    def test_kv_hand_calculation_and_invalid_dimensions(self):
        self.assertEqual(lab.kv_bytes(32, 8, 128, 2048, 1), 268435456)
        self.assertEqual(lab.kv_bytes(32, 8, 128, 2048, 8), 8 * 268435456)
        for value in (0, -1, 1.5, True):
            with self.subTest(value=value), self.assertRaises(ValueError):
                lab.kv_bytes(32, 8, 128, value, 1)

    def test_metrics_keep_failures_and_one_token_boundary(self):
        result = lab.summarize(lab.make_records())
        self.assertEqual((result["total"], result["success"], result["errors"], result["timeouts"]), (24, 22, 1, 1))
        self.assertAlmostEqual(result["failure_rate"], 2 / 24)
        self.assertEqual(result["ttft_p95_ms"], 35)
        self.assertEqual(result["tpot_samples"], 21)
        self.assertEqual(result["tpot_mean_ms"], 10)
        self.assertEqual(result["window_ms"], 2500)
        self.assertAlmostEqual(result["successful_requests_per_s"], 8.8)

    def test_empty_and_all_failed_data_do_not_invent_latency(self):
        empty = lab.summarize([])
        self.assertIsNone(empty["failure_rate"])
        self.assertIsNone(empty["ttft_p95_ms"])
        self.assertIsNone(empty["successful_requests_per_s"])
        failed = lab.summarize([{"status": "timeout", "arrival_ms": 0, "end_ms": 200}])
        self.assertEqual(failed["failure_rate"], 1)
        self.assertIsNone(failed["tpot_mean_ms"])
        self.assertIsNone(failed["e2e_p95_ms"])

    def test_queue_wait_and_no_execution_before_arrival(self):
        rows = lab.queue([0, 3])
        self.assertEqual(rows[1]["wait_ms"], 5)
        self.assertEqual(rows[1]["end_ms"], 16)
        rows = lab.queue([100, 0, 40], batch_size=4)
        self.assertTrue(all(r["start_ms"] >= r["arrival_ms"] for r in rows))
        self.assertEqual(len({r["request_id"] for r in rows}), 3)
        self.assertTrue(all(r["batch_size_actual"] == 1 for r in rows))

    def test_batch_counterexample_and_burst(self):
        self.assertEqual(max(r["end_ms"] for r in lab.queue([0] * 12)), 96)
        self.assertEqual(max(r["end_ms"] for r in lab.queue([0] * 12, batch_size=4)), 30)
        sparse = lab.queue([0, 12, 24], batch_size=4)
        self.assertTrue(all(r["wait_ms"] == 0 and r["service_ms"] == 10 for r in sparse))

    def test_reference_passes_independent_challenge_cases(self):
        load("check").verify(load("solutions"))

    def test_portfolio_artifacts_match_report_and_preserve_boundaries(self):
        with tempfile.TemporaryDirectory() as directory, contextlib.redirect_stdout(io.StringIO()):
            folder = Path(directory)
            lab.day10(folder)
            report = (folder / "REPORT.md").read_text()
            self.assertIn("teaching simulation", report)
            self.assertIn("TODO", report)
            self.assertIn("96", report)
            self.assertIn("30", report)
            manifest = json.loads((folder / "day08-manifest.json").read_text())
            self.assertEqual(len(manifest["source_sha256"]), 64)
            self.assertEqual(len(manifest["input_sha256"]), 64)
            diagnoses = json.loads((folder / "day09-diagnosis.json").read_text())
            self.assertEqual(diagnoses["burst"]["wait_p95_ms"], diagnoses["slow_service"]["wait_p95_ms"])
            self.assertNotEqual(diagnoses["burst"]["service_p95_ms"], diagnoses["slow_service"]["service_p95_ms"])
            cache = json.loads((folder / "day06-cache.json").read_text())
            self.assertEqual([r["hit"] for r in cache["cases"]], [False, True, False, False, False])


if __name__ == "__main__":
    unittest.main()
