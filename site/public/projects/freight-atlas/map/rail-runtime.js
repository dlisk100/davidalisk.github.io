/* Runtime integration: frozen admission, identity-partitioned render groups, serial LOD loading. */
'use strict';
const RailRuntime=(()=>{
 const cache=new Map(),pending=new Map(),sizes=new Map(),maxCacheBytes=4*1024*1024;let generation=0,inflight=0,error=null,cacheBytes=0,evictions=0,retired=false,staging=null;const reader=new BoundedTiles.Reader(6*1024*1024);
 function touch(url){const m=cache.get(url);cache.delete(url);cache.set(url,m);return m;}
 function trim(){while(cacheBytes>maxCacheBytes&&cache.size){const url=cache.keys().next().value;cacheBytes-=sizes.get(url);sizes.delete(url);cache.delete(url);evictions++;}}
 function partition(hierarchy,segs,metadata){
  const admitted=RailAdmission.override(hierarchy,segs,metadata),out=[];
  for(const r of admitted){if(r.ss[0].m!=='rail'){out.push(r);continue;}
   const groups=new Map();for(const s of r.ss){const key=s.n?'rail|'+s.n:'i'+s.i;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
   for(const [key,ss] of groups){const adj=new Map(),end=(s,j)=>'rail|'+s.nodes[j];for(const s of ss)for(let j=0;j<2;j++){const n=end(s,j);if(!adj.has(n))adj.set(n,[]);adj.get(n).push(s);}const used=new Set(),chains=[];
    function walk(s,n){const c=[];while(s&&!used.has(s)){used.add(s);const f=end(s,0)===n;c.push({s,pts:f?s.pts:s.pts.slice().reverse(),nodes:[n,end(s,f?1:0)]});n=c.at(-1).nodes[1];s=adj.get(n).length===2?adj.get(n).find(x=>!used.has(x)):null;}if(c.length)chains.push(c);}
    for(const s of ss)for(let j=0;j<2;j++)if(adj.get(end(s,j)).length!==2&&!used.has(s))walk(s,end(s,j));for(const s of ss)if(!used.has(s))walk(s,end(s,0));
    out.push({...r,id:r.id+'|'+key,selectionKey:key,ss,adj,chains,max:Math.max(...ss.map(s=>s.t)),mi:ss.reduce((v,s)=>v+s.mi,0)});
   }
  }return out;
 }
 async function tile(url){if(cache.has(url))return touch(url);if(pending.has(url))return pending.get(url);inflight++;const p=reader.read('rail-geometry/'+url).then(rows=>{const m=new Map(rows),bytes=rows.reduce((n,r)=>n+64+r[1].length*8,0);if(!retired){cache.set(url,m);sizes.set(url,bytes);cacheBytes+=bytes;trim();}return m;}).finally(()=>{inflight--;pending.delete(url);});pending.set(url,p);return p;}
 async function update(segs,vis,proj,k,onchange){
  if(retired)return;
  error=null;const gen=++generation,meta=window.RAIL_GEOMETRY;if(!meta)return;
  const todo=vis.filter(([s])=>s.m==='rail'&&meta.index[s.i]).map(([s])=>s),lod=RailGeometry.chooseLOD(proj.scale()*k,meta.errorBudgetCSS);
  const urls=RailGeometry.tileRequests(meta,todo.filter(s=>s.railLOD!==lod).map(s=>s.i),proj.scale()*k);
  const decoded=new Map();if(staging)staging.clear();staging=decoded;
  try{for(const url of urls){if(gen!==generation)return;const rows=await tile(url);if(gen!==generation)return;for(const s of todo)if('tiles/'+meta.index[s.i].tile+'-l'+lod+'.json.gz'===url&&s.railLOD!==lod){const row=rows.get(s.i);if(!row)throw Error('Missing rail tile row '+s.i);decoded.set(s.i,RailGeometry.decode(row));}trim();}}catch(e){error=String(e);window.__errs.push(error);return;}
  if(gen!==generation)return;const changed=new Set();
  for(const s of todo){if(s.railLOD===lod)continue;
   if(!s.baseRailPts){s.baseRailPts=s.pts;s.baseRailLL=s.ll;s.baseRailLen=s.len;}
   const ll=decoded.get(s.i),pts=ll.map(proj);s.ll=ll;s.pts=pts;s.railLOD=lod;s.dp=null;s.len=0;s.p2=new Path2D();pts.forEach((q,j)=>{if(j){s.p2.lineTo(...q);s.len+=Math.hypot(q[0]-pts[j-1][0],q[1]-pts[j-1][1]);}else s.p2.moveTo(...q);});s.p2d=s.p2;
   s.bb=[Math.min(...pts.map(q=>q[0])),Math.min(...pts.map(q=>q[1])),Math.max(...pts.map(q=>q[0])),Math.max(...pts.map(q=>q[1]))];if(s.display)changed.add(s.display);if(s.route)changed.add(s.route);
  }
  for(const r of changed){if(r.lazyGeometry){r.invalidateGeometry();continue;}for(const c of r.chains)for(const item of c){const s=item.s;item.pts=item.nodes[0]==='rail|'+s.nodes[0]?s.pts:s.pts.slice().reverse();}delete r.cacheKey;delete r.geom;}
  // Decoded segment geometry owns the selected shape, independently of tiles.
  // Trim only after all requested rows are consumed; never evict a row mid-batch.
  trim();if(changed.size)onchange();
 }
 function dispose(){retired=true;generation++;if(staging)staging.clear();cache.clear();sizes.clear();pending.clear();cacheBytes=0;}
 return{partition,update,dispose,status:()=>({inflight,loadedTiles:cache.size,error,cacheBytes,maxCacheBytes,evictions,reader:reader.status()})};
})();
if(typeof module!=='undefined')module.exports=RailRuntime;
