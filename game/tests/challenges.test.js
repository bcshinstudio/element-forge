'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {test}=require('node:test');
const G=require('../challenges');
const generateLegacy=options=>G.generate({...options,legacy:true});
const R=require('../routing-search');
const {release}=require('../challenge-release');
const F=require('../../map-editor/map-format');
const E=require('../../map-editor/engine');
const weak=require('./fixtures/corridor-stages.json');

function replayEvidence(level,result){
 assert.ok(G.replay(level,result.solution));
 for(const alternative of [...result.alternatives,...result.placementChoices]){
  if(alternative.status==='solved')assert.ok(G.replay(level,alternative.witness));
 }
}

test('Scarce Crossing offers two winning bridge plans and a locally useful bridge that strands no current individually',()=>{
 const level=G.reference('budget');
 const check=G.verify(level);
 assert.ok(check.accepted,check.reason);
 assert.ok(check.placementChoices.filter(choice=>choice.status==='solved').length>=2);
 const trap=check.placementChoices.find(choice=>choice.status==='unsolved'&&!choice.stranded.length);
 assert.ok(trap?.usableBy.includes('water'));
 assert.ok(check.linked);
 replayEvidence(level,check);
});

test('Contested Pass has independent winning prefixes that cannot coexist',()=>{
 const level=G.reference('passage');
 const check=G.verify(level);
 assert.ok(check.accepted,check.reason);
 assert.equal(check.linked?.status,'unsolved');
 assert.notEqual(check.linked.first.element,check.linked.second.element);
 assert.ok(check.solution.routes.some(route=>route.element==='fire'));
 assert.ok(check.alternatives.some(probe=>probe.element==='fire'&&probe.status==='unsolved'));
 replayEvidence(level,check);
});

test('Grove Crossing has competing checkpoint approaches and a late Plant conflict',()=>{
 const level=G.reference('checkpoint');
 const check=G.verify(level);
 assert.ok(check.accepted,check.reason);
 const waypoint=level.map.cells.findIndex(cell=>cell.component==='checkpoint');
 const plant=check.alternatives.filter(probe=>probe.element==='nature');
 const win=plant.find(probe=>probe.status==='solved');
 const loss=plant.find(probe=>probe.status==='unsolved');
 assert.ok(loss.firstBlockedAt>=3);
 assert.ok(loss.blocks.includes('water'));
 assert.notEqual(win.soloPath[win.soloPath.indexOf(waypoint)-1],loss.soloPath[loss.soloPath.indexOf(waypoint)-1]);
 replayEvidence(level,check);
});

test('curated release reproduces 12 × 12 verified stages with no solution in the export',()=>{
 const {pack,report}=release();
 assert.deepEqual(release(),{pack,report});
 assert.ok(pack.stages.every(stage=>stage.map.width===12&&stage.map.height===12&&stage.rulesVersion===4));
 assert.ok(!JSON.stringify(pack).includes('"solution"'));
 assert.equal(G.readPack(JSON.parse(JSON.stringify(pack))).length,pack.stages.length);
 for(const [index,stage] of pack.stages.entries())assert.ok(G.replay(stage,report.evidence[index].solution));
});

test('normalizes rotations and reflections and filters repeated decisions inside packs',()=>{
 const map=F.readLevel(G.reference('passage'));
 const reflected={...map,cells:map.cells.map((_,i)=>map.cells[Math.floor(i/map.width)*map.width+map.width-1-(i%map.width)])};
 const rotated={...map,width:map.height,height:map.width,cells:map.cells.map((_,i)=>
  map.cells[(map.height-1-i%map.height)*map.width+Math.floor(i/map.height)])};
 assert.equal(G.layoutKey(map),G.layoutKey(reflected));
 assert.equal(G.layoutKey(map),G.layoutKey(rotated));
 const {report}=generateLegacy({family:'budget',difficulty:'Expert',seed:'river-valley-28',count:8});
 assert.equal(new Set(report.evidence.map(e=>e.decision)).size,report.accepted);
 assert.ok(report.rejections.some(r=>r.reason==='Repeated layout or decision'));
});

test('fresh seeds change verified bridge plans',()=>{
 const pack=seed=>generateLegacy({family:'budget',difficulty:'Expert',seed,count:2});
 const a=pack('river-valley-26'),b=pack('river-valley-27');
 const bridgeUsers=batch=>batch.report.evidence.map(item=>item.placementChoices.filter(probe=>probe.status==='solved')
  .map(probe=>probe.usableBy.join('+')).sort().join('/'));
 assert.equal(a.report.accepted,2);
 assert.equal(b.report.accepted,2);
 assert.notDeepEqual(bridgeUsers(a),bridgeUsers(b));
});

test('rejects the three reported corridor puzzles and an optional bridge with a tool-free bypass',()=>{
 for(const level of weak){
  const check=G.verify(level);
  assert.equal(check.accepted,false,level.map.name);
  assert.equal(check.reason,'Visible corridors or independent lanes');
 }
 const level=G.reference('budget');
 level.map.cells=level.map.cells.map(cell=>cell.terrain==='water'?{terrain:'land'}:cell);
 assert.equal(G.verify(level).reason,'Tool-free bypass');
});

test('search exhaustion is unknown, and fallback cannot promote a stage into the requested tier',()=>{
 const check=G.verify(G.reference('budget'),{limit:1});
 assert.equal(check.clean,'inconclusive');
 assert.equal(check.accepted,false);
 const expert=generateLegacy({attempts:0,count:2,family:'budget',difficulty:'Expert'});
 assert.equal(expert.report.fallback,1);
 assert.equal(expert.report.shortfall,1);
 const easy=generateLegacy({attempts:0,count:2,family:'budget',difficulty:'Easy'});
 assert.equal(easy.report.accepted,0);
 assert.equal(easy.report.shortfall,2);
});

test('routing search matches independent simple-path enumeration on tiny boards',()=>{
 const cases=[
  ['passage',['.w..','p..P','....','..W.']],
  ['passage',['.w..','p.#P','....','..W.']],
  ['budget',['w~.W','.#..','p.~P','....']],
  ['checkpoint',['p.P.','##.#','##@#','####']],
  ['checkpoint',['p..P','..@.','#.#.','....']]
 ];
 for(const [family,rows] of cases){
  const level=G.fromRows(rows,family);
  const map=F.readLevel(level),model=R.prepare(map);
  const plans=[{}];
  for(const kind of ['bridge','intersection'])if(map.inventory[kind]){
   map.cells.forEach((_,i)=>{if(E.canPlace(map,{},i,kind))plans.push({[i]:kind});});
  }
  function* enumerate(pair,path){
   const cell=path.at(-1);
   if(cell===pair.destination){yield path;return;}
   for(const [next] of E.neighbors(cell,map.width,map.height)){
    if(!path.includes(next))yield* enumerate(pair,[...path,next]);
   }
  }
  function oracle(plan,index,routes){
   if(index===model.pairs.length)return !E.checkAll(map,routes,plan).length;
   const pair=model.pairs[index];
   for(const path of enumerate(pair,[pair.source])){
    if(!E.validatePath(map,pair.element,path,routes,plan)&&oracle(plan,index+1,[...routes,{element:pair.element,path}]))return true;
   }
   return false;
  }
  for(const placements of plans){
   const result=R.solve(model,{placements,limit:32000});
   assert.equal(result.status,oracle(placements,0,[])?'solved':'unsolved',rows.join('/'));
  }
  const result=R.solve(model,{limit:32000});
  assert.equal(result.status,plans.some(plan=>oracle(plan,0,[]))?'solved':'unsolved',rows.join('/'));
 }
});
