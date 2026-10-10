/* Bounded reconstructible decoded ROAD/RAIL detail; never evicts pinned geometry. */
'use strict';
const DetailResidency=(()=>{
 class Budget {
  constructor(maxBytes=2*1024*1024){this.maxBytes=maxBytes;this.evictions=0;this.bytes=0;this.pinnedBytes=0;this.clock=0;this.touched=new Map()}
  trim(rows,pinned){this.clock++;const detail=[];let bytes=0;for(const s of rows){const base=s.m==='truck'?s.baseRoadPts:s.m==='rail'?s.baseRailPts:null;if(!base||s.pts===base)continue;const n=(s.pts.length+s.ll.length)*48;bytes+=n;if(pinned.has(s))this.touched.set(s.i,this.clock);detail.push({s,n,pinned:pinned.has(s),last:this.touched.get(s.i)||0})}this.pinnedBytes=detail.filter(x=>x.pinned).reduce((n,x)=>n+x.n,0);
   for(const {s,n} of detail.filter(x=>!x.pinned).sort((a,b)=>a.last-b.last)){if(bytes<=this.maxBytes)break;s.pts=s.m==='truck'?s.baseRoadPts:s.baseRailPts;s.ll=s.m==='truck'?s.baseRoadLL:s.baseRailLL;if(s.m==='truck')s.roadLOD=0;else{s.railLOD=undefined;s.len=s.baseRailLen;s.p2=null;s.p2d=null;}s.dp=null;s.bb=[Math.min(...s.pts.map(q=>q[0])),Math.min(...s.pts.map(q=>q[1])),Math.max(...s.pts.map(q=>q[0])),Math.max(...s.pts.map(q=>q[1]))];for(const r of new Set([s.display,s.route]))if(r){if(r.invalidateGeometry)r.invalidateGeometry();else{delete r.geom;delete r.cacheKey;for(const c of r.chains)for(const x of c)x.pts=x.nodes[0]===x.s.m+'|'+x.s.nodes[0]?x.s.pts:x.s.pts.slice().reverse()}}bytes-=n;this.evictions++;this.touched.delete(s.i)}this.bytes=bytes;return this.status();
  }
  status(){return {detailBytes:this.bytes,maxBytes:this.maxBytes,pinnedBytes:this.pinnedBytes,evictions:this.evictions,accounting:'48 bytes per coordinate pair, both geographic/projected; estimate, not process memory'}}
 }
 return {Budget};
})();
if(typeof module!=='undefined')module.exports=DetailResidency;
