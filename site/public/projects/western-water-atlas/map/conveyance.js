// M7 conveyance structures: plain-language summary of tunnels, siphons, pipelines and schematic links.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const km=c=>{let n=0;for(let i=1;i<c.length;i++){const a=c[i-1],b=c[i];n+=Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])/2*Math.PI/180),a[1]-b[1])*111}return n};
const label={tunnel:'tunnel',siphon:'inverted siphon or culvert',pipeline:'pressure pipeline'};
export function conveyanceSummary(features){
 const s=features.filter(f=>f.structure);if(!s.length)return '';
 const by={};for(const f of s){const t=f.structure.type;if(t==='open')continue;(by[t]??=[]).push(f)}
 const rows=Object.entries(label).filter(([t])=>by[t]).map(([t,l])=>{const fs=by[t],len=fs.reduce((n,f)=>n+km(f.geometry.coordinates),0);return `<li><i class="conv-${t}"></i>${fs.length} ${esc(l)}${fs.length>1?' segments':''} · about ${len<1?len.toFixed(1):Math.round(len)} km mapped</li>`});
 const named=[...new Set(s.map(f=>f.structure.name).filter(Boolean))].map(n=>`<li>${esc(n)}</li>`);
 const sch=by.schematic||[];
 const reasons=[...new Set(sch.map(f=>f.structure.source))];
 return `<details class="conveyance" id="conveyance-detail"><summary>Tunnels, siphons & gaps</summary><p>Solid = open canal. Dashed = water underground or in pipe. Dotted = schematic link.</p><ul>${rows.join('')}</ul>${named.length?`<p class="date">Named structures</p><ul>${named.join('')}</ul>`:''}${sch.length?`<p class="date">${sch.length} short schematic link${sch.length>1?'s':''} (longest ${Math.max(...sch.map(f=>km(f.geometry.coordinates))).toFixed(1)} km): ${reasons.map(esc).join(' ')}</p>`:''}<p class="date">Geometry: OpenStreetMap contributors (ODbL) and USGS NHD, Oct 2026. Underground type is the source tag, not an engineering survey.</p></details>`;
}
