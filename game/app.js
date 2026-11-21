'use strict';
(()=>{
 const E=window.EFEngine,F=window.EFMap;
 const chapterOneSize=window.EFChapter.chapter.length;
 const levels=[...window.EFChapter.chapter,...window.EFChapter.chapterTwo];
 const campaignSize=levels.length;
 const tutorials=[...window.EFLevels.catalog,window.EFLevels.prototype];
 levels.push(...tutorials);
 const importIndex=levels.length;
 let storage;
 try{storage=window.localStorage;}catch{}
 const progress=window.EFProgress.createProgress(storage,levels.slice(0,campaignSize).map(level=>level.id),levels[0].rulesVersion,'element-forge.chapter-one.v1',Object.fromEntries(levels.slice(0,campaignSize).map(level=>[level.id,level.layout??1])));
 const tutorialProgress=window.EFProgress.createProgress(storage,tutorials.map(level=>level.id),4);
 const audio=window.EFAudio.createAudio({storage,document,AudioContext:window.AudioContext||window.webkitAudioContext});
 document.addEventListener('click',()=>audio.unlock(),true);
 const challengeStart=importIndex+1;
 let challengeEnd=challengeStart,activePack=null,challengeBest={};
 const $=id=>document.getElementById(id);
 let mode='run',tutorialReturn=null;
 const heardRoutes=new Set();
 const board=$('board');
 const colors={fire:'#ff9875',water:'#79d7ff',nature:'#bdec81',electricity:'#ffdd72',arcane:'#d9b5ff',wind:'#a8f0dd'};
 const symbols={fire:'F',water:'W',nature:'P',electricity:'E',arcane:'A',wind:'V'};
 for(const [id,element] of Object.entries(F.ELEMENTS)){
  colors[id]??=element.color;
  symbols[id]??=element.symbol;
 }
 const toolNames=Object.fromEntries(F.COMPONENTS.map(([id,name])=>[id,name]));
 const componentSymbols=Object.fromEntries(F.COMPONENTS.map(([id,,icon])=>[id,icon]));
 const terrainSymbols={forest:'♣',mountain:'▲',water:'≈',wall:'▦',void:'◌',ice:'✧',lava:'♨',land:''};
 for(const [id,,glyph] of F.TERRAIN)terrainSymbols[id]??=glyph;
 const terrainNames=Object.fromEntries(F.TERRAIN.map(([id,name])=>[id,name]));
 const arrows={N:'↑',E:'→',S:'↓',W:'←'};
 toolNames.tunnel='Tunnel';
 let session,tiles,tool,tunnelStart=null,levelIndex,timer=null,drag=null,importTicket=0;
 const phone=matchMedia('(max-width: 600px), (hover: none) and (max-width: 950px)');
 const menu=$('game-menu');
 const menuItems=[document.querySelector('.campaign-picker'),$('description'),$('elements'),$('instructions'),
  $('puzzle-hint'),$('puzzle-options'),$('challenge-library'),$('custom-level'),$('world-intro')];
 const menuHomes=menuItems.map(item=>{
  const marker=document.createComment('desktop location');
  item.before(marker);
  return marker;
 });
 function adjustPhone(){
  for(const [i,item] of menuItems.entries()){
   if(phone.matches)$('menu-content').append(item);
   else menuHomes[i].after(item);
  }
  $('puzzle-nav').hidden=$('play-view').hidden;
  $('mobile-menu').hidden=$('play-view').hidden;
 }
 function fitBoard(){
  if($('play-view').hidden)return;
  const height=['.masthead','#puzzle','.controls'].reduce((total,selector)=>
   total+document.querySelector(selector).getBoundingClientRect().height,24);
  board.style.setProperty('--mobile-chrome',height+'px');
 }
 phone.addEventListener('change',()=>{adjustPhone();if(session)drawPlan();fitBoard();});
 const fitObserver=new ResizeObserver(fitBoard);
 for(const selector of ['.masthead','#puzzle','.controls'])fitObserver.observe(document.querySelector(selector));
 $('mobile-menu').onclick=()=>{
  if(drag&&board.hasPointerCapture(drag.pointer))board.releasePointerCapture(drag.pointer);
  drag=null;
  if(!menu.open){menu.scrollTop=0;menu.showModal();menu.scrollTop=0;}
 };
 $('back-to-game').onclick=()=>menu.close();
 $('menu-home').onclick=$('puzzle-home').onclick=()=>showHome();
 const informationHome=$('information-panel').parentNode;
 function showMenuInformation(show){
  $('menu-lessons').hidden=!show;
  $('menu-content').hidden=show;
  $('menu-information').setAttribute('aria-expanded',String(show));
  if(show)$('menu-lessons').append($('information-panel'));
  else informationHome.insertBefore($('information-panel'),$('audio-settings'));
  $('information-panel').hidden=!show;
 }
 $('menu-information').onclick=()=>{const show=$('menu-lessons').hidden;showMenuInformation(show);if(show)renderChoices();};
 menu.addEventListener('close',()=>{if(!$('menu-lessons').hidden)showMenuInformation(false);});
 menu.addEventListener('close',()=>{if(!$('mobile-menu').hidden)$('mobile-menu').focus({preventScroll:true});});
 menu.addEventListener('click',event=>{
  if(event.target!==menu)return;
  const bounds=menu.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)menu.close();
 });
 const message=value=>{$('status').textContent=value;};

 function canOpen(index){
  return index>=campaignSize||index<=progress.reachedIndex();
 }
 function displayTerrain(map,cell){return map.rulesVersion>=4&&cell.terrain==='bank'?'land':cell.terrain;}
 function openLevel(index,saved=null,playMode='run'){
  if(!levels[index]||!canOpen(index))return;
  if(playMode!=='tutorial')tutorialReturn=null;
  mode=index>=campaignSize?(index<importIndex?'tutorial':'independent'):playMode;
  audio.scene('play');
  $('home').hidden=true;
  $('play-view').hidden=false;
  adjustPhone();
  if(menu.open)menu.close();
  document.querySelector('.campaign-picker').hidden=false;
  intro.hidden=index!==0||introSeen;
  tool='route';

  stopAnimation();
  drag=null;
  tunnelStart=null;
  session=window.EFSession.createSession(levels[index]);
  const {map}=session;
  levelIndex=index;
  const restored=session.restore(saved);
  if(restored&&session.state.phase==='complete')drawResult(session.evaluate());
  heardRoutes.clear();
  for(const route of session.state.routes)heardRoutes.add(route.element);
  if(index<campaignSize&&mode==='run')progress.select(levels[index].id);
  updateLevelLabels();
  for(const option of $('level').options){
   const candidate=Number(option.value);
   if(candidate>=campaignSize&&candidate<importIndex)option.hidden=candidate!==index;
  }
  $('level').value=index;
  $('menu-tip').hidden=!levels[index].lesson;
  $('puzzle-options').open=false;
  $('custom-level').open=false;
  $('import-error').textContent='';
  $('puzzle').textContent=map.name;
  $('description').textContent=map.description;
  $('puzzle-hint').open=false;
  $('puzzle-hint').hidden=!levels[index].hint;
  $('hint-text').textContent=levels[index].hint??'';
  board.style.setProperty('--cols',map.width);
  board.style.setProperty('--board-ratio',map.width/map.height);
  const firstSource=E.pairs(map)[0].source;
  tiles=map.cells.map((cell,i)=>{
   const tile=document.createElement('button');
   tile.type='button';
   tile.tabIndex=i===firstSource?0:-1;
   tile.dataset.index=i;
   tile.className='tile '+displayTerrain(map,cell);
   return tile;
  });
  board.replaceChildren(...tiles);
  const legend=E.pairs(map).map(({element})=>{
   const item=document.createElement('b');
   item.style.setProperty('--element',colors[element]);
   item.textContent=symbols[element]+' · '+F.ELEMENTS[element].name+(F.ELEMENTS[element].icon?' '+F.ELEMENTS[element].icon:'');
   return item;
  });
  $('elements').replaceChildren(...legend,document.createTextNode('S = source · D = destination'));
  $('link-id').value='A';
  $('phone-link-id').value='auto';
  drawPlan();
  update();
  persist();
  message(saved&&!restored?'This board changed. Your unlocked stages and scores were kept.':'');
  if(index<campaignSize&&levels[index].lesson&&!skipTutorialPopups&&!tipSeen(levels[index].id))showTip();
 }

 function campaignSnapshot(){
  return {id:levels[levelIndex].id,rules:levels[levelIndex].rulesVersion,layout:levels[levelIndex].layout??1,board:session.snapshot()};
 }

 function persist(){
  if(levelIndex<campaignSize&&mode==='run')progress.saveCampaign(campaignSnapshot());
  else if(levelIndex>=challengeStart&&activePack)progress.saveChallenge({
   pack:activePack,index:levelIndex-challengeStart,best:challengeBest,board:session.snapshot()
  });
 }

 function drawResult(result){
  const {points,available,tiles,unspent}=result;
  $('score').textContent=`${points} points`;
  $('score-details').open=false;
  $('score-base').textContent=`Board points ${available}`;
  $('score-route').textContent=`Route tiles −${2*tiles}`;
  $('score-bonus').hidden=!unspent;
  $('score-bonus').textContent=`Unused construction +${10*unspent}`;
  $('score-floor').hidden=available-2*tiles+10*unspent>=0;
  const id=levels[levelIndex].id;
  const best=levelIndex<campaignSize?progress.best(id):mode==='tutorial'?tutorialProgress.best(id):challengeBest[levelIndex-challengeStart];
  $('totals').textContent=best==null?'':`Stage best ${best}`+(levelIndex<campaignSize?` · Campaign total ${progress.total()}`:'');
 }

 function ready(){
  const result=session.evaluate();
  $('projected').hidden=!result.ok;
  $('check').classList.toggle('ready',result.ok);
  $('projected').textContent=result.ok?`Projected score ${result.points} points`:'';
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
    field.addEventListener('input',()=>{
     updateBudget();
     if(!$('start').disabled&&field.validity.valid){
      state.loadout=selection();
      persist();
     }
    });
    const stepper=document.createElement('span');
    stepper.className='stepper';
    const step=(sign,caption)=>{
     const button=document.createElement('button');
     button.type='button';
     button.textContent=caption;
     button.setAttribute('aria-label',(sign>0?'Add ':'Subtract ')+toolNames[kind]);
     button.onclick=()=>{
      field.value=Number(field.value)+sign;
      field.dispatchEvent(new Event('input'));
     };
     return button;
    };
    field.setAttribute('aria-label',toolNames[kind]+' quantity');
    field.readOnly=phone.matches;
    field.inputMode=phone.matches?'none':'numeric';
    stepper.append(step(-1,'−'),field,step(1,'+'));
    label.append(stepper);
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
  for(const field of $('loadout').querySelectorAll('input')){
   const [less,,more]=field.parentElement.children;
   const unit=field.name==='tunnel'?2:1;
   less.disabled=Number(field.value)<=0;
   more.disabled=Number(field.value)>=Number(field.max)||remaining<construction.prices[field.name]*unit;
  }
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
  if(tool==='portal'){
   const counts=new Map();
   for(const value of Object.values(state.placements))if(E.placementKind(value)==='portal')
    counts.set(value.pairId,(counts.get(value.pairId)||0)+1);
   const picker=$('phone-link-id');
   const previous=picker.value;
   picker.replaceChildren(new Option('Automatic pair','auto'),
    ...[...counts].filter(([,count])=>count===1).map(([id])=>new Option('Pair '+id,id)));
   if([...picker.options].some(option=>option.value===previous))picker.value=previous;
  }
  syncDragHandles();
  ready();
  $('instructions').textContent=tool==='remove'?'Choose a tool on the map to remove it.':
   tool==='route'?'Tap a source or unfinished tip to draw. Tap a placed tool to remove it when no route is active.':
   tool==='tunnel'?(tunnelStart===null?'Choose the first open tile for your tunnel.':
    'Choose the other opening at the opposite edge of the same ridge. Tap the first opening again or tap outside the board to cancel.'):
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
  $('puzzle-options').hidden=phase!=='build';
  $('build').hidden=phase!=='build';
  $('finish').hidden=phase!=='complete';
  $('engine-restoration').hidden=phase!=='complete';
  if(phase==='build')drawToolBar();
  $('next').disabled=mode==='independent'&&(levelIndex<challengeStart||levelIndex+1>=challengeEnd);
  $('next').textContent=mode==='tutorial'?(tutorialReturn?'Return to Stage':'Tutorials'):
   mode==='replay'?'Stage Select':levelIndex===campaignSize-1?'Campaign summary':levelIndex===chapterOneSize-1?'Start Chapter Two':'Next Stage';
  $('return-lesson').hidden=mode!=='tutorial';
  drawBoard();
 }

 function syncDragHandles(){
  const {state,map}=session;
  const tips=new Set(Object.values(state.drafts).map(route=>route.path.at(-1)));
  for(const [i,tile] of tiles.entries()){
   tile.classList.toggle('route-handle',state.phase==='build'&&tool==='route'&&
    (tips.has(i)||map.cells[i].node?.role==='source'));
  }
 }

 function drawBoard(){
  syncDragHandles();
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
  const landings=state.active?.element==='wind'?new Set(E.windLandings(map,state.active.path.at(-1),state.placements)):new Set();
  for(const [i,cell] of map.cells.entries()){
   const tile=tiles[i];
   const mark=document.createElement('span');
   const terrain=displayTerrain(map,cell);
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
   }else if(kind&&!window.EFBoardArt.structures.has(kind)){
    mark.classList.add('structure');
    const element=kind==='checkpoint'?cell.props?.element:null;
   mark.textContent=(componentSymbols[kind]||'')+(symbols[element]||link||arrows[cell.props?.direction]||'');
   if(colors[element])mark.style.color=colors[element];
   }else if(!kind&&!window.EFBoardArt.terrains.has(terrain)){
    mark.textContent=cell.terrain==='oneway'?arrows[cell.props?.direction||'E']:terrainSymbols[terrain]||'';
   }
   fragments[i].append(mark);
   tile.classList.toggle('wind-landing',landings.has(i));
   tile.classList.toggle('tunnel-preview',i===tunnelStart);
   tile.replaceChildren(fragments[i]);
   window.EFBoardArt.decorate(tile,kind,{link});
   const checkpoint=kind==='checkpoint'&&cell.props?.element&&cell.props.element!=='any'?F.ELEMENTS[cell.props.element].name+' ':'';
   const label=`Row ${Math.floor(i/map.width)+1}, column ${i%map.width+1}, `+
    (cell.node?`${F.ELEMENTS[cell.node.element].name} ${cell.node.role}`:kind?checkpoint+toolNames[kind]+(link?' '+link:''):(terrainNames[terrain]||terrain));
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
  if(element==='wind'&&map.cells[index].terrain==='void')return 'Tap the landing across one hole. Wind cannot stop in the Void.';
  if(result.message==='Element terrain restriction violated'){
   return F.ELEMENTS[element].name+' cannot cross '+map.cells[index].terrain+' on this level.';
  }
  if(result.message==='Element component restriction violated'){
   return F.ELEMENTS[element].name+' cannot use '+toolNames[E.effective(map,state.placements,index)].toLowerCase()+' on this level.';
  }
  if(/^Blocked terrain/.test(result.message)&&E.canPlace(map,state.placements,index,'bridge')&&state.loadout.bridge){
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

 function portalPair(){
  if(!phone.matches)return $('link-id').value.trim();
  const picker=$('phone-link-id');
  if(picker.value!=='auto')return picker.value;
  if(picker.options.length>1)return picker.options[1].value;
  const {map,state}=session;
  let number=1;
  const ids=new Set(map.cells.map((_,i)=>E.pairIdAt(map,state.placements,i)).filter(Boolean));
  while(ids.has('P'+number))number++;
  return 'P'+number;
 }
 function act(index,direct=false){
  if(session.state.phase!=='build')return;
  const {map,state}=session;
  const element=state.active?.element;
  const removePlaced=direct&&tool==='route'&&!element&&Object.hasOwn(state.placements,index);
  const bridgeTile=direct&&tool==='route'&&state.loadout.bridge>(E.placementCounts(state.placements).bridge||0)&&
   E.canPlace(map,state.placements,index,'bridge')&&(!element||
    Boolean(E.terrainError(map,element,index,null))&&!E.terrainError(map,element,index,'bridge'));
  if(tool==='tunnel'&&tunnelStart===index){cancelTool();return true;}
  if(tool==='tunnel'&&tunnelStart===null){
   if(!E.canPlace(map,state.placements,index,'tunnel')){message('Choose an open tile for the tunnel opening.');return false;}
   tunnelStart=index;
   drawBoard();
   drawToolBar();
   message('');
   return true;
  }
  const result=removePlaced?session.remove(index):bridgeTile?session.place(index,'bridge'):tool==='tunnel'?session.placeTunnel(tunnelStart,index):
   tool==='route'?session.route(index):tool==='remove'?session.remove(index):session.place(index,tool,tool==='portal'?portalPair():undefined);
  if(!result.ok){message(explainMove(result,index));return false;}
  if(!removePlaced&&(bridgeTile||tool!=='route'&&tool!=='remove'))audio.effect('build');
  if(tool==='route'&&element&&!state.active&&!heardRoutes.has(element)&&state.routes.some(route=>route.element===element)){
   heardRoutes.add(element);
   audio.effect('route');
  }
  message(removePlaced?'Tool removed.':'');
  tunnelStart=null;
  drawBoard();
  if(removePlaced||bridgeTile||tool!=='route'){tool='route';drawToolBar();}
  else ready();
  persist();
  return true;
 }

 function stopAnimation(){
  clearInterval(timer);
  timer=null;
  board.querySelectorAll('.orb').forEach(orb=>orb.remove());
  $('replay').disabled=false;
  $('skip-animation').hidden=true;
  board.classList.remove('harmony-pulse');
 }

 function animate(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let step=0;
  const {routes}=session.state;
  const count=Math.max(...routes.map(route=>route.path.length));
  $('replay').disabled=true;
  $('skip-animation').hidden=false;
  const advance=()=>{
   board.querySelectorAll('.orb').forEach(orb=>orb.remove());
   if(step>=count){stopAnimation();board.classList.add('harmony-pulse');return;}
   for(const {element,path} of routes){
    const orb=document.createElement('span');
    orb.className='orb';
    orb.style.setProperty('--line',colors[element]);
    tiles[path[Math.min(step,path.length-1)]].append(orb);
   }
   step++;
  };
  timer=setInterval(advance,Math.min(115,Math.ceil(2400/count)));
  advance();
 }

 $('plan').addEventListener('submit',event=>{
  event.preventDefault();
  const result=session.start(selection());
  if(!result.ok){message(result.message);return;}
  if(!intro.hidden)dismissIntro();
  tool='route';
  update();
  message('');
  focusSource();
  persist();
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
  if(menu.open)menu.close();
  stopAnimation();
  session.restart(replan);
  tunnelStart=null;
  $('puzzle-options').open=false;
  tool='route';
  drawPlan();
  update();
  message(replan?'Choose a new loadout.':'The board has been reset.');
  if(replan)$('start').focus();else focusSource();
  persist();
 }
 $('restart').onclick=()=>reset(false);
 $('replan').onclick=()=>{
  const {placements,routes,drafts}=session.state;
  const hasWork=Object.keys(placements).length||routes.length||Object.keys(drafts).length;
  if(hasWork&&!confirm('Restart this stage and choose tools again? This clears routes and placed tools.'))return;
  reset(true);
 };
 $('replay').onclick=()=>reset(true);
 $('undo').onclick=()=>{if(tool!=='route'){cancelTool();return;}if(session.undo()){drawBoard();drawToolBar();message('Last change undone.');persist();}};
 $('check').onclick=()=>{
  if(session.state.phase!=='build')return;
  const result=session.verify();
  if(!result.ok){message(result.message);return;}
  if(levelIndex<campaignSize){
   progress.complete(levels[levelIndex].id,result.points,mode==='run'?campaignSnapshot():null);
   updateLevelLabels();
  }else if(mode==='tutorial'){
   tutorialProgress.complete(levels[levelIndex].id,result.points);
  }else if(levelIndex>=challengeStart){
   const index=levelIndex-challengeStart;
   challengeBest={...challengeBest,[index]:Math.max(challengeBest[index]??0,result.points)};
   persist();
  }
  drawResult(result);
  update();
  message('');
  audio.effect('harmony');
  animate();
 };
 $('skip-animation').onclick=stopAnimation;
 $('next').onclick=()=>{
  if(session.state.phase!=='complete')return;
  if(mode==='tutorial')returnFromTutorial();
  else if(mode==='replay'){showHome();showPanel('stage-list');}
  else if(levelIndex===campaignSize-1)showHome();
  else openLevel(levelIndex+1);
 };
 $('level').onchange=()=>{
  importTicket++;
  const target=Number($('level').value);
  if(target!==levelIndex)openLevel(target,null,'replay');
 };
 $('import').onchange=async event=>{
  const input=event.target,file=input.files[0],ticket=++importTicket;
  input.value='';
  if(!file)return;
  $('import-error').textContent='';
  try{
   if(file.size>1024*1024)throw Error('Choose a level file smaller than 1 MiB.');
   const level=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
   if(ticket!==importTicket)return;
   if(level?.format==='element-forge-challenges'){startImportedPack(level);return;}
   const map=F.readLevel(level);
   const index=importIndex;
   levels[index]=level;
   $('level').querySelector('[data-import]')?.remove();
   const option=new Option(map.name+' (imported)',index);
   option.dataset.import='true';
   $('level').add(option);
   openLevel(index);
  }catch(error){if(ticket===importTicket)$('import-error').textContent='Import failed. '+error.message;}
 };
 function loadPack(pack,saved){
  pack=window.EFChallenges.repairGeneratedRivers(pack);
  const stages=window.EFChallenges.readPack(pack);
  activePack=pack;
  challengeBest=saved?.best||{};
  $('level').querySelector('[data-challenge-pack]')?.remove();
  const group=document.createElement('optgroup');
  group.label='Challenge pack';
  group.dataset.challengePack='';
  levels.length=challengeStart;
  levels.push(...stages);
  challengeEnd=challengeStart+stages.length;
  stages.forEach((stage,index)=>group.append(new Option(stage.map.name,challengeStart+index)));
  $('level').append(group);
  const index=Number.isInteger(saved?.index)&&saved.index>=0&&saved.index<stages.length?saved.index:0;
  openLevel(challengeStart+index,saved?.board);
 }

 function startImportedPack(pack){
  loadPack(pack);
  $('challenge-library').open=false;
  message(`Imported ${challengeEnd-challengeStart} puzzles. Find them under Challenges on the home screen.`);
 }

 $('curated-pack').onclick=()=>{loadPack(window.EFRevisedBoards.pack);$('challenge-library').open=false;};
 async function importPack(event){
  const input=event.currentTarget;
  const file=input.files[0];
  input.value='';
  if(!file)return;
  const fromHome=input.id==='home-pack-file';
  const status=$(fromHome?'challenge-status':'pack-import-error');
  status.textContent='';
  const ticket=++importTicket;
  try{
   if(file.size>1024*1024)throw Error('Choose a pack smaller than 1 MiB.');
   const pack=window.EFChallenges.repairGeneratedRivers(JSON.parse((await file.text()).replace(/^\uFEFF/,'')));
   if(ticket!==importTicket||fromHome===$('home').hidden)return;
   if(fromHome){
    const puzzles=window.EFChallenges.readPack(pack);
    progress.saveChallenge({pack,index:0,best:{},board:null});
    renderChallengeChoices();
    status.textContent=`Imported ${puzzles.length} puzzle${puzzles.length===1?'':'s'}. Choose one below.`;
   }else startImportedPack(pack);
  }catch(error){if(ticket===importTicket)status.textContent='Pack import failed. '+error.message;}
 }
 $('pack-file').onchange=importPack;
 $('home-pack-file').onchange=importPack;
 board.addEventListener('click',event=>{
  const tile=event.target.closest('.tile');
  if(tile)act(Number(tile.dataset.index),true);
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
   act(index,true);
  }
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
  if(stride&&index!==tip&&E.linkPartner(map,tip,session.state.placements)!==index&&
     !(session.state.active.element==='wind'&&E.windLandings(map,tip,session.state.placements).includes(index))){
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
  persist();
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!menu.open&&!$('mechanic-tip').open&&session?.state.phase==='build'&&tool!=='route'){event.preventDefault();cancelTool();}
 });
 document.addEventListener('pointerdown',event=>{
  if(session?.state.phase==='build'&&tool==='tunnel'&&!board.contains(event.target)&&
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
  const second=levelIndex>=chapterOneSize&&levelIndex<campaignSize;
  const stages=second?levels.slice(chapterOneSize,campaignSize):levels.slice(0,chapterOneSize);
  $('campaign-progress').textContent=`${stages.filter(level=>progress.hasCompleted(level.id)).length} / ${stages.length} complete`;
 }
 const introKey='element-forge.world-engine-intro.v1';
 const intro=$('world-intro');
 let introSeen=false;
 try{introSeen=storage?.getItem(introKey)==='seen';}catch{}
 function dismissIntro(){
  intro.hidden=true;
  introSeen=true;
  try{storage?.setItem(introKey,'seen');}catch{}
 }
 function runTarget(){
  const saved=progress.campaign();
  const index=levels.slice(0,campaignSize).findIndex(level=>level.id===saved?.id);
  if(index<0)return null;
  if(saved.board?.phase==='complete'){
   if(index===campaignSize-1)return {complete:true};
   return {index:index+1};
  }
  const changed=(saved.layout??1)!==(levels[index].layout??1);
  return {index,changed,board:!changed&&saved.rules===levels[index].rulesVersion?saved.board:null};
 }
 function continueCampaign(){
  const target=runTarget();
  if(!target||target.complete)return;
  openLevel(target.index,target.board);
  if(target.changed)message('This stage has a new layout. The board restarted; your unlocks and old layout score were kept.');

 }
 const panels=['stage-list','information-panel','audio-settings','challenge-menu'];
 function showPanel(id){
  for(const panel of panels)$(panel).hidden=panel!==id;
 }
 function makeChoice(parent,label,callback,disabled=false){
  const button=document.createElement('button');
  button.type='button';
  button.textContent=label;
  button.disabled=disabled;
  button.onclick=callback;
  parent.append(button);
 }
 function renderChallengeChoices(){
  const saved=progress.challenge();
  const list=$('challenge-puzzles');
  list.replaceChildren();
  list.hidden=true;
  $('resume-challenge').hidden=!saved?.pack||!saved.board;
  if(!saved?.pack)return;
  try{
   window.EFChallenges.readPack(saved.pack).forEach(({map},index)=>makeChoice(list,
    `${index+1}. ${map.name}`,()=>loadPack(saved.pack,{...saved,index,board:index===saved.index?saved.board:null})));
   list.hidden=false;
  }catch{}
 }
 function renderChoices(){
  $('stage-list').replaceChildren();
  levels.slice(0,campaignSize).forEach((level,index)=>{
   if(index===0||index===chapterOneSize){
    const heading=document.createElement('h3');
    heading.textContent=index===0?'Chapter One · The Sleeping Valley':'Chapter Two · The Gatekeepers';
    $('stage-list').append(heading);
   }
   makeChoice($('stage-list'),`${index+1}. ${level.map.name}${progress.hasCompleted(level.id)?' ✓':''}`,
    ()=>openLevel(index,null,'replay'),!canOpen(index));
  });
  $('tutorial-list').replaceChildren();
  const groups=[['Route basics and elements',0,11],['Construction and combined routing',11,17],['Wind practice',17,18]];
  for(const [title,start,end] of groups){
   const heading=document.createElement('h3');
   heading.textContent=title;
   $('tutorial-list').append(heading);
   tutorials.slice(start,end).forEach((level,index)=>makeChoice($('tutorial-list'),
    level.map.name+(tutorialProgress.hasCompleted(level.id)?' ✓':''),
    ()=>{tutorialReturn=menu.open?{index:levelIndex,board:session.snapshot(),mode}:null;openLevel(campaignSize+start+index,null,'tutorial');}));
  }
 }
 let seenTips=new Set();
 const tipsKey='element-forge.chapter-one.tips.v1';
 try{
  const saved=JSON.parse(storage?.getItem(tipsKey)??'[]');
  if(Array.isArray(saved))seenTips=new Set(saved);
 }catch{}
 const popupKey='element-forge.skip-tutorial-popups.v1';
 let skipTutorialPopups=false;
 try{skipTutorialPopups=storage?.getItem(popupKey)==='yes';}catch{}
 const popupControls=[$('skip-tutorial-popups'),$('settings-skip-tutorial-popups')];
 for(const control of popupControls){
  control.checked=skipTutorialPopups;
  control.onchange=()=>{
   skipTutorialPopups=control.checked;
   for(const input of popupControls)input.checked=skipTutorialPopups;
   try{storage?.setItem(popupKey,skipTutorialPopups?'yes':'no');}catch{}
  };
 }
 const tip=$('mechanic-tip');
 function tipSeen(id){return seenTips.has(id);}
 function dismissTip(){
  seenTips.add(levels[levelIndex].id);
  try{storage?.setItem(tipsKey,JSON.stringify([...seenTips]));}catch{}
  tip.close();
 }
 function showTip(){
  const lesson=tutorials.find(level=>level.id===levels[levelIndex].lesson);
  if(!lesson)return;
  if(menu.open)menu.close();
  if(tip.open)return;
  $('tip-name').textContent=lesson.map.name;
  $('tip-description').textContent=lesson.map.description;
  tip.showModal();
 }
 function returnFromTutorial(){
  const target=tutorialReturn;
  tutorialReturn=null;
  if(target)openLevel(target.index,target.board,target.mode);
  else{showHome();showPanel('information-panel');}
 }
 $('menu-tip').onclick=showTip;
 $('continue-stage').onclick=dismissTip;
 tip.addEventListener('cancel',event=>{event.preventDefault();dismissTip();});
 $('try-lesson').onclick=()=>{
  const index=tutorials.findIndex(level=>level.id===levels[levelIndex].lesson);
  if(index<0)return;
  tutorialReturn={index:levelIndex,board:session.snapshot(),mode};
  dismissTip();
  openLevel(campaignSize+index,null,'tutorial');
 };
 $('return-lesson').onclick=returnFromTutorial;
 function showHome(){
  stopAnimation();
  audio.scene('home');
  $('home').hidden=false;
  $('play-view').hidden=true;
  adjustPhone();
  if(menu.open)menu.close();
  if(!$('menu-lessons').hidden)showMenuInformation(false);
  if(tip.open)tip.close();
  document.querySelector('.campaign-picker').hidden=true;
  intro.hidden=true;
  const target=runTarget();
  document.body.classList.toggle('chapter-restored',Boolean(target?.complete));
  $('continue').disabled=!target||Boolean(target.complete);
  $('home-total').textContent=target?.complete?'Campaign complete · The Gatekeepers restored':
   target?`${target.index<chapterOneSize?'Chapter One':'Chapter Two'} · Stage ${target.index+1} of ${campaignSize} · Campaign best total ${progress.total()}`:'Chapter One · The Sleeping Valley';
  renderChallengeChoices();
  showPanel(null);
  renderChoices();
  (target&&!target.complete?$('continue'):$('new-campaign')).focus();
 }
 $('intro-begin').onclick=dismissIntro;
 $('intro-skip').onclick=dismissIntro;
 $('home-button').onclick=showHome;
 $('continue').onclick=continueCampaign;
 $('stage-select').onclick=()=>showPanel($('stage-list').hidden?'stage-list':null);
 $('information').onclick=()=>showPanel($('information-panel').hidden?'information-panel':null);
 $('settings').onclick=()=>showPanel($('audio-settings').hidden?'audio-settings':null);
 $('new-campaign').onclick=()=>{
  const target=runTarget();
  if(target&&!target.complete&&!confirm('Replace your active run? Stage unlocks and personal bests are kept.'))return;
  openLevel(0);
 };
 $('choose-challenge').onclick=()=>showPanel($('challenge-menu').hidden?'challenge-menu':null);
 for(const key of ['music','effects']){
  const input=$(key+'-enabled');
  input.checked=audio.preferences[key];
  input.onchange=()=>audio.set(key,input.checked);
 }
 $('home-curated').onclick=()=>loadPack(window.EFRevisedBoards.pack);
 $('resume-challenge').onclick=()=>{
  const saved=progress.challenge();
  try{loadPack(saved.pack,saved);}catch{progress.saveChallenge(null);$('resume-challenge').hidden=true;
   $('challenge-status').textContent='This saved challenge could not be opened.';}
 };
 $('generate-challenge').onclick=()=>{
  const button=$('generate-challenge'),status=$('challenge-status');
  const difficulty=$('challenge-tier').value;
  button.disabled=true;
  status.textContent='Verifying a puzzle…';
  setTimeout(()=>{
   try{
    const {pack}=window.EFChallenges.generate({difficulty,count:1,attempts:48,seed:String(Date.now())});
    if(pack.stages.length)loadPack(pack);
    else{
     const reference=window.EFRevisedBoards.pack.stages.find(stage=>stage.difficulty===difficulty);
     if(reference)loadPack({...window.EFRevisedBoards.pack,stages:[reference]});
     else status.textContent='No verified puzzle found at this difficulty. Try again or open the curated pack.';
    }
   }catch(error){status.textContent=error.message;}
   finally{button.disabled=false;}
  },0);
 };
 for(const [index,level] of levels.entries())$('level').add(new Option(level.map.name+(index>=campaignSize?' · Tutorial':''),index));
 updateLevelLabels();
 showHome();
})();
