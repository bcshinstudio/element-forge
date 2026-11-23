'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../../map-editor/engine');
const F=require('../../map-editor/map-format');
const {chapter:replacementChapter,chapterTwo,chapterThree,chapterFour,chapterFive,chapterSix,chapterSeven,chapterEight,previousChapter:chapter,archivedTutorials}=require('../chapter');
const {catalog,prototype}=require('../levels');
const {createSession}=require('../session');
const {createProgress}=require('../progress');
const {createAudio}=require('../audio');
const G=require('../challenges');
const R=require('../routing-search');
const replacementPlans=require('./fixtures/sleeping-valley-solutions.json');
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

test('replacement lineup has 12 three-pair boards and preserves prior stages as tutorials',()=>{
 assert.equal(replacementChapter.length,12);
 assert.equal(new Set(replacementChapter.map(level=>level.id)).size,12);
 assert.equal(archivedTutorials.length,11);
 assert.equal(replacementChapter[0].map.name,'Sunken Ashwood');
 const tools=[
  [1,0,0,0],[0,1,2,0],[0,1,0,0],[0,0,0,2],[1,1,0,0],[0,1,0,0],
  [0,0,2,0],[1,1,0,0],[1,0,2,0],[0,0,0,2],[1,1,0,0],[1,1,2,0]
 ];
 for(const [index,level] of replacementChapter.entries()){
  const map=F.readLevel(level);
  assert.equal(map.width,12);
  assert.equal(map.height,12);
  assert.equal(E.pairs(map).length,3);
  assert.deepEqual(['bridge','intersection','tunnel','portal'].map(key=>map.inventory[key]),tools[index]);
 }
});

for(const [index,plan] of replacementPlans.entries()){
 const level=replacementChapter[index];
 test(`Replacement stage ${index+1} clears through a player session`,()=>play(level,plan));
}

test('replacement campaign starts fresh and inherits the saved challenge',()=>{
 const storage=memory();
 const original=createProgress(storage,ids,4,chapterKey);
 original.complete(ids[0],85,{id:ids[0],rules:4,board:{phase:'complete'}});
 original.saveChallenge({pack:{id:'preserved-pack'},index:2});
 const originalData=storage.getItem(chapterKey);
 const replacementIds=replacementChapter.map(level=>level.id);
 const replacement=createProgress(storage,replacementIds,4,'element-forge.sleeping-valley.v1',{},chapterKey);
 assert.equal(replacement.reachedIndex(),0);
 assert.equal(replacement.total(),0);
 assert.equal(replacement.campaign(),null);
 assert.deepEqual(replacement.challenge(),{pack:{id:'preserved-pack'},index:2});
 replacement.select(replacementIds[0]);
 assert.equal(storage.getItem(chapterKey),originalData);
});

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

test('audio preferences persist independently and scene cues can be stopped',()=>{
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
 audio.effect('build'); audio.effect('remove'); audio.effect('route'); audio.effect('harmony');
 assert.equal(notes,9);
 audio.effect('symphony');
 assert.equal(notes,21);
 const scheduled=stops;
 audio.story(false);
 assert.equal(stops,scheduled+12);
 audio.set('effects',false);
 audio.effect('build');
 assert.equal(notes,21);
 page.hidden=true;
 listeners.visibilitychange();
 const restored=createAudio({storage,document:page,AudioContext:Context});
 assert.deepEqual(restored.preferences,{music:false,effects:false});
});

