'use strict';
(function(root){
 const KEY='element-forge.campaign.v2';
 const LEGACY='element-forge.campaign.v1';
 function createProgress(storage,levelIds,campaignRules=3,keyOverride=null){
  const key=keyOverride??(campaignRules>=4?'element-forge.tutorial-campaign.v4':KEY);
  const ids=new Set(levelIds);
  function read(key){
   try{return JSON.parse(storage?.getItem(key)??'null');}catch{return null;}
  }
  const current=read(key);
  const saved=current?.version===2?current:key===KEY?read(LEGACY):{challenge:read('element-forge.tutorial-campaign.v4')?.challenge??read(KEY)?.challenge};
  const completed=new Set(Array.isArray(saved?.completed)?saved.completed.filter(id=>ids.has(id)):[]);
  const best=Object.fromEntries(levelIds.filter(id=>Number.isSafeInteger(saved?.best?.[id])&&saved.best[id]>=0&&completed.has(id))
   .map(id=>[id,saved.best[id]]));
  let selected=ids.has(saved?.selected)?saved.selected:null;
  const priorRun=keyOverride&&!current?read('element-forge.tutorial-campaign.v4')?.campaign:null;
  // First Spark is the only unchanged board shared by the two campaigns.
  const compatible=priorRun?.id==='rules4-first-spark'&&levelIds[0]===priorRun.id&&priorRun.rules===campaignRules&&priorRun.board?.phase!=='complete';
  let campaign=saved?.version===2?saved.campaign:compatible?priorRun:null;
  let challenge=saved?.challenge??null;
  function save(){
   try{storage?.setItem(key,JSON.stringify({version:2,selected,completed:[...completed],best,campaign,challenge}));}catch{}
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
   reachedIndex:()=>Math.min(levelIds.length-1,Math.max(0,...levelIds.map((id,index)=>completed.has(id)?index+1:0))),
   reset(){completed.clear();for(const id of Object.keys(best))delete best[id];selected=null;campaign=null;save();}
  };
 }
 const api={createProgress};
 root.EFProgress=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
