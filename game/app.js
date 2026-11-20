'use strict';
(()=>{
 const E=window.EFEngine,F=window.EFMap;
 const levels=[...window.EFLevels.catalog];
 const $=id=>document.getElementById(id);
 const board=$('board');
 const colors={fire:'#ff9875',water:'#79d7ff',nature:'#bdec81',electricity:'#ffdd72',arcane:'#d9b5ff'};
 const symbols={fire:'F',water:'W',nature:'N',electricity:'E',arcane:'A'};
 const toolNames=Object.fromEntries(F.COMPONENTS.map(([id,name])=>[id,name]));
 const componentSymbols=Object.fromEntries(F.COMPONENTS.map(([id,,icon])=>[id,icon]));
 const terrainSymbols={forest:'♣',mountain:'▲',water:'≈',wall:'▦',void:'■',ice:'✧',lava:'≋',land:''};
 const arrows={N:'↑',E:'→',S:'↓',W:'←'};
 let session,tiles,tool,levelIndex,timer=null,drag=null,importTicket=0;
 const message=value=>{$('status').textContent=value;};

 function openLevel(index){
  stopAnimation();
  drag=null;
  session=window.EFSession.createSession(levels[index]);
  const {map}=session;
  levelIndex=index;
  $('level').value=index;
  $('puzzle-options').open=false;
  $('custom-level').open=false;
  $('import-error').textContent='';
  $('puzzle').textContent=map.name;
  $('description').textContent=map.description;
  board.style.setProperty('--cols',map.width);
  tiles=map.cells.map((cell,i)=>{
   const tile=document.createElement('button');
   tile.type='button';
   tile.dataset.index=i;
   tile.className='tile '+cell.terrain;
   return tile;
  });
  board.replaceChildren(...tiles);
  const legend=E.pairs(map).map(({element})=>{
   const item=document.createElement('b');
   item.style.setProperty('--element',colors[element]);
   item.textContent=symbols[element]+' · '+F.ELEMENTS[element].name;
   return item;
  });
  $('elements').replaceChildren(...legend,document.createTextNode('Solid ring = source · Double ring = destination'));
  $('link-id').value='A';
  drawPlan();
  update();
  message('');
 }

 function toolEntries(){return Object.entries(session.map.inventory).filter(([,count])=>count>0);}

 function drawPlan(){
  const {map,state}=session;
  const rows=toolEntries().map(([kind,count])=>{
   const label=document.createElement('label');
   label.className='loadout-row';
   label.textContent=toolNames[kind]+(map.construction?' · '+map.construction.prices[kind]+' pt each':'');
   if(map.construction){
    const field=document.createElement('input');
    field.type='number';
    field.name=kind;
    field.min=0;
    field.max=count;
    field.required=true;
    field.value=state.loadout[kind]??0;
    field.addEventListener('input',updateBudget);
    label.append(field);
   }else label.append(document.createTextNode(' × '+count));
   return label;
  });
  $('loadout').replaceChildren(...rows);
  updateBudget();
 }

 function selection(){
  return Object.fromEntries([...$('loadout').querySelectorAll('input')].map(field=>[field.name,Number(field.value)]));
 }

 function updateBudget(){
  const construction=session.map.construction;
  if(!construction){
   $('start').disabled=false;
   $('budget').textContent=toolEntries().length?'This puzzle supplies a fixed set of tools.':'This puzzle uses track only.';
   return;
  }
  const remaining=construction.budget-E.constructionCost(session.map,selection());
  $('budget').textContent=remaining<0?`${-remaining} points over budget`:`${remaining} of ${construction.budget} points available`;
  $('start').disabled=remaining<0;
 }

 function drawToolBar(){
  const {state}=session;
  const counts=E.placementCounts(state.placements);
  const remaining=Object.fromEntries(toolEntries().map(([kind])=>[kind,(state.loadout[kind]||0)-(counts[kind]||0)]));
  const choices=[['route','Draw track'],...Object.entries(remaining).filter(([,count])=>count>0)
   .map(([kind,count])=>[kind,`${toolNames[kind]} (${count})`])];
  if(tool==='remove'&&!Object.keys(state.placements).length||Object.hasOwn(remaining,tool)&&remaining[tool]<=0)tool='route';
  const buttons=choices.map(([kind,label])=>{
   const button=document.createElement('button');
   button.type='button';
   button.dataset.tool=kind;
   button.setAttribute('aria-pressed',String(kind===tool));
   button.textContent=label;
   return button;
  });
  $('tools').replaceChildren(...buttons);
  $('remove').hidden=!Object.keys(state.placements).length;
  $('remove').setAttribute('aria-pressed',String(tool==='remove'));
  $('replan').hidden=!session.map.construction;
  $('link-field').hidden=!['portal','tunnel'].includes(tool);
  $('instructions').textContent=tool==='remove'?'Choose a tool on the map to remove it.':
   tool==='route'?'Start at a source. Tap or drag through adjacent tiles.':
   'Choose a tile for your '+toolNames[tool].toLowerCase()+'.';
 }

 function update(){
  const phase=session.state.phase;
  $('phase').textContent={inspect:'Plan your route',build:'Build the network',complete:'Delivery complete'}[phase];
  $('instructions').textContent={
   inspect:'Inspect the board before choosing tools.',
   build:'',
   complete:'Every element reached its destination.'
  }[phase];
  $('plan').hidden=phase!=='inspect';
  $('build').hidden=phase!=='build';
  $('finish').hidden=phase!=='complete';
  if(phase==='build')drawToolBar();
  $('next').disabled=levelIndex<0||levelIndex>=window.EFLevels.catalog.length-1;
  drawBoard();
 }

 function drawBoard(){
  const {map,state}=session;
  const fragments=tiles.map(()=>document.createDocumentFragment());
  for(const {element,path} of [...state.routes,...(state.active?[state.active]:[])]){
   for(const [j,i] of path.entries()){
    const line=document.createElement('span');
    line.className='track';
    line.style.setProperty('--line',colors[element]);
    const dot=document.createElement('i');
    dot.className='dot';
    line.append(dot);
    const adjacent=E.neighbors(i,map.width,map.height);
    for(const next of [path[j-1],path[j+1]]){
     const neighbor=adjacent.find(([index])=>index===next);
     if(!neighbor)continue;
     const arm=document.createElement('i');
     arm.className={N:'north',S:'south',W:'west',E:'east'}[neighbor[1]];
     line.append(arm);
    }
    fragments[i].append(line);
   }
  }
  for(const [i,cell] of map.cells.entries()){
   const tile=tiles[i];
   const mark=document.createElement('span');
   const kind=E.effective(map,state.placements,i);
   const link=E.pairIdAt(map,state.placements,i);
   mark.className='mark';
   if(cell.node){
    mark.classList.add('endpoint',cell.node.role);
    mark.style.setProperty('--element',colors[cell.node.element]);
    mark.textContent=symbols[cell.node.element];
   }else if(kind){
    mark.classList.add('structure');
    mark.textContent=(componentSymbols[kind]||'')+(link||arrows[cell.props?.direction]||'');
   }else mark.textContent=cell.terrain==='oneway'?arrows[cell.props?.direction||'E']:terrainSymbols[cell.terrain]||'';
   fragments[i].append(mark);
   tile.replaceChildren(fragments[i]);
   const label=`Row ${Math.floor(i/map.width)+1}, column ${i%map.width+1}, `+
    (cell.node?`${F.ELEMENTS[cell.node.element].name} ${cell.node.role}`:kind?toolNames[kind]+(link?' '+link:''):cell.terrain);
   tile.title=label;
   tile.setAttribute('aria-label',label);
  }
 }

 function act(index){
  if(session.state.phase!=='build')return;
  const result=tool==='route'?session.route(index):tool==='remove'?session.remove(index):session.place(index,tool,$('link-id').value.trim());
  if(!result.ok){message(result.message);return;}
  message('');
  drawBoard();
  // Leave the selected toolbar button in place while a route is drawn.
  if(tool!=='route')drawToolBar();
 }

 function stopAnimation(){
  clearInterval(timer);
  timer=null;
  board.querySelectorAll('.orb').forEach(orb=>orb.remove());
  $('replay').disabled=false;
 }

 function animate(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let step=0;
  const {routes}=session.state;
  const count=Math.max(...routes.map(route=>route.path.length));
  $('replay').disabled=true;
  const advance=()=>{
   board.querySelectorAll('.orb').forEach(orb=>orb.remove());
   if(step>=count){stopAnimation();return;}
   for(const {element,path} of routes){
    const orb=document.createElement('span');
    orb.className='orb';
    orb.style.setProperty('--line',colors[element]);
    tiles[path[Math.min(step,path.length-1)]].append(orb);
   }
   step++;
  };
  timer=setInterval(advance,145);
  advance();
 }

 $('plan').addEventListener('submit',event=>{
  event.preventDefault();
  const result=session.start(selection());
  if(!result.ok){message(result.message);return;}
  tool='route';
  update();
  message('');
  $('tools').querySelector('button').focus();
 });
 $('tools').addEventListener('click',event=>{
  const kind=event.target.dataset.tool;
  if(!kind)return;
  if(session.state.active&&kind!=='route'){message('Finish or undo your current route first.');return;}
  tool=kind;
  drawToolBar();
  $('tools').querySelector(`[data-tool="${kind}"]`).focus();
  message('');
 });
 $('remove').onclick=()=>{
  if(session.state.active){message('Finish or undo your current route first.');return;}
  tool='remove';
  $('puzzle-options').open=false;
  drawToolBar();
  $('tools').querySelector('button').focus();
  message('');
 };
 function reset(replan){
  stopAnimation();
  session.restart(replan);
  $('puzzle-options').open=false;
  tool='route';
  drawPlan();
  update();
  message(replan?'Choose a new loadout.':'The board has been reset.');
  (replan?$('start'):$('tools').querySelector('button')).focus();
 }
 $('restart').onclick=()=>reset(false);
 $('replan').onclick=()=>reset(true);
 $('replay').onclick=()=>reset(true);
 $('undo').onclick=()=>{if(session.undo()){drawBoard();drawToolBar();message('Last change undone.');}};
 $('check').onclick=()=>{
  const result=session.verify();
  if(!result.ok){message(result.message);return;}
  $('score').textContent=`Track length ${result.track}`+(result.spend===null?'':` · Construction spend ${result.spend} pt`);
  update();
  message('');
  animate();
 };
 $('next').onclick=()=>openLevel(levelIndex+1);
 $('level').onchange=()=>{importTicket++;openLevel(Number($('level').value));};
 $('import').onchange=async event=>{
  const input=event.target,file=input.files[0],ticket=++importTicket;
  input.value='';
  if(!file)return;
  $('import-error').textContent='';
  try{
   if(file.size>1024*1024)throw Error('Choose a level file smaller than 1 MiB.');
   const level=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
   if(ticket!==importTicket)return;
   const map=F.readLevel(level);
   const index=window.EFLevels.catalog.length;
   levels[index]=level;
   $('level').querySelector('[data-import]')?.remove();
   const option=new Option(map.name+' (imported)',index);
   option.dataset.import='true';
   $('level').add(option);
   openLevel(index);
  }catch(error){if(ticket===importTicket)$('import-error').textContent='Import failed. '+error.message;}
 };
 board.addEventListener('click',event=>{
  const tile=event.target.closest('.tile');
  if(tile&&event.detail===0)act(Number(tile.dataset.index));
 });
 board.addEventListener('pointerdown',event=>{
  const tile=event.target.closest('.tile');
  if(!tile||event.button!==0||session.state.phase!=='build')return;
  const index=Number(tile.dataset.index);
  if(tool==='route'){
   drag={pointer:event.pointerId,index};
   board.setPointerCapture(event.pointerId);
  }
  act(index);
 });
 board.addEventListener('pointermove',event=>{
  if(drag?.pointer!==event.pointerId||!session.state.active)return;
  const tile=document.elementFromPoint(event.clientX,event.clientY)?.closest('.tile');
  if(!tile||!board.contains(tile))return;
  const index=Number(tile.dataset.index);
  if(index===drag.index)return;
  drag.index=index;
  act(index);
 });
 board.addEventListener('keydown',event=>{
  const tile=event.target.closest('.tile');
  if(!tile||!event.key.startsWith('Arrow'))return;
  const direction={ArrowUp:'N',ArrowRight:'E',ArrowDown:'S',ArrowLeft:'W'}[event.key];
  const index=Number(tile.dataset.index);
  const next=E.neighbors(index,session.map.width,session.map.height).find(([,dir])=>dir===direction);
  if(next){event.preventDefault();tiles[next[0]].focus();}
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture']){
  board.addEventListener(type,event=>{if(drag?.pointer===event.pointerId)drag=null;});
 }

 for(const [index,level] of levels.entries())$('level').add(new Option(level.map.name,index));
 openLevel(0);
})();
