"""Read-only code facts and contrast audit; no browser or source writes."""
import hashlib,json,pathlib,subprocess
R=pathlib.Path('/tmp/site');M=R/'site/public/projects/freight-atlas/map';O=pathlib.Path('/home/hermes/workspace/freight-final-mobile-native')
def luminance(s):
    c=[int(s[i:i+2],16)/255 for i in (1,3,5)]
    c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]
    return sum(a*b for a,b in zip(c,[.2126,.7152,.0722]))
def contrast(a,b):
    x,y=sorted([luminance(a),luminance(b)]);return (y+.05)/(x+.05)
changed=subprocess.check_output(['git','diff','--name-only','40b37ef','c49e8c0','--','site/public'],cwd=R,text=True).splitlines()
allowed={'atlas-bridge.css','atlas-bridge.js','data.html','index.html','proto.js','startup-visuals.css'}
assert all(pathlib.Path(p).name in allowed for p in changed),changed
r={'candidate':'c49e8c02f568f53bcb87b0a65ca1a76ef874a484','changedPublicFiles':changed,'paletteContrast':{'inkOnPaper':contrast('#262019','#f5efdd'),'sepiaOnPaper':contrast('#5f4b38','#f5efdd')},'notCertified':'Computed palette contrast is not a rendered all-text accessibility audit; density policies are byte-preserved, not visually inspected.'}
assert all(v>=4.5 for v in r['paletteContrast'].values())
for name in ['core.js.gz','plate.json.gz','pz-sys.js.gz','explore-catalog.json','route-render.js','info-inspector.js','owners.js','replacement-loader.js','road-selection.js','compact-admission.js']:
    original=subprocess.check_output(['git','show','40b37ef:site/public/projects/freight-atlas/map/'+name],cwd=R)
    current=(M/name).read_bytes();assert current==original,name
    r.setdefault('protectedSHA256',{})[name]=hashlib.sha256(current).hexdigest()
for name in ['numeric.bundle','directory.json.gz']:
    p=M.parent/name;original=subprocess.check_output(['git','show','40b37ef:site/public/projects/freight-atlas/'+name],cwd=R);assert p.read_bytes()==original
    r['protectedSHA256'][name]=hashlib.sha256(original).hexdigest()
O.mkdir(exist_ok=True);(O/'code-audit.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
