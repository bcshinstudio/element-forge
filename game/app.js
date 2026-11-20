'use strict';
(()=>{
 const E=window.EFEngine,F=window.EFMap;
 const levels=[...window.EFLevels.catalog];
 const campaignSize=levels.length;
 let storage;
 try{storage=window.localStorage;}catch{}
 const progress=window.EFProgress.createProgress(storage,levels.map(level=>level.id));
 const $=id=>document.getElementById(id);
 const board=$('board');
 const colors={fire:'#ff9875',water:'#79d7ff',nature:'#bdec81',electricity:'#ffdd72',arcane:'#d9b5ff'};
 const symbols={fire:'F',water:'W',nature:'N',electricity:'E',arcane:'A'};
 const toolNames=Object.fromEntries(F.COMPONENTS.map(([id,name])=>[id,name]));
 const componentSymbols=Object.fromEntries(F.COMPONENTS.map(([id,,icon])=>[id,icon]));
 const terrainSymbols={forest:'♣',mountain:'▲',water:'≈',wall:'▦',void:'■',ice:'✧',lava:'≋',land:''};
 const arrows={N:'↑',E:'→',S:'↓',W:'←'};
 toolNames.tunnel='Tunnel';
 let session,tiles,tool,tunnelStart=null,levelIndex,timer=null,drag=null,importTicket=0;
 const message=value=>{$('status').textContent=value;};

 function canOpen(index){
  return index>=campaignSize||index<=progress.unlockedIndex();
 }
 function openLevel(index){
  if(!canOpen(index)){ $('level').value=levelIndex;return; }
  stopAnimation();
  drag=null;
  tunnelStart=null;
  session=window.EFSession.createSession(levels[index]);
  const {map}=session;
  levelIndex=index;
  if(index<campaignSize){progress.select(levels[index].id);updateLevelLabels();}
  $('level').value=index;
  $('puzzle-options').open=false;
  $('custom-level').open=false;
  $('import-error').textContent='';
  $('puzzle').textContent=map.name;
  $('description').textContent=map.description;
  board.style.setProperty('--cols',map.width);
  const firstSource=E.pairs(map)[0].source;
  tiles=map.cells.map((cell,i)=>{
   const tile=document.createElement('button');
   tile.type='button';
   tile.tabIndex=i===firstSource?0:-1;
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
  $('elements').replaceChildren(...legend,document.createTextNode('S = source · D = destination'));
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
   const unit=kind==='tunnel'?2:1;
   const quantity=Math.floor(count/unit);
   label.textContent=toolNames[kind]+(map.construction?' · '+map.construction.prices[kind]*unit+' pt each':'');
   if(map.construction){
    const field=document.createElement('input');
    field.type='number';
    field.name=kind;
    field.min=0;
    field.max=quantity;
    field.required=true;
    field.value=Math.floor((state.loadout[kind]??0)/unit);
    field.addEventListener('input',updateBudget);
    label.append(field);
   }else label.append(document.createTextNode(' × '+quantity));
   return label;
  });
  $('loadout').replaceChildren(...rows);
  updateBudget();
 }

 function selection(){
  return Object.fromEntries([...$('loadout').querySelectorAll('input')].map(field=>[field.name,Number(field.value)*(field.name==='tunnel'?2:1)]));
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
  remaining.tunnel=Math.floor((remaining.tunnel||0)/2);
  const choices=Object.entries(remaining).filter(([kind,count])=>kind!=='bridge'&&count>0)
   .map(([kind,count])=>[kind,`${toolNames[kind]} (${count})`]);
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
  $('tools').hidden=!buttons.length;
  $('bridge-count').hidden=!state.loadout.bridge;
  $('bridge-count').textContent=`Bridges left: ${remaining.bridge??0}`;
  $('bridge-hint').hidden=!remaining.bridge;
  $('remove').hidden=!Object.keys(state.placements).length;
  $('remove').setAttribute('aria-pressed',String(tool==='remove'));
  $('replan').hidden=!session.map.construction;
  $('link-field').hidden=tool!=='portal';
  $('instructions').textContent=tool==='remove'?'Choose a tool on the map to remove it.':
   tool==='route'?'Tap or drag from a source. Resume an unfinished route from its end.':
   tool==='tunnel'?(tunnelStart===null?'Choose the first open tile for your tunnel.':
    'Choose the other opening in the same row or column, across blocked terrain. Click the first opening or press Escape to cancel.'):
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
  $('next').disabled=levelIndex>=campaignSize-1;
  drawBoard();
 }

 function drawBoard(){
  const {map,state}=session;
  const fragments=tiles.map(()=>document.createDocumentFragment());
  for(const {element,path} of [...state.routes.filter(route=>!state.drafts[route.element]),...Object.values(state.drafts)]){
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
    const role=document.createElement('small');
    role.className='endpoint-role';
    role.textContent=cell.node.role==='source'?'S':'D';
    role.setAttribute('aria-hidden','true');
    mark.append(role);
   }else if(kind){
    mark.classList.add('structure');
    const element=kind==='checkpoint'?cell.props?.element:null;
   mark.textContent=(componentSymbols[kind]||'')+(symbols[element]||link||arrows[cell.props?.direction]||'');
   if(colors[element])mark.style.color=colors[element];
   }else mark.textContent=cell.terrain==='oneway'?arrows[cell.props?.direction||'E']:terrainSymbols[cell.terrain]||'';
   fragments[i].append(mark);
   tile.classList.toggle('tunnel-preview',i===tunnelStart);
   tile.replaceChildren(fragments[i]);
   const checkpoint=kind==='checkpoint'&&cell.props?.element&&cell.props.element!=='any'?F.ELEMENTS[cell.props.element].name+' ':'';
   const label=`Row ${Math.floor(i/map.width)+1}, column ${i%map.width+1}, `+
    (cell.node?`${F.ELEMENTS[cell.node.element].name} ${cell.node.role}`:kind?checkpoint+toolNames[kind]+(link?' '+link:''):cell.terrain);
   tile.title=label;
   tile.setAttribute('aria-label',label);
  }
 }

 function explainMove(result,index){
  const {map,state}=session;
  const element=state.active?.element;
  if(result.message==='Start at an element source.'&&map.cells[index].node?.role==='destination'){
   return 'This is a destination (D). Start at the matching source (S).';
  }
  if(result.message==='Element terrain restriction violated'){
   return F.ELEMENTS[element].name+' cannot cross '+map.cells[index].terrain+' on this level.';
  }
  if(result.message==='Element component restriction violated'){
   return F.ELEMENTS[element].name+' cannot use '+toolNames[E.effective(map,state.placements,index)].toLowerCase()+' on this level.';
  }
  if(/^Blocked terrain/.test(result.message)&&map.cells[index].terrain==='water'){
   return 'This water tile needs a bridge. Click or tap it to build one.';
  }
  return result.message;
 }

 function cancelTool(){
  tool='route';
  tunnelStart=null;
  drawToolBar();
  drawBoard();
  message('');
 }

 function act(index,direct=false){
  if(session.state.phase!=='build')return;
  const {map,state}=session;
  const bridgeTile=direct&&tool==='route'&&map.cells[index].terrain==='water'&&
   !E.effective(map,state.placements,index);
  if(tool==='tunnel'&&tunnelStart===index){cancelTool();return true;}
  if(tool==='tunnel'&&tunnelStart===null){
   if(!E.canPlace(map,state.placements,index,'tunnel')){message('Choose an open tile for the tunnel opening.');return false;}
   tunnelStart=index;
   drawBoard();
   drawToolBar();
   message('');
   return true;
  }
  const result=bridgeTile?session.place(index,'bridge'):tool==='tunnel'?session.placeTunnel(tunnelStart,index):
   tool==='route'?session.route(index):tool==='remove'?session.remove(index):session.place(index,tool,$('link-id').value.trim());
  if(!result.ok){message(explainMove(result,index));return false;}
  message('');
  tunnelStart=null;
  drawBoard();
  if(bridgeTile||tool!=='route'){tool='route';drawToolBar();}
  return true;
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
  focusSource();
 });
 $('tools').addEventListener('click',event=>{
  const kind=event.target.dataset.tool;
  if(!kind)return;
  tool=tool===kind?'route':kind;
  tunnelStart=null;
  drawBoard();
  drawToolBar();
  $('tools').querySelector(`[data-tool="${kind}"]`).focus();
  message('');
 });
 $('remove').onclick=()=>{
  tool='remove';
  tunnelStart=null;
  $('puzzle-options').open=false;
  drawToolBar();
  focusSource();
  message('');
 };
 function reset(replan){
  stopAnimation();
  session.restart(replan);
  tunnelStart=null;
  $('puzzle-options').open=false;
  tool='route';
  drawPlan();
  update();
  message(replan?'Choose a new loadout.':'The board has been reset.');
  if(replan)$('start').focus();else focusSource();
 }
 $('restart').onclick=()=>reset(false);
 $('replan').onclick=()=>reset(true);
 $('replay').onclick=()=>reset(true);
 $('undo').onclick=()=>{if(tool!=='route'){cancelTool();return;}if(session.undo()){drawBoard();drawToolBar();message('Last change undone.');}};
 $('check').onclick=()=>{
  const result=session.verify();
  if(!result.ok){message(result.message);return;}
  if(levelIndex<campaignSize){progress.complete(levels[levelIndex].id);updateLevelLabels();}
  $('score').textContent=`Track length ${result.track}`+(result.spend===null?'':` · Construction spend ${result.spend} pt`);
  update();
  message('');
  animate();
 };
 $('next').onclick=()=>{if(session.state.phase==='complete')openLevel(levelIndex+1);};
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
  if(tile&&event.detail===0)act(Number(tile.dataset.index),true);
 });
 board.addEventListener('pointerdown',event=>{
  const tile=event.target.closest('.tile');
  if(!tile||!event.isPrimary||event.button!==0||session.state.phase!=='build')return;
  const index=Number(tile.dataset.index);
  const routeStart=Object.values(session.state.drafts).some(route=>route.path.at(-1)===index)||
   session.map.cells[index].node?.role==='source';
  if(tool==='route'&&routeStart&&!drag){
   drag={pointer:event.pointerId,index};
   board.setPointerCapture(event.pointerId);
  }
  act(index,true);
 });
 board.addEventListener('pointermove',event=>{
  if(drag?.pointer!==event.pointerId||!session.state.active)return;
  const tile=document.elementFromPoint(event.clientX,event.clientY)?.closest('.tile');
  if(!tile||!board.contains(tile))return;
  const index=Number(tile.dataset.index);
  if(index===drag.index)return;
  drag.index=index;
  const tip=session.state.active.path.at(-1);
  const map=session.map;
  const stride=Math.floor(tip/map.width)===Math.floor(index/map.width)?1:tip%map.width===index%map.width?map.width:0;
  if(stride&&index!==tip&&E.linkPartner(map,tip,session.state.placements)!==index){
   const delta=Math.sign(index-tip)*stride;
   for(let next=tip+delta;session.state.active;next+=delta){
    if(!act(next)||next===index)break;
   }
  }else act(index);
 });
 board.addEventListener('contextmenu',event=>{
  const tile=event.target.closest('.tile');
  if(!tile||session.state.phase!=='build')return;
  const index=Number(tile.dataset.index);
  if(!Object.hasOwn(session.state.placements,index))return;
  event.preventDefault();
  const result=session.remove(index);
  if(!result.ok){message(result.message);return;}
  tool='route';
  tunnelStart=null;
  drawBoard();
  drawToolBar();
  message('Tool removed. Any track using it was cleared.');
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&session.state.phase==='build'&&tool!=='route'){event.preventDefault();cancelTool();}
 });
 document.addEventListener('pointerdown',event=>{
  if(session.state.phase==='build'&&tool==='tunnel'&&!board.contains(event.target)&&
     !$('tools').contains(event.target))cancelTool();
 });
 board.addEventListener('keydown',event=>{
  const tile=event.target.closest('.tile');
  if(!tile||!event.key.startsWith('Arrow'))return;
  const direction={ArrowUp:'N',ArrowRight:'E',ArrowDown:'S',ArrowLeft:'W'}[event.key];
  const index=Number(tile.dataset.index);
  const next=E.neighbors(index,session.map.width,session.map.height).find(([,dir])=>dir===direction);
  if(next){event.preventDefault();focusTile(next[0]);}
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture']){
  board.addEventListener(type,event=>{if(drag?.pointer===event.pointerId)drag=null;});
 }

 function focusTile(index){
  const previous=board.querySelector('[tabindex="0"]');
  if(previous)previous.tabIndex=-1;
  tiles[index].tabIndex=0;
  tiles[index].focus();
 }
 function focusSource(){focusTile(E.pairs(session.map)[0].source);}
 board.addEventListener('focusin',event=>{
  const tile=event.target.closest('.tile');
  const previous=board.querySelector('[tabindex="0"]');
  if(previous&&previous!==tile)previous.tabIndex=-1;
  if(tile)tile.tabIndex=0;
 });

 function updateLevelLabels(){
  for(let i=0;i<campaignSize;i++){
   const {id,map}=levels[i];
   $('level').options[i].disabled=!canOpen(i);
   $('level').options[i].textContent=`${i+1}. ${map.name}${progress.hasCompleted(id)?' ✓':canOpen(i)?'':' · Locked'}`;
  }
  $('campaign-progress').textContent=`${progress.completedCount()} / ${campaignSize} complete`;
 }
 for(const [index,level] of levels.entries())$('level').add(new Option(level.map.name,index));
 openLevel(Math.min(progress.unlockedIndex(),Math.max(0,levels.findIndex(level=>level.id===progress.selected()))));
})();
