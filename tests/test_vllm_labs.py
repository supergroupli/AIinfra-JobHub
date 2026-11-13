"""Independent assertions on published teaching math, evidence and summaries."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('jobhub_vllm_lab',ROOT/'web/labs/vllm/lab.py')
lab=importlib.util.module_from_spec(spec);spec.loader.exec_module(lab)

class VllmLabTest(unittest.TestCase):
    def test_gqa_cache_math(self):
        self.assertEqual(lab.kv(1024,1)['kv_bytes'],12582912)
        self.assertEqual(lab.kv(2048,4)['kv_MiB'],96)
    def test_cache_only_changes_prefill_in_toy_model(self):
        cold=lab.simulate();warm=lab.simulate(cache=True)
        self.assertFalse(warm[0]['cache_hit'])
        self.assertTrue(warm[2]['cache_hit'])
        self.assertEqual(warm[2]['finish_ms']-warm[2]['first_content_ms'],cold[2]['finish_ms']-cold[2]['first_content_ms'])
    def test_failures_and_empty_samples(self):
        summary=lab.summarize(lab.simulate(failures=True),1380)
        self.assertEqual(summary['counts'],{'ok':10,'error':1,'timeout':1})
        self.assertEqual(summary['total'],12)
        self.assertIsNone(lab.summarize([],0)['latency_p95_ms'])
        self.assertIsNone(lab.summarize([{'status':'ok','latency_ms':10,'evidence':'simulated','completion_tokens':None}],20)['completion_tokens_per_second'])
    def test_raw_summary_tampering_is_detected(self):
        with tempfile.TemporaryDirectory() as d:
            rows=lab.simulate();lab.save_run(d,rows,1380,{'evidence':'simulated'})
            lab.check_run(d)
            import json
            p=Path(d)/'summary.json';x=json.loads(p.read_text());x['total']=100;p.write_text(json.dumps(x))
            with self.assertRaises(AssertionError):lab.check_run(d)
    def test_malformed_success_response_is_error(self):
        from io import BytesIO
        from unittest.mock import patch
        for payload in (b'not json', b'{}', b'{"choices": []}'):
            response=BytesIO(payload); response.status=200
            with patch.object(lab.urllib.request,'urlopen',return_value=response):
                row=lab.request_one({'request_id':0,'prompt':'test'})
            self.assertEqual(row['status'],'error')
            self.assertIn('Invalid or incomplete',row['response'])
    def test_incomplete_sse_is_error(self):
        from io import BytesIO
        from unittest.mock import patch
        response=BytesIO(b'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n');response.status=200
        with patch.object(lab.urllib.request,'urlopen',return_value=response):
            row=lab.request_one({'request_id':0,'prompt':'test'},stream=True)
        self.assertEqual(row['status'],'error')
        self.assertIn('before [DONE]',row['response'])
        self.assertIsNotNone(row['first_content_latency_ms'])
    def test_inflight_prefix_cannot_be_reused(self):
        rows=lab.simulate(cache=True,concurrency=4)
        self.assertFalse(rows[2]['cache_hit'])
        self.assertTrue(rows[4]['cache_hit'])
    def test_nearest_rank_and_quantization(self):
        self.assertEqual(lab.percentile([50,10,20,30],.5),20)
        self.assertEqual(lab.percentile([50,10,20,30],.95),50)
        values=[-.95,-.31,.02,.47,1]
        self.assertLess(lab.quantize(values,8)['max_abs_error'],lab.quantize(values,4)['max_abs_error'])
if __name__=='__main__':unittest.main()
