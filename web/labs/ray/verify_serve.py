#!/usr/bin/env python3
"""Run a dedicated real Ray Serve instance, verify HTTP behavior, then stop it."""
import argparse
import datetime
import hashlib
import json
import platform
import time
import urllib.error
import urllib.request
from pathlib import Path
import ray
from ray import serve
from real_serve import app


def request(url, body):
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        response = opener.open(req, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, json.loads(response.read().decode('utf-8'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', default='out/ray-serve.json')
    parser.add_argument('--port', type=int, default=18080)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error('Choose an unused local port from 1024 to 65535')
    document = {'status': 'FAILED', 'evidence': 'measured-ray-serve-local',
                'ray': ray.__version__, 'python': platform.python_version(),
                'platform': platform.platform(), 'rows': [],
                'started_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'sources': {name: hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest()
                            for name in ('verify_serve.py', 'real_serve.py')},
                'boundary': 'Local HTTP correctness only. No load, distributed deployment, GPU or production availability claim.'}
    cases = [(b'{"value":7}', 200, {'square': 49}),
             (b'{"value":-3}', 200, {'square': 9}),
             (b'{"value":"7"}', 400, {'error': 'value must be an integer'}),
             (b'{"value":true}', 400, {'error': 'value must be an integer'}),
             (b'{"value":1000001}', 400, {'error': 'value outside teaching range'}),
             (b'invalid-json', 400, {'error': 'Expected JSON object'})]
    try:
        ray.init(address='local', num_cpus=2, include_dashboard=False,
                 _node_ip_address='127.0.0.1')
        serve.start(http_options={'host': '127.0.0.1', 'port': args.port}, proxy_location='HeadOnly')
        serve.run(app, name='jobhub-square', route_prefix='/')
        for body, expected_status, expected_fields in cases:
            started = time.perf_counter()
            status, data = request('http://127.0.0.1:' + str(args.port) + '/', body)
            document['rows'].append({'request': body.decode(), 'status': status, 'response': data,
                                     'elapsed_ms': (time.perf_counter()-started)*1000})
            assert status == expected_status, (body, status, data)
            assert all(data.get(key) == value for key, value in expected_fields.items()), data
        document['status'] = 'PASS'
    except Exception as error:
        document['error'] = type(error).__name__ + ': ' + str(error)
        raise
    finally:
        try:
            if ray.is_initialized():
                serve.shutdown()
        finally:
            ray.shutdown()
            path = Path(args.out)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            print(json.dumps({'status': document['status'], 'artifact': str(path)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
