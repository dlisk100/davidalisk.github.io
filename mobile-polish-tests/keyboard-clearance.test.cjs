const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../site/public/projects/freight-atlas/map/atlas-bridge.css'),'utf8');
test('software keyboard-height viewport reserves a readable collapsed inspector',()=>{
 // Source box model independently cross-checked with the actual 393x360 hosted receipt:
 // safe top 16 + dock 134 + two 46px disclosures + gap 6 + border/clearance 10 = 256.
 const ordinary=Number(css.match(/top:calc\(max\(16px,env\(safe-area-inset-top\)\) \+ (\d+)px\);z-index:10/)[1]);
 const override=css.match(/@media\(max-width:600px\) and \(max-height:400px\)\{\s*#atlas-controls\{top:calc\(max\(16px,env\(safe-area-inset-top\)\) \+ (\d+)px\)/);
 const offset=override?Number(override[1]):ordinary;
 const top=16+offset+46+6+46+8;
 const height=360-top-76;
 assert.ok(height>50,`actual CSS inspector allowance ${height}px at 393x360 (dock top ${16+offset})`);
 assert.ok(16+offset>=102,'dock remains below header and aligned alongside tools, not over the masthead');
});
