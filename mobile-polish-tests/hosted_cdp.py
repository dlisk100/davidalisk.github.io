"""Small standalone CDP transport; hosted runners only, never VPS admission."""
import json, os, pathlib, shutil, subprocess, tempfile, time, urllib.request
from websockets.sync.client import connect

class Browser:
    def __init__(self, W, H):
        self.W, self.H = W, H
        self.events = []
        self.n = 0
    def __enter__(self):
        if os.environ.get('GITHUB_ACTIONS') != 'true':
            raise RuntimeError('Browser launch is restricted to GitHub Actions')
        chrome = shutil.which('google-chrome') or shutil.which('google-chrome-stable')
        if not chrome:
            raise RuntimeError('Hosted Chrome is not installed')
        self.prof = tempfile.TemporaryDirectory(prefix='freight-qa-')
        self.p = subprocess.Popen([chrome, '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir='+self.prof.name, 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        end = time.monotonic()+20
        while time.monotonic()<end:
            try:
                port = (pathlib.Path(self.prof.name)/'DevToolsActivePort').read_text().splitlines()[0]
                with urllib.request.urlopen('http://127.0.0.1:'+port+'/json', timeout=2) as response:
                    tabs = json.load(response)
                self.ws = connect(next(t['webSocketDebuggerUrl'] for t in tabs if t['type']=='page'), max_size=None, open_timeout=10)
                return self
            except (OSError, StopIteration):
                time.sleep(.1)
        raise TimeoutError('Hosted Chrome startup')
    def call(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({'id':self.n,'method':method,'params':params}))
        while True:
            response=json.loads(self.ws.recv(timeout=90))
            if response.get('id')==self.n:
                if 'error' in response: raise RuntimeError(json.dumps(response['error']))
                return response.get('result', {})
            if 'method' in response: self.events.append(response)
    def ev(self, expression):
        result=self.call('Runtime.evaluate',expression=expression,returnByValue=True,awaitPromise=True)
        if 'exceptionDetails' in result: raise RuntimeError(json.dumps(result['exceptionDetails'])[:1000])
        return result['result'].get('value')
    def mouse(self, typ, x, y, **kw):
        return self.call('Input.dispatchMouseEvent',type=typ,x=x,y=y,**kw)
    def click(self,x,y):
        self.mouse('mouseMoved',x,y)
        self.mouse('mousePressed',x,y,button='left',buttons=1,clickCount=1)
        time.sleep(.05)
        self.mouse('mouseReleased',x,y,button='left',clickCount=1)
    def wheel(self,x,y,dy):
        self.mouse('mouseWheel',x,y,deltaX=0,deltaY=dy)
    def drag(self,x,y,endx,endy):
        self.mouse('mousePressed',x,y,button='left',buttons=1,clickCount=1)
        for i in range(1,21):
            self.mouse('mouseMoved',x+(endx-x)*i/20,y+(endy-y)*i/20,button='left',buttons=1)
            time.sleep(.016)
        self.mouse('mouseReleased',endx,endy,button='left',clickCount=1)
    def cleanup(self):
        if hasattr(self,'ws'): self.ws.close()
        if hasattr(self,'p'):
            try: self.p.wait(timeout=15)
            except subprocess.TimeoutExpired: self.p.terminate(); self.p.wait(timeout=5)
        if hasattr(self,'prof'): self.prof.cleanup()
