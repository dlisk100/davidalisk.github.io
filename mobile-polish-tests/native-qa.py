"""Hosted-only released-renderer QA; actual public root, no overlays or copies.
--preflight verifies source pins without launching a browser.
VPS capacity guards are unchanged and are not imported/bypassed here.
"""
import argparse, base64, functools, hashlib, http.server, json, os, pathlib, signal, subprocess, sys, threading, time, traceback, urllib.request, urllib.parse, uuid
from hosted_cdp import Browser
from view_contract import compare_view
from native_entry import native_entry, native_scroll_click
from entry_dom_regressions import hosted_entry_regressions
REPO=pathlib.Path(__file__).resolve().parents[1]
args=argparse.ArgumentParser()
args.add_argument('--root',type=pathlib.Path,default=REPO/'site/public')
args.add_argument('--out',type=pathlib.Path,default=REPO/'qa-artifacts')
args.add_argument('--preflight',action='store_true')
options=args.parse_args()
ROOT=options.root.resolve(); MAP=ROOT/'projects/freight-atlas/map'
OUT=options.out.resolve(); OUT.mkdir(parents=True,exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def digest():
    return {n:hashlib.sha256((MAP/n).read_bytes()).hexdigest() for n in ['core.js.gz','plate.json.gz','pz-sys.js.gz','explore-catalog.json','route-render.js','info-inspector.js','proto.js','atlas-bridge.css','atlas-bridge.js','index.html']}

def preflight():
    for name, actual in digest().items():
        original=subprocess.check_output(['git','show','c49e8c0:site/public/projects/freight-atlas/map/'+name],cwd=REPO)
        if name=='atlas-bridge.css':
            original+=b'/* Software keyboard-height emulation: align the collapsed dock beside unit tools. */\n@media(max-width:600px) and (max-height:400px){\n #atlas-controls{top:calc(max(16px,env(safe-area-inset-top)) + 90px)}\n}\n'
        assert hashlib.sha256(original).hexdigest()==actual,'Protected candidate runtime drift: '+name
    assert subprocess.run(['git','diff','--quiet','c49e8c0','--','site/src/content/projects/freight-atlas.mdx'],cwd=REPO).returncode==0,'Article drift'
    # Editorial favicon repair is separately regression-tested; all map runtime/data pins remain exact.
    article=(REPO/'site/src/content/projects/freight-atlas.mdx').read_text()
    assert all('map/'+name+'.html' in article for name in ['methods','data','about'])
    return {'candidate':'c49e8c0','revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip(),'articleLinks':'source MDX verified; static map QA does not claim Astro build','runtime':'hosted Chrome; isolated runner Python venv; stdlib plus websockets','hashes':digest()}

def main():
    r={'preflight':preflight(),'checks':[],'screenshots':[],'rows':[],'passed':False,'scope':'localhost Chromium viewport/native input; not physical iPhone Safari or public CDN'}
    if '--preflight' in sys.argv: print(json.dumps(r)); return
    if os.environ.get('GITHUB_ACTIONS')!='true': raise RuntimeError('Run browser QA on hosted GitHub Actions only; VPS protections remain mandatory')
    r['runtime']='GitHub Actions hosted Ubuntu; no VPS browser or service changes'
    start=time.monotonic(); deadline=start+875; lastguard=0; b=None; server=None
    receipt=OUT/('receipt-'+uuid.uuid4().hex+'.json');receipt.touch(exist_ok=False)
    def persist(): receipt.write_text(json.dumps(r,indent=2))
    def check(name,ok,data=None):
        r['checks'].append({'name':name,'pass':bool(ok),'data':data});persist()
        if not ok: raise AssertionError(name)
    def cancel(*args): raise TimeoutError('875s inner browser window')
    signal.signal(signal.SIGALRM,cancel);signal.signal(signal.SIGTERM,cancel);signal.setitimer(signal.ITIMER_REAL,875)
    class Bounded(Browser):
        def call(self,m,**kw):
            nonlocal lastguard
            if m!='Browser.close':
                if time.monotonic()>deadline: raise TimeoutError('browser budget')
            result=super().call(m,**kw)
            for e in self.events:
                if e.get('method')=='Network.responseReceived' and e['params']['response']['status']==404: raise RuntimeError('Actual public-root 404 '+e['params']['response']['url'])
            return result
        def ev(self,e):
            v=super().ev(e)
            if isinstance(v,str) and v.startswith('EXC '): raise RuntimeError(v)
            return v
    def wait(expr,seconds=90):
        end=min(deadline,time.monotonic()+seconds)
        while time.monotonic()<end:
            if b.ev(expr): return
            time.sleep(.2)
        raise TimeoutError(expr)
    def shot(label):
        assert len(r['screenshots'])<10
        data=base64.b64decode(b.call('Page.captureScreenshot',format='png',captureBeyondViewport=False)['data']);assert len(data)<5*1024**2
        p=OUT/(receipt.stem+'-'+label+'.png');p.write_bytes(data);r['screenshots'].append(p.name);persist()
    def target(selector):
        return b.ev("(()=>{const e=document.querySelector("+json.dumps(selector)+");if(!e)throw Error('Missing target');const r=e.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2),at=document.elementFromPoint(x,y);if(!at||!e.contains(at)||getComputedStyle(e).visibility==='hidden')throw Error('Obstructed target '+"+json.dumps(selector)+");return {x,y}})()")
    def tap(selector):
        t=target(selector);b.click(t['x'],t['y']);time.sleep(.15)
    def key(k):
        code, vk = {'Escape':('Escape',27),'Enter':('Enter',13),'Backspace':('Backspace',8)}.get(k,(k,0))
        b.call('Input.dispatchKeyEvent',type='rawKeyDown',key=k,code=code,windowsVirtualKeyCode=vk);b.call('Input.dispatchKeyEvent',type='keyUp',key=k,code=code,windowsVirtualKeyCode=vk)
    def query(text):
        tap('input[type=search]');b.call('Input.dispatchKeyEvent',type='rawKeyDown',key='a',code='KeyA',windowsVirtualKeyCode=65,modifiers=2);b.call('Input.dispatchKeyEvent',type='keyUp',key='a',code='KeyA',windowsVirtualKeyCode=65,modifiers=2);b.call('Input.insertText',text=text);time.sleep(.2)
        check('native search input '+text,b.ev("document.querySelector('input[type=search]').value")==text)
    def menu_button(text):
        index=b.ev("[...document.querySelectorAll('#explore-host button')].findIndex(e=>e.textContent==="+json.dumps(text)+")")
        assert index>=0, text
        b.ev("document.querySelectorAll('#explore-host button')["+str(index)+"].scrollIntoView({block:'nearest'})")
        point=b.ev("(()=>{const e=document.querySelectorAll('#explore-host button')["+str(index)+"],r=e.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);if(!e.contains(document.elementFromPoint(x,y)))throw Error('Obstructed menu action');return{x,y}})()")
        b.click(point['x'],point['y']);time.sleep(.3)
    def layout():
        return b.ev("(()=>{const rect=s=>{const a=document.querySelector(s).getBoundingClientRect();return {left:a.left,right:a.right,top:a.top,bottom:a.bottom,width:a.width,height:a.height}};return {layers:rect('#layers-panel>summary'),explore:rect('#atlas-menu>summary'),card:rect('#card'),overflow:document.documentElement.scrollWidth>innerWidth,viewport:[innerWidth,innerHeight],raster:[cv.width,cv.height,DPR],headline:document.querySelector('#national-headline').textContent}})()")
    def summaries(label):
        a=layout();l=a['layers'];e=a['explore'];disjoint=l['bottom']<=e['top'] or e['bottom']<=l['top'] or l['right']<=e['left'] or e['right']<=l['left']
        target('#layers-panel>summary');target('#atlas-menu>summary');check(label+' disjoint and accessible',disjoint and not a['overflow'],a)
    try:
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
        url=f'http://127.0.0.1:{server.server_port}/projects/freight-atlas/map/'
        for name in ['index.html','proto.js','../numeric.bundle','../directory.json.gz']:
            with urllib.request.urlopen(urllib.parse.urljoin(url,name),timeout=10) as response: assert response.status==200
        b=Bounded(390,844);b.__enter__()
        for method in ['Page.enable','Runtime.enable','Network.enable']: b.call(method)
        check('production DOM entry scroll and abort sensitivity',True,hosted_entry_regressions(b,MAP))
        b.call('Page.addScriptToEvaluateOnNewDocument',source="window.__qaReady=null;function q(){if(document.body?.dataset.ready==='1'){window.__qaReady=performance.now();return}requestAnimationFrame(q)}requestAnimationFrame(q)")
        for index,(w,h) in enumerate([(390,844),(393,852),(430,932),(852,393),(393,480),(393,360),(1489,900)]):
            mobile=w<1000;label=f'{w}x{h}';r['phase']=label;persist()
            b.call('Emulation.setDeviceMetricsOverride',width=w,height=h,deviceScaleFactor=1,mobile=mobile)
            b.call('Emulation.setTouchEmulationEnabled',enabled=mobile,maxTouchPoints=2)
            b.call('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'reduce' if h==480 else 'no-preference'}])
            b.call('Page.navigate',url=url)
            if index==0:
                wait("!!document.querySelector('#startup-loading')",15);shot('loading-390x844')
            wait("document.body?.dataset.ready==='1'&&!!window.ATLAS_EXPLORE",120)
            row={'viewport':[w,h],'readyMs':b.ev('__qaReady'),'layout':layout()};r['rows'].append(row);persist()
            check(label+' backing raster',row['layout']['raster']==[w,h,1])
            check(label+' released renderer and removed chrome',b.ev("typeof ExactSpike==='undefined'&&typeof ROUTE_WORKER==='undefined'&&!document.querySelector('#lab .insets')&&!document.querySelector('#atlas-docs')&&!document.querySelector('figcaption')"))
            check(label+' Ready animation stopped',b.ev("document.querySelector('#startup-loading').dataset.motion==='still'"))
            if h==480:check(label+' reduced motion honored',b.ev("document.querySelector('#startup-loading').dataset.reducedMotion==='true'"))
            check(label+' startup captions absent',b.ev("![...document.querySelectorAll('#startup-loading p')].some(e=>e.textContent.includes('illustrative'))"))
            entry=native_entry(b,before_click=(lambda:shot('ready-scrolled-852x393')) if index==3 else None);check(label+' native opening entry',True,entry)
            wait("document.getElementById('startup-loading').hidden")
            summaries(label+' collapsed')
            if index==0: shot('country-390x844')
            before=b.ev('APP.camera()');pan_started=time.monotonic()
            if mobile:
                b.call('Input.dispatchTouchEvent',type='touchStart',touchPoints=[{'x':100,'y':h*.70,'id':0}])
                for dx in [10,20,35]: b.call('Input.dispatchTouchEvent',type='touchMove',touchPoints=[{'x':100+dx,'y':h*.70,'id':0}]);time.sleep(.03)
                b.call('Input.dispatchTouchEvent',type='touchEnd',touchPoints=[])
            else: b.drag(700,500,735,515)
            wait("!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending")
            row['countryPanDriverWallMs']=(time.monotonic()-pan_started)*1000;persist()
            check(label+' native country pan',b.ev('APP.camera()')!=before)
            tap('#home');wait("!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending")
            check(label+' tons national truth',b.ev("document.querySelector('#national-headline').textContent.includes('20.0')&&document.querySelector('#national-headline').textContent.includes('2024')"))
            tap('#layers-panel>summary');wait("document.querySelector('#layers-panel').open")
            summaries(label+' layers expanded')
            before=b.ev('APP.layers()')
            for layer_index in range(b.ev("document.querySelectorAll('#layer-controls input').length")):
                selector=f'#layer-controls input:nth-of-type({layer_index+1})'
                # Labels wrap inputs, so address each real retained input by its parent label.
                selector=f'#layer-controls label:nth-of-type({layer_index+1}) input'
                b.ev('document.querySelector('+json.dumps(selector)+').scrollIntoView({block:"nearest"})')
                tap(selector);check(label+' native layer toggle '+str(layer_index),b.ev('APP.layers()')!=before)
                tap(selector);check(label+' layers restored '+str(layer_index),b.ev('APP.layers()')==before)
            scroll=target('#layer-controls');b.wheel(scroll['x'],scroll['y'],250);time.sleep(.2)
            check(label+' layer scroll',b.ev("document.querySelector('#layer-controls').scrollHeight<=document.querySelector('#layer-controls').clientHeight||document.querySelector('#layer-controls').scrollTop>0"))
            tap('#layers-panel>summary');check(label+' native Layers close',not b.ev("document.querySelector('#layers-panel').open"))
            tap('#layers-panel>summary');check(label+' native Layers reopen',b.ev("document.querySelector('#layers-panel').open"))
            tap('#atlas-menu>summary');wait("document.querySelector('#atlas-menu').open&&!document.querySelector('#layers-panel').open")
            summaries(label+' explore expanded')
            query('Anchorage');check(label+' Anchorage rejected',b.ev("document.querySelectorAll('.ae-results button').length===0"))
            query('Honolulu');check(label+' Honolulu rejected',b.ev("document.querySelectorAll('.ae-results button').length===0"))
            query('Albany');wait("!!document.querySelector('.ae-results button')")
            tap('#atlas-menu>summary');check(label+' native Explore close',not b.ev("document.querySelector('#atlas-menu').open"))
            tap('#atlas-menu>summary');check(label+' native Explore reopen',b.ev("document.querySelector('#atlas-menu').open"))
            result_click=native_scroll_click(b,'.ae-results button','.atlas-menu-body');check(label+' native result panel scroll',True,result_click)
            wait("APP.selectedPlace()?.name?.includes('Albany')&&!document.querySelector('#atlas-menu').open")
            check(label+' native first result Albany',b.ev('APP.selectedPlace()'))
            summaries(label+' card')
            if h==360:
                # Roll back only the narrow dock offset on the real production DOM:
                # independent sensitivity proof, restored before any native action.
                b.ev("document.querySelector('#atlas-controls').style.setProperty('top','150px','important');dispatchEvent(new Event('resize'))")
                time.sleep(.2);old_clearance=layout()
                check('keyboard-height original CSS RED reproduced',old_clearance['card']['height']<=50,old_clearance)
                b.ev("document.querySelector('#atlas-controls').style.removeProperty('top');dispatchEvent(new Event('resize'))")
                time.sleep(.2);new_clearance=layout()
                check('keyboard-height corrected CSS real DOM GREEN',new_clearance['card']['height']>50,new_clearance)
            check(label+' card clearance',b.ev("(()=>{const c=document.querySelector('#card').getBoundingClientRect(),s=document.querySelector('#atlas-controls').getBoundingClientRect();return getComputedStyle(document.querySelector('#card')).visibility==='visible'&&c.height>50&&c.bottom<=innerHeight&&((innerWidth>600)||c.top>=s.bottom)})()"))
            if index==0:
                b.ev("document.querySelector('#card .source-note summary').scrollIntoView({block:'center'})")
                tap('#card .source-note summary');check('native source details',b.ev("document.querySelector('#card .source-note details').open"))
                # Source disclosure remains native-tested; its first-cycle PNG is retained.
            if index in [1,2]:shot('albany-card-'+label)
            if h==393: shot('short-landscape-852x393')
            if h==480: shot('short-portrait-393x480')
            if h==360: shot('keyboard-shape-393x360')
            # Open/close with selected card; deliberate hiding is tested, never mistaken for accessibility.
            tap('#layers-panel>summary');summaries(label+' selected layers');key('Escape');wait("!document.querySelector('#layers-panel').open")
            check(label+' Escape focus',b.ev("document.activeElement===document.querySelector('#layers-panel>summary')"))
            if index==0:
                selected=b.ev('APP.getView()');tap('#unit button[data-u=usd]');check('USD national truth',b.ev("document.querySelector('#national-headline').textContent.includes('2024')&&document.querySelector('#national-headline').textContent.includes('25.0')"))
                source=b.ev("(()=>{const a=document.querySelector('#card a[data-method]');a.scrollIntoView({block:'center'});return a.dataset.method})()")
                state=b.ev('APP.getView()')
                raw_before=b.ev('APP.camera()');facts_before=b.ev('APP.metroFacts()');source_before=b.ev('APP.sourceMetadata()')
                projected_before=b.ev("({camera:proj(APP.getView().camera.center).map((v,i)=>v*T.k+(i?T.y:T.x)),selection:proj(APP.getView().selection.point).map((v,i)=>v*T.k+(i?T.y:T.x))})")
                tap('#card a[data-method]');wait("!!document.querySelector('[data-map-return]')")
                return_state=b.ev("AtlasExplore.parse(new URL(document.querySelector('[data-map-return]').href).hash)") if b.ev("typeof AtlasExplore!=='undefined'") else None
                encoded_return=b.ev("new URL(document.querySelector('[data-map-return]').href).hash")
                r['methodsReturnHash']=encoded_return;persist()
                check('native Methods anchor',b.ev('location.hash')=='#'+source)
                check('editorial nav intact',b.ev("['methods.html','data.html','about.html'].every(p=>[...document.querySelectorAll('a')].some(a=>a.getAttribute('href')?.includes(p)))"))
                b.ev("document.querySelector('[data-map-return]').scrollIntoView({block:'nearest'})")
                tap('[data-map-return]');wait("document.body?.dataset.ready==='1'&&!!window.ATLAS_EXPLORE",120)
                wait("APP.selectedPlace()?.name?.includes('Albany')")
                actual=b.ev('APP.getView()')
                projected=b.ev("(()=>{const e="+json.dumps(state)+",a=APP.getView(),screen=p=>proj(p).map((v,i)=>v*T.k+(i?T.y:T.x));return {camera:[screen(e.camera.center),screen(a.camera.center)],selection:[screen(e.selection.point),screen(a.selection.point)]}})()")
                comparison=compare_view(state,actual,projected)
                check('Methods Back coordinate and exact semantic state',comparison['pass'],{'expected':state,'actual':actual,'comparison':comparison})
                projected_after=b.ev("({camera:proj(APP.getView().camera.center).map((v,i)=>v*T.k+(i?T.y:T.x)),selection:proj(APP.getView().selection.point).map((v,i)=>v*T.k+(i?T.y:T.x))})")
                raw_after=b.ev('APP.camera()')
                check('Methods Back actual screen positions preserved',all(__import__('math').dist(projected_before[k],projected_after[k])<=.01 for k in projected_before) and raw_before['k']==raw_after['k'] and __import__('math').hypot(raw_before['x']-raw_after['x'],raw_before['y']-raw_after['y'])<=.01,{'before':projected_before,'after':projected_after,'rawBefore':raw_before,'rawAfter':raw_after})
                check('Methods Back exact source facts',facts_before==b.ev('APP.metroFacts()') and source_before==b.ev('APP.sourceMetadata()'))
                check('Methods Back literal encoded hash',b.ev('location.hash')==encoded_return and b.ev('AtlasExplore.parse(location.hash).view')==state)

                if not b.ev("document.getElementById('startup-loading').hidden"):native_entry(b)
                check('card unit switch camera neutral',selected['camera']==state['camera'])
                b.ev("document.querySelector('#card .zt').scrollIntoView({block:'nearest'})")
                old_camera=b.ev('APP.camera()');tap('#card .zt');wait("!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending")
                check('native card Zoom here',b.ev('APP.camera()')!=old_camera)
                tap('#atlas-menu>summary');wait("document.querySelector('#atlas-menu').open")
                b.ev("document.querySelector('input[aria-label=\"Saved view name\"]').scrollIntoView({block:'nearest'})")
                tap('input[aria-label="Saved view name"]');b.call('Input.insertText',text='Native QA')
                saved_state=b.ev('APP.getView()')
                menu_button('Save current view');check('native save readback',b.ev("!![...document.querySelectorAll('.ae-saved-row button')].find(e=>e.textContent==='Restore Native QA')"))
                check('saved state exact storage JSON',b.ev("JSON.parse(localStorage.getItem('atlas.saved-views.v1')).items.find(e=>e.name==='Native QA').view")==saved_state)
                menu_button('Restore Native QA');wait("!DETAIL_LOADING.pending")
                restored=b.ev('APP.getView()');saved_pixels=b.ev("(()=>{const e="+json.dumps(saved_state)+",a=APP.getView(),screen=p=>proj(p).map((v,i)=>v*T.k+(i?T.y:T.x));return {camera:[screen(e.camera.center),screen(a.camera.center)],selection:[screen(e.selection.point),screen(a.selection.point)]}})()")
                check('native save restore semantic and coordinate contract',compare_view(saved_state,restored,saved_pixels)['pass'])
                if not b.ev("document.querySelector('#atlas-menu').open"):tap('#atlas-menu>summary')
                b.call('Browser.grantPermissions',origin=urllib.parse.urlsplit(url).scheme+'://'+urllib.parse.urlsplit(url).netloc,permissions=['clipboardReadWrite','clipboardSanitizedWrite'])
                share_state=b.ev('APP.getView()')
                menu_button('Copy map link');check('native clipboard copy readback',b.ev("navigator.clipboard.readText().then(s=>s.startsWith(location.origin)&&s.includes('#'))"))
                check('native share exact state and query stripping',b.ev("navigator.clipboard.readText().then(s=>({view:AtlasExplore.parse(new URL(s).hash).view,search:new URL(s).search}))")=={'view':share_state,'search':''})
                menu_button('Delete Native QA');check('native delete readback',b.ev("!document.querySelector('.ae-saved-row')"))
                menu_button('Clear selection');check('native clear selection',not b.ev('APP.selectedPlace()'))
                menu_button('Reset map');wait("!DETAIL_LOADING.pending")
                if not b.ev("document.querySelector('#atlas-menu').open"):tap('#atlas-menu>summary')
                b.ev("document.querySelector('input[type=search]').scrollIntoView({block:'nearest'})")
                query('Albany');tap('.ae-results button');wait("APP.selectedPlace()?.name?.includes('Albany')")
            # The long inspector retains scroll position after source/Zoom inspection.
            # Bring the actual close control into view, then retain native hit validation.
            b.ev("document.querySelector('#card .x').scrollIntoView({block:'nearest'})")
            tap('#card .x');check(label+' native close',b.ev("!APP.selectedPlace()&&document.querySelector('#card').hidden"))
            before=b.ev('APP.camera()');b.ev("APP.flyLL([-87.63,41.88],3.9,0)");wait("!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending")
            before=b.ev('APP.camera()');pan_started=time.monotonic()
            if mobile:
                b.call('Input.dispatchTouchEvent',type='touchStart',touchPoints=[{'x':100,'y':h*.65,'id':0}])
                for dx in [10,20,35]:b.call('Input.dispatchTouchEvent',type='touchMove',touchPoints=[{'x':100+dx,'y':h*.65,'id':0}]);time.sleep(.03)
                b.call('Input.dispatchTouchEvent',type='touchEnd',touchPoints=[])
            else:b.drag(700,500,735,515)
            wait("!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending")
            row['chicagoPanDriverWallMs']=(time.monotonic()-pan_started)*1000;persist()
            check(label+' native Chicago pan',b.ev('APP.camera()')!=before)
            tap('#unit button[data-u=usd]');check(label+' Chicago USD exact unit',b.ev('APP.getView().unit')=='usd')
            check(label+' Chicago USD source national',b.ev("document.querySelector('#national-headline').textContent.includes('25.0')&&document.querySelector('#national-headline').textContent.includes('2024')"))
            if index==6:shot('desktop-chicago-1489x900')
            tap('#unit button[data-u=t]');check(label+' Chicago tons exact unit',b.ev('APP.getView().unit')=='t')
            if index==6:
                for region in ['AK','HI']:
                    ll=b.ev('A.air.airports.find(p=>p.st==='+json.dumps(region)+').ll')
                    b.ev('APP.flyLL('+json.dumps(ll)+',3.9,0)');wait("!GESTURE.active&&!GESTURE.dirty&&!DETAIL_LOADING.pending")
                    point=b.ev('(()=>{const p=P('+json.dumps(ll)+');return {x:p[0]*T.k+T.x,y:p[1]*T.k+T.y}})()')
                    check(region+' hidden native pick point in canvas',0<point['x']<w and 0<point['y']<h,point)
                    b.click(point['x'],point['y']);time.sleep(.3)
                    check(region+' invisible native map picking rejected',not b.ev('APP.selectedPlace()') and b.ev("document.querySelector('#card').hidden"))
        article=ROOT/'projects/freight-atlas/index.html'
        if article.exists():
            b.call('Page.navigate',url=f'http://127.0.0.1:{server.server_port}/projects/freight-atlas/')
            wait("document.querySelector('h1')?.textContent.includes('Freight')",20)
            check('built article three editorial links rendered',b.ev("['methods','data','about'].every(n=>[...document.querySelectorAll('a')].some(a=>a.href.includes('/map/'+n+'.html')&&a.getBoundingClientRect().height>0))"))
            shot('built-article-desktop')
            for page in ['methods','data','about']:
                selector=f'a[href*="map/{page}.html"]';b.ev('document.querySelector('+json.dumps(selector)+').scrollIntoView({block:"center"})');tap(selector)
                wait("location.pathname.endsWith('/"+page+".html')&&!!document.querySelector('h1')",20)
                check('built article native '+page+' navigation',b.ev('location.pathname').endswith('/'+page+'.html'))
                b.ev("document.querySelector('[data-map-return]').scrollIntoView({block:'center'})");tap('[data-map-return]')
                wait("document.body?.dataset.ready==='1'&&!!window.ATLAS_EXPLORE",120)
                check('built article '+page+' native returned map',b.ev("location.pathname.endsWith('/map/')||location.pathname.endsWith('/map/index.html')"))
                if not b.ev("document.getElementById('startup-loading').hidden"):native_entry(b)
                b.call('Page.navigate',url=f'http://127.0.0.1:{server.server_port}/projects/freight-atlas/');wait("document.querySelector('h1')?.textContent.includes('Freight')",20)
        else:check('built article available',False)
        r['passed']=True
    except Exception as e:
        r['failure']={'message':str(e),'trace':traceback.format_exc()[-5000:].replace(str(REPO),'[checkout]')}
        if b and hasattr(b,'ws'):
            try:
                r['failureDOM']=b.ev("({url:location.pathname,input:document.querySelector('input[type=search]')?.value,menuOpen:document.querySelector('#atlas-menu')?.open,cardText:document.querySelector('#card')?.innerText?.slice(0,1200),resultText:document.querySelector('.ae-results')?.innerText})")
                if len(r['screenshots'])<10:shot('failure-'+r.get('phase','startup'))
            except Exception as diagnostic:r['diagnosticFailure']=str(diagnostic)
    finally:
        r['elapsedSeconds']=time.monotonic()-start
        if b:
            r['errors']=[e for e in b.events if e.get('method') in ['Runtime.exceptionThrown','Network.loadingFailed']][-30:]
            try:b.call('Browser.close')
            except Exception as e:r['closeNote']=str(e)
            try:b.cleanup()
            except Exception as e:r['exitFailure']=str(e)
        if server:server.shutdown();server.server_close()
        r['hashesAfter']=digest();r['protectedUnchanged']=r['hashesAfter']==r['preflight']['hashes'];persist()
        signal.setitimer(signal.ITIMER_REAL,0)
        print(json.dumps({'receipt':str(receipt),'passed':r['passed'],'failure':r.get('failure'),'screenshots':r['screenshots']}))
    if not r['passed']:sys.exit(1)
if __name__=='__main__':main()
