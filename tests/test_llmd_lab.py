import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / 'web/labs/llm-d'

def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, DIRECTORY / filename)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value

lab = module('llmd_lab', 'lab.py')
checker = module('llmd_checker', 'check.py')
reference = module('llmd_reference', 'reference.py')

class LLMDLabTest(unittest.TestCase):
    def test_daily_commands_independent_and_hashed(self):
        with tempfile.TemporaryDirectory() as directory:
            for day in range(1,21):
                for variant in ('baseline', 'stress'):
                    out = Path(directory) / variant / str(day)
                    result = subprocess.run([sys.executable, str(DIRECTORY/'lab.py'), 'day%d' % day, '--variant', variant, '--out', str(out)], capture_output=True, text=True)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    data = json.loads((out / ('day%02d.json' % day)).read_text())
                    self.assertEqual(data['day'], day)
                    self.assertFalse(data['framework_executed'])
                    self.assertEqual(data['source_sha256'], hashlib.sha256((DIRECTORY/'lab.py').read_bytes()).hexdigest())
                    if day == 20:
                        self.assertEqual(len(data['result']['comparisons']), 19)
                        self.assertIn('TODO', (out/'REPORT.md').read_text())

    def test_route_correctness_and_tie_break(self):
        self.assertEqual(lab.daily(3)['selected'], 'hot')
        self.assertEqual(lab.daily(3,True)['selected'], 'cold')
        self.assertEqual(lab.daily(6,True)['selected'], 'b')
        self.assertIsNone(lab.daily(17,True)['selected'])
        endpoints=[dict(id=name, ready=True, age_ms=1000, queue_ms=10, prefill_ms=10) for name in ('b','a')]
        self.assertEqual(lab.route(endpoints),'a')
        endpoints[1]['age_ms']=1001
        self.assertEqual(lab.route(endpoints),'b')

    def test_prefix_and_lru_accounting(self):
        self.assertEqual(lab.prefix_length([1,2,3],[1,9,3]),1)
        self.assertEqual(lab.daily(4)['reusable_full_block_tokens'],4)
        self.assertEqual(lab.daily(4,True)['reusable_full_block_tokens'],0)
        for stress in (False,True):
            result=lab.daily(5,stress)
            self.assertEqual(len(result['events']),7)
            self.assertTrue(all(len(e['resident'])<=result['slots'] for e in result['events']))
        self.assertEqual(lab.daily(5)['events'][4]['evicted'],'B')

    def test_capacity_transfer_and_timing_units(self):
        self.assertEqual(lab.capacity(2,4,800)['capacity_rps'],40)
        self.assertEqual(lab.capacity(2,4,80)['capacity_rps'],10)
        self.assertEqual(lab.daily(8,True)['net_saved_ms'],-14)
        self.assertEqual(lab.daily(9)['ttft_ms'],66)
        self.assertEqual(lab.daily(9,True)['total_ms'],231)
        self.assertEqual(lab.daily(14,True)['spare_rps'],-5)

    def test_failures_retries_and_fairness_are_not_hidden(self):
        self.assertEqual(lab.daily(10,True)['slo_good_fraction_all_requests'],.75)
        self.assertEqual(lab.percentile([],95),None)
        self.assertEqual(lab.percentile([1,2,3],95),3)
        self.assertFalse(lab.daily(11,True)['requests'][-1]['admitted'])
        self.assertEqual(lab.daily(11,True)['requests'][-1]['reserved_after'],800)
        self.assertFalse(lab.daily(12,True)['succeeded'])
        self.assertEqual(lab.daily(16)['allocated'],{'A':8,'B':4})
        self.assertEqual(lab.daily(16,True)['allocated'],{'A':10,'B':2})
        self.assertEqual(lab.daily(18)['preferred'],'B')
        self.assertEqual(lab.daily(18,True)['preferred'],'A')
        self.assertFalse(lab.daily(19)['deployment_executed'])

    def test_reference_and_intentional_student_incompleteness(self):
        self.assertEqual(checker.check(reference),15)
        result=subprocess.run([sys.executable,str(DIRECTORY/'check.py')],capture_output=True,text=True)
        self.assertEqual(result.returncode,1)
        self.assertIn('NOT COMPLETE',result.stderr)
        class Broken:
            pick_endpoint=staticmethod(lambda entries: 'a')
        with self.assertRaises(AssertionError): checker.check(Broken)

    def test_reject_invalid_cli_and_source_output(self):
        for args in (['day0'],['day1','--variant','invalid'],['day1','--out',str(DIRECTORY)]):
            result=subprocess.run([sys.executable,str(DIRECTORY/'lab.py'),*args],capture_output=True,text=True)
            self.assertEqual(result.returncode,2)

if __name__=='__main__': unittest.main()
