"""Hosted native CDP recording of the exact QA-built renderer, no synthetic frames."""
import math, base64, concurrent.futures, functools, hashlib, http.server, json, os, pathlib, queue, subprocess, threading, time
from hosted_cdp import Browser
from motion_timing import frame_intervals
from native_calibration import gain,wheel_delta
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
    national=b.ev('APP.camera()'); base=national['k']; clips=[]; snapshots={}
    chicago=[-87.63,41.88]; center=[220,320]
    def camera():return b.ev('APP.camera()')
    def point(ll):return b.ev('APP.screenOf('+json.dumps(ll)+')')
    def scene_ready():
        time.sleep(.35)
        wait('!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending')
        wait('prefetchPlanTimer===null&&BoundedTiles.prefetch.job===null&&!BoundedTiles.prefetch.status().active')
    def pan_for(seconds,dx,dy):
        x,y=220,320;b.mouse('mousePressed',x,y,button='left',buttons=1,clickCount=1)
        start=time.monotonic()
        while time.monotonic()-start<seconds:
            t=min(1,(time.monotonic()-start)/seconds)
            b.mouse('mouseMoved',x+dx*t,y+dy*t,button='left',buttons=1);time.sleep(.04)
        b.mouse('mouseReleased',x+dx,y+dy,button='left',clickCount=1)
        log('native pan',{'dx':dx,'dy':dy,'camera':camera()})
    def center_chicago():
        for _ in range(12):
            p=point(chicago);dx=center[0]-p[0];dy=center[1]-p[1]
            if abs(dx)+abs(dy)<2:return
            pan_for(.35,max(-140,min(140,dx)),max(-140,min(140,dy)));scene_ready()
        raise AssertionError('Chicago anchor not centered')
    def zoom_move(seconds,total):
        start=time.monotonic();sent=0
        while time.monotonic()-start<seconds:
            wanted=total*min(1,(time.monotonic()-start)/seconds)
            b.wheel(*center,wanted-sent);sent=wanted;time.sleep(.045)
        b.wheel(*center,total-sent)
        log('native zoom',{'delta':total,'camera':camera()})
    scene_ready();center_chicago()
    before=camera()['k'];b.wheel(*center,-400);scene_ready();after=camera()['k']
    coefficient=gain(before,after,-400)
    log('measured native wheel calibration',{'before':before,'after':after,'delta':-400,'gain':coefficient})
    def target_zoom(target,seconds=.75):
        zoom_move(seconds,wheel_delta(camera()['k']/base,target,coefficient));scene_ready()
        for _ in range(3):
            ratio=camera()['k']/base
            if abs(math.log(ratio/target))<.025:break
            zoom_move(.3,wheel_delta(ratio,target,coefficient));scene_ready()
        assert abs(math.log(camera()['k']/base/target))<.025,camera()
    def still(name,target):
        target_zoom(target);center_chicago();scene_ready();shot(name)
        snapshots[name]={'camera':camera(),'ratio':camera()['k']/base,'chicagoScreen':point(chicago),'pending':b.ev('!!DETAIL_LOADING.pending')}
        (OUT/'stills-report.json').write_text(json.dumps(snapshots,indent=2))
    # Complete the three independent settled photos before video production.
    still('midwest-tons',3.5)
    still('chicago-great-lakes',7.5)
    target_zoom(3.5);center_chicago();scene_ready();tap('[data-u="usd"]');scene_ready();shot('midwest-usd')
    snapshots['midwest-usd']={'camera':camera(),'ratio':camera()['k']/base,'chicagoScreen':point(chicago),'pending':b.ev('!!DETAIL_LOADING.pending')}
    assert all(abs(snapshots['midwest-tons']['camera'][key]-snapshots['midwest-usd']['camera'][key])<.1 for key in ('x','y','k'))
    (OUT/'stills-report.json').write_text(json.dumps(snapshots,indent=2))
    tap('[data-u="t"]');scene_ready()
    # Warm every view with native gestures, then each separately recorded scene
    # starts from real settled geometry. No hiding loaders or timing changes.
    target_zoom(1);center_chicago();scene_ready()
    movement=[]
    def record(label,gesture):
        scene_ready();b.start(label);start=camera();sampling=True
        def sample():
            while sampling:
                movement.append({'clip':label,'elapsed':time.monotonic()-b.start_mono,'camera':camera(),'pending':b.ev('!!DETAIL_LOADING.pending')})
                time.sleep(.2)
        sampler=threading.Thread(target=sample,daemon=True);sampler.start()
        gesture();scene_ready();wait("document.getElementById('detail-loading').hidden");time.sleep(1.1)
        sampling=False;sampler.join(timeout=3)
        actual=time.monotonic()-b.start_mono
        b.stop(label,actual)
        clips.append({'label':label,'seconds':actual,'start':start,'end':camera(),'pendingEnd':b.ev('!!DETAIL_LOADING.pending')})
        (OUT/'clips.json').write_text(json.dumps(clips,indent=2))
        (OUT/'movement.json').write_text(json.dumps(movement,indent=2))
    record('01-national-midwest',lambda:zoom_move(2.4,wheel_delta(camera()['k']/base,3.5,coefficient)))
    target_zoom(3.5);center_chicago();scene_ready()
    record('02-midwest-chicago',lambda:zoom_move(2.4,wheel_delta(camera()['k']/base,7.5,coefficient)))
    target_zoom(7.5);center_chicago();scene_ready()
    # Drift west/south so the frame explores dense land corridors rather than water.
    pan_for(.5,75,-30);scene_ready();pan_for(.5,-75,30);scene_ready()
    record('03-great-lakes-corridors',lambda:pan_for(3,75,-30))
    scene_ready()
    record('04-midwest-pullback',lambda:zoom_move(2.4,wheel_delta(camera()['k']/base,3.5,coefficient)))
    target_zoom(3.5);center_chicago();scene_ready()
    tap('[data-u="usd"]');scene_ready();tap('[data-u="t"]');scene_ready()
    def dollars():
        tap('[data-u="usd"]');time.sleep(.6);pan_for(2.4,35,-15)
    record('05-midwest-dollars',dollars)
    assert not b.failures,b.failures
