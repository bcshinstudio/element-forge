'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../../map-editor/engine');
const F=require('../../map-editor/map-format');
const S=require('../session');
const levels=require('../twilight-pendulum');
const witnesses=require('./fixtures/twilight-pendulum-solutions.json');
const chapterNine=require('../confluence-forges');

function replay(level, plan) {
 const session=S.createSession(level);
 assert.equal(session.start().ok,true,'Could not start '+level.map.name);
 for(const [index, placement] of Object.entries(plan.placements)) {
  const kind=E.placementKind(placement),result=session.place(+index,kind,placement.pairId??'A');
  assert.equal(result.ok,true,level.map.name+' place '+index+': '+result.message);
 }
 let dayCount=0,nightCount=0;
 for(const [routeIndex, route] of plan.routes.entries()) {
  assert.equal(route.deliveredPhase,session.state.dayPhase,level.map.name+' delivery phase');
  for(const tile of route.path){
   const next=session.route(tile);
   assert.equal(next.ok,true,level.map.name+' route '+routeIndex+' '+route.element+' tile '+tile+': '+next.message);
  }
  const completed=session.state.routes.at(-1);
  assert.deepEqual(completed,route,level.map.name+' completed route '+routeIndex);
  if(completed.deliveredPhase==='day')dayCount++;else nightCount++;
 }
 assert.equal(session.state.dayPhase,'night');
 assert.equal(session.state.routes.length,plan.routes.length);
 assert.ok(dayCount>0&&nightCount>0);
 assert.equal(session.evaluate().ok,true,level.map.name);
 const saved=session.snapshot();
 const restored=S.createSession(level);
 assert.equal(restored.restore(saved),true,level.map.name+' restore');
 assert.equal(restored.evaluate().ok,true,level.map.name+' restored completion');
 return session;
}

test('Chapter Ten has exactly Stages 109–120 in blueprint order, leaving Chapter Nine intact',()=>{
 assert.equal(chapterNine.length,12);
 assert.equal(levels.length,12);
 assert.ok(!levels.some(l=>l.map.name==='Sundial Sluice'),'Retired Medium map has been removed');
 assert.equal(new Set(levels.map(l=>l.id)).size,12);
 for(const [i,level] of levels.entries()){
  assert.equal(level.id,'twilight-pendulum-'+(109+i));
  assert.equal(level.map.phaseRules.initial,'day');
  assert.equal(level.map.width,12);
  assert.equal(level.map.height,12);
  assert.equal(level.rulesVersion,4);
  assert.equal(F.parseMap(level.map).cells.length,144);
 }
});
test('Every authored map and recorded delivery sequence passes the complete engine and gameplay session',()=>{
 for(const level of levels){
  const plan=witnesses[level.id];
  assert.ok(plan,level.id);
  assert.deepEqual(E.phaseValidation(level.map,plan.routes,plan.placements,true),[],level.map.name);
  assert.deepEqual(E.checkAll(level.map,plan.routes,plan.placements),[],level.map.name);
  assert.deepEqual(F.structuralErrors(level.map).issues,[],level.map.name);
  replay(level,plan);
 }
});
test('The same 12 maps can be edited, exported, and reopened without rule changes',()=>{
 for(const level of levels){
  const m=F.readLevel(level);
  assert.deepEqual(F.parseMap(m),m,level.id);
  assert.deepEqual(F.readLevel(F.asLevel(m)),m,level.id);
  const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../ch10-drafts/stage-'+level.id.split('-').at(-1)+'.map.json'),'utf8'));
  const editable=F.parseMap(raw);
  assert.ok(editable.phaseWitness,level.id+' editor verification proof');
  const proofCheck=E.solveConstruction(editable);
  assert.equal(proofCheck.status,'solved',level.id+' editor automatic validation');
  assert.equal(proofCheck.verifiedWitness,true);
  delete editable.phaseWitness;
  assert.deepEqual(editable,m,level.id);
 }
});
test('Completed Day routes survive Night and shifting tiles become reusable only across phases',()=>{
 const level=levels[0],plan=witnesses[level.id],m=level.map;
 const first=plan.routes[0],second=plan.routes[1];
 assert.equal(first.deliveredPhase,'day');
 assert.equal(second.deliveredPhase,'night');
 assert.ok(first.path.some(i=>m.cells[i].props?.phaseShift&&second.path.includes(i)));
 const player=S.createSession(level);player.start();
 for(const i of first.path)assert.equal(player.route(i).ok,true,'Day Light');
 assert.equal(player.state.dayPhase,'night');
 assert.equal(player.state.routes.length,1);
 assert.deepEqual(E.phaseValidation(m,player.state.routes,{},false),[]);
 for(const i of second.path)assert.equal(player.route(i).ok,true,'Night Shadow');
 assert.equal(player.state.routes.length,2);
 assert.equal(player.state.routes[0].deliveredPhase,'day');
 assert.equal(player.state.routes[1].deliveredPhase,'night');
});
test('Undo restores Day and a prior route without completing a Night route prematurely',()=>{
 const level=levels[0],plan=witnesses[level.id],g=S.createSession(level);g.start();
 for(const i of plan.routes[0].path)assert.equal(g.route(i).ok,true);
 assert.equal(g.state.dayPhase,'night');
 assert.equal(g.undo(),true);
 assert.equal(g.state.dayPhase,'day');
 assert.equal(g.state.routes.length,0);
});
test('Chapter Ten Stage 119 enables one Confluence input in Day and the other in Night',()=>{
 const level=levels.find(l=>l.id==='twilight-pendulum-119');
 const routes=witnesses[level.id].routes;
 const ch=E.confluences(level.map).find(c=>c.output==='electricity');
 assert.ok(ch);
 const light=routes.find(r=>r.element==='light'&&r.path.at(-1)===ch.index);
 const shadow=routes.find(r=>r.element==='shadow'&&r.path.at(-1)===ch.index);
 const output=routes.find(r=>r.element==='electricity'&&r.path[0]===ch.index);
 assert.ok(light&&shadow&&output);
 assert.equal(light.deliveredPhase,'day');
 assert.equal(shadow.deliveredPhase,'night');
 assert.equal(output.deliveredPhase,'night');
 replay(level,witnesses[level.id]);
});
test('The Celestial Orrery finale uses two chambers, permanent Day deliveries, all four tool kinds',()=>{
 const level=levels.at(-1),p=witnesses[level.id];
 assert.equal(E.confluences(level.map).length,2);
 assert.equal(p.routes.length,10);
 assert.equal(p.routes.some(r=>r.deliveredPhase==='day'),true);
 assert.equal(p.routes.some(r=>r.deliveredPhase==='night'),true);
 assert.deepEqual(new Set(Object.values(p.placements).map(E.placementKind)),new Set(['intersection','portal','tunnel']));
 replay(level,p);
});