test('Chapter Two opens after Chapter One and all twelve new boards replay in the game session',()=>{
 const plans=require('./fixtures/gatekeepers-solutions.json');
 const storage=memory();
 const all=[...replacementChapter,...chapterTwo].map(level=>level.id);
 const progress=createProgress(storage,all,4,chapterKey);
 for(const level of replacementChapter)progress.complete(level.id,40);
 assert.equal(progress.reachedIndex(),12);
 assert.equal(progress.completedCount(),12);
 assert.equal(new Set(all).size,24);
 assert.equal(chapterTwo.length,12);
 assert.equal(plans.length,chapterTwo.length);
 const toolBudgets=[
  [0,1,0,0],[0,0,0,2],[1,1,0,0],[0,0,2,2],[0,1,0,2],[0,0,0,0],
  [1,0,0,0],[0,0,0,2],[1,1,0,0],[0,1,2,0],[1,0,0,2],[1,1,2,0]
 ];
 for(const [index,level] of chapterTwo.entries()){
  const map=F.readLevel(level);
  assert.equal(E.pairs(map).length,index<5?3:4);
  assert.deepEqual(['bridge','intersection','tunnel','portal'].map(tool=>map.inventory[tool]),toolBudgets[index]);
  const result=play(level,plans[index]);
  progress.complete(level.id,result.clear.points);
  assert.equal(progress.reachedIndex(),Math.min(index+13,23));
 }
 assert.equal(progress.completedCount(),24);
});

test('Chapter Three extends existing saves and replays all twelve Primeval Crucible boards',()=>{
 const earlier=[...replacementChapter,...chapterTwo].map(level=>level.id);
 const storage=memory();
 const original=createProgress(storage,earlier,4,chapterKey);
 for(const id of earlier)original.complete(id,40);
 const ids=[...earlier,...chapterThree.map(level=>level.id)];
 const progress=createProgress(storage,ids,4,chapterKey);
 assert.equal(progress.reachedIndex(),24);
 assert.equal(progress.total(),960);
 assert.equal(chapterThree.length,12);
 assert.equal(new Set(ids).size,36);
 const plans=require('./fixtures/primeval-crucible-solutions.json');
 const budgets=[
  [1,1,0,0],[0,0,2,2],[0,1,2,0],[1,0,0,2],[1,1,2,0],[0,0,2,2],
  [1,1,0,0],[1,0,2,2],[1,1,0,2],[0,1,2,2],[1,1,2,0],[1,1,0,0]
 ];
 for(const [index,level] of chapterThree.entries()){
  const map=F.readLevel(level);
  assert.equal(level.id,'primeval-crucible-'+(index+25));
  assert.equal(plans[index].id,level.id);
  assert.deepEqual([map.width,map.height],[12,12]);
  assert.equal(E.pairs(map).length,index===11?5:4);
  const tools=['bridge','intersection','tunnel','portal'];
  assert.deepEqual(tools.map(tool=>map.inventory[tool]),budgets[index]);
  const counts=E.placementCounts(plans[index].placements);
  assert.deepEqual(tools.map(tool=>counts[tool]??0),budgets[index]);
  const result=play(level,plans[index]);
  progress.complete(level.id,result.clear.points);
  assert.equal(progress.reachedIndex(),Math.min(25+index,35));
 }
 assert.equal(progress.completedCount(),36);
});

test('The Astral Loom preserves campaign progress and all twelve five-current puzzles replay',()=>{
 const earlier=[...replacementChapter,...chapterTwo,...chapterThree].map(level=>level.id);
 const storage=memory();
 const original=createProgress(storage,earlier,4,chapterKey);
 for(const id of earlier)original.complete(id,40);
 const ids=[...earlier,...chapterFour.map(level=>level.id)];
 const progress=createProgress(storage,ids,4,chapterKey);
 assert.equal(progress.reachedIndex(),36);
 assert.equal(progress.total(),1440);
 assert.equal(chapterFour.length,12);
 assert.equal(new Set(ids).size,48);
 const plans=require('./fixtures/astral-loom-solutions.json');
 const tools=['bridge','intersection','tunnel','portal'];
 const budgets=[
  [1,0,0,0],[0,0,2,0],[0,1,0,0],[1,1,0,0],[0,0,0,2],[1,0,2,0],
  [0,1,0,2],[1,1,2,0],[1,1,0,2],[0,1,2,2],[1,1,0,2],[1,1,2,2]
 ];
 const boardPieces=[[2,2],[2,2],[2,3],[3,3],[3,3],[3,4],[4,3],[4,4],[4,4],[5,4],[5,5],[6,5]];
 for(const [index,level] of chapterFour.entries()){
  const map=F.readLevel(level);
  assert.equal(level.id,'astral-loom-'+(index+37));
  assert.equal(plans[index].id,level.id);
  assert.deepEqual([map.width,map.height],[12,12]);
  assert.equal(E.pairs(map).length,5);
  assert.deepEqual(['gate','checkpoint'].map(kind=>map.cells.filter(cell=>cell.component===kind).length),boardPieces[index]);
  assert.deepEqual(tools.map(tool=>map.inventory[tool]),budgets[index]);
  const counts=E.placementCounts(plans[index].placements);
  assert.deepEqual(tools.map(tool=>counts[tool]??0),budgets[index]);
  for(const tile of Object.keys(plans[index].placements).map(Number)){
   assert.ok(plans[index].routes.some(route=>route.path.includes(tile)), 'Every placed tool must be used in the replay');
  }
  const result=play(level,plans[index]);
  progress.complete(level.id,result.clear.points);
  assert.equal(progress.reachedIndex(),Math.min(index+37,47));
 }
 assert.equal(progress.completedCount(),48);
});

