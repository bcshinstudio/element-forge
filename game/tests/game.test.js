'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../../map-editor/engine.js');
const F=require('../../map-editor/map-format.js');
const {catalog}=require('../levels.js');
const {createSession}=require('../session.js');

const fireLand=[50,51,52,40,39,27,28,29,30,42,54,55,56];
const fireShortcut=[50,51,52,53,54,55,56];
const water=[99,111,112,113,114,115];
const river=()=>createSession(catalog[3]);
const draw=(session,path)=>path.forEach(index=>assert.deepEqual(session.route(index),{ok:true}));

for(const level of catalog){
 test(`${level.map.name} solves and plays through using the same shared rules`,()=>{
  const map=F.readLevel(level);
  const solved=E.solveConstruction(map);
  assert.equal(solved.status,'solved',solved.message);
  assert.deepEqual(E.checkAll(map,solved.routes,solved.placements),[]);
  assert.deepEqual(F.readLevel(F.createLevel(map)),map);
  const session=createSession(level);
  assert.equal(session.start({...E.placementCounts(solved.placements)}).ok,true);
  for(const [index,kind] of Object.entries(solved.placements)){
   assert.equal(session.place(Number(index),E.placementKind(kind)).ok,true);
  }
  for(const route of solved.routes)draw(session,route.path);
  assert.equal(session.verify().ok,true);
  assert.equal(session.state.phase,'complete');
 });
}

test('Rules 1 imports preserve fixed inventory and budget data requires Rules 2',()=>{
 const map=F.readLevel(catalog[1]);
 const legacy=createSession(F.createLevel(map));
 assert.equal(legacy.start({bridge:0}).ok,true);
 assert.equal(legacy.state.loadout.bridge,1);
 assert.equal(legacy.place(53,'bridge').ok,true);
 assert.match(legacy.place(65,'bridge').message,/No bridge/);
 assert.throws(()=>F.readLevel({...catalog[3],rulesVersion:1}),/Unsupported/);
 const invalid=structuredClone(catalog[3]);
 invalid.map.construction.prices={bridge:2};
 assert.throws(()=>F.readLevel(invalid),/Missing construction price/);
});

test('Planning rejects negative, unknown, fractional, overstocked and over-budget tools',()=>{
 const session=river();
 for(const selection of [{bridge:-1},{bridge:0.5},{portal:1},{bridge:3},{bridge:2},{bridge:1,intersection:1}]){
  assert.equal(session.start(selection).ok,false);
  assert.equal(session.state.phase,'inspect');
 }
 assert.equal(session.start(null).ok,true);
 assert.equal(session.place(113,'bridge').ok,false);
});

test('Shared engine recognizes legal independent routes but rejects their combined overspend',()=>{
 const {map}=river();
 const routes=[{element:'fire',path:fireShortcut},{element:'water',path:water}];
 const placements={53:'bridge',113:'bridge'};
 assert.deepEqual(E.checkAll({...map,construction:undefined},routes,placements),[]);
 assert.deepEqual(E.checkAll(map,routes,placements),['Construction budget exceeded']);
 const budgetless={...map,construction:{...map.construction,budget:0}};
 assert.equal(E.solveConstruction(budgetless).status,'unsolved');
});

test('River Crossing fails with the wrong bridge and remains playable after replanning',()=>{
 const session=river();
 assert.equal(session.start({bridge:1}).ok,true);
 assert.equal(session.place(53,'bridge').ok,true);
 draw(session,fireShortcut);
 assert.match(session.verify().message,/water: missing route/);
 assert.match(session.place(113,'bridge').message,/No bridge/);
 const {map}=session;
 assert.equal(E.solve(map,{allowPlacement:false,initialPlacements:{53:'bridge'}}).status,'unsolved');
 session.restart(true);
 assert.equal(session.state.phase,'inspect');
 assert.deepEqual(session.state.placements,{});
 assert.deepEqual(session.state.routes,[]);
 assert.equal(session.start({bridge:1}).ok,true);
 assert.equal(session.place(113,'bridge').ok,true);
 draw(session,fireLand);
 draw(session,water);
 assert.deepEqual(session.verify(),{ok:true,track:17,spend:2});
 session.restart();
 assert.deepEqual(session.state.loadout,{bridge:1});
 assert.equal(session.state.phase,'build');
 assert.deepEqual(session.state.routes,[]);
});

test('Invalid placements and moves leave the route untouched and undo restores prior routes',()=>{
 const session=river();
 assert.equal(session.start({bridge:1}).ok,true);
 assert.equal(session.place(50,'bridge').ok,false);
 assert.equal(session.place(51,'bridge').ok,false);
 assert.equal(session.place(999,'bridge').ok,false);
 assert.equal(session.place(113,'bridge').ok,true);
 draw(session,[99]);
 assert.match(session.route(115).message,/adjacent/);
 assert.deepEqual(session.state.active.path,[99]);
 assert.equal(session.undo(),true);
 draw(session,water);
 draw(session,[99,111]);
 assert.equal(session.undo(),true);
 assert.deepEqual(session.state.routes,[{element:'water',path:water}]);
 assert.equal(session.remove(113).ok,true);
 assert.deepEqual(session.state.routes,[]);
 assert.equal(session.undo(),true);
 assert.deepEqual(session.state.routes,[{element:'water',path:water}]);
});

test('Partial crossing may enter an intersection but must leave it straight',()=>{
 const session=createSession(catalog[2]);
 assert.equal(session.start().ok,true);
 assert.equal(session.place(78,'intersection').ok,true);
 draw(session,[18,30,42,54,66,78,90,102,114]);
 draw(session,[73,74,75,76,77,78]);
 assert.equal(session.route(90).ok,false);
 draw(session,[79,80,81,82]);
 assert.equal(session.verify().ok,true);
});
