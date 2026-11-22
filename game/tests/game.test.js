'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../../map-editor/engine.js');
const F=require('../../map-editor/map-format.js');
const {legacyCatalog:catalog}=require('../levels.js');
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
   assert.equal(session.place(Number(index),E.placementKind(kind),kind.pairId).ok,true);
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
 assert.deepEqual(session.verify(),{ok:true,track:17,spend:2,tiles:19,available:144,unspent:0,points:106});
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

test('Routing can resume at the existing tip without losing the track',()=>{
 const session=createSession(catalog[0]);
 session.start();
 draw(session,[40,52,64,64,76]);
 assert.deepEqual(session.state.active.path,[40,52,64,76]);
 assert.equal(session.route(92).ok,false);
 assert.deepEqual(session.state.active.path,[40,52,64,76]);
 draw(session,[88,89,90,102,103,104,92]);
 assert.equal(session.verify().ok,true);
});

test('Tunnel placement rejects a bad second end and accounts for both ends',()=>{
 const session=createSession(catalog[8]);
 assert.equal(session.start({tunnel:2,bridge:1}).ok,false);
 assert.equal(session.start({tunnel:2}).ok,true);
 assert.equal(session.place(38,'tunnel').ok,true);
 assert.match(session.place(57,'tunnel').message,/Align/);
 assert.equal(session.place(45,'tunnel').ok,true);
 assert.equal(E.constructionCost(session.map,E.placementCounts(session.state.placements)),2);
});

test('Required station cannot be bypassed even with a connected track',()=>{
 const session=createSession(catalog[10]);
 session.start();
 draw(session,[38,39,40,41,42,43]);
 assert.match(session.verify().message,/required checkpoint not visited/);
});

test('Campaign progress survives reload, ignores unknown levels and tolerates unusable storage',()=>{
 const {createProgress}=require('../progress.js');
 const ids=catalog.map(level=>level.id);
 assert.equal(ids.length,15);
 assert.equal(new Set(ids).size,15);
 let snapshot;
 const storage={getItem:()=>snapshot,setItem:(_,value)=>{snapshot=value;}};
 const initial=createProgress(storage,ids);
 initial.select(ids[4]);
 initial.complete(ids[0]);
 initial.complete(ids[0]);
 initial.complete('imported-map');
 const reopened=createProgress(storage,ids);
 assert.equal(reopened.selected(),ids[4]);
 assert.equal(reopened.completedCount(),1);
 assert.equal(reopened.hasCompleted(ids[0]),true);
 snapshot='broken JSON';
 assert.equal(createProgress(storage,ids).completedCount(),0);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 const temporary=createProgress(blocked,ids);
 temporary.complete(ids[1]);
 assert.equal(temporary.hasCompleted(ids[1]),true);
});

test('Construction and multiple draft routes can be interleaved',()=>{
 const session=river();
 assert.equal(session.start({bridge:1}).ok,true);
 draw(session,fireLand.slice(0,3));
 draw(session,water.slice(0,3));
 assert.equal(session.place(113,'bridge').ok,true);
 draw(session,water.slice(3));
 draw(session,fireLand.slice(2));
 assert.equal(session.verify().ok,true);
});

test('A paired tunnel places and removes atomically with bidirectional travel',()=>{
 const session=createSession(catalog[8]);
 session.start({tunnel:2});
 assert.equal(session.placeTunnel(38,57).ok,false);
 assert.deepEqual(session.state.placements,{});
 assert.equal(session.placeTunnel(38,45).ok,true);
 assert.equal(E.linkPartner(session.map,38,session.state.placements),45);
 assert.equal(E.linkPartner(session.map,45,session.state.placements),38);
 assert.equal(session.remove(45).ok,true);
 assert.deepEqual(session.state.placements,{});
 assert.equal(session.undo(),true);
 assert.equal(E.linkPartner(session.map,38,session.state.placements),45);
});

test('Campaign unlocks only through the first incomplete level',()=>{
 const {createProgress}=require('../progress.js');
 const progress=createProgress(null,['one','two','three']);
 assert.equal(progress.unlockedIndex(),0);
 progress.complete('two');
 assert.equal(progress.unlockedIndex(),0);
 progress.complete('one');
 assert.equal(progress.unlockedIndex(),2);
});

test('legacy nature IDs retain saved maps and use the Plant label',()=>{
 const packageData=structuredClone(catalog[6]);
 const map=F.readLevel(packageData);
 assert.ok(map.cells.some(cell=>cell.node?.element==='nature'));
 assert.equal(F.ELEMENTS.nature.name,'Plant');
 assert.equal(F.ELEMENTS.nature.symbol,'P');
 assert.deepEqual(F.readLevel(F.createLevel(map)),map);
});

