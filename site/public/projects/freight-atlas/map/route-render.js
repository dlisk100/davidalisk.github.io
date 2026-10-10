/* Pure topology and display geometry. No invented links or quantities. */
'use strict';
const RouteRender = (() => {
 const key = s => s.m === 'pipeline' && s.graph && s.graph.pipelineSelectionKey ? s.graph.pipelineSelectionKey : s.m + '|' + s.n;
 const node = p => p.map(x => x.toFixed(6)).join(',');
 // Canonical graph IDs are independent of projected/encoded coordinates.
 const end = (s,j) => s.nodes ? s.m+'|'+s.nodes[j] : s.m+'|'+node(j?s.pts.at(-1):s.pts[0]);
 const smooth = x => x*x*(3-2*x);
 function routes(segs,lazy=false) {
  const groups = new Map();
  for (const s of segs) if (s.n && s.t > 0) { const k=key(s); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(s); }
  return [...groups].map(([key,ss]) => {
   if(lazy){
    // Selection membership is cheap and always resident. Oriented geometry
    // and canonical adjacency are built only if a consumer actually needs them.
    let built=null;const ensure=()=>built||(built=routes(ss)[0]);
    return {key,ss,max:Math.max(...ss.map(s=>s.t)),lazyGeometry:true,
     get materialized(){return !!built;},get chains(){return ensure().chains;},get adj(){return ensure().adj;},
     invalidateGeometry(){built=null;delete this.geom;delete this.cacheKey;}};
   }
   const adj=new Map(); for(const s of ss) for(const j of [0,1]) {const n=end(s,j);if(!adj.has(n))adj.set(n,[]);adj.get(n).push(s);}
   const used=new Set(), chains=[];
   function walk(s,n) {const c=[];while(s&&!used.has(s)){used.add(s);const forward=end(s,0)===n;c.push({s,pts:forward?s.pts:s.pts.slice().reverse(),nodes:[n,end(s,forward?1:0)]});n=c.at(-1).nodes[1];const a=adj.get(n);s=a.length===2?a.find(x=>!used.has(x)):null;}chains.push(c);}
   for(const s of ss) for(const j of [0,1]) if(adj.get(end(s,j)).length!==2&&!used.has(s))walk(s,end(s,j));
   for(const s of ss)if(!used.has(s))walk(s,end(s,0));
   return {key,ss,chains,max:Math.max(...ss.map(s=>s.t)),adj};
  });
 }
 function alpha(r,cut){const x=(Math.log2(r.max/cut)+0.7)/0.7;return x<=0?0:x>=1?1:smooth(x);}
 function geometry(r,width,k,view=null,pool=null) {
  if(view)return viewportGeometry(r,width,k,view,pool);
  const nw=new Map([...r.adj].map(([n,ss])=>[n,ss.reduce((v,s)=>v+width(s),0)/ss.length]));
  return r.chains.map(chain=>{
   const samples=[];
   for(const {s,pts,nodes} of chain){
    const lengths=[0];for(let i=1;i<pts.length;i++)lengths.push(lengths.at(-1)+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
    const total=lengths.at(-1)||1,w=width(s),start=nw.get(nodes?nodes[0]:s.m+'|'+node(pts[0])),end=nw.get(nodes?nodes[1]:s.m+'|'+node(pts.at(-1)));
    for(let i=1;i<pts.length;i++){
     const d=lengths[i]-lengths[i-1],steps=Math.max(1,Math.min(128,Math.ceil(d*k/2)));
     for(let j=0;j<=steps;j++){if(j===0&&samples.length)continue;const f=j/steps,u=(lengths[i-1]+f*d)/total;
      const blend=u<0.5?start+(w-start)*smooth(u*2):w+(end-w)*smooth((u-0.5)*2);
      samples.push({x:pts[i-1][0]+f*(pts[i][0]-pts[i-1][0]),y:pts[i-1][1]+f*(pts[i][1]-pts[i-1][1]),w:blend,s});
     }
    }
   }
   return {samples};
  });
 }
 function viewportGeometry(r,width,k,view,pool=null) {
  let cursor=0;const retain=q=>{const out=pool?(pool[cursor]||(pool[cursor]={})):{};cursor++;out.x=q.x;out.y=q.y;out.w=q.w;out.s=q.s;return out;};
  // Keep exact original sampling positions and canonical endpoint widths.
  // Only offscreen primitive runs are omitted; never join across an omission.
  const nw=new Map([...r.adj].map(([n,ss])=>[n,ss.reduce((v,s)=>v+width(s),0)/ss.length]));
  const result=[];
  for(const chain of r.chains){let samples=[],previous=null;const scratch={};
   const finish=()=>{if(samples.length)result.push({samples});samples=[];};
   for(const {s,pts,nodes} of chain){
    const lengths=[0];for(let i=1;i<pts.length;i++)lengths.push(lengths.at(-1)+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
    const total=lengths.at(-1)||1,w=width(s),start=nw.get(nodes?nodes[0]:s.m+'|'+node(pts[0])),end=nw.get(nodes?nodes[1]:s.m+'|'+node(pts.at(-1)));
    for(let i=1;i<pts.length;i++){
     const a=pts[i-1],b=pts[i],d=lengths[i]-lengths[i-1],steps=Math.max(1,Math.min(128,Math.ceil(d*k/2)));
     const sample=j=>{const f=j/steps,u=(lengths[i-1]+f*d)/total,blend=u<0.5?start+(w-start)*smooth(u*2):w+(end-w)*smooth((u-0.5)*2);scratch.x=a[0]+f*(b[0]-a[0]);scratch.y=a[1]+f*(b[1]-a[1]);scratch.w=blend;scratch.s=s;return scratch;};
     const outside=Math.max(a[0],b[0])<view[0]||Math.min(a[0],b[0])>view[2]||Math.max(a[1],b[1])<view[1]||Math.min(a[1],b[1])>view[3];
     if(outside){finish();previous=sample(steps);continue;}
     if(!samples.length&&previous)samples.push(retain(previous));
     for(let j=previous?1:0;j<=steps;j++)samples.push(retain(sample(j)));
     previous=samples.at(-1);
    }
   }finish();
  }if(pool)pool.length=cursor;return result;
 }
 // Selection identities never grant visibility. Pair only real touching ends, by straightness.
 function hierarchy(segs,budgets={truck:10,rail:8,pipeline:8,water:5},policy={}) {
  const groups=new Map(),out=[];
  for(const s of segs) if(s.t>0){const k=s.m;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s);}
  for(const [key,ss] of groups){
   const adj=new Map(),pairs=new Map();
   for(const s of ss)for(const j of [0,1]){const n=end(s,j);if(!adj.has(n))adj.set(n,[]);if(!adj.get(n).includes(s))adj.get(n).push(s);}
   function vector(s,n){const p=end(s,0)===n?s.pts:s.pts.slice().reverse(),a=p[0];const b=p.find(q=>Math.hypot(q[0]-a[0],q[1]-a[1])>1e-7)||a;const d=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/d,(b[1]-a[1])/d];}
   for(const [n,ls] of adj){const options=[];for(let i=0;i<ls.length;i++)for(let j=i+1;j<ls.length;j++){const a=vector(ls[i],n),b=vector(ls[j],n),dot=a[0]*b[0]+a[1]*b[1];if(ls.length===2||dot<=-0.5)options.push({a:ls[i],b:ls[j],dot});}const used=new Set();for(const p of options.sort((a,b)=>a.dot-b.dot)){if(used.has(p.a)||used.has(p.b))continue;used.add(p.a);used.add(p.b);pairs.set(n+'|'+p.a.i,p.b);pairs.set(n+'|'+p.b.i,p.a);}}
   const used=new Set();
   function walk(s,n){const chain=[];while(s&&!used.has(s)){used.add(s);const forward=end(s,0)===n,pts=forward?s.pts:s.pts.slice().reverse();chain.push({s,pts,nodes:[n,end(s,forward?1:0)]});n=chain.at(-1).nodes[1];s=pairs.get(n+'|'+s.i);}if(!chain.length)return;
    const members=chain.map(x=>x.s),mi=members.reduce((v,s)=>v+Math.max(0,s.mi||0),0),sorted=members.slice().sort((a,b)=>a.t-b.t);let cum=0,sustained=0;for(const s of sorted){cum+=s.mi||0;if(cum>=mi*.25){sustained=s.t;break;}}
    const mean=members.reduce((v,s)=>v+Math.min(s.t,60e6)*(s.mi||0),0)/Math.max(mi,1);
    // Capped integrated ton-miles with a lower-quartile sustainability penalty; no maximum-link ranking.
    const score=mean*Math.min(mi,1000)*Math.sqrt(Math.min(1,sustained/Math.max(mean,1)));
    const ca=new Map();for(const s of members)for(const j of [0,1]){const nn=end(s,j);if(!ca.has(nn))ca.set(nn,[]);ca.get(nn).push(s);}
    out.push({key,id:out.length,ss:members,chains:[chain],adj:ca,max:Math.max(...members.map(s=>s.t)),mi,sustained,score,appear:Math.min(8e6,sustained*.5)*Math.min(1,mi/80),major:false});
   }
   for(const s of ss)for(const j of [0,1])if(!pairs.has(end(s,j)+'|'+s.i)&&!used.has(s))walk(s,end(s,j));
   for(const s of ss)if(!used.has(s))walk(s,end(s,0));
  }
  for(const [m,budget] of Object.entries(budgets)){const candidates=out.filter(r=>r.ss[0].m===m&&r.mi>=80&&r.sustained>=2e6).sort((a,b)=>b.score-a.score);for(let i=0;i<candidates.length;i++){const r=candidates[i];r.rank=i+1;if(i<budget){r.major=true;r.appear=16e6;}else r.appear*=Math.pow(budget/(i+1),0.35);}}
  // Ranking uses full sustained paths. Dependency decisions use junction-bounded
  // subpaths: a 200-mile low-priority road cannot suppress a seven-mile connector
  // embedded inside it, nor can that connector reveal the entire road.
  const incident=new Map();for(const s of segs)for(const j of [0,1]){const n=end(s,j);incident.set(n,(incident.get(n)||0)+1);}
  const ranked=out.splice(0);let trunk=0;
  for(const r of ranked){const chunks=[];let c=[];const trunkId=r.major?trunk++:null;
   for(const item of r.chains[0]){c.push(item);if((incident.get(item.nodes[1])||0)>2){chunks.push(c);c=[];}}if(c.length)chunks.push(c);
   for(const chain of chunks){const ss=chain.map(x=>x.s),adj=new Map();for(const s of ss)for(const j of [0,1]){const n=end(s,j);if(!adj.has(n))adj.set(n,[]);adj.get(n).push(s);}
    let mi=ss.reduce((a,s)=>a+s.mi,0),cum=0,local=0;for(const s of ss.slice().sort((a,b)=>a.t-b.t)){cum+=s.mi;if(cum>=mi*.25){local=s.t;break;}}
    const complete=chain.every(x=>x.s.t>0)&&(incident.get(chain[0].nodes[0])>1)&&(incident.get(chain.at(-1).nodes[1])>1);
    const appear=r.major?r.appear:complete?Math.max(r.appear,Math.min(8e6,local*.5)):r.appear;
    out.push({...r,id:out.length,ss,chains:[chain],adj,mi,appear,major:r.major&&chunks[0]===chain,trunkId,rankedPath:r.id});
   }
  }
  // Dependency closure over actual paired paths, not arbitrary graph shortest
  // paths. A short path joining retained candidates inherits the weaker parent's
  // eligibility. It keeps its own per-edge values, names and geometry.
  const at=new Map();
  for(const r of out){r.dependencies=[];const c=r.chains[0];r.ends=[c[0].nodes[0],c.at(-1).nodes[1]];for(const n of r.adj.keys()){if(!at.has(n))at.set(n,[]);at.get(n).push(r);}}
  for(let pass=0;pass<12;pass++){let changed=false;
   for(const r of out){if(r.mi>20||r.major||r.ends[0]===r.ends[1])continue;
    const parents=r.ends.map(n=>(at.get(n)||[]).filter(p=>p!==r).sort((a,b)=>b.appear-a.appear)[0]);
    if(!parents[0]||!parents[1]||parents[0]===parents[1])continue;
    const priority=Math.min(parents[0].appear,parents[1].appear);
    if(priority>r.appear){r.appear=priority;r.dependencies=parents.map(p=>p.id);r.connector=true;changed=true;}
   }
   if(!changed)break;
  }
  // Offline road repair overrides ROAD admission only. Other modal controls
  // retain the exact phase1 hierarchy and policies above.
  if(segs.some(s=>s.m==='truck'&&s.graph&&s.graph.displayPriority!==undefined)) {
   const keep=out.filter(r=>r.ss[0].m!=='truck'), units=new Map();
   for(const s of segs.filter(s=>s.m==='truck')) {
    const g=s.graph, id=g.displayPriority+'|'+(s.n||('source:'+s.i));
    if(!units.has(id))units.set(id,[]);units.get(id).push(s);
   }
   for(const [id,ss] of units) {
    const adj=new Map();for(const s of ss)for(const j of [0,1]) {const n=end(s,j);if(!adj.has(n))adj.set(n,[]);adj.get(n).push(s);}
    const used=new Set(),chains=[];
    function walk(s,n){const c=[];while(s&&!used.has(s)){used.add(s);const forward=end(s,0)===n;c.push({s,pts:forward?s.pts:s.pts.slice().reverse(),nodes:[n,end(s,forward?1:0)]});n=c.at(-1).nodes[1];s=adj.get(n).length===2?adj.get(n).find(x=>!used.has(x)):null;}if(c.length)chains.push(c);}
    for(const s of ss)for(const j of [0,1])if(adj.get(end(s,j)).length!==2&&!used.has(s))walk(s,end(s,j));
    for(const s of ss)if(!used.has(s))walk(s,end(s,0));
    keep.push({key:'truck',id:keep.length,dependencyUnits:[...new Set(ss.map(s=>s.graph.displayUnit))],ss,chains,adj,max:Math.max(...ss.map(s=>s.t)),mi:ss.reduce((a,s)=>a+s.mi,0),appear:ss[0].graph.displayPriority,major:ss[0].graph.displayPriority===16e6});
   }
   return waterAdmission(keep,segs);
  }
  return waterAdmission(out,segs);
 }
 function waterAdmission(result,segs) {
  const water=segs.filter(s=>s.m==='water'&&s.t>0);
  if(!water.some(s=>s.graph&&s.graph.waterDisplayPriority!==undefined))return result;
  if(water.some(s=>!s.graph||s.graph.waterDisplayPriority===undefined))throw new Error('Incomplete WATER dependency metadata');
  // Dependency priorities are atomic, but selection identities stay local.
  // Preserve inherited canonical render endpoints/geometry; NWN source nodes
  // authorize admission offline, not new coordinate or proximity joins here.
  const units=new Map(),replacement=[];
  for(const s of water){const id=s.graph.waterDisplayPriority+'|'+(s.n||('source:'+s.i));if(!units.has(id))units.set(id,[]);units.get(id).push(s);}
  for(const ss of units.values()){
   const adj=new Map();for(const s of ss)for(const j of [0,1]){const n=end(s,j);if(!adj.has(n))adj.set(n,[]);adj.get(n).push(s);}
   const used=new Set(),chains=[];
   function walk(s,n){const c=[];while(s&&!used.has(s)){used.add(s);const forward=end(s,0)===n;c.push({s,pts:forward?s.pts:s.pts.slice().reverse(),nodes:[n,end(s,forward?1:0)]});n=c.at(-1).nodes[1];s=adj.get(n).length===2?adj.get(n).find(x=>!used.has(x)):null;}if(c.length)chains.push(c);}
   for(const s of ss)for(const j of [0,1])if(adj.get(end(s,j)).length!==2&&!used.has(s))walk(s,end(s,j));
   for(const s of ss)if(!used.has(s))walk(s,end(s,0));
   replacement.push({key:'water',id:'water:'+replacement.length,ss,chains,adj,max:Math.max(...ss.map(s=>s.t)),mi:ss.reduce((a,s)=>a+s.mi,0),appear:ss[0].graph.waterDisplayPriority,major:ss[0].graph.waterDisplayPriority===16e6,dependencyUnits:[...new Set(ss.map(s=>s.graph.waterDisplayUnit))]});
  }
  let inserted=false;return result.flatMap(r=>{if(r.ss[0].m!=='water')return [r];if(inserted)return [];inserted=true;return replacement;});
 }
 function detailAlpha(r,cut){const x=(Math.log2(Math.max(r.appear,1)/cut)+0.7)/0.7;return x<=0?0:x>=1?1:smooth(x);}
 return {routes,alpha,node,smooth,geometry,hierarchy,detailAlpha};
})();
if(typeof module!=='undefined')module.exports=RouteRender;
