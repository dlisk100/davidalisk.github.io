/* Candidate acceleration only: bounding boxes are not admission authority. */
'use strict';
const ViewWork=(()=>{
 class Grid {
  constructor(rows,cell=48){this.cell=cell;this.rebuild(rows)}
  rebuild(rows){this.rows=rows;this.cells=new Map();this.wide=[];for(let i=0;i<rows.length;i++){const b=rows[i].bb,x0=Math.floor(b[0]/this.cell),y0=Math.floor(b[1]/this.cell),x1=Math.floor(b[2]/this.cell),y1=Math.floor(b[3]/this.cell);if((x1-x0+1)*(y1-y0+1)>256){this.wide.push(i);continue}for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const key=x+','+y;let a=this.cells.get(key);if(!a)this.cells.set(key,a=[]);a.push(i)}}}
  query(b){const ids=new Set(this.wide);const x0=Math.floor(b[0]/this.cell),y0=Math.floor(b[1]/this.cell),x1=Math.floor(b[2]/this.cell),y1=Math.floor(b[3]/this.cell);if((x1-x0+1)*(y1-y0+1)>10000)return this.rows.filter(s=>!(s.bb[2]<b[0]||s.bb[0]>b[2]||s.bb[3]<b[1]||s.bb[1]>b[3]));for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(const i of this.cells.get(x+','+y)||[])ids.add(i);return [...ids].sort((a,b)=>a-b).map(i=>this.rows[i]).filter(s=>!(s.bb[2]<b[0]||s.bb[0]>b[2]||s.bb[3]<b[1]||s.bb[1]>b[3]))}
 }
 class Frame {
  constructor(raf=fn=>requestAnimationFrame(fn),cancel=id=>cancelAnimationFrame(id)){this.raf=raf;this.cancel=cancel;this.id=null;this.fn=null}
  request(fn){this.fn=fn;if(this.id!==null)return;this.id=this.raf(()=>{this.id=null;const f=this.fn;this.fn=null;if(f)f()})}
  dispose(){if(this.id!==null)this.cancel(this.id);this.id=null;this.fn=null;}
  flush(){if(this.id!==null)this.cancel(this.id);this.id=null;const f=this.fn;this.fn=null;if(f)f()}
 }
 function paintMesh(p,samples,k,extra=0){p.beginPath();for(let j=0;j<samples.length;j++){const q=samples[j],h=(q.w+extra)/(2*k);p.moveTo(q.x+h,q.y);p.arc(q.x,q.y,h,0,Math.PI*2);p.closePath();if(!j)continue;const a=samples[j-1],dx=q.x-a.x,dy=q.y-a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,ha=(a.w+extra)/(2*k);p.moveTo(a.x-nx*ha,a.y-ny*ha);p.lineTo(q.x-nx*h,q.y-ny*h);p.lineTo(q.x+nx*h,q.y+ny*h);p.lineTo(a.x+nx*ha,a.y+ny*ha);p.closePath();}p.fill();}
 class RouteIndex {
  constructor(rows,key){this.order=new Map(rows.map((r,i)=>[r,i]));this.named=new Map();for(const r of rows)for(const k of new Set(r.ss.map(key))){let a=this.named.get(k);if(!a)this.named.set(k,a=[]);a.push(r)}}
  query(visible,selected=null,on=null){const set=new Set(visible);for(const r of this.named.get(selected)||[])set.add(r);return [...set].sort((a,b)=>Number(a===on)-Number(b===on)||this.order.get(a)-this.order.get(b))}
 }
 function mesh(samples,k,extra=0,Path=Path2D){const p=new Path();paintMesh({beginPath(){},moveTo:(...a)=>p.moveTo(...a),lineTo:(...a)=>p.lineTo(...a),arc:(...a)=>p.arc(...a),closePath:()=>p.closePath(),fill(){}},samples,k,extra);return p;}
 class Batch {constructor(ctx){this.ctx=ctx;this.col=null;this.count=0;}flush(){if(this.col!==null){this.ctx.fill();this.col=null;this.count=0;}}add(col,samples,k,extra=0){if(col!==this.col||this.count+samples.length>1024){this.flush();this.col=col;this.ctx.fillStyle=col;this.ctx.beginPath();}this.count+=samples.length;const p=this.ctx;paintMesh({beginPath(){},moveTo:(...a)=>p.moveTo(...a),lineTo:(...a)=>p.lineTo(...a),arc:(...a)=>p.arc(...a),closePath:()=>p.closePath(),fill(){}},samples,k,extra);}}
 // The canvas itself is the retained bitmap: compositor transforms avoid copies,
 // mesh painting and changes to exact settled rendering. No picking while dirty.
 class Gesture {
  constructor(settle,{delay=120,setTimer=(f,ms)=>setTimeout(f,ms),clearTimer=id=>clearTimeout(id)}={}){this.settle=settle;this.delay=delay;this.setTimer=setTimer;this.clearTimer=clearTimer;this.timer=null;this.active=false;this.dirty=false;this.base=null;this.camera=null;this.retired=false;this.epoch=0;}
  cancel(){this.epoch++;if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;}
  start(){this.cancel();this.active=true;}
  change(camera){this.cancel();this.camera={k:camera.k,x:camera.x,y:camera.y};this.dirty=true;}
  end(){this.active=false;this.cancel();const epoch=this.epoch;if(!this.dirty)return;this.timer=this.setTimer(()=>{this.timer=null;if(!this.retired&&!this.active&&epoch===this.epoch)this.settle();},this.delay);}
  relative(){if(!this.base||!this.camera)return{scale:1,x:0,y:0};const scale=this.camera.k/this.base.k;return{scale,x:this.camera.x-scale*this.base.x,y:this.camera.y-scale*this.base.y};}
  commit(camera){this.cancel();this.base={k:camera.k,x:camera.x,y:camera.y};this.camera=this.base;this.dirty=false;}
  canPick(){return !this.active&&!this.dirty&&!this.retired;}
  dispose(){this.retired=true;this.cancel();}
 }
 return {Grid,Frame,Gesture,paintMesh,mesh,Batch,RouteIndex};
})();
if(typeof module!=='undefined')module.exports=ViewWork;
