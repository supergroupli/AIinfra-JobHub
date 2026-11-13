"""Shared teaching helpers, bundled locally so each ZIP is standalone."""
import argparse
import csv
import hashlib
import json
import platform
import math
from pathlib import Path


def positive(value, name='value'):
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value) or value <= 0:
        raise ValueError(name + ' must be positive')
    return value


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def run(course, experiments, selfcheck):
    parser = argparse.ArgumentParser(description=course + ' CPU teaching models; not GPU measurements')
    parser.add_argument('day', choices=['day'+str(x) for x in range(1, 11)]+['selfcheck'])
    parser.add_argument('--out', default='out')
    parser.add_argument('--variant', choices=['base','changed'], default='base')
    args = parser.parse_args()
    if args.day == 'selfcheck':
        selfcheck(); print('PASS: teaching invariants / 教学模型边界'); return
    folder = Path(args.out)
    days = range(1,10) if args.day=='day10' else [int(args.day[3:])]
    summaries = []
    for day in days:
        result = experiments[day-1](args.variant == 'changed')
        document = {'course':course, 'day':day, 'evidence':'simulated', 'variant':args.variant, 'result':result}
        write(folder/('day%02d.json'%day), document)
        summaries.append({'day':day,'evidence':'simulated','variant':args.variant,'result':json.dumps(result,ensure_ascii=False,sort_keys=True)})
        print('DAY %d: '%day + json.dumps(result,ensure_ascii=False,sort_keys=True))
    if args.day=='day10':
        with (folder/'results.csv').open('w',newline='',encoding='utf-8') as f:
            writer=csv.DictWriter(f,fieldnames=['day','evidence','variant','result']);writer.writeheader();writer.writerows(summaries)
        hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.glob('day*.json'))}
        write(folder/'manifest.json',{'course':course,'python':platform.python_version(),'variant':args.variant,'source_sha256':hashlib.sha256(Path(__file__).with_name('lab.py').read_bytes()).hexdigest(),'files':hashes})
        report = '# '+course+' engineering portfolio / 工程作品\n\nEvidence: simulated / 教学模拟。No framework or GPU benchmark was run.\n\n## Question / 我的问题\nTODO: choose one testable claim.\n\n## My change / 本人贡献\nTODO: describe your student.py implementation and one controlled modification.\n\n## Evidence / 证据\nRead day01–day09.json, results.csv and manifest.json; compare base and changed in separate directories.\n\n## Counterexample / 反例\nTODO: explain a condition where your proposed change does not help.\n\n## Boundaries / 局限\nThese formulas and toy state machines do not establish framework throughput, cache-hit rate or production reliability.\n\n## Reproduce / 复现\npython3 lab.py day10 --out '+str(folder)+' --variant '+args.variant+'\npython3 check.py\n\n## Next / 下一步\nTODO: add a pinned real-framework experiment only when compatible hardware is available.\n'
        (folder/'REPORT.md').write_text(report,encoding='utf-8')
        print('REPORT:',folder/'REPORT.md')
