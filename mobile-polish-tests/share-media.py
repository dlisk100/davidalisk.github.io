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
        subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-t',str(seconds),'-vf','scale=880:1100:flags=lanczos,fps=25','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-an',str(OUT/(label+'.mp4'))],check=True)
    def cleanup(self):
        self.running=False;super().cleanup()
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
actions=[]
def log(action,data=None):
    actions.append({'wall':time.time(),'action':action,'data':data})
    (OUT/'actions.json').write_text(json.dumps(actions,indent=2))
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
    time.sleep(6.1);assert b.ev("document.querySelector('#map-hint').hidden")
    national=b.ev('APP.camera()')
    movement=[];sampling=True
    def sample():
        while sampling:
            try:
                movement.append({'elapsed':time.monotonic()-b.start_mono,'camera':b.ev('APP.camera()'),'pending':b.ev('!!DETAIL_LOADING.pending')})
                (OUT/'movement.json').write_text(json.dumps(movement,indent=2))
            except Exception as e:log('movement sampling failure',str(e));return
            time.sleep(.2)
    def wheel_for(seconds,point,delta):
        log('native paced wheel start',{'seconds':seconds,'point':point,'delta':delta})
        end=time.monotonic()+seconds
        while time.monotonic()<end:
            b.wheel(point[0],point[1],delta);time.sleep(.05)
        log('native paced wheel end',b.ev('APP.camera()'))
    def pan_for(seconds,dx,dy):
        # Small native movement increments, ordinary gesture speed, never APP camera writes.
        log('native continuous pan start',{'seconds':seconds,'dx':dx,'dy':dy})
        x,y=220,300;b.mouse('mousePressed',x,y,button='left',buttons=1,clickCount=1)
        start=time.monotonic();end=start+seconds
        while time.monotonic()<end:
            t=min(1,(time.monotonic()-start)/seconds)
            b.mouse('mouseMoved',x+dx*t,y+dy*t,button='left',buttons=1);time.sleep(.04)
        b.mouse('mouseReleased',x+dx,y+dy,button='left',clickCount=1)
        log('native continuous pan end',b.ev('APP.camera()'))
    def point(ll):return b.ev('APP.screenOf('+json.dumps(ll)+')')
    def on_canvas(p):return [max(35,min(405,p[0])),max(170,min(495,p[1]))]
    b.start('freight-atlas-tour');log('continuous motion tour start',national)
    sampler=threading.Thread(target=sample,daemon=True);sampler.start()
    time.sleep(1)
    wheel_for(3.2,on_canvas(point([-87.63,41.88])),-40);time.sleep(.6)
    pan_for(2.4,-90,25);time.sleep(.3)
    wheel_for(2.4,[220,310],35);time.sleep(.3)
    gulf=point([-90,30]);dx=max(-175,min(175,220-gulf[0]));dy=max(-170,min(170,310-gulf[1]))
    pan_for(2.4,dx,dy);time.sleep(.3)
    wheel_for(3.2,on_canvas(point([-90,30])),-35);time.sleep(.6)
    pan_for(2.4,110,-25);time.sleep(.3)
    wheel_for(1.6,[220,310],40);time.sleep(.25)
    compare=b.ev('APP.camera()');tap('#unit button[data-u=usd]');assert compare==b.ev('APP.camera()');log('same-camera USD comparison',compare);time.sleep(.65)
    remaining=29-(time.monotonic()-b.start_mono)
    assert remaining>.2,remaining
    wheel_for(remaining,[220,310],-30)
    b.stop('freight-atlas-tour',29)
    sampling=False;sampler.join(timeout=3)
    wait('!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending')
    shot('gulf-energy')
    # Stills are independently composed with native input AFTER continuous recording.
    b.ev('APP.camera()')
    ratio=b.ev('APP.camera().k')/national['k']
    while ratio>1.1:
        b.wheel(220,310,70);time.sleep(.18);ratio=b.ev('APP.camera().k')/national['k']
    wait('!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending')
    for _ in range(4):
        c=b.ev('APP.camera()');dx=national['x']-c['x'];dy=national['y']-c['y']
        if abs(dx)+abs(dy)<2:break
        b.drag(220,300,220+max(-175,min(175,dx)),300+max(-160,min(160,dy)));time.sleep(.3)
    wait('!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending');shot('national-usd')
    tap('#unit button[data-u=t]')
    wheel_for(3.2,on_canvas(point([-87.63,41.88])),-40)
    wait('!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending');shot('midwest-threads')
    video=OUT/'freight-atlas-tour.mp4'
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]))
    stream=probe['streams'][0];assert len(probe['streams'])==1 and stream['codec_name']=='h264' and stream['pix_fmt']=='yuv420p' and (stream['width'],stream['height'])==(880,1100) and 28.9<=float(probe['format']['duration'])<=29.1
    subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],check=True)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(video),'-vf','fps=1,scale=220:275,tile=6x5','-frames:v','1',str(OUT/'contact-sheet.jpg')],check=True)
    for sec in range(29):subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(sec),'-i',str(video),'-frames:v','1','-vf','scale=440:550',str(OUT/('probe-%02d.jpg'%sec))],check=True)
    moving=0;observed=0
    for a,z in zip(movement,movement[1:]):
        dt=z['elapsed']-a['elapsed'];c=a['camera'];d=z['camera'];observed+=dt
        if abs(c['x']-d['x'])+abs(c['y']-d['y'])+abs(c['k']-d['k'])*100>.5:moving+=dt
    assert observed>27 and moving/observed>=2/3,{'observed':observed,'moving':moving}
    report={'revision':qa['preflight']['revision'],'hashes':qa['hashesAfter'],'actions':actions,'probe':probe,'errors':b.failures,'qaReceipt':receipts[0].name,'segments':'one uninterrupted native CDP recording; no cuts, holds added, retiming, overlays or APP camera writes','movement':{'observedSeconds':observed,'movingSeconds':moving,'fraction':moving/observed,'samples':len(movement),'threshold':'sum CSS camera translation plus scale delta*100 > 0.5 between 200ms observations; visual review separately required'},'physicalDevices':'not tested'}
    (OUT/'media-report.json').write_text(json.dumps(report,indent=2));assert sum(p.stat().st_size for p in OUT.glob('*') if p.is_file())<50*1024**2

finally:
    try:b.call('Browser.close')
    except Exception:pass
    b.cleanup();server.shutdown();server.server_close()
