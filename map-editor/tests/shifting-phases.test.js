'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../engine.js');
const F=require('../map-format.js');
const S=require('../../game/session.js');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'../examples/'+name),'utf8'));
const clone=value=>JSON.parse(JSON.stringify(value));
const map=()=>F.parseMap(read('phase-first-nightfall.map.json'));
const solution=()=>read('phase-first-nightfall.solution.json').routes;
function play(){
 const session=S.createSession(F.asLevel(map()));
 assert.equal(session.start().ok,true);
 for(const route of solution())for(const tile of route.path){
  const step=session.route(tile);
  assert.equal(step.ok,true,route.element+' tile '+tile+': '+step.message);
 }
 return session;
}
test('Day/Night opt-in metadata survives map export and level import unchanged',()=>{
 const original=map(),exported=F.asLevel(original);
 assert.deepEqual(F.parseMap(clone(original)),original);
 assert.deepEqual(F.readLevel(clone(exported)),original);
 assert.deepEqual(F.readLevel(clone(read('phase-first-nightfall.level.json'))),original);
 assert.deepEqual(F.structuralErrors(original).issues,[]);
 assert.equal(original.phaseRules.initial,'day');
 assert.equal(original.cells[9].props.phaseShift,true);
 assert.equal(original.cells[38].props.phaseShift,true);
 assert.equal(original.cells[10].component,'phasePlate');
 assert.equal(original.cells[10].props.element,'light');
});
test('Night swaps only marked Exposed and Covered terrain, without mutating the stored map',()=>{
 const m=map(),day=E.phaseView(m,'day'),night=E.phaseView(m,'night');
 assert.equal(day.cells[9].terrain,'exposed');
 assert.equal(night.cells[9].terrain,'covered');
 assert.equal(night.cells[38].terrain,'covered');
 assert.equal(m.cells[9].terrain,'exposed');
 assert.equal(m.cells[38].terrain,'exposed');
 assert.equal(m.cells[10].component,'phasePlate');
 assert.equal(night.cells[10].component,undefined);
 assert.match(E.terrainError(day,'shadow',38,null),/Shadow cannot pass/);
 assert.match(E.terrainError(day,'light',38,null)??'',/^$/);
 assert.match(E.terrainError(night,'light',38,null),/Light needs exposed/);
});
test('Verified solver requires Light to activate Night before Shadow can pass',()=>{
 const m=map(),solved=E.solve(m,{allowPlacement:false,limit:50000});
 assert.equal(solved.status,'solved');
 assert.deepEqual(E.checkAll(m,solved.routes,solved.placements),[]);
 assert.equal(solved.routes.length,2);
 assert.equal(solved.routes[0].element,'light');
 assert.ok(solved.routes[0].path.includes(10));
 assert.equal(solved.routes[0].deliveredPhase,'day');
 assert.equal(solved.routes[1].element,'shadow');
 assert.equal(solved.routes[1].deliveredPhase,'night');
 assert.equal(E.terrainError(E.phaseView(m,'night'),'light',9,null),'Light needs exposed channels.');
 assert.equal(E.phaseValidation(m,solved.routes,{},false).length,0);
 assert.match(E.checkAll(m,[solved.routes[1],solved.routes[0]],{}).join(' '),/Shadow|Incorrect|phase plate/);
});
test('Triggering delivery permanently counts despite Night terrain invalidating its old route',()=>{
 const m=map(),session=S.createSession(F.asLevel(m));
 session.start();
 for(const tile of solution()[0].path)assert.equal(session.route(tile).ok,true);
 assert.equal(session.state.dayPhase,'night');
 assert.equal(session.state.routes.length,1);
 assert.equal(session.state.routes[0].deliveredPhase,'day');
 assert.match(E.validatePath(E.phaseView(m,'night'),'light',session.state.routes[0].path,[],{}),/Light needs exposed/);
 assert.deepEqual(E.phaseValidation(m,session.state.routes,{},false),[]);
 assert.match(session.evaluate().message,/missing route/);
 for(const tile of solution()[1].path)assert.equal(session.route(tile).ok,true);
 assert.equal(session.evaluate().ok,true);
});
test('Undo restores previously completed routes and the previous phase in delivery order',()=>{
 const g=play();
 assert.equal(g.state.dayPhase,'night');
 assert.equal(g.undo(),true);
 assert.equal(g.state.dayPhase,'night');
 assert.equal(g.state.routes.length,1);
 assert.ok(g.state.drafts.shadow);
 assert.equal(g.undo(),true);
 assert.equal(g.state.dayPhase,'night');
 assert.equal(Object.keys(g.state.drafts).length,0);
 assert.equal(g.undo(),true);
 assert.equal(g.state.dayPhase,'day');
 assert.equal(g.state.routes.length,0);
 assert.equal(g.snapshot().dayPhase,'day');
});
test('Saved Night and Day sessions restore, reject manipulated phase and invalid route order',()=>{
 const m=map(),level=F.asLevel(m),g=play();
 const snapshot=g.snapshot();
 const restored=S.createSession(level);
 assert.equal(restored.restore(clone(snapshot)),true);
 assert.equal(restored.state.dayPhase,'night');
 assert.equal(restored.evaluate().ok,true);
 const tampered=clone(snapshot);tampered.dayPhase='day';
 const invalid=S.createSession(level);
 assert.equal(invalid.restore(tampered),false);
 const swapped=clone(snapshot);swapped.routes.reverse();
 assert.equal(S.createSession(level).restore(swapped),false);
 const early=S.createSession(level);early.start();
 for(const tile of solution()[0].path)assert.equal(early.route(tile).ok,true);
 const mid=early.snapshot(),revived=S.createSession(level);
 assert.equal(revived.restore(mid),true);
 assert.equal(revived.state.dayPhase,'night');
 revived.restart(true);
 assert.equal(revived.state.dayPhase,'day');
 assert.equal(revived.state.routes.length,0);
});
test('Map validator rejects invalid trigger, unmarked phase tiles, missing plate and unsupported combinations',()=>{
 const original=map();
 const invalid=[
  m=>{delete m.phaseRules;},
  m=>{m.phaseRules.initial='night';},
  m=>{m.cells[9].props.phaseShift=false;},
  m=>{m.cells[10].props.element='any';},
  m=>{m.cells[10].component=undefined;},
  m=>{m.cells[38].props.phaseShift=undefined;m.cells[9].props.phaseShift=undefined;},
  m=>{m.cells[17]={terrain:'land',component:'phasePlate',props:{element:'light'}};},
  m=>{m.inventory.bridge=1;},
  m=>{m.cells[9].terrain='land';},
 ];
 for(const change of invalid){
  const m=clone(original);change(m);
  let failed=false;
  try{const parsed=F.parseMap(m);failed=F.structuralErrors(parsed).issues.length>0;}catch{failed=true;}
  assert.equal(failed,true,'invalid phase configuration was accepted');
 }
});
test('The old non-phase engine and game session are unchanged',()=>{
 const normal=F.fresh(5,5);normal.rulesVersion=4;normal.name='Legacy compatibility';
 for(const k of Object.keys(normal.inventory))normal.inventory[k]=0;
 normal.cells[0]={terrain:'land',node:{element:'water',role:'source'}};
 normal.cells[4]={terrain:'land',node:{element:'water',role:'destination'}};
 const mapNoPhases=F.parseMap(normal);
 assert.equal(mapNoPhases.phaseRules,undefined);
 assert.strictEqual(E.phaseView(mapNoPhases,'night'),mapNoPhases);
 const old=E.solve(mapNoPhases,{allowPlacement:false,limit:15000});
 assert.equal(old.status,'solved');
 assert.deepEqual(E.checkAll(mapNoPhases,old.routes,old.placements),[]);
 const session=S.createSession(F.asLevel(mapNoPhases));session.start();
 for(const tile of [0,1,2,3,4])assert.equal(session.route(tile).ok,true);
 assert.equal(session.state.dayPhase,null);
 assert.equal(session.evaluate().ok,true);
});
