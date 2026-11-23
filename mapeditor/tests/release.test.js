'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const G=require('../generator.js');
const F=require('../map-format.js');

test('interior choices independently validate both sides and both bridge decisions across 250 seeds',()=>{
 const layouts=new Set();
 for(let seed=0;seed<250;seed++){
  const result=G.generateInteriorChoices(String(seed));
  assert.equal(result.status,'verified',`seed ${seed}: ${result.message}`);
  const {map,solutions,difficulty}=result;
  const mountain=map.cells.findIndex(c=>c.terrain==='mountain');
  layouts.add(mountain);
  const vertical=E.pairs(map).find(p=>p.source%map.width===p.destination%map.width);
  assert.equal(solutions.length,4);
  for(const solution of solutions){
   assert.deepEqual(E.checkAll(map,solution.routes,solution.placements),[]);
   const path=solution.routes.find(r=>r.element===vertical.element).path;
   assert.ok(path.includes(mountain+solution.side));
   assert.ok(!path.includes(mountain-solution.side));
   assert.deepEqual(solution.score,E.score(map,solution.routes,solution.placements));
  }
  assert.ok(solutions.some(s=>Object.values(s.placements).includes('bridge')));
  assert.ok(solutions.some(s=>!Object.values(s.placements).includes('bridge')));
  assert.equal(difficulty.verifiedChoices,4);
  assert.ok(difficulty.trackRange[1]>difficulty.trackRange[0]);
  assert.ok(difficulty.costRange[1]>=difficulty.costRange[0]);
 }
 assert.ok(layouts.size>3);
});

test('the same interior seed reproduces the map, witnesses and difficulty profile',()=>{
 assert.deepEqual(G.generateInteriorChoices('Forge-20'),G.generateInteriorChoices('Forge-20'));
 assert.notDeepEqual(G.generateInteriorChoices('Forge-20').map.cells,G.generateInteriorChoices('Forge-21').map.cells);
});

function board(){
 const map=F.fresh(4,4);
 map.cells[0].node={element:'fire',role:'source'};
 map.cells[3].node={element:'fire',role:'destination'};
 return map;
}

test('legacy v1 links migrate and canonical draft JSON round-trips',()=>{
 const source=board();
 source.schemaVersion=1;
 source.cells[5]={terrain:'land',component:'portal',props:{}};
 source.cells[6]={terrain:'land',component:'portal'};
 source.constraints={fire:{forbidTerrain:['lava','lava']}};
 const map=F.parseMap(source);
 assert.equal(map.schemaVersion,2);
 assert.equal(E.linkPartner(map,5),6);
 assert.deepEqual(map.constraints.fire.forbidTerrain,['lava']);
 assert.deepEqual(F.parseMap(JSON.parse(JSON.stringify(map))),map);
 assert.equal(source.schemaVersion,1);
});

test('draft validation locates malformed cells and rejects invalid rules, dimensions and inventory',()=>{
 const source=board();
 assert.throws(()=>F.parseMap({...source,width:'4'}),/dimensions/);
 assert.throws(()=>F.parseMap({...source,inventory:{bridge:-1}}),/bridge inventory/);
 assert.throws(()=>F.parseMap({...source,inventory:[]}),/inventory/);
 assert.throws(()=>F.parseMap({...source,constraints:{fire:{forbidComponent:['bridge']}}}),/Unknown constraint/);
 assert.throws(()=>F.parseMap({...source,constraints:JSON.parse('{"__proto__":{}}')}),/Invalid element/);
 source.cells[11].node={element:'constructor',role:'source'};
 assert.throws(()=>F.parseMap(source),/Cell 12: invalid node/);
});

test('structure reports duplicate nodes and invalid tunnel geometry without discarding draft data',()=>{
 const map=board();
 map.cells[4].node={element:'fire',role:'source'};
 map.cells[5]={terrain:'land',component:'tunnel',props:{pairId:'T'}};
 map.cells[10]={terrain:'land',component:'tunnel',props:{pairId:'T'}};
 const draft=F.parseMap(map);
 assert.equal(draft.cells[10].props.pairId,'T');
 const {issues}=F.structuralErrors(draft);
 assert.ok(issues.some(issue=>issue.includes('only one source')));
 assert.ok(issues.some(issue=>issue.includes('must align')));
});

test('game level round-trips without spoilers and rejects unsupported versions and rules',()=>{
 const map=G.generateInteriorChoices().map;
 const level=F.createLevel(map);
 assert.deepEqual(Object.keys(level),['format','schemaVersion','rulesVersion','map']);
 assert.deepEqual(F.readLevel(JSON.parse(JSON.stringify(level))),F.parseMap(map));
 assert.throws(()=>F.readLevel({...level,rulesVersion:2}),/Unsupported game level/);
 assert.throws(()=>F.readLevel({...level,map:{...level.map,schemaVersion:1}}),/Unsupported game level/);
});

test('unsupported drafts and boards without a verified network cannot become game levels',()=>{
 const map=board();
 map.cells[7].component='sorter';
 assert.throws(()=>F.createLevel(map),/unsupported game component sorter/);
 delete map.cells[7].component;
 map.inventory.booster=1;
 assert.throws(()=>F.createLevel(map),/Unsupported player inventory/);
 map.inventory.booster=0;
 for(const index of [1,4])map.cells[index]={terrain:'wall'};
 assert.throws(()=>F.createLevel(map),/Could not verify a solution \(unsolved\)/);
});

test('network completion rejects empty, duplicate and unexpected routes',()=>{
 assert.match(E.checkAll(F.fresh(),[]).join(' '),/Add at least one/);
 const route={element:'fire',path:[0,1,2,3]};
 assert.deepEqual(E.checkAll(board(),[route]),[]);
 assert.match(E.checkAll(board(),[route,route]).join(' '),/duplicate route/);
 assert.match(E.checkAll(board(),[route,{...route,element:'water'}]).join(' '),/unexpected route/);
});
