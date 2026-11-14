import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
LAB=ROOT/'web/labs/diagnostics'
spec=importlib.util.spec_from_file_location('diagnostic_lab',LAB/'lab.py');lab=importlib.util.module_from_spec(spec);spec.loader.exec_module(lab)

class DiagnosticLabsTests(unittest.TestCase):
    def fixture(self,name):return json.loads((LAB/'fixtures'/(name+'.json')).read_text())
    def test_all_nine_cli_commands_produce_scoped_hashed_reports(self):
        cases=json.loads((ROOT/'web/cases/cases.json').read_text())['cases']
        self.assertEqual(set(lab.CASES),{c['id'] for c in cases})
        with tempfile.TemporaryDirectory() as folder:
            for case in lab.CASES:
                out=Path(folder)/case
                result=subprocess.run([sys.executable,str(LAB/'lab.py'),case,'--out',str(out)],capture_output=True,text=True)
                self.assertEqual(result.returncode,0,result.stderr)
                report=json.loads((out/'diagnosis.json').read_text())
                self.assertEqual(report['evidence'],'synthetic-cpu-analysis')
                self.assertEqual(report['input_sha256'],hashlib.sha256((LAB/'fixtures'/(case+'.json')).read_bytes()).hexdigest())
                self.assertEqual(report['result'],lab.analyze(case,self.fixture(case)))
    def test_capacity_rounding_and_demand_are_not_weight_memory(self):
        d=self.fixture('kv-capacity');r=lab.analyze('kv-capacity',d)
        self.assertEqual(r['bytes_per_token'],131072);self.assertEqual(r['required_bytes'],4*2**30);self.assertFalse(r['fits'])
        d['sequence_tokens']=[4096]*2;self.assertTrue(lab.analyze('kv-capacity',d)['fits'])
        d['sequence_tokens']=[4097];self.assertEqual(lab.analyze('kv-capacity',d)['allocated_tokens'],4112)
    def test_queue_wait_and_prefix_reuse_counterexamples(self):
        d=self.fixture('tail-queue');r=lab.analyze('tail-queue',d)
        self.assertEqual(r['short_p95_latency_ms'],100);self.assertEqual(r['short_p95_wait_ms'],99)
        d['requests']=d['requests'][1:];self.assertEqual(lab.analyze('tail-queue',d)['short_p95_latency_ms'],1)
        d=self.fixture('prefix-miss');r=lab.analyze('prefix-miss',d);self.assertEqual(r['dynamic_first']['cached_tokens'],0);self.assertEqual(r['stable_first']['token_hit_fraction'],.375)
        d['block']=8;self.assertEqual(lab.analyze('prefix-miss',d)['stable_first']['cached_tokens'],0)
    def test_timing_and_ddp_keep_comparison_boundaries(self):
        r=lab.analyze('async-timing',self.fixture('async-timing'));self.assertEqual((r['host_fastest'],r['device_fastest']),('A','B'))
        d=self.fixture('ddp-scaling');r=lab.analyze('ddp-scaling',d);self.assertEqual(r['global_sample_mean'],5);self.assertEqual(r['ddp_of_local_sums'],10);self.assertEqual(r['absolute_error_after'],0)
        d['sample_gradients'][0].append(1)
        with self.assertRaises(ValueError):lab.analyze('ddp-scaling',d)
    def test_small_messages_have_a_fixed_cost_not_bus_bandwidth(self):
        r=lab.analyze('small-collectives',self.fixture('small-collectives'))
        self.assertAlmostEqual(r['separate_us'],1010.24);self.assertAlmostEqual(r['coalesced_us'],20.24)
        self.assertGreater(r['messages'][0]['fixed_fraction'],.98);self.assertLess(r['messages'][-1]['fixed_fraction'],.01)
    def test_retry_side_effects_and_queue_conservation(self):
        r=lab.analyze('retry-storm',self.fixture('retry-storm'));self.assertEqual(r['attempts'],190);self.assertEqual(r['writes_with_atomic_idempotency'],100);self.assertEqual(r['duplicate_side_effects'],90)
        d=self.fixture('bounded-queue');r=lab.analyze('bounded-queue',d)
        self.assertEqual(r['bounded_peak_bytes'],100*2**20);self.assertEqual(r['unbounded_peak_bytes'],200*2**20);self.assertEqual(r['rejected'],10)
        self.assertEqual(sum(d['arrivals_per_tick']),r['served_bounded']+r['remaining_bounded']+r['rejected'])
        d['arrivals_per_tick'] += [0]*3;r=lab.analyze('bounded-queue',d);self.assertEqual(r['remaining_bounded'],0);self.assertEqual(r['remaining_unbounded'],0)
    def test_probe_readiness_is_not_a_restart_or_hpa_decision(self):
        d=self.fixture('probe-confusion');r=lab.analyze('probe-confusion',d);self.assertEqual(r['readiness_failure_restarts'],0);self.assertTrue(r['unguarded_liveness_restarts_before_ready']);self.assertFalse(r['startup_budget_exceeds_load'])
        d['failure_threshold']=6;r=lab.analyze('probe-confusion',d);self.assertFalse(r['unguarded_liveness_restarts_before_ready']);self.assertTrue(r['startup_budget_exceeds_load'])
    def test_malformed_inputs_fail_without_writing_success_report(self):
        with tempfile.TemporaryDirectory() as folder:
            for value in ('{','null',json.dumps({'layers':float('nan')})):
                source=Path(folder)/'bad.json';source.write_text(value);out=Path(folder)/'out'
                p=subprocess.run([sys.executable,str(LAB/'lab.py'),'kv-capacity','--input',str(source),'--out',str(out)],capture_output=True,text=True)
                self.assertEqual(p.returncode,2);self.assertIn('Invalid input',p.stderr);self.assertFalse((out/'diagnosis.json').exists())
        d=self.fixture('prefix-miss');d['stable_first']=[['x']*513]
        with self.assertRaises(ValueError):lab.analyze('prefix-miss',d)
    def test_case_lessons_sources_and_bilingual_teaching_are_complete(self):
        cases=json.loads((ROOT/'web/cases/cases.json').read_text())['cases']
        for c in cases:
            for field in ('title','summary','context','resolution','limits','challenge'):
                self.assertTrue(all(c[field][lang].strip() for lang in ('zh','en')))
            for field in ('evidence','hypotheses','investigation','diagram'):self.assertGreaterEqual(len(c[field]),3)
            for lesson in c['lessons']:
                course=json.loads((ROOT/'content/courses'/(lesson['course']+'.json')).read_text());self.assertIn(lesson['day'],[s['day'] for s in course['steps']])
            self.assertTrue(all(s['url'].startswith('https://') for s in c['sources']))
            self.assertEqual(c['command'],'python3 lab.py '+c['id']+' --out out/'+c['id'])
if __name__=='__main__':unittest.main()
