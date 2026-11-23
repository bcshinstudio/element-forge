'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const panel=$('playtest-panel');
 const frame=$('playtest-frame');
 const open=$('playMode');
 const header=document.querySelector('header');
 const inline=$('playtest-document');
 let sequence=0,inlineGame;
 function stop(){
  sequence++;
  frame.removeAttribute('srcdoc');
  frame.removeAttribute('src');
  panel.hidden=true;
  header.inert=false;
  $('editor-layout').hidden=false;
  open.focus();
 }
 function artForDraft(map){
  const catalog=window.EFArtCatalog;
  const ids=new Set(map.cells.flatMap(cell=>[cell.terrainArt?.id,cell.componentArt?.id]).filter(Boolean));
  for(const [type,spec] of Object.entries(map.toolArt??{})){
   const selected=window.EFVariants.resolve(spec,type);
   if(!selected)continue;
   for(const item of window.EFVariants.options(type)){
    if(item.label===selected.label)ids.add(item.id);
   }
  }
  return Object.fromEntries([...ids].filter(id=>Object.hasOwn(catalog,id)).map(id=>[id,catalog[id]]));
 }
 const scriptJSON=value=>JSON.stringify(value).replaceAll('<','\\u003c');
 open.onclick=async()=>{
  const request=++sequence;
  try{
   const level=window.EFMap.asLevel(map);
   const art=inline?'window.EFArtCatalog='+scriptJSON(artForDraft(level.map))+';':'';
   const bootstrap='<script>'+art+'window.EFEditorDraft='+scriptJSON(level)+';<'+ '/script>';
   if(inline){
    inlineGame??=JSON.parse(inline.textContent);
    frame.srcdoc=inlineGame.replace('<body>',()=>'<body>'+bootstrap);
   }else{
    const gameURL=new URL('../game/index.html',location.href);
    const response=await fetch(gameURL);
    if(!response.ok)throw Error('The game playtest could not be loaded.');
    const document=await response.text();
    if(request!==sequence)return;
    frame.srcdoc=document.replace('<head>','<head><base href="'+gameURL.href+'">')
      .replace('<body>',()=>'<body>'+bootstrap);
   }
   panel.hidden=false;
   header.inert=true;
   $('editor-layout').hidden=true;
   $('exit-playtest').focus();
  }catch(error){showMessage('Playtest could not start. '+error.message,false);}
 };
 $('exit-playtest').onclick=stop;
 window.EFPlay={isActive:()=>!panel.hidden};
})();
