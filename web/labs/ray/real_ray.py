"""Optional real Ray 2.60.0 CPU tasks. Requires a separately installed SDK."""
import importlib.metadata
import ray
if importlib.metadata.version('ray')!='2.60.0':raise SystemExit('Use ray==2.60.0 for this optional example.')
@ray.remote(num_cpus=1)
def square(x):return x*x
if __name__=='__main__':
    ray.init(num_cpus=2,include_dashboard=False)
    try:
        pending=[];output=[]
        for value in range(8):
            if len(pending)>=2:
                ready,pending=ray.wait(pending,num_returns=1);output.extend(ray.get(ready))
            pending.append(square.remote(value))
        output.extend(ray.get(pending));assert sorted(output)==[0,1,4,9,16,25,36,49]
        print({'evidence':'measured-ray-local','sum':sum(output),'sorted_squares':sorted(output)})
    finally:ray.shutdown()
