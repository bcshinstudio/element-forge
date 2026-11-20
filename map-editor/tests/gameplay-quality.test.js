'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine'),G=require('../generator');
test('curation uses verified gameplay metrics reproducibly across 12 seeds',()=>{
 for(let i=0;i<12;i++){
  const r=G.generateCuratedMaze(String(i),3);
  assert.equal(r.status,'verified',r.message);
  const q=G.gameplayQuality(r.map,r.verification,r.alternative);
  assert.deepEqual(q,r.quality);
  assert.equal(q.tradeoff.status,'verified');
  assert.equal(q.tradeoff.bridgeChoice,true);
  assert.equal(q.tradeoff.distinctRoutes,true);
  assert.ok(q.choiceBonus>=30);
  assert.deepEqual(G.generateCuratedMaze(String(i),3).quality,q);
 }
});
test('tradeoff rejects invalid alternative instead of scoring it',()=>{
 const r=G.generateMaze('1042');assert.equal(r.status,'verified');
 const bad=structuredClone(r.alternative);bad.routes[0].path=[0,1];
 assert.equal(G.solutionTradeoff(r.map,r.verification,bad).status,'unverified');
});
test('candidate ranking matches maximum gameplay score',()=>{
 for(const seed of ['1042','88','129']){
  const r=G.generateCuratedMaze(seed,3);assert.equal(r.status,'verified');
  const scores=[];
  for(let i=0;i<3;i++){
   const c=G.generateMaze(`${seed}-candidate-${i}`);
   if(c.status==='verified')scores.push(G.gameplayQuality(c.map,c.verification,c.alternative).score);
  }
  assert.equal(r.quality.score,Math.max(...scores));
 }
});
