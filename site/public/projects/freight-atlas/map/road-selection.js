/* Selection-only mesh partition. Admission and sample widths are untouched. */
'use strict';
const RoadSelection=(()=>{
 function runs(samples,key,keyOf){const out=[];let run=[];const flush=()=>{if(run.length)out.push({samples:run});run=[];};
  for(let j=0;j<samples.length;j++){const q=samples[j];if(keyOf(q.s)!==key){flush();continue;}
   // At a source boundary the original sampler omits the duplicate start.
   // The first interval belongs to q.s; retain its exact existing endpoint
   // width/position, but label that boundary sample with the interval's source.
   if(!run.length&&j){const a=samples[j-1];run.push({...a,s:q.s});}run.push(q);
  }flush();return out;
 }
 return {runs};
})();
if(typeof module!=='undefined')module.exports=RoadSelection;
