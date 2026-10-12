const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const map=path.resolve(__dirname,'../site/public/projects/freight-atlas/map');
// Native hosted navigation observed Chromium's implicit /favicon.ico 404.
// Each editorial document must explicitly resolve the existing atlas icon.
for(const page of ['methods.html','data.html','about.html']) {
  test(`${page} explicitly resolves the existing atlas favicon`,()=>{
    const html=fs.readFileSync(path.join(map,page),'utf8');
    const icon=html.match(/<link\b[^>]*rel="icon"[^>]*href="([^"]+)"[^>]*>/);
    assert.ok(icon,'Missing explicit favicon; browser falls back to missing /favicon.ico');
    assert.equal(icon[1],'favicon.svg');
    assert.ok(fs.readFileSync(path.join(map,icon[1]),'utf8').includes('<svg'));
  });
}
