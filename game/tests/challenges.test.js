'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const G=require('../challenges');
const F=require('../../map-editor/map-format');
const E=require('../../map-editor/engine');

for(const family of G.families)test(family+' reference has a verified solution and unsuccessful placement',()=>{
 const candidate=G.reference(family,'Medium');
 const result=G.verify(candidate);
 assert.ok(result.accepted,result.reason);
 assert.ok(result.alternatives.some(a=>a.status==='unsolved'));
 assert.ok(G.replay(candidate.level,result.solution));
});

test('a seed reproduces the complete pack and report without exposing solution routes in the pack',()=>{
 const a=G.generate({seed:'curated-v1',count:8});
 assert.deepEqual(a,G.generate({seed:'curated-v1',count:8}));
 assert.equal(a.pack.stages.length,8);
 assert.deepEqual(a.pack.stages.map(stage=>stage.difficulty),['Easy','Easy','Medium','Medium','Hard','Hard','Expert','Expert']);
 assert.ok(a.pack.stages.some(stage=>stage.special));
 assert.ok(!JSON.stringify(a.pack).includes('"solution"'));
 assert.equal(G.readPack(JSON.parse(JSON.stringify(a.pack))).length,8);
 for(const level of a.pack.stages){
  const result=E.solveConstruction(F.readLevel(level));
  assert.equal(result.status,'solved');
  assert.ok(G.replay(level,result));
 }
});

test('recognizes a mirrored layout, while generation filters repeated decisions',()=>{
 const map=F.readLevel(G.reference('budget','Easy').level);
 const reflected={...map,cells:map.cells.map((_,i)=>map.cells[Math.floor(i/map.width)*map.width+map.width-1-(i%map.width)])};
 assert.equal(G.layoutKey(map),G.layoutKey(reflected));
 const {report}=G.generate({family:'budget',difficulty:'Easy',seed:'repeat',count:20});
 assert.equal(new Set(report.evidence.map(e=>e.decision)).size,report.accepted);
 assert.ok(report.rejections.some(r=>r.reason==='Repeated layout or decision'));
});

test('rejects tool-free bypasses and independent routes with irrelevant equipment',()=>{
 const candidate=G.reference('budget','Hard');
 for(const i of candidate.probes)candidate.level.map.cells[i]={terrain:'land'};
 const check=G.verify(candidate);
 assert.equal(check.accepted,false);
 assert.equal(check.reason,'Tool-free bypass');
});

test('search exhaustion is inconclusive and fallback packs still replay',()=>{
 const check=G.verify(G.reference('budget','Hard'),{limit:1});
 assert.equal(check.clean,'inconclusive');
 assert.equal(check.accepted,false);
 const {report,pack}=G.generate({attempts:0,count:6,seed:'fallback-test'});
 assert.equal(report.fallback,6);
 assert.equal(pack.stages.length,6);
 assert.ok(report.evidence.every(e=>e.accepted));
});
