"""Semantic boundary checks for the three published compute lab packs."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
def load(ident,name='lab'):
    spec=importlib.util.spec_from_file_location(ident.replace('-','_')+'_'+name,ROOT/'web/labs'/ident/(name+'.py'))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

class ComputeCurriculaTest(unittest.TestCase):
    def test_triton_mask_and_numerical_edges(self):
        m=load('triton')
        for n in (0,1,4,5,17):self.assertEqual(m.add(list(range(n)),[1]*n),list(range(1,n+1)))
        with self.assertRaises(ValueError):m.add([1],[1,2])
        self.assertAlmostEqual(sum(m.softmax([1000,1001,1002])),1)
        self.assertEqual(m.layer_norm([7,7,7]),[0,0,0])
        self.assertEqual(m.matmul([[1,2,3]],[[1],[2],[3]],4),[[14]])
    def test_training_weighting_sampling_and_resume(self):
        m=load('pytorch-distributed');s=load('pytorch-distributed','solutions')
        self.assertEqual(m.gradient(0,[1,2],[2,4]),-10)
        self.assertEqual(s.weighted_gradient([2,8],[3,1]),3.5)
        padded=sum(m.shard_indices(5,2),[]);self.assertEqual(len(padded),6);self.assertEqual(set(padded),set(range(5)))
        self.assertEqual(len(sum(m.shard_indices(5,2,drop=True),[])),4)
        self.assertTrue(m.experiment(9)['match'])
        self.assertEqual(m.memory(1000000,4)['ideal_sharded_persistent_bytes_per_rank'],4000000)
    def test_collective_semantics_units_and_bounds(self):
        m=load('nccl');self.assertEqual(m.allreduce([[1,2],[3,4]]),[[4,6],[4,6]])
        with self.assertRaises(ValueError):m.allreduce([[1],[1,2]])
        self.assertEqual(m.bandwidth(100000000,10,4)['busbw_GBs'],15)
        self.assertAlmostEqual(m.ring_time(0)['total_ms'],.03)
        self.assertAlmostEqual(m.experiment(8)['unfused_4_calls_ms']-m.experiment(8)['fused_1_call_ms'],.09)
        with self.assertRaises(ValueError):m.bandwidth(1,0,4)
    def test_independent_reference_checks(self):
        for ident in ('triton','pytorch-distributed','nccl'):
            with self.subTest(course=ident):
                load(ident,'check').verify(load(ident,'solutions'))
                with self.assertRaises(NotImplementedError):load(ident,'check').verify(load(ident,'student'))
    def test_final_exports_have_raw_files_and_personal_contribution_tasks(self):
        for ident in ('triton','pytorch-distributed','nccl'):
            with self.subTest(course=ident),tempfile.TemporaryDirectory() as d:
                result=subprocess.run([sys.executable,str(ROOT/'web/labs'/ident/'lab.py'),'day10','--out',d],capture_output=True,text=True,timeout=10)
                self.assertEqual(result.returncode,0,result.stderr)
                out=Path(d);self.assertEqual(len(list(out.glob('day*.json'))),9)
                self.assertTrue((out/'manifest.csv').is_file());self.assertIn('TODO',(out/'REPORT.md').read_text())
                self.assertTrue(all('evidence' in json.loads(p.read_text()) for p in out.glob('day*.json')))
if __name__=='__main__':unittest.main()
