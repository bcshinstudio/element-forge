'use strict';
const assert=require('node:assert/strict');const E=require('../engine.js'),G=require('../generator.js');
const blank=()=>({width:12,height:12,cells:Array.from({length:144},()=>({terrain:'land'})),inventory:{bridge:0,intersection:0}});
const node=(m,x,y,element,role)=>m.cells[y*12+x].node={element,role};
let m=blank();node(m,1,2,'fire','source');node(m,10,2,'fire','destination');node(m,1,8,'water','source');node(m,10,8,'water','destination');
let r=E.solve(m);assert.equal(r.status,'solved');assert.deepEqual(E.checkAll(m,r.routes,r.placements),[]);
m.cells[2*12+5].terrain='water';const direct=Array.from({length:10},(_,i)=>2*12+i+1);assert.ok(E.validatePath(m,'fire',direct));m.inventory.bridge=1;assert.equal(E.checkAll(m,[{element:'fire',path:direct},{element:'water',path:Array.from({length:10},(_,i)=>8*12+i+1)}],{[2*12+5]:'bridge'}).length,0);
assert.ok(E.checkAll(m,[{element:'fire',path:direct},{element:'water',path:Array.from({length:10},(_,i)=>8*12+i+1)}],{[2*12+5]:'bridge',[2*12+6]:'bridge'}).length);
let x=blank();node(x,1,5,'fire','source');node(x,10,5,'fire','destination');node(x,5,1,'water','source');node(x,5,10,'water','destination');
const horizontal=Array.from({length:10},(_,i)=>5*12+i+1),vertical=Array.from({length:10},(_,i)=>(i+1)*12+5);
assert.ok(E.checkAll(x,[{element:'fire',path:horizontal},{element:'water',path:vertical}]).length);
x.inventory.intersection=1;assert.deepEqual(E.checkAll(x,[{element:'fire',path:horizontal},{element:'water',path:vertical}],{[5*12+5]:'intersection'}),[]);
for(const difficulty of ['easy','moderate','hard'])for(let seed=0;seed<100;seed++){const a=G.generate(String(seed),difficulty),b=G.generate(String(seed),difficulty);assert.equal(a.status,'verified',`${difficulty}/${seed} ${a.message}`);assert.deepEqual(a.map,b.map);assert.deepEqual(E.checkAll(a.map,a.verification.routes,a.verification.placements),[]);}
// A player component is an overlay: removing it must never mutate terrain.
const originalTerrain=m.cells[2*12+5].terrain;
const placed={[2*12+5]:'bridge'};
assert.equal(E.effective(m,placed,2*12+5),'bridge');
assert.equal(m.cells[2*12+5].terrain,'water');
delete placed[2*12+5];
assert.equal(E.effective(m,placed,2*12+5),null);
assert.equal(m.cells[2*12+5].terrain,originalTerrain);
assert.ok(E.validatePath(m,'fire',direct,[],placed));
assert.equal(E.validatePath(m,'fire',direct,[],{[2*12+5]:'bridge'}),null);
console.log('PASS: overlay removal preserves terrain and invalidates unsupported water route');
console.log('PASS: engine paths, water/bridge, inventory limits, intersections, 300 seeded generated puzzles and deterministic regeneration');
