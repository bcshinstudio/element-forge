'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
for(const dir of ['map-editor','mapeditor'])test(dir+' element appearance control and preview wiring',()=>{
 const root=path.resolve(__dirname,'../..',dir);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const art=fs.readFileSync(path.join(root,'artwork.js'),'utf8');
 assert.match(html,/<h2>Element<\/h2><label>Node appearance<select id="node-appearance">/);
 assert.equal((html.match(/id="node-appearance"/g)||[]).length,1);
 assert.match(app,/tool==='node:destination'\?'destination':'source'/);
 assert.match(app,/nodeArtwork\(map.nodeAppearance,\{element:id,role\}\)/);
 assert.match(app,/updateProperties\(\);\s*refreshElementArtwork\(\)/);
 assert.match(art,/\$\('node-appearance'\).value=map.nodeAppearance\?\?'classic';\s*refreshElementArtwork\(\)/);
});
