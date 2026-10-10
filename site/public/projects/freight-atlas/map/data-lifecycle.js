/* Exact-content ownership compaction, never selection/generalization. */
'use strict';
const DataLifecycle=(()=>{
 const fields=['pipelineSourceCandidateIDs','pipelineSourceCandidates','values'];
 function compact(p){
  // Each pool is temporary. Runtime graph rows retain canonical immutable
  // arrays, not pool keys or duplicate arrays from JSON parsing.
  for(const field of fields){const pool=new Map();for(const g of p.graph||[]){const a=g[field];if(!Array.isArray(a))continue;const key=JSON.stringify(a);if(pool.has(key))g[field]=pool.get(key);else{Object.freeze(a);pool.set(key,a);}}}
 }
 function retireRail(hierarchy){for(let i=hierarchy.length-1;i>=0;i--)if(hierarchy[i].ss[0].m==='rail')hierarchy.splice(i,1);}
 function dispose(scene){
  // A retired document has no remaining network rendering authority. Do not
  // call this for a bfcache-preserved document that can return interactively.
  const seen=new Set();for(const list of [scene.ROUTES,scene.DISPLAY,scene.INHERITED_DISPLAY])for(const r of list||[]){if(seen.has(r))continue;seen.add(r);if(r.lazyGeometry)r.invalidateGeometry();else{if(r.chains)r.chains.length=0;if(r.adj)r.adj.clear();}if(r.invalidateGeometry&&!r.lazyGeometry)r.invalidateGeometry();r.ss.length=0;delete r.geom;delete r.cacheKey;}
  for(const key of ['SEGS','REG','ROUTES','DISPLAY','INHERITED_DISPLAY'])if(scene[key])scene[key].length=0;
  if(scene.PZ){if(scene.PZ.graph)scene.PZ.graph.length=0;if(scene.PZ.segs)scene.PZ.segs.length=0;}
 }
 return{fields,compact,retireRail,dispose};
})();
if(typeof module!=='undefined')module.exports=DataLifecycle;
