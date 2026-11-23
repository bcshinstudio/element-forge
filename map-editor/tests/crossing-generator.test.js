'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),G=require('../generator.js');
for(const kind of ['intersection','intersection-bridge']){
 test(`${kind}: 60 deterministic verified crossings with mandatory components`,()=>{
  for(let i=0;i<60;i++){
   const a=G.generateCrossing(String(i),kind);
   assert.equal(a.status,'verified',`${kind}/${i}: ${a.message}`);
   assert.equal(a.verification.routes.length,2);
   assert.deepEqual(E.checkAll(a.map,a.verification.routes,a.verification.placements),[]);
   const used=Object.values(a.verification.placements).map(E.placementKind);
   assert.equal(used.filter(x=>x==='intersection').length,1);
   assert.equal(used.filter(x=>x==='bridge').length,kind==='intersection-bridge'?1:0);
   const noCross=structuredClone(a.map);noCross.inventory.intersection=0;
   assert.notEqual(E.solve(noCross,{limit:150000}).status,'solved');
   if(kind==='intersection-bridge'){
    const noBridge=structuredClone(a.map);noBridge.inventory.bridge=0;
    assert.notEqual(E.solve(noBridge,{limit:150000}).status,'solved');
   }
   assert.deepEqual(a.map,G.generateCrossing(String(i),kind).map);
  }
 });
}
