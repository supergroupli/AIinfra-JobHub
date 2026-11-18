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
LAB = ROOT / 'web/labs/post-training'
spec = importlib.util.spec_from_file_location('post_training_lab', LAB / 'lab.py')
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


class PostTrainingLabTests(unittest.TestCase):
    def test_reward_parser_rejects_embedded_and_conflicting_answers(self):
        self.assertEqual([lab.reward(x, 5) for x in ('#### 5', '5', '#### 50', '#### 5\n#### 6', ' #### 5 ')], [1,0,0,0,1])
        self.assertEqual(lab.reward('#### -5', -5), 1)

    def test_objective_sign_and_zero_variance_groups(self):
        self.assertAlmostEqual(lab.clipped_objective(1.5,1),1.2)
        self.assertAlmostEqual(lab.clipped_objective(1.5,-1),-1.5)
        self.assertAlmostEqual(lab.clipped_objective(.5,-1),-.8)
        self.assertEqual(lab.advantages([1,1,1]),[0,0,0])
        self.assertAlmostEqual(sum(lab.advantages([0,0,0,1])),0)
        self.assertAlmostEqual(lab.bernoulli_kl(.5,.5),0)
        self.assertGreater(lab.bernoulli_kl(.9,.5),0)

    def test_async_queue_preserves_work_under_blocking_and_timestamp_ties(self):
        for p in (1,10,60):
            for t in (1,10,60):
                for capacity in (1,2,8):
                    with self.subTest(p=p,t=t,capacity=capacity):
                        result=lab.async_queue(p,t,capacity)
                        self.assertEqual(result['produced'],12)
                        self.assertEqual(result['consumed'],12)
                        self.assertLessEqual(result['max_queued'],capacity)
                        self.assertEqual(result['elapsed_model_ms'],p+t+11*max(p,t))
                        consumed=[row['batch'] for row in result['events'] if row['event']=='consumed']
                        self.assertEqual(consumed,list(range(12)))

    def test_future_version_and_conflicting_retry_are_rejected(self):
        self.assertTrue(lab.accept_version(6,8,2))
        self.assertFalse(lab.accept_version(9,8,2))
        self.assertFalse(lab.accept_version(5,8,2))
        rows=[{'id':'a','reward':1},{'id':'b','reward':0},{'id':'a','reward':1}]
        self.assertEqual(lab.deduplicate(rows),rows[:2])
        with self.assertRaises(ValueError):lab.deduplicate([{'id':'a','reward':1},{'id':'a','reward':0}])

    def test_serialized_resume_matches_and_training_changes_policy(self):
        whole=lab.train(7,.3,40)
        partial=lab.train(7,.3,10)
        checkpoint=json.loads(json.dumps({'theta':partial['theta'],'step':partial['step']}))
        resumed=lab.train(7,.3,30,checkpoint)
        self.assertEqual(whole['theta'],resumed['theta'])
        self.assertEqual(whole['history'][10:],resumed['history'])
        self.assertGreater(lab.sigmoid(whole['theta']),.8)
        self.assertEqual(lab.rollout(0,7),lab.rollout(0,7))
        self.assertNotEqual(lab.rollout(0,7),lab.rollout(0,8))

    def test_twenty_cli_runs_and_manifest_hashes(self):
        with tempfile.TemporaryDirectory() as directory:
            for day in range(1,21):
                result=subprocess.run([sys.executable,str(LAB/'lab.py'),str(day),'--out',directory],capture_output=True,text=True,timeout=10)
                self.assertEqual(result.returncode,0,result.stderr)
                record=json.loads((Path(directory)/f'day{day:02d}.json').read_text())
                self.assertEqual(record['day'],day)
                self.assertFalse(record['framework_executed'])
            manifest=json.loads((Path(directory)/'day20.json').read_text())
            self.assertEqual(len(manifest['files']),19)
            for filename,digest in manifest['files'].items():
                self.assertEqual(hashlib.sha256((Path(directory)/filename).read_bytes()).hexdigest(),digest)

    def test_reference_passes_student_stubs_remain_explicit(self):
        reference=subprocess.run([sys.executable,str(LAB/'check_exercises.py'),'--reference'],capture_output=True,text=True)
        self.assertEqual(reference.returncode,0,reference.stderr)
        self.assertIn('PASS 15',reference.stdout)
        student=subprocess.run([sys.executable,str(LAB/'check_exercises.py')],capture_output=True,text=True)
        self.assertEqual(student.returncode,1)
        self.assertIn('NOT YET',student.stderr)

    def test_goodput_uses_explicit_serial_elapsed_window(self):
        result = lab.daily(17, argparse.Namespace())
        self.assertEqual(result['workload_assumption'], 'serial, no overlap or idle gaps')
        self.assertEqual(result['elapsed_model_ms'], 255)
        self.assertAlmostEqual(result['goodput_per_model_second'], 8 / .255)
        self.assertNotAlmostEqual(result['goodput_per_model_second'], 8 / .120)

    def test_invalid_arguments_do_not_generate_a_report(self):
        with tempfile.TemporaryDirectory() as directory:
            for option,value in [('--lr','nan'),('--lr','0'),('--buffer','0'),('--max-lag','-1'),('--seed','-1')]:
                result=subprocess.run([sys.executable,str(LAB/'lab.py'),'1','--out',directory,option,value],capture_output=True,text=True)
                self.assertEqual(result.returncode,2)
            self.assertEqual(list(Path(directory).iterdir()),[])


if __name__=='__main__':
    unittest.main()
