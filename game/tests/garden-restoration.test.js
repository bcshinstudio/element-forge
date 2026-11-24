'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../garden'),E=require('../../map-editor/engine'),F=require('../../map-editor/map-format'),S=require('../session'),catalog=require('../../art/catalog.json');
const map=require('../../maps/the-garden-of-forgotten-wonders.json');
const solution={"routes":[{"element":"electricity","path":[79,92,93,94,95]},{"element":"wind","path":[89,102,101,100,87,74,73]},{"element":"water","path":[24,23,36,35,34,33,32]},{"element":"nature","path":[144,131,118,105,106,107,108,121,122,135,136]},{"element":"fire","path":[14,27,28,41,54,67,68,69]},{"element":"arcane","path":[154,141,140,139,138,125,112,99]}],"placements":{"87":"bridge"}};
test('Garden exact approved map and all six routes',()=>{
 assert.deepEqual(G.level.map,map);assert.deepEqual(F.mapFindings(map).findings,[]);assert.equal(E.solveConstruction(map).status,'solved');assert.deepEqual(E.checkAll(map,solution.routes,solution.placements),[]);
 for(const c of map.cells)assert.equal(catalog[c.terrainArt.id].type,c.terrain);
});
test('Garden restoration order independent; heart and gate stay dormant until all six',()=>{
 for(let mask=0;mask<64;mask++){
  const routes=solution.routes.filter(r=>mask&(1<<G.elements.indexOf(r.element)));
  const view=G.view(map,routes,catalog);
  for(const [i,c] of map.cells.entries()){
   const group=G.group(c.terrainArt.id),active=group==='complete'?mask===63:group&&Boolean(mask&(1<<G.elements.indexOf(group)));
   assert.equal(view[i].spec.id,active&&catalog[c.terrainArt.id].activeId?catalog[c.terrainArt.id].activeId:c.terrainArt.id);
  }
 }
});
test('Garden deliveries persist, prevent undo/reopen/removal, survive save and reset correctly',()=>{
 const s=S.createSession(G.level);assert.ok(s.start().ok);
 for(const [i,k] of Object.entries(solution.placements))assert.ok(s.place(+i,k).ok);
 for(const r of solution.routes){
  for(const i of r.path)assert.ok(s.route(i).ok,r.element+' '+i);
  assert.equal(s.route(r.path[0]).ok,false);assert.equal(s.route(r.path.at(-1),true).ok,false);assert.equal(s.undo(),false);
 }
 assert.equal(s.remove(87).ok,false);const restored=S.createSession(G.level);assert.ok(restored.restore(s.snapshot()));assert.equal(G.delivered(map,restored.state.routes).size,6);assert.ok(restored.verify().ok);
 restored.restart();assert.equal(G.delivered(map,restored.state.routes).size,0);
});

test('Garden motion layers are idempotent, distinct and removed on reset',()=>{
 const make=()=>({dataset:{},children:[],style:{setProperty(){}},setAttribute(){},append(child){this.children.push(child);child.remove=()=>{this.children=this.children.filter(x=>x!==child)}},querySelector(){return this.children.find(x=>x.className==='garden-motion')??null}});
 const tile=make();tile.ownerDocument={createElement:make};
 const view=G.view(map,solution.routes,catalog);
 for(const item of view.filter(x=>x.effect)){
  G.motion(tile,null);G.motion(tile,item);
  const layer=tile.querySelector();assert.ok(layer);assert.ok(layer.children.length>0);
  G.motion(tile,item);assert.equal(tile.querySelector(),layer);
  G.motion(tile,null);assert.equal(tile.querySelector(),null);assert.equal(tile.dataset.gardenEffect,undefined);
 }
});
