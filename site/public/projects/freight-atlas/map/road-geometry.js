/* Lazy ROAD detail only; source IDs and canonical endpoints never change. */
'use strict';
window.RoadGeometry=(()=>{
 const pending=new Map(),cache=new Map(),sizes=new Map(),maxCacheBytes=4*1024*1024;let generation=0,inflight=0,loaded=0,lastError=null,cacheBytes=0,evictions=0,retired=false,staging=null;const reader=new BoundedTiles.Reader(6*1024*1024);
 function touch(name){const m=cache.get(name);cache.delete(name);cache.set(name,m);return m;}
 function trim(){while(cacheBytes>maxCacheBytes&&cache.size){const name=cache.keys().next().value;cacheBytes-=sizes.get(name);sizes.delete(name);cache.delete(name);evictions++;}}
 function decode(c){let x=0,y=0;const p=[];for(let i=0;i<c.length;i+=2){x+=c[i];y+=c[i+1];p.push([x/1e7,y/1e7]);}return p;}
 function tile(name){if(cache.has(name))return Promise.resolve(touch(name));if(pending.has(name))return pending.get(name);inflight++;const p=reader.read('road-tiles/'+name+'.json.gz').then(rows=>{const m=new Map(rows),bytes=rows.reduce((n,r)=>n+64+r[1].length*8,0);if(!retired){cache.set(name,m);sizes.set(name,bytes);cacheBytes+=bytes;loaded++;trim();}return m;}).finally(()=>{inflight--;pending.delete(name);});pending.set(name,p);return p;}
 async function update(segs,vis,proj,k,onchange){
  if(retired)return;
  lastError=null;if(!window.ROAD_GEOMETRY)return;const gen=++generation,c=ROAD_GEOMETRY;
  const desired=c.tolerances.findIndex(t=>t*proj.scale()*k<=.5);const chosen=desired<0?c.tolerances.length-1:desired;
  const low=s=>window.SoutheastCoarse&&SoutheastCoarse.use(proj,k)&&SoutheastCoarse.has(s.i),lod=s=>low(s)?0:chosen;
  const todo=vis.filter(([s])=>s.m==='truck'&&c.index[s.i]!==undefined).map(([s])=>s),names=[...new Set(todo.filter(s=>!low(s)&&s.roadLOD!==chosen).map(s=>c.index[s.i]+'-l'+chosen))];
  // Bounded serial tile requests on the shared host. No request worker pileup.
  const decoded=new Map();if(staging)staging.clear();staging=decoded;
  if(chosen>0)for(const name of names){if(gen!==generation)return;try{const rows=await tile(name);if(gen!==generation)return;for(const s of todo)if(c.index[s.i]+'-l'+chosen===name&&s.roadLOD!==chosen&&rows.has(s.i))decoded.set(s.i,decode(rows.get(s.i)));trim();}catch(e){lastError=String(e);window.__errs.push(lastError);return;}}
  if(gen!==generation)return;const changed=new Set();
  for(const s of todo){const target=lod(s);if(!s.baseRoadPts){s.baseRoadLL=window.SoutheastCoarse&&SoutheastCoarse.shape(s.i)||s.ll;s.baseRoadPts=s.baseRoadLL.map(proj);s.roadLOD=-1;}if(s.roadLOD===target)continue;if(target>0&&!decoded.has(s.i))continue;
   const ll=target===0?s.baseRoadLL:decoded.get(s.i);s.ll=ll;s.pts=target===0?s.baseRoadPts:ll.map(proj);s.roadLOD=target;s.dp=null;
   s.bb=[Math.min(...s.pts.map(q=>q[0])),Math.min(...s.pts.map(q=>q[1])),Math.max(...s.pts.map(q=>q[0])),Math.max(...s.pts.map(q=>q[1]))];
   if(s.display)changed.add(s.display);if(s.route)changed.add(s.route);
  }
  for(const r of changed){if(r.lazyGeometry){r.invalidateGeometry();continue;}for(const chain of r.chains)for(const item of chain){const s=item.s;item.pts=item.nodes&&item.nodes[0]===s.m+'|'+s.nodes[0]?s.pts:s.pts.slice().reverse();}delete r.cacheKey;}
  trim();if(changed.size)onchange();
 }
 function dispose(){retired=true;generation++;if(staging)staging.clear();cache.clear();sizes.clear();pending.clear();cacheBytes=0;}
 return {update,dispose,status:()=>({inflight,loadedTiles:loaded,error:lastError,cacheBytes,maxCacheBytes,evictions,reader:reader.status()})};
})();
