#!/usr/bin/env python3
"""Launch the pinned, local-only teaching GPU service (not a GPU simulator)."""
import argparse
import importlib.metadata
import json
from pathlib import Path
import subprocess

MODEL='Qwen/Qwen2.5-0.5B-Instruct'
REVISION='7ae557604adf67be50417f59c2c2f167def9a775'
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--cache',choices=['on','off'],default='off')
p.add_argument('--sequences',type=int,choices=[1,2,4],default=4)
p.add_argument('--context',type=int,choices=[512,1024,2048],default=1024)
p.add_argument('--dry-run',action='store_true')
a=p.parse_args()
command=['vllm','serve',MODEL,'--revision',REVISION,'--tokenizer-revision',REVISION,'--host','127.0.0.1','--port','8001','--dtype','float16','--max-model-len',str(a.context),'--max-num-seqs',str(a.sequences),'--gpu-memory-utilization','0.5','--enforce-eager','--enable-prefix-caching' if a.cache=='on' else '--disable-prefix-caching']
print(' '.join(command),flush=True)
if not a.dry_run:
    if importlib.metadata.version('vllm')!='0.33.0':raise SystemExit('Use vllm==0.33.0 for this teaching baseline.')
    Path('out').mkdir(exist_ok=True)
    Path('out/server-config.json').write_text(json.dumps({'evidence':'design','version':'0.33.0','model':MODEL,'revision':REVISION,'command':command},indent=2)+'\n')
    raise SystemExit(subprocess.call(command))
