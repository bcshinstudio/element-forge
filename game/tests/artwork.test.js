'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const F=require('../../map-editor/map-format');
const E=require('../../map-editor/engine');
const {createSession}=require('../session');
const {createProgress}=require('../progress');
const catalog=require('../../art/catalog.json');
global.EFArtCatalog=catalog;
const Art=require('../../art/variants');
delete global.EFArtCatalog;
const campaign=require('../chapter');
const chapterKeys=['chapter','chapterTwo','chapterThree','chapterFour','chapterFive','chapterSix','chapterSeven','chapterEight'];
const chapterFiles=['sleeping-valley','gatekeepers','primeval-crucible','astral-loom','celestial-confluence','weavers-playground','shattered-abyss','world-heart-sanctuary'];

function replay(level,plan){
 const session=createSession(level);
 const save={...session.snapshot(),phase:'build',loadout:E.placementCounts(plan.placements),
  routes:plan.routes,placements:plan.placements};
 assert.equal(session.restore(save),true,level.map.name);
 assert.equal(session.verify().ok,true,level.map.name);
 return session.snapshot();
}
function gameplay(map){
 const clean=structuredClone(map);
 delete clean.artPalette;
 delete clean.toolArt;
 for(const cell of clean.cells){
  delete cell.terrainArt;
  delete cell.componentArt;
 }
 return clean;
}

test('all approved art is cataloged, placed in its gameplay family, and present in the source builds',()=>{
 assert.equal(Object.keys(catalog).length,178);
 assert.equal(new Set(Object.values(catalog).map(a=>a.type+'|'+a.label)).size,88);
 for(const [type] of [...F.TERRAIN,...F.COMPONENTS]){
   if(type==='confluence')assert.match(fs.readFileSync(path.join(__dirname,'../../art/board.css'),'utf8'),/\.confluence-mark/,'Confluence uses procedural CSS art');
   else assert.ok(Art.options(type).length,type);
  }
 for(const art of Object.values(catalog)){
  assert.ok(fs.existsSync(path.join(__dirname,'../../art/variants',art.file)),art.file);
  assert.equal(Art.resolve({id:art.id},art.type),art);
  assert.equal(Art.resolve({id:art.id},'unrelated'),null);
 }
});

test('all 96 campaign maps keep the original solution and rule data after applying and exporting their chapter palette',()=>{
 for(const [chapter,key] of chapterKeys.entries()){
  const plans=require('./fixtures/'+chapterFiles[chapter]+'-solutions.json');
  for(const [i,level] of campaign[key].entries()){
   const original=F.readLevel(level);
   assert.equal(original.artPalette,undefined);
   assert.ok(original.cells.every(cell=>!cell.terrainArt&&!cell.componentArt));
   const decorated=Art.campaignLevel(level,chapter);
   const draft=F.readLevel(decorated);
   assert.equal(decorated.id,level.id);
   assert.equal(decorated.layout,level.layout);
   assert.equal(draft.artPalette,chapter+1);
   assert.ok(draft.cells.every(cell=>Art.resolve(cell.terrainArt,cell.terrain)));
   const exported=JSON.parse(JSON.stringify(F.asLevel(draft)));
   assert.deepEqual(F.parseMap(JSON.parse(JSON.stringify(draft))),F.readLevel(exported));
   assert.deepEqual(gameplay(F.readLevel(exported)),original);
   assert.deepEqual(replay(exported,plans[i]),replay(level,plans[i]));
  }
 }
});

test('cosmetic direction can rotate independently of the level arrow and unknown IDs survive',()=>{
 const draft=F.readLevel(campaign.chapter[0]);
 const index=draft.cells.findIndex((cell,i)=>i>0&&cell.terrain==='land'&&!cell.node&&!cell.component);
 draft.cells[index]={terrain:'oneway',props:{direction:'E'},terrainArt:{id:Art.options('oneway').find(item=>item.piece==='east').id,rotation:90}};
 draft.cells[0].terrainArt={id:'retired-art',rotation:270};
 const map=F.readLevel(JSON.parse(JSON.stringify(F.asLevel(draft))));
 assert.deepEqual(map.cells[index],draft.cells[index]);
 assert.equal(Art.heading(map.cells[index].terrainArt,'oneway'),'S');
 assert.equal(map.cells[index].props.direction,'E');
 assert.equal(Art.resolve(map.cells[0].terrainArt,map.cells[0].terrain),null);
 assert.deepEqual(map.cells[0].terrainArt,draft.cells[0].terrainArt);
 assert.throws(()=>F.parseMap({...draft,cells:draft.cells.map((c,i)=>i===index?
  {...c,terrainArt:{...c.terrainArt,rotation:45}}:c)}),/Invalid artwork choice or rotation/);
});

test('river and bank suggestions choose pieces based on geometry without editing rules',()=>{
 const draft=F.fresh(4,4);
 draft.cells[4]={terrain:'river',props:{direction:'E'}};
 draft.cells[5]={terrain:'river',props:{direction:'S'}};
 draft.cells[9]={terrain:'river',props:{direction:'S'}};
 draft.cells[6]={terrain:'bank'};
 draft.cells[10]={terrain:'bank'};
 assert.equal(Art.suggest(draft,5,'river').piece,'bend-w-s');
 assert.equal(Art.suggest(draft,6,'bank').piece,'edge-west');
 assert.equal(Art.suggest(draft,10,'bank').piece,'edge-west');
 Art.applyPalette(draft,0);
 assert.equal(draft.cells[5].props.direction,'S');
 assert.equal(Art.resolve(draft.cells[5].terrainArt,'river').piece,'bend-w-s');
});

test('validation points to mismatched endpoints, unpaired links and editor-only fixtures',()=>{
 const draft=F.fresh(4,4);
 draft.rulesVersion=4;
 draft.cells[0]={terrain:'land',node:{element:'fire',role:'source'}};
 draft.cells[1]={terrain:'land',component:'portal',props:{pairId:'A'}};
 draft.cells[2]={terrain:'land',component:'sorter'};
 draft.cells[3]={terrain:'lava',component:'bridge'};
 draft.cells[4]={terrain:'oneway',props:{direction:'X'}};
 const {findings}=F.mapFindings(draft);
 for(const [index,pattern] of [[0,/Fire.*source.*inlet/],[1,/portal A/],[2,/editor-only/],[3,/Bridge.*Lava/],[4,/invalid direction/]]){
  assert.ok(findings.some(f=>f.indices.includes(index)&&pattern.test(f.message)),String(pattern));
 }
});

test('a previously saved partial campaign resumes after an independent artwork playtest',()=>{
 const level=campaign.chapter[0];
 const key='element-forge.sleeping-valley.v1';
 const store=new Map();
 const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 const progress=()=>createProgress(storage,campaign.chapter.map(entry=>entry.id),level.rulesVersion,key);
 const plan=require('./fixtures/sleeping-valley-solutions.json')[0];
 const live=createSession(level);
 assert.equal(live.start().ok,true);
 for(const i of plan.routes[0].path.slice(0,2))assert.equal(live.route(i).ok,true);
 progress().saveCampaign({id:level.id,rules:level.rulesVersion,board:live.snapshot()});
 const old=store.get(key);
 const draft=F.readLevel(level);
 Art.applyPalette(draft,0);
 replay(F.asLevel(draft),plan);
 assert.equal(store.get(key),old);
 const resumed=createSession(level);
 assert.equal(resumed.restore(progress().campaign().board),true);
 assert.deepEqual(resumed.snapshot(),live.snapshot());
});
