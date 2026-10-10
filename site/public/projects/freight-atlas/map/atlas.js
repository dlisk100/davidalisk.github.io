// Shared helpers for the atlas style frames (static SVG, d3 v7).
const NS = 'http://www.w3.org/2000/svg';
const C = {
  paper: '#f5efdd', ink: '#262019', sepia: '#5f4b38', water: '#e2e3d9', shore: '#8c9a9c', land: '#efe8d3',
  rose: 'rgb(207,137,142)', roseD: 'rgb(170,100,106)', roseL: 'rgb(234,162,167)', ochre: 'rgb(217,197,120)', ochreD: 'rgb(170,145,70)',
  slate: 'rgb(95,140,177)', slateD: 'rgb(70,108,140)', brown: 'rgb(130,88,59)', brownL: 'rgb(178,140,108)', sage: 'rgb(132,163,128)', sageD: 'rgb(92,125,90)', sageL: 'rgb(214,228,204)',
  paperD: '#e9e0c8', rule: '#8a7a62'
};

function fmt(v, unit) {
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(a >= 1e10 ? 1 : 2).replace(/\.0+$/, '') + ' B' + (unit ? ' ' + unit : '');
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace(/\.0$/, '') + ' M' + (unit ? ' ' + unit : '');
  if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + ' k' + (unit ? ' ' + unit : '');
  return Math.round(v) + (unit ? ' ' + unit : '');
}
const comma = d3.format(',');

// halo text
function label(g, x, y, txt, o = {}) {
  const t = g.append('text').attr('x', x).attr('y', y).text(txt)
    .attr('font-size', o.size || 12).attr('text-anchor', o.anchor || 'start')
    .attr('font-style', o.italic ? 'italic' : null).attr('font-weight', o.weight || null)
    .attr('letter-spacing', o.track || null).attr('fill', o.fill || C.ink)
    .attr('class', o.cls || null).attr('dominant-baseline', o.base || null)
    .attr('transform', o.rotate ? `rotate(${o.rotate},${x},${y})` : null);
  if (o.halo !== false) t.attr('paint-order', 'stroke').attr('stroke', o.haloColor || C.paper).attr('stroke-width', o.haloW || 3).attr('stroke-linejoin', 'round');
  return t;
}

// double-rule plate border
function plate(svg, W, H, m = 14) {
  svg.append('rect').attr('x', m).attr('y', m).attr('width', W - 2 * m).attr('height', H - 2 * m).attr('fill', 'none').attr('stroke', C.ink).attr('stroke-width', 1.6);
  svg.append('rect').attr('x', m + 4).attr('y', m + 4).attr('width', W - 2 * m - 8).attr('height', H - 2 * m - 8).attr('fill', 'none').attr('stroke', C.ink).attr('stroke-width', 0.5);
}
function box(g, x, y, w, h, o = {}) {
  g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('fill', o.fill || C.paper).attr('stroke', C.ink).attr('stroke-width', o.sw || 0.9);
  if (o.double) g.append('rect').attr('x', x + 3).attr('y', y + 3).attr('width', w - 6).attr('height', h - 6).attr('fill', 'none').attr('stroke', C.ink).attr('stroke-width', 0.4);
}

// scale bar in miles for a projection near a point
function scaleBar(g, proj, lonlat, x, y, miles, o = {}) {
  const [lon, lat] = lonlat;
  const dLon = miles / (69.172 * Math.cos(lat * Math.PI / 180));
  const a = proj([lon, lat]), b = proj([lon + dLon, lat]);
  const px = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = o.ticks || 2, seg = px / n;
  for (let i = 0; i < n; i++) g.append('rect').attr('x', x + i * seg).attr('y', y).attr('width', seg).attr('height', 3.2).attr('fill', i % 2 ? C.paper : C.ink).attr('stroke', C.ink).attr('stroke-width', 0.6);
  label(g, x, y + 13, '0', { size: o.size || 9.5, anchor: 'middle', halo: false });
  label(g, x + px, y + 13, miles + ' mi', { size: o.size || 9.5, anchor: 'middle', halo: false });
  return px;
}

