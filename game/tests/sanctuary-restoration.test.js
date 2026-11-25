'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../sanctuary'),E=require('../../map-editor/engine'),F=require('../../map-editor/map-format'),S=require('../session'),catalog=require('../../art/catalog.json');
const map=require('../../maps/the-sanctuary-of-silent-guardians.json');
const solution=E.solveConstruction(map);
test('Approved sanctuary board is valid and solvable',()=>{
 assert.deepEqual(G.level.map,map);assert.deepEqual(F.mapFindings(map).findings,[]);
 assert.equal(solution.status,'solved');assert.deepEqual(E.checkAll(map,solution.routes,solution.placements),[]);
 assert.equal(Object.keys(solution.placements).length,0);
 for(const c of map.cells)assert.equal(catalog[c.terrainArt.id].type,c.terrain);
});
test('All 64 restoration states and reset',()=>{
 assert.equal(solution.status,'solved');
 for(let mask=0;mask<64;mask++){
  const routes=solution.routes.filter(r=>mask&(1<<G.elements.indexOf(r.element))),view=G.view(map,routes,catalog);
  for(const [i,c] of map.cells.entries()){
   const id=c.terrainArt.id,done=e=>Boolean(mask&(1<<G.elements.indexOf(e)));
   const expected=c.node?.role==='destination'&&done(c.node.element)?'inlet':id.startsWith('sanctuary-grand-altar-')?(mask===63?(id.endsWith('-center')?'crystal':'heart'):done('wind')?'wind':null):id==='sanctuary-gate-closed'&&mask===63?'gate':id==='sanctuary-lava'&&done('fire')?'fire':id==='sanctuary-fountain'&&done('water')?'fountain':['sanctuary-water','sanctuary-water-channel'].includes(id)&&done('water')?'water':['sanctuary-statue','sanctuary-pillar'].includes(id)&&done('earth')?'earth':['sanctuary-ferns','sanctuary-forest'].includes(id)&&done('nature')?'nature':id==='sanctuary-lantern'&&done('light')?'light':id==='sanctuary-void'&&done('wind')?'wind':null;
   assert.equal(view[i].effect,expected);
   const target=expected==='gate'?'sanctuary-gate-open-restored':expected&&!['inlet','wind'].includes(expected)?catalog[id].activeId:id;
   assert.equal(view[i].spec.id,target);assert.equal(catalog[target].type,c.terrain);
  }
 }
 const tile={dataset:{}};G.motion(tile,{effect:'heart'});assert.equal(tile.dataset.sanctuaryEffect,'heart');G.motion(tile,null);assert.equal(tile.dataset.sanctuaryEffect,undefined);
});
test('Permanent delivery, save, and restart',()=>{
 assert.equal(solution.status,'solved');const s=S.createSession(G.level);assert.ok(s.start().ok);
 for(const r of solution.routes){for(const i of r.path)assert.ok(s.route(i).ok,r.element+' '+i);assert.equal(s.route(r.path[0]).ok,false);assert.equal(s.undo(),false);}
 assert.ok(s.verify().ok);const restored=S.createSession(G.level);assert.ok(restored.restore(s.snapshot()));assert.equal(G.delivered(map,restored.state.routes).size,6);restored.restart();assert.equal(G.delivered(map,restored.state.routes).size,0);
});