test('Chapter Five extends saved campaigns and all Celestial Confluence stages replay',()=>{
 const earlier=[...replacementChapter,...chapterTwo,...chapterThree,...chapterFour].map(level=>level.id);
 const storage=memory();
 const original=createProgress(storage,earlier,4,chapterKey);
 for(const id of earlier)original.complete(id,40);
 const ids=[...earlier,...chapterFive.map(level=>level.id)];
 const progress=createProgress(storage,ids,4,chapterKey);
 assert.equal(progress.reachedIndex(),48);
 assert.equal(progress.total(),1920);
 assert.equal(chapterFive.length,12);
 assert.equal(new Set(ids).size,60);
 const plans=require('./fixtures/celestial-confluence-solutions.json');
 const tools=['bridge','intersection','tunnel','portal'];
 const budgets=[
  [1,0,0,0],[0,0,2,0],[0,1,0,0],[1,0,2,2],[1,1,0,2],[0,1,2,2],
  [1,1,0,0],[0,0,2,2],[1,1,2,0],[1,1,0,2],[1,1,2,2],[1,1,2,0]
 ];
 const pairs=[5,5,5,3,4,4,5,5,5,5,5,6];
 const pieces=[[2,2],[2,2],[2,3],[5,3],[5,4],[6,4],[3,4],[4,4],[4,4],[5,4],[6,5],[4,4]];
 for(const [index,level] of chapterFive.entries()){
  const map=F.readLevel(level);
  assert.equal(level.id,'celestial-confluence-'+(49+index));
  assert.equal(plans[index].id,level.id);
  assert.deepEqual([map.width,map.height],[12,12]);
  assert.equal(E.pairs(map).length,pairs[index]);
  assert.deepEqual(['gate','checkpoint'].map(kind=>map.cells.filter(cell=>cell.component===kind).length),pieces[index]);
  assert.deepEqual(tools.map(tool=>map.inventory[tool]),budgets[index]);
  const counts=E.placementCounts(plans[index].placements);
  assert.deepEqual(tools.map(tool=>counts[tool]??0),budgets[index]);
  for(const tile of Object.keys(plans[index].placements).map(Number)){
   assert.ok(plans[index].routes.some(route=>route.path.includes(tile)), 'Every placed tool must be used in the replay');
  }
  const result=play(level,plans[index]);
  progress.complete(level.id,result.clear.points);
  assert.equal(progress.reachedIndex(),Math.min(49+index,59));
 }
 const finale=chapterFive.at(-1);
 const finalePlan=plans.at(-1);
 const finaleTiles=new Set(finalePlan.routes.flatMap(route=>route.path));
 finale.map.cells.forEach((cell,index)=>{
  if(cell.component==='gate')assert.ok(finaleTiles.has(index),'The finale replay must thread all four gates');
 });
 assert.equal(progress.completedCount(),60);
});