finally:
    if b.recording:
        try:b.call('Page.stopScreencast')
        except Exception:pass
    (OUT/'capture-errors.json').write_text(json.dumps(b.failures,indent=2))
    if b.frames:(OUT/'failure-safe-frames.json').write_text(json.dumps({'startWall':b.start_wall,'elapsed':time.monotonic()-b.start_mono,'frames':b.frames},indent=2))
    try:b.call('Browser.close')
    except Exception:pass
    b.cleanup();server.shutdown();server.server_close()
# Browser and sampling are stopped before any codec work.
for clip in clips:
    label=clip['label']
    subprocess.run(['ffmpeg','-y','-loglevel','error','-threads','2','-f','concat','-safe','0','-i',str(OUT/(label+'.concat')),'-t',str(clip['seconds']),'-vf','scale=880:1100:flags=lanczos,fps=25','-c:v','libx264','-threads','2','-preset','medium','-crf','22','-pix_fmt','yuv420p','-an',str(OUT/(label+'.mp4'))],check=True)
(OUT/'tour.concat').write_text(''.join("file '"+str(OUT/(clip['label']+'.mp4'))+"'\n" for clip in clips))
video=OUT/'freight-atlas-tour.mp4'
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(OUT/'tour.concat'),'-c','copy','-movflags','+faststart',str(video)],check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]))
stream=probe['streams'][0]
assert len(probe['streams'])==1 and stream['codec_name']=='h264' and stream['pix_fmt']=='yuv420p' and (stream['width'],stream['height'])==(880,1100)
assert 20<=float(probe['format']['duration'])<=30,probe['format']
subprocess.run(['ffmpeg','-v','error','-threads','2','-i',str(video),'-f','null','-'],check=True)
for sec in range(math.ceil(float(probe['format']['duration']))):
    subprocess.run(['ffmpeg','-y','-v','error','-threads','2','-ss',str(sec),'-i',str(video),'-frames:v','1',str(OUT/('full-frame-%02d.jpg'%sec))],check=True)
report={'revision':qa['preflight']['revision'],'helperRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'hashes':qa['hashesAfter'],'calibratedGain':coefficient,'baseCamera':national,'stills':snapshots,'clips':clips,'probe':probe,'errors':b.failures,'qaReceipt':receipts[0].name,'segments':'five genuine native gesture clips with natural cuts between settled warmed scenes; source timestamps unchanged; no fake motion, added overlays or APP camera writes','physicalDevices':'not tested'}
(OUT/'media-report.json').write_text(json.dumps(report,indent=2))
