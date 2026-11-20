'use strict';
(function(root){
 const E=typeof module==='undefined'?root.EFEngine:require('../map-editor/engine');
 const ground=['land','forest','ice'];
 const componentKinds=['bridge','intersection','checkpoint'];
 const edgeKey=(previous,cell,next)=>previous+':'+cell+':'+next;

 // Each low-level search respects the current's bans and optional player prefix.
 // The fast search finds a shortest walk. If a required waypoint caused a loop,
 // retry with the visited set in the state so the result remains a simple path.
 function shortest(model,pair,placements,bans,prefix){
  const {map,adjacency,tick}=model;
  const rules=map.constraints[pair.element]||{};
  const checkpoints=map.cells.flatMap((cell,i)=>cell.component==='checkpoint'&&
   ['any',pair.element].includes(cell.props?.element)?[i]:[]);
  const required=[...new Set(rules.requireComponents||[])];
  const full=(1<<(checkpoints.length+required.length))-1;
  const passable=map.cells.map((cell,i)=>{
   const kind=E.effective(map,placements,i);
   return !bans.has(i)&&(!cell.node||cell.node.element===pair.element)&&
    (ground.includes(cell.terrain)||(cell.terrain==='water'&&kind==='bridge'))&&
    !rules.forbidTerrain?.includes(cell.terrain)&&!rules.forbidComponents?.includes(kind)&&
    (kind!=='checkpoint'||!cell.props?.element||['any',pair.element].includes(cell.props.element));
  });
  function flags(cell){
   const checkpoint=checkpoints.indexOf(cell);
   const component=required.indexOf(E.effective(map,placements,cell));
   return (checkpoint<0?0:1<<checkpoint)|(component<0?0:1<<(checkpoints.length+component));
  }
  let mask=0;
  const start=prefix||[pair.source];
  if(start[0]!==pair.source||new Set(start).size!==start.length)return null;
  for(let i=0;i<start.length;i++){
   const cell=start[i];
   if(!passable[cell]||(i>0&&!adjacency[start[i-1]].includes(cell))||
     (i>1&&bans.has(edgeKey(start[i-2],start[i-1],cell)))||
     (cell===pair.destination&&i!==start.length-1))return null;
   mask|=flags(cell);
  }
  function search(simple){
   const queue=[{path:start,mask}];
   const seen=new Set();
   for(let head=0;head<queue.length;head++){
    tick();
    const state=queue[head], cell=state.path.at(-1), previous=state.path.at(-2);
    if(cell===pair.destination){
     if(state.mask===full)return state.path;
     continue;
    }
    for(const next of adjacency[cell]){
     if(next===pair.source||!passable[next]||bans.has(edgeKey(previous,cell,next))||
       (simple?state.path.includes(next):start.includes(next)))continue;
     const nextMask=state.mask|flags(next);
     const path=[...state.path,next];
     const key=(bans.size?cell+':':'')+next+':'+nextMask+(simple?':'+[...path].sort((a,b)=>a-b).join(','):'');
     if(seen.has(key))continue;
     seen.add(key);
     queue.push({path,mask:nextMask});
    }
   }
   return null;
  }
  const walk=search(false);
  return walk&&new Set(walk).size!==walk.length?search(true):walk;
 }

 function conflict(map,placements,paths){
  const occupied=new Map();
  const axis=(previous,cell,next)=>previous===undefined||next===undefined?null:
   Math.abs(previous-next)===2&&Math.floor(previous/map.width)===Math.floor(next/map.width)?'row':
   Math.abs(previous-next)===2*map.width?'column':null;
  for(let pair=0;pair<paths.length;pair++){
   const path=paths[pair];
   for(let i=0;i<path.length;i++){
    const cell=path[i], previous=path[i-1], next=path[i+1];
    const crossing=E.effective(map,placements,cell)==='intersection';
    const use={pair,ban:crossing?edgeKey(previous,cell,next):cell,axis:axis(previous,cell,next)};
    for(const other of occupied.get(cell)||[]){
     if(!crossing||!use.axis||!other.axis||use.axis===other.axis)return [other,use];
    }
    occupied.set(cell,[...(occupied.get(cell)||[]),use]);
   }
  }
  return null;
 }

 function prepare(map){
  const adjacency=map.cells.map((_,i)=>E.neighbors(i,map.width,map.height).map(([next])=>next));
  const pairs=E.pairs(map);
  const supported=pairs.length>0&&pairs.every(pair=>pair.source>=0&&pair.destination>=0)&&
   map.cells.every(cell=>[...ground,'water','mountain','wall'].includes(cell.terrain)&&
    (!cell.component||componentKinds.includes(cell.component)))&&
   Object.keys(map.inventory).every(kind=>['bridge','intersection'].includes(kind)||!map.inventory[kind])&&
   map.cells.filter(cell=>cell.component==='checkpoint').length<20&&
   Object.values(map.constraints).every(rule=>(rule.requireComponents?.length||0)<10);
  const requiredIntersection=Object.values(map.constraints).some(rule=>rule.requireComponents?.includes('intersection'));
  const canCross=i=>adjacency[i].length===4&&adjacency[i].every(j=>
   ground.includes(map.cells[j].terrain)||
   (map.cells[j].terrain==='water'&&(map.cells[j].component==='bridge'||map.inventory.bridge)));
  const sites=map.cells.flatMap((_,i)=>['bridge','intersection'].flatMap(kind=>
   map.inventory[kind]&&E.canPlace(map,{},i,kind)&&
   (kind!=='intersection'||requiredIntersection||canCross(i))?[{i,kind}]:[]));
  return {map,adjacency,pairs,supported,sites};
 }

 function solve(model,{limit=20000,placements,required={},prefixes={},avoid={},solo,only}={}){
  if(!model.supported)return {status:'unsupported',nodes:0};
  const {map,sites}=model;
  const pairs=model.pairs.filter(pair=>solo?pair.element===solo:only?only.includes(pair.element):true);
  const stop=Symbol('search limit');
  let nodes=0;
  const tick=()=>{if(nodes>=limit)throw stop;nodes++;};
  const work={...model,tick};
  function valid(plan){
   const counts=E.placementCounts(plan);
   return Object.entries(plan).every(([i,kind])=>E.canPlace(map,{},Number(i),kind))&&
    Object.entries(counts).every(([kind,count])=>count<=(map.inventory[kind]||0))&&
    (!map.construction||E.constructionCost(map,counts)<=map.construction.budget);
  }
  function* plans(plan,first){
   tick();
   if(!valid(plan))return;
   yield plan;
   for(let index=first;index<sites.length;index++){
    const {i,kind}=sites[index];
    if(!Object.hasOwn(plan,i))yield* plans({...plan,[i]:kind},index+1);
   }
  }
  function fixed(plan){
   const bans=pairs.map(pair=>new Set(avoid[pair.element]||[]));
   const paths=pairs.map((pair,i)=>shortest(work,pair,plan,bans[i],prefixes[pair.element]));
   if(paths.some(path=>!path))return null;
   const pending=[{bans,paths}];
   const seen=new Set();
   while(pending.length){
    tick();
    const state=pending.pop();
    const clash=conflict(map,plan,state.paths);
    if(!clash)return state.paths.map((path,i)=>({element:pairs[i].element,path}));
    const nextStates=[];
    for(const {pair,ban} of clash){
     const updated=[...state.bans];
     updated[pair]=new Set([...updated[pair],ban]);
     const key=JSON.stringify(updated.map(set=>[...set].sort()));
     if(seen.has(key))continue;
     seen.add(key);
     const path=shortest(work,pairs[pair],plan,updated[pair],prefixes[pairs[pair].element]);
     if(!path)continue;
     const paths=[...state.paths];
     paths[pair]=path;
     nextStates.push({bans:updated,paths});
    }
    nextStates.sort((a,b)=>b.paths.reduce((sum,path)=>sum+path.length,0)-a.paths.reduce((sum,path)=>sum+path.length,0));
    pending.push(...nextStates);
   }
   return null;
  }
  try{
   for(const plan of placements===undefined?plans(required,0):valid(placements)?[placements]:[]){
    const routes=fixed(plan);
    if(!routes)continue;
    const errors=solo||only?routes.map(route=>E.validatePath(map,route.element,route.path,routes,plan)).filter(Boolean):
     E.checkAll(map,routes,plan);
    if(errors.length)return {status:'invalid',nodes,errors};
    return {status:'solved',nodes,routes,placements:plan,score:E.score(map,routes,plan)};
   }
   return {status:'unsolved',nodes};
  }catch(error){
   if(error!==stop)throw error;
   return {status:'inconclusive',nodes};
  }
 }

 const api={prepare,solve};
 root.EFRoutingSearch=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
