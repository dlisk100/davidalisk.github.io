/* Before proto.js: actual national coarse decode/projection and complete dependency checks. */
'use strict';
window.PrepareStartup=async function(){
 const state=StartupPreparation.state,asset=window.STARTUP_ASSET;
 if(!asset){state.fail('National coarse asset unavailable');return;}
 const plate={type:'FeatureCollection',features:A.states.map(s=>({type:'Feature',geometry:s.g}))};
 const proj=d3.geoConicEqualArea().parallels([29.5,45.5]).rotate([96,0]).fitExtent([[40,110],[innerWidth-40,innerHeight-50]],plate);
 state.value={...state.value,phase:'Preparing roads',done:0,total:null};state.publish();await StartupPreparation.yieldTask();
 const owner=new Owners.Engine(REPLACEMENT.meta,REPLACEMENT.buffers,RouteRender),decision=await StartupPreparation.decisions(REPLACEMENT.meta.program,proj,{signal:state.controller.signal,progress:(done,total)=>{state.value.detail=`${done.toLocaleString()} / ${total.toLocaleString()} admission jobs completed`;state.publish();}});
 if(owner.admit(decision.signature)<0)owner.genericAdmission(decision,REPLACEMENT.meta.program);
 let viewportIndex;
 try{viewportIndex=await StartupPreparation.index(owner,{signal:state.controller.signal,progress:(done,total)=>{state.value.detail=`${done.toLocaleString()} / ${total.toLocaleString()} viewport-index sources prepared`;state.publish();}});}catch(e){owner.dispose();state.fail(e);if(!state.controller.signal.aborted)SoutheastCoarse.install({...asset,rows:[],shapes:null});window.STARTUP_ASSET=null;if(state.controller.signal.aborted)throw e;return;}
 owner.needed=viewportIndex.needed;const disposeOwner=owner.dispose.bind(owner);owner.dispose=()=>{viewportIndex.dispose();disposeOwner();};
 const groups=owner.meta.branches[owner.branch].order.filter(g=>owner.facts[owner.members[owner.memberOffsets[g]]*owner.meta.stride]===3&&RouteRender.detailAlpha({appear:owner.appear[g]},16e6/asset.coverageZoom)>.02);
 let vertices=0,estimate=0;
 state.value={...state.value,phase:'Preparing roads',done:0,total:asset.rows.length*2+groups.length};state.publish();
 for(let i=0;i<asset.rows.length;){if(state.controller.signal.aborted)throw Error('Preparation cancelled');const end=Math.min(i+128,asset.rows.length);for(;i<end;i++){const row=asset.rows[i];vertices+=row[1].length/2;estimate+=512+row[1].length*48+JSON.stringify(row[2]).length*2;}state.value.done=i;state.publish();await StartupPreparation.yieldTask();}
 window.STARTUP_PROFILE={sources:asset.rows.length,vertices,estimatedPreparedBytes:estimate,estimateBudgetBytes:96*1024*1024,coverageZoom:asset.coverageZoom,groupCount:groups.length,viewportIndex:viewportIndex.status(),nativeNationalMeshes:0};
 if(asset.rows.length>75000||vertices>200000||estimate>STARTUP_PROFILE.estimateBudgetBytes){owner.dispose();SoutheastCoarse.install({...asset,rows:[],shapes:null});state.fail('Prepared geometry exceeds declared startup residency guard');window.STARTUP_ASSET=null;return;}
 // Retire redundant serialized geographic shapes before decoded ownership is constructed.
 asset.shapes=null;
 try{
  const t=performance.now(),prepared=await state.prepare(owner,asset,proj,[],{completed:asset.rows.length,extraJobs:groups.length});
  await state.validate(owner,groups,prepared,{reserved:true});
  SoutheastCoarse.install({...asset,rows:[],shapes:null});SoutheastCoarse.prepare(prepared);
  window.STARTUP_OWNER=owner;window.STARTUP_PROJECTION=proj;window.STARTUP_ASSET=null;asset.rows=null;
  STARTUP_PROFILE.prepareMs=performance.now()-t;
 }catch(e){owner.dispose();SoutheastCoarse.dispose();if(!state.controller.signal.aborted)SoutheastCoarse.install({...asset,rows:[],shapes:null});state.fail(e);window.STARTUP_ASSET=null;if(state.controller.signal.aborted)throw e;}
};