// ---------- illustrated vehicles (clean line icons, ~1 unit = 1px at scale 1) ----------
function defs(svg) {
  const d = svg.append('defs');
  // truck: cab + trailer, side view, facing +x
  const tr = d.append('g').attr('id', 'truck');
  tr.append('rect').attr('x', -11).attr('y', -4.6).attr('width', 14).attr('height', 6.2).attr('rx', 0.6).attr('fill', C.paper).attr('stroke', C.ink).attr('stroke-width', 0.8);
  tr.append('path').attr('d', 'M3.6,-3.4 h3.6 l2.6,2.6 v2.4 h-6.2 z').attr('fill', C.ochre).attr('stroke', C.ink).attr('stroke-width', 0.8).attr('stroke-linejoin', 'round');
  tr.append('path').attr('d', 'M5,-2.6 h2 l1.5,1.5 h-3.5z').attr('fill', C.paper);
  [-8.5, -5.6, 7.2].forEach(cx => tr.append('circle').attr('cx', cx).attr('cy', 2).attr('r', 1.35).attr('fill', C.ink));
  // train: loco + 2 cars
  const tn = d.append('g').attr('id', 'train');
  tn.append('path').attr('d', 'M2,-4.5 h7 l2.5,2.5 v3.5 h-9.5z').attr('fill', C.slate).attr('stroke', C.ink).attr('stroke-width', 0.75).attr('stroke-linejoin', 'round');
  tn.append('rect').attr('x', -8.6).attr('y', -3.8).attr('width', 9.8).attr('height', 5.3).attr('fill', C.paper).attr('stroke', C.ink).attr('stroke-width', 0.75);
  tn.append('rect').attr('x', -19.4).attr('y', -3.8).attr('width', 9.8).attr('height', 5.3).attr('fill', C.paper).attr('stroke', C.ink).attr('stroke-width', 0.75);
  [-17.5, -11.6, -6.6, -0.8, 4, 9].forEach(cx => tn.append('circle').attr('cx', cx).attr('cy', 2.2).attr('r', 1.05).attr('fill', C.ink));
  // ship: hull + bridge + containers, side view
  const sh = d.append('g').attr('id', 'ship');
  sh.append('path').attr('d', 'M-13,-1 h26 l-3.2,5 h-20.4z').attr('fill', C.ink);
  sh.append('rect').attr('x', -9).attr('y', -4.2).attr('width', 5).attr('height', 3.2).attr('fill', C.rose).attr('stroke', C.ink).attr('stroke-width', 0.6);
  sh.append('rect').attr('x', -4).attr('y', -4.2).attr('width', 5).attr('height', 3.2).attr('fill', C.slate).attr('stroke', C.ink).attr('stroke-width', 0.6);
  sh.append('rect').attr('x', 1).attr('y', -4.2).attr('width', 5).attr('height', 3.2).attr('fill', C.ochre).attr('stroke', C.ink).attr('stroke-width', 0.6);
  sh.append('path').attr('d', 'M7.5,-1 v-6 h3.2 v6z').attr('fill', C.paper).attr('stroke', C.ink).attr('stroke-width', 0.7);
  // tanker: low hull + deck pipe + aft house
  const tk = d.append('g').attr('id', 'tanker');
  tk.append('path').attr('d', 'M-14,-1 h28 l-3,4.6 h-22z').attr('fill', C.brown).attr('stroke', C.ink).attr('stroke-width', 0.7);
  tk.append('path').attr('d', 'M-10,-1 v-1.3 h15 v1.3').attr('fill', 'none').attr('stroke', C.ink).attr('stroke-width', 0.7);
  tk.append('path').attr('d', 'M7,-1 v-5.5 h4 v5.5z').attr('fill', C.paper).attr('stroke', C.ink).attr('stroke-width', 0.7);
  // plane: top view, nose to +x
  const pl = d.append('g').attr('id', 'plane');
  pl.append('path').attr('d', 'M10,0 C10,-1 8.5,-1.6 7,-1.6 L2,-1.6 L-3,-9 L-5.5,-9 L-2.5,-1.6 L-8,-1.6 L-10,-4.6 L-11.6,-4.6 L-10.4,0 L-11.6,4.6 L-10,4.6 L-8,1.6 L-2.5,1.6 L-5.5,9 L-3,9 L2,1.6 L7,1.6 C8.5,1.6 10,1 10,0Z')
    .attr('fill', C.paper).attr('stroke', C.ink).attr('stroke-width', 0.8).attr('stroke-linejoin', 'round');
  // hatch patterns
  const hp = (id, color, w = 5, sw = 0.8, rot = 45) => d.append('pattern').attr('id', id).attr('patternUnits', 'userSpaceOnUse').attr('width', w).attr('height', w).attr('patternTransform', `rotate(${rot})`)
    .append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', w).attr('stroke', color).attr('stroke-width', sw);
  hp('hatchRose', C.rose, 4.5, 1.1); hp('hatchBrown', C.brown, 4, 0.9, -45); hp('hatchRoseFine', C.roseD, 6, 0.7);
  hp('hatchSage', C.sageD, 5, 0.8, -45);
  return d;
}
function icon(g, id, x, y, angle = 0, s = 1) {
  let a = angle; let flip = 1;
  if (id !== 'plane' && (a > 90 || a < -90)) { a = a + 180; flip = -1; }   // keep vehicles upright
  return g.append('use').attr('href', '#' + id).attr('transform', `translate(${x},${y}) rotate(${a}) scale(${s * flip},${s})`);
}
// point + angle at fraction t along a projected polyline
function along(pts, t) {
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let target = t * L;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const f = seg[i] ? Math.min(1, target / seg[i]) : 0; const p = pts[i], q = pts[i + 1];
      return [p[0] + f * (q[0] - p[0]), p[1] + f * (q[1] - p[1]), Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI];
    }
    target -= seg[i];
  }
}
function done() { document.body.setAttribute('data-ready', '1'); }
