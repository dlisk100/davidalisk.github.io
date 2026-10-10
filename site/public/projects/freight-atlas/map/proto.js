// Continuous-zoom feel prototype (goods atlas 2025). No levels: the draw threshold falls smoothly with zoom (halves per
// zoom doubling), so finer flows fade in like a printed atlas plate at a larger scale. Click = highlight in place; the
// camera never moves unless you press "Zoom to". Producing regions are soft hatched areas under the flows.
'use strict';
const wrap = document.getElementById('wrap'), svg = d3.select('#map'), lab = d3.select('#lab'), cv = document.getElementById('net');
const ctx = cv.getContext('2d'), DPR = Math.min(2, devicePixelRatio || 1);
let W = innerWidth, H = innerHeight;
const LAYERS=new InfoLayers.State();
const MODES = ['pipeline', 'water', 'rail', 'truck'];
const MCOL = { crude: 'rgb(150,78,72)', products: 'rgb(196,118,110)', gasngl: 'rgb(214,150,156)', water: 'rgb(56,104,150)', rail: '#3b342c', truck: 'rgb(150,100,62)' };
const MNAME = { pipeline: 'Pipeline', water: 'Barge & ship', rail: 'Rail', truck: 'Truck' };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tF = t => t < 1e3 ? Math.round(t) + ' t' : t >= 1e9 ? (t / 1e9).toFixed(1) + ' B t' : t >= 1e6 ? (t / 1e6).toFixed(t >= 1e7 ? 0 : 1) + ' M t' : Math.round(t / 1e3) + ' k t';
const uF = u => u >= 1e12 ? '$' + (u / 1e12).toFixed(1) + ' T' : u >= 1e9 ? '$' + (u / 1e9).toFixed(u >= 1e10 ? 0 : 1) + ' B' : '$' + Math.round(u / 1e6) + ' M';
const EST = ' <span class="est">est.</span>';

// ---------------------------------------------------------------- projection + base plate (SVG, transformed)
const L48 = { type: 'FeatureCollection', features: A.states.map(s => ({ type: 'Feature', geometry: s.g })) };
const proj = window.STARTUP_PROJECTION || d3.geoConicEqualArea().parallels([29.5, 45.5]).rotate([96, 0]);
if(!window.STARTUP_PROJECTION)proj.fitExtent([[40, 110], [W - 40, H - 50]], L48);
const path = d3.geoPath(proj), P = ll => proj(ll);
svg.attr('width', W).attr('height', H);
const zg = svg.append('g');
zg.append('rect').attr('x', -9000).attr('y', -9000).attr('width', 20000).attr('height', 20000).attr('fill', '#dfe3dc');
zg.append('g').selectAll(null).data(A.neighbors).join('path').attr('d', d => path(d)).attr('fill', '#ece5d0').attr('stroke', '#8c9a9c').attr('stroke-width', 0.5).attr('vector-effect', 'non-scaling-stroke');
zg.append('g').selectAll(null).data(A.states).join('path').attr('d', d => path(d.g)).attr('fill', '#f8f3e4').attr('stroke', '#c2b597').attr('stroke-width', 0.7).attr('vector-effect', 'non-scaling-stroke');
zg.append('path').attr('d', path(L48)).attr('fill', 'none').attr('stroke', '#7f8e90').attr('stroke-width', 1).attr('vector-effect', 'non-scaling-stroke');
zg.append('g').selectAll(null).data(A.lakes).join('path').attr('d', d => path(d)).attr('fill', '#dfe3dc').attr('stroke', '#8c9a9c').attr('stroke-width', 0.5).attr('vector-effect', 'non-scaling-stroke');

// ---------------------------------------------------------------- data
function decode(c, p) { const f = 10 ** p, out = []; let x = 0, y = 0; for (let i = 0; i < c.length; i += 2) { x += c[i]; y += c[i + 1]; out.push([x / f, y / f]); } return out; }
const OWNER = window.STARTUP_OWNER || new Owners.Engine(REPLACEMENT.meta,REPLACEMENT.buffers,RouteRender);
if(!window.STARTUP_OWNER){const decision=Conditional.decisions(REPLACEMENT.meta.program,proj);
if(OWNER.admit(decision.signature)<0)OWNER.genericAdmission(decision,REPLACEMENT.meta.program);}
window.STARTUP_OWNER=null;window.STARTUP_PROJECTION=null;
REPLACEMENT.meta.program=null;REPLACEMENT.buffers=null;
let SEGS=[],DISPLAY=[],INHERITED_DISPLAY=[];
function syncOwners(){SEGS=[...OWNER.segs.values()].sort((a,b)=>a.i-b.i);DISPLAY=[...OWNER.groups.values()];for(const s of SEGS)s.col=s.m==='pipeline'?MCOL[s.cls]||MCOL.gasngl:MCOL[s.m];}
if(window.RegionFitFinish)window.RegionFitFinish.apply(PZ);
const REG = PZ.regions.map(r => { const p2 = new Path2D(); const rings = r.rings.map(c => decode(c, r.precision ?? (r.tier ? 3 : 2)).map(P)); rings.forEach(rg => { rg.forEach((q, j) => j ? p2.lineTo(q[0], q[1]) : p2.moveTo(q[0], q[1])); p2.closePath(); }); return Object.assign({}, r, { p2, rings, xy: P(r.c) }); });
const RBY = new Map(REG.map(r => [r.id, r]));
const SHORT = { cacoast: 'Salinas & Imperial produce', highplains: 'High Plains feedlots', nchogs: 'NC hogs & poultry', flcitrus: 'Florida citrus & cane', gapoultry: 'Georgia poultry', nvgold: 'Nevada gold', azcopper: 'Arizona copper', utcopper: 'Bingham copper', flphosphate: 'Bone Valley phosphate', gulf: 'Gulf petrochemicals', autos: 'Auto corridor', njpharma: 'NJ chemicals & pharma', siliconvalley: 'Silicon Valley', centralvalley: 'Central Valley', appalachia: 'Marcellus–Utica' };
// city label = the region's namesake county point (San Francisco County for the SF region), else its biggest-GDP point;
// the freight anchor (heaviest point, e.g. Santa Clara) is not where readers expect the name
function cityPt(z, n) { const tt = PZ.term.filter(t => t[0] === z.z); if (!tt.length) return z.ll; const w = n.split(/[-\/ ]/)[0];
  const m = tt.find(t => t[1].replace(/ (County|Parish|city)$/, '') === n) || tt.find(t => t[1].startsWith(n + ' ')) || tt.find(t => t[1].startsWith(w + ' ') && w.length > 4); const t = m || tt.reduce((a, b) => b[5] > a[5] ? b : a); return [t[2], t[3]]; }
const seen = new Set();
const CITY = PZ.zones.filter(z => !['020', '151', '159'].includes(z.z)).map(z => { const area = AtlasBridge.regionLabel(z.n), n = area.name; return { z, n, areaPriority: area.priority, v: z.o[0] + z.o[2], xy: P(area.priority ? z.ll : cityPt(z, n)) }; })
  .sort((a, b) => a.areaPriority - b.areaPriority || b.v - a.v).filter(c => !seen.has(c.n) && seen.add(c.n));
