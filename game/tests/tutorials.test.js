'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../../map-editor/engine');
const F=require('../../map-editor/map-format');
const G=require('../challenges');
const {catalog,harmonyCatalog}=require('../levels');
const {createProgress}=require('../progress');

for(const entry of catalog)test(entry.map.name+' teaches a required action and replays',()=>{
 const map=F.readLevel(entry);
 assert.equal(map.rulesVersion,4);
 assert.equal(map.cells.length,144);
 const win=E.solveConstruction(map);
 assert.equal(win.status,'solved');
 assert.ok(G.replay(entry,win));
 for(const feature of entry.requires){
  const trial=structuredClone(map);
  if(feature==='jump'){
   for(const cell of trial.cells)if(cell.terrain==='void')cell.terrain='wall';
  }else if(feature in trial.inventory){
   trial.inventory[feature]=0;
   for(const cell of trial.cells)if(cell.component===feature){
    // Retain the station's obligation while blocking its approach.
    if(feature==='checkpoint')cell.terrain='wall';
    else delete cell.component;
   }
  }else for(const cell of trial.cells)if(cell.terrain===feature)cell.terrain='wall';
  assert.equal(E.solveConstruction(trial).status,'unsolved',feature+' can be bypassed');
 }
});

test('Fire and Electricity reject all water depths regardless of span under Rules 4',()=>{
 for(const element of ['fire','electricity'])for(const terrain of ['water','shallow','river']){
  for(const component of [undefined,'bridge','metalSpan']){
   const map={...F.fresh(4,4),rulesVersion:4};
   map.cells[0].node={element,role:'source'};
   map.cells[1]={terrain,component};
   map.cells[2].node={element,role:'destination'};
   assert.match(E.validatePath(map,element,[0,1,2]),/Fire cannot cross water|Electricity needs dry ground/);
  }
 }
 const old=F.readLevel(harmonyCatalog[3]);
 assert.equal(old.rulesVersion,3);
 assert.equal(E.terrainError(old,'electricity',29,'metalSpan'),null);
 const current={...old,rulesVersion:4};
 assert.match(E.terrainError(current,'electricity',29,'metalSpan'),/dry ground/);
});

test('Water uses adjacent shores without marks, with no diagonal or lava exception',()=>{
 const entry=catalog.find(level=>level.map.name==='Free Current');
 const map=F.readLevel(entry);
 assert.ok(!map.cells.some(cell=>cell.terrain==='bank'));
 const win=E.solveConstruction(map);
 assert.ok(G.replay(entry,win));
 const crossing=win.routes[0].path.findIndex(i=>map.cells[i].terrain==='river');
 const start=win.routes[0].path[crossing-1];
 const river=win.routes[0].path[crossing];
 assert.equal(E.allowedTransition(map,'water',start,river),true);
 assert.equal(E.allowedTransition(map,'water',start-map.width,river),false);
 assert.match(E.terrainError(map,'water',map.cells.findIndex(c=>c.terrain==='lava')),/Only Fire/);
});

test('Wind cannot cross a two-cell gap or use a tunnel',()=>{
 const map=F.readLevel(catalog.find(level=>level.map.name==='One Clear Jump'));
 const {source}=E.pairs(map)[0];
 assert.ok(E.windLandings(map,source+2).includes(source+4));
 assert.equal(E.allowedTransition(map,'wind',source+map.width+1,source+map.width+4),false);
 const tunnel=map.cells.findIndex(c=>c.component==='tunnel');
 assert.ok(E.linkPartner(map,tunnel)>=0);
 assert.ok(!E.routeNeighbors(map,tunnel,{},'wind').includes(E.linkPartner(map,tunnel)));
});

test('New campaign does not reuse or overwrite Rules 3 scores and drafts',()=>{
 const oldKey='element-forge.campaign.v2';
 const old=JSON.stringify({version:2,selected:'ember-meadow',completed:['ember-meadow'],
  best:{'ember-meadow':122},campaign:{id:'ember-meadow',board:{phase:'build'}},challenge:{index:0}});
 const data=new Map([[oldKey,old]]);
 const storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 const ids=catalog.map(level=>level.id);
 const progress=createProgress(storage,ids,4);
 assert.equal(progress.total(),0);
 assert.equal(progress.campaign(),null);
 assert.equal(progress.challenge().index,0);
 progress.complete(ids[0],126);
 assert.equal(data.get(oldKey),old);
 assert.equal(createProgress(storage,ids,4).total(),126);
});
