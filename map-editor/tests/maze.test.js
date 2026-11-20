'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../engine'),G=require('../generator');
test('route maze is deterministic, verified and supports dry alternative (12 seeds)',()=>{
 const shapes=new Set();let carved=0;
 for(let i=0;i<12;i++){
  const a=G.generateMaze(String(i));
  assert.equal(a.status,'verified',`seed ${i}: ${a.message}`);
  assert.deepEqual(a.map,G.generateMaze(String(i)).map);
  assert.deepEqual(E.checkAll(a.map,a.verification.routes,a.verification.placements),[]);
  const dry=structuredClone(a.map);dry.inventory.bridge=0;
  assert.deepEqual(E.checkAll(dry,a.alternative.routes,a.alternative.placements),[]);
  const without=structuredClone(a.map);without.inventory.intersection=0;
  assert.notEqual(E.solve(without,{limit:12000,maxPairs:3}).status,'solved');
  shapes.add(a.map.cells.map(c=>c.terrain==='land'?'1':'0').join(''));
  carved+=a.carved;
 }
 assert.ok(shapes.size>=8,`only ${shapes.size} unique layouts`);
 assert.ok(carved>40,`only ${carved} cells carved`);
});
test('maze dropdown is wired to browser generator handler and version matches',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../generator.js'),'utf8');
 assert.match(html,/<option value="maze">Crossing: route maze<\/option>/);
 assert.match(js,/difficulty==='maze'\?window\.EFGenerator\.generateMaze\(seed\)/);
 assert.match(html,/v1\.7\.0/);
});
