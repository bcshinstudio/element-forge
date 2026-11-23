'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine'),G=require('../generator');
test('curated maze ranks only verified candidates with deterministic score (8 seeds)',()=>{
 for(let i=0;i<8;i++){
  const seed=String(i),r=G.generateCuratedMaze(seed,3);
  assert.equal(r.status,'verified',`seed ${seed}: ${r.message}`);
  assert.ok(r.evaluated>=1&&r.evaluated<=3);
  assert.deepEqual(E.checkAll(r.map,r.verification.routes,r.verification.placements),[]);
  assert.equal(r.quality.score,G.gameplayQuality(r.map,r.verification,r.alternative).score);
  const again=G.generateCuratedMaze(seed,3);
  assert.deepEqual(r.map,again.map);
  assert.deepEqual(r.quality,again.quality);
  assert.equal(r.index,again.index);
  const dry=structuredClone(r.map);dry.inventory.bridge=0;
  assert.deepEqual(E.checkAll(dry,r.alternative.routes,r.alternative.placements),[]);
 }
});
test('candidate limits reject invalid counts and one candidate remains supported',()=>{
 assert.equal(G.generateCuratedMaze('1',0).status,'failed');
 assert.equal(G.generateCuratedMaze('1',9).status,'failed');
 assert.equal(G.generateCuratedMaze('1',1).status,'verified');
});
