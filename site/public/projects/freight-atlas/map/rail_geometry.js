/* Additive pure fine-geometry API. Never mutates PZ or ROAD/WATER assets. */
'use strict';
const RailGeometry=(()=>{
const tolerances=[.0005,.0001,.000025,.000005,0];
function distance2(q,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/d)):0;return(q[0]-a[0]-t*dx)**2+(q[1]-a[1]-t*dy)**2;}
function indices(p,t){const keep=new Set([0,p.length-1]),todo=[[0,p.length-1]];if(p.length>2&&distance2(p[0],p.at(-1),p.at(-1))===0){let j=1;for(let i=2;i<p.length-1;i++)if(distance2(p[i],p[0],p[0])>distance2(p[j],p[0],p[0]))j=i;keep.add(j);todo.splice(0,1,[0,j],[j,p.length-1]);}while(todo.length){const[a,b]=todo.pop();let best=t*t,j=-1;for(let i=a+1;i<b;i++){const d=distance2(p[i],p[a],p[b]);if(d>best){best=d;j=i;}}if(j>=0){keep.add(j);todo.push([a,j],[j,b]);}}return[...keep].sort((a,b)=>a-b);}
function encode(p){let x=0,y=0;return p.flatMap(q=>{const a=Math.round(q[0]*1e7),b=Math.round(q[1]*1e7),r=[a-x,b-y];x=a;y=b;return r;});}
function decode(c){let x=0,y=0;const p=[];for(let i=0;i<c.length;i+=2){x+=c[i];y+=c[i+1];p.push([x/1e7,y/1e7]);}return p;}
function recover(feature,record,project){
 const a=feature.attributes,sourceKey='FRAARCID:'+record.sourceArcID,base={sourceKey,nodes:record.nodes};
 if(String(a.FRAARCID)!==String(record.sourceArcID))throw Error('source ID mismatch');
 const nodes=['FRA:'+a.FRFRANODE,'FRA:'+a.TOFRANODE];
 if(JSON.stringify(nodes)!==JSON.stringify(record.nodes))return{...base,status:'deferred',reason:'source-node-snapshot-mismatch'};
 const paths=feature.geometry&&feature.geometry.paths;
 if(!paths||paths.length!==1||paths[0].length<2)return{...base,status:'deferred',reason:'multipart-or-missing-source-geometry'};
 const p=paths[0].map(q=>q.slice(0,2));
 if(p.some(q=>q.some(x=>!Number.isFinite(x))))return{...base,status:'deferred',reason:'nonfinite-source-geometry'};
 const delta=Math.max(...[0,1].map(j=>{const c=project(p[j?p.length-1:0]),b=project(record.endpoints[j]);return Math.hypot(c[0]-b[0],c[1]-b[1]);}));
 if(delta>.0001)return{...base,status:'deferred',reason:'inherited-routing-endpoint-displacement',endpointDelta:delta};
 p[0]=record.endpoints[0].slice();p[p.length-1]=record.endpoints[1].slice();
 const pp=p.map(project),vertexIndices=tolerances.map(t=>t===0?p.map((_,i)=>i):indices(pp,t));
 const lods=vertexIndices.map(is=>encode(is.map(i=>p[i])));
 return{...base,status:'recovered',endpointDelta:delta,vertexIndices,lods};
}
// screenScale = normalized projection scale * zoom in CSS pixels (not DPR).
// 1e-8 covers measured encoding/projection slack; pinned endpoint displacement
// is separately disclosed in metrics, never hidden in the LOD error budget.
function chooseLOD(screenScale,errorCSS=.55){for(let i=0;i<tolerances.length;i++)if((tolerances[i]+1e-8)*screenScale<=errorCSS)return i;return tolerances.length-1;}
function tileRequests(meta,segmentIDs,screenScale){const lod=chooseLOD(screenScale,meta.errorBudgetCSS||.55);return [...new Set(segmentIDs.filter(i=>meta.index[i]).map(i=>'tiles/'+meta.index[i].tile+'-l'+lod+'.json.gz'))].sort();}
return{recover,decode,encode,tolerances,chooseLOD,tileRequests};})();
if(typeof module!=='undefined')module.exports=RailGeometry;
