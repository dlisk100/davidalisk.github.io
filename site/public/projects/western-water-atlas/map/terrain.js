// M8 close-zoom terrain: AWS Terrain Tiles (Terrarium, public dataset) decoded in the browser and shaded with the
// storybook recipe (NW light, lavender shadow, cream highlight, elevation snow). Lazy; never part of Ready.
export const TILE_URL='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const terrarium=(r,g,b)=>r*256+g+b/256-32768;
// Choose a tile zoom from on-screen pixels per degree (cam.s is CSS px per projected degree).
// Tuned down in M8 review: CSS-pixel density (no retina boost), one level coarser, max z10 — fewer, cheaper tiles.
export function terrainZoom(pxPerDeg,dpr=1){const d=pxPerDeg;if(d<120)return null;const z=Math.round(Math.log2(d*360/256)-1.0);return Math.max(8,Math.min(10,z))}
const lat2y=(lat,n)=>(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n;
const y2lat=(y,n)=>Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI;
export function tileBounds(z,x,y){const n=2**z;return {w:x/n*360-180,e:(x+1)/n*360-180,n:y2lat(y,n),s:y2lat(y+1,n)}}
export function tilesForView([w,s,e,n],z,cap=48){/* cap>48 lets callers measure the full count */const N=2**z,x0=Math.max(0,Math.floor((w+180)/360*N)),x1=Math.min(N-1,Math.floor((e+180)/360*N)),y0=Math.max(0,Math.floor(lat2y(n,N))),y1=Math.min(N-1,Math.floor(lat2y(s,N)));const out=[];const cx=(x0+x1)/2,cy=(y0+y1)/2;for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)out.push({z,x,y,d:Math.hypot(x-cx,y-cy)});out.sort((a,b)=>a.d-b.d);return out.slice(0,cap).map(({z,x,y})=>({z,x,y}))}
const LAND=[244,238,226],SHADOW=[116,104,180],HI=[255,241,207],ACCENT=[167,155,214];
// dem: Float32Array metres row-major (north first). Returns RGBA Uint8ClampedArray.
export function shade(dem,w,h,{lonSpan,latSpan,midLat,exaggeration=3.6}){const out=new Uint8ClampedArray(w*h*4),dx=lonSpan/w*111320*Math.cos(midLat*Math.PI/180),dy=latSpan/h*111320;
 const az=(360-315+90)*Math.PI/180,alt=45*Math.PI/180,flat=Math.sin(alt);const at=(x,y)=>dem[Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x))];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const gx=(at(x+1,y)-at(x-1,y))/(2*dx),gy=-(at(x,y+1)-at(x,y-1))/(2*dy),slope=Math.atan(exaggeration*Math.hypot(gx,gy)),aspect=Math.atan2(gy,-gx);
  const hs=Math.max(0,Math.min(1,Math.sin(alt)*Math.cos(slope)+Math.cos(alt)*Math.sin(slope)*Math.cos(az-aspect)));const sh=Math.pow(Math.max(0,(flat-hs)/flat),.85)*.7,li=Math.max(0,(hs-flat)/(1-flat))*.7,st=Math.max(0,Math.min(1,(slope-.5)/.5))*.22,sn=Math.pow(Math.max(0,Math.min(1,(at(x,y)-2100)/1200)),1.2)*.9;
  const i=4*(y*w+x);for(let c=0;c<3;c++){let v=LAND[c]+(SHADOW[c]-LAND[c])*sh+(HI[c]-LAND[c])*li;v+=(ACCENT[c]-v)*st;v+=(255-v)*sn;out[i+c]=v}out[i+3]=255}
 return out}
// Browser: fetch, decode, shade one tile into a canvas with its geographic bounds.
export async function loadTile({z,x,y},signal){const r=await fetch(TILE_URL.replace('{z}',z).replace('{x}',x).replace('{y}',y),{signal,mode:'cors'});if(!r.ok)throw Error('tile '+r.status);const bmp=await createImageBitmap(await r.blob());const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bmp,0,0);const d=g.getImageData(0,0,256,256).data,dem=new Float32Array(256*256);for(let i=0;i<dem.length;i++){const v=terrarium(d[4*i],d[4*i+1],d[4*i+2]);dem[i]=v<-100?0:v}
 const b=tileBounds(z,x,y),px=shade(dem,256,256,{lonSpan:b.e-b.w,latSpan:b.n-b.s,midLat:(b.n+b.s)/2,exaggeration:exaggerationFor(z)});g.putImageData(new ImageData(px,256,256),0,0);return {canvas:c,bounds:b,key:`${z}/${x}/${y}`}}
// Like the reference recipe, relief softens as you zoom in (finer tiles have steeper per-pixel slopes).
export const exaggerationFor=z=>({7:3.2,8:2.6,9:2.0,10:1.55,11:1.25})[z]??1.25;
export const ATTRIBUTION='Terrain: AWS Terrain Tiles (Mapzen Terrarium; USGS 3DEP/SRTM and others), Registry of Open Data on AWS.';
