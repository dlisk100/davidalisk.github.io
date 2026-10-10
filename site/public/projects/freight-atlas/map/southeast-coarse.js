/* Bounded experiment: display geometry only; identities, facts and admission remain independent. */
'use strict';
window.SoutheastCoarse=(()=>{
 let data=null,rows=null,prepared=null;const contexts=new Map();
 function install(d){data=d;rows=new Map(d.rows.map(r=>[r[0],r]));contexts.clear();}
 function prepare(map){prepared=map;rows=null;data.rows=null;data.shapes=null;}
 function use(proj,k){return !!data&&data.tolerance*proj.scale()*k<=2;}
 function has(i){return !!(prepared||rows)?.has(i);}
 function shape(i){return prepared?.get(i)?.ll||data?.shapes?.[i];}
 function prime(owner,view,cut,proj,k,selected=null){if(!prepared&&!use(proj,k))return false;
  const need=owner.needed(view,cut,proj,selected);
  if(prepared){for(const g of need.groups){let complete=true;for(let j=owner.memberOffsets[g];j<owner.memberOffsets[g+1];j++){const i=owner.members[j];if(!owner.segs.has(i)&&!prepared.has(i)){complete=false;break;}}if(!complete)continue;for(let j=owner.memberOffsets[g];j<owner.memberOffsets[g+1];j++){const i=owner.members[j];if(!owner.segs.has(i)){const base=prepared.get(i);owner.segs.set(i,{...base,baseRoadLL:base.ll,baseRoadPts:base.pts,roadLOD:0});}}owner.materialize(g);}}
  else {const missing=data.rows.filter(r=>need.ids.has(r[0])&&!owner.segs.has(r[0]));if(missing.length)owner.install(missing,proj);}
  for(const g of need.groups){let complete=true;for(let j=owner.memberOffsets[g];j<owner.memberOffsets[g+1];j++)if(!owner.segs.has(owner.members[j])){complete=false;break;}if(complete)owner.materialize(g);}
  return true;
 }
 function context(key,proj){const d=data?.context[key];if(!d)return null;
  if(!contexts.has(key))contexts.set(key,{...d,parts:d.parts.map(part=>({...part,pts:part.ll.map(proj)}))});return contexts.get(key);
 }
 function paint(ctx,key,proj,k){const c=context(key,proj);if(!c)return false;
  ctx.save();ctx.beginPath();for(const part of c.parts)part.pts.forEach((p,j)=>j?ctx.lineTo(...p):ctx.moveTo(...p));
  ctx.strokeStyle='#82684c';ctx.lineWidth=2.2/k;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([5/k,3/k]);ctx.stroke();ctx.restore();return true;
 }
 function dispose(){data=null;rows=null;prepared?.clear();prepared=null;contexts.clear();}
 return{install,prepare,use,has,shape,prime,context,paint,dispose,status:()=>({ready:!!prepared,rows:(prepared||rows)?.size||0,contextKeys:Object.keys(data?.context||{}),errorBudgetCSS:2})};
})();
