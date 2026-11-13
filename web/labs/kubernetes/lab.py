#!/usr/bin/env python3
"""Offline Kubernetes planning and manifest checks, not a running cluster."""
import argparse,csv,hashlib,json,math,platform
from pathlib import Path
HERE=Path(__file__).resolve().parent

def slots(cpu_m,memory_mib,request_cpu_m,request_memory_mib,gpus=0,request_gpus=0):
    if min(cpu_m,memory_mib,gpus,request_gpus)<0 or min(request_cpu_m,request_memory_mib)<=0:raise ValueError('invalid capacity inputs')
    counts=[cpu_m//request_cpu_m,memory_mib//request_memory_mib]
    if request_gpus:counts.append(gpus//request_gpus)
    return int(min(counts))

def desired_replicas(current,observed,target,minimum=1,maximum=10):
    if current<1 or observed<0 or target<=0 or not 1<=minimum<=maximum:raise ValueError('invalid scaling inputs')
    return max(minimum,min(maximum,math.ceil(current*observed/target)))

def validate_manifest(doc):
    items=doc['items'];dep=next(x for x in items if x['kind']=='Deployment');service=next(x for x in items if x['kind']=='Service')
    labels=dep['spec']['template']['metadata']['labels'];container=dep['spec']['template']['spec']['containers'][0]
    assert all(labels.get(k)==v for k,v in dep['spec']['selector']['matchLabels'].items()),'Deployment selector mismatch'
    assert all(labels.get(k)==v for k,v in service['spec']['selector'].items()),'Service selector mismatch'
    assert service['spec']['type']=='ClusterIP','unexpected external exposure'
    ports={p['containerPort'] for p in container['ports']}
    assert service['spec']['ports'][0]['targetPort'] in ports,'targetPort mismatch'
    for name in ('startupProbe','readinessProbe','livenessProbe'):
        assert container[name]['httpGet']['port'] in ports,'probe port mismatch'
    assert container['resources']['requests']=={'cpu':'100m','memory':'64Mi'}
    assert container['resources']['limits']=={'cpu':'500m','memory':'128Mi'}
    assert container['image']=='nginx:1.27.5'
    return {'evidence':'design','checks':10,'status':'PASS','scope':'Checks this teaching manifest only; not a Kubernetes schema validator or an API-server acceptance test.'}

def experiment(day):
    if day==1:return validate_manifest(json.loads((HERE/'manifests.json').read_text()))
    if day==2:return {'evidence':'design','allocatable_cpu_m':4000,'allocatable_memory_mib':8192,'request_cpu_m':500,'request_memory_mib':1024,'schedulable_slots':slots(4000,8192,500,1024),'note':'Assumes one homogeneous node, no other pods, affinity, taints or overhead.'}
    if day==3:return {'evidence':'design','without_device_plugin_gpu_slots':slots(4000,8192,500,1024,0,1),'with_two_allocatable_gpus_slots':slots(4000,8192,500,1024,2,1),'resource_name':'nvidia.com/gpu','notice':'An integer GPU request is not fractional sharing; device plugins and actual allocatable resources are required.'}
    if day==4:return {'evidence':'design','emptyDir_survives_container_restart':True,'emptyDir_survives_pod_deletion':False,'pvc_survives_pod_deletion':'depends on PVC/PV lifecycle and reclaim policy','sha256':hashlib.sha256(b'teaching-model-file').hexdigest(),'note':'The supplied ConfigMap contains demonstration HTML, not model weights or a durable volume.'}
    if day==5:return {'evidence':'simulated','scenarios':[{'state':'loading','startup':False,'ready':False,'route_traffic':False},{'state':'loaded','startup':True,'ready':True,'route_traffic':True},{'state':'dependency_down','startup':True,'ready':False,'restart_required':False}], 'rule':'Readiness removes traffic; liveness failure may restart; startup delays other probes.'}
    if day==6:return {'evidence':'design','service_type':'ClusterIP','port':8080,'targetPort':80,'selector_matches':True,'access':'kubectl port-forward --address 127.0.0.1 service/jobhub-demo 8080:8080','scope':'Run only in your named teaching context and namespace.'}
    if day==7:return {'evidence':'design','current':2,'observed_utilization':90,'target_utilization':60,'ideal_desired':desired_replicas(2,90,60),'scaled_down':desired_replicas(2,10,60),'note':'Ratio illustration only; real HPA uses readiness, missing metrics, stabilization and tolerance.'}
    if day==8:return {'evidence':'design','replicas':2,'maxSurge':1,'maxUnavailable':0,'peak_pods':3,'baseline_memory_requests_mib':128,'surge_memory_requests_mib':192,'note':'Availability also depends on scheduling and probes; rollout config alone is not an SLO guarantee.'}
    if day==9:return {'evidence':'simulated','incidents':[{'reason':'FailedScheduling','first_check':'requests versus node allocatable, then taints/affinity'},{'reason':'ImagePullBackOff','first_check':'image/tag/registry reachability and credentials'},{'reason':'Readiness probe failed','first_check':'port/path, startup progress and dependencies'}],'principle':'Inspect events and current/previous logs before changing resources.'}
    raise ValueError('unknown day')

def selfcheck():
    assert slots(4000,8192,500,1024)==8
    assert slots(4000,8192,500,1024,0,1)==0
    assert desired_replicas(2,90,60)==3
    validate_manifest(json.loads((HERE/'manifests.json').read_text()))
    print('PASS: resource bottlenecks, GPU availability, scaling bounds and manifest links')

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('command',choices=['selfcheck']+[f'day{i}' for i in range(1,11)]);p.add_argument('--out',default='out');a=p.parse_args();out=Path(a.out)
    if a.command=='selfcheck':selfcheck();return
    day=int(a.command[3:]);out.mkdir(parents=True,exist_ok=True)
    for d in (range(1,10) if day==10 else [day]):
        result=experiment(d);(out/f'day{d:02d}.json').write_text(json.dumps(result,indent=2)+'\n');print('DAY',d,json.dumps(result))
    if day==10:
        with (out/'summary.csv').open('w',newline='') as f:
            w=csv.writer(f);w.writerow(['day','evidence','sha256'])
            for d in range(1,10):
                raw=(out/f'day{d:02d}.json').read_bytes();w.writerow([d,json.loads(raw)['evidence'],hashlib.sha256(raw).hexdigest()])
        (out/'environment.json').write_text(json.dumps({'python':platform.python_version(),'source_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'manifest_sha256':hashlib.sha256((HERE/'manifests.json').read_bytes()).hexdigest()}))
        (out/'REPORT.md').write_text('# Kubernetes platform design / 平台设计作品\n\nOffline design and simulations only; no cluster deployment is claimed.\n离线设计和模拟，不宣称已在集群运行。\n\n## My contribution / 本人改动\nTODO: link student.py and a manifest diff; explain requests, probe semantics and service routing.\n\n## Evidence / 证据\nAttach manifest, JSON, CSV, environment; append real kubectl outputs only if run.\n\n## Rollout and incidents / 发布与故障\nTODO: document surge capacity, rollback verification and one incident diagnosis.\n')
        print('REPORT.md ready; complete your design reasoning')
if __name__=='__main__':main()
