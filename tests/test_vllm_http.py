"""Run the published CPU HTTP exercise through the published client."""
import importlib.util
import json
from pathlib import Path
import threading
import unittest
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("vllm_http_exercise", ROOT / "web/labs/vllm/lab.py")
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


class PublishedHTTPExerciseTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = lab.ThreadingHTTPServer(("127.0.0.1", 0), lab.MockHandler)
        cls.port = cls.server.server_port
        cls.worker = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.worker.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.worker.join(timeout=2)

    def test_stream_and_nonstream_return_content_without_invented_token_counts(self):
        for stream in (False, True):
            row = lab.request_one({"request_id": 0, "prompt": "Say OK"}, port=self.port, stream=stream)
            self.assertEqual(row["status"], "ok")
            self.assertEqual(row["response"], "MOCK OK")
            self.assertEqual(row["evidence"], "simulated")
            self.assertIsNone(row["completion_tokens"])
            if stream:
                self.assertGreaterEqual(row["first_content_latency_ms"], 0)
                self.assertLessEqual(row["first_content_latency_ms"], row["latency_ms"])
            else:
                self.assertIsNone(row["first_content_latency_ms"])

    def test_wrong_model_and_timeout_survive_as_failed_records(self):
        wrong = lab.request_one({"request_id": 0, "prompt": "hello"}, port=self.port, model="missing-model")
        self.assertEqual((wrong["status"], wrong["http_status"]), ("error", 404))
        timeout = lab.request_one({"request_id": 1, "prompt": "INJECT_TIMEOUT"}, port=self.port, timeout=.03)
        self.assertEqual(timeout["status"], "timeout")
        summary = lab.summarize([wrong, timeout], 300)
        self.assertEqual(summary["total"], 2)
        self.assertEqual(summary["counts"], {"ok": 0, "error": 1, "timeout": 1})
        self.assertIsNone(summary["latency_p95_ms"])

    def test_missing_messages_is_a_clear_client_error(self):
        request = urllib.request.Request(f"http://127.0.0.1:{self.port}/v1/chat/completions",
                                         data=json.dumps({"model": "mock-model"}).encode(),
                                         headers={"Content-Type": "application/json"})
        with self.assertRaises(urllib.error.HTTPError) as context:
            urllib.request.urlopen(request, timeout=2)
        self.assertEqual(context.exception.code, 400)


if __name__ == "__main__":
    unittest.main()
