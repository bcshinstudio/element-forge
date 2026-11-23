'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../engine.js');
const F=require('../map-format.js');
const S=require('../../game/session.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const names=['multi-confluence-twin-chambers','multi-confluence-repeated-input','multi-confluence-cascade'];
const plans={
 'multi-confluence-twin-chambers':[
  {element:'water',path:[3,12,21]},{element:'earth',path:[28,29,30,21]},
  {element:'nature',path:[21,22,23,24]},{element:'fire',path:[39,48,57]},
  {element:'earth',path:[75,66,57]},{element:'metal',path:[57,58,59,60]}
 ],
 'multi-confluence-repeated-input':[
  {element:'fire',path:[3,12,21]},{element:'earth',path:[39,30,21]},
  {element:'metal',path:[21,22,23,24]},{element:'fire',path:[45,46,47,48,57]},
  {element:'water',path:[75,66,57]},{element:'wind',path:[57,58,59,60]}
 ],
 'multi-confluence-cascade':[
  {element:'water',path:[2,14,26]},{element:'earth',path:[50,38,26]},
  {element:'nature',path:[26,27,28,29,30,42]},{element:'fire',path:[66,54,42]},
  {element:'wind',path:[42,43,44,45,57,69]},{element:'light',path:[93,81,69]},
  {element:'electricity',path:[69,70,71]}
 ]
};
const map=name=>F.parseMap(JSON.parse(fs.readFileSync(path.join(__dirname,'../examples/'+name+'.map.json'),'utf8')));
test('Two independent, repeated-element, and three chained chambers solve and export',()=>{
 for(const name of names){
  const m=map(name),routes=plans[name],ch=E.confluences(m);
  assert.equal(ch.length,name==='multi-confluence-cascade'?3:2);
  assert.deepEqual(F.structuralErrors(m).issues,[],name);
  assert.deepEqual(E.checkAll(m,routes),[],name);
  const solved=E.solve(m,{limit:80000,allowPlacement:false});
  assert.equal(solved.status,'solved',name+': '+solved.message);
  assert.deepEqual(E.checkAll(m,solved.routes,solved.placements),[]);
  const level=F.createLevel(m);
  assert.deepEqual(F.readLevel(copy(level)),m);
  const stored=JSON.parse(fs.readFileSync(path.join(__dirname,'../examples/'+name+'.level.json'),'utf8'));
  assert.deepEqual(F.readLevel(stored),m);
 }
});
test('In-game route drafting, independent repeated elements, completion, undo, and save restore',()=>{
 for(const name of names){
  const level=F.asLevel(map(name)),game=S.createSession(level);
  assert.equal(game.start().ok,true);
  for(const route of plans[name])for(const i of route.path){
   const result=game.route(i);
   assert.equal(result.ok,true,name+' '+route.element+' '+i+': '+result.message);
  }
  const sameElement=game.state.routes.filter(r=>r.element==='earth'||r.element==='fire');
  if(name!=='multi-confluence-cascade')assert.ok(sameElement.length>=2);
  assert.equal(game.evaluate().ok,true,name);
  const saved=game.snapshot(),loaded=S.createSession(level);
  assert.equal(loaded.restore(copy(saved)),true,name);
  assert.equal(loaded.evaluate().ok,true);
  assert.equal(game.undo(),true,name);
  assert.equal(game.evaluate().ok,false,name);
 }
});
test('Each route source is unique; shared elemental destinations are each used once',()=>{
 const m=map('multi-confluence-repeated-input'),rs=plans['multi-confluence-repeated-input'];
 assert.equal(E.pairs(m).filter(p=>p.element==='fire').length,2);
 const dup=copy(rs);dup[3]={element:'fire',path:[3,12,21]};
 assert.match(E.checkAll(m,dup).join(' '),/duplicate route|destination already supplied|missing route/);
 const missing=copy(m);delete missing.cells[45].node;
 assert.match(F.structuralErrors(missing).issues.join(' '),/Fire.*source route|Fire.*destination/);
});
test('Wrong chamber port and through-routing are rejected',()=>{
 const m=map('multi-confluence-repeated-input');
 assert.match(E.validatePath(m,'fire',[3,4,5,14,23,22,21],[],{}),/input port/);
 assert.match(E.validatePath(m,'metal',[21,22,23,24,25],[],{},true),/cannot be used as a through-route|Another endpoint|Confluence/);
});
test('Two mutually dependent chambers cannot be powered from each other alone',()=>{
 const m={...F.fresh(12,12),rulesVersion:4};
 for(const kind of Object.keys(m.inventory))m.inventory[kind]=0;
 const c=(i,inputs,output)=>m.cells[i]={terrain:'land',component:'confluence',props:{recipe:'custom',direction:'E',inputs,output}};
 const n=(i,element,role)=>m.cells[i]={terrain:'land',node:{element,role}};
 c(26,['wind','fire'],'nature');c(80,['nature','water'],'wind');
 n(50,'fire','source');n(104,'water','source');
 const routes=[
  {element:'fire',path:[50,38,26]},{element:'water',path:[104,92,80]},
  {element:'nature',path:[26,27,28,29,30,31,32,44,56,68,80]},
  {element:'wind',path:[80,81,69,57,45,33,21,9,8,7,6,5,4,3,2,14,26]}
 ];
 assert.deepEqual(F.structuralErrors(m).issues,[]);
 const errors=E.checkAll(m,routes);
 assert.match(errors.join(' '),/no powered path/);
});
test('Single chamber and ordinary maps preserve their original route keys',()=>{
 const existing=JSON.parse(fs.readFileSync(path.join(__dirname,'../examples/confluence-root-chamber.map.json'),'utf8'));
 const m=F.parseMap(existing);
 assert.equal(E.hasMultiConfluence(m),false);
 assert.equal(E.routeKey(m,'water',3),'water');
 assert.equal(E.confluences(m).length,1);
 assert.equal(E.solve(m,{allowPlacement:false}).status,'solved');
});
