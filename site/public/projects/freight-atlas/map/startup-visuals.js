/* Paper country motion. Engine owns all progress and entry readiness. */
'use strict';
window.StartupVisuals=(()=>{
 function completion(s,previous=0){
  if(s.phase==='Ready')return 1;
  if(!(Number.isFinite(s.total)&&s.total>0&&Number.isFinite(s.done)))return previous;
  return Math.min(1,Math.max(0,s.done/s.total));
 }
 function loadingCopy(s){
  if(s.error)return{heading:'Couldn’t load the atlas',body:'Try again, or open the map and load details as needed.'};
  if(s.phase==='Ready')return{heading:'Ready to explore',body:'Your map is ready.'};
  if(s.phase==='Cancelled')return{heading:'Loading stopped',body:'Reload to open the atlas.'};
  return s.phase==='Preparing roads'
   ?{heading:'Drawing freight connections',body:'Bringing roads and their connections into view.'}
   :{heading:'Gathering the map',body:'Loading the country, its places and freight routes.'};
 }
 // This output is outside the polite live region: frequent work updates stay quiet.
 function workDetail(s,ink){
  if(s.phase==='Downloading map data'){
   if(!s.bytes&&!s.resources)return 'Loading map data…';
   const bytes=Math.max(0,s.bytes||0),size=bytes>=1048576?`${(bytes/1048576).toFixed(1)} MiB`:`${Math.floor(bytes/1024)} KiB`;
   return `${size} received · ${s.resources||0} files loaded`;
  }
  const detail=s.detail||'',counts=detail.match(/^([\d,]+) \/ ([\d,]+) (admission jobs completed|viewport-index sources prepared)$/);
  if(counts&&Number.isFinite(s.total)&&s.total>0)return `Preparing connections · ${s.done.toLocaleString()} / ${s.total.toLocaleString()}`;
  if(counts)return `${counts[3]==='admission jobs completed'?'Connecting routes':'Locating freight routes'} · ${counts[1]} / ${counts[2]}`;
  if(detail)return detail;
  return Number.isFinite(s.total)&&s.total>0&&Number.isFinite(s.done)
   ?ink===1?'Connections prepared':`Freight connections · ${Math.floor(ink*100)}%`
   :'Preparing freight connections…';
 }
 function mount(panel){
  const stage=panel.querySelector('[data-startup-visual]'),counter=panel.querySelector('[data-work-count]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const travelers=[...stage.querySelectorAll('[data-route]')].map(el=>{const path=stage.querySelector('#'+el.dataset.route);return{el,path,length:path.getTotalLength(),duration:Number(el.dataset.duration)*1000,offset:Number(el.dataset.offset),reverse:el.dataset.direction==='reverse'};});
  let frame=null,elapsed=0,last=null,active=true,current={phase:'Downloading map data',total:null},ink=0;
  function paint(time){
   for(const t of travelers){
    const phase=(time/t.duration+t.offset)%1,distance=(t.reverse?1-phase:phase)*t.length;
    const p=t.path.getPointAtLength(distance),q=t.path.getPointAtLength(Math.max(0,Math.min(t.length,distance+(t.reverse?-.6:.6))));
    const angle=Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI;
    // Air follows the tangent; wheeled and waterborne silhouettes stay upright.
    const ground=t.el.dataset.vehicle==='ground';
    const tilt=ground?Math.max(-14,Math.min(14,angle>90?angle-180:angle< -90?angle+180:angle)):angle;
    const facing=ground&&(angle>90||angle< -90)?' scale(-1 1)':'';
    t.el.setAttribute('transform',`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${tilt.toFixed(2)})${facing}`);
    // Fade at route ends instead of snapping visibly back across the country.
    t.el.style.opacity=String(reduced.matches?1:Math.min(1,phase/.06,(1-phase)/.06));
   }
  }
  function shouldRun(){return active&&!panel.hidden&&!document.hidden&&!reduced.matches&&!current.error&&current.phase!=='Cancelled'&&current.phase!=='Ready';}
  function tick(now){frame=null;if(!shouldRun()){sync();return;}if(last!==null)elapsed+=Math.max(0,now-last);last=now;paint(elapsed);frame=window.requestAnimationFrame(tick);}
  function sync(){const run=shouldRun();panel.dataset.motion=run?'running':'still';panel.dataset.reducedMotion=reduced.matches?'true':'false';if(reduced.matches)paint(elapsed);if(!run){if(frame!==null)window.cancelAnimationFrame(frame);frame=null;last=null;}else if(frame===null)frame=window.requestAnimationFrame(tick);}
  function replay(){elapsed=0;last=null;paint(0);panel.classList.add('plate-replaying');sync();}
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  const observer=new MutationObserver(sync);observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
  panel.dataset.loadingStyle='country';replay();
  return{replay,pause(){active=false;sync();},status(s){
   const copy=loadingCopy(s),heading=panel.querySelector('h2'),body=panel.querySelector('p');
   if(heading.textContent!==copy.heading)heading.textContent=copy.heading;
   if(body.textContent!==copy.body)body.textContent=copy.body;
   current=s;ink=completion(s,ink);
   panel.style.setProperty('--work-reveal',String(ink));panel.style.setProperty('--work-unrevealed',`${(1-ink)*100}%`);
   panel.dataset.workPhase=s.phase==='Ready'?'ready':s.error?'error':s.phase==='Preparing roads'?'network':'gathering';
   if(counter){
    counter.hidden=!!s.error||s.phase==='Ready'||s.phase==='Cancelled';
    const detail=workDetail(s,ink);if(counter.textContent!==detail)counter.textContent=detail;
   }
   const step=s.phase==='Ready'?2:s.phase==='Preparing roads'?1:0;
   for(const [i,el] of [...(panel.querySelectorAll?.('[data-startup-stage]')||[])].entries()){
    el.dataset.state=s.error||s.phase==='Cancelled'?'waiting':i<step?'complete':i===step?'current':'waiting';
    if(i===step&&!s.error&&s.phase!=='Cancelled')el.setAttribute('aria-current','step');
    else el.removeAttribute('aria-current');
   }
   sync();
  }};
 }
 return{mount,completion,loadingCopy};
})();
