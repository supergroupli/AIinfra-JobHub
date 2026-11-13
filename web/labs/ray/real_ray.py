#!/usr/bin/env python3
"""Actual Ray 2.60.0 CPU tasks, bounded submission and a visible task failure."""
import argparse
import datetime
import hashlib
import importlib.metadata
import json
import platform
import time
from pathlib import Path
import ray


@ray.remote(num_cpus=1, max_retries=0)
def square(value):
    if type(value) is not int:
        raise ValueError('value must be an integer')
    return {'input': value, 'square': value * value}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', default='out/ray-core.json')
    args = parser.parse_args()
    if importlib.metadata.version('ray') != '2.60.0':
        raise SystemExit('Use ray==2.60.0 for this example.')
    document = {'evidence': 'measured-ray-local', 'status': 'FAILED',
                'ray': ray.__version__, 'python': platform.python_version(),
                'platform': platform.platform(), 'cpu_count_requested': 2,
                'started_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'source_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                'boundary': 'One local Ray instance. Correctness and bounded submission, not cluster speedup or GPU performance.'}
    started = time.perf_counter()
    try:
        ray.init(address='local', num_cpus=2, include_dashboard=False,
                 _node_ip_address='127.0.0.1')
        pending, output, peak_pending = [], [], 0
        for value in range(8):
            if len(pending) >= 2:
                ready, pending = ray.wait(pending, num_returns=1, timeout=30)
                if not ready:
                    raise TimeoutError('No task finished within 30 seconds')
                output.extend(ray.get(ready, timeout=30))
            pending.append(square.remote(value))
            peak_pending = max(peak_pending, len(pending))
        output.extend(ray.get(pending, timeout=30))
        output.sort(key=lambda row: row['input'])
        assert output == [{'input': x, 'square': x*x} for x in range(8)]
        assert peak_pending <= 2
        failure = None
        try:
            ray.get(square.remote('7'), timeout=30)
        except ray.exceptions.RayTaskError as error:
            assert isinstance(error.as_instanceof_cause(), ValueError)
            failure = {'input': '7', 'error_type': 'ValueError', 'expected_failure': True}
        assert failure, 'Invalid input unexpectedly succeeded'
        document.update(status='PASS', rows=output, sum=sum(r['square'] for r in output),
                        peak_pending=peak_pending, failures=[failure])
    except Exception as error:
        document['error'] = type(error).__name__ + ': ' + str(error)
        raise
    finally:
        ray.shutdown()
        document['elapsed_seconds'] = time.perf_counter() - started
        path = Path(args.out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'status': document['status'], 'artifact': str(path)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
