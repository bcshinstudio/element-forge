'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const E=require('../../map-editor/engine');
const F=require('../../map-editor/map-format');
const {catalog,prototype}=require('../levels');
const G=require('../challenges');
const {createSession,score}=require('../session');
const {createProgress}=require('../progress');
for(const level of [...catalog,prototype])test(level.map.name+' replays with rules 3 on 12 × 12',()=>{
 const map=F.readLevel(level);
 assert.equal(map.rulesVersion,3);
 assert.equal(map.width*map.height,144);
 const solution=E.solveConstruction(map);
 assert.equal(solution.status,'solved');
 assert.ok(G.replay(level,solution));
});

test('Terrain and tool restrictions agree with the level parser and route validator',()=>{
 const cases=[
  ['fire','lava',null,null],['fire','water','bridge',/Deep water/],
  ['water','lava',null,/Only Fire/],['nature','forest',null,null],
  ['electricity','forest',null,/Only Plant/],['nature','land','portal',/Plant cannot use/],
  ['electricity','water',null,/metal span/],['electricity','water','bridge',/metal span/],
  ['electricity','water','metalSpan',null],['earth','scree',null,null],
  ['earth','water','bridge',/lightweight/],['metal','water','bridge',/lightweight/],
  ['ice','shallow',null,null],['ice','heated',null,/heated/],['metal','heated',null,null],
  ['metal','abrasive',null,null],['metal','scree',null,/Earth/],
  ['light','exposed',null,null],['shadow','covered',null,null],
  ['light','covered',null,/exposed/],['shadow','exposed',null,/covered/]
 ];
 for(const [element,terrain,component,error] of cases){
  const map=F.fresh(4,4);
  map.rulesVersion=3;
  map.cells[0].node={element,role:'source'};
  map.cells[3].node={element,role:'destination'};
  map.cells[1]={terrain,component};
  const parsed=F.parseMap(map);
  const message=E.validatePath(parsed,element,[0,1,2,3]);
  if(error)assert.match(message,error);
  else assert.equal(message,null);
 }
});

test('Water enters and exits connected river using banks in both directions',()=>{
 const map={...F.fresh(6,4),rulesVersion:3};
 for(const [i,terrain] of ['land','bank','river','river','bank','land'].entries())map.cells[i]={terrain};
 map.cells[0].node={element:'water',role:'source'};
 map.cells[5].node={element:'water',role:'destination'};
 assert.equal(E.validatePath(map,'water',[0,1,2,3,4,5]),null);
 map.cells[4].terrain='land';
 assert.match(E.validatePath(map,'water',[0,1,2,3,4,5]),/marked bank/);
});

test('Scarce Crossing river exit alternatives block distinct competing currents',()=>{
 const {alternatives}=G.verifyScarce();
 assert.deepEqual(alternatives.map(item=>item.status),['unsolved','unsolved','solved']);
 assert.equal(alternatives[0].plant,'unsolved');
 assert.equal(alternatives[1].electricity,'unsolved');
});

test('scoring uses unique tiles, placed tools, and actual legacy dimensions',()=>{
 const map={...F.fresh(),construction:{budget:4,prices:{metalSpan:2}}};
 const routes=[{path:Array.from({length:30},(_,i)=>i)},{path:[29]}];
 assert.equal(score(map,routes,{5:'metalSpan'}).points,104);
 assert.equal(score(F.fresh(4,4),routes,{}).points,0);
 assert.equal(score(F.fresh(4,4),[{path:[0,1,2,3]}],{}).points,8);
});

test('save restores tools and unfinished active route and rejects an incompatible draft',()=>{
 const level=catalog[3],session=createSession(level);
 const plan=E.solveConstruction(session.map);
 assert.ok(session.start(E.placementCounts(plan.placements)).ok);
 for(const [i,kind] of Object.entries(plan.placements))assert.ok(session.place(Number(i),kind).ok);
 for(const i of plan.routes[0].path.slice(0,3))assert.ok(session.route(i).ok);
 const saved=session.snapshot(), restored=createSession(level);
 assert.ok(restored.restore(saved));assert.deepEqual(restored.snapshot(),saved);
 const invalid=structuredClone(saved);
 Object.values(invalid.drafts)[0].path.push(999);
 assert.equal(restored.restore(invalid),false);
 assert.deepEqual(restored.snapshot(),saved);
});

test('save migrates unlocks, keeps separate challenge state and applies a replay score only as a best',()=>{
 const ids=catalog.map(level=>level.id);
 const data=new Map([['element-forge.campaign.v1',JSON.stringify({completed:[ids[0]],selected:ids[1]})]]);
 const storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 const progress=createProgress(storage,ids);
 assert.equal(progress.unlockedIndex(),1);
 assert.equal(progress.total(),0);
 const board={id:ids[1],rules:3,board:{phase:'complete'}};
 progress.complete(ids[1],104,board);
 progress.saveChallenge({index:2,board:{phase:'build'}});
 const reopened=createProgress(storage,ids);
 assert.deepEqual(reopened.campaign(),board);
 assert.equal(reopened.unlockedIndex(),2);
 assert.equal(reopened.total(),104);
 reopened.complete(ids[1],104,board);
 reopened.complete(ids[1],99,board);
 assert.equal(reopened.total(),104);
 reopened.complete(ids[1],112,board);
 assert.equal(reopened.total(),112);
 reopened.reset();
 assert.equal(reopened.total(),0);
 assert.equal(reopened.challenge().index,2);
});
