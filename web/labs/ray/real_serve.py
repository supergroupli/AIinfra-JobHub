"""Optional real Serve app. Run with: serve run real_serve:app"""
import importlib.metadata
from ray import serve
from starlette.responses import JSONResponse
if importlib.metadata.version('ray')!='2.60.0':
    raise RuntimeError('This example targets Ray 2.60.0')

@serve.deployment(num_replicas=1,ray_actor_options={'num_cpus':1},max_ongoing_requests=4,max_queued_requests=4)
class Square:
    async def __call__(self,request):
        try:payload=await request.json()
        except Exception:return JSONResponse({'error':'Expected JSON object'},status_code=400)
        if not isinstance(payload,dict) or type(payload.get('value')) is not int:
            return JSONResponse({'error':'value must be an integer'},status_code=400)
        value=payload['value']
        if abs(value)>1_000_000:
            return JSONResponse({'error':'value outside teaching range'},status_code=400)
        return {'square':value*value,'evidence':'measured-ray-serve-local'}
app=Square.bind()
