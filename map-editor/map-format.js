'use strict';
(function(root){
const E=typeof module==='undefined'?root.EFEngine:require('./engine.js');
const TERRAIN=[['land','Land','·'],['mountain','Mountain','▲'],['water','Water','≈'],['wall','Wall','▦'],['forest','Forest','♣'],['lava','Lava','♨'],['ice','Ice','❄'],['void','Void','◼'],['oneway','One-way','➜']];
const COMPONENTS=[['bridge','Bridge','═'],['intersection','Intersection','╋'],['tunnel','Tunnel end','◉'],['portal','Portal','◎'],['junction','Junction','⑂'],['sorter','Sorter','◇'],['converter','Converter','⬡'],['gate','Gate','⊣'],['checkpoint','Checkpoint','⚑'],['remover','Remover','✕'],['booster','Booster','»']];
const ELEMENTS={fire:{name:'Fire',color:'#d55b4e'},water:{name:'Water',color:'#377fd1'},nature:{name:'Nature',color:'#419d66'},electricity:{name:'Electricity',color:'#d5ac29'},arcane:{name:'Arcane',color:'#9368c5'}};
const TIDS=new Set(TERRAIN.map(x=>x[0])),CIDS=new Set(COMPONENTS.map(x=>x[0])),DIRECTIONS=['N','E','S','W'];
const fresh=(w=12,h=12)=>({format:'element-forge-map',schemaVersion:2,name:'Untitled Map',description:'',width:w,height:h,cells:Array.from({length:w*h},()=>({terrain:'land'})),constraints:{},inventory:Object.fromEntries(COMPONENTS.map(([id])=>[id,['bridge','intersection'].includes(id)?1:0]))});
const RULES=['forbidTerrain','forbidComponents','requireComponents'];
const LINKS=['portal','tunnel'];
const PLAYABLE=['bridge','intersection','portal','tunnel','gate','checkpoint'];
const PLACEABLE=['bridge','intersection','portal','tunnel'];
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
  if(props.element!==undefined){
   if(props.element!=='any'&&!Object.hasOwn(ELEMENTS,props.element))fail('invalid checkpoint element.');
   next.props.element=props.element;
  }
 }
 if(version===1&&LINKS.includes(component)&&!next.props?.pairId)next.props={...next.props,pairId:'A'};
 return next;
}

function parseConstruction(source,inventory){
 if(!record(source)||!Number.isSafeInteger(source.budget)||source.budget<0||
    !record(source.prices))throw Error('Invalid construction budget.');
 const prices={};
 for(const [kind,price] of Object.entries(source.prices)){
  if(!['bridge','intersection','tunnel'].includes(kind)||!Number.isInteger(price)||price<1||price>999){
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
 result.name=String(source.name||'Untitled Map').slice(0,80);
 result.description=String(source.description||'').slice(0,500);
 result.cells=Array.from(source.cells,(cell,index)=>parseCell(cell,index,source.schemaVersion));
 result.constraints=parseConstraints(source.constraints);
 for(const kind of CIDS){
  const count=source.inventory?.[kind]??0;
  if(!Number.isInteger(count)||count<0||count>99)throw Error(`Invalid ${kind} inventory.`);
  result.inventory[kind]=count;
 }
 if(source.construction!==undefined)result.construction=parseConstruction(source.construction,result.inventory);
 return result;
}

function structuralErrors(map){
 const issues=[];
 const endpoints=new Map();
 const links=new Map();
 for(const [i,cell] of map.cells.entries()){
  const {node,component,terrain,props}=cell;
  const label=`Cell ${i+1}`;
  if(node){
   if(!endpoints.has(node.element))endpoints.set(node.element,{source:0,destination:0});
   endpoints.get(node.element)[node.role]++;
   if(terrain!=='land')issues.push(`${label}: endpoint must be on land.`);
   if(component)issues.push(`${label}: component and node overlap.`);
  }
  if(component==='bridge'&&terrain==='void')issues.push(`${label}: bridge cannot be placed on void.`);
  if(!LINKS.includes(component))continue;
  if(!props?.pairId){issues.push(`${label}: ${component} needs a connection ID.`);continue;}
  const key=`${component} ${props.pairId}`;
  if(!links.has(key))links.set(key,[]);
  links.get(key).push(i);
 }
 let matched=0;
 for(const [element,{source,destination}] of endpoints){
  if(source!==destination)issues.push(`${ELEMENTS[element].name}: ${source} source(s) vs ${destination} destination(s).`);
  if(source>1||destination>1)issues.push(`${ELEMENTS[element].name}: only one source/destination pair is supported.`);
  if(source===1&&destination===1)matched++;
 }
 if(!matched)issues.push('Add at least one source/destination pair.');
 for(const [key,indices] of links){
  if(indices.length!==2)issues.push(`${key}: expected 2 endpoints, found ${indices.length}.`);
  else if(E.linkPartner(map,indices[0])<0)issues.push(`${key}: tunnel ends must align and cross blocked terrain.`);
 }
 return {issues,matched};
}

function assertPlayable(map){
 const {issues,matched}=structuralErrors(map);
 if(issues.length)throw Error(issues.join(' '));
 if(matched>3)throw Error('Game levels currently support up to three element pairs.');
 for(const [kind,count] of Object.entries(map.inventory)){
  if(count&&!PLACEABLE.includes(kind))throw Error(`Unsupported player inventory: ${kind}.`);
 }
 for(const [i,{component,terrain}] of map.cells.entries()){
  if(!component)continue;
  if(!PLAYABLE.includes(component))throw Error(`Cell ${i+1}: unsupported game component ${component}.`);
  const allowed=component==='bridge'?['water','land','forest','ice','oneway']:['land','forest','ice','oneway'];
  if(!allowed.includes(terrain))throw Error(`Cell ${i+1}: ${component} cannot be used on ${terrain}.`);
 }
}

function createLevel(source){
 const map=parseMap(source);
 assertPlayable(map);
 const result=E.solveConstruction(map);
 if(result.status!=='solved')throw Error(`Could not verify a solution (${result.status}): ${result.message||'unknown result'}`);
 const errors=E.checkAll(map,result.routes,result.placements);
 if(errors.length)throw Error(errors.join(' '));
 return {format:'element-forge-level',schemaVersion:1,rulesVersion:map.construction?2:1,map};
}

function readLevel(source){
 if(!record(source)||source.format!=='element-forge-level'||source.schemaVersion!==1||
    ![1,2].includes(source.rulesVersion)||source.map?.schemaVersion!==2||
    (source.rulesVersion===2)!==(source.map.construction!==undefined))throw Error('Unsupported game level or rules version.');
 const map=parseMap(source.map);
 assertPlayable(map);
 return map;
}

const api={TERRAIN,COMPONENTS,ELEMENTS,DIRECTIONS,fresh,parseConstraints,parseMap,structuralErrors,createLevel,readLevel};
root.EFMap=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
