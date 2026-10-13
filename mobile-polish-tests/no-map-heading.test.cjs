const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=__dirname+'/../site/public/projects/freight-atlas/map/',read=n=>fs.readFileSync(base+n,'utf8');
test('map masthead is fully hidden without removing the national fact sink or loading title',()=>{
 const html=read('index.html');
 assert.match(html,/<div id="title" hidden>/);
 assert.match(read('atlas-bridge.css'),/#title\[hidden\]\{display:none!important\}/);
 assert.match(html,/id="national-headline"/);
 assert.match(html,/<header class="startup-mast"><span>U.S. Freight Atlas<\/span>/);
});
test('compact chrome measures controls, not a hidden masthead; initial card and panels use the reclaimed row',()=>{
 const js=read('atlas-bridge.js'),css=read('atlas-bridge.css');
 assert.doesNotMatch(js,/title\.getBoundingClientRect\(\)\.bottom\+6/);
 assert.match(css,/top:max\(16px,env\(safe-area-inset-top\)\)/);
 assert.doesNotMatch(css,/--atlas-toolbar-top,102px|--atlas-controls-bottom,154px/);
 assert.match(css,/--atlas-controls-bottom,calc\(max\(16px,env\(safe-area-inset-top\)\) \+ 54px\)/);
});
