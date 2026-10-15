const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const acres=v=>Math.round(v).toLocaleString('en-US');
export function surfaceCamera(b,width,height,cardTop){
 const phone=width<600,top=phone?165:85,bottom=phone?Math.max(top+90,cardTop-24):height-85;
 const s=Math.min((width-(phone?40:410))/(b[2]-b[0]+.08),(bottom-top)/(b[3]-b[1]+.08));
 return {s,x:(b[0]+b[2])/2-(phone?0:175/s),y:(b[1]+b[3])/2+(height/2-(top+bottom)/2)/s};
}
export const shorelineFor=(geometry,mode)=>geometry.shorelines[mode]||null;
export function surfaceCard(facts,geometry,mode){
 const f=mode==='latest'?facts.current:facts.monthly[mode],s=shorelineFor(geometry,mode),full=facts.fullPool;
 return `<h3>Water surface · acres</h3><div class="account-pair"><div><h3>${mode==='latest'?'Current':'Month-end'}</h3><strong>${f?acres(f.value):'—'}</strong><p class="date">${f?date(f.observedAt):'No area reading for this month'}</p></div><div><h3>Full pool</h3><strong>${acres(full.value)}</strong><p class="date">${full.elevationFeet.toLocaleString('en-US')} ft · table ${esc(full.sourceDate)}</p></div></div><p class="date">Reclamation table at published elevation <a href="${esc(full.sourceUrl)}" target="_blank" rel="noopener">↗</a></p><p class="date">${s?`Satellite check frame · Sentinel-2 · ${date(s.acquiredAt)}`:'No qualified shoreline for this month'}</p><button id="fit-surface">Fit shoreline</button><details class="context-note"><summary>Shoreline method & reference</summary><p class="date">${esc(geometry.fullPool.label)}. ${esc(geometry.fullPool.method||'')}</p><p class="date">${s?esc(s.method||'MNDWI water mask')+' Same-date area difference: '+s.crossCheck.percentDifference+'%.':''}</p><p class="date">Contains modified Copernicus Sentinel data 2026</p></details>`;
}
let facts;
const cache=new Map();
async function get(url){const r=await fetch(url);if(!r.ok)throw Error('Surface evidence unavailable');return r.json()}
export async function loadSurface(id){facts??=get('data/reservoir-surface.json').catch(e=>{facts=null;throw e});const f=(await facts).reservoirs[id];if(!f)return null;if(!cache.has(id))cache.set(id,get(f.geometryUrl).catch(e=>{cache.delete(id);throw e}));return {facts:f,geometry:await cache.get(id)}}
