/* Exact conditional admission. Stable summaries are certified by equality of
 * ALL reference greedy pairing decisions, not a sampled viewport assumption.
 * No rounding; every ambiguous-node tangent keeps its full operand sequence.
 */
'use strict';
const Conditional=(()=>{
function compile(rows,source){
 const modal=new Map(),program=[],operands=[],lookup=new Map();
 for(const s of rows)if(s.t>0){if(!s.nodes)throw Error('Coordinate-derived topology requires explicit recipe');if(!modal.has(s.m))modal.set(s.m,new Map());const adj=modal.get(s.m);for(let j=0;j<2;j++){const n=s.m+'|'+s.nodes[j];if(!adj.has(n))adj.set(n,[]);if(!adj.get(n).includes(s))adj.get(n).push(s);}}
 let fixedNodes=0,terminalNodes=0,maxDegree=0,predicates=0;
 for(const adj of modal.values())for(const [n,ls]of adj){maxDegree=Math.max(maxDegree,ls.length);if(ls.length<3){if(ls.length===2)fixedNodes++;else terminalNodes++;continue;}const slots=[];for(const s of ls){const forward=s.m+'|'+s.nodes[0]===n,key=s.i+'|'+Number(forward);if(!lookup.has(key)){lookup.set(key,operands.length);operands.push(forward?s.ll:s.ll.slice().reverse());}slots.push([s.i,lookup.get(key)]);}predicates+=ls.length*(ls.length-1)/2;program.push([n,slots]);}
 return {version:1,program,operands,source,counts:{sources:rows.length,fixedNodes,terminalNodes,branchNodes:program.length,maxDegree,predicates,operandVertices:operands.reduce((n,p)=>n+p.length,0)}};
}
function decisions(recipe,proj){
 const vectors=recipe.operands.map(ll=>{const p=ll.map(proj),a=p[0],b=p.find(q=>Math.hypot(q[0]-a[0],q[1]-a[1])>1e-7)||a,d=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return[(b[0]-a[0])/d,(b[1]-a[1])/d];});
 const pairs=recipe.program.map(([n,ls])=>{const options=[];for(let i=0;i<ls.length;i++)for(let j=i+1;j<ls.length;j++){const a=vectors[ls[i][1]],b=vectors[ls[j][1]],dot=a[0]*b[0]+a[1]*b[1];if(dot<=-.5)options.push({a:ls[i][0],b:ls[j][0],dot});}const used=new Set(),chosen=[];for(const p of options.sort((a,b)=>a.dot-b.dot)){if(used.has(p.a)||used.has(p.b))continue;used.add(p.a);used.add(p.b);chosen.push([p.a,p.b]);}return chosen;});
 return {pairs,vectors,signature:JSON.stringify(pairs)};
}
function replay(recipe,rows,proj,execution){
 const start='   for(const [n,ls] of adj){const options=[];',a=recipe.source.indexOf(start),b=recipe.source.indexOf('\n   const used=new Set();',a);
 if(a<0||b<0)throw Error('Reference conditional seam changed');
 const src=recipe.source.slice(0,a)+`   for(const [n,ls]of adj){if(ls.length===2){pairs.set(n+'|'+ls[0].i,ls[1]);pairs.set(n+'|'+ls[1].i,ls[0]);}else if(ls.length>2){const byID=new Map(ls.map(s=>[s.i,s]));for(const [a,b]of DECISIONS.get(n)){pairs.set(n+'|'+a,byID.get(b));pairs.set(n+'|'+b,byID.get(a));}}}`+recipe.source.slice(b);
 const mapping=new Map(recipe.program.map(([n],i)=>[n,execution.pairs[i]]));
 return new Function('DECISIONS','module',src+'\nreturn RouteRender;')(mapping,undefined).hierarchy(rows.map(s=>({...s,pts:s.ll.map(proj)})));
}
return{compile,decisions,replay};})();
if(typeof module!=='undefined')module.exports=Conditional;
