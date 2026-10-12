"""Read-only HTTP fidelity against the actual public root, no asset overlays."""
import functools,hashlib,http.server,json,pathlib,re,threading,urllib.parse,urllib.request
ROOT=pathlib.Path('/tmp/site/site/public');MAP=ROOT/'projects/freight-atlas/map';OUT=pathlib.Path('/home/hermes/workspace/freight-final-mobile-native')
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,format,*args):pass

def main():
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/projects/freight-atlas/map/'
    index=(MAP/'index.html').read_text();paths=['','index.html','../numeric.bundle','../directory.json.gz','methods.html','data.html','about.html']
    paths+=re.findall(r'(?:src|href)=["\']([^"\']+)["\']',index)
    paths+=re.findall(r'url\(([^)]+)\)',index)
    paths=[p for p in paths if not p.startswith(('http:','https:','#','data:'))]
    rows=[]
    try:
        for p in sorted(set(paths)):
            url=urllib.parse.urljoin(base,p);route=urllib.parse.urlsplit(url).path;local=ROOT/route.lstrip('/')
            if route.endswith('/'):local=local/'index.html'
            with urllib.request.urlopen(url,timeout=10) as response:
                h=hashlib.sha256();size=0
                while chunk:=response.read(65536):h.update(chunk);size+=len(chunk)
                assert response.status==200
            expected=hashlib.sha256()
            with local.open('rb') as f:
                while chunk:=f.read(65536):expected.update(chunk)
            assert h.digest()==expected.digest(),p
            rows.append({'path':route,'status':200,'bytes':size,'sha256':h.hexdigest()})
    finally:server.shutdown();server.server_close()
    OUT.mkdir(exist_ok=True);(OUT/'http-bootstrap-preflight.json').write_text(json.dumps(rows,indent=2));print(json.dumps({'verified':len(rows),'receipt':str(OUT/'http-bootstrap-preflight.json')}))
if __name__=='__main__':main()
