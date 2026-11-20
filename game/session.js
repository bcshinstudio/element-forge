'use strict';
(function(root){
 const E=typeof module==='undefined'?root.EFEngine:require('../map-editor/engine.js');
 const F=typeof module==='undefined'?root.EFMap:require('../map-editor/map-format.js');
 const copy=value=>JSON.parse(JSON.stringify(value));
 const ok=()=>({ok:true});
 const fail=message=>({ok:false,message});

 function createSession(level){
  const map=F.readLevel(level);
  const state={phase:'inspect',loadout:{},placements:{},routes:[],active:null};
  let history=[],beforeRoute=null;
  const onboard=index=>Number.isInteger(index)&&index>=0&&index<map.cells.length;
  const remember=()=>{history.push(copy({placements:state.placements,routes:state.routes}));};
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
   beforeRoute=null;
   if(replan)state.phase='inspect';
   else if(state.phase!=='inspect')state.phase='build';
  }

  function undo(){
   if(state.phase!=='build')return false;
   const previous=state.active?beforeRoute:history.pop();
   if(!previous)return false;
   state.placements=previous.placements;
   state.routes=previous.routes;
   state.active=null;
   beforeRoute=null;
   return true;
  }

  function place(index,kind,pairId='A'){
   if(state.phase!=='build'||state.active)return fail('Finish or undo your current route first.');
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
   if(state.phase!=='build'||state.active)return fail('Finish or undo your current route first.');
   if(!onboard(index)||!Object.hasOwn(state.placements,index))return fail('Choose a tool you placed.');
   remember();
   const placement=state.placements[index];
   const linked=E.linkPartner(map,index,state.placements);
   delete state.placements[index];
   // A route that used an endpoint of the modified link must be redrawn.
   state.routes=state.routes.filter(route=>!route.path.includes(index)&&
    (linked<0||typeof placement==='string'||!route.path.includes(linked)));
   return ok();
  }

  function route(index){
   if(state.phase!=='build'||!onboard(index))return fail('Choose an available board tile.');
   const cell=map.cells[index];
   if(!state.active){
    if(cell.node?.role!=='source')return fail('Start at an element source.');
    beforeRoute=copy({placements:state.placements,routes:state.routes});
    state.routes=state.routes.filter(r=>r.element!==cell.node.element);
    state.active={element:cell.node.element,path:[index]};
    return ok();
   }
   const {element,path}=state.active;
   if(path.at(-1)===index)return ok();
   if(path.at(-2)===index){path.pop();return ok();}
   const next=[...path,index];
   const complete=cell.node?.role==='destination'&&cell.node.element===element;
   const error=E.validatePath(map,element,next,state.routes,state.placements,!complete);
   if(error)return fail(error);
   if(complete){
    history.push(beforeRoute);
    beforeRoute=null;
    state.routes.push({element,path:next});
    state.active=null;
   }else state.active.path=next;
   return ok();
  }

  function verify(){
   if(state.phase!=='build'||state.active)return fail('Finish or undo your current route before testing.');
   const errors=E.checkAll(activeMap(),state.routes,state.placements);
   if(errors.length)return fail(errors.join('. '));
   state.phase='complete';
   return {ok:true,track:E.score(map,state.routes,state.placements).track,
    spend:map.construction?E.constructionCost(map,E.placementCounts(state.placements)):null};
  }

  return {map,state,start,restart,undo,place,remove,route,verify};
 }

 const api={createSession};
 root.EFSession=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
