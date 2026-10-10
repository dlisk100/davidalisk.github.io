(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasBridge=api;})(typeof window==='object'?window:globalThis,()=>{
'use strict';
const SNAPSHOT='76c9df5fcdfc76cfe669b46b1dbb2c72905044eaf24fd5c9e1a04eac04bb7d99';
const finite=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
function project(point,proj){if(!finite(point)||Math.abs(point[0])>180||Math.abs(point[1])>=90)throw Error('Unsupported projection location');const p=proj(point);if(!finite(p))throw Error('Unsupported projection location');const back=proj.invert(p);if(!finite(back)||Math.abs(back[0]-point[0])>1e-6||Math.abs(back[1]-point[1])>1e-6)throw Error('Unsupported projection location');return p;}
function rawCamera(camera,proj,w,h,kh){const p=project(camera.center,proj),k=kh*camera.zoom;if(!Number.isFinite(k)||k<.8||k>60)throw Error('Unsupported zoom for this viewport');return{k,x:w/2-k*p[0],y:h/2-k*p[1]};}
function geoCamera(raw,proj,w,h,kh){const center=proj.invert([(w/2-raw.x)/raw.k,(h/2-raw.y)/raw.k]);project(center,proj);return{center,zoom:raw.k/kh};}
function frameCamera(camera,proj,w,h,kh){if(w>600)return camera;const raw=rawCamera(camera,proj,w,h,kh);raw.y+=h*.38-h/2;return geoCamera(raw,proj,w,h,kh);}
// Ground distance at the scale's own screen latitude; recomputed for pan as well as zoom.
function distanceScale(raw,proj,w,h,maxPixels=120){
 if(!raw||!Number.isFinite(raw.k)||raw.k<=0||![raw.x,raw.y,w,h,maxPixels].every(Number.isFinite)||maxPixels<=0)return null;
 const x=w-(w<=600?150:160),y=h-(w<=600?23:31),invert=px=>proj.invert([(px-raw.x)/raw.k,(y-raw.y)/raw.k]);
 const a=invert(x),b=invert(x+maxPixels);if(!finite(a)||!finite(b)||Math.abs(a[1])>=90||Math.abs(b[1])>=90)return null;
 const distance=p=>{const r=Math.PI/180,dlat=(p[1]-a[1])*r,dlon=(p[0]-a[0])*r,v=Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(p[1]*r)*Math.sin(dlon/2)**2;return 6371.0088*2*Math.asin(Math.min(1,Math.sqrt(v)));};
 const span=distance(b);if(!(span>0))return null;
 const power=10**Math.floor(Math.log10(span)),km=[5,2,1].map(n=>n*power).find(n=>n<=span)??power/2;
 let lo=0,hi=maxPixels;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(distance(invert(x+mid))<km)lo=mid;else hi=mid;}
 return{km,pixels:(lo+hi)/2,label:km.toLocaleString('en-US',{maximumSignificantDigits:3})+' km'};
}
function sourceID(s){if(!s||!['truck','rail','water','pipeline'].includes(s.m)||!Number.isSafeInteger(s.i)||s.i<0)return null;return s.m+'-snapshot:'+SNAPSHOT+':'+s.i;}
function resolveSource(id,segs){if(typeof id!=='string')return null;const found=segs.filter(s=>sourceID(s)===id||(s.m==='water'&&s.graph?.waterSourceID!=null&&'water:'+s.graph.waterSourceID===id)||(s.m==='pipeline'&&s.graph?.pipelineSourceID===id));return found.length===1?found[0]:null;}
function serializedURL(app,href){const u=new URL(href);if(u.pathname.endsWith('/'))u.pathname+='index.html';u.search='';u.hash=globalThis.AtlasExplore.serialize(app.getView());return u.href;}
// Source totals are independent of map visibility and local link throughput.
function nationalHeadline(balance,unit){
 const rows=['domestic','imports','exports'].map(k=>balance?.faf2024?.[k]),index=unit==='usd'?1:0;
 if(rows.some(r=>!Array.isArray(r)||!Number.isFinite(r[index])||r[index]<0))return null;
 const value=rows.reduce((n,r)=>n+r[index],0),text=unit==='usd'?'$'+(value/1e12).toFixed(1)+' trillion':(value/1e9).toFixed(1)+' billion tons';
 return{value,year:2024,text:text+' of freight · 2024'};
}
const STATE_NAMES={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
function regionLabel(raw){
 const rest=/^(?:Rest|Remainder) of (.+)$/.exec(raw);
 if(rest)return{name:'Rest of '+(STATE_NAMES[rest[1]]||rest[1]),priority:2};
 if(Object.values(STATE_NAMES).includes(raw))return{name:raw+' · statewide',priority:1};
 return{name:raw.replace(/ \((\w\w) Part\)/i,'').replace(/ [A-Z]{2}(-[A-Z]{2})*$/,'').replace(/ CFS Area/,''),priority:0};
}
function lineQuantity(value,unit){
 const usd=unit==='usd',suffix=usd?'':' tons',prefix=usd?'$':'';
 for(const [cut,label]of [[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'k']])if(value>=cut)return prefix+(value/cut).toFixed(value>=cut*10?0:1).replace(/\.0$/,'')+label+suffix;
 return prefix+Math.round(value).toLocaleString('en-US')+suffix;
}
function chromeBounds(doc){
 const elements=['title','tools','legend','layers-panel','atlas-menu','atlas-docs','zbar'].map(id=>doc.getElementById(id));elements.push(doc.querySelector?.('#lab .insets'));
 return elements.flatMap(el=>{const r=el?.getBoundingClientRect();return r&&r.width>0&&r.height>0?[[r.left-6,r.top-6,r.right+6,r.bottom+6]]:[];});
}
let chromeMounted=false;
function compactChrome(){
 if(chromeMounted)return;
 const legend=document.getElementById('legend'),layers=document.getElementById('layers-panel'),title=document.getElementById('title');
 if(!legend||!layers||!title||typeof matchMedia!=='function')return;
 chromeMounted=true;const phone=matchMedia('(max-width:600px)');
 const layout=()=>{if(phone.matches)layers.append(legend);else title.after(legend);};layout();phone.addEventListener('change',layout);
 const hint=document.getElementById('map-hint'),wrap=document.getElementById('wrap');
 if(!hint||!wrap)return;
 let shown=false,timer;
 const dismiss=()=>{hint.hidden=true;clearTimeout(timer);wrap.removeEventListener('click',dismiss);};
 const show=()=>{if(shown||!document.getElementById('startup-loading').hidden)return;shown=true;hint.hidden=false;wrap.addEventListener('click',dismiss,{once:true});timer=setTimeout(dismiss,6000);observer.disconnect();};
 const observer=new MutationObserver(show);observer.observe(document.getElementById('startup-loading'),{attributes:true,attributeFilter:['hidden']});show();
}
if(typeof document==='object')document.addEventListener('DOMContentLoaded',compactChrome,{once:true});
let booted=false;
async function boot(app){
 if(booted)return;booted=true;compactChrome();
 const status=document.getElementById('atlas-link-status'),say=r=>{status.hidden=r.status==='absent';status.textContent=r.message||r.status;status.dataset.status=r.status;};
 document.addEventListener('click',e=>{const a=e.target.closest?.('a[data-doc],a[data-method]');if(!a)return;try{a.href=globalThis.AtlasEditorial.docURL(a.dataset.doc||'methods.html',a.dataset.method||null,serializedURL(app,location.href),location.href);}catch{try{const fallback=new URL(a.href,location.href),base=new URL('.',location.href);if(fallback.origin!==base.origin||fallback.username||fallback.password||!['methods.html','about.html','guide.html','data.html'].some(n=>fallback.pathname===base.pathname+n))throw Error('Unsafe reference');a.href=fallback.href;}catch{e.preventDefault();say({status:'unavailable',message:'Reference unavailable.'});}}});
 try{
  const response=await fetch('explore-catalog.json');if(!response.ok)throw Error('Explore data unavailable');const catalog=await response.json();
  const mounted=globalThis.AtlasExplore.mount({container:document.getElementById('explore-host'),places:catalog.places,getView:app.getView,cameraForPlace:camera=>app.framePlace(camera),applyView:app.applyView,select:async d=>{const ok=app.selectPlace(d);if(ok)document.getElementById('atlas-menu').open=false;return{status:ok?'ok':'unavailable'};},clearSelection:app.closeCard,reset:app.reset});
  globalThis.ATLAS_EXPLORE=mounted;
  const initial=globalThis.AtlasExplore.parse(location.hash);
  if(initial.status==='ok'){const result=await mounted.controller.restore(initial.view);say(result);mounted.controls.status.textContent=result.message;}
  else if(initial.status==='invalid')say(initial);
 }catch(e){say({status:'unavailable',message:'Search is unavailable. You can still explore the map. Reload to try again.'});}
}
return{SNAPSHOT,project,rawCamera,geoCamera,frameCamera,distanceScale,sourceID,resolveSource,serializedURL,nationalHeadline,regionLabel,lineQuantity,chromeBounds,compactChrome,boot};
});
