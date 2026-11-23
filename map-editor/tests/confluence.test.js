'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const F=require('../map-format.js');
const S=require('../../game/session.js');

const copy=value=>JSON.parse(JSON.stringify(value));
function mapFor(output='E'){
 const map={...F.fresh(5,5),rulesVersion:4};
 const chamber=12;
 map.cells[chamber]={terrain:'land',component:'confluence',props:{direction:output}};
 const ports=E.confluenceDirections(output);
 const start={N:2,E:14,S:22,W:10};
 map.cells[start[ports.water]]={terrain:'land',node:{element:'water',role:'source'}};
 map.cells[start[ports.earth]]={terrain:'land',node:{element:'earth',role:'source'}};
 map.cells[start[ports.nature]]={terrain:'land',node:{element:'nature',role:'destination'}};
 return map;
}
function paths(map){
 const chamber=E.confluence(map);
 const source={N:[2,7,12],E:[14,13,12],S:[22,17,12],W:[10,11,12]};
 const output={N:[12,7,2],E:[12,13,14],S:[12,17,22],W:[12,11,10]};
 return [
  {element:'nature',path:output[chamber.nature]},
  {element:'water',path:source[chamber.water]},
  {element:'earth',path:source[chamber.earth]}
 ];
}
test('Confluence exports and solves in all four orientations',()=>{
 for(const direction of ['N','E','S','W']){
  const map=F.parseMap(mapFor(direction));
  assert.deepEqual(F.structuralErrors(map).issues,[],direction);
  assert.deepEqual(E.checkAll(map,paths(map)),[],direction);
  const solved=E.solve(map,{allowPlacement:false,limit:80000});
  assert.equal(solved.status,'solved',direction+': '+solved.message);
  assert.deepEqual(E.checkAll(map,solved.routes,solved.placements),[],direction);
  const exported=F.createLevel(map);
  assert.equal(exported.map.cells[12].component,'confluence');
  assert.equal(F.readLevel(copy(exported)).cells[12].props.direction,direction);
 }
});
test('Port orientation, other elements, and missing input are rejected',()=>{
 const map=mapFor('E');
 assert.match(E.validatePath(map,'water',[2,1,6,11,12]),/input port/);
 assert.match(E.validatePath(map,'nature',[12,11,10]),/output port/);
 assert.match(E.validatePath(map,'earth',[22,17,12,7],[],{},true),/end at/);
 assert.match(E.validatePath(map,'fire',[12,13],[],{},true),/Missing endpoints|Only Water/);
 const incomplete=paths(map).filter(r=>r.element!=='earth');
 assert.match(E.checkAll(map,incomplete).join(' '),/earth: missing route/);
});
test('Map validation requires recipe endpoints and one chamber',()=>{
 const map=mapFor();
 const missing=copy(map);delete missing.cells[2].node;
 assert.match(F.structuralErrors(missing).issues.join(' '),/Water needs one source/);
 const extra=copy(map);extra.cells[0].node={element:'water',role:'destination'};
 assert.match(F.structuralErrors(extra).issues.join(' '),/no separate destination/);
 const duplicate=copy(map);duplicate.cells[11]={terrain:'land',component:'confluence'};
 assert.match(F.structuralErrors(duplicate).issues.join(' '),/Only one Confluence/);
 const blocked=copy(map);blocked.cells[7]={terrain:'mountain'};
 assert.match(F.structuralErrors(blocked).issues.join(' '),/Water port/);
 const edge=copy(map);edge.cells[12]={terrain:'land'};edge.cells[4]={terrain:'land',component:'confluence',props:{direction:'E'}};
 assert.match(F.structuralErrors(edge).issues.join(' '),/port/);
});
test('Pending Plant route, input routes, save/restore and undo',()=>{
 const level=F.createLevel(mapFor());
 const s=S.createSession(level);
 assert.equal(s.start().ok,true);
 for(const index of [12,13,14])assert.equal(s.route(index).ok,true,'Plant '+index);
 assert.match(s.evaluate().message,/water: missing route/);
 for(const index of [2,7,12])assert.equal(s.route(index).ok,true,'Water '+index);
 for(const index of [22,17,12])assert.equal(s.route(index).ok,true,'Earth '+index);
 assert.equal(s.evaluate().ok,true);
 const saved=s.snapshot();
 const restored=S.createSession(level);assert.equal(restored.start().ok,true);
 assert.equal(restored.restore(copy(saved)),true);
 assert.equal(restored.evaluate().ok,true);
 assert.equal(s.undo(),true);
 assert.equal(s.evaluate().ok,false);
});
test('Existing maps without chambers retain ordinary endpoint behavior',()=>{
 const map={...F.fresh(5,5),rulesVersion:4};
 map.cells[0]={terrain:'land',node:{element:'fire',role:'source'}};
 map.cells[4]={terrain:'land',node:{element:'fire',role:'destination'}};
 assert.deepEqual(E.pairs(map),[{element:'fire',source:0,destination:4}]);
 assert.deepEqual(F.structuralErrors(map).issues,[]);
 assert.equal(E.solve(map,{allowPlacement:false}).status,'solved');
});
