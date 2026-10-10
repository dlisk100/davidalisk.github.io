window.PUBLIC_ROOT_BUNDLE=true;
'use strict';
/* FRB1 retains original gzip members: only the request envelope changes. */
const NumericBundle=(()=>{
 async function unpack(input,inflate,pause=async()=>{}){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(bytes.length<8||new TextDecoder().decode(bytes.subarray(0,4))!=='FRB1')throw Error('Invalid numeric bundle magic');
  const length=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(4,true);
  if(length>1024*1024||8+length>bytes.length)throw Error('Invalid numeric bundle header');
  const header=JSON.parse(new TextDecoder().decode(bytes.subarray(8,8+length))),manifest=header.manifest,buffers={};
  const keys=Object.keys(manifest.buffers);if(header.entries.length!==keys.length)throw Error('Numeric bundle entry count mismatch');
  let at=8+length;
  for(let i=0;i<keys.length;i++){
   const entry=header.entries[i],key=keys[i],size=entry.compressedBytes;
   if(entry.name!==key||!Number.isSafeInteger(size)||size<=0||at+size>bytes.length)throw Error('Invalid numeric bundle entry '+key);
   const b=await inflate(bytes.subarray(at,at+size));
   if(!(b instanceof ArrayBuffer)||b.byteLength!==manifest.buffers[key].bytes)throw Error('Numeric buffer length mismatch '+key);
   buffers[key]=b;at+=size;await pause();
  }
  if(at!==bytes.length)throw Error('Trailing numeric bundle bytes');
  return{manifest,buffers};
 }
 return{unpack};
})();
if(typeof module!=='undefined')module.exports=NumericBundle;
if(typeof window!=='undefined')window.ReplacementReady=(async()=>{
 const meta=await RoadGzip.read('../directory.json.gz');let buffers;
 // build_public.py sets this only in its output loader, never source runtime.
 // The parent can A/B the original source layout without a failed bundle probe.
 if(window.PUBLIC_ROOT_BUNDLE){
  const bytes=await RoadGzip.bytes('../numeric.bundle',false),state=StartupPreparation.state;
  const result=await NumericBundle.unpack(bytes,async compressed=>{if(state.controller.signal.aborted)throw Error('Startup cancelled');return new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();},StartupPreparation.yieldTask);
  if(state.controller.signal.aborted)throw Error('Startup cancelled');
  buffers=result.buffers;
 }else{
  const response=await fetch('../manifest.json',{signal:StartupPreparation.state.controller.signal});if(!response.ok)throw Error('manifest HTTP '+response.status);
  const manifest=await response.json();buffers={};StartupPreparation.state.resource();for(const k of Object.keys(manifest.buffers))buffers[k]=await RoadGzip.bytes('../'+k+'.bin.gz');
 }
 window.REPLACEMENT={meta,buffers};
})();
