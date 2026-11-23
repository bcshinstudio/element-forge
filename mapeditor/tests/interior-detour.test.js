'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const G=require('../generator'),E=require('../engine');
test('interior detour: seeded maps solve and central straight route is blocked',()=>{
 for(let n=0;n<80;n++){
  const seed=String(n),a=G.generateInteriorDetour(seed);
  assert.equal(a.status,'verified',`${seed}: ${a.message}`);
  assert.deepEqual(E.checkAll(a.map,a.verification.routes,a.verification.placements),[]);
  assert.deepEqual(G.generateInteriorDetour(seed).map,a.map);
  assert.equal(a.verification.routes.length,2);
 }
});
