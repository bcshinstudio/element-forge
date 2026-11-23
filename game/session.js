'use strict';
(function(root){
 const E=typeof module==='undefined'?root.EFEngine:require('../map-editor/engine.js');
 const F=typeof module==='undefined'?root.EFMap:require('../map-editor/map-format.js');
 const copy=value=>JSON.parse(JSON.stringify(value));
 const ok=()=>({ok:true});
 const fail=message=>({ok:false,message});

 function score(map,routes,placements){
  const tiles=new Set(routes.flatMap(route=>route.path)).size;
  const available=map.width*map.height;
  const spend=map.construction?E.constructionCost(map,E.placementCounts(placements)):null;
  const unspent=spend===null?0:map.construction.budget-spend;
  return {tiles,available,spend,unspent,points:Math.max(0,available-2*tiles+10*unspent)};
 }

 function createSession(level){
  const map=F.readLevel(level);
  const state={phase:'inspect',loadout:{},placements:{},routes:[],drafts:{},active:null};
  let history=[];
  const onboard=index=>Number.isInteger(index)&&index>=0&&index<map.cells.length;
  const remember=(toolChange=false)=>{history.push(copy({toolChange,placements:state.placements,routes:state.routes,drafts:state.drafts,active:state.active?.element}));};
  const activeMap=()=>({...map,inventory:state.loadout});

  function start(selection){
   if(state.phase!=='inspect')return fail('Return to planning before changing tools.');
   const selected=map.construction?selection??{}:map.inventory;
   if(typeof selected!=='object'||Array.isArray(selected))return fail('Choose valid tool counts.');
   for(const [kind,count] of Object.entries(selected)){
    if(!Object.hasOwn(map.inventory,kind)||!Number.isInteger(count)||count<0||count>map.inventory[kind]){
     return fail('Tool count exceeds availability.');
    }
   }
   if(map.construction&&E.constructionCost(map,selected)>map.construction.budget)return fail('Your loadout exceeds the budget.');
   state.loadout={...selected};
   state.phase='build';
   return ok();
  }

  function restart(replan=false){
   state.placements={};
   state.routes=[];
   state.active=null;
   history=[];
   state.drafts={};
   if(replan)state.phase='inspect';
   else if(state.phase!=='inspect')state.phase='build';
  }

  function undo(){
   if(state.phase!=='build')return false;
   if(state.active&&!history.at(-1)?.toolChange&&!history.at(-1)?.routes.some(route=>route.element===state.active.element)){
    delete state.drafts[state.active.element];
    state.active=null;
    return true;
   }
   const previous=history.pop();
   if(!previous)return false;
   state.placements=previous.placements;
   state.routes=previous.routes;
   state.drafts=previous.drafts;
   state.active=state.drafts[previous.active]??null;
   return true;
  }

  function place(index,kind,pairId='A'){
   if(state.phase!=='build')return fail('Start building first.');
   if(!onboard(index)||!E.canPlace(map,state.placements,index,kind))return fail('This tool cannot be placed here.');
   if((E.placementCounts(state.placements)[kind]||0)>=(state.loadout[kind]||0))return fail('No '+kind+' remaining.');
   if(['portal','tunnel'].includes(kind)&&!/^[\w-]{1,12}$/.test(pairId))return fail('Use a link ID of 1–12 letters, digits, underscores, or hyphens.');
   const linked=['portal','tunnel'].includes(kind);
   const value=linked?{kind,pairId}:kind;
   if(linked){
    const matching=map.cells.map((_,i)=>i).filter(i=>E.effective(map,state.placements,i)===kind&&
     E.pairIdAt(map,state.placements,i)===pairId);
    if(matching.length>=2)return fail('This link ID already has two ends. Choose a new ID.');
    if(kind==='tunnel'&&matching.length===1&&E.linkPartner(map,index,{...state.placements,[index]:value})<0){
     return fail('Align the tunnel ends in one row or column with blocked terrain between them.');
    }
   }
   remember();
   state.placements[index]=value;
   return ok();
  }

  function remove(index){
   if(state.phase!=='build')return fail('Start building first.');
   if(!onboard(index)||!Object.hasOwn(state.placements,index))return fail('Choose a tool you placed.');
   remember(true);
   const linked=E.linkPartner(map,index,state.placements);
   const tiles=linked<0?[index]:[index,linked];
   for(const i of tiles)delete state.placements[i];
   const affected=route=>route.path.some(i=>tiles.includes(i));
   state.routes=state.routes.filter(route=>!affected(route));
   for(const [element,draft] of Object.entries(state.drafts)){
    if(affected(draft))delete state.drafts[element];
   }
   if(state.active&&!state.drafts[state.active.element])state.active=null;
   return ok();
  }

  function placeLink(first,second,kind){
   if(state.phase!=='build')return fail('Start building first.');
   if(!onboard(first)||!onboard(second)||first===second||
      !E.canPlace(map,state.placements,first,kind)||!E.canPlace(map,state.placements,second,kind)){
    return fail('Choose two different open tiles for the '+kind+' openings.');
   }
   if((E.placementCounts(state.placements)[kind]||0)+2>(state.loadout[kind]||0))return fail('No '+kind+' pair remaining.');
   if([...state.routes,...Object.values(state.drafts)].some(({path})=>path.includes(first)||path.includes(second))){
    return fail('Choose openings without an existing route.');
   }
   const used=new Set(map.cells.map((_,i)=>E.pairIdAt(map,state.placements,i)).filter(Boolean));
   const prefix=kind==='tunnel'?'T':'P';
   let number=1;
   while(used.has(prefix+number))number++;
   const opening={kind,pairId:prefix+number};
   const placements={...state.placements,[first]:opening,[second]:opening};
   if(E.linkPartner(map,first,placements)!==second){
    return fail('Place the openings directly against opposite ends of a continuous ridge.');
   }
   remember();
   state.placements=placements;
   return ok();
  }

  const placeTunnel=(first,second)=>placeLink(first,second,'tunnel');
  const placePortal=(first,second)=>placeLink(first,second,'portal');

  function route(index,reopen=false){
   if(state.phase!=='build'||!onboard(index))return fail('Choose an available board tile.');
   const cell=map.cells[index];
   if(state.active?.path.at(-2)===index){state.active.path.pop();return ok();}
   if(state.active){
    const {path}=state.active;
    const exit=path.at(-1),entry=path.at(-2);
    if(path.at(-3)===index&&E.effective(map,state.placements,exit)==='portal'&&E.linkPartner(map,exit,state.placements)===entry){
     path.splice(-2);
     return ok();
    }
   }
   const existing=Object.values(state.drafts).find(draft=>draft.path.at(-1)===index);
   if(existing&&!(state.active&&cell.component==='confluence'&&['water','earth'].includes(state.active.element))){state.active=existing;return ok();}
   if(cell.node?.role==='source'||(cell.component==='confluence'&&!state.active)){
    const element=cell.component==='confluence'?'nature':cell.node.element;
    if(state.routes.some(route=>route.element===element)){
     remember();
     state.routes=state.routes.filter(route=>route.element!==element);
    }
    state.active=state.drafts[element]??{element,path:[index]};
    state.drafts[element]=state.active;
    return ok();
   }
   if((reopen||!state.active)&&cell.node?.role==='destination'){
    const completed=state.routes.find(route=>route.path.at(-1)===index);
    if(completed){
     remember();
     state.routes=state.routes.filter(route=>route!==completed);
     state.drafts[completed.element]=completed;
     state.active=completed;
     return ok();
    }
   }
   if(reopen){
    const pending=Object.values(state.drafts).find(({path})=>E.portalExit(map,path,state.placements)===index);
    if(pending)state.active=pending;
   }
   if(!state.active)return fail('Start at an element source.');
   const {element,path}=state.active;
   const next=[...path,index];
   const complete=next.length>1&&E.pairs(map).some(pair=>pair.element===element&&pair.destination===index);
   const reserved=state.routes.filter(route=>route.element!==element);
   const error=E.validatePath(map,element,next,reserved,state.placements,!complete);
   if(error)return fail(error);
   if(complete){
    delete state.drafts[element];
    state.active=null;
    remember();
    state.routes=state.routes.filter(route=>route.element!==element);
    state.routes.push({element,path:next});
   }else state.active.path=next;
   return ok();
  }

  function evaluate(){
   if(state.phase==='inspect'||Object.keys(state.drafts).length)return fail('Finish or undo your current route before testing.');
   const errors=E.checkAll(activeMap(),state.routes,state.placements);
   if(errors.length)return fail(errors.join('. '));
   return {ok:true,track:E.score(map,state.routes,state.placements).track,...score(map,state.routes,state.placements)};
  }

  function verify(){
   if(state.phase!=='build')return fail('Start building first.');
   const result=evaluate();
   if(result.ok)state.phase='complete';
   return result;
  }

  function snapshot(){
   return copy({version:1,phase:state.phase,loadout:state.loadout,placements:state.placements,
    routes:state.routes,drafts:state.drafts,active:state.active?.element});
  }

  function restore(saved){
   if(saved?.version!==1||!['inspect','build','complete'].includes(saved.phase))return false;
   if(saved.phase==='inspect'){
    restart(true);
    state.loadout={};
    if(!start(saved.loadout).ok)return false;
    restart(true);
    return true;
   }
   const previous=snapshot();
   restart(true);
   try{
    if(!start(saved.loadout).ok)throw Error('Invalid loadout');
    const counts=E.placementCounts(saved.placements);
    if(Object.entries(counts).some(([kind,count])=>count>(state.loadout[kind]||0)))throw Error('Invalid inventory');
    for(const [index,value] of Object.entries(saved.placements)){
     const kind=E.placementKind(value),i=Number(index);
     if(!E.canPlace(map,{},i,kind))throw Error('Invalid placement');
     if(['tunnel','portal'].includes(kind)){
      if(!/^[\w-]{1,12}$/.test(value.pairId||''))throw Error('Invalid link');
      const partner=E.linkPartner(map,i,saved.placements);
      const ends=Object.values(saved.placements).filter(other=>other.kind===kind&&other.pairId===value.pairId);
      if(partner<0&&!(kind==='portal'&&ends.length===1))throw Error('Invalid paired tool');
     }
    }
    const used=new Set();
    const canKeep=route=>saved.phase==='complete'||E.validatePath(map,route.element,route.path,[],saved.placements,true)!==E.portalExitMessage;
    const routes=saved.routes.filter(route=>!Object.hasOwn(saved.drafts,route.element)&&canKeep(route));
    const drafts=Object.fromEntries(Object.entries(saved.drafts).filter(([,route])=>canKeep(route)));
    for(const route of routes){
     if(used.has(route.element)||E.validatePath(map,route.element,route.path,routes,saved.placements))
      throw Error('Invalid route');
     used.add(route.element);
    }
    for(const [element,draft] of Object.entries(drafts)){
     if(element!==draft.element||E.validatePath(map,element,draft.path,routes,saved.placements,true))
      throw Error('Invalid draft');
    }
    const restored=copy({...saved,routes,drafts});
    Object.assign(state,{loadout:restored.loadout,placements:restored.placements,routes:restored.routes,
     drafts:restored.drafts,active:restored.drafts[restored.active]||null});
    if(saved.phase==='complete'&&!verify().ok)throw Error('Invalid clear');
    return true;
   }catch{
    restart(true);
    if(previous.phase!=='inspect')restore(previous);
    return false;
   }
  }

  return {map,state,start,restart,undo,place,placeTunnel,placePortal,remove,route,evaluate,verify,snapshot,restore};
 }

 const api={createSession,score};
 root.EFSession=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
