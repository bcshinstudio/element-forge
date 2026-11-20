'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../../map-editor/engine');
const F=require('../../map-editor/map-format');
const {chapter}=require('../chapter');
const {catalog,prototype}=require('../levels');
const {createSession}=require('../session');
const {createProgress}=require('../progress');
const {createAudio}=require('../audio');
const {verifyScarce}=require('../challenges');

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

test('chapter choices test alternative placements and movement rather than only the winning lines',()=>{
 const fixed=[
  [1,{53:'intersection'},'solved'],
  [2,{61:'intersection'},'unsolved'],
  [3,{64:'intersection'},'unsolved'],
  [5,{76:'bridge',67:'intersection'},'unsolved'],
  [6,{63:'intersection',65:'bridge'},'solved'],
  [7,{64:{kind:'tunnel',pairId:'T'},68:{kind:'tunnel',pairId:'T'}},'unsolved'],
  [8,{64:'intersection'},'unsolved'],
  [9,{67:'intersection'},'unsolved'],
  [10,{64:'intersection'},'solved'],
  [11,{62:'intersection',63:'intersection'},'unsolved']
 ];
 for(const [stage,initialPlacements,status] of fixed){
  const map=F.readLevel(chapter[stage]);
  for(const [index,value] of Object.entries(initialPlacements)){
   assert.equal(E.canPlace(map,{},Number(index),E.placementKind(value)),true);
  }
  const search=stage===7?E.solve:E.solveFixed;
  assert.equal(search(map,{initialPlacements}).status,status,chapter[stage].map.name);
 }
 const opening=createSession(chapter[0]);
 assert.equal(opening.start().ok,true);
 assert.equal(opening.route(50).ok,true);
 assert.equal(opening.route(62).ok,false);
 assert.deepEqual(verifyScarce().alternatives.map(a=>a.status),['unsolved','unsolved','solved']);
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
