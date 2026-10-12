"""Read actual installed integration and deployment endpoint; no event POSTs."""
import hashlib,json,pathlib,urllib.request
layout=pathlib.Path('site/src/layouts/Layout.astro').read_text();assert "@vercel/analytics/astro" in layout and '<Analytics />' in layout
base=pathlib.Path('site/node_modules/@vercel/analytics/dist')
astro=(base/'astro/index.astro').read_text();sdk=(base/'index.mjs').read_text()
assert 'inject({' in astro and 'framework: \'astro\'' in astro and '/_vercel/insights/script.js' in sdk and 'document.head.appendChild(script)' in sdk
req=urllib.request.Request('https://www.davidalisk.com/_vercel/insights/script.js',method='HEAD')
with urllib.request.urlopen(req,timeout=30) as r:
    evidence={'url':r.url,'method':'HEAD','status':r.status,'contentType':r.headers.get('Content-Type'),'server':r.headers.get('Server'),'length':r.headers.get('Content-Length'),'date':r.headers.get('Date'),'astroSHA256':hashlib.sha256(astro.encode()).hexdigest(),'sdkSHA256':hashlib.sha256(sdk.encode()).hexdigest(),'contract':'Exact localhost static-server 404 only; deployed HTTP errors and all runtime/network failures remain failures. No stub, no integration disable, no auth bypass.'}
    assert r.status==200 and 'javascript' in evidence['contentType']
out=pathlib.Path('qa-artifacts');out.mkdir(exist_ok=True);(out/'analytics-evidence.json').write_text(json.dumps(evidence,indent=2));print(json.dumps(evidence))
