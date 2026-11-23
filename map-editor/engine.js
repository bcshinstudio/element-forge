'use strict';
/* Shared rules: browser global and Node test export. Prototype scope deliberately explicit. */
(function(root){
const ELEMENTS=['fire','water','nature','electricity','arcane','wind','earth','ice','metal','light','shadow'];
const neighbors=(i,w,h)=>[[i-w,'N'],[i+1,'E'],[i+w,'S'],[i-1,'W']].filter(([j,d])=>j>=0&&j<w*h&&(d!=='E'||Math.floor(j/w)===Math.floor(i/w))&&(d!=='W'||Math.floor(j/w)===Math.floor(i/w)));
const axis=(a,b,w)=>Math.floor(a/w)===Math.floor(b/w)?'h':'v';

/* A single Confluence Chamber merges two input currents into one output.
   Existing maps without a recipe retain Water + Earth → Plant.
   Preset recipes are game mechanics, not claims about real chemistry. */
const CONFLUENCE_RECIPES=Object.freeze([
 {id:'water-earth-nature',inputs:['water','earth'],output:'nature'},
 {id:'fire-earth-metal',inputs:['fire','earth'],output:'metal'},
 {id:'fire-water-wind',inputs:['fire','water'],output:'wind'},
 {id:'water-wind-ice',inputs:['water','wind'],output:'ice'},
 {id:'light-shadow-electricity',inputs:['light','shadow'],output:'electricity'}
]);
const ELEM_IDS=new Set(ELEMENTS);
function confluenceRecipe(props={}){
 const id=props?.recipe??((props?.inputs!==undefined||props?.output!==undefined)?'custom':CONFLUENCE_RECIPES[0].id);
 if(id==='custom'){
  const inputs=props.inputs,output=props.output;
  if(!Array.isArray(inputs)||inputs.length!==2||
    inputs.some(el=>typeof el!=='string'||!ELEM_IDS.has(el))||
    typeof output!=='string'||!ELEM_IDS.has(output)||
    new Set([...inputs,output]).size!==3)return null;
  return {id,inputs:[...inputs],output};
 }
 return CONFLUENCE_RECIPES.find(r=>r.id===id)??null;
}
const displayElement=e=>e==='nature'?'Plant':e[0].toUpperCase()+e.slice(1);
const confluenceDirections=(output='E')=>{
 const directions=['N','E','S','W'],i=directions.indexOf(output);
 if(i<0)return null;
 const input1=directions[(i+3)%4],input2=directions[(i+1)%4];
 return {input1,input2,exit:output,water:input1,earth:input2,nature:output};
};
function confluencePortSides(props={}){
 const defaults=confluenceDirections(props?.direction||'E');
 if(!defaults)return null;
 const sides=props?.ports;
 if(sides===undefined)return {input1:defaults.input1,input2:defaults.input2,output:defaults.exit};
 if(!sides||typeof sides!=='object'||Array.isArray(sides)||
    Object.keys(sides).sort().join(',')!=='input1,input2,output'||
    [sides.input1,sides.input2,sides.output].some(s=>!['N','E','S','W'].includes(s))||
    new Set([sides.input1,sides.input2,sides.output]).size!==3)return null;
 return {input1:sides.input1,input2:sides.input2,output:sides.output};
}
const confluence=m=>{
 const chambers=m.cells.flatMap((c,i)=>c.component==='confluence'?[i]:[]);
 if(chambers.length!==1)return null;
 const index=chambers[0],cell=m.cells[index],recipe=confluenceRecipe(cell.props);
 if(!recipe)return null;
 const directions=confluenceDirections(cell.props?.direction||'E'),sides=confluencePortSides(cell.props);
 if(!directions||!sides)return null;
 return {index,recipe:recipe.id,inputs:[...recipe.inputs],output:recipe.output,
  ports:{[recipe.inputs[0]]:sides.input1,[recipe.inputs[1]]:sides.input2,[recipe.output]:sides.output},
  ...directions};
};
const confluenceNeighbor=(m,index,side)=>neighbors(index,m.width,m.height).find(([,d])=>d===side)?.[0]??-1;

/* Multi-chamber maps use one route per source, including one virtual source at
   each chamber output. A source supplies exactly ONE route; splitting a
   source to two destinations is a separate future mechanic. */
const hasMultiConfluence=m=>m.cells.filter(c=>c.component==='confluence').length>1;
const confluences=m=>m.cells.flatMap((cell,index)=>{
 if(cell.component!=='confluence')return [];
 const recipe=confluenceRecipe(cell.props),d=confluenceDirections(cell.props?.direction||'E'),sides=confluencePortSides(cell.props);
 if(!recipe||!d||!sides)return [];
 return [{index,recipe:recipe.id,inputs:[...recipe.inputs],output:recipe.output,
  ports:{[recipe.inputs[0]]:sides.input1,[recipe.inputs[1]]:sides.input2,[recipe.output]:sides.output},...d}];
});
const confluenceAt=(m,index)=>confluences(m).find(ch=>ch.index===index)??null;
const routeKey=(m,element,source)=>hasMultiConfluence(m)?element+'@'+source:element;
function multiPairs(m){
 const cs=confluences(m),result=[];
 for(const element of ELEMENTS){
  const sources=m.cells.flatMap((c,i)=>c.node?.role==='source'&&c.node.element===element?[i]:[]);
  const targets=m.cells.flatMap((c,i)=>c.node?.role==='destination'&&c.node.element===element?[i]:[]);
  for(const c of cs){
   if(c.output===element)sources.push(c.index);
   if(c.inputs.includes(element))targets.push(c.index);
  }
  sources.sort((a,b)=>a-b);targets.sort((a,b)=>a-b);
  if(!sources.length){
   for(const dest of targets)result.push({element,source:-1,destination:dest,targets:[...targets]});
  }else{
   for(const source of sources)result.push({
    element,source,destination:targets.length===1?targets[0]:-1,
    targets:[...targets],id:routeKey(m,element,source)
   });
  }
 }
 return result;
}
function multiConfluenceRouteError(m,element,path){
 for(let k=0;k<path.length;k++){
  const ch=confluenceAt(m,path[k]);
  if(!ch)continue;
  if(k===0&&element===ch.output){
   if(path.length>1&&path[1]!==confluenceNeighbor(m,ch.index,ch.ports[element]))
    return displayElement(element)+' must leave its Confluence output port';
  }else if(k===path.length-1&&ch.inputs.includes(element)){
   if(k>0&&path[k-1]!==confluenceNeighbor(m,ch.index,ch.ports[element]))
    return displayElement(element)+' must enter its marked Confluence input port';
  }else return 'A Confluence Chamber cannot be used as a through-route or by an unrelated element';
 }
 return null;
}

const pairs=m=>{
 if(hasMultiConfluence(m))return multiPairs(m);
 const chamber=confluence(m);
 return ELEMENTS.map(element=>{
  let source=m.cells.findIndex(c=>c.node?.element===element&&c.node.role==='source');
  let destination=m.cells.findIndex(c=>c.node?.element===element&&c.node.role==='destination');
  if(chamber){
   if(element===chamber.output&&source<0)source=chamber.index;
   if(chamber.inputs.includes(element)&&destination<0)destination=chamber.index;
  }
  return {element,source,destination};
 }).filter(p=>p.source>=0||p.destination>=0);
};
function confluenceRouteError(m,element,path){
 const chamber=confluence(m);
 if(!chamber||!path.includes(chamber.index))return null;
 if(![...chamber.inputs,chamber.output].includes(element))
  return 'Only the selected reaction elements may use the Confluence Chamber';
 const k=path.indexOf(chamber.index);
 if(element===chamber.output){
  if(k!==0)return displayElement(element)+' must start at the Confluence Chamber';
  if(path.length>1&&path[1]!==confluenceNeighbor(m,chamber.index,chamber.ports[element]))
   return displayElement(element)+' must leave through the output port';
 }else{
  if(k!==path.length-1)return displayElement(element)+' must end at the Confluence Chamber';
  if(path.length>1&&path.at(-2)!==confluenceNeighbor(m,chamber.index,chamber.ports[element]))
   return displayElement(element)+' must enter through its marked input port';
 }
 return null;
}
const placementKind=v=>typeof v==='string'?v:v?.kind||null;

/* Chapter 10 is opt-in: existing maps never enter phase-aware validation.
   A delivery traversing the single phase plate changes Day to Night once.
   Routes completed before the switch retain their original deliveredPhase. */
const hasPhases=m=>Boolean(m.phaseRules);
const phasePlateIndex=m=>m.cells.findIndex(c=>c.component==='phasePlate');
const phaseView=(m,dayPhase='day')=>{
 if(!hasPhases(m))return m;
 return {...m,cells:m.cells.map(c=>{
  if(!c.props?.phaseShift&&c.component!=='phasePlate')return c;
  const out={...c};
  if(c.props?.phaseShift&&dayPhase==='night')
   out.terrain=c.terrain==='exposed'?'covered':c.terrain==='covered'?'exposed':c.terrain;
  // A trigger plate is a passable fixed floor fixture; not a checkpoint.
  if(out.component==='phasePlate')delete out.component;
  return out;
 })};
};
const phaseTriggerRoute=(m,r)=>r.element===m.cells[phasePlateIndex(m)]?.props?.element&&
 r.path.includes(phasePlateIndex(m));
function phaseValidation(m,routes,placements={},requireComplete=true){
 const issues=[];
 const plate=phasePlateIndex(m),trigger=m.cells[plate]?.props?.element;
 if(plate<0||!trigger)return ['Phase puzzle needs a phase plate and triggering element.'];
 if(Object.keys(placements).length)issues.push('Phase pilot does not support player-placed construction tools.');
 const ps=pairs(m),found=new Set(),usedDest=new Set();
 let phase=m.phaseRules.initial,switched=false;
 const completed=[];
 for(const r of routes){
  const key=r.element+'@'+r.path?.[0],end=r.path?.at(-1),target=r.element+'@'+end;
  const p=ps.find(q=>q.element===r.element&&q.source===r.path?.[0]&&q.destination===end);
  if(!p){issues.push(r.element+': invalid phase route endpoints');continue;}
  if(found.has(key)||usedDest.has(target))issues.push(r.element+': duplicate source or destination');
  found.add(key);usedDest.add(target);
  if(r.deliveredPhase!==undefined&&r.deliveredPhase!==phase)issues.push('Incorrect stored delivery phase for '+r.element);
  const err=validatePath(phaseView(m,phase),r.element,r.path,completed,placements);
  if(err)issues.push(r.element+': '+err);
  if(r.path.includes(plate)&&r.element!==trigger)issues.push('Phase plate belongs to '+displayElement(trigger));
  completed.push(r);
  if(phaseTriggerRoute(m,r)){
   if(switched)issues.push('Phase plate already activated');
   switched=true;phase='night';
  }
 }
 if(requireComplete){
  if(!switched)issues.push('Complete the '+displayElement(trigger)+' route through the phase plate to switch to Night');
  for(const p of ps)if(!found.has(p.element+'@'+p.source))issues.push(p.element+': missing route');
 }
 return issues;
}
function solvePhases(m,{limit=120000,allowPlacement=true}={}){
 if(!hasPhases(m))return {status:'invalid',message:'No phase rules'};
 const plate=phasePlateIndex(m),trigger=m.cells[plate]?.props?.element,ps=pairs(m);
 if(plate<0||!trigger||ps.length<2||ps.length>4||ps.some(p=>p.source<0||p.destination<0))
  return {status:'invalid',message:'Phase prototype requires 2–4 matched routes and one trigger plate'};
 if(Object.values(m.inventory??{}).some(v=>v>0))
  return {status:'unsupported',message:'Phase puzzle verification currently requires zero player construction tools'};
 if(hasMultiConfluence(m)||m.cells.some(c=>c.component==='confluence'))
  return {status:'unsupported',message:'Phase and Confluence combination is reserved for a later version'};
 let count=0,exhausted=false;
 const ordered=[...ps].sort((a,b)=>(a.element===trigger?-1:0)-(b.element===trigger?-1:0));
 const distance=(i,j)=>Math.abs(i%m.width-j%m.width)+Math.abs(Math.floor(i/m.width)-Math.floor(j/m.width));
 const dfs=(n,completed,dayPhase,switched)=>{
  if(n===ordered.length)return switched&&phaseValidation(m,completed,{},true).length===0?completed:null;
  const p=ordered[n],view=phaseView(m,dayPhase),needsPlate=p.element===trigger&&!switched;
  const stack=[{path:[p.source],seen:new Set([p.source])}];
  while(stack.length){
   if(++count>limit){exhausted=true;return null;}
   const {path,seen}=stack.pop(),cur=path.at(-1);
   if(cur===p.destination){
    if(needsPlate&&!seen.has(plate))continue;
    if(path.includes(plate)&&p.element!==trigger)continue;
    const err=validatePath(view,p.element,path,completed,{});
    if(err)continue;
    const next=[...completed,{element:p.element,path,deliveredPhase:dayPhase}];
    const result=dfs(n+1,next,needsPlate?'night':dayPhase,switched||needsPlate);
    if(result)return result;
    if(exhausted)return null;
    continue;
   }
   const ns=routeNeighbors(view,cur,{},p.element).filter(i=>!seen.has(i));
   ns.sort((a,b)=>distance(b,p.destination)-distance(a,p.destination));
   for(const i of ns){
    if(i===plate&&p.element!==trigger)continue;
    const next=[...path,i],partial=validatePath(view,p.element,next,completed,{},true);
    if(partial)continue;
    stack.push({path:next,seen:new Set([...seen,i])});
   }
  }
  return null;
 };
 const found=dfs(0,[],m.phaseRules.initial,false);
 return found?{status:'solved',routes:found,placements:{},nodes:count,score:score(m,found,{})}:
  {status:exhausted?'inconclusive':'unsolved',nodes:count,message:exhausted?
   'Phase search budget reached; result unknown':'No solution found under first-switch phase rules'};
}

const effective=(m,placements,i)=>placementKind(placements?.[i])||m.cells[i].component||null;
const pairIdAt=(m,placements,i)=>placements?.[i]?.pairId||m.cells[i]?.props?.pairId||null;
const linkPartner=(m,i,placements={})=>{
 const kind=effective(m,placements,i),id=pairIdAt(m,placements,i);
 if(!['portal','tunnel'].includes(kind)||!id)return -1;
 const matches=[];for(let j=0;j<m.cells.length;j++)if(effective(m,placements,j)===kind&&pairIdAt(m,placements,j)===id)matches.push(j);
 if(matches.length!==2)return -1;
 const other=matches[0]===i?matches[1]:matches[0];
 if(kind==='tunnel'){
  const row=Math.floor(i/m.width)===Math.floor(other/m.width),col=i%m.width===other%m.width;
  if(!row&&!col)return -1;
  const step=row?(other>i?1:-1):(other>i?m.width:-m.width);
  if(m.rulesVersion>=4){
   if(i+step===other)return -1;
   for(let k=i+step;k!==other;k+=step){
    if(!['mountain','wall'].includes(m.cells[k].terrain))return -1;
   }
  }else{
   let blocked=false;for(let k=i+step;k!==other;k+=step)if(!['land','forest','ice'].includes(m.cells[k].terrain))blocked=true;
   if(!blocked)return -1;
  }
 }
 return other;
};
function windLandings(m,i,placements={}){
 const ground=cell=>['land','forest','ice','bank','exposed','covered'].includes(cell?.terrain)&&
  (!(m.rulesVersion>=3)||cell.terrain!=='forest');
 const legal=index=>ground(m.cells[index])&&(m.rulesVersion!==4||((!m.cells[index].node||m.cells[index].node.element==='wind')&&effective(m,placements,index)!=='tunnel'));
 if(!legal(i))return [];
 return neighbors(i,m.width,m.height).flatMap(([hole,heading])=>{
  if(m.cells[hole].terrain!=='void')return [];
  const landing=neighbors(hole,m.width,m.height).find(([,dir])=>dir===heading)?.[0];
  return legal(landing)?[landing]:[];
 });
}
function routeNeighbors(m,i,placements={},element){
 const result=neighbors(i,m.width,m.height).map(([j])=>j);
 const partner=linkPartner(m,i,placements);
 if(partner>=0&&(element!=='wind'||effective(m,placements,i)!=='tunnel'))result.push(partner);
 if(element==='wind')result.push(...windLandings(m,i,placements));
 return result;
}
const spanKinds=['bridge','metalSpan'];
const ordinaryGround=['land','forest','ice','oneway'];
const newTerrain=['river','bank','shallow','scree','heated','abrasive','exposed','covered'];
function terrainError(m,element,index,component){
 const {terrain}=m.cells[index];
 const name=element==='nature'?'Plant':element[0].toUpperCase()+element.slice(1);
 const waterTerrain=['water','river','shallow'].includes(terrain);
 const obstacle={mountain:'mountains',wall:'walls',void:'open holes',lava:'lava'}[terrain]??'this terrain';
 const blocked=`${name} cannot cross ${waterTerrain?'this water tile':obstacle}.`;
 if(!(m.rulesVersion>=3))return ordinaryGround.includes(terrain)||(terrain==='water'&&component==='bridge')?null:blocked;
 if(terrain==='forest'&&element!=='nature')return 'Only Plant can move through woods.';
 if(element==='nature'&&component==='portal')return 'Plant cannot use portals.';
 if(['earth','metal'].includes(element)&&component==='bridge')return `${element==='earth'?'Earth':'Metal'} cannot use ordinary bridges.`;
 if(element==='ice'&&terrain==='heated')return 'Ice cannot enter heated ground.';
 if(terrain==='exposed'&&element==='shadow')return 'Shadow cannot pass through direct light.';
 if(terrain==='covered'&&element==='light')return 'Light needs exposed channels.';
 if([...ordinaryGround,'bank','exposed','covered'].includes(terrain))return null;
 if(terrain==='lava')return element==='fire'?null:'Only Fire can enter lava.';
 if(terrain==='scree')return element==='earth'?null:'Only Earth can cross scree.';
 if(['heated','abrasive'].includes(terrain))return element==='metal'?null:'Only Metal can cross this ground.';
 if(!waterTerrain)return blocked;
 if(element==='fire'&&m.rulesVersion>=4)return 'Fire cannot cross water, even on a bridge.';
 if(element==='electricity'&&m.rulesVersion>=4)return 'Electricity needs dry ground. Bridges do not carry it over water.';
 if(element==='fire'&&terrain!=='shallow')return 'Deep water blocks Fire even on a span.';
 if(element==='electricity')return component==='metalSpan'?null:'Electricity needs a metal span over water.';
 if(element==='water'&&(terrain==='river'||m.rulesVersion>=4))return null;
 if(element==='ice'&&terrain==='shallow')return null;
 return spanKinds.includes(component)?null:blocked;
}
function bankError(m,element,from,to){
 if(m.rulesVersion!==3||element!=='water')return null;
 const a=m.cells[from].terrain,b=m.cells[to].terrain;
 if((a==='river')===(b==='river'))return null;
 return a==='bank'||b==='bank'?null:'Water can enter or leave the river only at a marked bank.';
}
const direction=(a,b,w)=>b===a-w?'N':b===a+w?'S':b===a+1&&Math.floor(a/w)===Math.floor(b/w)?'E':b===a-1&&Math.floor(a/w)===Math.floor(b/w)?'W':null;
function allowedTransition(m,element,from,to,placements={}){
 const c=m.cells[from],next=m.cells[to],step=direction(from,to,m.width);
 if(bankError(m,element,from,to)||(!step&&m.rulesVersion>=3&&element==='water'&&(c.terrain==='river'||next.terrain==='river')))return false;
 if(!step)return (element==='wind'&&windLandings(m,from,placements).includes(to))||
  (linkPartner(m,from,placements)===to&&(element!=='wind'||effective(m,placements,from)!=='tunnel'));
 if(c.terrain==='oneway'&&step!==(c.props?.direction||'E'))return false;
 if(c.component==='gate'&&step!==(c.props?.direction||'E'))return false;
 if(next.component==='gate'&&step!==(next.props?.direction||'E'))return false;
 if(next.terrain==='oneway'&&step!==(next.props?.direction||'E'))return false;
 return true;
}
function constraintError(m,element,path,placements={},partial=false){
 const rules=m.constraints?.[element]||{};
 if(rules.forbidTerrain?.some(t=>path.some(i=>m.cells[i].terrain===t)))return 'Element terrain restriction violated';
 if(rules.forbidComponents?.some(t=>path.some(i=>effective(m,placements,i)===t)))return 'Element component restriction violated';
 if(!partial&&rules.requireComponents?.some(t=>!path.some(i=>effective(m,placements,i)===t)))return 'Required component not used';
 return null;
}
function canPlace(m,placements,i,kind){const c=m.cells[i];return !!c&&!c.node&&!c.component&&!placements[i]&&(spanKinds.includes(kind)?(c.terrain==='water'||m.rulesVersion>=3&&['river','shallow'].includes(c.terrain)):['intersection','portal','tunnel'].includes(kind)?['land','forest','ice','bank','exposed','covered'].includes(c.terrain):false)}
function portalExit(m,path,placements){
 const entry=path.at(-1);
 if(effective(m,placements,entry)!=='portal')return null;
 const partner=linkPartner(m,entry,placements);
 return path.at(-2)===partner?null:partner;
}
const portalExitMessage='Continue from the paired portal exit.';

function validateMultiPath(m,element,path,other=[],placements={},partial=false){
 const ps=multiPairs(m),p=ps.find(x=>x.element===element&&x.source===path?.[0]);
 if(!p||p.source<0||!p.targets.length)return 'Missing endpoints';
 if(!Array.isArray(path)||path.length<(partial?1:2)||
    (!partial&&!p.targets.includes(path.at(-1))))return 'Route must connect its source to destination';
 const seen=new Set();
 for(let k=0;k<path.length;k++){
  const i=path[k],c=m.cells[i];if(!Number.isInteger(i)||!c||seen.has(i))return 'Route leaves board or loops';
  seen.add(i);
  const comp=effective(m,placements,i);
  if(element==='wind'&&comp==='tunnel')return 'Wind cannot use tunnels';
  const blocked=terrainError(m,element,i,comp);if(blocked)return blocked;
  if(comp&&!['bridge','metalSpan','intersection','checkpoint','portal','tunnel','gate','confluence'].includes(comp))
   return 'Unsupported component: '+comp;
  if(c.node&&!(k===0&&c.node.role==='source'&&c.node.element===element)&&
   !(k===path.length-1&&p.targets.includes(i)&&c.node.role==='destination'&&c.node.element===element))
   return 'Another endpoint blocks route';
  if(c.component==='checkpoint'&&c.props?.element&&!['any',element].includes(c.props.element))
   return 'Checkpoint belongs to another element';
  if(k&&!routeNeighbors(m,path[k-1],placements,element).includes(i))
   return 'Routes must use adjacent cells or valid paired links';
  if(k&&!allowedTransition(m,element,path[k-1],i,placements))
   return bankError(m,element,path[k-1],i)||'One-way direction violated';
 }
 const reaction=multiConfluenceRouteError(m,element,path);if(reaction)return reaction;
 const restriction=constraintError(m,element,path,placements,partial);if(restriction)return restriction;
 for(let k=1;k<path.length;k++){
  const exit=portalExit(m,path.slice(Math.max(0,k-2),k),placements);
  if(exit!==null&&path[k]!==exit)return portalExitMessage;
 }
 for(const r of other){
  for(const i of path){
   if(!r.path.includes(i))continue;
   if(effective(m,placements,i)==='confluence'){
    if((i===path[0]||i===path.at(-1))&&(i===r.path[0]||i===r.path.at(-1)))continue;
    return 'Confluence can only be shared at a route endpoint';
   }
   if(element===r.element)return 'Routes of the same element cannot share a tile';
   if(effective(m,placements,i)!=='intersection')return 'Different elements cannot share a cell';
   const a=path.indexOf(i),b=r.path.indexOf(i);
   if(partial&&a===path.length-1&&a>0&&b>0&&b<r.path.length-1)continue;
   if(a===0||a===path.length-1||b===0||b===r.path.length-1)return 'Crossing cannot be at an endpoint';
   const a1=axis(path[a-1],i,m.width),a2=axis(i,path[a+1],m.width);
   const b1=axis(r.path[b-1],i,m.width),b2=axis(i,r.path[b+1],m.width);
   if(!direction(path[a-1],i,m.width)||!direction(i,path[a+1],m.width)||
      !direction(r.path[b-1],i,m.width)||!direction(i,r.path[b+1],m.width)||
      a1!==a2||b1!==b2||a1===b1)return 'Intersection needs straight perpendicular routes';
  }
 }
 return null;
}
function checkMulti(m,routes,placements={}){
 const errors=[],counts=placementCounts(placements);
 for(const [i,v] of Object.entries(placements)){
  const k=placementKind(v);
  if(!canPlace(m,Object.fromEntries(Object.entries(placements).filter(([j])=>j!==i)),+i,k))
   errors.push('Invalid '+k+' placement at '+(+i+1));
 }
 for(const [k,n] of Object.entries(counts))if(n>(m.inventory?.[k]||0))errors.push('Inventory exceeded: '+k);
 if(m.construction&&constructionCost(m,counts)>m.construction.budget)errors.push('Construction budget exceeded');
 for(let i=0;i<m.cells.length;i++)if(['portal','tunnel'].includes(effective(m,placements,i))&&linkPartner(m,i,placements)<0)
  errors.push('Invalid or unpaired '+effective(m,placements,i)+' at cell '+(i+1));
 const ps=multiPairs(m);
 const sources=new Set(),targets=new Set();
 for(const p of ps)if(p.source<0||!p.targets.length)errors.push(p.element+': unmatched source/destination endpoints');
 for(const r of routes){
  const start=r.path?.[0],end=r.path?.at(-1),id=r.element+'@'+start;
  if(sources.has(id))errors.push(r.element+': duplicate route from cell '+(start+1));sources.add(id);
  const p=ps.find(p=>p.element===r.element&&p.source===start);
  if(!p)errors.push(r.element+': unexpected route source');
  const destKey=r.element+'@'+end;
  if(targets.has(destKey))errors.push(r.element+': destination already supplied');
  targets.add(destKey);
  const issue=validateMultiPath(m,r.element,r.path,routes.filter(x=>x!==r),placements);
  if(issue)errors.push(r.element+' at cell '+(start+1)+': '+issue);
  // In multi-chamber maps several routes can carry the same element.
  // A checkpoint requires a visit by at least one eligible route;
  // individual route-exclusive checkpoints may be added in future.
 }
 for(const p of ps)if(p.source>=0&&!sources.has(p.element+'@'+p.source))
  errors.push(p.element+': missing route from cell '+(p.source+1));
 for(const ch of confluences(m)){
  for(const el of ch.inputs)if(!routes.some(r=>r.element===el&&r.path?.at(-1)===ch.index))
   errors.push('Confluence at cell '+(ch.index+1)+': missing '+displayElement(el)+' input');
  if(!routes.some(r=>r.element===ch.output&&r.path?.[0]===ch.index))
   errors.push('Confluence at cell '+(ch.index+1)+': missing '+displayElement(ch.output)+' output');
 }
 for(let i=0;i<m.cells.length;i++){
  const c=m.cells[i];
  if(c.component==='checkpoint'&&!routes.some(r=>
    ['any',r.element].includes(c.props?.element)&&r.path.includes(i)))
   errors.push((c.props?.element||'any')+': checkpoint at cell '+(i+1)+' not visited');
 }
 // A chamber becomes active only when both complete inputs originate at
 // real sources or upstream active chambers. Cycles without input power fail.
 const powered=new Set();
 for(let pass=0;pass<m.cells.length;pass++){
  let changed=false;
  for(const ch of confluences(m)){
   if(powered.has(ch.index))continue;
   const ready=ch.inputs.every(el=>routes.some(r=>r.element===el&&r.path?.at(-1)===ch.index&&
    (m.cells[r.path[0]].node?.role==='source'||powered.has(r.path[0]))));
   if(ready){powered.add(ch.index);changed=true;}
  }
  if(!changed)break;
 }
 for(const ch of confluences(m))if(!powered.has(ch.index))
  errors.push('Confluence at cell '+(ch.index+1)+': no powered path to both inputs (cycle or missing upstream input)');
 return errors;
}

function validatePath(m,element,path,other=[],placements={},partial=false){
 if(hasMultiConfluence(m))return validateMultiPath(m,element,path,other,placements,partial);
 const p=pairs(m).find(x=>x.element===element);if(!p||p.source<0||p.destination<0)return 'Missing endpoints';
 if(!Array.isArray(path)||path.length<(partial?1:2)||path[0]!==p.source||(!partial&&path.at(-1)!==p.destination))return 'Route must connect its source to destination';
 const seen=new Set();for(let k=0;k<path.length;k++){const i=path[k],c=m.cells[i];if(!Number.isInteger(i)||!c||seen.has(i))return 'Route leaves board or loops';seen.add(i);
 const comp=effective(m,placements,i);if(element==='wind'&&comp==='tunnel')return 'Wind cannot use tunnels';
 const terrain=terrainError(m,element,i,comp);if(terrain)return terrain;
 if(comp&&!['bridge','metalSpan','intersection','checkpoint','portal','tunnel','gate','confluence'].includes(comp))return `Unsupported component: ${comp}`;
 if(c.node&&(c.node.element!==element||(k!==0&&(k!==path.length-1||i!==p.destination))))return 'Another endpoint blocks route';
 if(c.component==='checkpoint'&&c.props?.element&&!['any',element].includes(c.props.element))return 'Checkpoint belongs to another element';
 if(k&& !routeNeighbors(m,path[k-1],placements,element).includes(i))return 'Routes must use adjacent cells or valid paired links';
 if(k&&!allowedTransition(m,element,path[k-1],i,placements))return bankError(m,element,path[k-1],i)||'One-way direction violated';
 }
 const reaction=confluenceRouteError(m,element,path);if(reaction)return reaction;
 const restriction=constraintError(m,element,path,placements,partial);if(restriction)return restriction;
 for(let k=1;k<path.length;k++){
  const exit=portalExit(m,path.slice(Math.max(0,k-2),k),placements);
  if(exit!==null&&path[k]!==exit)return portalExitMessage;
 }
 for(const r of other){if(r.element===element)continue;for(const i of path){if(!r.path.includes(i))continue;if(effective(m,placements,i)==='confluence')continue;if(effective(m,placements,i)!=='intersection')return 'Different elements cannot share a cell';const a=path.indexOf(i),b=r.path.indexOf(i);if(partial&&a===path.length-1&&a>0&&b>0&&b<r.path.length-1)continue;if(a===0||a===path.length-1||b===0||b===r.path.length-1)return 'Crossing cannot be at an endpoint';const a1=axis(path[a-1],i,m.width),a2=axis(i,path[a+1],m.width),b1=axis(r.path[b-1],i,m.width),b2=axis(i,r.path[b+1],m.width);if(!direction(path[a-1],i,m.width)||!direction(i,path[a+1],m.width)||!direction(r.path[b-1],i,m.width)||!direction(i,r.path[b+1],m.width)||a1!==a2||b1!==b2||a1===b1)return 'Intersection needs straight perpendicular routes';}}
 return null;
}
function constructionCost(m,counts){
 return Object.entries(counts).reduce((sum,[kind,count])=>sum+(m.construction?.prices[kind]??0)*count,0);
}
function placementCounts(placements){
 const counts=Object.create(null);
 for(const value of Object.values(placements)){
  const kind=placementKind(value);
  counts[kind]=(counts[kind]||0)+1;
 }
 return counts;
}
function checkAll(m,routes,placements={}){if(hasPhases(m))return phaseValidation(m,routes,placements,true);if(hasMultiConfluence(m))return checkMulti(m,routes,placements);const errors=[];const counts=placementCounts(placements);for(const [i,v] of Object.entries(placements)){const k=placementKind(v);if(!canPlace(m,Object.fromEntries(Object.entries(placements).filter(([j])=>j!==i)),+i,k))errors.push(`Invalid ${k} placement at ${+i+1}`);}for(const [k,n] of Object.entries(counts))if(n>(m.inventory?.[k]||0))errors.push(`Inventory exceeded: ${k}`);
 if(m.construction&&constructionCost(m,counts)>m.construction.budget)errors.push('Construction budget exceeded');
 for(let i=0;i<m.cells.length;i++)if(['portal','tunnel'].includes(effective(m,placements,i))&&linkPartner(m,i,placements)<0)errors.push(`Invalid or unpaired ${effective(m,placements,i)} at cell ${i+1}`);
 const boardPairs=pairs(m);
 if(!boardPairs.length)errors.push('Add at least one source/destination pair');
 const routeElements=new Set();
 for(const route of routes){
  if(routeElements.has(route.element))errors.push(`${route.element}: duplicate route`);
  if(!boardPairs.some(p=>p.element===route.element))errors.push(`${route.element}: unexpected route`);
  routeElements.add(route.element);
 }
 for(const p of boardPairs){if(p.source<0||p.destination<0){errors.push(`${p.element}: unmatched endpoints`);continue;}const r=routes.find(r=>r.element===p.element);if(!r){errors.push(`${p.element}: missing route`);continue;}const err=validatePath(m,p.element,r.path,routes.filter(x=>x!==r),placements);if(err)errors.push(`${p.element}: ${err}`);for(let i=0;i<m.cells.length;i++){const c=m.cells[i];if(c.component==='checkpoint'&&['any',p.element].includes(c.props?.element)&&!r.path.includes(i))errors.push(`${p.element}: required checkpoint not visited`);}}
 return errors;}
function score(m,routes,placements={}){const track=routes.reduce((s,r)=>s+r.path.length-1,0),components=Object.values(placements).length,cost=track+components*5;return {track,components,cost};}
/* Multi-chamber bounded search. Each physical source and chamber output
   supplies one route, to any unclaimed endpoint of the matching element.
   All port orientations and power dependencies are checked by checkMulti. */
function solveMulti(m,{limit=120000,maxPairs=16,allowPlacement=true,initialPlacements={}}={}){
 const ps=multiPairs(m);
 if(!ps.length||ps.some(p=>p.source<0||!p.targets.length))return {status:'invalid',message:'Missing or unmatched Confluence endpoints'};
 const expected=new Map();
 for(const p of ps)expected.set(p.element,(expected.get(p.element)||0)+1);
 for(const [element,n] of expected){
  const targets=m.cells.filter(c=>c.node?.role==='destination'&&c.node.element===element).length+
   confluences(m).filter(ch=>ch.inputs.includes(element)).length;
  if(targets!==n)return {status:'invalid',message:displayElement(element)+': '+n+' sources and '+targets+' destinations'};
 }
 if(ps.length>maxPairs)return {status:'unsupported',message:'Maximum '+maxPairs+' route segments for multi-chamber solver'};
 if(m.cells.some(c=>c.component&&!['bridge','metalSpan','intersection','checkpoint','portal','tunnel','gate','confluence'].includes(c.component)))
  return {status:'unsupported',message:'Unsupported advanced fixture'};
 for(let i=0;i<m.cells.length;i++)if(['portal','tunnel'].includes(m.cells[i].component)&&linkPartner(m,i)<0)
  return {status:'invalid',message:'Invalid or unpaired link at cell '+(i+1)};
 let nodes=0,exhausted=false;
 const budget={bridge:allowPlacement?(m.inventory?.bridge||0):0,intersection:allowPlacement?(m.inventory?.intersection||0):0,metalSpan:allowPlacement?(m.inventory?.metalSpan||0):0};
 const distance=(i,d)=>Math.abs(i%m.width-d%m.width)+Math.abs(Math.floor(i/m.width)-Math.floor(d/m.width));
 const ordered=[...ps].sort((a,b)=>{
  const x=m.cells[a.source]?.node?.role==='source'?0:1,y=m.cells[b.source]?.node?.role==='source'?0:1;
  return x-y||Math.min(...a.targets.map(t=>distance(a.source,t)))-Math.min(...b.targets.map(t=>distance(b.source,t)));
 });
 function visitPair(pi,routes,placements){
  if(pi===ordered.length){
   const errors=checkMulti(m,routes,placements);
   return errors.length?null:{routes,placements};
  }
  const p=ordered[pi],usedDest=new Set(routes.map(r=>r.element+'@'+r.path.at(-1)));
  const targets=p.targets.filter(dest=>!usedDest.has(p.element+'@'+dest));
  if(!targets.length)return null;
  const stack=[{path:[p.source],seen:new Set([p.source]),placements}];
  while(stack.length){
   if(++nodes>limit){exhausted=true;return null;}
   const state=stack.pop(),cur=state.path.at(-1);
   if(targets.includes(cur)&&state.path.length>1){
    const problem=validateMultiPath(m,p.element,state.path,routes,state.placements);
    const needed=m.cells.flatMap((c,i)=>c.component==='checkpoint'&&['any',p.element].includes(c.props?.element)?[i]:[]);
    const unique=ordered.filter(q=>q.element===p.element).length===1;
    if(!problem&&(!unique||needed.every(i=>state.seen.has(i)))){
     const found=visitPair(pi+1,[...routes,{element:p.element,path:state.path}],state.placements);
     if(found)return found;
     if(exhausted)return null;
    }
    continue;
   }
   const exit=portalExit(m,state.path,state.placements);
   const ns=(exit===null?routeNeighbors(m,cur,state.placements,p.element):exit<0?[]:[exit]).filter(i=>!state.seen.has(i));
   // Aim for the correct input port, breaking ties in favor of entering
   // the chamber rather than wandering away from an adjacent open port.
   const closest=i=>Math.min(...targets.map(t=>{
    const ch=confluenceAt(m,t);
    const port=ch?confluenceNeighbor(m,t,ch.ports[p.element]):t;
    return distance(i,port)*2+distance(i,t);
   }));
   ns.sort((a,b)=>closest(b)-closest(a));
   for(const i of ns){
    const fromCh=confluenceAt(m,cur),toCh=confluenceAt(m,i);
    if(fromCh&&(p.source!==cur||fromCh.output!==p.element||
       i!==confluenceNeighbor(m,cur,fromCh.ports[p.element])))continue;
    if(toCh&&(!targets.includes(i)||!toCh.inputs.includes(p.element)||
       cur!==confluenceNeighbor(m,i,toCh.ports[p.element])))continue;
    if(!allowedTransition(m,p.element,cur,i,state.placements))continue;
    const c=m.cells[i];
    if(c.node&&!(targets.includes(i)&&c.node.role==='destination'&&c.node.element===p.element))continue;
    let pl=state.placements,comp=effective(m,pl,i),wanted=null;
    const overlaps=routes.filter(r=>r.path.includes(i));
    if(terrainError(m,p.element,i,comp)){
     if(!comp)wanted=spanKinds.find(k=>budget[k]&&canPlace(m,pl,i,k)&&!terrainError(m,p.element,i,k));
     if(!wanted)continue;
    }
    if(comp&&!['bridge','metalSpan','intersection','checkpoint','portal','tunnel','gate','confluence'].includes(comp))continue;
    if(overlaps.length){
     if(comp==='confluence'){
      if(overlaps.some(r=>r.path.at(-1)!==i&&r.path[0]!==i))continue;
     }else{
      if(overlaps.length>1||overlaps.some(r=>r.element===p.element))continue;
      if(spanKinds.includes(comp))continue;
      if(comp!=='intersection')wanted='intersection';
     }
    }
    if(wanted){
     if(!allowPlacement||!canPlace(m,pl,i,wanted))continue;
     if(Object.values(pl).filter(v=>placementKind(v)===wanted).length>=budget[wanted])continue;
     pl={...pl,[i]:wanted};
     if(m.construction&&constructionCost(m,placementCounts(pl))>m.construction.budget)continue;
    }
    const path=[...state.path,i];
    if(overlaps.length&&comp!=='confluence'){
     const r=overlaps[0],j=r.path.indexOf(i);
     if(j===0||j===r.path.length-1||path.length<3)continue;
     if(axis(r.path[j-1],i,m.width)!==axis(i,r.path[j+1],m.width)||
        axis(path.at(-2),i,m.width)===axis(r.path[j-1],i,m.width))continue;
    }
    if(path.length>m.cells.length)continue;
    stack.push({path,seen:new Set([...state.seen,i]),placements:pl});
   }
  }
  return null;
 }
 const found=visitPair(0,[],initialPlacements);
 return found?{status:'solved',...found,nodes,score:score(m,found.routes,found.placements)}:
  {status:exhausted?'inconclusive':'unsolved',nodes,message:exhausted?
   'Search budget reached; solvability unknown':'No solution under supported multi-chamber rules'};
}

/* Bounded search: route first; when water encountered, may consume bridge; when another route is present, may consume intersection.
   Search limits are NOT evidence of unsolvability. */
function solve(m,{limit=120000,maxPairs=8,allowPlacement=true,initialPlacements={}}={}){
 if(hasPhases(m))return solvePhases(m,{limit,allowPlacement});
 if(hasMultiConfluence(m))return solveMulti(m,{limit,maxPairs:Math.max(maxPairs,16),allowPlacement,initialPlacements});
 const ps=pairs(m);if(!ps.length||ps.some(p=>p.source<0||p.destination<0))return {status:'invalid',message:'Missing or unmatched endpoints'};
 if(ps.length>maxPairs)return {status:'unsupported',message:`Maximum ${maxPairs} pairs for prototype solver`};
 if(m.cells.some(c=>c.component&&!['bridge','metalSpan','intersection','checkpoint','portal','tunnel','gate','confluence'].includes(c.component)))return {status:'unsupported',message:'Map contains advanced components not supported by solver'};
 if(m.cells.some(c=>!['land','forest','ice','water','mountain','wall','void','lava','oneway',...newTerrain].includes(c.terrain)))return {status:'unsupported',message:'Unknown terrain'};


 for(let i=0;i<m.cells.length;i++){const c=m.cells[i];if(['portal','tunnel'].includes(c.component)&&linkPartner(m,i)<0)return {status:'invalid',message:`Invalid ${c.component} connection at cell ${i+1}; tunnel ends must align and cross blocked terrain`};}
 let nodes=0,exhausted=false;const budget={bridge:allowPlacement?(m.inventory?.bridge||0):0,intersection:allowPlacement?(m.inventory?.intersection||0):0,metalSpan:allowPlacement?(m.inventory?.metalSpan||0):0};
 const distance=(i,d)=>Math.abs(i%m.width-d%m.width)+Math.abs(Math.floor(i/m.width)-Math.floor(d/m.width));
 const ordered=[...ps].sort((a,b)=>distance(a.source,a.destination)-distance(b.source,b.destination));
 function visitPair(pi,routes,placements){if(pi===ordered.length){const errors=checkAll(m,routes,placements);return errors.length?null:{routes,placements};}
 const p=ordered[pi],stack=[{path:[p.source],seen:new Set([p.source]),placements}];
 while(stack.length){if(++nodes>limit){exhausted=true;return null;}const state=stack.pop(),cur=state.path.at(-1);
 if(cur===p.destination){if(validatePath(m,p.element,state.path,routes,state.placements))continue;const needed=m.cells.map((c,i)=>c.component==='checkpoint'&&['any',p.element].includes(c.props?.element)?i:-1).filter(i=>i>=0);if(needed.some(i=>!state.seen.has(i)))continue;const found=visitPair(pi+1,[...routes,{element:p.element,path:state.path}],state.placements);if(found)return found;if(exhausted)return null;continue;}
 const exit=portalExit(m,state.path,state.placements);
 const ns=(exit===null?routeNeighbors(m,cur,state.placements,p.element):exit<0?[]:[exit]).filter(i=>!state.seen.has(i));ns.sort((a,b)=>distance(b,p.destination)-distance(a,p.destination));
 for(const i of ns){
   const ch=confluence(m);
   if(ch){
    if(cur===ch.index&&p.element===ch.output&&i!==confluenceNeighbor(m,ch.index,ch.ports[ch.output]))continue;
    if(i===ch.index&&(i!==p.destination||!ch.inputs.includes(p.element)||cur!==confluenceNeighbor(m,ch.index,ch.ports[p.element])))continue;
   }
   if(!allowedTransition(m,p.element,cur,i,state.placements))continue;const c=m.cells[i];if(c.node&&!(c.node.element===p.element&&c.node.role==='destination'))continue;let pl=state.placements,comp=effective(m,pl,i);const overlaps=routes.filter(r=>r.path.includes(i));let wanted=null;
 if(terrainError(m,p.element,i,comp)){if(!comp)wanted=spanKinds.find(kind=>budget[kind]&&canPlace(m,pl,i,kind)&&!terrainError(m,p.element,i,kind));if(!wanted)continue;}
 if(comp&&!['bridge','metalSpan','intersection','checkpoint','portal','tunnel','gate','confluence'].includes(comp))continue;
 if(overlaps.length&&comp!=='confluence'){if(overlaps.length>1)continue;if(spanKinds.includes(comp))continue;if(comp!=='intersection')wanted='intersection';}
 if(wanted){if(!allowPlacement||!canPlace(m,pl,i,wanted))continue;const used=Object.values(pl).filter(x=>placementKind(x)===wanted).length;if(used>=budget[wanted])continue;pl={...pl,[i]:wanted};if(m.construction&&constructionCost(m,placementCounts(pl))>m.construction.budget)continue;}
 const path=[...state.path,i];if(overlaps.length&&comp!=='confluence'){const r=overlaps[0],j=r.path.indexOf(i);if(j===0||j===r.path.length-1||path.length<3)continue;const b1=axis(r.path[j-1],i,m.width),b2=axis(i,r.path[j+1],m.width);if(b1!==b2)continue;const a1=axis(path[path.length-2],i,m.width);if(a1===b1)continue; /* require straight exit on next step */}
 if(path.length>m.width*m.height)continue;
 stack.push({path,seen:new Set([...state.seen,i]),placements:pl});
 }
 }
 return null;}
 const result=visitPair(0,[],initialPlacements);return result?{status:'solved',...result,nodes,score:score(m,result.routes,result.placements)}:{status:exhausted?'inconclusive':'unsolved',nodes,message:exhausted?'Search budget reached; result unknown':'No solution under supported rules'};
}
/* Bounded construction search. First try ordinary routes, then try candidate portal/tunnel pairs.
   This is a heuristic, not an exhaustive proof of unsolvability or optimality. */
function solveConstruction(m,{limit=120000,maxPairs=8,maxCandidates=180}={}){
 const direct=solve(m,{limit,maxPairs});
 if(direct.status==='solved'||direct.status==='invalid'||direct.status==='unsupported')return {...direct,constructionAttempts:0};
 const ps=pairs(m);if(!ps.length)return direct;
 const dist=(a,b)=>Math.abs(a%m.width-b%m.width)+Math.abs(Math.floor(a/m.width)-Math.floor(b/m.width));
 const validCells=m.cells.map((_,i)=>i).filter(i=>canPlace(m,{},i,'portal'));
 const kinds=['tunnel','portal'].filter(k=>(m.inventory?.[k]||0)>=2);
 let attempts=0,hitLimit=false;
 for(const kind of kinds){
  for(const pair of ps){
   const starts=[...validCells].sort((a,b)=>dist(a,pair.source)-dist(b,pair.source)||a-b).slice(0,14);
   const ends=[...validCells].sort((a,b)=>dist(a,pair.destination)-dist(b,pair.destination)||a-b).slice(0,14);
   const candidates=[];
   for(const a of starts)for(const b of ends){if(a===b)continue;
    const pl={[a]:{kind,pairId:'AUTO'},[b]:{kind,pairId:'AUTO'}};
    if(linkPartner(m,a,pl)!==b)continue;
    candidates.push({a,b,pl,cost:dist(a,pair.source)+dist(b,pair.destination)});
   }
   candidates.sort((a,b)=>a.cost-b.cost||a.a-b.a||a.b-b.b);
   for(const candidate of candidates){
    if(attempts>=maxCandidates)return {status:'inconclusive',message:'Construction candidate budget reached; solvability unknown',constructionAttempts:attempts};
    attempts++;
    const result=solve(m,{limit:Math.max(10000,Math.floor(limit/4)),maxPairs,initialPlacements:candidate.pl});
    if(result.status==='solved')return {...result,constructionAttempts:attempts,constructionKind:kind};
    if(result.status==='inconclusive')hitLimit=true;
   }
  }
 }
 return {status:hitLimit||direct.status==='inconclusive'?'inconclusive':'unsolved',message:hitLimit?'Some construction searches exceeded their limits':'No solution found within supported construction candidates',constructionAttempts:attempts};
}
const api={hasPhases,phaseView,phasePlateIndex,phaseTriggerRoute,phaseValidation,solvePhases,hasMultiConfluence,confluences,confluenceAt,routeKey,CONFLUENCE_RECIPES,confluenceRecipe,confluencePortSides,displayElement,confluence,confluenceDirections,confluenceNeighbor,confluenceRouteError,portalExit,portalExitMessage,terrainError,spanKinds,windLandings,constructionCost,placementCounts,placementKind,pairIdAt,allowedTransition,constraintError,neighbors,routeNeighbors,linkPartner,pairs,canPlace,effective,validatePath,checkAll,score,solve,solveConstruction,solveFixed:(m,o)=>solve(m,{...o,allowPlacement:false})};root.EFEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
