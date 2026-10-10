/* Generic exact admission over numeric source IDs. No geographic/projected
 * segment objects, graph payloads, native meshes or national drawing scene. */
'use strict';
const CompactAdmission=(()=>{
function plan(e,execution,program){
 const N=e.meta.sources,F=e.facts,K=e.meta.stride,S=e.meta.strings;
 const mode=i=>F[i*K],tons=i=>F[i*K+2],miles=i=>F[i*K+6],end=(i,j)=>['pipeline','water','rail','truck'][mode(i)]+'|'+S[F[i*K+7+j]];
 const modal=new Map(),adj=new Map(),incident=new Map();
 for(let i=0;i<N;i++){for(let j=0;j<2;j++){const n=end(i,j);incident.set(n,(incident.get(n)||0)+1);}if(!(tons(i)>0))continue;
  const m=mode(i);if(!modal.has(m))modal.set(m,[]);modal.get(m).push(i);
  for(let j=0;j<2;j++){const n=end(i,j);if(!adj.has(n))adj.set(n,[]);if(!adj.get(n).includes(i))adj.get(n).push(i);}
 }
 const pair=new Int32Array(N*2);pair.fill(-1);
 const setPair=(n,a,b)=>{pair[a*2+(end(a,0)===n?0:1)]=b;pair[b*2+(end(b,0)===n?0:1)]=a;};
 for(const [n,ls]of adj)if(ls.length===2)setPair(n,ls[0],ls[1]);
 for(let p=0;p<program.program.length;p++){const n=program.program[p][0];for(const [a,b]of execution.pairs[p])setPair(n,a,b);}
 const visited=new Uint8Array(N),ranked=[];
 function walk(i,n,m){const chain=[];while(i>=0&&!visited[i]){visited[i]=1;const f=end(i,0)===n;chain.push(f?i+1:-(i+1));n=end(i,f?1:0);i=pair[i*2+(end(i,0)===n?0:1)];}if(!chain.length)return;
  const members=chain.map(t=>Math.abs(t)-1),mi=members.reduce((v,i)=>v+Math.max(0,miles(i)||0),0),sorted=members.slice().sort((a,b)=>tons(a)-tons(b));let cum=0,sustained=0;
  for(const i of sorted){cum+=miles(i)||0;if(cum>=mi*.25){sustained=tons(i);break;}}
  const mean=members.reduce((v,i)=>v+Math.min(tons(i),60e6)*(miles(i)||0),0)/Math.max(mi,1),score=mean*Math.min(mi,1000)*Math.sqrt(Math.min(1,sustained/Math.max(mean,1)));
  ranked.push({chain,m,meta:{key:['pipeline','water','rail','truck'][m],id:ranked.length,max:Math.max(...members.map(tons)),mi,sustained,score,appear:Math.min(8e6,sustained*.5)*Math.min(1,mi/80),major:false}});
 }
 for(const [m,ss]of modal){for(const i of ss)for(let j=0;j<2;j++)if(pair[i*2+(end(i,0)===end(i,j)?0:1)]<0&&!visited[i])walk(i,end(i,j),m);for(const i of ss)if(!visited[i])walk(i,end(i,0),m);}
 for(const [m,budget]of [[3,10],[2,8],[0,8],[1,5]]){const candidates=ranked.filter(r=>r.m===m&&r.meta.mi>=80&&r.meta.sustained>=2e6).sort((a,b)=>b.meta.score-a.meta.score);for(let j=0;j<candidates.length;j++){const r=candidates[j].meta;r.rank=j+1;if(j<budget){r.major=true;r.appear=16e6;}else r.appear*=Math.pow(budget/(j+1),.35);}}
 const chunks=[];let trunk=0;
 const tokenEnd=(t,j)=>end(Math.abs(t)-1,t>0?j:1-j);
 for(const r of ranked){const cs=[];let c=[];const trunkId=r.meta.major?trunk++:null;
  for(const t of r.chain){c.push(t);if((incident.get(tokenEnd(t,1))||0)>2){cs.push(c);c=[];}}if(c.length)cs.push(c);
  for(const chain of cs){const members=chain.map(t=>Math.abs(t)-1),mi=members.reduce((v,i)=>v+miles(i),0);let cum=0,local=0;
   for(const i of members.slice().sort((a,b)=>tons(a)-tons(b))){cum+=miles(i);if(cum>=mi*.25){local=tons(i);break;}}
   const complete=members.every(i=>tons(i)>0)&&incident.get(tokenEnd(chain[0],0))>1&&incident.get(tokenEnd(chain.at(-1),1))>1;
   const appear=r.meta.major?r.meta.appear:complete?Math.max(r.meta.appear,Math.min(8e6,local*.5)):r.meta.appear;
   chunks.push({m:r.m,chain,members,meta:{...r.meta,id:chunks.length,mi,appear,major:r.meta.major&&cs[0]===chain,trunkId,rankedPath:r.meta.id}});
  }
 }
 const at=new Map();for(const r of chunks){r.meta.dependencies=[];r.meta.ends=[tokenEnd(r.chain[0],0),tokenEnd(r.chain.at(-1),1)];const nodes=new Set();for(const i of r.members)for(let j=0;j<2;j++)nodes.add(end(i,j));for(const n of nodes){if(!at.has(n))at.set(n,[]);at.get(n).push(r);}}
 for(let pass=0;pass<12;pass++){let changed=false;for(const r of chunks){const a=r.meta;if(a.mi>20||a.major||a.ends[0]===a.ends[1])continue;
  const parents=a.ends.map(n=>(at.get(n)||[]).filter(p=>p!==r).sort((a,b)=>b.meta.appear-a.meta.appear)[0]);if(!parents[0]||!parents[1]||parents[0]===parents[1])continue;
  const priority=Math.min(parents[0].meta.appear,parents[1].meta.appear);if(priority>a.appear){a.appear=priority;a.dependencies=parents.map(p=>p.meta.id);a.connector=true;changed=true;}}
  if(!changed)break;
 }
 // ROAD/WATER/RAIL replacements are viewport-independent. Reuse their exact
 // numeric contracts; only ROAD integer IDs depend on the discarded chunk count.
 const fixed=new Map();for(const g of e.meta.branches[0].order){const m=mode(e.members[e.memberOffsets[g]]);if(m===0)continue;if(!fixed.has(m))fixed.set(m,[]);fixed.get(m).push(g);}
 const result=[],inserted=new Set();for(const r of chunks.filter(r=>r.m!==3)){
  if(r.m!==0){if(!inserted.has(r.m)){for(const base of fixed.get(r.m)||[])result.push({base});inserted.add(r.m);}continue;}
  const ca=new Map();for(const i of r.members)for(let j=0;j<2;j++){const n=end(i,j);if(!ca.has(n))ca.set(n,[]);ca.get(n).push(i);}
  result.push({contract:{meta:r.meta,members:r.members,chains:[r.chain.map(t=>[Math.abs(t)-1,[tokenEnd(t,0),tokenEnd(t,1)],t>0?1:0])],adj:[...ca]}});
 }
 const offset=chunks.filter(r=>r.m!==3).length;
 let j=0;for(const base of fixed.get(3)||[]){const meta=JSON.parse(e.meta.groupMeta[base]);meta.id=offset+j++;result.push({base,meta});}
 return result;
}
return{plan};})();
if(typeof module!=='undefined')module.exports=CompactAdmission;
