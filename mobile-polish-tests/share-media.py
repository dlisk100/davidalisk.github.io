"""Hosted native CDP recording of the exact QA-built renderer, no synthetic frames."""
import base64, concurrent.futures, functools, hashlib, http.server, json, os, pathlib, queue, subprocess, threading, time
from hosted_cdp import Browser
from native_entry import native_entry
from network_contract import assert_event
ROOT=pathlib.Path('site/dist').resolve(); OUT=pathlib.Path('share-artifacts').resolve();OUT.mkdir(exist_ok=True)
receipts=list(pathlib.Path('qa-artifacts').glob('receipt-*.json'));assert len(receipts)==1
qa=json.loads(receipts[0].read_text());assert qa['passed'] and qa['protectedUnchanged']
assert qa['preflight']['revision']==subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
for n,h in qa['hashesAfter'].items():assert hashlib.sha256((ROOT/'projects/freight-atlas/map'/n).read_bytes()).hexdigest()==h
class Recorder(Browser):
    def __enter__(self):
        super().__enter__();self.lock=threading.Lock();self.pending={};self.frames=[];self.recording=False;self.running=True;self.failures=[]
        self.reader=threading.Thread(target=self.receive,daemon=True);self.reader.start();return self
    def send(self,method,params,wait=True):
        with self.lock:
            self.n+=1;ident=self.n;q=queue.Queue();self.pending[ident]=q if wait else None
            self.ws.send(json.dumps({'id':ident,'method':method,'params':params}))
        if not wait:return
        response=q.get(timeout=90)
        if 'error' in response:raise RuntimeError(response['error'])
        return response.get('result',{})
    def call(self,method,**params):return self.send(method,params)
    def receive(self):
        while self.running:
            try:e=json.loads(self.ws.recv(timeout=2))
            except TimeoutError:continue
            except Exception as ex:
                if self.running:self.failures.append(str(ex))
                return
            if 'id' in e:
                with self.lock:q=self.pending.pop(e['id'],None)
                if q is not None:q.put(e)
            elif e.get('method')=='Page.screencastFrame':
                p=e['params'];self.send('Page.screencastFrameAck',{'sessionId':p['sessionId']},wait=False)
                if self.recording:
                    path=self.frame_dir/('%06d.jpg'%len(self.frames));path.write_bytes(base64.b64decode(p['data']))
                    self.frames.append({'file':str(path),'timestamp':p['metadata']['timestamp'],'metadata':p['metadata']})
            else:
                self.events.append(e)
                try:assert_event(e,origin)
                except Exception as ex:self.failures.append(str(ex))
    def start(self,label):
        self.frame_dir=OUT/('raw-'+label);self.frame_dir.mkdir();self.frames=[];self.recording=True
        self.start_wall=time.time();self.start_mono=time.monotonic();self.call('Page.startScreencast',format='jpeg',quality=88,maxWidth=880,maxHeight=1100,everyNthFrame=1)
    def stop(self,label,seconds):
        remaining=seconds-(time.monotonic()-self.start_mono)
        if remaining>0:time.sleep(remaining)
        self.call('Page.stopScreencast');self.recording=False
        elapsed=time.monotonic()-self.start_mono;assert seconds<=elapsed<seconds+1,elapsed
        assert self.frames and not self.failures,self.failures
        manifest=OUT/(label+'-frames.json');manifest.write_text(json.dumps({'startWall':self.start_wall,'elapsed':elapsed,'frames':self.frames},indent=2))
        # Source timestamps determine frame holds: no speedup or interpolation.
        entries=[]
        for i,f in enumerate(self.frames):
            end=self.frames[i+1]['timestamp'] if i+1<len(self.frames) else self.frames[0]['timestamp']+seconds
            delta=end-f['timestamp'];assert delta>0
            entries.extend(["file '"+f['file']+"'",'duration '+str(delta)])
        entries.append("file '"+self.frames[-1]['file']+"'")
        concat=OUT/(label+'.concat');concat.write_text('\n'.join(entries)+'\n')
        subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-t',str(seconds),'-vf','scale=880:1100:flags=lanczos','-r','25','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-an',str(OUT/(label+'.mp4'))],check=True)
    def cleanup(self):
        self.running=False;super().cleanup()
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
actions=[]
def log(action,data=None):actions.append({'wall':time.time(),'action':action,'data':data})
with_dummy=None
b=Recorder(440,550);b.__enter__()
try:
    for method in ['Page.enable','Runtime.enable','Network.enable']:b.call(method)
    b.call('Emulation.setDeviceMetricsOverride',width=440,height=550,deviceScaleFactor=2,mobile=True)
    b.call('Emulation.setTouchEmulationEnabled',enabled=True,maxTouchPoints=2)
    def wait(expr,limit=120):
        end=time.monotonic()+limit
        while time.monotonic()<end:
            if b.failures:raise RuntimeError(b.failures)
            if b.ev(expr):return
            time.sleep(.1)
        raise TimeoutError(expr)
    def tap(selector):
        p=b.ev("(()=>{const e=document.querySelector("+json.dumps(selector)+"),r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(x<0||x>innerWidth||y<0||y>innerHeight||!e.contains(document.elementFromPoint(x,y)))throw Error('Obstructed '+"+json.dumps(selector)+");return{x,y}})()")
        log('native tap '+selector,p);b.click(p['x'],p['y'])
    def shot(name):
        assert not b.recording,'Screenshots must never interrupt recording'
        (OUT/(name+'.png')).write_bytes(base64.b64decode(b.call('Page.captureScreenshot',format='png',captureBeyondViewport=False)['data']))
    b.call('Page.navigate',url=origin+'/projects/freight-atlas/map/');wait("document.body?.dataset.ready==='1'&&!!window.ATLAS_EXPLORE");native_entry(b);wait("document.getElementById('startup-loading').hidden&&!DETAIL_LOADING.pending")
    assert b.ev("document.querySelector('#national-headline').textContent.includes('2024')&&!document.querySelector('#atlas-docs')&&!document.querySelector('#lab .insets')")
    national=b.ev('APP.camera()');shot('national-tons');b.start('national');log('national tons start',national);time.sleep(7)
    tap('#unit button[data-u=usd]');assert b.ev('APP.camera()')==national;log('same-camera USD',b.ev('APP.camera()'));b.stop('national',14);shot('national-usd')
    def chicago():
        tap('#atlas-menu>summary');tap('input[type=search]');b.call('Input.dispatchKeyEvent',type='rawKeyDown',key='a',code='KeyA',windowsVirtualKeyCode=65,modifiers=2);b.call('Input.dispatchKeyEvent',type='keyUp',key='a',code='KeyA',windowsVirtualKeyCode=65,modifiers=2);b.call('Input.insertText',text='Chicago');wait("!!document.querySelector('.ae-results button')");tap('.ae-results button');wait("APP.selectedPlace()?.name?.includes('Chicago')&&!DETAIL_LOADING.pending")
    chicago();log('Chicago native preparation',b.ev('APP.getView()'));tap('#card .x');b.start('chicago');log('Chicago segment start');time.sleep(1)
    for _ in range(3):b.wheel(220,230,-90);log('native wheel zoom',-90);time.sleep(.4)
    wait('!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending');time.sleep(1);chicago();log('readable Chicago card',b.ev("document.querySelector('#card').innerText"));b.stop('chicago',14);shot('chicago-card')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(OUT/'national.mp4'),'-i',str(OUT/'chicago.mp4'),'-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0[v]','-map','[v]','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-an','-movflags','+faststart',str(OUT/'freight-atlas-tour.mp4')],check=True)
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(OUT/'freight-atlas-tour.mp4')]))
    stream=probe['streams'][0];assert len(probe['streams'])==1 and stream['codec_name']=='h264' and stream['pix_fmt']=='yuv420p' and (stream['width'],stream['height'])==(880,1100) and 25<=float(probe['format']['duration'])<=30
    subprocess.run(['ffmpeg','-v','error','-i',str(OUT/'freight-atlas-tour.mp4'),'-f','null','-'],check=True)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(OUT/'freight-atlas-tour.mp4'),'-vf','fps=1/2,scale=220:275,tile=7x2','-frames:v','1',str(OUT/'contact-sheet.jpg')],check=True)
    for sec in [0,6,8,13,15,18,21,25,27]:subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(sec),'-i',str(OUT/'freight-atlas-tour.mp4'),'-frames:v','1',str(OUT/('probe-%02d.jpg'%sec))],check=True)
    report={'revision':qa['preflight']['revision'],'hashes':qa['hashesAfter'],'sameNationalCamera':national,'actions':actions,'probe':probe,'errors':b.failures,'qaReceipt':receipts[0].name,'segments':'14 seconds national then deliberate cut to 14 seconds Chicago; preparation excluded, recorded waits unchanged','physicalDevices':'not tested'}
    (OUT/'media-report.json').write_text(json.dumps(report,indent=2));assert sum(p.stat().st_size for p in OUT.glob('*') if p.is_file())<50*1024**2
finally:
    try:b.call('Browser.close')
    except Exception:pass
    b.cleanup();server.shutdown();server.server_close()
