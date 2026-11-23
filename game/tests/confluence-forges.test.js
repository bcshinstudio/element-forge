'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../../map-editor/engine');
const F=require('../../map-editor/map-format');
const S=require('../session');
const chapter=require('../chapter');
const Art=require('../../art/variants');
const fixtures=require('./fixtures/confluence-forges-solutions.json');
const levels=chapter.chapterNine;
const clone=x=>JSON.parse(JSON.stringify(x));
const read=(stage,kind)=>JSON.parse(fs.readFileSync(path.join(__dirname,'../ch9-drafts/stage-'+stage+'.'+kind+'.json'),'utf8'));

test('Chapter Nine preserves all twelve ordered 12×12 stages after the original 96',()=>{
 const previous=['chapter','chapterTwo','chapterThree','chapterFour','chapterFive','chapterSix','chapterSeven','chapterEight']
  .flatMap(key=>chapter[key]);
 assert.equal(previous.length,96);
 assert.equal(levels.length,12);
 assert.equal(new Set([...previous,...levels].map(level=>level.id)).size,108);
 assert.deepEqual(levels.map(level=>level.id),Array.from({length:12},(_,i)=>'confluence-forges-'+(97+i)));
 for(let i=0;i<12;i++){
  assert.equal(levels[i].map.cells.length,144);
  assert.equal(levels[i].rulesVersion,4);
  assert.equal(levels[i].map.artPalette,undefined);
  assert.ok(levels[i].hint.length>20);
 }
 assert.equal(levels[0].map.name,'The Alchemical Primer');
 assert.equal(levels[8].map.name,'Cascade Chain-Reaction');
 assert.equal(levels[11].map.name,"The Grand Philosopher's Engine");
});
test('All twelve stage maps, exports and solution witnesses validate with no skipped gameplay',()=>{
 assert.equal(fixtures.length,12);
 for(let index=0;index<12;index++){
  const stage=97+index,entry=levels[index],map=F.readLevel(entry);
  const planned=fixtures[index],draft=read(stage,'map'),levelFile=read(stage,'level');
  const original=read(stage,'solution');
  assert.deepEqual(F.structuralErrors(map).issues,[],entry.id);
  assert.deepEqual(E.checkAll(map,planned.routes,planned.placements),[],entry.id);
  assert.deepEqual(planned.routes,original.routes);
  assert.deepEqual(planned.placements,original.placements);
  assert.equal(planned.id,entry.id);
  assert.deepEqual(F.parseMap(draft),F.readLevel(levelFile));
  const game=S.createSession(entry);
  assert.equal(game.start().ok,true,entry.id);
  const links=new Map();
  for(const [cell,v] of Object.entries(planned.placements)){
   const kind=E.placementKind(v);
   if(['tunnel','portal'].includes(kind)){
    const key=kind+'|'+v.pairId;
    links.set(key,[...(links.get(key)||[]),+cell]);
   }else assert.equal(game.place(+cell,kind).ok,true,entry.id+': '+kind+' '+cell);
  }
  for(const [key,ends] of links){
   assert.equal(ends.length,2,entry.id+': link '+key);
   const result=key.startsWith('tunnel')?game.placeTunnel(...ends):game.placePortal(...ends);
   assert.equal(result.ok,true,entry.id+': '+JSON.stringify(result));
  }
  for(const route of planned.routes){
   for(const cell of route.path){
    const status=game.route(cell);
    assert.equal(status.ok,true,entry.id+': '+route.element+' '+cell+': '+status.message);
   }
  }
  assert.equal(game.evaluate().ok,true,entry.id);
  const snapshot=game.snapshot(),restored=S.createSession(entry);
  assert.equal(restored.restore(clone(snapshot)),true,entry.id+' restore');
  assert.equal(restored.evaluate().ok,true,entry.id+' restore evaluation');
  assert.equal(game.undo(),true,entry.id+' undo');
  assert.equal(game.evaluate().ok,false,entry.id+' undo evaluation');
 }
});
test('Stage mechanics remain distinct and no tools are decorative',()=>{
 const chamberCounts=[2,1,1,1,1,2,2,2,3,2,2,3];
 for(let i=0;i<levels.length;i++){
  const map=F.readLevel(levels[i]),solution=fixtures[i];
  assert.equal(map.cells.filter(cell=>cell.component==='confluence').length,chamberCounts[i],levels[i].id);
  assert.equal(map.cells.filter(cell=>cell.component==='gate').length,[2,3,3,3,4,4,5,5,5,6,6,7][i]);
  assert.equal(map.cells.filter(cell=>cell.component==='checkpoint').length,[2,3,3,3,4,4,4,5,5,6,6,7][i]);
  const counts=E.placementCounts(solution.placements);
  for(const [kind,count] of Object.entries(counts)){
   assert.ok(count<=map.inventory[kind],levels[i].id+' tool budget: '+kind);
   if(kind==='portal'||kind==='tunnel')assert.equal(count%2,0);
  }
  for(const [cell,v] of Object.entries(solution.placements)){
   const kind=E.placementKind(v);
   assert.ok(solution.routes.some(r=>r.path.includes(+cell)),levels[i].id+' unused '+kind+' '+cell);
  }
 }
});
test('Chapter Nine remains deterministic across palette rendering and map import',()=>{
 for(let i=0;i<12;i++){
  const decorated=Art.campaignLevel(levels[i],8);
  assert.equal(decorated.map.artPalette,9);
  const map=F.readLevel(decorated);
  assert.equal(map.cells.length,144);
  assert.deepEqual(E.checkAll(map,fixtures[i].routes,fixtures[i].placements),[]);
  assert.deepEqual(F.readLevel(F.asLevel(map)),map);
 }
});
