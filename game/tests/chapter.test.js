'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../../map-editor/engine');
const F=require('../../map-editor/map-format');
const {chapter,chapterTwo}=require('../chapter');
const {catalog,prototype}=require('../levels');
const {createSession}=require('../session');
const {createProgress}=require('../progress');
const {createAudio}=require('../audio');
const G=require('../challenges');
const R=require('../routing-search');
const decisions=require('./fixtures/rebuild-decisions.json');
const {pack}=require('../revised-boards');
const playtest=require('./fixtures/revised-harder-pack.json');

const chapterKey='element-forge.chapter-one.v1';
const tutorialKey='element-forge.tutorial-campaign.v4';
const ids=chapter.map(level=>level.id);
const lessonIds=[...catalog,prototype].map(level=>level.id);
const memory=()=>{
 const values=new Map();
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
};

function play(level,plan){
 const session=createSession(level);
 assert.equal(session.start(E.placementCounts(plan.placements)).ok,true);
 const tunnels=[];
 for(const [index,value] of Object.entries(plan.placements)){
  const kind=E.placementKind(value);
  if(kind==='tunnel')tunnels.push(Number(index));
  else assert.equal(session.place(Number(index),kind,value?.pairId).ok,true);
 }
 if(tunnels.length)assert.equal(session.placeTunnel(...tunnels).ok,true);
 for(const route of plan.routes)for(const index of route.path)assert.equal(session.route(index).ok,true);
 const clear=session.verify();
 assert.equal(clear.ok,true);
 return {session,clear};
}

test('chapter has 12 unique stages and all contextual lessons exist',()=>{
 assert.equal(ids.length,12);
 assert.equal(new Set(ids).size,12);
 assert.equal(new Set(lessonIds).size,18);
 for(const stage of chapter)if(stage.lesson)assert.ok(lessonIds.includes(stage.lesson),stage.lesson);
});

for(const [index,level] of chapter.entries())test(`Chapter stage ${index+1}: ${level.map.name} solves through a player session`,()=>{
 const map=F.readLevel(level);
 assert.equal(map.width,12);
 assert.equal(map.height,12);
 const plan=E.solveConstruction(map);
 assert.equal(plan.status,'solved');
 const {session}=play(level,plan);
 assert.equal(createSession(level).restore(session.snapshot()),true);
});

test('opening lessons teach backtracking and alternate intersection placement',()=>{
 const opening=createSession(chapter[0]);
 assert.equal(opening.start().ok,true);
 assert.equal(opening.route(50).ok,true);
 assert.equal(opening.route(62).ok,false);
 assert.equal(E.solveFixed(F.readLevel(chapter[1]),{initialPlacements:{53:'intersection'}}).status,'solved');
});

for(const [group,stages] of Object.entries({chapter:chapter.slice(3),pack:pack.stages,playtest:playtest.stages})){
 test(`${group} replacement layouts have verified route or construction traps`,()=>{
  assert.equal(stages.length,decisions[group].length);
  assert.equal(new Set(stages.map(s=>G.layoutKey(F.readLevel(s)))).size,stages.length);
  for(const [i,stage] of stages.entries()){
   const map=F.readLevel(stage), model=R.prepare(map), wrong=decisions[group][i];
   assert.ok(G.replay(stage,E.solveConstruction(map)),stage.map.name);
   if(wrong.path){
    assert.equal(E.validatePath(map,wrong.element,wrong.path,[],wrong.required),null,stage.map.name);
    const options={prefixes:{[wrong.element]:wrong.path},required:wrong.required,limit:120000};
    assert.equal(R.solve(model,options).status,'unsolved',stage.map.name);
    for(const other of wrong.blocks)
     assert.equal(R.solve(model,{...options,only:[wrong.element,other]}).status,'unsolved',stage.map.name);
   }else{
    for(const [index,kind] of Object.entries(wrong.placement))assert.ok(E.canPlace(map,{},Number(index),kind));
    assert.equal(R.solve(model,{placements:wrong.placement,limit:120000}).status,'unsolved',stage.map.name);
   }
  }
 });
}

test('layout migration archives prior scores and preserves progress and saved challenge',()=>{
 const storage=memory(), id=ids[3];
 const old=createProgress(storage,ids,4,chapterKey);
 old.complete(id,85);
 old.saveCampaign({id,rules:4,board:{phase:'build'}});
 old.saveChallenge({pack:{stages:['legacy']},index:0});
 const current=createProgress(storage,ids,4,chapterKey,{[id]:2});
 assert.equal(current.best(id),null);
 assert.equal(current.historicalBest(id,1),85);
 assert.equal(current.reachedIndex(),4);
 assert.equal(current.campaign().id,id);
 assert.deepEqual(current.challenge().pack.stages,['legacy']);
 current.complete(id,50);
 const reload=createProgress(storage,ids,4,chapterKey,{[id]:2});
 assert.equal(reload.best(id),50);
 assert.equal(reload.historicalBest(id,1),85);
});

