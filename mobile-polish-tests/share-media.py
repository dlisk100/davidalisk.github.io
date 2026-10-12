"""Hosted native CDP recording of the exact QA-built renderer, no synthetic frames."""
import base64, concurrent.futures, functools, hashlib, http.server, json, os, pathlib, queue, subprocess, threading, time
from hosted_cdp import Browser
from motion_timing import frame_intervals
from native_entry import native_entry
from network_contract import assert_event
ROOT=pathlib.Path('site/dist').resolve(); OUT=pathlib.Path('share-artifacts').resolve();OUT.mkdir(exist_ok=True)
receipts=[pathlib.Path('mobile-polish-tests/accepted-5d772b4.json')]
qa=json.loads(receipts[0].read_text());assert qa['passed'] and qa['protectedUnchanged']
assert qa['preflight']['revision']=='5d772b48024a62f2d08aa4fed8b0b0505de5a125'
subprocess.run(['git','diff','--exit-code',qa['preflight']['revision'],'HEAD','--','site/public/projects/freight-atlas','site/src/content/projects/freight-atlas.mdx'],check=True)
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
                    self.raw_bytes+=path.stat().st_size
                    (OUT/'live-frames.json').write_text(json.dumps({'startWall':self.start_wall,'elapsed':time.monotonic()-self.start_mono,'frames':self.frames}))
                    if self.raw_bytes>=160*1024**2:self.failures.append('raw capture 160MB safety cap reached');self.recording=False
            else:
                self.events.append(e)
                try:assert_event(e,origin)
                except Exception as ex:self.failures.append(str(ex))
    def start(self,label):
        self.frame_dir=OUT/('raw-'+label);self.frame_dir.mkdir();self.frames=[];self.raw_bytes=0;self.recording=True
        self.start_wall=time.time();self.start_mono=time.monotonic();self.call('Page.startScreencast',format='jpeg',quality=88,maxWidth=880,maxHeight=1100,everyNthFrame=1)
    def stop(self,label,seconds):
        remaining=seconds-(time.monotonic()-self.start_mono)
        if remaining>0:time.sleep(remaining)
        self.call('Page.stopScreencast');self.recording=False
        elapsed=time.monotonic()-self.start_mono;assert seconds<=elapsed<seconds+1,elapsed
        assert self.frames
        (OUT/'capture-errors.json').write_text(json.dumps(self.failures,indent=2))
        manifest=OUT/(label+'-frames.json');manifest.write_text(json.dumps({'startWall':self.start_wall,'elapsed':elapsed,'frames':self.frames},indent=2))
        # Source timestamps determine frame holds: no speedup or interpolation.
        intervals,duration=frame_intervals(self.frames,seconds,elapsed)
        entries=[]
        for f,delta in intervals:
            entries.extend(["file '"+f['file']+"'",'duration '+str(delta)])
        entries.append("file '"+intervals[-1][0]['file']+"'")
        concat=OUT/(label+'.concat');concat.write_text('\n'.join(entries)+'\n')
        subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-t',str(duration),'-vf','scale=880:1100:flags=lanczos,fps=25','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-an',str(OUT/(label+'.mp4'))],check=True)
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
    def scene_ready():
        wait('!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending')
        wait('prefetchPlanTimer===null&&BoundedTiles.prefetch.job===null&&!BoundedTiles.prefetch.status().active')
    def warm_zoom(target,ll,closer):
        for _ in range(22):
            k=b.ev('APP.camera().k')/national['k']
            if (closer and k>=target) or (not closer and k<=target):break
            scene_ready();b.wheel(*on_canvas(point(ll)),-100 if closer else 100);time.sleep(.2);scene_ready()
        log('native warm zoom settled',{'ll':ll,'camera':b.ev('APP.camera()')})
    # Continuous wheel leaves d3 zoom active for 150ms after its last event;
    # Gesture.end then waits 120ms. Each zoom event begins LOAD.pending and
    # cached geometry cannot commit while active. Short native pauses are required.
    path=[]
    def zoom_move(seconds,anchor,total):
        start=time.monotonic();sent=0
        while time.monotonic()-start<seconds:
            wanted=total*min(1,(time.monotonic()-start)/seconds)
            b.wheel(*anchor,wanted-sent);sent=wanted;time.sleep(.04)
        b.wheel(*anchor,total-sent)
    def pause(label,warming=False):
        if warming:scene_ready()
        else:
            time.sleep(.85)
            log('visible native pause '+label,{'camera':b.ev('APP.camera()'),'pending':b.ev('!!DETAIL_LOADING.pending'),'gesture':b.ev('({active:GESTURE.active,dirty:GESTURE.dirty})')})
    def choreography(warming=False):
        def zoom(label,ll,total):
            anchor=on_canvas(point(ll));zoom_move(1.85,anchor,total);path.append(('zoom',anchor,total)) if warming else None;pause(label,warming)
        def pan(label,dx,dy):
            pan_for(1.85,dx,dy);path.append(('pan',dx,dy)) if warming else None;pause(label,warming)
        zoom('Chicago regional',[-87.63,41.88],-550)
        zoom('Chicago local',[-87.63,41.88],-350)
        pan('Midwest threads',-65,25)
        zoom('Midwest pullback',[-87.63,41.88],350)
        gulf=point([-91,30]);dx=max(-175,min(175,220-gulf[0]));dy=max(-170,min(170,310-gulf[1]))
        pan('Gulf transition',dx,dy)
        gulf=point([-91,30]);dx=max(-175,min(175,220-gulf[0]));dy=max(-170,min(170,310-gulf[1]))
        pan('Louisiana regional',dx,dy)
        zoom('Gulf local',[-91,30],-350)
        pan('Gulf routes toward Texas',100,-20)
        zoom('Gulf regional pullback',[-94,30],350)
    log('native exact-path prewarming starts')
    choreography(True)
    # Undo the same native affine gestures; do not mutate the APP camera.
    for operation in reversed(path):
        if operation[0]=='zoom':zoom_move(.5,operation[1],-operation[2])
        else:pan_for(.5,-operation[1],-operation[2])
        scene_ready()
    scene_ready();national=b.ev('APP.camera()');log('native exact-path prewarming ready',national)
    b.start('freight-atlas-tour');log('continuous motion tour start',national)
    sampler=threading.Thread(target=sample,daemon=True);sampler.start()
    choreography(False)
    sampling=False;sampler.join(timeout=3)
    actual=time.monotonic()-b.start_mono
    b.stop('freight-atlas-tour',actual)
    scene_ready();shot('gulf-energy')
    # Independently compose fresh stills; never interrupt the actual recording.
    zoom_move(1.2,on_canvas(point([-95.37,29.76])),-350);scene_ready();shot('texas-local')
    zoom_move(1.2,[220,310],900);scene_ready()
    for _ in range(5):
        g=point([-87.63,41.88]);dx=max(-175,min(175,220-g[0]));dy=max(-170,min(170,310-g[1]))
        if abs(dx)+abs(dy)<2:break
        b.drag(220,300,220+dx,300+dy);scene_ready()
    zoom_move(1.5,on_canvas(point([-87.63,41.88])),-550);scene_ready();shot('midwest-threads')
    zoom_move(1.2,on_canvas(point([-87.63,41.88])),-350);scene_ready();shot('chicago-local')
    video=OUT/'freight-atlas-tour.mp4'
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]))
    stream=probe['streams'][0];assert len(probe['streams'])==1 and stream['codec_name']=='h264' and stream['pix_fmt']=='yuv420p' and (stream['width'],stream['height'])==(880,1100) and abs(float(probe['format']['duration'])-actual)<.15
    subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],check=True)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(video),'-vf','fps=1,scale=220:275,tile=6x5','-frames:v','1',str(OUT/'contact-sheet.jpg')],check=True)
    for sec in range(int(actual)+1):subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(sec),'-i',str(video),'-frames:v','1','-vf','scale=440:550',str(OUT/('probe-%02d.jpg'%sec))],check=True)
    moving=0;observed=0
    for a,z in zip(movement,movement[1:]):
        dt=z['elapsed']-a['elapsed'];c=a['camera'];d=z['camera'];observed+=dt
        if abs(c['x']-d['x'])+abs(c['y']-d['y'])+abs(c['k']-d['k'])*100>.5:moving+=dt
    assert observed>20 and moving/observed>=.5,{'observed':observed,'moving':moving}
    report={'revision':qa['preflight']['revision'],'hashes':qa['hashesAfter'],'actions':actions,'probe':probe,'errors':b.failures,'qaReceipt':receipts[0].name,'segments':'one uninterrupted native CDP recording; no cuts, holds added, retiming, overlays or APP camera writes','movement':{'observedSeconds':observed,'movingSeconds':moving,'fraction':moving/observed,'samples':len(movement),'threshold':'sum CSS camera translation plus scale delta*100 > 0.5 between 200ms observations; visual review separately required'},'physicalDevices':'not tested'}
    (OUT/'media-report.json').write_text(json.dumps(report,indent=2));assert not b.failures,b.failures
    assert sum(p.stat().st_size for p in OUT.glob('*') if p.is_file())<50*1024**2

finally:
    if b.recording:
        try:b.call('Page.stopScreencast')
        except Exception:pass
    (OUT/'capture-errors.json').write_text(json.dumps(b.failures,indent=2))
    if b.frames:(OUT/'failure-safe-frames.json').write_text(json.dumps({'startWall':b.start_wall,'elapsed':time.monotonic()-b.start_mono,'frames':b.frames},indent=2))
    try:b.call('Browser.close')
    except Exception:pass
    b.cleanup();server.shutdown();server.server_close()