const AIRPORTS = A.air.airports.map(p => ({p,n:p.n,xy:P(p.ll),v:p.t.reduce((a,b)=>a+b,0),a:0,r:0}));
const SELECTION_PLACES = [{n:'Cushing, Oklahoma',ll:[-96.7617533,35.9796807]},...CITY.map(c=>({n:c.n,ll:proj.invert(c.xy)}))];
const PORTS = PZ.ports.map(p => ({ p, v: p.v[0] + p.v[1], xy: P(p.ll), n: 'Port of ' + p.n.replace(/, [A-Z]{2}$/, '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) })).filter(p => p.v > 2e6);
const RK = { oil: ['rgba(150,78,72,0.16)', 'rgb(150,78,72)'], gas: ['rgba(196,118,130,0.15)', 'rgb(170,100,106)'], coal: ['rgba(60,55,50,0.13)', '#3b342c'], industry: ['rgba(200,160,70,0.17)', 'rgb(150,115,45)'], farm: ['rgba(132,163,128,0.22)', 'rgb(92,125,90)'], minerals: ['rgba(130,88,59,0.16)', 'rgb(130,88,59)'] };
function hatch(col) { const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); x.fillStyle = col[0]; x.fillRect(0, 0, 8, 8); x.strokeStyle = col[1]; x.globalAlpha = 0.28; x.lineWidth = 0.7; x.beginPath(); x.moveTo(0, 8); x.lineTo(8, 0); x.stroke(); return ctx.createPattern(c, 'repeat'); }
const RPAT = {}; Object.keys(RK).forEach(k => RPAT[k] = hatch(RK[k]));

// ---------------------------------------------------------------- the continuous rule
let T = d3.zoomIdentity, KH = 1, SEL = null, HOV = null, UNIT = 't';
// Producing regions re-rank with the unit (one layer): in tons the raw-material areas (oil, gas, coal, farms, minerals);
// in $ every area by value of goods shipped, so the auto corridor, NJ–Philadelphia chemicals & pharma and Silicon Valley
// join while low-value tonnage (PRB coal, Iron Range) drops out. Nested by zoom: sub-regions fade in from x2.5 and their
// parent fades to an outline; individual sites (coal mines, 2025 tons) from x5.
const RAW = new Set(['oil', 'gas', 'coal', 'farm', 'minerals']);
const RUSD0 = 12e9;
const smooth = a => a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
function regAlpha(r, z = T.k / KH) {
  if (r.tier === 0) { if (UNIT === 't' && !RAW.has(r.kind)) return 0; const cut = (UNIT === 't' ? 3e9 : RUSD0) / Math.min(z, 8); return smooth((Math.log2(Math.max(r.usd, 1) / cut) + 0.5) / 0.5); }
  if (r.tier === 1) { const par = RBY.get(r.parent); if (par && regAlpha(par, z) <= 0) return 0; if (UNIT === 'usd' && !r.usd) return 0; return smooth((z - 2.2) / 1.0); }
  if (r.pt) { if (UNIT === 'usd') return 0; return smooth((z - 4.5) / 1.2) * smooth((Math.log2(r.tons / (40e6 / z)) + 0.5) / 0.5); }
  return 0;
}
const kidsOn = r => REG.some(c => c.parent === r.id && c.tier === 1 && regAlpha(c) > 0.5);
const T0 = 16e6, FLOOR = PZ.floor;
const thr = (k = T.k) => Math.max(FLOOR, T0 / Math.max(k / KH, 1.7)); // independent national admission floor; camera and widths unchanged
const alphaOf = (s, k) => { const L = Math.log2(thr(k) / 1e6); const a = (s.lv - (L - 0.7)) / 0.7; return a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a); };
const WPER = 0.085 * Math.max(0.6, Math.min(1.1, proj.scale() / 1500));
const wv = s => UNIT === 't' ? s.t / 1e6 : s.u / 3e9;                       // $3 B draws like 1 M t (v3.3 scale)
const wPx = (s, k = T.k) => Math.min(17, Math.max(0.12, wv(s) * WPER * Math.pow(k / KH, 0.32)));
function solid(col, a) { const c = d3.color(col).rgb(), p = d3.color('#f8f3e4').rgb(); return `rgb(${Math.round(c.r * a + p.r * (1 - a))},${Math.round(c.g * a + p.g * (1 - a))},${Math.round(c.b * a + p.b * (1 - a))})`; }
const corrKey = s => s.m === 'truck' && s.roadSelectionKey ? s.roadSelectionKey : s.m === 'pipeline' && s.graph && s.graph.pipelineSelectionKey ? s.graph.pipelineSelectionKey : s.n ? s.m + '|' + s.n : 'i' + s.i;
const corrName = s => s.m === 'truck' && corrKey(s).startsWith('truck|') ? RoadCorridors.name(corrKey(s)) : s.n;
const isSel = s => SEL && SEL.type === 'seg' && corrKey(s) === SEL.key;

const ROUTES=[];
const DETAIL_BUDGET=new DetailResidency.Budget();
const VIEW_INDEX={cells:new Map(),wide:[],rebuild(){},query(bb){return SEGS.filter(s=>!(s.bb[2]<bb[0]||s.bb[0]>bb[2]||s.bb[3]<bb[1]||s.bb[1]>bb[3]));}};
const DRAW_FRAME=new ViewWork.Frame(),REFRESH_FRAME=new ViewWork.Frame();let cameraGeneration=0;
const GESTURE=new ViewWork.Gesture(()=>settle().catch(()=>{}));
const SNAPSHOTS=new URLSearchParams(location.search).get('gestureSnapshot')!=='0';
let prefetchPlanTimer=null;
function schedulePrefetch(){
 if(new URLSearchParams(location.search).get('idlePrefetch')==='0'||StartupPreparation.state.status().phase!=='Ready')return;
 if(prefetchPlanTimer!==null)clearTimeout(prefetchPlanTimer);const gen=cameraGeneration;
 prefetchPlanTimer=setTimeout(()=>{prefetchPlanTimer=null;if(gen!==cameraGeneration||GESTURE.active||GESTURE.dirty)return;
  const k=T.k,next=Math.min(60,k*2),view=[(-T.x-W*.5)/k,(-T.y-H*.5)/k,(W*1.5-T.x)/k,(H*1.5-T.y)/k];
  const need=OWNER.needed(view,thr(next),proj),ids=[...need.ids],road=window.ROAD_GEOMETRY,rail=window.RAIL_GEOMETRY,urls=[];
  if(road){const desired=road.tolerances.findIndex(t=>t*proj.scale()*next<=.5),lod=desired<0?road.tolerances.length-1:desired;if(lod>0)for(const i of ids)if(road.index[i]!==undefined&&!(window.SoutheastCoarse&&SoutheastCoarse.use(proj,next)&&SoutheastCoarse.has(i)))urls.push('road-tiles/'+road.index[i]+'-l'+lod+'.json.gz');}
  if(rail)for(const url of RailGeometry.tileRequests(rail,ids,proj.scale()*next))urls.push('rail-geometry/'+url);
  for(const i of ids)if(!OWNER.segs.has(i)&&!(window.SoutheastCoarse&&SoutheastCoarse.has(i)))urls.push('../indexed-tiles/'+OWNER.meta.tiles[OWNER.facts[i*OWNER.meta.stride+10]]+'.json.gz');
  BoundedTiles.prefetch.start(urls,()=>gen===cameraGeneration&&!GESTURE.active&&!GESTURE.dirty);
 },500);
}
function cancelPrefetch(){if(prefetchPlanTimer!==null)clearTimeout(prefetchPlanTimer);prefetchPlanTimer=null;BoundedTiles.prefetch.cancel();}
function presentSnapshot(){if(!SNAPSHOTS)return;const r=GESTURE.relative();cv.style.transformOrigin='0 0';cv.style.transform=`translate(${r.x}px,${r.y}px) scale(${r.scale})`;}
const GROUP_ORDER=new Map(OWNER.meta.branches[OWNER.branch].order.map((g,i)=>[g,i]));
const ROUTE_INDEX={order:new Map(),named:new Map(),query(visible){return [...OWNER.groups].filter(([g,r])=>visible.has(r)).sort((a,b)=>GROUP_ORDER.get(a[0])-GROUP_ORDER.get(b[0])).map(([g,r])=>r);}};
function admittedCount(cut,m=null){let n=0;for(const g of OWNER.meta.branches[OWNER.branch].order){if(!LAYERS.on(MODES[OWNER.facts[OWNER.members[OWNER.memberOffsets[g]]*OWNER.meta.stride]]))continue;if(m&&MODES[OWNER.facts[OWNER.members[OWNER.memberOffsets[g]]*OWNER.meta.stride]]!==m)continue;if(RouteRender.detailAlpha({appear:OWNER.appear[g]},cut)>.02)n++;}return n;}
const TILE_READER=new BoundedTiles.Reader(131072,url=>BoundedTiles.fetch(url),2);
const loadingElement=document.getElementById('detail-loading');
const LOAD=new LoadingStatus.State(state=>{loadingElement.hidden=!state.pending&&!state.error;loadingElement.dataset.loading=state.error?'error':state.pending?'pending':'idle';loadingElement.querySelector('span').textContent=state.error?'Detail failed to load: '+state.error:!state.pending?(MODES.some(m=>LAYERS.on(m))?'No modeled network flows shown at this zoom.':'Network layers are off; place layers remain independent.'):state.label+'…';loadingElement.querySelector('button').hidden=!state.error;window.DETAIL_LOADING={...state,cameraGeneration};if(window.LOAD_TIMELINE)LOAD_TIMELINE.push({...window.DETAIL_LOADING,time:performance.now()});});
loadingElement.querySelector('button').onclick=()=>settle();

async function updateOwners(){const k=T.k,view=[(-T.x-256)/k,(-T.y-256)/k,(W-T.x+256)/k,(H-T.y+256)/k],gen=cameraGeneration;
 if(SoutheastCoarse.prime(OWNER,view,thr(k),proj,k,null)){syncOwners();if(!GESTURE.active){draw();placeLabels();}}
 if(await OWNER.update(view,thr(k),proj,(t,ids)=>{const generation=OWNER.generation;return TILE_READER.read('../indexed-tiles/'+t+'.json.gz',()=>generation===OWNER.generation,ids);},null)){
  if(!OWNER.pinned&&T.k/KH<1.1)OWNER.pinned={ids:new Set(OWNER.required.ids),groups:new Set(OWNER.required.groups)};
  syncOwners();if(gen===cameraGeneration&&!GESTURE.active){draw();placeLabels();}
 }
}

let RVIS = [];
function routeDraw(k) {
 const previous=RVIS;RVIS=[];const visibleRoutes=new Set(VIS.map(([s])=>s.display)),ordered=ROUTE_INDEX.query(visibleRoutes);
 const retained=new Set(ordered);for(const r of previous)if(!retained.has(r)){if(r.invalidateGeometry)r.invalidateGeometry();delete r.geom;delete r.pickGeom;delete r.samplePool;delete r.cacheKey;}
 for(const r of ordered){const a=RouteRender.detailAlpha(r,thr(k));if(a<=.02||!visibleRoutes.has(r))continue;
  const needed=[(-T.x-32)/k,(-T.y-32)/k,(W-T.x+32)/k,(H-T.y+32)/k],view=[(-T.x-256)/k,(-T.y-256)/k,(W-T.x+256)/k,(H-T.y+256)/k],cacheKey=k+'|'+UNIT;
  if(r.cacheKey!==cacheKey||!r.view||needed[0]<r.view[0]||needed[1]<r.view[1]||needed[2]>r.view[2]||needed[3]>r.view[3]){r.view=view;r.geom=RouteRender.geometry(r,s=>wPx(s,k),k,view,r.samplePool||(r.samplePool=[]));r.cacheKey=cacheKey;}
  RVIS.push(r);r.pickGeom=r.geom;
  for(const g of r.geom){ctx.fillStyle=solid(r.ss[0].col,.78*a);ViewWork.paintMesh(ctx,g.samples,k);}
 }
}

let VIS = [], CITYHIT = [];
function draw() {
  if(SNAPSHOTS&&GESTURE.active)return;
  cv.style.transform='';
  const k = T.k;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(DPR * k, 0, 0, DPR * k, DPR * T.x, DPR * T.y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const vx0 = -T.x / k, vy0 = -T.y / k, vx1 = (W - T.x) / k, vy1 = (H - T.y) / k, dim = false;
  // producing regions: soft hatched areas under everything
  for (const r of REG) { r.a=0;r.r=0;const ra = LAYERS.on('regions')?regAlpha(r):0; r.a = ra; if (ra <= 0.02) continue; const on = false;
    if (r.pt) { const rr = Math.max(3, 9 * Math.sqrt(r.tons / 80e6)) * Math.pow(k / KH, 0.25) / k; ctx.globalAlpha = ra * (dim && !on ? 0.4 : 1); ctx.beginPath(); ctx.arc(r.xy[0], r.xy[1], rr, 0, 7); ctx.fillStyle = 'rgba(60,55,50,0.35)'; ctx.fill(); ctx.lineWidth = (on ? 2 : 1) / k; ctx.strokeStyle = '#262019'; ctx.stroke(); r.r = rr * k; continue; }
    const fillA = r.tier === 0 && kidsOn(r) ? 0.3 : 1;     // parent fades to an outline as its parts appear
    ctx.globalAlpha = ra * fillA * (dim && !on ? 0.45 : 1); ctx.fillStyle = RPAT[r.kind]; ctx.fill(r.p2);
    ctx.setLineDash(r.est ? [4 / k, 3 / k] : []); ctx.lineWidth = (on ? 2.2 : r.tier ? 0.7 : 0.9) / k; ctx.strokeStyle = on ? '#262019' : RK[r.kind][1]; ctx.globalAlpha = ra * (on ? 1 : (dim ? 0.3 : 0.6)); ctx.stroke(r.p2); ctx.setLineDash([]); }
  ctx.globalAlpha = 1;
  VIS = [];
  for (const s of VIEW_INDEX.query([vx0-32/k,vy0-32/k,vx1+32/k,vy1+32/k])) {
    if(!LAYERS.on(s.m))continue;
    if (s.bb[2] < vx0 || s.bb[0] > vx1 || s.bb[3] < vy0 || s.bb[1] > vy1) continue;
    const a = RouteRender.detailAlpha(s.display,thr(k)); if (a <= 0.02) continue; VIS.push([s, a]);
  }
  // No partial opacity on lines, ever: strokes of one corridor meet end to end, and two translucent round caps at a
  // joint double the ink (the dark beads). Fade-in and dimming instead blend the colour toward the paper (opaque), and
  // every colour x width class is ONE merged path, stroked once: casings of all classes first, then inks, thick first.
  const groups = new Map();
  for (const [s, a] of VIS) {
    if (s.display) continue;
    const w = Math.round(wPx(s) * 4) / 4, ink = (0.38 + 0.6 * Math.min(1, (w - 1) / 4)) * a * (dim && !isSel(s) ? 0.3 : 1);
    const col = solid(s.col, Math.round(ink * 20) / 20), key = col + '|' + w; let g = groups.get(key);
    if (!g) groups.set(key, g = { col, w, ink, p: new Path2D() }); g.p.addPath(s.p2d || s.p2);
  }
  const gl = [...groups.values()].sort((x, y) => (x.ink - y.ink) || (y.w - x.w));     // faint/dimmed first, strong on top
  ctx.globalAlpha = 1; ctx.strokeStyle = '#f8f3e4';
  for (const g of gl) { if (g.ink < 0.25) continue; ctx.lineWidth = (g.w + 1.4) / k; ctx.stroke(g.p); }
  for (const g of gl) { ctx.strokeStyle = g.col; ctx.lineWidth = g.w / k; ctx.stroke(g.p); }
  routeDraw(k, dim);
  // ports (vessel tons; fade in with the same rule) and city dots
  const tp = thr(k);
  for (const c of PORTS) { c.a = 0; c.r = 0; if(!LAYERS.on('ports'))continue;const a = Math.max(0, Math.min(1, Math.log2(c.v / tp) + 0.6)); if (a <= 0) continue; const r = Math.max(2.5, 11 * Math.sqrt(c.v / 3e8)) * Math.pow(k / KH, 0.2) / k; const on = false;
    ctx.globalAlpha = a * (dim && !on ? 0.35 : 1); ctx.beginPath(); ctx.arc(c.xy[0], c.xy[1], r, 0, 7); ctx.fillStyle = 'rgba(95,140,177,0.25)'; ctx.fill(); ctx.lineWidth = (on ? 2.2 : 1.1) / k; ctx.strokeStyle = on ? '#262019' : 'rgb(70,108,140)'; ctx.stroke(); c.r = r * k; c.a = a; }
  // Airport sites only: no flight routes or network admission changes. Small diamond cores distinguish them from metros.
  for(const c of AIRPORTS){c.a=0;c.r=0;if(!LAYERS.on('airports'))continue;const value=UNIT==='t'?c.v:(c.p.u[0]+c.p.u[1])/3000;
   const a=Math.max(0,Math.min(1,Math.log2(Math.max(value,1)/(tp*.12))+.6));if(a<=.02)continue;
   const r=Math.min(8,Math.max(3,3+Math.sqrt(value/1e6)))*Math.pow(k/KH,.1)/k;
   ctx.globalAlpha=a;ctx.fillStyle='#f8f3e4';ctx.strokeStyle='#7b6587';ctx.lineWidth=1.2/k;ctx.beginPath();ctx.moveTo(c.xy[0],c.xy[1]-r);ctx.lineTo(c.xy[0]+r,c.xy[1]);ctx.lineTo(c.xy[0],c.xy[1]+r);ctx.lineTo(c.xy[0]-r,c.xy[1]);ctx.closePath();ctx.fill();ctx.stroke();c.a=a;c.r=r*k;
  }
  ctx.globalAlpha=1;
  if(SEL?.xy){ctx.beginPath();ctx.arc(SEL.xy[0],SEL.xy[1],6/k,0,Math.PI*2);ctx.fillStyle='#f8f3e4';ctx.fill();ctx.lineWidth=1.8/k;ctx.strokeStyle='#262019';ctx.stroke();ctx.beginPath();ctx.arc(SEL.xy[0],SEL.xy[1],1.8/k,0,Math.PI*2);ctx.fillStyle='#262019';ctx.fill();}
  ctx.globalAlpha = 1;
  if(!GESTURE.active)GESTURE.commit(T);
  let diagnostic=null; Object.defineProperty(window,'__draw',{configurable:true,get(){return diagnostic||(diagnostic={ k: +(k / KH).toFixed(2), thrMt: +(tp / 1e6).toFixed(2), vis: VIS.length, corridors: admittedCount(tp), modes: Object.fromEntries(MODES.map(m=>[m,admittedCount(tp,m)])), full: VIS.filter(v => v[1] > 0.98).length });}});
}

// ---------------------------------------------------------------- rail / pipeline beside roads (recomputed when a gesture settles)
// Where a rail or pipeline stroke runs within a few px of a drawn road, push it sideways (perpendicular, away from the
// road) by enough to clear both line widths; the shift tapers to 0 at its ends so every end stays on its named place.
function computeOffsets() {
  const k = T.k, G2 = 8 / k, g = new Map(), pri = { truck: 0, rail: 1, pipeline: 2 };
  VIS.forEach(([s]) => { s.dp = null; s.p2d = null; if (s.m !== 'truck' && s.m !== 'rail') return;
    for (let j = 1; j < s.pts.length; j++) { const a = s.pts[j - 1], b = s.pts[j], key = Math.floor((a[0] + b[0]) / 2 / G2) * 100000 + Math.floor((a[1] + b[1]) / 2 / G2); let c = g.get(key); if (!c) g.set(key, c = []); c.push([s, j]); } });
  for (const [s] of VIS) {
    if (s.display || (s.m !== 'rail' && s.m !== 'pipeline')) continue; const n = s.pts.length; if (n < 3) continue;
    const w0 = wPx(s), dp = s.pts.map(q => q.slice()); let moved = false;
    for (let j = 0; j < n; j++) { const q = s.pts[j], kx = Math.floor(q[0] / G2), ky = Math.floor(q[1] / G2); let best = null;
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) { const c = g.get((kx + dx) * 100000 + ky + dy); if (!c) continue;
        for (const [o, i] of c) { if (o === s || pri[o.m] >= pri[s.m]) continue; const d = segDist(q, o.pts[i - 1], o.pts[i]) * k, need = (wPx(o) + w0) / 2 + 1.5; if (d < need && (!best || need - d > best.gap)) best = { gap: need - d, a: o.pts[i - 1], b: o.pts[i] }; } }
      if (!best) continue; const ex = best.b[0] - best.a[0], ey = best.b[1] - best.a[1], L = Math.hypot(ex, ey) || 1; let nx = -ey / L, ny = ex / L;
      if ((q[0] - best.a[0]) * nx + (q[1] - best.a[1]) * ny < 0) { nx = -nx; ny = -ny; }
      const sh = Math.min(best.gap, 10) * Math.min(1, j / 2, (n - 1 - j) / 2) / k; if (sh > 0) { dp[j][0] += nx * sh; dp[j][1] += ny * sh; moved = true; } }
    if (moved) { s.dp = dp; const p2 = new Path2D(); dp.forEach((q, j) => j ? p2.lineTo(q[0], q[1]) : p2.moveTo(q[0], q[1])); s.p2d = p2; } }
}
async function settle() { if(GESTURE.active)return;GESTURE.cancel();clearTimeout(settleT);const settledCamera=cameraGeneration,token=LOAD.begin('Loading network detail');try{await updateOwners();if(settledCamera!==cameraGeneration)return; DRAW_FRAME.flush(); computeOffsets(); draw(); placeLabels(); const generation=cameraGeneration, scale=T.k; const refresh=()=>{VIEW_INDEX.rebuild(SEGS); if(generation!==cameraGeneration||GESTURE.active)return; REFRESH_FRAME.request(()=>{if(generation!==cameraGeneration||GESTURE.active)return;computeOffsets();draw();placeLabels();});}; await (async()=>{if(window.RoadGeometry)await RoadGeometry.update(SEGS,VIS,proj,scale,refresh);if(generation!==cameraGeneration)return;if(window.RAIL_GEOMETRY)await RailRuntime.update(SEGS,VIS,proj,scale,refresh);if(generation!==cameraGeneration||GESTURE.active)return;REFRESH_FRAME.flush();const evictions=DETAIL_BUDGET.evictions;DETAIL_BUDGET.trim(SEGS,new Set(VIEW_INDEX.query([(-T.x-256)/T.k,(-T.y-256)/T.k,(W-T.x+256)/T.k,(H-T.y+256)/T.k])));if(evictions!==DETAIL_BUDGET.evictions){VIEW_INDEX.rebuild(SEGS);draw();placeLabels();}})();if(settledCamera===cameraGeneration){const error=RoadGeometry.status().error||RailRuntime.status().error;if(error)throw Error(error);LOAD.ready(token);schedulePrefetch();}}catch(e){LOAD.fail(token,String(e));throw e;} }

// ---------------------------------------------------------------- labels: priority + greedy collision, placed on settle; they fade in
const mctx = document.createElement('canvas').getContext('2d');
const fontOf = o => `${o.italic ? 'italic ' : ''}${o.weight || 400} ${o.size}px ${o.sans ? 'InterA' : 'Garamond'}`;
const tw = (t, o) => { mctx.font = fontOf(o); return mctx.measureText(t).width + (o.track ? t.length * o.size * o.track : 0); };
const labG = lab.append('g'); let LT = d3.zoomIdentity;
function along(sp, f) { let L = 0; const c = [0]; for (let j = 1; j < sp.length; j++) { L += Math.hypot(sp[j][0] - sp[j - 1][0], sp[j][1] - sp[j - 1][1]); c.push(L); } const d = f * L; for (let j = 1; j < sp.length; j++) if (c[j] >= d) { const u = (d - c[j - 1]) / ((c[j] - c[j - 1]) || 1), a = sp[j - 1], b = sp[j]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI]; } return null; }
function placeLabels() {
  labG.selectAll('*').remove(); labG.attr('transform', null).attr('opacity', 1); LT = T;
  const k = T.k, z = k / KH, placed = AtlasBridge.chromeBounds(document), scr = q => [q[0] * k + T.x, q[1] * k + T.y];
  if (SEL) { const r = document.getElementById('card').getBoundingClientRect(); placed.push([r.left - 6, r.top - 6, r.right + 6, r.bottom + 6]); }
  // Visible controls reserve only their current footprint, including phone disclosures.
  const free = bb => bb[0] > 14 && bb[1] > 14 && bb[2] < W - 14 && bb[3] < H - 14 && !placed.some(p => !(p[2] < bb[0] || bb[2] < p[0] || p[3] < bb[1] || bb[3] < p[1]));
  const put = (x, y, t, o, anchor = 'middle', rot = 0) => { const w = tw(t, o), x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
    let bb = [x0 - 3, y - o.size * 0.8, x0 + w + 3, y + o.size * 0.3];
    if (rot) { const r = rot * Math.PI / 180, ex = Math.abs(Math.cos(r)) * w / 2 + Math.abs(Math.sin(r)) * o.size / 2, ey = Math.abs(Math.sin(r)) * w / 2 + Math.abs(Math.cos(r)) * o.size / 2; bb = [x - ex, y - ey - 3, x + ex, y + ey]; }
    if (!free(bb)) return false; placed.push(bb);
    const g = labG.append('g').attr('class', 'lbl'); label(g, x, y, t, { size: o.size, italic: o.italic, weight: o.weight, fill: o.fill, track: o.track ? o.track + 'em' : null, cls: o.sans ? 'sans' : null, anchor, rotate: rot || null, haloW: 3.2, haloColor: '#f8f3e4' });
    g.selectAll('text').style('font-family', o.sans ? 'InterA' : 'Garamond');
    return true; };
  // 1) producing regions: spaced italic caps, atlas style
  REG.filter(r => r.tier === 0 && r.a > 0.6).sort((a, b) => (UNIT === 't' ? b.tons - a.tons || b.usd - a.usd : b.usd - a.usd)).forEach(r => { const [x, y] = scr(r.xy); put(x, y, (SHORT[r.id] || r.n).toUpperCase(), { size: Math.min(15, 9.5 + 1.6 * Math.log2(z + 1)), italic: true, track: 0.14, fill: RK[r.kind][1], weight: 500 }); });
  // 2) cities by freight, budget grows with zoom (more names as the plate's scale grows)
  let nc = 0; const cb = Math.round(6 + 5 * Math.log2(z)); CITYHIT = [];
  for (const c of CITY) { if(!LAYERS.on('metros'))continue;if (nc >= cb) break; const [x, y] = scr(c.xy); if (x < 0 || y < 0 || x > W || y > H) continue; const big = nc < 4;
    for (const [dx, dy, an] of [[6, -5, 'start'], [-6, -5, 'end'], [6, 12, 'start'], [-6, 12, 'end']]) if (put(x + dx, y + dy, c.n, { size: big ? 13.5 : 11.5, sans: true, weight: big ? 700 : 600, fill: '#262019', track: 0.02 }, an)) { const bb = placed[placed.length - 1]; CITYHIT.push({ c, sx: x, sy: y, bb }); const on = false; const g = labG.append('g'); if (on) g.append('circle').attr('cx', x).attr('cy', y).attr('r', 7).attr('fill', 'none').attr('stroke', '#262019').attr('stroke-width', 1.4); if (!c.areaPriority) g.append('circle').attr('cx', x).attr('cy', y).attr('r', big ? 3 : 2.3).attr('fill', '#f8f3e4').attr('stroke', '#262019').attr('stroke-width', 1.2); placed.push([x - 4, y - 4, x + 4, y + 4]); nc++; break; } }
  // 2b) sub-regions and sites, biggest first, small italic
  let nr = 0; REG.filter(r => r.tier > 0 && r.a > 0.7).sort((a, b) => (b.usd || b.tons) - (a.usd || a.tons)).forEach(r => { if (nr >= 8) return; const [x, y] = scr(r.xy); if (x < 0 || y < 0 || x > W || y > H) return;
    if (put(r.pt ? x + (r.r || 4) + 4 : x, y + (r.pt ? 4 : 0), r.n.replace(/ County.*$/, '').replace(/ farms$/, ''), { size: 10, italic: true, fill: RK[r.kind][1], weight: 600 }, r.pt ? 'start' : 'middle')) nr++; });
  // 3) corridors: one label each, along the stroke, with the tons on it
  const placedC = [];
  const corr = new Map(); VIS.forEach(([s, a]) => { if (!corrName(s) || a < 0.8) return; const key = corrKey(s), L = s.len * k, c = corr.get(key); if (!c || L > c.L) corr.set(key, { s, L, t: Math.max(s.t, c ? c.t : 0), u: Math.max(s.u, c ? c.u : 0) }); else { c.t = Math.max(c.t, s.t); c.u = Math.max(c.u, s.u); } });
  for(const c of corr.values()) if(c.s.display) {const r=c.s.display,key=corrKey(c.s),road=c.s.m==='truck',chain=road?RoadCorridors.labelChain(r,key,corrKey):r.chains.reduce((a,b)=>b.reduce((v,x)=>v+x.s.len,0)>a.reduce((v,x)=>v+x.s.len,0)?b:a,[]); const pts=chain.flatMap((x,i)=>i?x.pts.slice(1):x.pts); c.s=Object.assign({},c.s,{pts}); c.L=chain.reduce((v,x)=>v+x.s.len*k,0);const members=road?r.ss.filter(s=>corrKey(s)===key):r.ss;c.t=road?Math.max(...members.map(s=>s.t)):r.max; c.u=Math.max(...members.map(s=>s.u));}
  let ns = 0; const sb = 5 + Math.round(Math.log2(z));
  [...corr.values()].filter(c => c.L > 150 && wPx(c.s) >= 2.2).sort((a, b) => UNIT === 't' ? b.t - a.t : b.u - a.u).forEach(c => { if (ns >= sb) return; const s = c.s, sp = s.pts.map(scr), o = { size: 10.5, sans: true, weight: 600, fill: s.m === 'water' ? 'rgb(56,104,150)' : s.m === 'pipeline' ? 'rgb(150,78,72)' : s.m === 'rail' ? '#2b251f' : 'rgb(120,78,45)' };
    const nm = corrName(s).replace(/ - .*$/, '').replace(/^\w\w - /, '').replace(/ RIVER$/i, ' River').replace(/\b([A-Z])([A-Z]+)\b/g, (m, a, b) => a + b.toLowerCase());
    const t = `${nm} · ${AtlasBridge.lineQuantity(UNIT === 't' ? c.t : c.u, UNIT)}`;
    for (const f of [0.5, 0.35, 0.65]) { const a = along(sp, f); if (!a) continue; if (placedC.some(q => Math.hypot(q[0] - a[0], q[1] - a[1]) < 160)) continue; let ang = a[2]; if (ang > 90) ang -= 180; if (ang < -90) ang += 180; const rr = ang * Math.PI / 180, off = -(wPx(s) / 2 + 7);
      if (Math.abs(ang) > 60) continue;
      if (put(a[0] - Math.sin(rr) * off, a[1] + Math.cos(rr) * off, t, o, 'middle', ang)) { placedC.push([a[0], a[1]]); ns++; break; } } });
  // 4) ports
  let np = 0; PORTS.filter(c => c.a > 0.7).sort((a, b) => b.v - a.v).forEach(c => { if (np >= 2 + Math.round(Math.log2(z))) return; const [x, y] = scr(c.xy); if (x < 0 || y < 0 || x > W || y > H) return;
    if (put(x + (c.r || 4) + 4, y + 4, c.n, { size: 10.5, italic: true, fill: 'rgb(70,108,140)', weight: 600 }, 'start') || put(x - (c.r || 4) - 4, y + 4, c.n, { size: 10.5, italic: true, fill: 'rgb(70,108,140)', weight: 600 }, 'end')) np++; });
  zbar();
}
let zbarScale=null;
function zbar() { const key=[T.k,T.x,T.y,W,H].join(',');if(zbarScale===key)return;zbarScale=key;const scale=AtlasBridge.distanceScale(T,proj,W,H),el=document.getElementById('zbar');el.hidden=!scale;if(scale)el.innerHTML=`<span>${scale.label}</span><div class="distance-rule" style="width:${scale.pixels.toFixed(2)}px" aria-hidden="true"></div>`; }
function setUnit(u,defer=false) { UNIT = u; document.querySelectorAll('#unit button').forEach(b => b.classList.toggle('on', b.dataset.u === u)); legend(); if(SEL)openCard(SEL); if(!defer)settle(); }
function legend() { const headline = AtlasBridge.nationalHeadline(A.balance, UNIT), heading = document.getElementById('national-headline'); if (headline) { heading.textContent = headline.text; heading.dataset.value = String(headline.value); heading.title = headline.value.toLocaleString('en-US') + (UNIT === 't' ? ' short tons' : ' current US dollars') + ' · FAF 2024 estimate, all modes'; } else heading.textContent = 'National freight · 2024'; document.getElementById('legend').innerHTML = `<div><i style="background:${MCOL.truck}"></i>Truck <i style="background:${MCOL.rail};margin-left:8px"></i>Rail</div><div><i style="background:${MCOL.water}"></i>Barge & ship <i style="background:${MCOL.crude};margin-left:8px"></i>Pipeline</div><div><u style="border-color:#7b6587;transform:rotate(45deg);width:7px;height:7px"></u>Air cargo airports</div><div style="font-style:italic;color:#5f4b38">Thicker lines = more ${UNIT === 't' ? 'tons' : 'value'}</div><div><u style="border-color:#963e48;background:rgba(150,78,72,.16)"></u>${UNIT === 't' ? 'Producing areas' : 'Producing areas by value'}</div>`; }
legend();
const layerControls=document.getElementById('layer-controls');layerControls.innerHTML=InfoLayers.controls(LAYERS);
layerControls.querySelectorAll('input').forEach(input=>input.onchange=()=>setLayer(input.dataset.layer,input.checked));
function setLayer(key,on){
 LAYERS.set(key,on);layerControls.querySelectorAll('input').forEach(input=>input.checked=LAYERS.on(input.dataset.layer));
 HOV=null;tip.hidden=true;wrap.classList.remove('hot');
 if(SEL&&!LAYERS.visible(SEL))closeCard();else{draw();placeLabels();}
 refreshInsetLayers();refreshInsetSelection();zbarScale=null;zbar();
 const empty=document.getElementById('layers-empty');empty.hidden=!LAYERS.none();
 if(!window.DETAIL_LOADING?.pending&&!window.DETAIL_LOADING?.error){loadingElement.hidden=true;loadingElement.querySelector('span').textContent=MODES.some(m=>LAYERS.on(m))?'No modeled network flows shown at this zoom.':'Network layers are off; place layers remain independent.';}
}
document.querySelectorAll('#unit button').forEach(b => b.onclick = () => setUnit(b.dataset.u));

// ---------------------------------------------------------------- zoom: continuous, no snapping, no levels
let settleT = 0;
// CSS-composite the retained exact canvas while zoom/pan is active. Labels
// retain their existing affine transform; full rendering remains unchanged.
const zoom = d3.zoom().scaleExtent([0.8, 60]).clickDistance(5).on('start',()=>{cancelPrefetch();GESTURE.start();DRAW_FRAME.dispose();REFRESH_FRAME.dispose();cv.style.willChange=SNAPSHOTS?'transform':'';}).on('end',()=>{GESTURE.end();}).on('zoom', ev => {
  T = ev.transform; cameraGeneration++; OWNER.generation++;if(OWNER.staging)OWNER.staging.clear();LOAD.begin('Updating network detail'); zg.attr('transform', T); GESTURE.change(T);DRAW_FRAME.request(SNAPSHOTS?presentSnapshot:draw);
  const s = T.k / LT.k; labG.attr('transform', `translate(${T.x},${T.y}) scale(${s}) translate(${-LT.x},${-LT.y})`).attr('opacity', Math.abs(Math.log2(s)) > 0.4 ? 0.25 : 1);
  zbar(); insetFade(); document.getElementById('tip').hidden = true; clearTimeout(settleT);
});
// Picking APIs and native hover share the settled-state gate. The underlying
// exact hit algorithm is unchanged; never query old geometry at a new camera.
const exactHit=hit;hit=(sx,sy)=>SNAPSHOTS&&!GESTURE.canPick()?null:exactHit(sx,sy);
const exactOpenCard=openCard,exactSelectPlace=selectPlace;
openCard=h=>SNAPSHOTS&&!GESTURE.canPick()?false:exactOpenCard(h);
selectPlace=place=>SNAPSHOTS&&!GESTURE.canPick()?false:exactSelectPlace(place);
// Capture-phase guards keep selection/hover on exact settled geometry only.
for(const type of ['click','pointermove'])wrap.addEventListener(type,e=>{if(SNAPSHOTS&&!GESTURE.canPick()){e.stopImmediatePropagation();document.getElementById('tip').hidden=true;wrap.classList.remove('hot');}},true);
const wsel = d3.select(wrap).call(zoom).on('dblclick.zoom', null);
function homeT() { const b = path.bounds(L48), k = Math.min((W - 80) / (b[1][0] - b[0][0]), (H - 160) / (b[1][1] - b[0][1])); return d3.zoomIdentity.translate(W / 2 - k * (b[0][0] + b[1][0]) / 2, (H + 60) / 2 - k * (b[0][1] + b[1][1]) / 2).scale(k); }
KH = homeT().k;
zoom.translateExtent([[-W, -H], [2 * W, 2 * H]]);

// ---------------------------------------------------------------- click: highlight in place; "Zoom to" is opt-in
function segDist(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy; let u = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0; u = Math.max(0, Math.min(1, u)); return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy); }
function hit(sx, sy) {
 const k=T.k,p=[(sx-T.x)/k,(sy-T.y)/k];let best=null;
 for(const c of AIRPORTS)if(LAYERS.on('airports')&&c.a>.5&&Math.hypot(c.xy[0]-p[0],c.xy[1]-p[1])*k<=Math.min(6,c.r))return{type:'airport',c,xy:c.xy.slice()};
 for(const c of CITYHIT)if(LAYERS.on('metros')&&(Math.hypot(c.sx-sx,c.sy-sy)<=7||(sx>=c.bb[0]&&sx<=c.bb[2]&&sy>=c.bb[1]&&sy<=c.bb[3])))return{type:'city',c:c.c,xy:c.c.xy.slice()};
 for(const c of PORTS)if(LAYERS.on('ports')&&c.a>.5&&Math.hypot(c.xy[0]-p[0],c.xy[1]-p[1])*k<=Math.max(6,c.r))return{type:'port',c,xy:c.xy.slice()};
 for(const r of RVIS){if(RouteRender.detailAlpha(r,thr(k))<=.02)continue;
  for(const g of r.pickGeom||r.geom)for(let j=1;j<g.samples.length;j++){const a=g.samples[j-1],b=g.samples[j];if(!LAYERS.on(b.s.m))continue;const q=ClickedPlace.nearest(p,a,b),d=q.distance*k,half=(a.w+(b.w-a.w)*q.u)/2;
   if(d<=half+4&&(!best||d-half<best.d))best={type:'seg',s:q.s,xy:q.xy,d:d-half,key:corrKey(q.s)};
  }
 }
 for(const [s,a]of VIS){if(!LAYERS.on(s.m)||s.display||a<=.02)continue;const tol=wPx(s)/2+4;if(p[0]<s.bb[0]-tol/k||p[0]>s.bb[2]+tol/k||p[1]<s.bb[1]-tol/k||p[1]>s.bb[3]+tol/k)continue;
  const sp=s.dp||s.pts;for(let j=1;j<sp.length;j++){const q=ClickedPlace.nearest(p,{x:sp[j-1][0],y:sp[j-1][1],s},{x:sp[j][0],y:sp[j][1],s}),d=q.distance*k;if(d<=tol&&(!best||d-wPx(s)/2<best.d))best={type:'seg',s,xy:q.xy,d:d-wPx(s)/2,key:corrKey(s)};}
 }
 if(best)return best;
 for(const r of REG)if(LAYERS.on('regions')&&r.pt&&r.a>.5&&Math.hypot(r.xy[0]-p[0],r.xy[1]-p[1])*k<=Math.max(6,r.r||0))return{type:'reg',r,xy:r.xy.slice()};
 ctx.save();ctx.setTransform(1,0,0,1,0,0);const order=REG.filter(r=>LAYERS.on('regions')&&!r.pt&&r.a>.5).sort((a,b)=>b.tier-a.tier);
 for(const r of order){ctx.setTransform(DPR*k,0,0,DPR*k,DPR*T.x,DPR*T.y);if(ctx.isPointInPath(r.p2,sx*DPR,sy*DPR)){ctx.restore();return{type:'reg',r,xy:p};}}
 ctx.restore();return null;
}

