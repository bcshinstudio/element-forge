'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),G=require('../generator.js');
for(const kind of ['portal','tunnel']){
 test(`dual ${kind} + bridge: seeded solvable two-element construction maps`,()=>{
  for(let seed=0;seed<35;seed++){
   const a=G.generateDualConstruction(String(seed),kind);
   assert.equal(a.status,'verified',`${kind}/${seed}: ${a.message}`);
   assert.equal(a.verification.routes.length,2);
   assert.deepEqual(E.checkAll(a.map,a.verification.routes,a.verification.placements),[]);
   assert.equal(E.solve(a.map,{limit:50000}).status!=='solved',true);
   const used=Object.values(a.verification.placements).map(E.placementKind);
   assert.equal(used.filter(k=>k===kind).length,2);
   assert.equal(used.filter(k=>k==='bridge').length,1);
   assert.equal(G.analyze(a.map,a.verification).elementPairs,2);
  }
 });
 test(`dual ${kind} deterministic and export-compatible`,()=>{
  const a=G.generateDualConstruction('repeat',kind),b=G.generateDualConstruction('repeat',kind);
  assert.equal(a.status,'verified',a.message);
  assert.deepEqual(a.map,b.map);assert.deepEqual(a.verification.routes,b.verification.routes);
  assert.equal(a.map.schemaVersion,2);assert.equal(a.map.format,'element-forge-map');
  assert.deepEqual(E.checkAll(JSON.parse(JSON.stringify(a.map)),a.verification.routes,a.verification.placements),[]);
 });
}
