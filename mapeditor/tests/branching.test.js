'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine'),G=require('../generator');
test('branching puzzle: verified, deterministic, dry alternative and required intersection (100 seeds)',()=>{
 for(let i=0;i<100;i++){
  const a=G.generateBranching(String(i));
  assert.equal(a.status,'verified',`seed ${i}: ${a.message}`);
  assert.deepEqual(a.map,G.generateBranching(String(i)).map);
  assert.deepEqual(E.checkAll(a.map,a.verification.routes,a.verification.placements),[]);
  const dry=structuredClone(a.map);dry.inventory.bridge=0;
  assert.deepEqual(E.checkAll(dry,a.alternative.routes,a.alternative.placements),[]);
  assert.equal(Object.values(a.alternative.placements).some(v=>E.placementKind(v)==='bridge'),false);
  const noIntersection=structuredClone(a.map);noIntersection.inventory.intersection=0;
  assert.notEqual(E.solve(noIntersection,{limit:200000,maxPairs:3}).status,'solved');
 }
});
test('branching option is wired into actual generator click handler',()=>{
 const fs=require('node:fs'),path=require('node:path');
 assert.match(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),/<option value="branching">/);
 assert.match(fs.readFileSync(path.join(__dirname,'../generator.js'),'utf8'),/difficulty==='branching'\?window\.EFGenerator\.generateBranching\(seed\)/);
});
