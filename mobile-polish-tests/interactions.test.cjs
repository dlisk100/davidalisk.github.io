const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'../site/public/projects/freight-atlas/map');
function moduleOf(name,globals={}){const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(base,name),'utf8'),{module,...globals});return module.exports;}
class Element extends EventTarget{constructor(tag,doc){super();this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.value='';this.open=false;this.hidden=false;}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}setAttribute(k,v){this.attributes[k]=v;}focus(){this.ownerDocument.activeElement=this;}remove(){}querySelector(){return this.summary;}}
const tick=()=>new Promise(r=>setImmediate(r));
for(const width of [390,393,430,852])test(`production disclosure toggle/Escape/focus and clearance at ${width}px boundary`,()=>{
 const document={addEventListener(){},createElement(tag){return new Element(tag,this);},documentElement:{style:{setProperty(k,v){this[k]=v;}}}};
 const nodes=Object.fromEntries(['legend','layers-panel','title','atlas-controls','atlas-menu'].map(k=>[k,new Element('div',document)]));
 document.getElementById=id=>nodes[id];nodes.title.after=()=>{};
 for(const id of ['layers-panel','atlas-menu'])nodes[id].summary=new Element('summary',document);
 let resized;nodes['atlas-controls'].getBoundingClientRect=()=>({bottom:width===852?180:250});
 const bridge=moduleOf('atlas-bridge.js',{document,window:{addEventListener(){}},matchMedia:()=>({matches:width<=600,addEventListener(){}}),ResizeObserver:class{constructor(cb){resized=cb;}observe(){}}});
 bridge.compactChrome();const layers=nodes['layers-panel'],menu=nodes['atlas-menu'];
 layers.open=true;menu.open=true;layers.dispatchEvent(new Event('toggle'));assert.equal(menu.open,false);assert.equal(layers.open,true);
 const esc=new Event('keydown',{cancelable:true});esc.key='Escape';layers.dispatchEvent(esc);assert.equal(layers.open,false);assert.equal(document.activeElement,layers.summary);assert.equal(esc.defaultPrevented,true);
 menu.open=true;menu.dispatchEvent(new Event('toggle'));assert.equal(layers.open,false);menu.open=false;menu.dispatchEvent(new Event('toggle'));resized();assert.equal(document.documentElement.style['--atlas-controls-bottom'],width===852?'188px':'258px');
});
test('production selection rejects retained AK/HI source IDs and keeps lower48 anchors',()=>{
 const zlib=require('node:zlib'),window={};vm.runInNewContext(zlib.gunzipSync(fs.readFileSync(path.join(base,'core.js.gz'))).toString(),{window});const PZ=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(base,'plate.json.gz'))));
 const B=moduleOf('atlas-bridge.js'),AIRPORTS=window.A.air.airports.filter(p=>B.inLower48(p.ll)).map(p=>({p,xy:p.ll})),PORTS=PZ.ports.filter(p=>B.inLower48(p.ll)).map(p=>({p,xy:p.ll})),CITY=PZ.zones.filter(z=>B.inLower48(z.ll)).map(z=>({z,xy:z.ll}));let opened=0;
 const source=fs.readFileSync(path.join(base,'proto.js'),'utf8'),part=source.slice(source.indexOf('function selectPlace('),source.indexOf('\nfunction getView('));const c={AtlasBridge:B,AIRPORTS,PORTS,CITY,REG:[],PZ,LAYERS:{visible:()=>true},openCard:()=>opened++};vm.createContext(c);vm.runInContext(part,c);
 const hidden=window.A.air.airports.filter(p=>['AK','HI'].includes(p.st));assert.ok(hidden.length>=2);for(const p of hidden){assert.equal(c.selectPlace({type:'airport',id:String(p.id)}),false);assert.equal(c.selectPlace({type:'airport',id:String(p.id),point:p.ll}),false);}
 for(const z of PZ.zones.filter(z=>['020','151','159'].includes(z.z)))assert.equal(c.selectPlace({type:'city',id:String(z.z)}),false);
 assert.equal(opened,0);assert.equal(c.selectPlace({type:'airport',id:String(AIRPORTS[0].p.id)}),true);assert.equal(opened,1);
});
test('actual catalog retains lower48 search results and drops AK/HI; production result click selects',async()=>{
 const document={createElement(tag){return new Element(tag,this);}},mod=new (require('node:module'))(path.join(base,'explore-tools.js'));mod._compile(fs.readFileSync(path.join(base,'explore-tools.js'),'utf8'),path.join(base,'explore-tools.js'));const E=mod.exports,B=moduleOf('atlas-bridge.js');
 const catalog=JSON.parse(fs.readFileSync(path.join(base,'explore-catalog.json'),'utf8')).places;
 const places=catalog.filter(p=>B.inLower48(p.point));assert.ok(places.length>100);assert.ok(places.every(p=>!['AK','HI'].includes(p.state)));assert.ok(catalog.some(p=>!B.inLower48(p.point)));
 let selected=null,current={v:1,camera:{center:[-100,40],zoom:2},unit:'t',layers:['cities'],selection:null};
 const ui=E.mount({document,container:new Element('div',document),storage:null,places,getView:()=>current,applyView:async v=>{current=v;},select:async d=>{selected=d;return{status:'ok'};},clearSelection(){},reset(){}});
 ui.controls.query.value='Albany';ui.controls.query.dispatchEvent(new Event('input'));
 const button=ui.controls.results.children.find(x=>x.tagName==='button');assert.ok(button);const identity=button;
 ui.controls.query.dispatchEvent(new Event('change'));assert.equal(ui.controls.results.children.find(x=>x.tagName==='button'),identity,'unchanged query cannot replace pointer target');
 button.dispatchEvent(new Event('click'));await tick();assert.equal(selected.id,'361');assert.equal(selected.type,'city');
});
