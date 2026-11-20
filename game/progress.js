'use strict';
(function(root){
 const KEY='element-forge.campaign.v1';

 function createProgress(storage,levelIds){
  const ids=new Set(levelIds);
  let saved;
  try{saved=JSON.parse(storage?.getItem(KEY)??'null');}catch{}
  const completed=new Set(Array.isArray(saved?.completed)?saved.completed.filter(id=>ids.has(id)):[]);
  let selected=ids.has(saved?.selected)?saved.selected:null;

  function save(){
   try{storage?.setItem(KEY,JSON.stringify({selected,completed:[...completed]}));}catch{}
  }
  return {
   unlockedIndex:()=>{
    const firstIncomplete=levelIds.findIndex(id=>!completed.has(id));
    return firstIncomplete<0?levelIds.length-1:firstIncomplete;
   },
   selected:()=>selected,
   completedCount:()=>completed.size,
   hasCompleted:id=>completed.has(id),
   select(id){if(ids.has(id)){selected=id;save();}},
   complete(id){if(ids.has(id)&&!completed.has(id)){completed.add(id);save();}}
  };
 }

 const api={createProgress};
 root.EFProgress=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
