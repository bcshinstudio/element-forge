'use strict';
(function(root){
const E=typeof module==='undefined'?root.EFEngine:require('./engine.js');
const TERRAIN=[['land','Land','·'],['mountain','Mountain','▲'],['water','Water','≈'],['wall','Wall','▦'],['forest','Forest','♣'],['lava','Lava','♨'],['ice','Ice','❄'],['void','Void','◼'],['oneway','One-way','➜'],['river','Deep river','∿'],['bank','River bank','⇆'],['shallow','Shallow water','≋'],['scree','Scree','⋰'],['heated','Heated ground','▥'],['abrasive','Abrasive ground','▒'],['exposed','Exposed channel','☀'],['covered','Covered channel','☾']];
const COMPONENTS=[['bridge','Bridge','═'],['metalSpan','Metal span','▤'],['intersection','Intersection','╋'],['tunnel','Tunnel end','◉'],['portal','Portal','◎'],['junction','Junction','⑂'],['sorter','Sorter','◇'],['converter','Converter','⬡'],['gate','Gate','⊣'],['checkpoint','Checkpoint','⚑'],['remover','Remover','✕'],['booster','Booster','»'],['confluence','Confluence Chamber','◇'],['phasePlate','Day/Night Pressure Plate','◈']];
const ELEMENTS={fire:{name:'Fire',color:'#d55b4e'},water:{name:'Water',color:'#377fd1'},nature:{name:'Plant',icon:'🌿',symbol:'P',color:'#419d66'},electricity:{name:'Electricity',color:'#d5ac29'},arcane:{name:'Arcane',color:'#9368c5'},wind:{name:'Wind',color:'#7dc8bc'},earth:{name:'Earth',color:'#d8a37d',symbol:'R'},ice:{name:'Ice',color:'#b8eaff',symbol:'I'},metal:{name:'Metal',color:'#c3c9db',symbol:'M'},light:{name:'Light',color:'#fff197',symbol:'L'},shadow:{name:'Shadow',color:'#ba9bf6',symbol:'H'}};
const TIDS=new Set(TERRAIN.map(x=>x[0])),CIDS=new Set(COMPONENTS.map(x=>x[0])),DIRECTIONS=['N','E','S','W'];
const fresh=(w=12,h=12)=>({format:'element-forge-map',schemaVersion:2,name:'Untitled Map',description:'',width:w,height:h,cells:Array.from({length:w*h},()=>({terrain:'land'})),constraints:{},inventory:Object.fromEntries(COMPONENTS.map(([id])=>[id,['bridge','intersection'].includes(id)?1:0]))});
const RULES=['forbidTerrain','forbidComponents','requireComponents'];
const LINKS=['portal','tunnel'];
const PLAYABLE=['bridge','metalSpan','intersection','portal','tunnel','gate','checkpoint','confluence','phasePlate'];
const PLACEABLE=['bridge','metalSpan','intersection','portal','tunnel'];
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function parseConstraints(value){
 const result={};if(value===undefined)return result;
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid constraints.');
 for(const [element,rule] of Object.entries(value)){
  if(!Object.hasOwn(ELEMENTS,element)||!rule||typeof rule!=='object'||Array.isArray(rule))throw Error('Invalid element constraints.');
  result[element]={};
  for(const key of Object.keys(rule))if(!RULES.includes(key))throw Error('Unknown constraint: '+key);
  for(const key of RULES){
   if(rule[key]===undefined)continue;
   if(!Array.isArray(rule[key])||rule[key].length>20||rule[key].some(id=>typeof id!=='string'||!(key==='forbidTerrain'?TIDS:CIDS).has(id)))throw Error('Invalid '+key+' constraint.');
   result[element][key]=[...new Set(rule[key])];
  }
 }return result;
}
function parseArt(value){
 if(!record(value)||typeof value.id!=='string'||!/^[a-z0-9-]{1,128}$/.test(value.id)||
    ![0,90,180,270].includes(value.rotation??0))throw Error('Invalid artwork choice or rotation.');
 return {id:value.id,rotation:value.rotation??0};
}

function parseCell(cell,index,version){
 const fail=message=>{throw Error(`Cell ${index+1}: ${message}`);};
 if(!record(cell)||!TIDS.has(cell.terrain))fail('invalid terrain.');
 const {terrain,component,node,props}=cell;
 const next={terrain};
 if(component!=null){
  if(!CIDS.has(component))fail('unknown component.');
  next.component=component;
 }
 if(node!=null){
  if(!record(node)||!Object.hasOwn(ELEMENTS,node.element)||!['source','destination'].includes(node.role))fail('invalid node.');
  if(component)fail('node and component overlap.');
  next.node={element:node.element,role:node.role};
 }
 if(props!=null){
  if(!record(props))fail('invalid properties.');
  next.props={};
  if(props.direction!==undefined){
   if(!DIRECTIONS.includes(props.direction))fail('invalid direction.');
   if(!['bridge','tunnel','portal','intersection'].includes(component))next.props.direction=props.direction;
  }
  if(props.pairId!==undefined){
   if(typeof props.pairId!=='string'||!/^[a-zA-Z0-9_-]{1,12}$/.test(props.pairId))fail('invalid connection ID.');
   next.props.pairId=props.pairId;
  }
  if(props.phaseShift!==undefined){
   if(props.phaseShift!==true||!['exposed','covered'].includes(terrain)||component||node)fail('phase-shift tiles must be Exposed or Covered terrain without endpoints or fixtures.');
   next.props.phaseShift=true;
  }
  if(props.element!==undefined){
   if(props.element!=='any'&&!Object.hasOwn(ELEMENTS,props.element))fail('invalid checkpoint element.');
   next.props.element=props.element;
  }
  if(props.ports!==undefined){
   if(component!=='confluence'||!E.confluencePortSides(props))fail('invalid Confluence port sides.');
   next.props.ports={...props.ports};
  }
  if(props.recipe!==undefined||props.inputs!==undefined||props.output!==undefined){
   if(component!=='confluence')fail('reaction properties require a Confluence Chamber.');
   const recipe=E.confluenceRecipe(props);
   if(!recipe)fail('invalid Confluence recipe or duplicate element.');
   next.props.recipe=recipe.id;
   if(recipe.id==='custom'){
    next.props.inputs=[...recipe.inputs];
    next.props.output=recipe.output;
   }
  }
 }
 for(const field of ['terrainArt','componentArt']){
  if(cell[field]===undefined)continue;
  try{next[field]=parseArt(cell[field]);}catch(error){fail(error.message);}
 }
 if(version===1&&LINKS.includes(component)&&!next.props?.pairId)next.props={...next.props,pairId:'A'};
 return next;
}

function parseConstruction(source,inventory){
 if(!record(source)||!Number.isSafeInteger(source.budget)||source.budget<0||
    !record(source.prices))throw Error('Invalid construction budget.');
 const prices={};
 for(const [kind,price] of Object.entries(source.prices)){
  if(!['bridge','metalSpan','intersection','tunnel','portal'].includes(kind)||!Number.isInteger(price)||price<1||price>999){
   throw Error('Invalid construction tool price.');
  }
  prices[kind]=price;
 }
 for(const [kind,count] of Object.entries(inventory)){
  if(count&&!Object.hasOwn(prices,kind))throw Error(`Missing construction price for ${kind}.`);
 }
 return {budget:source.budget,prices};
}

function parseMap(source){
 if(!record(source)||source.format!=='element-forge-map'||![1,2].includes(source.schemaVersion)){
  throw Error('Unsupported map format/schema version.');
 }
 const {width,height}=source;
 if(![width,height].every(n=>Number.isInteger(n)&&n>=4&&n<=24)||
    !Array.isArray(source.cells)||source.cells.length!==width*height)throw Error('Invalid dimensions or cell count.');
 if(source.inventory!=null&&!record(source.inventory))throw Error('Invalid inventory.');
 const result=fresh(width,height);
 if([3,4].includes(source.rulesVersion))result.rulesVersion=source.rulesVersion;
 result.name=String(source.name||'Untitled Map').slice(0,80);
 result.description=String(source.description||'').slice(0,500);
 result.cells=Array.from(source.cells,(cell,index)=>parseCell(cell,index,source.schemaVersion));
 if(source.nodeAppearance!==undefined){
  if(!['classic','library','books-only'].includes(source.nodeAppearance))throw Error('Invalid node appearance.');
  result.nodeAppearance=source.nodeAppearance;
 }
 if(source.artPalette!==undefined){
  if(!Number.isInteger(source.artPalette)||source.artPalette<1||source.artPalette>11)throw Error('Invalid chapter palette.');
  result.artPalette=source.artPalette;
 }
 if(source.toolArt!==undefined){
  if(!record(source.toolArt))throw Error('Invalid tool artwork.');
  result.toolArt={};
  for(const [kind,art] of Object.entries(source.toolArt)){
   if(!PLACEABLE.includes(kind))throw Error('Unknown player tool artwork type.');
   result.toolArt[kind]=parseArt(art);
  }
 }
 if(source.phaseRules!==undefined){
  if(!record(source.phaseRules)||source.phaseRules.initial!=='day'||
     Object.keys(source.phaseRules).join(',')!=='initial')throw Error('Invalid phase rules (initial Day only).');
  result.phaseRules={initial:'day'};
 }
 if(!result.phaseRules&&result.cells.some(c=>c.component==='phasePlate'||c.props?.phaseShift))
  throw Error('Enable Day/Night phases before adding a phase plate or shifting channels.');
 if(source.phaseWitness!==undefined){
  if(!result.phaseRules||!record(source.phaseWitness)||
     !record(source.phaseWitness.placements)||!Array.isArray(source.phaseWitness.routes)||
     source.phaseWitness.routes.length<2||source.phaseWitness.routes.length>16)
   throw Error('Invalid authored Day/Night solution proof.');
  const routes=source.phaseWitness.routes.map(route=>{
   if(!record(route)||!Object.hasOwn(ELEMENTS,route.element)||
      !Array.isArray(route.path)||route.path.length<2||route.path.length>width*height*2||
      route.path.some(i=>!Number.isInteger(i)||i<0||i>=width*height)||
      !['day','night'].includes(route.deliveredPhase))
     throw Error('Invalid route in authored phase proof.');
   return {element:route.element,path:[...route.path],deliveredPhase:route.deliveredPhase};
  });
  const placements={};
  for(const [index,value] of Object.entries(source.phaseWitness.placements)){
   const i=Number(index),kind=E.placementKind(value);
   if(!/^\d+$/.test(index)||!Number.isInteger(i)||i<0||i>=width*height||
      !PLACEABLE.includes(kind)||Object.keys(placements).length>width*height)
    throw Error('Invalid construction in authored phase proof.');
   placements[i]=JSON.parse(JSON.stringify(value));
  }
  result.phaseWitness={placements,routes};
 }
 result.constraints=parseConstraints(source.constraints);
 for(const kind of CIDS){
  const count=source.inventory?.[kind]??0;
  if(!Number.isInteger(count)||count<0||count>99)throw Error(`Invalid ${kind} inventory.`);
  result.inventory[kind]=count;
 }
 if(source.construction!==undefined)result.construction=parseConstruction(source.construction,result.inventory);
 return result;
}

function mapFindings(map,includePlayability=true){
 const findings=[];
 const report=(message,indices=[])=>findings.push({message,indices});
 const endpoints=new Map(),links=new Map(),chambers=[],phasePlates=[];
 let shiftingCount=0;
 for(const [i,cell] of map.cells.entries()){
  const {node,component,terrain,props}=cell;
  const label=`Cell ${i+1}`;
   if(component==='confluence')chambers.push(i);
   if(component==='phasePlate')phasePlates.push(i);
   if(props?.phaseShift)shiftingCount++;
  if(node){
   if(!endpoints.has(node.element))endpoints.set(node.element,{source:[],destination:[]});
   endpoints.get(node.element)[node.role].push(i);
   if(terrain!=='land')report(`${label}: endpoints must be on Land.`,[i]);
   if(component)report(`${label}: a fixture overlaps an endpoint.`,[i]);
  }
  if(props?.direction!==undefined&&!DIRECTIONS.includes(props.direction))report(`${label}: invalid direction.`,[i]);
  if(component==='bridge'&&terrain==='void')report(`${label}: Bridge cannot be placed on Void.`,[i]);
  else if(component&&includePlayability){
   const componentLabel=COMPONENTS.find(([id])=>id===component)?.[1]??component;
   const terrainLabel=TERRAIN.find(([id])=>id===terrain)?.[1]??terrain;
   if(!PLAYABLE.includes(component))report(`${label}: ${componentLabel} is an editor-only fixture (unsupported game component ${component}).`,[i]);
   else{
    const ground=['land','forest','ice','oneway','bank','exposed','covered'];
    const allowed=['confluence','phasePlate'].includes(component)?['land']:E.spanKinds.includes(component)?['water','river','shallow',...ground]:
     ['gate','checkpoint'].includes(component)&&map.rulesVersion>=4?
      [...ground,'water','river','shallow','lava','scree','heated','abrasive']:ground;
    if(!allowed.includes(terrain))report(`${label}: ${componentLabel} cannot be used on ${terrainLabel}.`,[i]);
   }
  }
  if(!LINKS.includes(component))continue;
  if(!props?.pairId){report(`${label}: ${component} needs a connection ID.`,[i]);continue;}
  const key=`${component} ${props.pairId}`;
  if(!links.has(key))links.set(key,[]);
  links.get(key).push(i);
 }

 if(map.phaseRules){
  if(map.rulesVersion!==4)report('Day/Night maps require rules version 4.');
  if(phasePlates.length!==1)report('Day/Night maps require exactly one pressure plate.',phasePlates);
  if(!shiftingCount)report('Mark at least one Exposed/Covered tile as phase-shifting.');
  const trigger=phasePlates.length===1?map.cells[phasePlates[0]].props?.element:null;
  if(!trigger||trigger==='any'||!ELEMENTS[trigger])report('Select a triggering element for the phase plate.',phasePlates);
  if(trigger&&!endpoints.get(trigger)?.source?.length&&!E.confluences(map).some(ch=>ch.output===trigger))report('The phase plate needs a matching Source or Confluence output.',phasePlates);
 }
 let matched=0;
 if(chambers.length>1){
  const fixtures=E.confluences(map);
  if(fixtures.length!==chambers.length)report('Every Confluence Chamber requires a valid recipe and direction.',chambers);
  for(const chamber of fixtures){
   for(const element of [...chamber.inputs,chamber.output]){
    const side=chamber.ports[element],neighbor=E.confluenceNeighbor(map,chamber.index,side);
    if(neighbor<0){
     report('Confluence at cell '+(chamber.index+1)+': '+ELEMENTS[element].name+' port ('+side+') must be within the board.',[chamber.index]);
     continue;
    }
    const adjacent=map.cells[neighbor];
    if(E.terrainError(map,element,neighbor,adjacent.component)||
       (adjacent.node&&adjacent.node.element!==element)){
     report('Confluence at cell '+(chamber.index+1)+': '+ELEMENTS[element].name+' port ('+side+') is blocked.',[chamber.index,neighbor]);
    }
   }
  }
  const sourceCount=Object.fromEntries(Object.keys(ELEMENTS).map(e=>[e,0]));
  const targetCount=Object.fromEntries(Object.keys(ELEMENTS).map(e=>[e,0]));
  for(const [element,{source,destination}] of endpoints){
   sourceCount[element]+=source.length;targetCount[element]+=destination.length;
  }
  for(const chamber of fixtures){
   sourceCount[chamber.output]++;
   for(const element of chamber.inputs)targetCount[element]++;
  }
  for(const element of Object.keys(ELEMENTS)){
   const sources=sourceCount[element],destinations=targetCount[element];
   if(sources!==destinations)report(
    ELEMENTS[element].name+': '+sources+' available source route(s) vs '+destinations+
    ' required destination(s). Add a separate Source or upstream chamber for every additional route.',
    [...(endpoints.get(element)?.source??[]),...(endpoints.get(element)?.destination??[])]);
   matched+=sources;
  }
  if(!matched)report('Add at least one route Source.');
 }else{
 const chamber=chambers.length===1?E.confluence(map):null;
 if(chambers.length===1&&!chamber)report('Confluence Chamber needs a valid reaction recipe.',chambers);
 if(chamber){
  for(const element of [...chamber.inputs,chamber.output]){
   const nodes=endpoints.get(element)??{source:[],destination:[]};
   const sources=nodes.source.length,destinations=nodes.destination.length;
   const isOutput=element===chamber.output;
   const valid=isOutput?sources===0&&destinations===1:sources===1&&destinations===0;
   if(!valid)report(isOutput?
    `Confluence ${ELEMENTS[element].name} needs one destination and no separate ${ELEMENTS[element].name} source.`:
    `Confluence ${ELEMENTS[element].name} needs one source and no separate destination.`,
    [...nodes.source,...nodes.destination,chamber.index]);
   else matched++;
   const side=chamber.ports[element],neighbor=E.confluenceNeighbor(map,chamber.index,side);
   if(neighbor<0){report(`Confluence ${ELEMENTS[element].name} port (${side}) must face an in-bounds tile.`,[chamber.index]);continue;}
   const adjoining=map.cells[neighbor];
   if(E.terrainError(map,element,neighbor,adjoining.component)||
      adjoining.node&&adjoining.node.element!==element)
    report(`Confluence ${ELEMENTS[element].name} port (${side}) is blocked.`,[chamber.index,neighbor]);
  }
 }
 for(const [element,{source,destination}] of endpoints){
  if(chamber&&[...chamber.inputs,chamber.output].includes(element))continue;
  const indices=[...source,...destination];
  const name=ELEMENTS[element].name;
  if(source.length!==destination.length)report(`${name}: ${source.length} source(s) vs ${destination.length} inlet(s).`,indices);
  if(source.length>1||destination.length>1)report(`${name}: only one source/inlet pair is supported.`,indices);
  if(source.length===1&&destination.length===1)matched++;
 }
 if(!matched)report('Add at least one source/inlet pair.');
 }
 for(const [key,indices] of links){
  if(indices.length!==2)report(`${key}: expected 2 endpoints, found ${indices.length}.`,indices);
  else if(E.linkPartner(map,indices[0])<0)report(`${key}: tunnel ends must align and cross blocked terrain.`,indices);
 }
 if(includePlayability){
  const routeLimit=chambers.length>1||map.phaseRules?16:map.rulesVersion===4&&map.nodeAppearance==='library'?11:8;
  if(matched>routeLimit)report('Game levels currently support up to '+routeLimit+' route segments.');
  for(const [kind,count] of Object.entries(map.inventory)){
   if(count&&!PLACEABLE.includes(kind))report(`Unsupported player inventory: ${kind}.`);
  }
 }
 return {findings,matched};
}

function structuralErrors(map){
 const {findings,matched}=mapFindings(map,false);
 return {issues:findings.map(finding=>finding.message),matched};
}

function assertPlayable(map){
 const issues=mapFindings(map).findings;
 if(issues.length)throw Error(issues.map(issue=>issue.message).join(' '));
}

function asLevel(source){
 const map=parseMap(source);
 assertPlayable(map);
 return {format:'element-forge-level',schemaVersion:1,rulesVersion:map.rulesVersion??(map.construction?2:1),map};
}

function createLevel(source){
 const level=asLevel(source);
 const {map}=level;
 const result=E.solveConstruction(map);
 if(result.status!=='solved')throw Error(`Could not verify a solution (${result.status}): ${result.message||'unknown result'}`);
 const errors=E.checkAll(map,result.routes,result.placements);
 if(errors.length)throw Error(errors.join(' '));
 return level;
}

function readLevel(source){
 if(!record(source)||source.format!=='element-forge-level'||source.schemaVersion!==1||
    ![1,2,3,4].includes(source.rulesVersion)||source.map?.schemaVersion!==2||
    (source.rulesVersion<3&&(source.rulesVersion===2)!==(source.map.construction!==undefined)))throw Error('Unsupported game level or rules version.');
 const map=parseMap({...source.map,rulesVersion:source.rulesVersion});
 assertPlayable(map);
 return map;
}

const api={TERRAIN,COMPONENTS,ELEMENTS,DIRECTIONS,fresh,parseConstraints,parseMap,structuralErrors,mapFindings,createLevel,readLevel,asLevel};
root.EFMap=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
