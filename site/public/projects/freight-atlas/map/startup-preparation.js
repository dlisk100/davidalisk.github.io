/* Real completed work counts. No timer-driven percentage or new cache layer. */
'use strict';
window.StartupPreparation=(()=>{
 const yieldTask=()=>window.scheduler?.yield?window.scheduler.yield():new Promise(resolve=>setTimeout(resolve,0));
 async function decisions(recipe,proj,{batch=128,yield:pause=yieldTask,signal=null,progress=()=>{}}={}){
  const vectors=[],pairs=[],total=recipe.operands.length+recipe.program.length;let done=0;
  const checkpoint=async()=>{if(signal?.aborted)throw Error('Preparation cancelled');progress(done,total);await pause();if(signal?.aborted)throw Error('Preparation cancelled');};
  for(let i=0;i<recipe.operands.length;){const start=i,t=performance.now();do{const ll=recipe.operands[i++],p=ll.map(proj),a=p[0],b=p.find(q=>Math.hypot(q[0]-a[0],q[1]-a[1])>1e-7)||a,d=Math.hypot(b[0]-a[0],b[1]-a[1])||1;vectors.push([(b[0]-a[0])/d,(b[1]-a[1])/d]);done++;}while(i<recipe.operands.length&&i-start<batch&&performance.now()-t<4);await checkpoint();}
  for(let n=0;n<recipe.program.length;){const start=n,t=performance.now();do{const [,ls]=recipe.program[n++],options=[];for(let i=0;i<ls.length;i++)for(let j=i+1;j<ls.length;j++){const a=vectors[ls[i][1]],b=vectors[ls[j][1]],dot=a[0]*b[0]+a[1]*b[1];if(dot<=-.5)options.push({a:ls[i][0],b:ls[j][0],dot});}const used=new Set(),chosen=[];for(const p of options.sort((a,b)=>a.dot-b.dot)){if(used.has(p.a)||used.has(p.b))continue;used.add(p.a);used.add(p.b);chosen.push([p.a,p.b]);}pairs.push(chosen);done++;}while(n<recipe.program.length&&n-start<batch&&performance.now()-t<4);await checkpoint();}
  return{pairs,vectors,signature:JSON.stringify(pairs)};
 }
 async function index(owner,{batch=128,yield:pause=yieldTask,signal=null,progress=()=>{}}={}){
  const cells=new Map(),wide=[],step=.02,a=owner.facts,stride=owner.meta.stride;let entries=0;
  for(let i=0;i<owner.meta.sources;){const end=Math.min(i+batch,owner.meta.sources);for(;i<end;i++){const o=i*stride,bb=[a[o+11],a[o+12],a[o+13],a[o+14]],x0=Math.floor(bb[0]/step),y0=Math.floor(bb[1]/step),x1=Math.floor(bb[2]/step),y1=Math.floor(bb[3]/step);if(!bb.every(Number.isFinite)||(x1-x0+1)*(y1-y0+1)>64){wide.push(i);continue;}for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const key=x+','+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);entries++;}}if(signal?.aborted)throw Error('Preparation cancelled');progress(i,owner.meta.sources);await pause();}
  let converted=0;for(const [key,ids]of cells){cells.set(key,new Uint32Array(ids));if(++converted%128===0){if(signal?.aborted)throw Error('Preparation cancelled');await pause();}}
  const estimatedBytes=(entries+wide.length)*4+cells.size*96;
  if(estimatedBytes>16*1024*1024)throw Error('Viewport index exceeds declared 16 MiB numeric budget');
  function needed(view,cut,proj,selected=null){const S=proj.scale(),T=proj.translate(),bb=[(view[0]-T[0])/S,(view[1]-T[1])/S,(view[2]-T[0])/S,(view[3]-T[1])/S],x0=Math.floor(bb[0]/step)-1,y0=Math.floor(bb[1]/step)-1,x1=Math.floor(bb[2]/step)+1,y1=Math.floor(bb[3]/step)+1,candidates=new Set(wide),ids=new Set(owner.pinned?.ids),groups=new Set(owner.pinned?.groups);
   if((x1-x0+1)*(y1-y0+1)>cells.size*4){for(let i=0;i<owner.meta.sources;i++)candidates.add(i);}else for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(const i of cells.get(x+','+y)||[])candidates.add(i);
   // Preserve original source iteration and exact final floating-point bbox/admission operations.
   for(const i of [...candidates].sort((a,b)=>a-b)){const o=i*stride,g=owner.sourceGroup[i];if(g<0)continue;const overlay=selected===owner.identity(i);if(!overlay&&owner.rr.detailAlpha({appear:owner.appear[g]},cut)<=.02)continue;const b=[a[o+11]*S+T[0],a[o+12]*S+T[1],a[o+13]*S+T[0],a[o+14]*S+T[1]],eps=1e-7;if(!(b[2]+eps<view[0]||b[0]-eps>view[2]||b[3]+eps<view[1]||b[1]-eps>view[3]))groups.add(g);}
   for(const g of groups)for(let j=owner.memberOffsets[g];j<owner.memberOffsets[g+1];j++)ids.add(owner.members[j]);return{ids,groups};
  }
  return{needed,dispose(){cells.clear();wide.length=0;},status:()=>({cells:cells.size,entries,wide:wide.length,estimatedBytes,maxEstimatedBytes:16*1024*1024})};
 }
 class State{
  constructor(emit=()=>{}){this.emit=emit;this.generation=0;this.value={phase:'Downloading map data',done:0,total:null,bytes:0,resources:0,error:null};this.prepared=false;this.controller=new AbortController();this.publish();}
  publish(){this.emit(this.status());}
  status(){return {...this.value};}
  download(bytes){if(this.value.phase!=='Downloading map data')return;this.value.bytes+=bytes;this.publish();}
  resource(){if(this.value.phase!=='Downloading map data')return;this.value.resources++;this.publish();}
  fail(e){this.generation++;this.prepared=false;this.value.phase='Preparation unavailable';this.value.error=String(e);this.publish();}
  cancel(){this.generation++;this.prepared=false;this.controller.abort();this.value.phase='Cancelled';this.publish();}
  async prepare(owner,asset,proj,groups,{batch=128,yield:pause=yieldTask,completed=0,extraJobs=0}={}){
   const gen=++this.generation,rows=asset.rows,prepared=new Map();this.value={...this.value,phase:'Preparing roads',done:completed,total:completed+rows.length+groups.length+extraJobs};this.publish();
   const check=()=>{if(gen!==this.generation||this.controller.signal.aborted)throw Error('Preparation cancelled');};
   for(let i=0;i<rows.length;){check();const t=performance.now(),start=i;do{owner.install([rows[i]],proj,prepared);rows[i]=null;i++;}while(i<rows.length&&i-start<batch&&performance.now()-t<4);this.value.done=completed+i;this.publish();await pause();}
   // Complete render/pick dependencies are validated before entry. Only the initial view is materialized;
   // national native meshes and per-group object graphs would defeat bounded residency.
   for(const g of groups){check();for(let j=owner.memberOffsets[g];j<owner.memberOffsets[g+1];j++)if(!prepared.has(owner.members[j])&&!owner.segs.has(owner.members[j]))throw Error('Missing coarse dependency '+owner.members[j]);owner.materialize(g);this.value.done++;this.publish();await pause();}
   check();this.prepared=this.value.done===this.value.total;return prepared;
  }
  async validate(owner,groups,prepared,{batch=128,yield:pause=yieldTask,reserved=false}={}){const gen=this.generation;if(!reserved)this.value.total+=groups.length;this.prepared=false;this.publish();for(let i=0;i<groups.length;){if(gen!==this.generation||this.controller.signal.aborted)throw Error('Preparation cancelled');const end=Math.min(i+batch,groups.length);for(;i<end;i++){const g=groups[i];for(let j=owner.memberOffsets[g];j<owner.memberOffsets[g+1];j++)if(!prepared.has(owner.members[j]))throw Error('Missing coarse dependency '+owner.members[j]);this.value.done++;}this.publish();await pause();}if(gen!==this.generation)throw Error('Preparation cancelled');this.prepared=true;}
  ready(){if(!this.prepared||this.value.error||this.controller.signal.aborted)throw Error('Ready requires completed preparation');this.value.phase='Ready';this.publish();}
 }
 let state;
 function mount(){
  const panel=document.getElementById('startup-loading');if(!panel)return;
  const preview=document.getElementById('startup-preview');
  const blocked=[...document.body.children].filter(e=>e!==panel&&!['SCRIPT','STYLE'].includes(e.tagName));
  let reviewing=false,exitTimer=null;
  const visuals=window.StartupVisuals?.mount(panel);
  const lock=()=>blocked.forEach(e=>e.inert=true);
  const finishEntry=()=>{clearTimeout(exitTimer);exitTimer=null;panel.hidden=true;panel.classList.remove('is-entering');};
  const enter=()=>{
   // Unlock the genuinely prepared map immediately; this is only an outgoing paper fade.
   blocked.forEach(e=>e.inert=false);visuals?.pause();panel.setAttribute('aria-modal','false');
   if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)finishEntry();
   else{panel.classList.add('is-entering');exitTimer=setTimeout(finishEntry,300);}
   if(preview){preview.hidden=false;preview.focus();}
  };
  panel.addEventListener('transitionend',e=>{if(e.target===panel&&e.propertyName==='opacity'&&panel.classList.contains('is-entering'))finishEntry();});
  const render=s=>{
   const ready=s.phase==='Ready';
   panel.querySelector('h2').textContent=s.error?'Preparation unavailable':({'Downloading map data':'Gathering the map','Preparing roads':'Preparing the flow network','Ready':'Ready to explore','Cancelled':'Preparation cancelled'}[s.phase]||s.phase);
   panel.querySelector('p').textContent=s.error?'The map preparation did not complete. Retry, or use the explicitly limited streamed fallback when available.':ready?'The map is prepared. Explore whenever you’re ready.':s.phase==='Preparing roads'?'Bringing the roads and their connections into view.':'Assembling the country, its places and connections.';
   const bar=panel.querySelector('progress');bar.hidden=ready||!!s.error||s.phase==='Cancelled';
   if(s.total!==null){bar.max=s.total;bar.value=s.done;}else bar.removeAttribute('value');
   panel.querySelector('[data-retry]').hidden=!s.error;
   panel.querySelector('[data-enter]').hidden=!ready||reviewing;
   panel.querySelector('[data-return]').hidden=!reviewing;
   panel.querySelector('[data-preview-label]').hidden=!reviewing;
   window.STARTUP_STATUS=s;visuals?.status(s,reviewing);
  };
  lock();state.emit=render;state.publish();
  panel.querySelector('[data-retry]').onclick=()=>location.reload();
  panel.querySelector('[data-enter]').onclick=()=>{if(state.status().phase==='Ready')enter();};
  panel.querySelector('[data-limited]').onclick=()=>{enter();document.body.dataset.preparation='limited-streamed';};
  panel.querySelector('[data-return]').onclick=enter;
  panel.querySelector('[data-replay]').onclick=()=>visuals?.replay();
  if(preview)preview.onclick=()=>{clearTimeout(exitTimer);exitTimer=null;panel.classList.remove('is-entering');reviewing=true;panel.hidden=false;panel.setAttribute('aria-modal','true');lock();render(state.status());visuals?.replay();panel.querySelector('[data-return]').focus();};
  panel.onkeydown=e=>{if(e.key==='Escape'&&reviewing){e.preventDefault();enter();}};
  panel.querySelector('[data-replay]').focus();
 }
 state=new State();document.addEventListener('DOMContentLoaded',mount);window.addEventListener('pagehide',e=>{if(!e.persisted)state.cancel();});
 return{State,state,decisions,index,yieldTask,limited:()=>{const p=document.getElementById('startup-loading');if(p)p.querySelector('[data-limited]').hidden=false;}};
})();
