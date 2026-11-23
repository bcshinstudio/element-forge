'use strict';
(()=>{
 const art=window.EFVariants;
 const F=window.EFMap;
 const names=Object.fromEntries([...TERRAIN,...COMPONENTS]);
 const rotationOptions=[0,90,180,270];
 const draftKey='conduit-weaver.editor-draft.v1';
 const playerTools=['bridge','metalSpan','intersection','tunnel','portal'];
 const campaign=Object.entries(window.EFChapter).slice(0,8).flatMap(([,stages],chapter)=>
  stages.map(level=>({level,chapter})));
 let selected=-1,brush=null,reportVisible=false;

 const placementStyles=new Map();
 const styleLabel=item=>item.label+(item.piece?' · '+item.piece.replaceAll('-',' '):'');
 function thumbnail(type,spec,kind){
  const tile=document.createElement('span');
  tile.className='art-swatch art-original';
  tile.setAttribute('aria-hidden','true');
  const item=art.resolve(spec,type);
  if(item){
   const image=document.createElement('img');
   image.src=item.src;
   image.alt='';
   image.loading='lazy';
   image.style.rotate=`${spec.rotation??0}deg`;
   tile.append(image);
  }else{
   const original=document.createElement('span');
   original.className='cell';
   if(kind==='terrain')original.classList.add(type);
   if(kind==='component')window.EFBoardArt.decorate(original,type);
   if(!(kind==='terrain'?window.EFBoardArt.terrains:window.EFBoardArt.structures).has(type))original.textContent=glyph(kind,type);
   tile.append(original);
  }
  return tile;
 }
 function gallery(host,type,spec,kind,choose){
  host.className='art-gallery';
  host.replaceChildren();
  const missing=spec&&!art.resolve(spec,type)?[{id:spec.id,label:'Missing · '+spec.id}]:[];
  for(const item of [null,...missing,...art.options(type)]){
   const active=(item?.id??null)===(spec?.id??null);
   const choice=item?{id:item.id,rotation:active?spec.rotation??0:0}:null;
   const button=document.createElement('button');
   button.type='button';
   button.className='art-choice';
   button.dataset.artId=item?.id??'';
   button.setAttribute('aria-pressed',String(active));
   const label=document.createElement('span');
   label.textContent=item?styleLabel(item):'Original';
   button.append(thumbnail(type,choice,kind),label);
   button.onclick=()=>choose(choice,button.dataset.artId);
   host.append(button);
  }
 }
 function pickerButton(type,spec,kind,label,choose){
  const button=document.createElement('button');
  button.type='button';
  button.className='art-picker-button';
  const text=document.createElement('span');
  const item=art.resolve(spec,type);
  text.textContent=`${label} · ${item?styleLabel(item):spec?'Missing artwork':'Original'}`;
  button.append(thumbnail(type,spec,kind),text);
  button.onclick=()=>{
   const dialog=$('art-picker');
   $('art-picker-title').textContent=`${names[type]} artwork`;
   gallery($('art-picker-grid'),type,spec,kind,choice=>{
    dialog.close();
    choose(choice);
   });
   dialog.showModal();
   ($('art-picker-grid').querySelector('[aria-pressed="true"]')??$('art-picker-grid').firstChild)?.focus();
  };
  return button;
 }
 function rotation(selectId,value){
  return `<label>Artwork rotation<select id="${selectId}">${rotationOptions.map(n=>
   `<option value="${n}" ${(value??0)===n?'selected':''}>${n}°</option>`).join('')}</select></label>`;
 }
 function drawInspector(){
  const box=$('cell-inspector');
  const cell=map.cells[selected];
  $('board').querySelector('.selected-cell')?.classList.remove('selected-cell');
  if(!cell){box.textContent='Select a cell with Inspect or paint on the board.';return;}
  $('board').children[selected]?.classList.add('selected-cell');
  box.innerHTML=`<p>${cellLabel(cell,selected)}${cell.component?' · '+names[cell.terrain]:''}</p>`;
  for(const [field,type] of [['terrainArt',cell.terrain],['componentArt',cell.component]]){
   if(!type)continue;
   const spec=cell[field];
   const suggestion=art.suggest(map,selected,type,art.resolve(spec,type)?.label);
   const row=document.createElement('div');
   row.className='art-controls';
   row.innerHTML=rotation(field+'-rotation',spec?.rotation)+
    (suggestion?.piece?`<button type="button">Use suggested ${suggestion.piece.replaceAll('-',' ')}</button>`:'');
   const angle=row.querySelector('#'+field+'-rotation');
   angle.disabled=!spec;
   angle.onchange=()=>editCell(next=>{next[field].rotation=Number(angle.value);});
   const suggestButton=row.querySelector('button');
   if(suggestButton)suggestButton.onclick=()=>editCell(next=>{next[field]={id:suggestion.id,rotation:0};});
   row.prepend(pickerButton(type,spec,field==='terrainArt'?'terrain':'component',
    field==='terrainArt'?'Terrain artwork':'Fixture artwork',choice=>editCell(next=>{
     if(choice)next[field]=choice;
     else delete next[field];
    })));
   box.append(row);
  }
  const props=cell.props??{};
  if(cell.terrain==='oneway'||['gate','junction','sorter','booster','confluence'].includes(cell.component)||props.direction){
   addProperty('Gameplay direction',DIRECTIONS.map(d=>[d,d]),props.direction??'E',value=>setProp('direction',value));
  }
  if(['portal','tunnel'].includes(cell.component)){
   const label=document.createElement('label');
   label.textContent='Connection ID';
   const input=document.createElement('input');
   input.maxLength=12;
   input.value=props.pairId??'';
   input.onchange=()=>setProp('pairId',input.value.replace(/[^\w-]/g,''));
   label.append(input);
   box.append(label);
  }
  if(cell.component==='confluence'){
   const engine=window.EFEngine;
   const reaction=cell.props?.recipe==='custom'?
    {id:'custom',inputs:cell.props.inputs??['water','earth'],output:cell.props.output??'nature'}:
    engine.confluenceRecipe(cell.props);
   const selectedRecipe=reaction?.id??'water-earth-nature';
   const options=engine.CONFLUENCE_RECIPES.map(item=>[
    item.id,item.inputs.map(e=>F.ELEMENTS[e].name).join(' + ')+' → '+F.ELEMENTS[item.output].name
   ]);
   addProperty('Reaction recipe',[...options,['custom','Custom: choose elements']],selectedRecipe,
    value=>editCell(next=>{
     next.props??={};
     next.props.recipe=value;
     if(value==='custom'){
      next.props.inputs=[...(reaction?.inputs??['water','earth'])];
      next.props.output=reaction?.output??'nature';
     }else{
      delete next.props.inputs;delete next.props.output;
     }
    }));
   if(selectedRecipe==='custom'){
    const elementOptions=Object.entries(F.ELEMENTS).map(([key,el])=>[key,el.name]);
    for(let i=0;i<2;i++)addProperty('Input '+(i+1),elementOptions,reaction.inputs[i],value=>
     editCell(next=>{next.props.inputs[i]=value;}));
    addProperty('Output element',elementOptions,reaction.output,value=>
     editCell(next=>{next.props.output=value;}));
    if(!engine.confluenceRecipe(cell.props)){
     const warning=document.createElement('p');
     warning.className='warning-text';
     warning.textContent='A reaction requires three different elements.';
     box.append(warning);
    }
   }
  }
  if(cell.component==='checkpoint')addProperty('Required element',
   [['any','Any element'],...Object.entries(ELEMENTS).map(([id,e])=>[id,e.name])],
   props.element??'any',value=>setProp('element',value));
  if(cell.node){
   addProperty('Element',Object.entries(ELEMENTS).map(([id,e])=>[id,e.name]),cell.node.element,
    value=>editCell(next=>{next.node.element=value;}));
   addProperty('Endpoint',[['source','Source'],['destination','Inlet']],cell.node.role,
    value=>editCell(next=>{next.node.role=value;}));
  }
  const issues=artIssues(cell);
  if(issues.length){
   const warning=document.createElement('p');
   warning.className='warning-text';
   warning.textContent=issues.join(' ');
   box.append(warning);
  }
 }
 function addProperty(label,choices,current,change){
  const control=document.createElement('label');
  control.textContent=label;
  const select=document.createElement('select');
  choices.forEach(([value,text])=>select.add(new Option(text,value,false,value===current)));
  select.onchange=()=>change(select.value);
  control.append(select);
  $('cell-inspector').append(control);
 }
 function setProp(key,value){
  editCell(next=>{
   next.props??={};
   if(value)next.props[key]=value;
   else delete next.props[key];
  });
 }
 function editCell(update){
  const next=clone(map.cells[selected]);
  update(next);
  if(JSON.stringify(next)===JSON.stringify(map.cells[selected]))return;
  snapshot();
  map.cells[selected]=next;
  refreshCell(selected);
  markDirty();
  drawInspector();
 }
 function artIssues(cell){
  const issues=[];
  for(const [field,type] of [['terrainArt',cell.terrain],['componentArt',cell.component]]){
   if(cell[field]&&!art.resolve(cell[field],type))issues.push('Missing '+(field==='terrainArt'?'terrain':'fixture')+' artwork. Showing the original.');
  }
  const {direction}=cell.props??{};
  const spec=cell.terrain==='oneway'?cell.terrainArt:['gate','junction'].includes(cell.component)?cell.componentArt:null;
  const heading=art.heading(spec,cell.terrain==='oneway'?'oneway':cell.component);
  if(heading&&heading!==(direction??'E'))issues.push('Artwork direction differs from gameplay direction.');
  return issues;
 }
 function validate(show=true){
  const {findings,matched}=F.mapFindings(map);
  const warnings=[];
  for(const [i,cell] of map.cells.entries()){
   const issues=artIssues(cell);
   for(const message of issues)warnings.push({indices:[i],message:`Cell ${i+1}: ${message}`});
  }
  for(const [type,spec] of Object.entries(map.toolArt??{})){
   if(!art.resolve(spec,type))warnings.push({indices:[],message:`${names[type]} uses missing artwork. Showing the original.`});
  }
  if(show)reportVisible=true;
  const board=$('board');
  for(const node of board.children){node.classList.remove('cell-error','cell-warning');}
  for(const finding of warnings)for(const i of finding.indices)board.children[i]?.classList.add('cell-warning');
  if(!reportVisible)return;
  for(const finding of findings)for(const i of finding.indices)board.children[i]?.classList.add('cell-error');
  const lines=[...findings.map(x=>'Error · '+x.message),...warnings.map(x=>'Warning · '+x.message)];
  showMessage(lines.join('\n')||`${matched} matched element pair(s). Ready to playtest.`,!lines.length);
 }
 function drawTools(){
  const box=$('tool-art');
  box.replaceChildren();
  for(const type of playerTools){
   box.append(pickerButton(type,map.toolArt?.[type],'component',names[type],choice=>{
    const current=map.toolArt?.[type];
    if(JSON.stringify(current??null)===JSON.stringify(choice))return;
    snapshot();
    map.toolArt??={};
    if(choice)map.toolArt[type]=choice;
    else delete map.toolArt[type];
    markDirty();
    drawTools();
   }));
  }
 }
 function select(i){selected=i;drawInspector();}
 function pick(i){
  const cell=map.cells[i];
  const field=$('art-layer').value;
  const type=field==='terrainArt'?cell.terrain:cell.component;
  if(!type){showMessage('Choose a cell with a fixture to copy its artwork.',false);return;}
  brush={field,type,spec:clone(cell[field]??null)};
  $('art-type').value=type;
  drawBrushVariants();
  setTool('art');
 }
 function drawBrushTypes(){
  const field=$('art-layer').value;
  $('art-type').replaceChildren(...(field==='terrainArt'?TERRAIN:COMPONENTS).map(([id,label])=>new Option(label,id)));
  setBrush();
 }
 function drawBrushVariants(){
  $('art-angle').value=brush.spec?.rotation??0;
  showBrush();
 }
 function placementArt(kind,type){
  const spec=placementStyles.get(kind+':'+type);
  return spec?clone(spec):null;
 }
 function showBrush(focusId){
  const [kind,type]=tool.split(':');
  const placement=kind==='terrain'||kind==='component';
  const host=$('paint-images');
  host.hidden=!placement&&tool!=='art';
  if(host.hidden)return;
  const target=placement?type:brush.type;
  const layer=placement?kind:brush.field==='terrainArt'?'terrain':'component';
  const spec=placement?placementArt(kind,type):brush.spec;
  $('paint-images-title').textContent=`${names[target]} artwork`;
  const grid=$('paint-images-grid');
  gallery(grid,target,spec,layer,(choice,id)=>{
   if(placement)placementStyles.set(kind+':'+type,choice);
   else brush.spec=choice;
   $('art-angle').value=brush.spec?.rotation??0;
   showBrush(id);
  });
  if(focusId!==undefined)grid.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
 }
 function setBrush(){
  brush={field:$('art-layer').value,type:$('art-type').value,spec:null};
  drawBrushVariants();
 }
 function paintArt(cell){
  const type=brush.field==='terrainArt'?cell.terrain:cell.component;
  if(type!==brush.type)return cell;
  const next=clone(cell);
  if(brush.spec)next[brush.field]=clone(brush.spec);
  else delete next[brush.field];
  return next;
 }
 function saveDraft(){
  try{localStorage.setItem(draftKey,JSON.stringify(map));}catch{}
 }
 function boardChanged(){
  if(!map.cells[selected])selected=-1;
  $('art-palette').value=map.artPalette??1;
  drawInspector();
  drawTools();
  validate(false);
 }
 function loadDraft(){
  try{
   const saved=localStorage.getItem(draftKey);
   if(saved){map=parseMap(JSON.parse(saved));dirty=true;syncMeta();render();$('dirty').textContent='Restored local draft';}
  }catch{}
 }
 const tools=document.createElement('div');
 tools.className='art-controls';
 tools.innerHTML=`<label>Artwork layer<select id="art-layer"><option value="terrainArt">Terrain</option><option value="componentArt">Fixture</option></select></label>
 <label>Matching type<select id="art-type"></select></label>${rotation('art-angle',0)}`;
 $('art-brush').append(tools);
 $('art-layer').onchange=drawBrushTypes;
 $('art-type').onchange=setBrush;
 $('art-angle').onchange=()=>{
  if(brush.spec)brush.spec.rotation=Number($('art-angle').value);
  setTool('art');
 };
 drawBrushTypes();
 art.chapters.forEach((name,i)=>$('art-palette').add(new Option(`${i+1} · ${name}`,i+1)));
 campaign.forEach(({level},i)=>$('existing-stage').add(new Option(`${i+1} · ${level.map.name}`,i)));
 $('apply-palette').onclick=()=>{
  const next=clone(map);
  if(!art.applyPalette(next,Number($('art-palette').value)-1)||JSON.stringify(next)===JSON.stringify(map))return;
  snapshot();
  map=next;
  render();
  markDirty();
 };
 $('load-stage').onclick=()=>{
  if(dirty&&!confirm('Replace the current draft with this campaign stage?'))return;
  const {level,chapter}=campaign[Number($('existing-stage').value)];
  snapshot();
  selected=-1;
  reportVisible=false;
  map=F.readLevel(art.campaignLevel(level,chapter));
  syncMeta();
  render();
  $('art-palette').value=chapter+1;
  markDirty();
  showMessage('Stage opened. Its campaign artwork is ready to customize.',true);
 };
 $('phone-preview').onclick=()=>{
  const enabled=$('board').classList.toggle('phone-board');
  $('phone-preview').setAttribute('aria-pressed',String(enabled));
  $('playtest-panel').classList.toggle('phone-board',enabled);
 };
 $('validate').onclick=()=>validate();
 window.EFEditorArt={select,pick,paintArt,saveDraft,boardChanged,validate,showBrush,placementArt};
 showBrush();
 loadDraft();
 boardChanged();
})();
