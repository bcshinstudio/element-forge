'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine'),G=require('../generator');
test('route choice: 100 deterministic seeds offer valid bridge and bridge-free solutions',()=>{
 for(let i=0;i<100;i++){
  const seed=String(i),a=G.generateCrossingChoice(seed);
  assert.equal(a.status,'verified',`${seed}: ${a.message}`);
  assert.deepEqual(a.map,G.generateCrossingChoice(seed).map);
  assert.deepEqual(E.checkAll(a.map,a.verification.routes,a.verification.placements),[]);
  assert.equal(a.verification.routes.length,2);
  const noBridge=structuredClone(a.map);noBridge.inventory.bridge=0;
  const alternate=E.solve(noBridge,{limit:200000,maxPairs:3});
  assert.equal(alternate.status,'solved',`${seed}: ${alternate.status}`);
  assert.deepEqual(E.checkAll(noBridge,alternate.routes,alternate.placements),[]);
  assert.equal(Object.values(alternate.placements).map(E.placementKind).includes('bridge'),false);
  assert.equal(Object.values(alternate.placements).map(E.placementKind).includes('intersection'),true);
  const noIntersection=structuredClone(a.map);noIntersection.inventory.intersection=0;
  assert.notEqual(E.solve(noIntersection,{limit:200000,maxPairs:3}).status,'solved');
 }
});