const card = document.getElementById('card');
function openCard(h) {
 if(!LAYERS.visible(h))return;
 // Native hit supplies the nearest drawn point. APP.openCard may supply map xy or screen coordinates; absent either use the object's own geometry, never a network anchor.
 if(!h.xy){if(h.screen){h.xy=[(h.screen[0]-T.x)/T.k,(h.screen[1]-T.y)/T.k];if(h.type==='seg'){let nearest=null;const pts=h.s.dp||h.s.pts;for(let j=1;j<pts.length;j++){const q=ClickedPlace.nearest(h.xy,{x:pts[j-1][0],y:pts[j-1][1],s:h.s},{x:pts[j][0],y:pts[j][1],s:h.s});if(!nearest||q.distance<nearest.distance)nearest=q;}h.xy=nearest?nearest.xy:h.xy;}}
  else h.xy=(h.type==='seg'?(h.s.dp||h.s.pts)[0]:h.type==='reg'?h.r.xy:h.c.xy).slice();
 }else h.xy=h.xy.slice();
 h.ll=proj.invert(h.xy);SEL=h;document.getElementById('tip').hidden=true;
 const f=ClickedPlace.facts(h,UNIT),fmt=v=>ClickedPlace.quantity(v,UNIT),name=h.type==='seg'?corrName(h.s)||MNAME[h.s.m]+' stretch':h.type==='reg'?h.r.n:h.c.n;
 const kind=h.type==='seg'?MNAME[h.s.m]:h.type==='airport'?'Air cargo airport':h.type==='port'?'Seaport':h.type==='city'?'Freight region':h.r.pt?'Producing site':'Producing region';
 const location=h.type==='airport'?h.c.p.city+', '+h.c.p.st:h.type==='city'?'Freight region: '+h.c.z.n:ClickedPlace.location(h.ll,SELECTION_PLACES);
 let context='';
 if(h.type==='city')context=`<div data-metro-detail role="status">${InfoInspector.metro(MetroDetails.card(h.c.z,null,UNIT),UNIT,{})}<p>Loading freight details…</p></div>`;
 if(f.directions)context=`<div class="fact-row"><span>${h.type==='port'?'Foreign vessel imports':UNIT==='usd'?'Allocated imports':'Cargo received'}</span><strong>${fmt(f.directions[0])}</strong></div><div class="fact-row"><span>${h.type==='port'?'Foreign vessel exports':UNIT==='usd'?'Allocated exports':'Cargo shipped'}</span><strong>${fmt(f.directions[1])}</strong></div>`;
 if(h.type==='reg')context=h.r.lines.map(l=>`<div>${esc(l)}</div>`).join('');
 if(h.type==='seg')context=`<div>${esc(h.s.m==='pipeline'?({crude:'Crude oil',products:'Refined products',gas:'Natural gas',hgl:'Hydrocarbon gas liquids',gasngl:'Gas & NGLs'}[h.s.graph?.pipelineClass||h.s.cls]||'Pipeline freight'):h.s.n&&h.s.n!==name?'Local route: '+h.s.n:'Two-way freight throughput')}</div>`;
 if(h.type==='airport'&&h.c.p.pa?.length)context+=`<div class="note">Leading cargo partners: ${h.c.p.pa.slice(0,3).map(p=>esc(p[1])).join(', ')} (T-100 tons).</div>`;
 const unknown=f.value===null?(h.type==='reg'&&UNIT==='t'?'Annual short tons are not published for this area. Native production measures are shown below.':'Local throughput is unavailable in this unit.'):`<span class="num">${fmt(f.value)}</span> a year · ${esc(f.scope)}`;
 const id=h.type==='seg'?h.s.i:h.type==='reg'?h.r.id:h.type==='city'?h.c.z.z:h.c.p.id;
 card.innerHTML=`<button class="x" aria-label="Close">×</button><div class="kind">${esc(kind)}</div><h3>${esc(name)}</h3><div class="location">${esc(location)}</div><div class="local-quantity">${unknown}</div><div class="note">${esc(f.source)}</div>${context}${InfoInspector.sourceHTML(h,UNIT,id)}<button class="zt">Zoom here ›</button>`;
 card.hidden=false;card.querySelector('.x').onclick=closeCard;card.querySelector('.zt').onclick=()=>zoomToSel();
 draw();placeLabels();refreshInsetSelection();window.__sel=h.type+':'+id;
 if(h.type==='city'){
  const target=card.querySelector('[data-metro-detail]'),requestedUnit=UNIT;
  const current=()=>SEL===h&&UNIT===requestedUnit&&target.isConnected;
  const load=()=>MetroDetails.load().then(data=>{if(current()){target.innerHTML=InfoInspector.metro(MetroDetails.card(h.c.z,data.zones[h.c.z.z],requestedUnit),requestedUnit,Object.fromEntries(PZ.zones.map(z=>[z.z,z.n])));placeLabels();}}).catch(()=>{if(current()){target.innerHTML=InfoInspector.metro(MetroDetails.card(h.c.z,null,requestedUnit),requestedUnit,{})+'<p>Freight details could not load.</p><button data-retry-metro>Retry detail</button>';target.querySelector('button').onclick=load;}});
  load();
 }
}
function closeCard() {SEL=null;card.hidden=true;draw();placeLabels();refreshInsetSelection();window.__sel=null;}
function selBounds() {if(!SEL?.xy)return null;const [x,y]=SEL.xy;return[x-20,y-20,x+20,y+20];}
function fitT(b) { const k = Math.min(60, Math.max(80,W-(W<600?80:500)) / Math.max(1,b[2]-b[0]), Math.max(80,H-260) / Math.max(1,b[3]-b[1])); return d3.zoomIdentity.translate(W/2+(W<600?0:120)-k*(b[0]+b[2])/2,H/2+(W<600?-80:20)-k*(b[1]+b[3])/2).scale(k); }
function zoomToSel(ms = 1600) { const b = selBounds(); if (b) return wsel.transition().duration(ms).ease(d3.easeCubicInOut).call(zoom.transform, fitT(b)).end().catch(() => 0); }
wrap.addEventListener('click', e => { if (e.defaultPrevented) return; const h = hit(e.clientX, e.clientY); if (h) openCard(h); else if (SEL) closeCard(); });
document.getElementById('home').onclick = () => wsel.transition().duration(1400).call(zoom.transform, homeT());
const tip = document.getElementById('tip');
wrap.addEventListener('pointermove', e => { if (e.buttons) return; const h = hit(e.clientX, e.clientY); wrap.classList.toggle('hot', !!h); if (!h) { tip.hidden = true; return; }
  const f=ClickedPlace.facts(h,UNIT),name=h.type==='seg'?corrName(h.s)||MNAME[h.s.m]:h.type==='reg'?h.r.n:h.c.n;
  tip.innerHTML=`<b>${esc(name)}</b> · ${f.value===null?'Unknown':UNIT==='t'?tF(f.value):uF(f.value)}`;tip.hidden=false;tip.style.left=e.clientX+14+'px';tip.style.top=e.clientY+14+'px'; });