test('Chapter Six extends the campaign to 72 stages and replays every Playground board',()=>{
 const earlier=[...replacementChapter,...chapterTwo,...chapterThree,...chapterFour,...chapterFive].map(level=>level.id);
 const storage=memory();
 const original=createProgress(storage,earlier,4,chapterKey);
 for(const id of earlier)original.complete(id,40);
 const ids=[...earlier,...chapterSix.map(level=>level.id)];
 const progress=createProgress(storage,ids,4,chapterKey);
 assert.equal(progress.reachedIndex(),60);
 assert.equal(progress.total(),2400);
 assert.equal(chapterSix.length,12);
 assert.equal(new Set(ids).size,72);
 const plans=require('./fixtures/weavers-playground-solutions.json');
 const tools=['bridge','intersection','tunnel','portal'];
 const budgets=[[0,0,0,0],[0,0,0,2],[0,0,0,6],[0,1,0,0],[4,1,0,0],[0,1,0,2],
  [0,0,2,0],[0,4,0,0],[0,1,0,2],[1,1,0,0],[0,1,0,2],[1,1,2,2]];
 const pairCounts=[1,2,2,3,4,3,4,5,5,4,5,6];
 const fixtures=[[6,5],[4,4],[4,5],[4,4],[3,4],[4,9],[4,4],[4,5],[4,5],[12,4],[4,5],[6,6]];
 for(const [index,level] of chapterSix.entries()){
  const map=F.readLevel(level);
  assert.equal(level.id,'weavers-playground-'+(61+index));
  assert.equal(plans[index].id,level.id);
  assert.deepEqual([map.width,map.height],[12,12]);
  assert.equal(E.pairs(map).length,pairCounts[index]);
  assert.deepEqual(['gate','checkpoint'].map(kind=>map.cells.filter(cell=>cell.component===kind).length),fixtures[index]);
  assert.deepEqual(tools.map(tool=>map.inventory[tool]),budgets[index]);
  const counts=E.placementCounts(plans[index].placements);
  const expected=index===4?[1,1,0,0]:budgets[index];
  assert.deepEqual(tools.map(tool=>counts[tool]??0),expected);
  for(const tile of Object.keys(plans[index].placements).map(Number)){
   assert.ok(plans[index].routes.some(route=>route.path.includes(tile)), 'Every placed tool must be used in the replay');
  }
  const result=play(level,plans[index]);
  progress.complete(level.id,result.clear.points);
  assert.equal(progress.reachedIndex(),Math.min(61+index,71));
 }
 assert.equal(progress.completedCount(),72);
});

test('The Shattered Abyss extends the save and replays all twelve stages through the seven-current finale',()=>{
 const earlier=[...replacementChapter,...chapterTwo,...chapterThree,...chapterFour,...chapterFive,...chapterSix];
 const storage=memory();
 const original=createProgress(storage,earlier.map(level=>level.id),4,chapterKey);
 for(const {id} of earlier)original.complete(id,40);
 const ids=[...earlier,...chapterSeven].map(level=>level.id);
 const progress=createProgress(storage,ids,4,chapterKey);
 assert.equal(progress.reachedIndex(),72);
 assert.equal(progress.total(),2880);
 assert.equal(chapterSeven.length,12);
 assert.equal(new Set(ids).size,84);
 const plans=require('./fixtures/shattered-abyss-solutions.json');
 const tools=['bridge','intersection','tunnel','portal'];
 const budgets=[[1,1,0,2],[1,1,2,0],[1,1,0,2],[0,1,2,2],[1,1,0,0],[0,0,2,2],
  [1,1,0,0],[1,1,2,0],[0,1,2,2],[1,1,0,2],[1,1,2,2],[1,2,2,2]];
 const pieces=[[5,4],[5,5],[6,5],[6,5],[3,4],[4,4],[4,5],[5,5],[5,6],[6,6],[6,6],[7,7]];
 for(const [index,level] of chapterSeven.entries()){
  const map=F.readLevel(level);
  assert.equal(level.id,'shattered-abyss-'+(73+index));
  assert.equal(plans[index].id,level.id);
  assert.deepEqual([map.width,map.height],[12,12]);
  assert.equal(E.pairs(map).length,index<4?5:index<11?6:7);
  assert.deepEqual(['gate','checkpoint'].map(kind=>map.cells.filter(cell=>cell.component===kind).length),pieces[index]);
  assert.deepEqual(tools.map(tool=>map.inventory[tool]),budgets[index]);
  const counts=E.placementCounts(plans[index].placements);
  assert.deepEqual(tools.map(tool=>counts[tool]??0),budgets[index]);
  for(const tile of Object.keys(plans[index].placements).map(Number)){
   assert.ok(plans[index].routes.some(route=>route.path.includes(tile)), 'Every placed tool must be used in the replay');
   if(plans[index].placements[tile]==='intersection'){
    assert.equal(plans[index].routes.filter(route=>route.path.includes(tile)).length,2);
   }
  }
  const result=play(level,plans[index]);
  progress.complete(level.id,result.clear.points);
  assert.equal(progress.reachedIndex(),Math.min(73+index,83));
 }
 const finaleTiles=new Set(plans.at(-1).routes.flatMap(route=>route.path));
 chapterSeven.at(-1).map.cells.forEach((cell,index)=>{
  if(cell.component==='gate')assert.ok(finaleTiles.has(index),'The finale replay must thread all seven gates');
 });
 assert.equal(progress.completedCount(),84);
});

