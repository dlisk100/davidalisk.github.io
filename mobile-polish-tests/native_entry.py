"""Bounded native opening-panel entry; DOM reads only, never application hooks."""
import time
MEASURE="""(()=>{const p=document.querySelector('#startup-loading'),e=p?.querySelector('[data-enter]');if(!e)throw Error('Missing opening CTA');const r=e.getBoundingClientRect(),q=p.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2),inside=x>0&&x<innerWidth&&y>0&&y<innerHeight,style=getComputedStyle(e),visible=r.width>0&&r.height>0&&!e.hidden&&style.visibility!=='hidden'&&style.display!=='none',px=Math.round((Math.max(0,q.left)+Math.min(innerWidth,q.right))/2),py=Math.round((Math.max(0,q.top)+Math.min(innerHeight,q.bottom))/2);return {x,y,inside,visible,clear:inside&&visible&&e.contains(document.elementFromPoint(x,y)),scrollable:/auto|scroll/.test(getComputedStyle(p).overflowY)&&p.scrollHeight>p.clientHeight,scrollTop:p.scrollTop,px,py,height:innerHeight}})()"""
def native_entry(browser,pause=time.sleep,before_click=None):
    history=[]
    for attempt in range(9):
        t=browser.ev(MEASURE);history.append(t)
        if t['inside'] and t['clear'] and t['visible']:
            if before_click:before_click()
            browser.click(t['x'],t['y']);pause(.15)
            return {'attempts':attempt,'measurements':history}
        if attempt==8 or not t['visible'] or not t['scrollable']:break
        dy=min(240,max(60,t['y']-t['height']*.55)) if t['y']>=t['height'] else -min(240,max(60,-t['y']+60)) if t['y']<=0 else 80
        browser.wheel(t['px'],t['py'],dy);pause(.2)
    raise RuntimeError('Opening CTA not reachable after bounded native panel scroll: '+str(history))