test('Wind prototype solves, but only Wind may jump a single hole in a straight line',()=>{
 const {prototype}=require('../levels.js');
 const map=F.readLevel(prototype);
 const solved=E.solveConstruction(map);
 assert.equal(solved.status,'solved');
 assert.deepEqual(E.checkAll(map,solved.routes,solved.placements),[]);
 const session=createSession(prototype);
 session.start();
 const path=solved.routes[0].path;
 for(const index of path)assert.equal(session.route(index).ok,true);
 assert.equal(session.verify().ok,true);
 const [start,landing]=[64,66];
 assert.ok(E.windLandings(map,start).includes(landing));
 assert.ok(E.windLandings(map,landing).includes(start));
 assert.ok(!E.windLandings(map,76).includes(79));
 assert.ok(!E.windLandings(map,start).includes(78));
 assert.equal(E.allowedTransition(map,'fire',start,landing),false);
 const tunnelMap=F.fresh(4,4);
 tunnelMap.cells[0].node={element:'wind',role:'source'};
 tunnelMap.cells[3].node={element:'wind',role:'destination'};
 tunnelMap.cells[2].terrain='mountain';
 const openings={1:{kind:'tunnel',pairId:'A'},3:{kind:'tunnel',pairId:'A'}};
 assert.match(E.validatePath(tunnelMap,'wind',[0,1,3],[],openings),/cannot use tunnels/);
});

test('a completed connection can be retraced, resumed from a save, and redrawn',()=>{
 const session=river();
 assert.equal(session.start({bridge:1}).ok,true);
 assert.equal(session.place(113,'bridge').ok,true);
 draw(session,water);
 draw(session,fireLand);
 assert.equal(session.evaluate().ok,true);
 const destination=fireLand.at(-1);
 draw(session,[destination,...fireLand.slice(-4,-1).reverse()]);
 assert.equal(session.evaluate().ok,false);
 assert.deepEqual(session.state.routes,[{element:'water',path:water}]);
 assert.deepEqual(session.state.active.path,fireLand.slice(0,-3));

 const restored=river();
 assert.equal(restored.restore(session.snapshot()),true);
 draw(restored,fireLand.slice(-3));
 assert.equal(restored.verify().ok,true);
});

test('portal pairs place together, force teleportation, resume at the exit, and retrace',()=>{
 const {chapterFive}=require('../chapter');
 const level=chapterFive[3];
 const plan=require('./fixtures/celestial-confluence-solutions.json')[3];
 const session=createSession(level);
 assert.equal(session.start().ok,true);
 const openings=Object.keys(plan.placements).filter(i=>plan.placements[i].kind==='portal').map(Number);
 const tunnel=Object.keys(plan.placements).filter(i=>plan.placements[i].kind==='tunnel').map(Number);
 assert.equal(session.placePortal(...openings).ok,true);
 assert.equal(session.state.placements[openings[0]].pairId,session.state.placements[openings[1]].pairId);
 assert.equal(session.placeTunnel(...tunnel).ok,true);
 const {path}=plan.routes.find(route=>route.element==='fire');
 const entryIndex=path.findIndex(tile=>openings.includes(tile));
 const entry=path[entryIndex],exit=path[entryIndex+1];
 draw(session,path.slice(0,entryIndex+1));
 const adjacent=E.neighbors(entry,session.map.width,session.map.height)
  .find(([tile])=>tile!==path[entryIndex-1]&&!E.terrainError(session.map,'fire',tile,E.effective(session.map,session.state.placements,tile)))[0];
 assert.equal(session.route(adjacent).message,E.portalExitMessage);
 assert.equal(session.route(exit,true).ok,true);
 draw(session,[entry,path[entryIndex-1],entry,exit]);
 draw(session,path.slice(entryIndex+2));
 assert.equal(session.state.routes.some(route=>route.element==='fire'),true);
});

test('redrawing from a source frees all tiles of the previous completed line',()=>{
 const session=river();
 assert.equal(session.start({bridge:1}).ok,true);
 assert.equal(session.place(113,'bridge').ok,true);
 draw(session,fireLand);
 draw(session,[fireLand[0]]);
 assert.equal(session.state.routes.length,0);
 const resumed=river();
 assert.equal(resumed.restore(session.snapshot()),true);
 assert.equal(resumed.state.routes.length,0);
 assert.equal(session.undo(),true);
 assert.deepEqual(session.state.routes,[{element:'fire',path:fireLand}]);
});