test('exact First Spark draft migrates while an incompatible tutorial draft remains archived',()=>{
 const storage=memory();
 const session=createSession(chapter[0]);
 session.start();session.route(50);session.route(51);
 const draft={id:ids[0],rules:4,board:session.snapshot()};
 const old=createProgress(storage,lessonIds,4);
 old.complete(lessonIds[3],55);
 old.saveCampaign(draft);
 old.saveChallenge({pack:{id:'saved-pack'},index:2});
 const progress=createProgress(storage,ids,4,chapterKey);
 assert.deepEqual(progress.campaign(),draft);
 assert.equal(createSession(chapter[0]).restore(progress.campaign().board),true);
 assert.equal(progress.challenge().index,2);
 assert.equal(createProgress(storage,lessonIds,4).best(lessonIds[3]),55);
 old.saveCampaign({...draft,id:lessonIds[1]});
 assert.equal(createProgress(storage,ids,4,chapterKey).campaign(),null);
 old.saveCampaign({...draft,rules:3});
 assert.equal(createProgress(storage,ids,4,chapterKey).campaign(),null);
 assert.ok(storage.getItem(tutorialKey));
});

test('replay scores, a new run and tutorial completion preserve campaign unlocks and independent saves',()=>{
 const storage=memory(), progress=createProgress(storage,ids,4,chapterKey);
 const tutorials=createProgress(storage,lessonIds,4);
 const draft={id:ids[0],rules:4,board:{phase:'build'}};
 assert.equal(progress.reachedIndex(),0);
 progress.complete(ids[0],30,{...draft,board:{phase:'complete'}});
 progress.complete(ids[1],35);
 assert.equal(progress.reachedIndex(),2);
 progress.saveCampaign(draft);
 progress.complete(ids[1],40);
 tutorials.complete(lessonIds[1],60);
 progress.saveChallenge({pack:{id:'independent'}});
 const reloaded=createProgress(storage,ids,4,chapterKey);
 assert.deepEqual(reloaded.campaign(),draft);
 assert.equal(reloaded.reachedIndex(),2);
 assert.equal(reloaded.best(ids[1]),40);
 assert.equal(reloaded.challenge().pack.id,'independent');
 assert.equal(createProgress(storage,lessonIds,4).best(lessonIds[1]),60);
});

test('audio settings persist, cue groups are gated, and scene switches stop existing notes',()=>{
 const storage=memory(), listeners={};
 const page={hidden:false,addEventListener:(name,fn)=>listeners[name]=fn};
 const param=()=>({value:1,setValueAtTime(){},cancelScheduledValues(){},
  exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}});
 let notes=0,stops=0;
 class Context{
  currentTime=0;
  state='running';
  destination={};
  createGain(){return {gain:param(),connect(){},disconnect(){}};}
  createOscillator(){return {frequency:param(),connect(){},disconnect(){},start(){notes++;},stop(){stops++;}};}
  suspend(){return Promise.resolve();}
  resume(){return Promise.resolve();}
 }
 const audio=createAudio({storage,document:page,AudioContext:Context});
 audio.set('music',false);
 audio.effect('build');
 assert.equal(notes,0);
 audio.unlock();
 audio.effect('build'); audio.effect('route'); audio.effect('harmony');
 assert.equal(notes,9);
 audio.set('effects',false);
 audio.effect('build');
 assert.equal(notes,9);
 const scheduled=stops;
 audio.scene('play');
 assert.equal(stops,scheduled+9);
 page.hidden=true;
 listeners.visibilitychange();
 const restored=createAudio({storage,document:page,AudioContext:Context});
 assert.deepEqual(restored.preferences,{music:false,effects:false});
});

test('Chapter Two opens after Chapter One and all five stages replay in the game session',()=>{
 const storage=memory();
 const old=createProgress(storage,ids,4,chapterKey);
 ids.forEach(id=>old.complete(id,40));
 old.saveCampaign({id:ids.at(-1),rules:4,layout:2,board:{phase:'complete'}});
 const all=[...ids,...chapterTwo.map(level=>level.id)];
 const migrated=createProgress(storage,all,4,chapterKey);
 assert.equal(migrated.reachedIndex(),12);
 assert.equal(migrated.completedCount(),12);
 assert.equal(migrated.campaign().id,ids.at(-1));
 assert.equal(new Set(all).size,17);
 for(const level of chapterTwo){
  const solution=E.solveConstruction(F.readLevel(level));
  assert.equal(solution.status,'solved',level.map.name);
  play(level,solution);
 }
});
