(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.InfoLayers=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const labels={truck:'Truck',rail:'Rail',water:'Barge & ship',pipeline:'Pipelines',airports:'Airports',ports:'Ports',metros:'Freight regions',regions:'Producing areas'},keys=Object.keys(labels);
 const key=h=>h?.type==='seg'?h.s.m:({airport:'airports',port:'ports',city:'metros',reg:'regions'}[h?.type]);
 class State{constructor(){this.values=Object.fromEntries(keys.map(k=>[k,true]));}set(k,on){if(!keys.includes(k))throw Error('Unknown layer '+k);this.values[k]=!!on;}on(k){return this.values[k]===true;}visible(h){return this.on(key(h));}none(){return keys.every(k=>!this.on(k));}snapshot(){return{...this.values};}}
 function controls(state){return keys.map(k=>`<label><input type="checkbox" data-layer="${k}" ${state.on(k)?'checked':''}>${labels[k]}</label>`).join('');}
 return{State,keys,key,labels,controls};
});
