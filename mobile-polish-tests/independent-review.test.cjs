const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),path=require('node:path'),cp=require('node:child_process');
const root=path.join(__dirname,'../site/public/projects/freight-atlas/map'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const moduleB={exports:{}};vm.runInNewContext(read('atlas-bridge.js'),{module:moduleB});const B=moduleB.exports;
const window={};vm.runInNewContext(zlib.gunzipSync(fs.readFileSync(path.join(root,'core.js.gz'))).toString(),{window});const A=window.A,PZ=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'plate.json.gz'))));
test('independent retained anchors keep every lower48 state airport and Gulf place',()=>{
 const lower48=A.air.airports.filter(p=>!['AK','HI'].includes(p.st));assert.equal(lower48.length,28,'30 retained cargo airports minus Anchorage and Honolulu');for(const p of lower48)assert.ok(B.inLower48(p.ll),p.id+' '+p.n);
 const catalog=JSON.parse(read('explore-catalog.json')).places;
 for(const p of catalog.filter(p=>A.states.some(s=>s.id===p.state)))assert.ok(B.inLower48(p.point),p.name+' '+p.state);
 const gulf=PZ.regions.filter(r=>/gulf/i.test(r.id+' '+r.n));assert.ok(gulf.length);for(const r of gulf)assert.ok(B.inLower48(r.c),r.id);
 for(const p of PZ.ports.filter(p=>/houston|new orleans|mobile|tampa|galveston/i.test(p.n)))assert.ok(B.inLower48(p.ll),p.n);
 assert.ok(A.ak);assert.ok(A.hi);assert.ok(A.states.every(s=>!['AK','HI'].includes(s.id)));assert.equal(A.states.length,49,'48 states plus DC retained');
});
test('all excluded retained ports and region IDs rejected by actual selection seam, with and without coordinates',()=>{
 const source=read('proto.js'),part=source.slice(source.indexOf('function selectPlace('),source.indexOf('\nfunction getView('));let opened=0;
 const c={AtlasBridge:B,PZ,REG:PZ.regions.filter(r=>B.inLower48(r.c)).map(r=>({...r,xy:r.c})),AIRPORTS:[],PORTS:[],CITY:[],LAYERS:{visible:()=>true},openCard:()=>opened++};vm.createContext(c);vm.runInContext(part,c);
 const hidden=[...PZ.ports.filter(p=>!B.inLower48(p.ll)).map(p=>({type:'port',id:String(p.id),point:p.ll})),...PZ.regions.filter(r=>!B.inLower48(r.c)).map(r=>({type:'reg',id:String(r.id),point:r.c}))];
 assert.ok(hidden.length);for(const p of hidden){assert.equal(c.selectPlace(p),false,p.id);assert.equal(c.selectPlace({type:p.type,id:p.id}),false,p.id);}assert.equal(opened,0);
});
test('data, renderer and density bytes match accepted released base',()=>{
 for(const name of ['core.js.gz','plate.json.gz','pz-sys.js.gz','explore-catalog.json','route-render.js','info-inspector.js','owners.js','replacement-loader.js']){
  const current=fs.readFileSync(path.join(root,name));const original=cp.execFileSync('git',['show','40b37ef:site/public/projects/freight-atlas/map/'+name],{cwd:path.join(__dirname,'..'),maxBuffer:64*1024*1024});assert.deepEqual(current,original,name);
 }
 const diff=cp.execFileSync('git',['diff','40b37ef','c49e8c0','--','site/public/projects/freight-atlas/map/proto.js'],{cwd:path.join(__dirname,'..'),encoding:'utf8'});
 for(const line of diff.split('\n').filter(s=>/^[+-][^+-]/.test(s)))assert.ok(!/function thr\(|ROAD_FLOOR|ADMISSION_ZOOM|COUNTRY_BUDGET|new Worker\(/.test(line),'density/renderer policy changed: '+line);
});
