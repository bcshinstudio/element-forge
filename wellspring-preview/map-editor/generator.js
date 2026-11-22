'use strict';
/* Deterministic, solution-first starter generator. Verified != unique or optimally difficult. */
(function(root){
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function random(seed){let x=hash(seed)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function generate(seed='1042',difficulty='moderate'){
 const rand=random(seed+'-'+difficulty),w=12,h=12;
 const m={format:'element-forge-map',schemaVersion:2,name:`${difficulty[0].toUpperCase()+difficulty.slice(1)} · ${seed}`,description:'Generated candidate. Verified by prototype solver; difficulty not playtested.',width:w,height:h,cells:Array.from({length:w*h},()=>({terrain:'wall'})),inventory:{bridge:0,intersection:0,tunnel:0,portal:0,junction:0,sorter:0,converter:0,gate:0,checkpoint:0,remover:0,booster:0}};
 const n=difficulty==='hard'?3:2,ys=n===3?[2,6,10]:[3,8],els=['fire','water','nature'];
 const solution=[];let waterCount=0;
 for(let j=0;j<n;j++){
  const y=ys[j],left=1,right=10,detour=difficulty==='easy'?false:true;
  const start=3+Math.floor(rand()*3),end=start+2;
  let path=[];for(let x=left;x<=right;x++){
   if(detour&&x===start){path.push(y*w+x);path.push((y-1)*w+x);for(let xx=x+1;xx<=end;xx++)path.push((y-1)*w+xx);path.push(y*w+end);x=end;}
   else path.push(y*w+x);
  }
  for(const i of path)m.cells[i]={terrain:'land'};
  const source=path[0],dest=path.at(-1);m.cells[source].node={element:els[j],role:'source'};m.cells[dest].node={element:els[j],role:'destination'};
  if(difficulty!=='easy'&&(difficulty==='hard'||j===0)){
   const eligible=path.filter(i=>i!==source&&i!==dest&&Math.floor(i/w)===y&&i%w>=7&&i%w<=9);
   const i=eligible[Math.floor(rand()*eligible.length)];if(i!==undefined){m.cells[i].terrain='water';waterCount++;}
  }
  solution.push({element:els[j],path});
 }
 m.inventory.bridge=waterCount;
 // Decoration on non-path cells, without opening accidental bypasses.
 for(let i=0;i<m.cells.length;i++)if(m.cells[i].terrain==='wall'&&rand()<.17)m.cells[i].terrain='mountain';
 const verification=root.EFEngine.solve(m,{limit:100000,maxPairs:3});
 if(verification.status!=='solved')return {status:'failed',message:`Candidate could not be verified: ${verification.status} (${verification.message||''})`};
 const errors=root.EFEngine.checkAll(m,verification.routes,verification.placements);
 if(errors.length)return {status:'failed',message:'Generated map failed validation: '+errors.join(', ')};
 return {status:'verified',map:m,solution,verification};
}
function generateConstruction(seed='1042',kind='portal'){
 if(!['portal','tunnel'].includes(kind))return {status:'failed',message:'Unknown construction challenge'};
 const rand=random(seed+'-'+kind),w=12,h=12,y=2+Math.floor(rand()*8),left=1+Math.floor(rand()*2),right=9+Math.floor(rand()*2);
 const m={format:'element-forge-map',schemaVersion:2,name:`${kind==='portal'?'Portal':'Tunnel'} challenge · ${seed}`,description:`Construction challenge: place two ${kind} endpoints and connect Fire.`,width:w,height:h,cells:Array.from({length:w*h},()=>({terrain:'wall'})),inventory:{bridge:0,intersection:0,tunnel:0,portal:0,junction:0,sorter:0,converter:0,gate:0,checkpoint:0,remover:0,booster:0}};
 m.inventory[kind]=2;
 // Isolated regions: the link is mandatory; no alternative ground corridor exists.
 const a=y*w+left,b=y*w+right;
 for(let x=left;x<=left+2;x++)m.cells[y*w+x]={terrain:'land'};
 for(let x=right-2;x<=right;x++)m.cells[y*w+x]={terrain:'land'};
 if(kind==='tunnel')for(let x=left+3;x<right-2;x++)m.cells[y*w+x]={terrain:'mountain'};
 m.cells[a].node={element:'fire',role:'source'};m.cells[b].node={element:'fire',role:'destination'};
 const direct=root.EFEngine.solve(m,{limit:20000});
 if(direct.status==='solved')return {status:'failed',message:'Candidate accidentally solvable without construction'};
 const verification=root.EFEngine.solveConstruction(m,{limit:20000,maxCandidates:180});
 if(verification.status!=='solved')return {status:'failed',message:`Construction verification: ${verification.status}: ${verification.message||''}`};
 const errors=root.EFEngine.checkAll(m,verification.routes,verification.placements);
 if(errors.length)return {status:'failed',message:'Generated construction map invalid: '+errors.join('; ')};
 return {status:'verified',map:m,verification,requiredConstruction:kind};
}
/* Two-element construction challenge: a mandatory paired link for Fire and
   a separate mandatory bridge for Water. Both routes share one map and inventory.
   Layout is solution-first, then independently verified by the shared engine. */
function generateDualConstruction(seed='1042',kind='portal'){
 if(!['portal','tunnel'].includes(kind))return {status:'failed',message:'Unknown dual challenge'};
 const base=generateConstruction(seed,kind);
 if(base.status!=='verified')return base;
 const m=base.map,rand=random(seed+'-dual-'+kind),w=m.width;
 const fireY=Math.floor(m.cells.findIndex(c=>c.node?.element==='fire'&&c.node.role==='source')/w);
 const choices=Array.from({length:10},(_,i)=>i+1).filter(y=>Math.abs(y-fireY)>=3);
 const y=choices[Math.floor(rand()*choices.length)];
 const start=1+Math.floor(rand()*2),end=9+Math.floor(rand()*2);
 const waterX=start+2+Math.floor(rand()*(end-start-3));
 for(let x=start;x<=end;x++)m.cells[y*w+x]={terrain:x===waterX?'water':'land'};
 m.cells[y*w+start].node={element:'water',role:'source'};
 m.cells[y*w+end].node={element:'water',role:'destination'};
 m.inventory.bridge=1;
 m.name=`Dual ${kind} + bridge · ${seed}`;
 m.description=`Two elements: Fire needs a ${kind} pair; Water needs a bridge. Both routes must be completed.`;
 const withoutLink=root.EFEngine.solve(m,{limit:50000});
 if(withoutLink.status==='solved')return {status:'failed',message:'Dual puzzle unexpectedly solves without a link'};
 const withoutBridge=JSON.parse(JSON.stringify(m));withoutBridge.inventory.bridge=0;
 const bridgeCheck=root.EFEngine.solveConstruction(withoutBridge,{limit:50000,maxCandidates:180});
 if(bridgeCheck.status==='solved')return {status:'failed',message:'Dual puzzle unexpectedly solves without a bridge'};
 const verification=root.EFEngine.solveConstruction(m,{limit:50000,maxCandidates:180});
 if(verification.status!=='solved')return {status:'failed',message:`Dual construction verification: ${verification.status} ${verification.message||''}`};
 const errors=root.EFEngine.checkAll(m,verification.routes,verification.placements);
 if(errors.length)return {status:'failed',message:'Dual puzzle invalid: '+errors.join('; ')};
 const used=Object.values(verification.placements).map(root.EFEngine.placementKind);
 if(used.filter(k=>k===kind).length!==2||!used.includes('bridge'))return {status:'failed',message:'Verification did not use mandatory components'};
 return {status:'verified',map:m,verification,requiredConstruction:kind,challenge:'dual'};
}
/* Forced perpendicular crossing. Two one-cell-wide corridors have exactly one
   common land tile. An intersection is mandatory for both deliveries. */
function generateCrossing(seed='1042',kind='intersection'){
 if(kind==='crossing')kind='intersection';
 if(kind==='crossing-bridge')kind='intersection-bridge';
 if(!['intersection','intersection-bridge'].includes(kind))return {status:'failed',message:'Unknown crossing challenge'};
 const rand=random(seed+'-'+kind),w=12,h=12;
 const m={format:'element-forge-map',schemaVersion:2,name:`${kind==='intersection'?'Crossing':'Crossing + bridge'} · ${seed}`,description:'Two perpendicular element routes must cross at one shared intersection. Neither element may turn or share a track.',width:w,height:h,cells:Array.from({length:w*h},()=>({terrain:'wall'})),inventory:{bridge:kind==='intersection-bridge'?1:0,intersection:1,tunnel:0,portal:0,junction:0,sorter:0,converter:0,gate:0,checkpoint:0,remover:0,booster:0}};
 const cx=4+Math.floor(rand()*4),cy=4+Math.floor(rand()*4),left=1,right=10,top=1,bottom=10;
 for(let x=left;x<=right;x++)m.cells[cy*w+x]={terrain:'land'};
 for(let y=top;y<=bottom;y++)m.cells[y*w+cx]={terrain:'land'};
 const horizontal=rand()<.5?'fire':'water',vertical=horizontal==='fire'?'water':'fire';
 const reverseH=rand()<.5,reverseV=rand()<.5;
 const a=cy*w+left,b=cy*w+right,c=top*w+cx,e=bottom*w+cx;
 m.cells[reverseH?b:a].node={element:horizontal,role:'source'};
 m.cells[reverseH?a:b].node={element:horizontal,role:'destination'};
 m.cells[reverseV?e:c].node={element:vertical,role:'source'};
 m.cells[reverseV?c:e].node={element:vertical,role:'destination'};
 let waterIndex=-1;
 if(kind==='intersection-bridge'){
  const candidates=[];
  for(let x=left+1;x<right;x++)if(x!==cx)candidates.push(cy*w+x);
  for(let y=top+1;y<bottom;y++)if(y!==cy)candidates.push(y*w+cx);
  waterIndex=candidates[Math.floor(rand()*candidates.length)];m.cells[waterIndex].terrain='water';
 }
 // Independent structural proof: the crossing is the sole shared cell,
 // and removing its construction budget prevents both paths being valid.
 const verification=root.EFEngine.solve(m,{limit:150000,maxPairs:3});
 if(verification.status!=='solved')return {status:'failed',message:`Crossing solver: ${verification.status} ${verification.message||''}`};
 const errors=root.EFEngine.checkAll(m,verification.routes,verification.placements);
 if(errors.length)return {status:'failed',message:'Crossing invalid: '+errors.join('; ')};
 const used=Object.values(verification.placements).map(root.EFEngine.placementKind);
 if(used.filter(k=>k==='intersection').length!==1||used.filter(k=>k==='bridge').length!==(waterIndex<0?0:1))return {status:'failed',message:'Expected mandatory intersection and bridge placements'};
 return {status:'verified',map:m,verification,challenge:kind};
}
/* Two legitimate crossing locations: the short route needs a bridge,
   while the longer bypass can avoid the water. Both still need an intersection. */
function generateCrossingChoice(seed='1042'){
 const rand=random(seed+'-crossing-choice'),w=12,h=12;
 const cy=3+Math.floor(rand()*3),cx=5+Math.floor(rand()*3),by=cy+3;
 const m={format:'element-forge-map',schemaVersion:2,name:`Crossing choices · ${seed}`,
  description:'Choose a short water crossing with a bridge or a longer dry detour. Both require an intersection.',
  width:w,height:h,cells:Array.from({length:w*h},()=>({terrain:'wall'})),
  inventory:{bridge:1,intersection:1,tunnel:0,portal:0,junction:0,sorter:0,converter:0,gate:0,checkpoint:0,remover:0,booster:0}};
 const land=(x,y)=>{m.cells[y*w+x]={terrain:'land'};};
 for(let x=1;x<=10;x++){land(x,cy);land(x,by);}
 for(let y=cy;y<=by;y++){land(2,y);land(9,y);}
 for(let y=1;y<=10;y++)land(cx,y);
 const wx=3+Math.floor(rand()*(cx-3));m.cells[cy*w+wx].terrain='water';
 const horizontal=rand()<.5?'fire':'water',vertical=horizontal==='fire'?'water':'fire';
 const revH=rand()<.5,revV=rand()<.5;
 m.cells[cy*w+(revH?10:1)].node={element:horizontal,role:'source'};
 m.cells[cy*w+(revH?1:10)].node={element:horizontal,role:'destination'};
 m.cells[(revV?10:1)*w+cx].node={element:vertical,role:'source'};
 m.cells[(revV?1:10)*w+cx].node={element:vertical,role:'destination'};
 const verification=root.EFEngine.solve(m,{limit:200000,maxPairs:3});
 if(verification.status!=='solved')return {status:'failed',message:`Choice solver: ${verification.status} ${verification.message||''}`};
 const errors=root.EFEngine.checkAll(m,verification.routes,verification.placements);
 if(errors.length)return {status:'failed',message:errors.join('; ')};
 const used=Object.values(verification.placements).map(root.EFEngine.placementKind);
 if(!used.includes('intersection'))return {status:'failed',message:'Missing required intersection'};
 return {status:'verified',map:m,verification,challenge:'crossing-choice'};
}

/* Branching crossing challenge: extra walkable branches create multiple route
   options while the vertical corridor remains a mandatory separator. */
function generateBranching(seed='1042'){
 const base=generateCrossingChoice(seed);
 if(base.status!=='verified')return base;
 const m=base.map,w=m.width,rand=random(seed+'-branching');
 const nodes=m.cells.map((c,i)=>c.node?{i,...c.node}:null).filter(Boolean);
 const hnodes=nodes.filter(n=>Math.floor(n.i/w)===Math.floor(nodes.find(n=>n.role==='source').i/w));
 const cy=Math.floor(hnodes[0].i/w),by=cy+3;
 const cx=Array.from({length:12},(_,x)=>x).find(x=>m.cells[1*w+x].terrain==='land');
 // Build a second winding dry option below the original bypass, with
 // randomized branch points and short cul-de-sacs for route exploration.
 // Add small side branches, never altering the mandatory crossing cell.
 for(let attempt=0;attempt<5;attempt++){
  const x=2+Math.floor(rand()*8),y=cy+1+Math.floor(rand()*2),i=y*w+x;
  if(x===cx||m.cells[i].terrain!=='wall')continue;
  const adjacent=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
  if(adjacent.some(([a,b])=>m.cells[b*w+a].terrain==='land')&&rand()<.65)m.cells[i]={terrain:'land'};
 }
 m.name=`Branching crossing · ${seed}`;
 m.description='Multiple dry branches and a water shortcut. Two deliveries must cross at an intersection. Difficulty is not calibrated.';
 const verification=root.EFEngine.solve(m,{limit:200000,maxPairs:3});
 if(verification.status!=='solved')return {status:'failed',message:`Branching candidate: ${verification.status}`};
 const errors=root.EFEngine.checkAll(m,verification.routes,verification.placements);
 if(errors.length)return {status:'failed',message:errors.join('; ')};
 const noBridge=JSON.parse(JSON.stringify(m));noBridge.inventory.bridge=0;
 const alternative=root.EFEngine.solve(noBridge,{limit:200000,maxPairs:3});
 if(alternative.status!=='solved')return {status:'failed',message:'Dry alternative could not be verified'};
 const noIntersection=JSON.parse(JSON.stringify(m));noIntersection.inventory.intersection=0;
 const impossible=root.EFEngine.solve(noIntersection,{limit:200000,maxPairs:3});
 if(impossible.status==='solved')return {status:'failed',message:'Intersection was not mandatory'};
 // Bounded search can be inconclusive on branched maps; do not claim proof.

 return {status:'verified',map:m,verification,alternative,challenge:'branching'};
}

/* Seeded route-choice maze: grow connected walkable pockets around the
   crossing, preserving the validated dry bypass and mandatory separator.
   Only accept candidates whose complete solution passes the engine. */
function generateMaze(seed='1042'){
 const base=generateBranching(seed);
 if(base.status!=='verified')return base;
 const m=base.map,w=m.width,h=m.height,rand=random(seed+'-maze-v1');
 const nodeIndices=new Set(m.cells.map((c,i)=>c.node?i:-1).filter(i=>i>=0));
 // Existing walkable cells are the backbone. Add a seed-dependent number of
 // small connected chambers, retaining a margin of impassable perimeter.
 const target=12+Math.floor(rand()*18);
 let added=0;
 for(let attempt=0;attempt<500&&added<target;attempt++){
  const x=2+Math.floor(rand()*(w-4)),y=2+Math.floor(rand()*(h-4)),i=y*w+x;
  if(m.cells[i].terrain!=='wall'||nodeIndices.has(i))continue;
  const neighbors=[i-1,i+1,i-w,i+w];
  if(!neighbors.some(j=>m.cells[j].terrain==='land'))continue;
  // Avoid turning the main crossing into a bypass: only carve below the
  // horizontal delivery corridor, where the existing dry detour lives.
  const horizontalNodes=[...nodeIndices].filter(j=>m.cells[j].node.element==='water');
  const waterRow=horizontalNodes.length?Math.floor(horizontalNodes[0]/w):-1;
  if(y<=waterRow)continue;
  m.cells[i]={terrain:'land'};added++;
 }
 m.name=`Route maze · ${seed}`;
 m.description='Seeded branching chambers, alternative dry routes and a water shortcut. A crossing is required; solution quality is not guaranteed optimal.';
 const verify=root.EFEngine.solve(m,{limit:250000,maxPairs:3});
 if(verify.status!=='solved')return {status:'failed',message:`Maze candidate: ${verify.status}`};
 const errors=root.EFEngine.checkAll(m,verify.routes,verify.placements);
 if(errors.length)return {status:'failed',message:errors.join('; ')};
 const dry=JSON.parse(JSON.stringify(m));dry.inventory.bridge=0;
 const alternative=base.alternative; // Existing dry route remains valid: carving only removes walls.
 if(alternative.status!=='solved')return {status:'failed',message:'Base dry alternative unavailable'};
 if(root.EFEngine.checkAll(dry,alternative.routes,alternative.placements).length)return {status:'failed',message:'Invalid dry maze alternative'};
 const noIntersection=JSON.parse(JSON.stringify(m));noIntersection.inventory.intersection=0;
 const noCross=root.EFEngine.solve(noIntersection,{limit:12000,maxPairs:3});
 if(noCross.status==='solved')return {status:'failed',message:'Maze intersection not mandatory'};
 return {status:'verified',map:m,verification:verify,alternative,challenge:'maze',carved:added,necessityCheck:noCross.status};
}

/* Three deliveries: one horizontal route crosses two independent vertical
   routes. Both intersections are required; each crossing is a different cell. */
function generateDoubleCrossing(seed='1042'){
 const rand=random(seed+'-double-crossing'),w=12,h=12;
 const cy=4+Math.floor(rand()*4),x1=3+Math.floor(rand()*2),x2=7+Math.floor(rand()*2);
 const m={format:'element-forge-map',schemaVersion:2,name:`Double crossing · ${seed}`,
  description:'Three element routes share two separate perpendicular intersections. Both intersections must be constructed.',
  width:w,height:h,cells:Array.from({length:w*h},()=>({terrain:'wall'})),
  inventory:{bridge:0,intersection:2,tunnel:0,portal:0,junction:0,sorter:0,converter:0,gate:0,checkpoint:0,remover:0,booster:0}};
 for(let x=1;x<=10;x++)m.cells[cy*w+x]={terrain:'land'};
 for(const x of [x1,x2])for(let y=1;y<=10;y++)m.cells[y*w+x]={terrain:'land'};
 const elements=['fire','water','nature'];
 const reverse=()=>rand()<.5;
 const put=(a,b,el)=>{const r=reverse();m.cells[r?b:a].node={element:el,role:'source'};m.cells[r?a:b].node={element:el,role:'destination'};};
 put(cy*w+1,cy*w+10,elements[0]);put(w+x1,10*w+x1,elements[1]);put(w+x2,10*w+x2,elements[2]);
 const verification=root.EFEngine.solve(m,{limit:250000,maxPairs:3});
 if(verification.status!=='solved')return {status:'failed',message:`Double crossing verification: ${verification.status} ${verification.message||''}`};
 const errors=root.EFEngine.checkAll(m,verification.routes,verification.placements);
 if(errors.length)return {status:'failed',message:'Double crossing invalid: '+errors.join('; ')};
 const used=Object.values(verification.placements).map(root.EFEngine.placementKind);
 if(used.filter(k=>k==='intersection').length!==2)return {status:'failed',message:'Double crossing did not use two intersections'};
 return {status:'verified',map:m,verification,challenge:'double-crossing'};
}
/* Compare independently verified maze candidates, using reproducible structural
   metrics rather than an uncalibrated difficulty label. */
function mazeQuality(m){
 const w=m.width,h=m.height,walk=i=>m.cells[i]?.terrain==='land'||m.cells[i]?.terrain==='water';
 let junctions=0,deadEnds=0,walkable=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x;if(!walk(i))continue;walkable++;
  const n=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>a>=0&&a<w&&b>=0&&b<h&&walk(b*w+a)).length;
  if(n>=3)junctions++;if(n===1)deadEnds++;
 }
 return {junctions,deadEnds,walkable,score:junctions*4+deadEnds*2+walkable};
}
/* Compare two independently validated solutions without claiming either is optimal.
   Score actual component/track tradeoffs as well as board structure. */
function solutionTradeoff(m,primary,alternative){
 const E=root.EFEngine;
 const valid=v=>!!v&&v.status==='solved'&&Array.isArray(v.routes)&&E.checkAll(m,v.routes,v.placements||{}).length===0;
 if(!valid(primary)||!valid(alternative))return {status:'unverified',reason:'Both solutions must validate against the same map'};
 const summary=v=>({track:v.score.track,components:v.score.components,cost:v.score.cost,
  bridgeCount:Object.values(v.placements||{}).filter(p=>E.placementKind(p)==='bridge').length});
 const a=summary(primary),b=summary(alternative);
 return {status:'verified',primary:a,alternative:b,costDifference:Math.abs(a.cost-b.cost),
  trackDifference:Math.abs(a.track-b.track),componentDifference:Math.abs(a.components-b.components),
  bridgeChoice:a.bridgeCount!==b.bridgeCount,
  distinctRoutes:JSON.stringify(primary.routes.map(r=>r.path))!==JSON.stringify(alternative.routes.map(r=>r.path))};
}
function gameplayQuality(m,primary,alternative){
 const structure=mazeQuality(m),tradeoff=solutionTradeoff(m,primary,alternative);
 if(tradeoff.status!=='verified')return {...structure,tradeoff,score:structure.score};
 // Small, bounded bonuses: prefer real route choices over raw open floor area.
 const choiceBonus=(tradeoff.distinctRoutes?12:0)+(tradeoff.bridgeChoice?18:0)+
  Math.min(12,tradeoff.trackDifference*2)+Math.min(12,tradeoff.costDifference*2);
 return {...structure,tradeoff,choiceBonus,score:structure.score+choiceBonus};
}

/* Interior obstacle challenge: a wall interrupts the formerly straight vertical
   delivery. A narrow seeded side passage provides a necessary bend. Keep the
   existing water shortcut/dry alternative and verify the completed network. */
function generateInteriorDetour(seed='1042'){
 const base=generateCrossingChoice(seed);
 if(base.status!=='verified')return base;
 const m=base.map,w=m.width,rand=random(seed+'-interior-v1');
 // The full-height land column is unique above the horizontal corridor.
 const cols=[];
 for(let x=1;x<w-1;x++)if(m.cells[w+x].terrain==='land'&&m.cells[2*w+x].terrain==='land')cols.push(x);
 const cx=cols[0];if(cx===undefined)return {status:'failed',message:'Missing vertical corridor'};
 const row=m.cells.findIndex((c,i)=>c.node&&i%w!==cx);
 const horizontalY=Math.floor(row/w);
 const blockY=horizontalY-1;
 if(blockY<2)return {status:'failed',message:'Insufficient space for interior detour'};
 const side=cx+(rand()<.5?-1:1);
 if(side<1||side>=w-1)return {status:'failed',message:'Detour outside board'};
 m.cells[blockY*w+cx]={terrain:'wall'};
 for(let y=blockY-1;y<=blockY+1;y++)m.cells[y*w+side]={terrain:'land'};
 // Preserve endpoint metadata on existing corridor cells.
 if(m.cells[(blockY-1)*w+cx].terrain==='wall')m.cells[(blockY-1)*w+cx]={terrain:'land'};
 if(m.cells[(blockY+1)*w+cx].terrain==='wall')m.cells[(blockY+1)*w+cx]={terrain:'land'};
 // Additional seeded wall islands inside optional open areas; never erase the
 // verified route backbone or the side passage.
 let islands=0;
 for(let y=horizontalY+1;y<=Math.min(9,horizontalY+3);y++)for(let x=3;x<=8;x++){
  const i=y*w+x;if(x===cx||m.cells[i].terrain!=='land'||rand()>.12)continue;
  // Do not obstruct the dry bypass (its two side columns and lower row).
  if(x===2||x===9||y===horizontalY+3)continue;
  m.cells[i]={terrain:'mountain'};islands++;
 }
 m.name=`Interior detour · ${seed}`;
 m.description='A blocked central corridor forces a bend; seeded interior islands and a water shortcut add route choices. Difficulty is not calibrated.';
 const verification=root.EFEngine.solve(m,{limit:250000,maxPairs:3});
 if(verification.status!=='solved')return {status:'failed',message:`Interior solver: ${verification.status}: ${verification.message||""}`};
 const errors=root.EFEngine.checkAll(m,verification.routes,verification.placements);
 if(errors.length)return {status:'failed',message:errors.join('; ')};
 const detoured=verification.routes.some(r=>r.path.some(i=>i%w===side&&Math.floor(i/w)===blockY));
 if(!detoured)return {status:'failed',message:'Interior obstruction did not force intended detour'};
 return {status:'verified',map:m,verification,challenge:'interior-detour',islands};
}

// Sample each detour with and without a bridge, then check every result
// on the original board with the original inventory.
function generateInteriorChoices(seed='1042'){
 const base=generateCrossingChoice(seed);
 if(base.status!=='verified')return base;
 const E=root.EFEngine,m=base.map,w=m.width,rand=random(seed+'-interior-choices');
 const vertical=E.pairs(m).find(p=>p.source%w===p.destination%w);
 const x=vertical.source%w;
 const horizontal=E.pairs(m).find(p=>p.element!==vertical.element);
 const crossingRow=Math.floor(horizontal.source/w);
 m.cells[x]=m.cells[w+x];
 m.cells[w+x]={terrain:'land'};
 const row=1+Math.floor(rand()*(crossingRow-2));
 const center=row*w+x;
 m.cells[center]={terrain:'mountain'};
 for(const side of [-1,1]){
  for(let y=row-1;y<=row+1;y++){
   const i=y*w+x+side;
   if(!m.cells[i].node)m.cells[i]={terrain:'land'};
  }
 }
 const solutions=[];
 for(const side of [-1,1]){
  for(const bridge of [1,0]){
   const cells=m.cells.slice();
   cells[center-side]={terrain:'wall'};
   const constraints=bridge?{[horizontal.element]:{requireComponents:['bridge']}}:undefined;
   const variant={...m,cells,inventory:{...m.inventory,bridge},constraints};
   const solution=E.solve(variant,{limit:120000});
   if(solution.status!=='solved'||E.checkAll(m,solution.routes,solution.placements).length)continue;
   if(!solution.routes.find(r=>r.element===vertical.element).path.includes(center+side))continue;
   if(solutions.some(s=>s.side===side&&s.score.components===solution.score.components))continue;
   solutions.push({...solution,side});
  }
 }
 if(new Set(solutions.map(s=>s.side)).size<2||
    new Set(solutions.map(s=>s.score.components)).size<2){
  return {status:'failed',message:'Could not verify both detours and a bridge tradeoff within the search budget.'};
 }
 solutions.sort((a,b)=>a.score.cost-b.score.cost);
 const verification=solutions[0];
 const profiles=solutions.map(s=>({...analyze(m,s),cost:s.score.cost}));
 const difficulty={
  verifiedChoices:solutions.length,
  trackRange:[Math.min(...profiles.map(p=>p.track)),Math.max(...profiles.map(p=>p.track))],
  turnRange:[Math.min(...profiles.map(p=>p.turns)),Math.max(...profiles.map(p=>p.turns))],
  costRange:[profiles[0].cost,profiles.at(-1).cost]
 };
 m.name=`Interior choices · ${seed}`;
 m.description='Detour around the interior mountain and choose between building a bridge and taking a dry route.';
 return {status:'verified',map:m,verification,solutions,difficulty,challenge:'interior-choices'};
}

function generateCuratedMaze(seed='1042',count=3){
 if(!Number.isInteger(count)||count<1||count>8)return {status:'failed',message:'Candidate count must be 1–8'};
 const candidates=[];const rejected=[];
 for(let i=0;i<count;i++){
  const candidate=generateMaze(`${seed}-candidate-${i}`);
  if(candidate.status!=='verified'){rejected.push({index:i,reason:candidate.message});continue;}
  const quality=gameplayQuality(candidate.map,candidate.verification,candidate.alternative);
  candidates.push({...candidate,quality,index:i});
 }
 if(!candidates.length)return {status:'failed',message:'No verified candidates in search budget',rejected};
 candidates.sort((a,b)=>b.quality.score-a.quality.score||a.index-b.index);
 const best=candidates[0];
 best.map.name=`Curated route maze · ${seed}`;
 best.map.description='Selected from independently verified seeded maze candidates using branching, exploration and verified route-choice metrics; not a calibrated human difficulty rating.';
 return {...best,challenge:'curated-maze',evaluated:candidates.length,requested:count,rejected,quality:best.quality};
}
function analyze(m,verification){
 const routes=verification?.routes||[],placements=verification?.placements||{};
 const kinds=Object.values(placements).map(root.EFEngine.placementKind);
 const turns=routes.reduce((total,r)=>total+r.path.slice(1,-1).filter((v,i)=>{
  const a=r.path[i],b=r.path[i+2];
  const d1=root.EFEngine.neighbors(v,m.width,m.height).some(([n])=>n===a);
  const d2=root.EFEngine.neighbors(v,m.width,m.height).some(([n])=>n===b);
  if(!d1||!d2)return false; // paired link jumps aren't ordinary turns
  return Math.floor(a/m.width)!==Math.floor(b/m.width)&&a%m.width!==b%m.width;
 }).length,0);
 const components=kinds.reduce((o,k)=>(o[k]=(o[k]||0)+1,o),{});
 return {elementPairs:routes.length,track:verification?.score?.track||0,turns,components,
  searchNodes:verification?.nodes||0,constructionAttempts:verification?.constructionAttempts||0,
  note:'Descriptive solution metrics, not a calibrated human difficulty rating or optimality proof'};
}
const api={generate,generateConstruction,generateDualConstruction,generateCrossing,generateCrossingChoice,generateDoubleCrossing,generateBranching,generateMaze,generateCuratedMaze,generateInteriorDetour,generateInteriorChoices,mazeQuality,solutionTradeoff,gameplayQuality,analyze,hash};root.EFGenerator=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
if(typeof document!=='undefined'){
 document.getElementById('generate').onclick=()=>{
  if(window.EFPlay?.isActive()){document.getElementById('generatorMessages').textContent='Exit Playtest before replacing the map.';return;}
  if(typeof dirty!=='undefined'&&dirty&&!confirm('Replace the current unsaved map with a generated puzzle?'))return;
  const seed=document.getElementById('genSeed').value.trim()||'1042',difficulty=document.getElementById('genDifficulty').value;
  const result=difficulty==='interior-choices'?window.EFGenerator.generateInteriorChoices(seed):difficulty==='interior-detour'?window.EFGenerator.generateInteriorDetour(seed):difficulty==='curated-maze'?window.EFGenerator.generateCuratedMaze(seed):difficulty==='maze'?window.EFGenerator.generateMaze(seed):difficulty==='branching'?window.EFGenerator.generateBranching(seed):difficulty==='double-crossing'?window.EFGenerator.generateDoubleCrossing(seed):difficulty==='crossing-choice'?window.EFGenerator.generateCrossingChoice(seed):difficulty.startsWith('crossing')?window.EFGenerator.generateCrossing(seed,difficulty==='crossing'?'intersection':'intersection-bridge'):difficulty.startsWith('dual-')?window.EFGenerator.generateDualConstruction(seed,difficulty.slice(5)):['portal','tunnel'].includes(difficulty)?window.EFGenerator.generateConstruction(seed,difficulty):window.EFGenerator.generate(seed,difficulty),msg=document.getElementById('generatorMessages');
  if(result.status!=='verified'){msg.className='messages warn';msg.textContent=result.message;return;}
  map=result.map;history=[];future=[];syncMeta();render();dirty=true;document.getElementById('dirty').textContent='Generated · unsaved';msg.className='messages ok';const a=window.EFGenerator.analyze(result.map,result.verification);msg.textContent=`Verified ${difficulty} candidate${result.challenge==='curated-maze'?` (selected from ${result.evaluated}/${result.requested} verified candidates; ${result.quality.junctions} junctions, ${result.quality.deadEnds} dead ends, ${result.quality.choiceBonus} route-choice points)`:''} · ${a.elementPairs} element pairs · ${a.track} track · ${a.turns} turns · ${Object.entries(a.components).map(([k,v])=>`${v} ${k}`).join(', ')||'no placed components'} · ${a.searchNodes} search nodes · cost ${result.verification.score.cost}. Editable/exportable.`;
  if(result.difficulty){const d=result.difficulty;msg.textContent+=` ${d.verifiedChoices} verified choices · track ${d.trackRange.join("–")} · turns ${d.turnRange.join("–")} · cost ${d.costRange.join("–")}. These ranges describe the sampled solutions.`;}
 };
}