// ---------------------------------------------------------------- tour (for the recording): real zoom transitions + real hit-test clicks
const sleep = ms => new Promise(r => setTimeout(r, ms));
function ripple(x, y) { const d = document.createElement('div'); d.style.cssText = `position:fixed;left:${x - 14}px;top:${y - 14}px;width:28px;height:28px;border:2px solid #262019;border-radius:50%;z-index:20;pointer-events:none;transition:all .6s ease-out;opacity:1`; document.body.appendChild(d); requestAnimationFrame(() => { d.style.transform = 'scale(1.8)'; d.style.opacity = '0'; }); setTimeout(() => d.remove(), 700); }
// One optional Explore surface owns story navigation; the verified Cushing label stays on the map.
const flyLL = (ll, z, ms) => { const p = P(ll), k = KH * z; return wsel.transition().duration(ms).ease(d3.easeCubicInOut).call(zoom.transform, d3.zoomIdentity.translate(W / 2 + 60 - k * p[0], H / 2 + 30 - k * p[1]).scale(k)).end().catch(() => 0); };
function clickNear(pred) { let best = null; VIS.forEach(([s, a]) => { if (a < 0.9 || !pred(s)) return; const q = s.pts[Math.floor(s.pts.length / 2)], x = q[0] * T.k + T.x, y = q[1] * T.k + T.y; if (x < 480 || x > W - 120 || y < 140 || y > H - 120) return; if (!best || s.t > best[0].t) best = [s, x, y]; });
  if (!best) return false; ripple(best[1], best[2]); const h = hit(best[1], best[2]); if (h) openCard(h); return true; }
