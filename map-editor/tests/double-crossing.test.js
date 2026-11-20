'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),G=require('../generator.js');
test('double crossing: 80 seeded three-element puzzles require two intersections',()=>{
 for(let i=0;i<80;i++){
  const a=G.generateDoubleCrossing(String(i));
  assert.equal(a.status,'verified',`seed ${i}: ${a.message}`);
  assert.equal(a.verification.routes.length,3);
  assert.deepEqual(E.checkAll(a.map,a.verification.routes,a.verification.placements),[]);
  assert.equal(Object.values(a.verification.placements).filter(v=>E.placementKind(v)==='intersection').length,2);
  const impossible=structuredClone(a.map);impossible.inventory.intersection=1;
  assert.notEqual(E.solve(impossible,{limit:250000,maxPairs:3}).status,'solved');
  assert.deepEqual(a.map,G.generateDoubleCrossing(String(i)).map);
 }
});
test('double crossing: valid generator dropdown dispatch',()=>{
 const fs=require('node:fs');const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const js=fs.readFileSync(require('node:path').join(__dirname,'../generator.js'),'utf8');
 assert.match(html,/<option value="double-crossing">/);
 assert.match(js,/difficulty==='double-crossing'\?window\.EFGenerator\.generateDoubleCrossing\(seed\)/);
});