test('Chapter Eight resumes at stage 85 and replays twelve boards through the eight-current finale',()=>{
 const earlier=[...replacementChapter,...chapterTwo,...chapterThree,...chapterFour,...chapterFive,...chapterSix,...chapterSeven];
 const storage=memory();
 const original=createProgress(storage,earlier.map(level=>level.id),4,chapterKey);
 for(const {id} of earlier)original.complete(id,40);
 const ids=[...earlier,...chapterEight].map(level=>level.id);
 const progress=createProgress(storage,ids,4,chapterKey);
 assert.equal(progress.reachedIndex(),84);
 assert.equal(progress.total(),3360);
 assert.equal(chapterEight.length,12);
 assert.equal(new Set(ids).size,96);
 const plans=require('./fixtures/world-heart-sanctuary-solutions.json');
 const tools=['bridge','intersection','tunnel','portal'];
 const budgets=[[1,1,2,0],[1,1,0,2],[0,1,2,2],[1,1,2,0],[0,1,2,2],[1,1,0,2],
  [1,1,2,0],[1,1,0,2],[0,1,2,2],[1,1,2,2],[1,2,0,2],[1,2,2,2]];
 const pieces=[[4,4],[4,5],[5,5],[5,6],[6,6],[6,6],[5,6],[6,6],[6,7],[7,7],[7,7],[6,6]];
 for(const [index,level] of chapterEight.entries()){
  const map=F.readLevel(level);
  const plan=plans[index];
  assert.equal(level.id,'world-heart-sanctuary-'+(85+index));
  assert.equal(plan.id,level.id);
  assert.deepEqual([map.width,map.height],[12,12]);
  assert.equal(E.pairs(map).length,index<6?6:index<11?7:8);
  assert.deepEqual(['gate','checkpoint'].map(kind=>map.cells.filter(cell=>cell.component===kind).length),pieces[index]);
  assert.deepEqual(tools.map(tool=>map.inventory[tool]),budgets[index]);
  const counts=E.placementCounts(plan.placements);
  assert.deepEqual(tools.map(tool=>counts[tool]??0),budgets[index]);
  for(const [tile,placement] of Object.entries(plan.placements)){
   const users=plan.routes.filter(({path})=>path.includes(Number(tile)));
   assert.ok(users.length,'Every tool must appear in a verified route');
   if(placement==='intersection')assert.equal(users.length,2);
  }
  const {clear}=play(level,plan);
  progress.complete(level.id,clear.points);
  assert.equal(progress.reachedIndex(),Math.min(85+index,95));
 }
 const finaleTiles=new Set(plans.at(-1).routes.flatMap(({path})=>path));
 chapterEight.at(-1).map.cells.forEach((cell,index)=>{
  if(cell.component==='gate')assert.ok(finaleTiles.has(index),'The finale replay must pass every gate');
 });
 assert.equal(progress.completedCount(),96);
});
