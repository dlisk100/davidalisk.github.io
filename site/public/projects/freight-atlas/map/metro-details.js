/* Card-only retained FAF OD. No scene, assignment or camera dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MetroDetails=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const names={'1':'Truck','2':'Rail','3':'Water','6':'Pipeline'};
 const empty=()=>({inbound:[0,0],outbound:[0,0],within:[0,0]});
 const add=(v,t,u)=>{v[0]+=t;v[1]+=u;};
 function aggregate(faf){const zones={};const zone=id=>zones[id]||(zones[id]={totals:empty(),modes:{},partners:{}});
  for(const [mode,rows]of Object.entries(faf.od))for(const [o,d,trade,t,u]of rows){
   const a=zone(o),b=zone(d),am=a.modes[mode]||(a.modes[mode]=empty()),bm=b.modes[mode]||(b.modes[mode]=empty());
   if(o===d){add(a.totals.within,t,u);add(am.within,t,u);continue;}
   add(a.totals.outbound,t,u);add(am.outbound,t,u);add(b.totals.inbound,t,u);add(bm.inbound,t,u);
   const ap=a.partners[d]||(a.partners[d]=empty()),bp=b.partners[o]||(b.partners[o]=empty());add(ap.outbound,t,u);add(bp.inbound,t,u);
  }return zones;
 }
 function card(z,d,unit){const i=unit==='usd'?1:0,off=i*3,originating=z.o.slice(off,off+3).reduce((a,b)=>a+b,0),within=z.w.slice(off,off+3).reduce((a,b)=>a+b,0),outbound=originating-within;
  if(!d)return{originating,within,outbound,inbound:null,modes:[],partners:[]};
  return{originating,within,outbound,inbound:d.totals.inbound[i],inboundScope:'Retained truck, rail, water and pipeline OD only',
   modes:Object.entries(d.modes).map(([id,v])=>({id,name:names[id]||id,inbound:v.inbound[i],outbound:v.outbound[i],within:v.within[i]})),
   partners:Object.entries(d.partners).map(([id,v])=>({id,inbound:v.inbound[i],outbound:v.outbound[i],value:v.inbound[i]+v.outbound[i]})).sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id)),
   remainder:{outbound:outbound-d.totals.outbound[i],within:within-d.totals.within[i]}};
 }
 let cached=null,pending=null;
 function load(){if(cached)return Promise.resolve(cached);if(pending)return pending;
  pending=fetch('metro-details.json.gz').then(r=>{if(!r.ok)throw Error('Metro detail HTTP '+r.status);return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();}).then(d=>cached=d).catch(e=>{pending=null;throw e;});return pending;
 }
 return{aggregate,card,load,names};
});
