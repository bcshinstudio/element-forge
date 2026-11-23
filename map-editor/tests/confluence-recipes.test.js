'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const F=require('../map-format.js');
const S=require('../../game/session.js');
const copy=value=>JSON.parse(JSON.stringify(value));

const portIndex={N:2,E:14,S:22,W:10};
const incoming={N:[2,7,12],E:[14,13,12],S:[22,17,12],W:[10,11,12]};
const outgoing={N:[12,7,2],E:[12,13,14],S:[12,17,22],W:[12,11,10]};
const recipes=[...E.CONFLUENCE_RECIPES,{id:'custom',inputs:['ice','metal'],output:'arcane'}];

function makeMap(recipe,heading='E'){
 const map={...F.fresh(5,5),rulesVersion:4};
 const direction=E.confluenceDirections(heading);
 const props={direction:heading,recipe:recipe.id};
 if(recipe.id==='custom'){props.inputs=[...recipe.inputs];props.output=recipe.output;}
 map.cells[12]={terrain:'land',component:'confluence',props};
 map.cells[portIndex[direction.input1]]={terrain:'land',node:{element:recipe.inputs[0],role:'source'}};
 map.cells[portIndex[direction.input2]]={terrain:'land',node:{element:recipe.inputs[1],role:'source'}};
 map.cells[portIndex[direction.exit]]={terrain:'land',node:{element:recipe.output,role:'destination'}};
 return map;
}
function routes(map){
 const chamber=E.confluence(map);
 return [
  {element:chamber.output,path:outgoing[chamber.ports[chamber.output]]},
  ...chamber.inputs.map(element=>({element,path:incoming[chamber.ports[element]]}))
 ];
}

test('Every preset and custom reaction supports rotation, solver, save, restore, and game session',()=>{
 for(const recipe of recipes)for(const heading of ['N','E','S','W']){
  const raw=makeMap(recipe,heading),map=F.parseMap(raw);
  assert.deepEqual(F.structuralErrors(map).issues,[],recipe.id+':'+heading);
  const intended=routes(map);
  assert.deepEqual(E.checkAll(map,intended),[],recipe.id+':'+heading);
  const verification=E.solve(map,{allowPlacement:false,limit:30000});
  assert.equal(verification.status,'solved',recipe.id+':'+heading);
  assert.deepEqual(E.checkAll(map,verification.routes,verification.placements),[]);
  const level=F.createLevel(map);
  assert.deepEqual(F.parseMap(F.readLevel(copy(level))),map);
  const session=S.createSession(level);
  assert.equal(session.start().ok,true);
  for(const path of intended.map(r=>r.path))
   for(const index of path)assert.equal(session.route(index).ok,true,recipe.id+':'+heading+': '+index);
  assert.equal(session.evaluate().ok,true,recipe.id+':'+heading);
  const restored=S.createSession(level);
  assert.equal(restored.start().ok,true);
  assert.equal(restored.restore(copy(session.snapshot())),true);
  assert.equal(restored.evaluate().ok,true);
 }
});
test('Reaction input order and direction are enforced',()=>{
 for(const recipe of recipes){
  const map=makeMap(recipe);
  const [first,second]=recipe.inputs;
  assert.match(E.validatePath(map,first,incoming.S,[],{}),/input port/);
  assert.match(E.validatePath(map,second,incoming.N,[],{}),/input port/);
  assert.match(E.validatePath(map,recipe.output,[12,11,10],[],{},true),/output port/);
  assert.match(E.checkAll(map,routes(map).slice(0,2)).join(' '),/missing route/);
 }
});
test('Unknown recipes and non-distinct custom elements are rejected',()=>{
 for(const props of [
  {recipe:'not-real'},{recipe:'custom',inputs:['water','water'],output:'nature'},
  {recipe:'custom',inputs:['water','earth'],output:'water'},
  {recipe:'custom',inputs:['water','no-such-element'],output:'nature'},
  {recipe:'custom',inputs:['water'],output:'nature'},
  {recipe:'custom',inputs:['water','earth']}
 ]){
  const map={...F.fresh(5,5)};
  map.cells[12]={terrain:'land',component:'confluence',props};
  assert.throws(()=>F.parseMap(map),/invalid Confluence/);
 }
});
test('The chamber requires correct physical source/destination configuration',()=>{
 for(const recipe of recipes){
  const map=makeMap(recipe);
  delete map.cells[2].node;
  assert.match(F.structuralErrors(map).issues.join(' '),/needs one source/);
  assert.throws(()=>F.createLevel(map),/needs one source/);
  const wrong=makeMap(recipe);wrong.cells[0]={terrain:'land',node:{element:recipe.output,role:'source'}};
  assert.match(F.structuralErrors(wrong).issues.join(' '),/no separate/);
  const duplicate=makeMap(recipe);duplicate.cells[12].props.output=recipe.inputs[0];
  if(recipe.id==='custom')assert.throws(()=>F.parseMap(duplicate),/invalid Confluence/);
 }
});
test('Legacy chamber without a recipe remains Water + Earth to Plant',()=>{
 const recipe=E.CONFLUENCE_RECIPES[0],map=makeMap(recipe);
 delete map.cells[12].props.recipe;
 assert.equal(E.confluenceRecipe(map.cells[12].props).id,'water-earth-nature');
 assert.equal(F.parseMap(map).cells[12].props.recipe,undefined);
 assert.deepEqual(E.checkAll(map,routes(map)),[]);
 assert.equal(F.createLevel(map).map.cells[12].props.recipe,undefined);
});
