'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const E=require('../engine.js'),G=require('../generator.js');
for(const kind of ['portal','tunnel']){
 test(`${kind} generator: 60 seeded maps require and validate construction`,()=>{
  for(let seed=0;seed<60;seed++){
   const result=G.generateConstruction(String(seed),kind);
   assert.equal(result.status,'verified',`${kind} seed ${seed}: ${result.message}`);
   assert.equal(result.verification.constructionKind,kind);
   assert.equal(E.checkAll(result.map,result.verification.routes,result.verification.placements).length,0);
   assert.notEqual(E.solve(result.map,{limit:20000}).status,'solved','must require construction');
   assert.equal(Object.keys(result.verification.placements).length,2);
  }
 });
 test(`${kind} generator is reproducible and editor-schema compatible`,()=>{
  const a=G.generateConstruction('same',kind),b=G.generateConstruction('same',kind);
  assert.deepEqual(a.map,b.map);assert.deepEqual(a.verification.routes,b.verification.routes);
  assert.equal(a.map.width,12);assert.equal(a.map.height,12);
  assert.equal(a.map.schemaVersion,2);assert.equal(a.map.format,'element-forge-map');
 });
}
test('candidate budget produces inconclusive, not false unsolvable',()=>{
 const m=G.generateConstruction('budget','portal').map;
 const result=E.solveConstruction(m,{maxCandidates:0,limit:20000});
 assert.equal(result.status,'inconclusive');
});
test('legacy generator still solves after construction-aware changes',()=>{
 for(const d of ['easy','moderate','hard'])for(let i=0;i<20;i++)assert.equal(G.generate(i,d).status,'verified');
});
