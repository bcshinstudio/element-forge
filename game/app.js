'use strict';
(()=>{
 const E=window.EFEngine,F=window.EFMap;
 const editorDraft=window.EFEditorDraft;
 const chapterOneSize=window.EFChapter.chapter.length;
 const chapters=[
  {title:'Chapter One',name:'The Sleeping Valley',stages:window.EFChapter.chapter},
  {title:'Chapter Two',name:'The Gatekeepers',stages:window.EFChapter.chapterTwo},
  {title:'Chapter Three',name:'The Primeval Crucible',stages:window.EFChapter.chapterThree},
  {title:'Chapter Four',name:'The Astral Loom',stages:window.EFChapter.chapterFour},
  {title:'Chapter Five',name:'The Celestial Confluence',stages:window.EFChapter.chapterFive},
  {title:'Chapter Six',name:"The Weaver's Playground",stages:window.EFChapter.chapterSix},
  {title:'Chapter Seven',name:'The Shattered Abyss',stages:window.EFChapter.chapterSeven},
  {title:'Chapter Eight',name:'The World-Heart Sanctuary',stages:window.EFChapter.chapterEight},
  {title:'Chapter Nine',name:'The Confluence Forges',stages:window.EFChapter.chapterNine}
 ];
 let offset=0;
 for(const chapter of chapters){
  chapter.start=offset;
  offset+=chapter.stages.length;
 }
 const chapterAt=index=>chapters.findLast(chapter=>index>=chapter.start);
 const isChapterEnd=index=>index<campaignSize&&index===chapterAt(index).start+chapterAt(index).stages.length-1;
 const levels=chapters.flatMap((chapter,index)=>chapter.stages.map(level=>window.EFVariants.campaignLevel(level,index)));
 const campaignSize=levels.length;
 const tutorials=[...window.EFLevels.catalog,window.EFLevels.prototype,...window.EFChapter.archivedTutorials];
 levels.push(...tutorials);
 const importIndex=levels.length;
 let storage;
 try{if(!editorDraft)storage=window.localStorage;}catch{}
 const progress=window.EFProgress.createProgress(storage,levels.slice(0,campaignSize).map(level=>level.id),levels[0].rulesVersion,'element-forge.sleeping-valley.v1',Object.fromEntries(levels.slice(0,campaignSize).map(level=>[level.id,level.layout??1])),'element-forge.chapter-one.v1');
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
 toolNames.tunnel='Tunnel';
 let session,tiles,tool,linkStart=null,levelIndex,timer=null,drag=null,importTicket=0;
 let storyExpanded=false;
 const phone=matchMedia('(max-width: 600px), (hover: none) and (max-width: 950px)');
 const menu=$('game-menu');
 const menuItems=[document.querySelector('.campaign-picker'),$('elements'),$('instructions'),
  $('puzzle-hint'),$('puzzle-options'),$('challenge-library'),$('custom-level')];
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
  const height=['.masthead','.field .stage-heading','#description','.controls'].reduce((total,selector)=>
   total+document.querySelector(selector).getBoundingClientRect().height,24);
  board.style.setProperty('--mobile-chrome',height+'px');
 }
 phone.addEventListener('change',()=>{adjustPhone();if(session)drawPlan();fitBoard();});
 const fitObserver=new ResizeObserver(fitBoard);
 for(const selector of ['.masthead','.field .stage-heading','#description','.controls'])fitObserver.observe(document.querySelector(selector));
 $('mobile-menu').onclick=()=>{
  if(drag&&board.hasPointerCapture(drag.pointer))board.releasePointerCapture(drag.pointer);
  drag=null;
  if(!menu.open){menu.scrollTop=0;menu.showModal();menu.scrollTop=0;}
 };
 $('back-to-game').onclick=()=>menu.close();
 $('menu-home').onclick=$('puzzle-home').onclick=()=>showHome();
 const informationHome=$('information-panel').parentNode;
 function showMenuInformation(show){
  $('menu-main').hidden=show;
  $('menu-lessons').hidden=!show;
  $('menu-information').setAttribute('aria-expanded',String(show));
  $('game-menu-title').textContent=show?'Guide':'Game menu';
  if(show)$('menu-lessons').append($('information-panel'));
  else informationHome.insertBefore($('information-panel'),$('audio-settings'));
  $('information-panel').hidden=!show;
  $('info-back').hidden=show;
  menu.scrollTop=0;
  if(show)$('menu-lessons-back').focus({preventScroll:true});
 }
 $('menu-information').onclick=()=>{showMenuInformation(true);renderChoices();};
 $('menu-lessons-back').onclick=()=>{
  showMenuInformation(false);
  $('menu-information').focus({preventScroll:true});
 };
 menu.addEventListener('close',()=>{if(!$('menu-lessons').hidden)showMenuInformation(false);});
 menu.addEventListener('close',()=>{if(!$('mobile-menu').hidden)$('mobile-menu').focus({preventScroll:true});});
 menu.addEventListener('click',event=>{
  if(event.target!==menu)return;
  const bounds=menu.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)menu.close();
 });
 function message(value,undoBridge=false){
  $('status').textContent=value;
  $('undo-bridge').hidden=!undoBridge;
 }
 function bridgeClearsRoute(index){
  const {routes,drafts}=session.state;
  return [...routes,...Object.values(drafts)].some(route=>route.path.length>1&&route.path.includes(index));
 }
 function bridgeRemoved(clearedRoute){
  message(clearedRoute?'Bridge removed. Route cleared.':'Bridge removed.',clearedRoute);
 }

 // Review access is deliberately transient: no completion or unlock records are written.
 let developerReviewUnlocked=false;
 function canOpen(index){
  return developerReviewUnlocked||index>=campaignSize||index<=progress.reachedIndex();
 }
 function displayTerrain(map,cell){return map.rulesVersion>=4&&cell.terrain==='bank'?'land':cell.terrain;}
 function openLevel(index,saved=null,playMode='run'){
  if(!levels[index]||!canOpen(index))return;
  if(playMode!=='tutorial')tutorialReturn=null;
  mode=index>=campaignSize?(index<importIndex?'tutorial':'independent'):playMode;
  audio.scene(index<campaignSize?window.EFAudio.chapterTheme(chapters.indexOf(chapterAt(index))):'valley');
  $('home').hidden=true;
  $('play-view').hidden=false;
  adjustPhone();
  if(menu.open)menu.close();
  document.querySelector('.campaign-picker').hidden=false;
  tool='route';

  stopAnimation();
  drag=null;
  linkStart=null;
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
  const chapter=index<campaignSize?chapterAt(index):null;
  $('stage-number').hidden=!chapter;
  $('stage-number').textContent=chapter?`Chapter ${chapters.indexOf(chapter)+1} · Stage ${index-chapter.start+1}`:'';

  $('description').textContent=map.description;
  storyExpanded=false;
  $('description').hidden=session.state.phase!=='inspect';
  $('story-toggle').setAttribute('aria-expanded','false');
  $('story-toggle').setAttribute('aria-label','Show stage story');
  $('story-toggle').title='Show stage story';
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
  const legend=[...new Set(E.pairs(map).map(pair=>pair.element))].map(element=>{
   const item=document.createElement('b');
   item.style.setProperty('--element',colors[element]);
   item.className='legend-element';
   item.textContent=symbols[element]+' · '+F.ELEMENTS[element].name;
   if(F.ELEMENTS[element].icon){
    const icon=document.createElement('span');
    icon.className='legend-icon';
    icon.setAttribute('aria-hidden','true');
    icon.textContent=F.ELEMENTS[element].icon;
    item.append(icon);
   }
   return item;
  });
  $('elements').replaceChildren(...legend,endpointKey());
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

 const toolUnit=kind=>['portal','tunnel'].includes(kind)?2:1;
 function toolEntries(){return Object.entries(session.map.inventory).filter(([,count])=>count>0);}

 function drawPlan(){
  const {map,state}=session;
  const rows=toolEntries().map(([kind,count])=>{
   const label=document.createElement('label');
   label.className='loadout-row';
   const unit=toolUnit(kind);
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
  $('tool-availability').hidden=!rows.length;
  $('loadout').replaceChildren(...rows);
  updateBudget();
 }

 function selection(){
  return Object.fromEntries([...$('loadout').querySelectorAll('input')].map(field=>[field.name,Number(field.value)*toolUnit(field.name)]));
 }

 function updateBudget(){
  const construction=session.map.construction;
  $('budget').hidden=!construction;
  if(!construction){
   $('start').disabled=false;
   $('budget').textContent='';
   return;
  }
  const remaining=construction.budget-E.constructionCost(session.map,selection());
  $('budget').textContent=remaining<0?`${-remaining} points over budget`:`${remaining} of ${construction.budget} points available`;
  $('start').disabled=remaining<0;
  for(const field of $('loadout').querySelectorAll('input')){
   const [less,,more]=field.parentElement.children;
   const unit=toolUnit(field.name);
   less.disabled=Number(field.value)<=0;
   more.disabled=Number(field.value)>=Number(field.max)||remaining<construction.prices[field.name]*unit;
  }
 }

 function drawToolBar(){
  const {state}=session;
  const counts=E.placementCounts(state.placements);
  const remaining=Object.fromEntries(toolEntries().map(([kind])=>[kind,(state.loadout[kind]||0)-(counts[kind]||0)]));
  for(const kind of ['tunnel','portal'])remaining[kind]=Math.floor((remaining[kind]||0)/2);
  const choices=Object.entries(remaining).filter(([kind,count])=>kind!=='bridge'&&count>0)
   .map(([kind,count])=>[kind,`${toolNames[kind]} × ${count}`]);
  if(tool==='remove'&&!Object.keys(state.placements).length||Object.hasOwn(remaining,tool)&&remaining[tool]<=0)tool='route';
  const toolbar=$('tools');
  const current=new Map([...toolbar.children].map(button=>[button.dataset.tool,button]));
  for(const [kind,button] of current){
   if(!choices.some(([available])=>available===kind))button.remove();
  }
  for(const [kind,label] of choices){
   const button=current.get(kind)??document.createElement('button');
   button.type='button';
   button.dataset.tool=kind;
   button.setAttribute('aria-pressed',String(kind===tool));
   button.textContent=label;
   if(button.parentNode!==toolbar)toolbar.append(button);
  }
  toolbar.hidden=!choices.length;
  $('bridge-count').hidden=!state.loadout.bridge;
  $('bridge-count').textContent=`Bridges left: ${remaining.bridge??0}`;
  $('bridge-hint').hidden=!remaining.bridge;
  $('remove').hidden=!Object.keys(state.placements).length;
  $('remove').setAttribute('aria-pressed',String(tool==='remove'));
  $('puzzle-options').hidden=!session.map.construction;
  $('restart').hidden=!session.map.construction;
  syncDragHandles();
  ready();
  $('instructions').textContent=tool==='remove'?'Choose a tool on the map to remove it.':
   tool==='route'?'Drag from a source or route tip. Tap a placed bridge again to remove it.':
   tool==='tunnel'?(linkStart===null?'Choose the first open tile for your tunnel.':
    'Choose the other opening at the opposite edge of the same ridge. Tap the first opening or tool button again to cancel.'):
   tool==='portal'?(linkStart===null?'Choose the first portal opening.':'Choose the exit opening. Tap the first opening or tool button again to cancel.'):
   'Choose a tile for your '+toolNames[tool].toLowerCase()+'.';
 }

 function update(){
  const phase=session.state.phase;
  $('phase').textContent={inspect:'Plan your route',build:'Build the network',complete:'Delivery complete'}[phase];
  $('phase-indicator').hidden=!E.hasPhases(session.map);
  if(E.hasPhases(session.map)){
   const night=session.state.dayPhase==='night';
   $('phase-indicator').textContent=night?'☾ Night · Day deliveries preserved':'☀ Day · Complete the plate route to switch';
   $('phase-indicator').dataset.dayPhase=session.state.dayPhase;
  }
  $('instructions').textContent={
   inspect:session.map.construction?'Choose tools within the available budget.':'',
   build:'',
   complete:'Every element reached its destination.'
  }[phase];
  $('plan').hidden=phase!=='inspect';
  $('puzzle-options').hidden=phase!=='build'||!session.map.construction;
  $('routing-goal').hidden=mode!=='tutorial';
  // The complete stage description is shown while planning, with no book button.
  // During actual routing it stays collapsed unless the player opens it.
  $('description').hidden=phase!=='inspect'&&!storyExpanded;
  $('story-toggle').hidden=phase==='inspect'||!$('description').textContent.trim();
  $('story-toggle').setAttribute('aria-expanded',String(phase!=='inspect'&&storyExpanded));
  $('story-toggle').setAttribute('aria-label',storyExpanded?'Hide stage story':'Show stage story');
  $('story-toggle').title=storyExpanded?'Hide stage story':'Show stage story';
  const note=window.EFReference.notes[levels[levelIndex].id];
  $('stage-note').replaceChildren(...(note??[]).map(([label,copy])=>{
   const line=document.createElement('p');
   const strong=document.createElement('strong');
   strong.textContent=label+' · ';
   line.append(strong,copy);
   return line;
  }));
  $('stage-note').hidden=!note;

  $('build').hidden=phase!=='build';
  $('finish').hidden=phase!=='complete';
  $('engine-restoration').hidden=phase!=='complete';
  if(phase==='build')drawToolBar();
  $('next').disabled=mode==='independent'&&(levelIndex<challengeStart||levelIndex+1>=challengeEnd);
  $('next').textContent=mode==='tutorial'?(tutorialReturn?'Return to Stage':'Tutorials'):
   mode==='replay'?'Stage Select':mode==='run'&&isChapterEnd(levelIndex)?'Chapter Ending':'Next Stage';
  $('return-lesson').hidden=mode!=='tutorial';
  drawBoard();
 }

 function syncDragHandles(){
  const {state,map}=session;
  const tips=new Set(state.routes.map(route=>route.path.at(-1)));
  for(const {path} of Object.values(state.drafts)){
   tips.add(path.at(-1));
   const exit=E.portalExit(map,path,state.placements);
   if(exit>=0&&exit!==null)tips.add(exit);
  }
  for(const [i,tile] of tiles.entries()){
   tile.classList.toggle('route-handle',state.phase==='build'&&tool==='route'&&
    (tips.has(i)||map.cells[i].node?.role==='source'||map.cells[i].component==='confluence'));
  }
 }

 const badgePaths={
  arrow:'M3 10h11V5l7 7-7 7v-5H3z',
  sun:'M12 7a5 5 0 1 0 0 10 5 5 0 1 0 0-10 M11 1h2v4h-2z M11 19h2v4h-2z M1 11h4v2H1z M19 11h4v2h-4z M4 3l3 3-1 1-3-3z M20 3l1 1-3 3-1-1z M3 20l3-3 1 1-3 3z M17 18l1-1 3 3-1 1z',
  moon:'M16 2A10 10 0 1 0 20 19 9 9 0 0 1 16 2z',
  checkpoint:'M8 4h2v16H8z M10 5h9l-3 4 3 4h-9z',
  check:'m4 13 5 5L21 6l-2-2L9 14l-3-3z'
 };
 function badgeIcon(kind){
  const ns='http://www.w3.org/2000/svg';
  const icon=document.createElementNS(ns,'svg');
  icon.setAttribute('viewBox','0 0 24 24');
  const path=document.createElementNS(ns,'path');
  path.setAttribute('d',badgePaths[kind]);
  icon.append(path);
  return icon;
 }
 function boardBadge(kind,{direction='E',element,visited}={}){
  const badge=document.createElement('span');
  badge.className='board-badge badge-'+kind;
  badge.setAttribute('aria-hidden','true');
  badge.append(badgeIcon(kind));
  if(kind==='arrow')badge.dataset.direction=direction;
  if(colors[element])badge.style.setProperty('--flag',colors[element]);
  if(visited){
   badge.style.setProperty('--rim',colors[visited]);
   badge.dataset.visited='true';
   const check=badgeIcon('check');
   check.classList.add('badge-check');
   badge.append(check);
  }
  return badge;
 }
 function drawBoard(){
  syncDragHandles();
  const {map,state}=session;
  const visible=E.phaseView(map,state.dayPhase);
  // Routes update the board without calling update(); refresh the phase badge here.
  if(E.hasPhases(map)){
   const night=state.dayPhase==='night';
   $('phase-indicator').textContent=night?'☾ Night · Day deliveries preserved':'☀ Day · Complete the plate route to switch';
   $('phase-indicator').dataset.dayPhase=state.dayPhase;
  }
  const fragments=tiles.map(()=>document.createDocumentFragment());
  for(const {element,path} of [...state.routes.filter(route=>!state.drafts[E.routeKey(map,route.element,route.path[0])]),...Object.values(state.drafts)]){
   for(const [j,i] of path.entries()){
    const line=document.createElement('span');
    line.className='track';
    line.dataset.element=element;
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
    const structure=E.effective(map,state.placements,i);
    if(structure==='bridge'||structure==='metalSpan'){
     const deck=line.cloneNode(true);
     deck.className='span-edge span-'+structure;
     if(line.querySelector('.north,.south')&&line.querySelector('.west,.east'))deck.classList.add('span-bend');
     fragments[i].prepend(deck);
    }
    fragments[i].append(line);
   }
  }
  const landings=state.active?.element==='wind'?new Set(E.windLandings(map,state.active.path.at(-1),state.placements)):new Set();
  for(const [i,cell] of map.cells.entries()){
   const tile=tiles[i];
   const mark=document.createElement('span');
   const displayCell=visible.cells[i];
   const terrain=displayTerrain(visible,displayCell);
   tile.classList.toggle('exposed',terrain==='exposed');
   tile.classList.toggle('covered',terrain==='covered');
   tile.classList.toggle('phase-shifting',Boolean(cell.props?.phaseShift));
   const kind=E.effective(map,state.placements,i);
   const link=E.pairIdAt(map,state.placements,i);
   const fixed=cell.component===kind;
   const spec=fixed?cell.componentArt:map.toolArt?.[kind];
   const variant=window.EFVariants?.resolve(spec,kind);
   const route=fragments[i].querySelector('.track');
   const vertical=route?Boolean(route.querySelector('.north,.south')):undefined;
   const appearance=!fixed?window.EFVariants?.toolAppearance(spec,kind,vertical):spec;
   mark.className='mark';
   if(cell.node){
    mark.classList.add('endpoint',cell.node.role);
    mark.style.setProperty('--element',colors[cell.node.element]);
    mark.textContent=symbols[cell.node.element];
    }else if(kind==='confluence'){
    const chamber=E.confluenceAt(map,i),recipe=chamber&&E.confluenceRecipe(cell.props);
    const inputReady=Boolean(chamber&&chamber.inputs.every(element=>
     state.routes.some(route=>route.element===element&&route.path.at(-1)===i)));
    mark.classList.add('confluence-mark');
    const core=document.createElement('span');
    core.className='confluence-core';
    core.textContent='◇';
    mark.append(core);
    if(chamber&&recipe){
     const ports=[[recipe.inputs[0],chamber.ports[recipe.inputs[0]]],[recipe.inputs[1],chamber.ports[recipe.inputs[1]]],[recipe.output,chamber.ports[recipe.output]]];
     for(const [element,side] of ports){
      const port=document.createElement('span');
      port.className='confluence-port confluence-'+element+' port-'+side;
      port.style.background=colors[element];
      port.textContent=symbols[element];
      port.title=F.ELEMENTS[element].name;
      mark.append(port);
     }
    }
    tile.classList.toggle('confluence-ready',inputReady);
    tile.classList.toggle('confluence-pending',!inputReady);
   }else if(kind==='phasePlate'){
    mark.classList.add('structure','phase-plate-mark');
    const triggered=state.routes.some(r=>E.phaseTriggerRoute(map,r));
    mark.textContent=triggered?'☾':'☀';
    mark.title='Day/Night pressure plate · '+F.ELEMENTS[cell.props.element].name+' delivery';
   }else if(kind==='checkpoint'){
    const element=cell.props?.element;
    const visited=[...fragments[i].querySelectorAll('.track')].find(line=>
     !element||element==='any'||line.dataset.element===element)?.dataset.element;
    mark.append(boardBadge('checkpoint',{element,visited}));
   }else if(kind==='gate'||terrain==='oneway'){
    mark.append(boardBadge('arrow',{direction:cell.props?.direction}));
   }else if(terrain==='exposed'||terrain==='covered'){
    mark.append(boardBadge(terrain==='exposed'?'sun':'moon'));
   }else if(kind&&!window.EFBoardArt.structures.has(kind)){
    mark.classList.add('structure');
    mark.textContent=variant?'':componentSymbols[kind]||'';
   }else if(!kind&&!window.EFBoardArt.terrains.has(terrain)&&!window.EFVariants?.resolve(cell.terrainArt,cell.terrain)){
    mark.textContent=terrainSymbols[terrain]||'';
   }
   if(kind==='intersection'&&fragments[i].querySelectorAll('.track').length===2){
    for(const track of fragments[i].querySelectorAll('.track')){
     track.classList.add(track.querySelector('.north,.south')?'crossing-under':'crossing-over');
    }
   }
   if(variant&&mark.classList.contains('structure'))mark.classList.add('terrain-marker');
   fragments[i].append(mark);
   tile.classList.toggle('wind-landing',landings.has(i));
   const pendingOpening=i===linkStart?tool:null;
   tile.classList.toggle('tunnel-preview',Boolean(pendingOpening));
   const terrainLayer=tile.querySelector('.terrain-variant');
   if(terrainLayer)tile.replaceChildren(terrainLayer,fragments[i]);
   else{
    tile.replaceChildren(fragments[i]);
    window.EFBoardArt.setTerrain(tile,terrain,cell.props?.phaseShift&&state.dayPhase==='night'?undefined:cell.terrainArt);
   }
   window.EFBoardArt.decorate(tile,pendingOpening??kind,{link,spec:pendingOpening?map.toolArt?.[pendingOpening]:appearance});
   const checkpoint=kind==='checkpoint'&&cell.props?.element&&cell.props.element!=='any'?F.ELEMENTS[cell.props.element].name+' ':'';
   const label=`Row ${Math.floor(i/map.width)+1}, column ${i%map.width+1}, `+
    (cell.node?`${F.ELEMENTS[cell.node.element].name} ${cell.node.role}`:kind?checkpoint+toolNames[kind]+(link?' '+link:''):(terrainNames[terrain]||terrain));
   const direction=kind==='gate'||terrain==='oneway'?' '+(cell.props?.direction??'E'):'';
   const visited=mark.querySelector('[data-visited]')?' · visited':'';
   const chamber=kind==='confluence'?E.confluenceAt(map,i):null;
   const reaction=chamber?
    ' · '+chamber.inputs.map(el=>F.ELEMENTS[el].name).join(' + ')+' → '+F.ELEMENTS[chamber.output].name+
    ' · '+chamber.inputs.map(el=>F.ELEMENTS[el].name+' enters '+chamber.ports[el]).join(', ')+
    ', '+F.ELEMENTS[chamber.output].name+' exits '+chamber.ports[chamber.output]+
    (tile.classList.contains('confluence-ready')?' · inputs ready':' · inputs pending'):'';
   const tileLabel=pendingOpening?label+' · '+toolNames[pendingOpening]+' opening selected':label+direction+visited+reaction+(cell.props?.phaseShift?' · Day/Night shifting channel':'');
   tile.title=tileLabel;
   tile.setAttribute('aria-label',tileLabel);
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
   return F.ELEMENTS[element].name+' cannot cross '+terrainNames[map.cells[index].terrain].toLowerCase()+' on this level.';
  }
  if(result.message==='Element component restriction violated'){
   return F.ELEMENTS[element].name+' cannot use '+toolNames[E.effective(map,state.placements,index)].toLowerCase()+' on this level.';
  }
  if(result.message==='Different elements cannot share a cell'){
   const occupying=state.routes.find(route=>route.path.includes(index)&&route.element!==element);
   if(occupying)return F.ELEMENTS[occupying.element].name+' already uses this tile.';
  }
  if(element&&E.canPlace(map,state.placements,index,'bridge')&&
     result.message===E.terrainError(map,element,index,null)){
   const bridgeError=E.terrainError(map,element,index,'bridge');
   if(bridgeError)return bridgeError;
   if(state.loadout.bridge>(E.placementCounts(state.placements).bridge||0)){
    return `${F.ELEMENTS[element].name} needs a bridge here. Click or tap the water tile to build one.`;
   }
  }
  return result.message;
 }

 function cancelTool(){
  tool='route';
  linkStart=null;
  drawToolBar();
  drawBoard();
  message('');
 }

 function hasTunnelExit(map,placements,index){
  const opening={kind:'tunnel',pairId:Symbol()};
  return map.cells.some((_,exit)=>exit!==index&&
   (exit%map.width===index%map.width||Math.floor(exit/map.width)===Math.floor(index/map.width))&&
   E.canPlace(map,placements,exit,'tunnel')&&
   E.linkPartner(map,index,{...placements,[index]:opening,[exit]:opening})===exit);
 }

 function act(index,direct=false,dragStart=false){
  if(session.state.phase!=='build')return;
  const {map,state}=session;
  const element=state.active?.element;
  const placed=E.placementKind(state.placements[index]);
  if(direct&&!dragStart){
   if(map.cells[index].component==='bridge'){
    message('This bridge is part of the stage.');
    return false;
   }
   if(placed==='bridge'&&tool!=='route'&&tool!=='remove'){
    message(`${toolNames[tool]} is selected. Select it again to return to routing.`);
    return false;
   }
  }
  const removePlaced=direct&&!dragStart&&tool==='route'&&placed&&
   (placed==='bridge'||!element);
  const bridgeTile=direct&&!dragStart&&tool==='route'&&state.loadout.bridge>(E.placementCounts(state.placements).bridge||0)&&
   E.canPlace(map,state.placements,index,'bridge')&&(!element||Boolean(E.terrainError(map,element,index,null)));
  const linked=toolUnit(tool)===2;
  if(linked&&linkStart===index){cancelTool();return true;}
  if(linked&&linkStart===null){
   if(!E.canPlace(map,state.placements,index,tool)){message('Choose an open tile for the '+tool+' opening.');return false;}
   if(tool==='tunnel'&&!hasTunnelExit(map,state.placements,index)){
    message('Choose a tile with an open tunnel exit across the ridge.');
    return false;
   }
   linkStart=index;
   drawBoard();
   drawToolBar();
   message(tool==='tunnel'?'First opening selected. Tap the opposite end of the ridge.':'First opening selected. Tap the portal exit.');
   return true;
  }
  const removingBridge=placed==='bridge'&&(removePlaced||tool==='remove');
  const clearedRoute=removingBridge&&bridgeClearsRoute(index);
  const result=removePlaced?session.remove(index):bridgeTile?session.place(index,'bridge'):tool==='tunnel'?session.placeTunnel(linkStart,index):tool==='portal'?session.placePortal(linkStart,index):
   tool==='route'?session.route(index,direct):tool==='remove'?session.remove(index):session.place(index,tool);
  if(!result.ok){message(explainMove(result,index));return false;}
  if(removePlaced||tool==='remove')audio.effect('remove');
  else if(bridgeTile||tool!=='route')audio.effect('build');
  if(tool==='route'&&element&&!state.active&&!heardRoutes.has(element)&&state.routes.some(route=>route.element===element)){
   heardRoutes.add(element);
   audio.effect('route');
  }
  const bridgeRestriction=bridgeTile&&element?E.terrainError(map,element,index,'bridge'):null;
  if(removingBridge)bridgeRemoved(clearedRoute);
  else message(removePlaced?'Tool removed.':bridgeRestriction?'Bridge placed. '+bridgeRestriction:'');
  linkStart=null;
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
  tool='route';
  storyExpanded=false;
  update();
  message('');
  focusSource();
  persist();
 });
 $('tools').addEventListener('click',event=>{
  const kind=event.target.closest('[data-tool]')?.dataset.tool;
  if(!kind)return;
  tool=tool===kind?'route':kind;
  linkStart=null;
  drawBoard();
  drawToolBar();
  if(event.detail===0)$('tools').querySelector(`[data-tool="${kind}"]`)?.focus({preventScroll:true});
  message(tool==='tunnel'?'Tap open land directly beside the ridge.':
   tool==='portal'?'Tap an open tile for the first portal opening.':'');
 });
 $('remove').onclick=()=>{
  tool='remove';
  linkStart=null;
  $('puzzle-options').open=false;
  drawToolBar();
  focusSource();
  message('');
 };
 function reset(replan){
  if(menu.open)menu.close();
  stopAnimation();
  session.restart(replan);
  storyExpanded=false;
  heardRoutes.clear();
  linkStart=null;
  $('puzzle-options').open=false;
  tool='route';
  drawPlan();
  update();
  message(replan?'Choose a new loadout.':'The board has been reset.');
  if(replan)$('start').focus();else focusSource();
  persist();
 }
 const restartConfirm=$('restart-confirm');
 function requestRestart(replan){
  const {placements,routes,drafts}=session.state;
  if(!Object.keys(placements).length&&!routes.length&&!Object.keys(drafts).length){reset(replan);return;}
  restartConfirm.returnValue='';
  restartConfirm.dataset.replan=String(replan);
  $('restart-title').textContent=replan?'Change this stage’s loadout?':'Restart this stage?';
  $('restart-copy').textContent=replan?'This clears your routes and placed tools so you can choose your loadout again.':
   'This clears your routes and placed tools. Your selected loadout stays.';
  restartConfirm.showModal();
 }
 restartConfirm.addEventListener('close',()=>{
  if(restartConfirm.returnValue==='restart')reset(restartConfirm.dataset.replan==='true');
 });
 $('restart').onclick=()=>requestRestart(true);
 $('replan').onclick=()=>requestRestart(false);
 $('replay').onclick=()=>reset(true);
 $('undo-bridge').onclick=$('undo').onclick=()=>{if(tool!=='route'){cancelTool();return;}if(session.undo()){drawBoard();drawToolBar();message('Last change undone.');persist();}};
 $('check').onclick=()=>{
  if(session.state.phase!=='build')return;
  const result=session.verify();
  if(!result.ok){message(result.message);return;}
  if(levelIndex<campaignSize&&!(developerReviewUnlocked&&mode==='replay')){
   const snapshot=mode==='run'?campaignSnapshot():null;
   if(snapshot&&isChapterEnd(levelIndex))snapshot.storyPending=true;
   progress.complete(levels[levelIndex].id,result.points,snapshot);
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
  else if(mode==='run'&&isChapterEnd(levelIndex))showChapterEnding(levelIndex);
  else openLevel(levelIndex+1);
 };
 $('level').onchange=()=>{
  importTicket++;
  const target=Number($('level').value);
  if(target!==levelIndex)openLevel(target,null,'replay');
 };
 $('import').onchange=$('home-import').onchange=async event=>{
  const input=event.target,file=input.files[0],ticket=++importTicket;
  input.value='';
  if(!file)return;
  const status=$(input.id==='home-import'?'home-import-error':'import-error');
  status.textContent='';
  try{
   if(file.size>1024*1024)throw Error('Choose a level file smaller than 1 MiB.');
   const level=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
   if(ticket!==importTicket)return;
   if(level?.format==='element-forge-challenges'){startImportedPack(level);return;}
   openCustomLevel(level?.format==='element-forge-map'?F.asLevel(level):level);
  }catch(error){if(ticket===importTicket)status.textContent='Import failed. '+error.message;}
 };
 function openCustomLevel(level){
  const map=F.readLevel(level);
  levels[importIndex]=level;
  $('level').querySelector('[data-import]')?.remove();
  const option=new Option(map.name+' (imported)',importIndex);
  option.dataset.import='true';
  $('level').add(option);
  openLevel(importIndex);
 }
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
  const routeStart=Object.values(session.state.drafts).some(({path})=>path.at(-1)===index||E.portalExit(session.map,path,session.state.placements)===index)||
   (session.map.cells[index].node?.role==='source'||session.map.cells[index].component==='confluence')||
   session.state.routes.some(route=>route.path.at(-1)===index);
  if(tool==='route'&&routeStart&&!drag){
   const bridge=E.effective(session.map,session.state.placements,index)==='bridge';
   drag={pointer:event.pointerId,index,bridge};
   board.setPointerCapture(event.pointerId);
   if(!bridge)act(index,true,true);
  }
 });
 board.addEventListener('pointermove',event=>{
  if(drag?.pointer!==event.pointerId)return;
  const tile=document.elementFromPoint(event.clientX,event.clientY)?.closest('.tile');
  if(!tile||!board.contains(tile))return;
  const index=Number(tile.dataset.index);
  if(index===drag.index)return;
  if(drag.bridge&&!drag.moved)act(drag.index,true,true);
  drag.moved=true;
  drag.index=index;
  const path=session.state.active?.path;
  if(!path)return;
  const tip=path.at(-1);
  const map=session.map;
  const stride=Math.floor(tip/map.width)===Math.floor(index/map.width)?1:tip%map.width===index%map.width?map.width:0;
  if(stride&&index!==tip&&index!==path.at(-2)&&index!==path.at(-3)&&E.linkPartner(map,tip,session.state.placements)!==index&&
     !(session.state.active.element==='wind'&&E.windLandings(map,tip,session.state.placements).includes(index))){
   const delta=Math.sign(index-tip)*stride;
   for(let next=tip+delta;session.state.active;next+=delta){
    if(!act(next)||next===index||E.portalExit(map,session.state.active?.path??[next],session.state.placements)!==null)break;
   }
  }else act(index);
 });
 board.addEventListener('contextmenu',event=>{
  const tile=event.target.closest('.tile');
  if(!tile||session.state.phase!=='build')return;
  const index=Number(tile.dataset.index);
  if(!Object.hasOwn(session.state.placements,index))return;
  event.preventDefault();
  const removingBridge=E.placementKind(session.state.placements[index])==='bridge';
  const clearedRoute=removingBridge&&bridgeClearsRoute(index);
  const result=session.remove(index);
  if(!result.ok){message(result.message);return;}
  tool='route';
  linkStart=null;
  drawBoard();
  drawToolBar();
  audio.effect('remove');
  if(removingBridge)bridgeRemoved(clearedRoute);
  else message('Tool removed. Any track using it was cleared.');
  persist();
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!document.querySelector('dialog[open]')&&session?.state.phase==='build'&&tool!=='route'){event.preventDefault();cancelTool();}
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
  board.addEventListener(type,event=>{
   if(drag?.pointer!==event.pointerId)return;
   const {index,moved,bridge:draggedBridge}=drag;
   drag=null;
   if(type==='pointerup'&&!moved&&draggedBridge)act(index,true);
  });
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
  const stages=chapterAt(levelIndex<campaignSize?levelIndex:0).stages;
  $('campaign-progress').textContent=`${stages.filter(level=>progress.hasCompleted(level.id)).length} / ${stages.length} complete`;
 }
 const story=window.EFStory;
 story.configureAudio(audio);
 const newGameConfirm=$('new-game-confirm');
 function runTarget(){
  const saved=progress.campaign();
  const index=levels.slice(0,campaignSize).findIndex(level=>level.id===saved?.id);
  if(index<0){
   if(saved?.id?.startsWith("chapter-two-")&&progress.reachedIndex()>=chapterOneSize)return {index:progress.unlockedIndex()};
   return null;
  }
  if(!canOpen(index))return {index:progress.unlockedIndex(),recovered:true};
  if(saved.board?.phase==='complete'){
   if(saved.storyPending&&isChapterEnd(index))return {index,ending:true};
   if(index===campaignSize-1)return {complete:true};
   if(!canOpen(index+1))return {index:progress.unlockedIndex(),recovered:true};
   return {index:index+1,opening:isChapterEnd(index)};
  }
  const changed=(saved.layout??1)!==(levels[index].layout??1);
  return {index,changed,board:!changed&&saved.rules===levels[index].rulesVersion?saved.board:null};
 }
 function continueCampaign(){
  const target=runTarget();
  if(!target||target.complete)return;
  if(target.ending){showChapterEnding(target.index);return;}
  if(target.opening){showChapterOpening(target.index);return;}
  openLevel(target.index,target.board);
  if(target.recovered)message('Your saved stage was unavailable. Opened the first unfinished stage.');
  else if(target.changed)message('This stage has a new layout. The board restarted; your unlocks and old layout score were kept.');

 }
 const panels={
  'stage-list':'stage-select', 'information-panel':'information',
  'audio-settings':'settings', 'challenge-menu':'choose-challenge',
  'home-custom-panel':'home-custom',
 };
 function showPanel(id){
  const support=id==='information-panel'||id==='audio-settings';
  $('home-start').hidden=support;
  $('home-support').hidden=!support;
  for(const [panel,control] of Object.entries(panels)){
   $(panel).hidden=panel!==id;
   $(control).setAttribute('aria-expanded',String(panel===id));
  }
  if(support)$(id==='information-panel'?'info-back':'settings-back').focus();
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
   const chapter=chapterAt(index);
   if(index===chapter.start){
    const heading=document.createElement('h3');
    heading.textContent=`${chapter.title} · ${chapter.name}`;
    $('stage-list').append(heading);
   }
   makeChoice($('stage-list'),`${index+1}. ${level.map.name}${progress.hasCompleted(level.id)?' ✓':''}`,
    ()=>openLevel(index,null,'replay'),!canOpen(index));
  });
  $('tutorial-list').replaceChildren();
  const groups=[['Route basics and elements',0,11],['Tools and combined routes',11,17],['Wind practice',17,18],['Original Sleeping Valley',18,tutorials.length]];
  for(const [title,start,end] of groups){
   if(start>=end)continue;
   const group=document.createElement('details');
   group.name='tutorial-topic';
   const summary=document.createElement('summary');
   summary.textContent=title;
   const lessons=document.createElement('div');
   lessons.className='tutorial-lessons';
   tutorials.slice(start,end).forEach((level,index)=>makeChoice(lessons,
    level.map.name+(tutorialProgress.hasCompleted(level.id)?' ✓':''),
    ()=>{tutorialReturn=menu.open?{index:levelIndex,board:session.snapshot(),mode}:null;openLevel(campaignSize+start+index,null,'tutorial');}));
   group.append(summary,lessons);
   $('tutorial-list').append(group);
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
 let reviewChecks=0,reviewCheckArmed=false;
 for(const control of popupControls){
  control.checked=skipTutorialPopups;
  control.onchange=()=>{
   // Only actual check→uncheck pairs on the Settings control count.
   if(control.id==='settings-skip-tutorial-popups'&&!developerReviewUnlocked){
    if(control.checked)reviewCheckArmed=true;
    else if(reviewCheckArmed){reviewChecks++;reviewCheckArmed=false;}
   }
   skipTutorialPopups=control.checked;
   for(const input of popupControls)input.checked=skipTutorialPopups;
   try{storage?.setItem(popupKey,skipTutorialPopups?'yes':'no');}catch{}
  };
 }
 const activateDeveloperReview=()=>{
  // The existing BC Shin Studio footer text is the hidden trigger.
  // It is inactive outside Settings and requires three complete on/off cycles.
  if($('audio-settings').hidden||developerReviewUnlocked||reviewChecks<3)return;
  developerReviewUnlocked=true;
  reviewChecks=0;
  reviewCheckArmed=false;
  updateLevelLabels();
  renderChoices();
  $('stage-select').textContent='Stage Select · Review';
  $('home-total').textContent='Developer review enabled · All '+campaignSize+' stages accessible · Progress unchanged';
  showPanel('stage-list');
 };
 $('studio-credit').addEventListener('click',activateDeveloperReview);
 $('studio-credit').addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' '){
   event.preventDefault();
   activateDeveloperReview();
  }
 });
 const reference=window.EFReference;
 function endpointKey(){
  const key=document.createElement('span');
  key.className='legend-key';
  for(const [role,label] of [['source','Source'],['destination','Inlet']]){
   const item=document.createElement('span');
   const marker=document.createElement('span');
   marker.className='mark endpoint '+role;
   marker.style.setProperty('--element',colors.water);
   marker.textContent=symbols.water;
   marker.setAttribute('aria-hidden','true');
   item.append(marker,label);
   key.append(item);
  }
  return key;
 }
 function referenceTable(title,entries,fixed=false){
  const table=document.createElement('table');
  table.className='quick-reference';
  table.createCaption().textContent=title;
  const head=table.createTHead().insertRow();
  for(const label of [fixed?'Tool':'Element',fixed?'Use and placement':'Can do and restrictions']){
   const th=document.createElement('th');
   th.scope='col';
   th.textContent=label;
   head.append(th);
  }
  const body=table.createTBody();
  for(const [id,lines] of entries){
   const row=body.insertRow();
   const heading=document.createElement('th');
   heading.scope='row';
   if(fixed){
    const badgeKind={checkpoint:'checkpoint',gate:'arrow'}[id];
    if(badgeKind)heading.append(boardBadge(badgeKind),' '+toolNames[id]);
    else heading.textContent=componentSymbols[id]+' '+toolNames[id];
   }
   else{
    const name=F.ELEMENTS[id].name;
    const symbol=symbols[id];
    const initial=document.createElement('span');
    initial.className='reference-initial';
    initial.style.setProperty('--element',colors[id]);
    initial.textContent=symbol;
    heading.className='element-reference-name';
    heading.append(initial,symbol===name[0]?name.slice(1):' '+name);
   }
   row.append(heading);
   const cell=row.insertCell();
   for(const line of lines){
    const detail=document.createElement('div');
    detail.textContent=line;
    cell.append(detail);
   }
  }
  return table;
 }
 function renderReference(container,map=null){
  const elements=map?E.pairs(map).map(({element})=>element):Object.keys(reference.elements);
  const toolIds=map?new Set([
   ...Object.entries(map.inventory).filter(([,count])=>count>0).map(([id])=>id),
   ...map.cells.map(cell=>cell.component).filter(Boolean)
  ]):new Set([...Object.keys(reference.tools),...reference.reserved]);
  const markers=endpointKey();
  for(const [kind,label,applies] of [
   ['checkpoint','Checkpoint',toolIds.has('checkpoint')],
   ['arrow','Direction',toolIds.has('gate')||map?.cells.some(cell=>cell.terrain==='oneway')],
   ['sun','Exposed',map?.cells.some(cell=>cell.terrain==='exposed')],
   ['moon','Covered',map?.cells.some(cell=>cell.terrain==='covered')]
  ]){
   if(map&&!applies)continue;
   const item=document.createElement('span');
   item.append(boardBadge(kind),label);
   markers.append(item);
  }
  const blocks=[markers,referenceTable('Elements',elements.map(id=>[id,reference.elements[id]]))];
  const tools=[...toolIds].map(id=>[id,reference.tools[id]??['Editor component. Reserved for future puzzles.']]);
  if(tools.length)blocks.push(referenceTable('Tools',tools,true));
  if(!map){
   const removal=document.createElement('p');
   removal.textContent='To take back another tool you placed, choose Remove tool and select the tile. Fixed tools stay in place.';
   blocks.push(removal);
  }else if(map.cells.some(cell=>cell.terrain==='oneway')){
   const direction=document.createElement('p');
   direction.textContent='➜ One-way tiles must be entered and left in the direction of the arrow.';
   blocks.push(direction);
  }
  if(map&&map.rulesVersion<4){
   const legacy=document.createElement('p');
   legacy.textContent='This board uses older routing rules. The reference describes the current campaign.';
   blocks.unshift(legacy);
  }
  container.replaceChildren(...blocks);
 }
 renderReference($('information-reference'));
 const stageHelp=$('stage-help');
 function showStageReference(full){
  $('toggle-reference').textContent=full?'Back to stage tips':'Full Reference';
  $('toggle-reference').dataset.full=String(full);
  $('stage-help-title').textContent=full?'Quick Reference':'Stage tips';
  renderReference($('stage-reference'),full?null:session.map);
  stageHelp.scrollTop=0;
 }
 $('stage-tip').onclick=()=>{showStageReference(false);stageHelp.showModal();};
 $('close-stage-help').onclick=()=>stageHelp.close();
 $('toggle-reference').onclick=event=>{
  event.preventDefault();
  showStageReference(event.currentTarget.dataset.full!=='true');
  $('close-stage-help').focus();
 };
 $('story-toggle').onclick=()=>{
  if(session?.state.phase==='inspect')return;
  storyExpanded=!storyExpanded;
  $('description').hidden=!storyExpanded;
  $('story-toggle').setAttribute('aria-expanded',String(storyExpanded));
  $('story-toggle').setAttribute('aria-label',storyExpanded?'Hide stage story':'Show stage story');
  $('story-toggle').title=storyExpanded?'Hide stage story':'Show stage story';
  fitBoard();
 };
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
  story.close();
  const target=runTarget();
  document.body.classList.toggle('chapter-restored',Boolean(target?.complete));
  $('continue').disabled=!target||Boolean(target.complete);
  $('home-total').textContent=target?.complete?'Campaign complete · The Confluence Forges awakened':
   target?`Chapter ${chapters.indexOf(chapterAt(target.index))+1} · Stage ${target.index+1} of ${campaignSize} · Best total ${progress.total()}`:'Chapter 1 · The Sleeping Valley';
  renderChallengeChoices();
  showPanel(null);
  renderChoices();
  (target&&!target.complete?$('continue'):$('new-campaign')).focus();
 }
 function showChapterOpening(index){
  story.open(chapters.indexOf(chapterAt(index)),'opening','Begin',()=>{
   openLevel(index);
   if(!tip.open)$('start').focus();
  });
 }
 function showChapterEnding(index){
  stopAnimation();
  const last=index===campaignSize-1;
  const label=last?'Campaign Summary':`Start ${chapterAt(index+1).title}`;
  story.open(chapters.indexOf(chapterAt(index)),'ending',label,()=>{
   if(!last){showChapterOpening(index+1);return;}
   const saved=progress.campaign();
   if(saved?.id===levels[index].id&&saved.storyPending)progress.saveCampaign({...saved,storyPending:false});
   showHome();
  });
 }
 $('new-game-start').onclick=()=>{
  newGameConfirm.close();
  showChapterOpening(0);
 };
 $('home-button').onclick=showHome;
 $('continue').onclick=continueCampaign;
 $('stage-select').onclick=()=>showPanel($('stage-list').hidden?'stage-list':null);
 $('information').onclick=()=>showPanel('information-panel');
 $('settings').onclick=()=>showPanel('audio-settings');
 $('info-back').onclick=()=>{showPanel(null);$('information').focus();};
 $('settings-back').onclick=()=>{showPanel(null);$('settings').focus();};
 $('new-campaign').onclick=()=>{
  const target=runTarget();
  if(target&&!target.complete)newGameConfirm.showModal();
  else showChapterOpening(0);
 };
 $('home-custom').onclick=()=>showPanel($('home-custom-panel').hidden?'home-custom-panel':null);
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
 const titleScreen=$('title-screen');
 const titleEnter=$('title-enter');
 titleScreen.addEventListener('cancel',event=>event.preventDefault());
 titleEnter.addEventListener('click',()=>{
  if(titleEnter.classList.contains('is-pressed'))return;
  titleEnter.classList.add('is-pressed');
  setTimeout(()=>{
   titleScreen.close();
   showHome();
  },matchMedia('(prefers-reduced-motion: reduce)').matches?0:120);
 });
 function addEditorSolution(){
  const button=document.createElement('button');
  button.type='button';
  button.textContent='Show verified solution';
  button.id='editor-solution';
  $('phase').after(button);
  button.onclick=()=>{
   button.disabled=true;
   message('Looking for a valid network…');
   setTimeout(()=>{
    try{
     const plan=E.solveConstruction(session.map);
     if(plan.status!=='solved'){message(plan.message??'The solver could not verify a network.');return;}
     const trial=window.EFSession.createSession(editorDraft);
     const snapshot={...trial.snapshot(),phase:'build',loadout:E.placementCounts(plan.placements),
      routes:plan.routes,placements:plan.placements};
     if(!trial.restore(snapshot)){message('The game could not replay the solver’s plan.');return;}
     session=trial;
     tool='route';
     linkStart=null;
     drag=null;
     $('check').click();
    }finally{button.disabled=false;}
   },0);
  };
 }
 if(editorDraft){
  document.body.classList.add('editor-playtest');
  openCustomLevel(editorDraft);
  addEditorSolution();
 }else titleScreen.showModal();
})();
