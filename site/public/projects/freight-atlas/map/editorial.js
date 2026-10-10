/* Local editorial navigation; no storage, fetches or atlas data loads. */
(function(root){
'use strict';
const PAGES=new Set(['methods.html','about.html','guide.html','data.html']);
const IDS=new Set(['truck','rail','water','pipeline','airports','ports','metros','production-farm','production-minerals','production-oilgas','production-coal','production-manufacturing','national','display']);
function safeReturn(raw,base){
 const entry=new URL('index.html',base), directory=new URL('./',entry);
 // HTTP static hosts can redirect index.html to its directory and lose a fragment.
 // Return directly to that canonical entry, preserving the serialized state.
 const fallback=entry.protocol==='file:'?entry:directory;
 try{
  if(typeof raw!=='string'||raw.length>12000||/[\u0000-\u0020\\]/.test(raw))return fallback.href;
  const u=new URL(raw,base);
  if(!['https:','http:','file:'].includes(u.protocol)||u.origin!==entry.origin||u.username||u.password||![entry.pathname,directory.pathname].includes(u.pathname))return fallback.href;
  if(u.protocol!=='file:')u.pathname=directory.pathname;
  else u.pathname=entry.pathname;
  return u.href;
 }catch(_){return fallback.href;}
}
function docURL(page,id,mapURL,base){
 if(!PAGES.has(page))throw new TypeError('Unknown editorial page');
 if(id&&!IDS.has(id)&&!['coverage','worked-examples'].includes(id))throw new TypeError('Unknown metric');
 const u=new URL(page,base);u.searchParams.set('return',safeReturn(mapURL,base));if(id)u.hash=id;return u.href;
}
const api={safeReturn,docURL,metricIDs:Object.freeze(Array.from(IDS))};
if(typeof module==='object'&&module.exports)module.exports=api;
root.AtlasEditorial=api;
if(typeof document==='undefined')return;
const current=new URL(location.href), back=safeReturn(current.searchParams.get('return'),current.href);
document.querySelectorAll('[data-map-return]').forEach(a=>a.href=back);
document.querySelectorAll('[data-doc-link]').forEach(a=>{const u=new URL(a.getAttribute('href'),current.href);u.searchParams.set('return',back);a.href=u.href;});
function reveal(){
 let id;try{id=decodeURIComponent(location.hash.slice(1));}catch(_){return;}
 if(!IDS.has(id)&&!['coverage','worked-examples'].includes(id))return;
 const el=document.getElementById(id);if(!el)return;
 for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
 el.querySelectorAll('details').forEach(d=>d.open=true);
 // Native anchor resolution can precede disclosure/layout; align after opening.
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>el.scrollIntoView({block:'start'}));
}
reveal();root.addEventListener('hashchange',reveal);
})(typeof globalThis==='object'?globalThis:this);
