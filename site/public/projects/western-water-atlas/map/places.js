// Census population (2020), not editorial guesses. Unknown-population legacy records retain their old admission rule.
// Population cutoff by zoom. Phones get much stricter cutoffs (a 393 px screen can't hold a gazetteer).
// Towns that have a water-source card (waterGeoids) show from zoom 2 and sort first, because they're worth tapping.
export function placesForZoom(places,zoom,opt={}){const phone=!!opt.phone,water=opt.waterGeoids||new Set();
 const cutoff=phone?(zoom>=12?25000:zoom>=8?75000:zoom>=4?200000:500000):(zoom>=8?10000:zoom>=4?25000:250000);const seen=new Set();
 return places.filter(p=>{const key=p.geoid||p.name+'|'+p.state;if(seen.has(key))return false;seen.add(key);if(water.has(p.geoid))return zoom>=(phone?2.5:2);return Number.isFinite(p.population)?p.population>=cutoff:zoom>=(p.priority===1?(phone?4:2):p.priority===2?(phone?8:4):(phone?14:8))})
  .sort((a,b)=>(water.has(b.geoid)?1:0)-(water.has(a.geoid)?1:0)||(b.population||0)-(a.population||0)||(a.priority||0)-(b.priority||0)||a.name.localeCompare(b.name))}
// Census urban-area names list every principal city ("Riverside--San Bernardino, CA"); the map shows the first one.
export function shortUrbanName(n){return String(n||'').replace(/,\s*[A-Z]{2}(?:[-–][A-Z]{2})*$/,'').split('--')[0].trim()}
export function placeLabel(place,point,label,measure){const width=measure(place.name);return [[4,0],[8,-18],[8,20],[8,38],[-width-8,0],[-width-8,-18],[-width-8,20]].some(([dx,dy])=>label(place.name,point[0]+dx,point[1]+dy))}
export async function loadPlaces(){const r=await fetch('data/places.json');if(!r.ok)throw Error('Place labels unavailable');const d=await r.json(),groups=[];let i=0;await Promise.all([0,1].map(async()=>{while(i<(d.urbanChunks||[]).length){const c=d.urbanChunks[i++],r=await fetch(c.url);if(!r.ok)throw Error('Urban footprints unavailable');groups.push(...(await r.json()).urbanAreas)}}));d.urbanAreas=groups;return d}
