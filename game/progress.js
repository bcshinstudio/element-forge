'use strict';
(function(root){
 const KEY='element-forge.campaign.v2';
 const LEGACY='element-forge.campaign.v1';
 function createProgress(storage,levelIds){
  const ids=new Set(levelIds);
  let saved;
  try{
   const current=JSON.parse(storage?.getItem(KEY)??'null');
   saved=current?.version===2?current:JSON.parse(storage?.getItem(LEGACY)??'null');
  }catch{}
  const completed=new Set(Array.isArray(saved?.completed)?saved.completed.filter(id=>ids.has(id)):[]);
  const best=Object.fromEntries(levelIds.filter(id=>Number.isSafeInteger(saved?.best?.[id])&&saved.best[id]>=0&&completed.has(id))
   .map(id=>[id,saved.best[id]]));
  let selected=ids.has(saved?.selected)?saved.selected:null;
  let campaign=saved?.version===2?saved.campaign:null;
  let challenge=saved?.version===2?saved.challenge:null;
  function save(){
   try{storage?.setItem(KEY,JSON.stringify({version:2,selected,completed:[...completed],best,campaign,challenge}));}catch{}
  }
  return {
   unlockedIndex:()=>{
    const firstIncomplete=levelIds.findIndex(id=>!completed.has(id));
    return firstIncomplete<0?levelIds.length-1:firstIncomplete;
   },
   selected:()=>selected,
   completedCount:()=>completed.size,
   hasCompleted:id=>completed.has(id),
   best:id=>best[id]??null,
   total:()=>Object.values(best).reduce((sum,score)=>sum+score,0),
   select(id){if(ids.has(id)){selected=id;save();}},
   complete(id,score,board){
    if(!ids.has(id))return;
    completed.add(id);
    if(Number.isSafeInteger(score)&&score>=0)best[id]=Math.max(best[id]??0,score);
    if(board)campaign=board;
    save();
   },
   campaign:()=>campaign,
   challenge:()=>challenge,
   saveCampaign(board){campaign=board;save();},
   saveChallenge(board){challenge=board;save();},
   reset(){completed.clear();for(const id of Object.keys(best))delete best[id];selected=null;campaign=null;save();}
  };
 }
 const api={createProgress};
 root.EFProgress=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
