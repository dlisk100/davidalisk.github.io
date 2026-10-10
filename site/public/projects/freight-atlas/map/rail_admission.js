/* Pure rail-only admission evidence and dependency metadata. No coordinates used. */
'use strict';
const RailAdmission=(()=>{
function adjacency(edges){const adj=new Map();for(const e of edges)for(const n of e.nodes){if(!adj.has(n))adj.set(n,[]);adj.get(n).push(e);}return adj;}
function audit(edges,anchors){
 const degrees=new Map(),parents=new Map(),sizes=new Map(),hasAnchor=new Map(),leafKinds=new Map(),counts={},events=[];let breaks=0,components=0,unanchored=0,count=0,miles=0;
 function find(n){let a=n;while(parents.get(a)!==a)a=parents.get(a);while(n!==a){const x=parents.get(n);parents.set(n,a);n=x;}return a;}
 function add(n){if(!parents.has(n)){parents.set(n,n);sizes.set(n,1);hasAnchor.set(n,anchors.has(n));components++;if(!anchors.has(n))unanchored++;}}
 function union(a,b){a=find(a);b=find(b);if(a===b)return;unanchored-=Number(!hasAnchor.get(a))+Number(!hasAnchor.get(b));if(sizes.get(a)<sizes.get(b))[a,b]=[b,a];parents.set(b,a);sizes.set(a,sizes.get(a)+sizes.get(b));hasAnchor.set(a,hasAnchor.get(a)||hasAnchor.get(b));unanchored+=Number(!hasAnchor.get(a));components--;}
 function update(n){const old=degrees.get(n)||0,k=anchors.get(n)||'selection-break';if(old===1){counts[k]--;if(k==='selection-break')breaks--;leafKinds.delete(n);}degrees.set(n,old+1);if(old===0){counts[k]=(counts[k]||0)+1;if(k==='selection-break')breaks++;leafKinds.set(n,k);}}
 const sorted=edges.slice().sort((a,b)=>b.priority-a.priority||a.id-b.id);let worst=0,worstUnanchored=0;
 for(let i=0;i<sorted.length;){const p=sorted[i].priority;while(i<sorted.length&&sorted[i].priority===p){const e=sorted[i++];for(const n of e.nodes){add(n);update(n);}union(...e.nodes);count++;miles+=e.miles;}
  worst=Math.max(worst,breaks);worstUnanchored=Math.max(worstUnanchored,unanchored);events.push({priority:p,edges:count,miles,selectionBreaks:breaks,components,unanchoredComponents:unanchored,leafKinds:{...counts},examples:[...leafKinds].filter(([n,k])=>k==='selection-break').slice(0,5).map(([n])=>n)});
 }
 // Eligibility has a common monotone fade F(priority/cut): sorted priority
 // sweep enumerates every possible retained graph at all alpha cutoffs and
 // intermediate fade states, not merely a few rounded zoom levels.
 return{events,priorityEvents:events.length,worstSelectionBreaks:worst,worstUnanchoredComponents:worstUnanchored,fadeContract:'common monotone F(priority/cut); all event intervals, alpha 0/.02/.5/1',final:events.at(-1)};
}
function classify(records,m){const degree=new Map();for(const e of records.filter(r=>r.sourceArcID!==undefined))for(const n of e.nodes)degree.set(n,(degree.get(n)||0)+1);const anchors=new Map(),access=new Set(m.modeledAccessNodes);
 for(const e of records)for(const n of e.nodes){if(n.startsWith('zone-point:')||access.has(n))anchors.set(n,'modeled-access');else if(m.sourceDegree[n]===1)anchors.set(n,'source-terminal');else if((m.positiveDegree[n]||0)>(degree.get(n)||0))anchors.set(n,'export-coverage-gap');else if(m.positiveDegree[n]===1)anchors.set(n,'model-boundary');}
 return anchors;
}
function repair(edges,anchors){
 const adj=adjacency(edges),byID=new Map(edges.map(e=>[e.id,e])),priority=new Map(edges.map(e=>[e.id,e.priority])),selected=new Set(),degree=new Map(),leaves=new Set(),parent=new Map(),members=new Map(),anchored=new Map(),roots=new Set(),dependencies=[],deferred=[];
 function find(n){let r=n;while(parent.get(r)!==r)r=parent.get(r);while(n!==r){const v=parent.get(n);parent.set(n,r);n=v;}return r;}
 function addNode(n){if(parent.has(n))return;parent.set(n,n);members.set(n,new Set([n]));anchored.set(n,anchors.has(n));roots.add(n);}
 function select(e,p,reason){priority.set(e.id,Math.max(priority.get(e.id),p));if(selected.has(e.id))return;selected.add(e.id);for(const n of e.nodes){addNode(n);degree.set(n,(degree.get(n)||0)+1);if(degree.get(n)===1&&!anchors.has(n))leaves.add(n);else leaves.delete(n);}let a=find(e.nodes[0]),b=find(e.nodes[1]);if(a!==b){if(members.get(a).size<members.get(b).size)[a,b]=[b,a];parent.set(b,a);for(const n of members.get(b))members.get(a).add(n);members.delete(b);anchored.set(a,anchored.get(a)||anchored.get(b));roots.delete(b);}if(reason)dependencies.push({edge:e.id,priority:p,reason});}
 // Dijkstra searches ONLY omitted source-supported positive edges. A drawn
 // neighbor is a valid attachment; the starting retained edge cannot serve as
 // its own fake continuation. No coordinate joins, added values or facilities.
 function path(starts,target){
  const heap=[],dist=new Map(),prev=new Map();
  function push(x){heap.push(x);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=x[0])break;heap[i]=heap[p];i=p;}heap[i]=x;}
  function pop(){const x=heap[0],last=heap.pop();if(heap.length){let i=0;while(2*i+1<heap.length){let j=2*i+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;if(heap[j][0]>=last[0])break;heap[i]=heap[j];i=j;}heap[i]=last;}return x;}
  const startSet=new Set(starts);for(const n of starts){dist.set(n,0);push([0,n]);}
  while(heap.length){const[d,n]=pop();if(d!==dist.get(n))continue;if(!startSet.has(n)&&target(n)){const result=[];let q=n;while(prev.has(q)){const [v,e]=prev.get(q);result.push(e);q=v;}return result.reverse();}
   for(const e of adj.get(n)||[]){if(selected.has(e.id))continue;const q=e.nodes[0]===n?e.nodes[1]:e.nodes[0],nd=d+Math.max(e.miles,.000001);if(nd<(dist.get(q)??Infinity)){dist.set(q,nd);prev.set(q,[n,e]);push([nd,q]);}}
  }return null;
 }
 const sorted=edges.slice().sort((a,b)=>b.priority-a.priority||a.id-b.id);
 for(let i=0;i<sorted.length;){const p=sorted[i].priority;while(i<sorted.length&&sorted[i].priority===p)select(sorted[i++],p);
  const failed=new Set();while([...leaves].some(n=>!failed.has(n))){const n=[...leaves].find(n=>!failed.has(n)),route=path([n],q=>anchors.has(q)||(degree.get(q)||0)>0);if(!route){failed.add(n);deferred.push({node:n,priority:p,reason:'no-source-supported-positive-continuation'});continue;}for(const e of route)select(e,p,'exposed-endpoint-continuation');}
  for(const root of [...roots]){if(!roots.has(root)||anchored.get(root))continue;const route=path([...members.get(root)],q=>anchors.has(q)||(parent.has(q)&&anchored.get(find(q))));if(route){for(const e of route)select(e,p,'retained-component-model-anchor');}else deferred.push({component:[...members.get(root)].slice(0,10),priority:p,reason:'independent-positive-system-without-recorded-anchor'});}
 }
 return{edges:edges.map(e=>({...e,priority:priority.get(e.id)})),dependencies,deferred};
}
function override(hierarchy,segs,metadata){
 const rail=segs.filter(s=>s.m==='rail'&&s.t>0),groups=new Map();
 if(!metadata.gated)throw Error('Unaccepted rail topology metadata');
 for(const s of rail){const p=metadata.priorities[s.i];if(!Number.isFinite(p))throw Error('Incomplete rail priority metadata');if(!groups.has(p))groups.set(p,[]);groups.get(p).push(s);}
 const result=[];
 for(const [appear,ss] of groups){const adj=new Map(),end=(s,j)=>'rail|'+s.nodes[j];for(const s of ss)for(const j of [0,1]){const n=end(s,j);if(!adj.has(n))adj.set(n,[]);adj.get(n).push(s);}
  const used=new Set(),chains=[];
  function walk(s,n){const c=[];while(s&&!used.has(s)){used.add(s);const forward=end(s,0)===n;c.push({s,pts:forward?s.pts:s.pts.slice().reverse(),nodes:[n,end(s,forward?1:0)]});n=c.at(-1).nodes[1];s=adj.get(n).length===2?adj.get(n).find(x=>!used.has(x)):null;}if(c.length)chains.push(c);}
  for(const s of ss)for(const j of [0,1])if(adj.get(end(s,j)).length!==2&&!used.has(s))walk(s,end(s,j));for(const s of ss)if(!used.has(s))walk(s,end(s,0));
  result.push({key:'rail',id:'rail-priority:'+appear,ss,chains,adj,appear,max:Math.max(...ss.map(s=>s.t)),mi:ss.reduce((a,s)=>a+s.mi,0),major:appear===16e6});
 }
 let inserted=false;const combined=hierarchy.flatMap(r=>{if(r.ss[0].m!=='rail')return[r];if(inserted)return[];inserted=true;return result;});
 return inserted?combined:combined.concat(result);
}
return{audit,adjacency,classify,repair,override};})();
if(typeof module!=='undefined')module.exports=RailAdmission;
