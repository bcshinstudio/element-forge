'use strict';
(()=>{
 const G=window.EFChallenges;
 const field=id=>document.getElementById('challenge-'+id);
 for(const type of ['family','difficulty']){
  const values=type==='family'?G.families:G.difficulties;
  for(const value of ['mixed',...values])field(type).add(new Option(value,value));
 }
 let batch;
 const controls=['open','export','report','stage'];
 function details(){
  if(!batch)return;
  const selected=batch.report.evidence[Number(field('stage').value)];
  field('details').textContent=JSON.stringify({selected,rejections:batch.report.rejections},null,2);
 }
 function download(name,value){
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 field('generate').onclick=()=>{
  field('generate').disabled=true;
  controls.forEach(id=>{field(id).disabled=true;});
  field('status').textContent='Verifying layouts and tool placements…';
  field('evidence').open=false;
  field('details').textContent='';
  field('stage').replaceChildren();
  setTimeout(()=>{
   try{
    batch=G.generate({seed:field('seed').value,family:field('family').value,
     difficulty:field('difficulty').value,count:Number(field('count').value)});
    batch.pack.stages.forEach((stage,index)=>field('stage').add(new Option(stage.map.name,index)));
    field('status').textContent=`${batch.report.accepted}/${batch.report.requested} verified · ${batch.report.fallback} fallback · ${batch.report.rejections.length} rejected · seed ${batch.pack.seed}`;
    controls.forEach(id=>{field(id).disabled=id!=='report'&&!batch.pack.stages.length;});
    details();
   }catch(error){batch=undefined;field('status').textContent=error.message;}
   finally{field('generate').disabled=false;}
  },0);
 };
 field('stage').onchange=details;
 field('open').onclick=()=>{
  if(window.EFPlay.isActive()){field('status').textContent='Exit Playtest before opening a stage.';return;}
  if(dirty&&!confirm('Replace the current unsaved map?'))return;
  snapshot();
  map=window.EFMap.readLevel(batch.pack.stages[Number(field('stage').value)]);
  syncMeta();render();markDirty();
  field('status').textContent='Selected stage loaded. Enter Playtest to try it.';
 };
 field('export').onclick=()=>download('Element_Forge_Challenge_Pack.json',batch.pack);
 field('report').onclick=()=>download('Element_Forge_Generator_Report.json',batch.report);
})();
