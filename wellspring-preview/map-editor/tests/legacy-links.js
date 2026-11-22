'use strict';
const assert=require('node:assert/strict');
const E=require('../engine.js');
function map(){return {width:6,height:6,cells:Array.from({length:36},()=>({terrain:'land'})),inventory:{bridge:0,intersection:0}};}
function endpoints(m,s,d){m.cells[s].node={element:'fire',role:'source'};m.cells[d].node={element:'fire',role:'destination'};}
{
 const m=map();endpoints(m,6,11);m.cells[7]={terrain:'land',component:'portal',props:{pairId:'A'}};m.cells[10]={terrain:'land',component:'portal',props:{pairId:'A'}};
 assert.equal(E.linkPartner(m,7),10);assert.equal(E.linkPartner(m,10),7);
 assert.equal(E.validatePath(m,'fire',[6,7,10,11]),null);
 assert.equal(E.solve(m,{limit:10000}).status,'solved');
 m.cells[10].props.pairId='B';assert.match(E.validatePath(m,'fire',[6,7,10,11]),/adjacent/);
 assert.equal(E.solve(m).status,'invalid');
}
{
 const m=map();endpoints(m,6,11);m.cells[7]={terrain:'land',component:'tunnel',props:{pairId:'T'}};m.cells[10]={terrain:'land',component:'tunnel',props:{pairId:'T'}};m.cells[8]={terrain:'mountain'};
 assert.equal(E.linkPartner(m,7),10);assert.equal(E.validatePath(m,'fire',[6,7,10,11]),null);
 m.cells[8]={terrain:'land'};assert.equal(E.linkPartner(m,7),-1);
 m.cells[8]={terrain:'mountain'};m.cells[10]={terrain:'land'};m.cells[16]={terrain:'land',component:'tunnel',props:{pairId:'T'}};assert.equal(E.linkPartner(m,7),-1);
}
console.log('PASS: portal links, bidirectionality, invalid pairs, tunnel alignment and obstacle requirement');