async function tour() { // ~27 s: continuous named routes, in-place selection and dollars
  closeCard(); wsel.call(zoom.transform, homeT()); settle(); await sleep(1800);
  for(const [ll,z,name] of [[[-77,37.8],4,'I-95'],[[-85.5,38.4],3.2,'Ohio'],[[-97.5,43.2],2.9,'Northern Natural']]) {
    closeCard(); await flyLL(ll,z,3200); await sleep(350);
    const r=ROUTES.find(r=>r.ss[0].n.startsWith(name));
    let point=null;
    if(r) for(const g of r.geom||[]) {for(const q of g.samples) {const x=Math.round(q.x*T.k+T.x),y=Math.round(q.y*T.k+T.y);if(x<500||x>W-100||y<160||y>H-150)continue;const h=hit(x,y);if(h&&h.type==='seg'&&h.key===r.key){point=[x,y,h];break;}}if(point)break;}
    if(point){ripple(point[0],point[1]);openCard(point[2]);} await sleep(2900);
  }
  closeCard(); await wsel.transition().duration(2200).call(zoom.transform,homeT()).end().catch(()=>0);
  setUnit('usd'); await sleep(2300); return 'done';
}

// ---------------------------------------------------------------- Alaska & Hawaii: framed atlas insets (screen space, clipped to their
// boxes so nothing can fall outside them; they fade out once you zoom in, so they never sit fixed on a zoomed map)
const insG = lab.append('g').attr('class', 'insets');
function refreshInsetLayers(){insG.selectAll('.inset-airport').style('display',LAYERS.on('airports')?null:'none').style('pointer-events',LAYERS.on('airports')?null:'none');insG.selectAll('.inset-metro').style('display',LAYERS.on('metros')?null:'none').style('pointer-events',LAYERS.on('metros')?null:'none');}
function refreshInsetSelection(){insG.selectAll('.inset-airport').attr('stroke',c=>SEL?.type==='airport'&&SEL.c===c?'#262019':'#7b6587').attr('stroke-width',c=>SEL?.type==='airport'&&SEL.c===c?2.2:1.2);}
function buildInsets() {
  insG.selectAll('*').remove();
  const one = (bx, title, feat, rot, par, zs) => {
    const id='clip-'+title.toLowerCase(),g=insG.append('g');
    g.append('clipPath').attr('id',id).append('rect').attr('x',bx.x).attr('y',bx.y).attr('width',bx.w).attr('height',bx.h);
    g.append('rect').attr('x',bx.x).attr('y',bx.y).attr('width',bx.w).attr('height',bx.h).attr('fill','#dfe3dc').attr('stroke','#262019').attr('stroke-width',.9);
    const airports=AIRPORTS.filter(c=>c.p.st===(title==='Alaska'?'AK':'HI'));
    // Keep every island and source anchor inside the same projection fit, not just the land boundary.
    const fit={type:'FeatureCollection',features:[{type:'Feature',geometry:feat.type==='Feature'?feat.geometry:feat},...zs.map(z=>({type:'Feature',geometry:{type:'Point',coordinates:z.ll}})),...airports.map(c=>({type:'Feature',geometry:{type:'Point',coordinates:c.p.ll}}))]};
    const pj=d3.geoConicEqualArea().rotate(rot).parallels(par).fitExtent([[bx.x+10,bx.y+25],[bx.x+bx.w-10,bx.y+bx.h-12]],fit);
    const cg=g.append('g').attr('clip-path',`url(#${id})`);
    cg.append('path').attr('d',d3.geoPath(pj)(feat)).attr('fill','#f8f3e4').attr('stroke','#8c9a9c').attr('stroke-width',.7);
    const action=(node,name,fn)=>{node.attr('role','button').attr('tabindex',0).attr('aria-label',name).style('pointer-events','all').style('cursor','pointer').on('click',ev=>{ev.stopPropagation();fn();}).on('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();ev.stopPropagation();fn();}});};
    zs.forEach((z,i)=>{
      const mg=cg.append('g').attr('class','inset-metro').datum(z),[x,y]=pj(z.ll),v=z.o[0]+z.o[2];
      if(!AtlasBridge.regionLabel(z.n).priority) mg.append('circle').attr('cx',x).attr('cy',y).attr('r',Math.min(9,Math.max(2.5,2+Math.sqrt(v/4e6)))).attr('fill','rgba(132,163,128,0.35)').attr('stroke','rgb(92,125,90)');
      // Long scope names use a separate compact row, so neither right edge nor airport symbols clip them.
      label(mg,bx.x+7,bx.y+bx.h-6-i*13,AtlasBridge.regionLabel(z.n).name,{size:9,cls:'sans',weight:600,haloColor:'#f8f3e4'});
      action(mg,z.n,()=>{if(LAYERS.on('metros'))openCard({type:'city',c:{z,n:z.n,v,xy:P(z.ll)},xy:P(z.ll)});});
    });
    airports.forEach(c=>{const [x,y]=pj(c.p.ll);c.insetXY=[x,y];const mark=cg.append('path').datum(c).attr('class','inset-airport').attr('d',`M${x},${y-4}l4,4l-4,4l-4,-4Z`).attr('fill','#f8f3e4').attr('stroke','#7b6587').attr('stroke-width',1.2);action(mark,c.p.n,()=>{if(LAYERS.on('airports'))openCard({type:'airport',c,xy:c.xy.slice()});});});
    g.append('rect').attr('x',bx.x).attr('y',bx.y).attr('width',bx.w).attr('height',16).attr('fill','#f5efdd').attr('stroke','#262019').attr('stroke-width',.6);
    label(g,bx.x+7,bx.y+11.5,title.toUpperCase(),{size:9,cls:'sans',track:'0.16em',halo:false,weight:600});g.selectAll('text').style('font-family','InterA');
  };
  const mobile=W<600,total=mobile?W-32:370,gap=10,akW=mobile?(total-gap)*.57:210,x=mobile?16:W-total-26,y=H-(mobile?180:220),ak={x,y,w:akW,h:mobile?124:160},hi={x:x+akW+gap,y:y+(mobile?0:50),w:total-akW-gap,h:mobile?124:110};
  one(ak,'Alaska',A.ak,[154,0],[55,65],PZ.zones.filter(z=>z.z==='020'));
  one(hi,'Hawaii',A.hi,[157,0],[19,22],PZ.zones.filter(z=>z.z==='151'||z.z==='159'));refreshInsetLayers();refreshInsetSelection();
}
function insetFade() { const z = T.k / KH, a = Math.max(0, Math.min(1, (1.6 - z) / 0.4)); insG.attr('opacity', a).style('display', a > 0.02 ? null : 'none').style('pointer-events', a > 0.5 ? null : 'none'); }

function resize() { W = innerWidth; H = innerHeight; svg.attr('width', W).attr('height', H); lab.attr('width', W).attr('height', H); cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
function applyCamera(camera){
 if(!camera||![camera.k,camera.x,camera.y].every(Number.isFinite)||camera.k<.8||camera.k>60)throw Error('Invalid raw map camera');
 wsel.call(zoom.transform,d3.zoomIdentity.translate(camera.x,camera.y).scale(camera.k));return settle();
}
function selectedPlace(){
 if(!SEL)return null;return{type:SEL.type,layer:InfoLayers.key(SEL),id:SEL.type==='seg'?AtlasBridge.sourceID(SEL.s):String(SEL.r?.id??SEL.c?.p?.id??SEL.c?.z?.z),name:SEL.s?corrName(SEL.s):SEL.r?.n??SEL.c?.n,ll:(SEL.ll||proj.invert(SEL.xy)).slice(),mapXY:SEL.xy.slice()};
}
function selectPlace(place){
 if(!place||typeof place.id!=='string'||!['city','reg','port','airport','seg'].includes(place.type))return false;
 if(!place.point&&place.type!=='seg'){
  const rows=place.type==='city'?CITY.filter(c=>String(c.z.z)===place.id):place.type==='reg'?REG.filter(r=>String(r.id)===place.id):(place.type==='airport'?AIRPORTS:PORTS).filter(c=>String(c.p.id)===place.id);
  if(rows.length!==1)return false;const item=rows[0],h=place.type==='reg'?{type:'reg',r:item,xy:item.xy.slice()}:{type:place.type,c:item,xy:item.xy.slice()};if(!LAYERS.visible(h))return false;openCard(h);return true;
 }
 const id=place.id;let h=null,xy=null;
 try{if(place.point)xy=AtlasBridge.project(place.point,proj);}catch{return false;}
 if(place.type==='seg'){
  const s=AtlasBridge.resolveSource(id,SEGS);if(!s||!LAYERS.on(s.m)||!xy||!VIS.some(([v,a])=>v===s&&a>.02))return false;
  let nearest=null;const consider=(a,b)=>{const q=ClickedPlace.nearest(xy,a,b);if(q.s===s&&(!nearest||q.distance<nearest.distance))nearest=q;};
  for(const r of RVIS)for(const g of r.pickGeom||r.geom||[])for(let j=1;j<g.samples.length;j++)consider(g.samples[j-1],g.samples[j]);
  if(!s.display){const pts=s.dp||s.pts;for(let j=1;j<pts.length;j++)consider({x:pts[j-1][0],y:pts[j-1][1],s},{x:pts[j][0],y:pts[j][1],s});}
  if(!nearest||nearest.distance*T.k>12)return false;h={type:'seg',s,xy,key:corrKey(s)};
 }
 if(place.type==='city'){
  const rows=PZ.zones.filter(z=>String(z.z)===id);if(rows.length!==1)return false;const z=rows[0],c=CITY.find(c=>String(c.z.z)===id)||{z,n:z.n,v:z.o?.[0]+z.o?.[2],xy:P(z.ll)};h={type:'city',c,xy:xy||c.xy.slice()};
 }
 if(place.type==='port'){
  const rows=PZ.ports.filter(p=>String(p.id)===id);if(rows.length!==1)return false;const p=rows[0],c=PORTS.find(c=>String(c.p.id)===id)||{p,n:p.n,v:p.v[0]+p.v[1],xy:P(p.ll)};h={type:'port',c,xy:xy||c.xy.slice()};
 }
 if(place.type==='airport'){const rows=AIRPORTS.filter(c=>String(c.p.id)===id);if(rows.length!==1)return false;const c=rows[0];h={type:'airport',c,xy:xy||c.xy.slice()};}
 if(place.type==='reg'){const rows=REG.filter(r=>String(r.id)===id);if(rows.length!==1)return false;const r=rows[0];h={type:'reg',r,xy:xy||r.xy.slice()};}
 if(!h||!LAYERS.visible(h))return false;
 if(place.type!=='seg'&&place.type!=='reg'&&xy){const anchors=place.type==='city'?[h.c.xy,P(h.c.z.ll)]:[h.c.xy];if(!anchors.some(p=>Math.hypot(p[0]-xy[0],p[1]-xy[1])*T.k<12))return false;}
 if(place.type==='reg'&&xy&&h.r.p2){ctx.save();ctx.setTransform(1,0,0,1,0,0);const inside=h.r.pt?Math.hypot(xy[0]-h.r.xy[0],xy[1]-h.r.xy[1])*T.k<12:ctx.isPointInPath(h.r.p2,xy[0],xy[1]);ctx.restore();if(!inside)return false;}
 openCard(h);return true;
}
function getView(){
 const s=selectedPlace();return AtlasExplore.validateView({v:1,camera:AtlasBridge.geoCamera({k:T.k,x:T.x,y:T.y},proj,W,H,KH),unit:UNIT,layers:InfoLayers.keys.filter(k=>LAYERS.on(k)).map(k=>k==='metros'?'cities':k),selection:s?{type:s.type,id:s.id,point:s.ll}:null});
}
function applyView(view){
 const v=AtlasExplore.validateView(view),raw=AtlasBridge.rawCamera(v.camera,proj,W,H,KH);
 closeCard();setUnit(v.unit,true);for(const k of InfoLayers.keys)setLayer(k,v.layers.includes(k==='metros'?'cities':k));return applyCamera(raw);
}
function resetView(){
 closeCard();setUnit('t',true);for(const k of InfoLayers.keys)setLayer(k,true);return applyCamera(homeT());
}
// end map adapters
window.APP = { getView,applyView,reset:resetView,framePlace:camera=>AtlasBridge.frameCamera(camera,proj,W,H,KH),camera:()=>({k:T.k,x:T.x,y:T.y}),applyCamera,selectedPlace,selectPlace,sourceMetadata:()=>SEL?InfoInspector.source(SEL,UNIT):null,metroFacts:()=>{const selected=SEL,unit=UNIT;return selected?.type==='city'?MetroDetails.load().then(d=>MetroDetails.card(selected.c.z,d.zones[selected.c.z.z],unit)):null;},layers:()=>LAYERS.snapshot(),setLayer,tour, setUnit, settle, regs: () => REG.filter(r => r.a > 0.5).map(r => r.id), T: () => ({ k: T.k / KH, x: T.x, y: T.y }), thr: () => thr(), flyLL, openCard, closeCard, hit, screenOf: ll => { const p = P(ll); return [p[0] * T.k + T.x, p[1] * T.k + T.y]; },
  // every drawn (opaque) stroke must be clickable at its midpoint; markers must move with the map
  probe() { let ok = 0, bad = 0; VIS.forEach(([s, a]) => { if (a < 0.9) return; const q = s.pts[Math.floor(s.pts.length / 2)], x = q[0] * T.k + T.x, y = q[1] * T.k + T.y; if (x < 0 || y < 0 || x > W || y > H) return; const h = hit(x, y); if (h && h.type === 'seg') ok++; else if (h) ok++; else bad++; }); return { ok, bad }; },
  clickedPlace:()=>SEL?{type:SEL.type,sourceId:SEL.s?.i??SEL.r?.id??SEL.c?.p?.id??SEL.c?.z?.z,rawEdge:SEL.s?.graph?.edge??null,name:SEL.s?corrName(SEL.s):SEL.r?.n??SEL.c?.n,mapXY:SEL.xy.slice(),ll:SEL.ll.slice(),screenXY:[SEL.xy[0]*T.k+T.x,SEL.xy[1]*T.k+T.y],unit:UNIT,facts:ClickedPlace.facts(SEL,UNIT),markerRadiusPx:6,insetScreenXY:LAYERS.visible(SEL)&&SEL.c?.insetXY&&T.k/KH<1.4?SEL.c.insetXY.slice():null}:null,
  localSamples:(mode,limit=80)=>{const out=[];for(const r of RVIS)for(const g of r.pickGeom||r.geom)for(let j=1;j<g.samples.length;j++){const a=g.samples[j-1],b=g.samples[j];if(b.s.m!==mode)continue;const sx=(a.x+b.x)/2*T.k+T.x,sy=(a.y+b.y)/2*T.k+T.y;if(sx<0||sx>W||sy<0||sy>H)continue;const h=hit(sx,sy);if(h?.type==='seg'&&h.s.i===b.s.i){out.push({sourceId:h.s.i,name:corrName(h.s),screen:[sx,sy],mapXY:h.xy,ll:proj.invert(h.xy),tons:h.s.t,dollars:h.s.u});if(out.length>=limit)return out;}}return out;},
  sites:()=>({airports:AIRPORTS.map(c=>({id:c.p.id,ll:c.p.ll,xy:c.xy,a:c.a,r:c.r})),ports:PORTS.map(c=>({id:c.p.id,ll:c.p.ll,a:c.a})),metros:CITY.map(c=>({id:c.z.z,name:c.n,ll:proj.invert(c.xy)})),regions:REG.map(r=>({id:r.id,name:r.n,a:r.a}))}),
  scene:()=>({layers:LAYERS.snapshot(),camera:{k:T.k,x:T.x,y:T.y},unit:UNIT,visibleSourceIds:VIS.map(([s])=>s.i),renderGroups:RVIS.map(r=>r.id),requiredSourceIds:[...OWNER.required.ids],ownerGeneration:OWNER.generation,tileCache:TILE_READER.status?TILE_READER.status():null}),
  vis: () => window.__draw };
window.addEventListener('pagehide',e=>{
  if(e.persisted)return;
  clearTimeout(settleT);cancelPrefetch();BoundedTiles.prefetch.dispose();GESTURE.dispose();cameraGeneration++;DRAW_FRAME.dispose();REFRESH_FRAME.dispose();VIEW_INDEX.cells.clear();VIEW_INDEX.wide.length=0;ROUTE_INDEX.order.clear();ROUTE_INDEX.named.clear();DETAIL_BUDGET.touched.clear();wsel.interrupt();SEL=null;HOV=null;VIS.length=0;RVIS.length=0;
  RoadCorridors.dispose();window.ROAD_CORRIDORS=null;SoutheastCoarse.dispose();if(window.RoadGeometry)RoadGeometry.dispose();RailRuntime.dispose();
  OWNER.dispose();DataLifecycle.dispose({PZ,SEGS,REG,ROUTES,DISPLAY,INHERITED_DISPLAY});RBY.clear();
  window.RAIL_GEOMETRY=null;window.RAIL_ADMISSION=null;window.ROAD_GEOMETRY=null;
});
Promise.all([document.fonts.load('600 12px InterA'), document.fonts.load('12px Garamond'), document.fonts.load('italic 12px Garamond')]).catch(() => 0).then(() => {
  resize(); buildInsets(); wsel.call(zoom.transform, homeT());settle().then(()=>{insetFade();if(StartupPreparation.state.prepared){StartupPreparation.state.ready();schedulePrefetch();document.body.setAttribute('data-ready', '1');document.body.dataset.preparation='national-regional';AtlasBridge.boot(window.APP);}else{StartupPreparation.limited();document.body.dataset.preparation='limited-streamed';}}).catch(e=>{StartupPreparation.state.fail(e);if(VIS.length)StartupPreparation.limited();});
});

window.REPLACEMENT_OWNER=OWNER;
