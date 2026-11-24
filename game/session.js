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
  const multi=E.hasMultiConfluence(map);
  const shifting=E.hasPhases(map);
  const garden=map.nodeAppearance==='garden'&&map.name==='The Garden of Forgotten Wonders';
  const routeId=r=>E.routeKey(map,r.element,r.path[0]);
  const state={phase:'inspect',dayPhase:map.phaseRules?.initial??null,loadout:{},placements:{},routes:[],drafts:{},active:null};
  let history=[];
  const onboard=index=>Number.isInteger(index)&&index>=0&&index<map.cells.length;
  const remember=(toolChange=false)=>{history.push(copy({toolChange,dayPhase:state.dayPhase,placements:state.placements,routes:state.routes,drafts:state.drafts,active:state.active?(multi?state.active.id:state.active.element):null}));};
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
   state.dayPhase=map.phaseRules?.initial??null;
   if(replan)state.phase='inspect';
   else if(state.phase!=='inspect')state.phase='build';
  }

  function undo(){
   if(state.phase!=='build')return false;
   if(state.active&&!history.at(-1)?.toolChange&&!history.at(-1)?.routes.some(r=>routeId(r)===(multi?state.active.id:state.active.element))){
    delete state.drafts[multi?state.active.id:state.active.element];
    state.active=null;
    return true;
   }
   const previous=history.at(-1);
   if(!previous)return false;
   if(garden&&state.routes.some(r=>!previous.routes.some(p=>routeId(p)===routeId(r))))return false;
   history.pop();
   state.placements=previous.placements;
   state.dayPhase=previous.dayPhase;
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
   const linked=E.linkPartner(map,index,state.placements);
   const tiles=linked<0?[index]:[index,linked];
   if(garden&&state.routes.some(r=>r.path.some(i=>tiles.includes(i))))return fail('A delivered current cannot be changed. Restart to reset the garden.');
   remember(true);
   for(const i of tiles)delete state.placements[i];
   const affected=route=>route.path.some(i=>tiles.includes(i));
   const removingTrigger=shifting&&state.routes.some(r=>affected(r)&&E.phaseTriggerRoute(map,r));
   state.routes=state.routes.filter(route=>!affected(route)&&!(removingTrigger&&route.deliveredPhase==='night'));
   if(shifting)state.dayPhase=state.routes.some(r=>E.phaseTriggerRoute(map,r))?'night':'day';
   for(const [element,draft] of Object.entries(state.drafts)){
    if(affected(draft))delete state.drafts[element];
   }
   if(state.active&&!state.drafts[multi?state.active.id:state.active.element])state.active=null;
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

  function routeMulti(index,reopen=false){
   const cell=map.cells[index],ch=E.confluenceAt(map,index);
   const source=cell.node?.role==='source'?cell.node.element:ch?.output;
   if(state.active?.path.at(-2)===index){state.active.path.pop();return ok();}
   if(state.active){
    const {path}=state.active,exit=path.at(-1),entry=path.at(-2);
    if(path.at(-3)===index&&E.effective(map,state.placements,exit)==='portal'&&
       E.linkPartner(map,exit,state.placements)===entry){path.splice(-2);return ok();}
   }
   const existing=Object.values(state.drafts).find(d=>d.path.at(-1)===index);
   if(existing&&!(state.active&&ch&&ch.inputs.includes(state.active.element))){
    state.active=existing;return ok();
   }
   if(source&&(!state.active||cell.node?.role==='source')){
    if(shifting&&ch&&ch.output===source&&!ch.inputs.every(el=>state.routes.some(r=>r.element===el&&r.path.at(-1)===ch.index)))
     return fail('Complete both Confluence inputs before routing its output.');
    const id=E.routeKey(map,source,index),completed=state.routes.find(r=>routeId(r)===id);
    if(completed){
     if(shifting&&E.phaseTriggerRoute(map,completed)&&state.routes.some(r=>r.deliveredPhase==='night'))
      return fail('Undo Night deliveries before changing the route that activated Night.');
     remember();state.routes=state.routes.filter(r=>r!==completed);
     if(shifting)state.dayPhase=state.routes.some(r=>E.phaseTriggerRoute(map,r))?'night':'day';
    }
    state.active=state.drafts[id]??{id,element:source,path:[index]};
    state.drafts[id]=state.active;
    return ok();
   }
   if((reopen||!state.active)&&!ch){
    const completed=state.routes.find(r=>r.path.at(-1)===index);
    if(completed){
     if(shifting&&E.phaseTriggerRoute(map,completed)&&state.routes.some(r=>r.deliveredPhase==='night'))
      return fail('Undo Night deliveries before changing the route that activated Night.');
     remember();state.routes=state.routes.filter(r=>r!==completed);
     if(shifting)state.dayPhase=state.routes.some(r=>E.phaseTriggerRoute(map,r))?'night':'day';
     const id=routeId(completed);
     state.drafts[id]={...completed,id};state.active=state.drafts[id];return ok();
    }
   }
   if(reopen){
    const pending=Object.values(state.drafts).find(({path})=>E.portalExit(map,path,state.placements)===index);
    if(pending)state.active=pending;
   }
   if(!state.active)return fail('Start at an element source or chamber output.');
   const {element,path,id}=state.active,next=[...path,index];
   const segment=E.pairs(map).find(p=>p.element===element&&p.source===path[0]);
   const complete=next.length>1&&segment?.targets?.includes(index);
   const problem=E.validatePath(shifting?E.phaseView(map,state.dayPhase):map,element,next,
    shifting?E.phasePrior(map,state.routes,state.dayPhase):state.routes,state.placements,!complete);
   if(problem)return fail(problem);
   if(complete){
    remember();
    delete state.drafts[id];state.active=null;
    state.routes.push(shifting?{element,path:next,deliveredPhase:state.dayPhase}:{element,path:next});
    if(shifting&&E.phaseTriggerRoute(map,{element,path:next}))state.dayPhase='night';
   }else state.active.path=next;
   return ok();
  }

  function route(index,reopen=false){
   if(multi){
    if(state.phase!=='build'||!onboard(index))return fail('Choose an available board tile.');
    return routeMulti(index,reopen);
   }
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
   if(existing&&!(state.active&&cell.component==='confluence'&&E.confluence(map)?.inputs.includes(state.active.element))){state.active=existing;return ok();}
   if(cell.node?.role==='source'||(cell.component==='confluence'&&!state.active)){
    const element=cell.component==='confluence'?E.confluence(map)?.output:cell.node.element;
    if(shifting&&cell.component==='confluence'){
     const ch=E.confluence(map);
     if(ch&&!ch.inputs.every(el=>state.routes.some(r=>r.element===el&&r.path.at(-1)===ch.index)))
      return fail('Complete both Confluence inputs before routing its output.');
    }
    if(state.routes.some(route=>route.element===element)){
     if(garden)return fail('This current has already been delivered.');
     if(shifting&&element===map.cells[E.phasePlateIndex(map)]?.props?.element&&
        state.routes.some(r=>r.deliveredPhase==='night'))
      return fail('Undo Night deliveries before changing the route that activated Night.');
     remember();
     state.routes=state.routes.filter(route=>route.element!==element);
     if(shifting)state.dayPhase=state.routes.some(r=>E.phaseTriggerRoute(map,r))?'night':'day';
    }
    state.active=state.drafts[element]??{element,path:[index]};
    state.drafts[element]=state.active;
    return ok();
   }
   if((reopen||!state.active)&&cell.node?.role==='destination'){
    const completed=state.routes.find(route=>route.path.at(-1)===index);
    if(completed){
     if(garden)return fail('This current has already been delivered.');
     if(shifting&&E.phaseTriggerRoute(map,completed)&&state.routes.some(r=>r.deliveredPhase==='night'))
      return fail('Undo Night deliveries before reopening the Day trigger route.');
     remember();
     state.routes=state.routes.filter(route=>route!==completed);
     if(shifting)state.dayPhase=state.routes.some(r=>E.phaseTriggerRoute(map,r))?'night':'day';
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
   const reserved=shifting?E.phasePrior(map,state.routes.filter(route=>route.element!==element),state.dayPhase):
    state.routes.filter(route=>route.element!==element);
   const error=E.validatePath(shifting?E.phaseView(map,state.dayPhase):map,element,next,reserved,state.placements,!complete);
   if(error)return fail(error);
   if(complete){
    // The snapshot must precede the switch, so Undo restores Day and the route.
    if(shifting)remember();
    delete state.drafts[element];
    state.active=null;
    if(!shifting)remember();
    state.routes=state.routes.filter(route=>route.element!==element);
    state.routes.push(shifting?{element,path:next,deliveredPhase:state.dayPhase}:{element,path:next});
    if(shifting&&E.phaseTriggerRoute(map,{element,path:next}))state.dayPhase='night';
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
   return copy({version:1,phase:state.phase,...(shifting?{dayPhase:state.dayPhase}:{}),loadout:state.loadout,placements:state.placements,
    routes:state.routes,drafts:state.drafts,active:state.active?(multi?state.active.id:state.active.element):null});
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
    const routes=saved.routes.filter(route=>!Object.hasOwn(saved.drafts,multi?routeId(route):route.element)&&canKeep(route));
    const drafts=Object.fromEntries(Object.entries(saved.drafts).filter(([,route])=>canKeep(route)));
    if(shifting&&E.phaseValidation(map,routes,saved.placements,false).length)throw Error('Invalid phase route history');
    if(shifting&&saved.dayPhase!==(routes.some(r=>E.phaseTriggerRoute(map,r))?'night':'day'))throw Error('Mismatched saved Day/Night state');
    for(const route of routes){
     if(used.has(multi?routeId(route):route.element)||(!shifting&&E.validatePath(map,route.element,route.path,routes.filter(r=>r!==route),saved.placements)))
      throw Error('Invalid route');
     used.add(multi?routeId(route):route.element);
    }
    for(const [element,draft] of Object.entries(drafts)){
     if(element!==(multi?routeId(draft):draft.element)||E.validatePath(shifting?E.phaseView(map,saved.dayPhase):map,draft.element,draft.path,shifting?E.phasePrior(map,routes,saved.dayPhase):routes,saved.placements,true))
      throw Error('Invalid draft');
    }
    if(multi){
     const targets=new Set();
     for(const route of routes){
      const key=route.element+'@'+route.path.at(-1);
      if(targets.has(key))throw Error('Duplicate route destination');
      targets.add(key);
     }
    }
    const restored=copy({...saved,routes,drafts});
    Object.assign(state,{dayPhase:shifting?restored.dayPhase:null,loadout:restored.loadout,placements:restored.placements,routes:restored.routes,
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
