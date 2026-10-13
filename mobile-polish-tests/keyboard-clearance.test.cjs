const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const base=__dirname+'/../site/public/projects/freight-atlas/map/',css=fs.readFileSync(base+'atlas-bridge.css','utf8');
test('software keyboard-height viewport reserves readable collapsed inspector and hides expanded card',()=>{
 const m={exports:{}};vm.runInNewContext(fs.readFileSync(base+'atlas-bridge.js','utf8'),{module:m});
 const bottom=m.exports.controlsBottom({getBoundingClientRect:()=>({bottom:62}),querySelectorAll:()=>[]});
 assert.equal(bottom,70,'no masthead allowance in measured card flow');
 assert.ok(360-bottom-76>200,'single-row inspector allowance at keyboard height');
 assert.ok(css.includes('max-height:calc(100dvh - var(--atlas-controls-bottom,calc(max(16px,env(safe-area-inset-top)) + 54px)) - 76px'));
 assert.ok(css.includes('#atlas-controls:has(#layers-panel[open])~#card{visibility:hidden}'));
 assert.ok(css.includes('#atlas-controls:has(#atlas-menu[open])~#card{visibility:hidden}'));
});
