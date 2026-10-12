"""QA only: inverse-projected geography, never source precision or raster equality.
Only camera.center and selection.point may differ: <=1e-9 degrees AND <=0.01
CSS px using the live projector/transform. All other fields/array order exact.
Longitude is not normalized: this lower-48 codec stores literal [-180,180]
coordinates, no bearing/rotation exists. A 360-degree rewrite is not equivalent
serialized state. No broad numeric/deep-almost-equal, no ignored state fields.
"""
import copy, math

def compare_view(expected, actual, projected):
    e,a=copy.deepcopy(expected),copy.deepcopy(actual)
    measurements={}
    try:
        paths=[('camera','center')]
        if expected.get('selection') is not None:paths.append(('selection','point'))
        for owner,field in paths:
            p,q=expected[owner][field],actual[owner][field]
            assert len(p)==len(q)==2 and all(type(v) in (int,float) and math.isfinite(v) for v in p+q)
            deg=[abs(x-y) for x,y in zip(p,q)]
            u,v=projected[owner]
            assert len(u)==len(v)==2 and all(type(x) in (int,float) and math.isfinite(x) for x in u+v)
            px=math.hypot(u[0]-v[0],u[1]-v[1])
            measurements[owner]={'degreeDelta':deg,'cssPixelDelta':px}
            assert max(deg)<=1e-9 and px<=.01
            a[owner][field]=e[owner][field]
        return {'pass':e==a,'measurements':measurements,'projected':projected}
    except (AssertionError,KeyError,TypeError,ValueError):
        return {'pass':False,'measurements':measurements,'projected':projected}
