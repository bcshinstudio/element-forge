'use strict';
(function(root){
 const E=typeof module==='undefined'?root.EFEngine:require('../map-editor/engine.js');
 const F=typeof module==='undefined'?root.EFMap:require('../map-editor/map-format.js');
 const copy=value=>JSON.parse(JSON.stringify(value));
 const ok=()=>({ok:true});
 const fail=message=>({ok:false,message});

 function createSession(level){
  const map=F.readLevel(level);
  const state={phase:'inspect',loadout:{},placements:{},routes:[],drafts:{},active:null};
  let history=[];
  const onboard=index=>Number.isInteger(index)&&index>=0&&index<map.cells.length;
  const remember=()=>{history.push(copy({placements:state.placements,routes:state.routes,drafts:state.drafts,active:state.active?.element}));};
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
   if(state.active){
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
   remember();
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

  function placeTunnel(first,second){
   if(state.phase!=='build')return fail('Start building first.');
   if(!onboard(first)||!onboard(second)||first===second||
      !E.canPlace(map,state.placements,first,'tunnel')||!E.canPlace(map,state.placements,second,'tunnel')){
    return fail('Choose two different open tiles for the tunnel openings.');
   }
   if((E.placementCounts(state.placements).tunnel||0)+2>(state.loadout.tunnel||0))return fail('No tunnel pair remaining.');
   const used=new Set(map.cells.map((_,i)=>E.pairIdAt(map,state.placements,i)).filter(Boolean));
   let number=1;
   while(used.has('T'+number))number++;
   const opening={kind:'tunnel',pairId:'T'+number};
   const placements={...state.placements,[first]:opening,[second]:opening};
   if(E.linkPartner(map,first,placements)!==second){
    return fail('Align the openings in one row or column with blocked terrain between them.');
   }
   remember();
   state.placements=placements;
   return ok();
  }

  function route(index){
   if(state.phase!=='build'||!onboard(index))return fail('Choose an available board tile.');
   const cell=map.cells[index];
   if(state.active?.path.at(-2)===index){state.active.path.pop();return ok();}
   const existing=Object.values(state.drafts).find(draft=>draft.path.at(-1)===index);
   if(existing){state.active=existing;return ok();}
   if(cell.node?.role==='source'){
    const element=cell.node.element;
    state.active=state.drafts[element]??{element,path:[index]};
    state.drafts[element]=state.active;
    return ok();
   }
   if(!state.active)return fail('Start at an element source.');
   const {element,path}=state.active;
   const next=[...path,index];
   const complete=cell.node?.role==='destination'&&cell.node.element===element;
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

  function verify(){
   if(state.phase!=='build'||Object.keys(state.drafts).length)return fail('Finish or undo your current route before testing.');
   const errors=E.checkAll(activeMap(),state.routes,state.placements);
   if(errors.length)return fail(errors.join('. '));
   state.phase='complete';
   return {ok:true,track:E.score(map,state.routes,state.placements).track,
    spend:map.construction?E.constructionCost(map,E.placementCounts(state.placements)):null};
  }

  return {map,state,start,restart,undo,place,placeTunnel,remove,route,verify};
 }

 const api={createSession};
 root.EFSession=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
