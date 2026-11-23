'use strict';
// Editor data is renderer-independent. Future generator/solver should use this schema.
const {TERRAIN,COMPONENTS,ELEMENTS,DIRECTIONS,fresh,parseConstraints,parseMap,structuralErrors}=window.EFMap;
const reactionEngine=window.EFEngine;
const reactionLabel=r=>r.inputs.map(e=>ELEMENTS[e].name).join(' + ')+' → '+ELEMENTS[r.output].name;
const confluenceProps=()=>reactionId==='custom'?{recipe:'custom',inputs:[...customInputs],output:customOutput}:{recipe:reactionId};
const confluenceSymbol=id=>id==='wind'?'V':ELEMENTS[id]?.symbol||ELEMENTS[id]?.name?.[0]||'?';
const $=id=>document.getElementById(id),clone=o=>JSON.parse(JSON.stringify(o));
const newBoard=()=>({...fresh(),rulesVersion:4});
let copiedCell=null;
let phasePreview='day';
const previewCell=c=>map.phaseRules&&phasePreview==='night'&&c.props?.phaseShift?{...c,terrain:c.terrain==='exposed'?'covered':'exposed'}:c;
let map=newBoard(),tool='terrain:mountain',element='fire',direction='E',pairId='A',checkpointElement='any',reactionId='water-earth-nature',customInputs=['water','earth'],customOutput='nature',history=[],future=[],drawing=false,changedStroke=false,lastIndex=-1,dirty=false,assets={terrain:{},components:{}};
function snapshot(){history.push(clone(map));if(history.length>100)history.shift();future=[];updateHistory()}
function updateHistory(){
 const inPlay=window.EFPlay?.isActive();
 $('undo').disabled=inPlay||!history.length;
 $('redo').disabled=inPlay||!future.length;
}
window.EFEditor={updateHistory};
function markDirty(){dirty=true;$('dirty').textContent='Unsaved changes';window.EFEditorArt?.saveDraft();window.EFEditorArt?.validate(false)}
function glyph(type,id){const item=(type==='terrain'?TERRAIN:COMPONENTS).find(x=>x[0]===id);return item?.[2]||''}
function setTool(value){
 tool=value;
 document.querySelectorAll('[data-tool]').forEach(button=>button.classList.toggle('active',button.dataset.tool===value));
 const labels={erase:'Eraser',inspect:'Inspect',art:'Paint artwork',pick:'Copy artwork',copy:'Copy cell',stamp:'Stamp cell','phase:toggle':'Mark shifting channel'};
 const [kind,id]=value.split(':');
 $('selected').textContent=labels[value]??(kind==='node'?`${ELEMENTS[element].name} ${id==='source'?'source':'inlet'}`:id);
 updateProperties();
 window.EFEditorArt?.showBrush();
}
function buildPalette(){
 const palette=$('palette');
 const paintGroup=(label,kind,entries,open=false)=>{
  const content=document.createElement('details');
  content.open=open;
  content.innerHTML=`<summary>${label}</summary><div class="palette-grid">`+
   entries.map(([id,name,icon])=>`<button class="tool" data-tool="${kind}:${id}"><span class="symbol">${icon}</span><span>${name}</span></button>`).join('')+'</div>';
  palette.append(content);
 };
 paintGroup('Terrain','terrain',TERRAIN,true);
 paintGroup('Sources & Inlets','node',[['source','Source','●'],['destination','Inlet','◎']],true);
 paintGroup('Tools & Fixtures','component',COMPONENTS);
 const brushes=document.createElement('div');
 brushes.className='palette-grid';
 brushes.innerHTML='<button class="tool" data-tool="inspect">Inspect</button><button class="tool" data-tool="erase">Erase</button>'+
  '<button class="tool" data-tool="art">Paint artwork</button><button class="tool" data-tool="pick">Copy artwork</button>'+
  '<button class="tool" data-tool="copy">Copy cell</button><button class="tool" data-tool="phase:toggle">Mark shifting channel ↔</button>';
 palette.append(brushes);
 document.querySelectorAll('[data-tool]').forEach(button=>button.onclick=()=>{
  setTool(button.dataset.tool);
  if(!($('paint-images').hidden)&&matchMedia('(max-width: 760px)').matches)
   $('paint-images').scrollIntoView({block:'start'});
 });
 $('elements').innerHTML='<div class="element-grid">'+Object.entries(ELEMENTS).map(([id,e])=>
  `<button class="element" data-element="${id}" title="${e.name}" aria-label="${e.name}"><span class="swatch" style="background:${e.color}"></span>${e.icon?e.icon+' ':''}${e.name}</button>`).join('')+'</div>';
 document.querySelectorAll('[data-element]').forEach(button=>button.onclick=()=>{
  element=button.dataset.element;
  document.querySelectorAll('[data-element]').forEach(other=>other.classList.toggle('active',other===button));
  setTool(tool);
 });
 document.querySelector('[data-element="fire"]').classList.add('active');
 setTool(tool);
}
function updateProperties(){
 const type=tool.split(':')[1];
 let html='';
 if(['oneway','junction','sorter','gate','booster','confluence'].includes(type))
  html+=`<label>${type==='confluence'?'Output direction':'Orientation'}<select id="propDirection">${DIRECTIONS.map(d=>`<option value="${d}" ${direction===d?'selected':''}>${{N:'North ↑',E:'East →',S:'South ↓',W:'West ←'}[d]}</option>`).join('')}</select></label>`;
 if(['portal','tunnel'].includes(type))
  html+=`<label>Connection ID (two matching endpoints)<input id="propPair" maxlength="12" value="${escapeHtml(pairId)}"></label><p class="property-note">Place exactly two ${type} endpoints with the same ID. Tunnel ends must align horizontally or vertically with blocked terrain between them.</p>`;
 if(type==='confluence'){
  const options=reactionEngine.CONFLUENCE_RECIPES.map(r=>
   `<option value="${r.id}" ${reactionId===r.id?'selected':''}>${reactionLabel(r)}</option>`).join('');
  html+=`<label>Reaction recipe<select id="propReaction">${options}<option value="custom" ${reactionId==='custom'?'selected':''}>Custom: choose elements</option></select></label>`;
  if(reactionId==='custom'){
   const field=(label,id,value)=>`<label>${label}<select id="${id}">${Object.entries(ELEMENTS).map(([key,e])=>`<option value="${key}" ${value===key?'selected':''}>${e.name}</option>`).join('')}</select></label>`;
   html+=field('Input 1 (counterclockwise port)','propReactionInput1',customInputs[0]);
   html+=field('Input 2 (clockwise port)','propReactionInput2',customInputs[1]);
   html+=field('Output (green port)','propReactionOutput',customOutput);
   if(!reactionEngine.confluenceRecipe(confluenceProps()))html+='<p class="warning-text">Select three different elements.</p>';
  }
  html+='<p class="property-note">One chamber per map. Place one Source for each input, and one Destination for the output. Rotate all three ports with Output direction.</p>';
 }
 if(type==='checkpoint')
  html+=`<label>Required element<select id="propCheckpoint"><option value="any">Any element</option>${Object.entries(ELEMENTS).map(([id,e])=>`<option value="${id}" ${checkpointElement===id?'selected':''}>${e.name}</option>`).join('')}</select></label>`;
 if(tool==='art'||tool==='pick')html='';
 if(tool==='inspect')html='<p class="property-note">Click any cell to inspect its terrain, fixture, reaction, direction, connection ID or node.</p>';
 if(tool==='copy')html='<p class="property-note">Select a cell to copy its terrain, fixture or endpoint, gameplay properties, and artwork.</p>';
 if(tool==='stamp')html='<p class="property-note">Tap or drag to stamp the copied cell. Check any pasted endpoints or links for duplicates.</p>';
 if(tool==='phase:toggle')html='<p class="property-note">Only available when Day/Night is enabled. Click an Exposed or Covered terrain tile to mark/unmark it as a shifting channel. Its terrain swaps on Night.</p>';
 if(type==='phasePlate')html='<p class="property-note">First select the triggering element in the Element palette (usually Light), then place this plate on Land. The phase changes only when that element completes a route through the plate.</p>';
 if(!html&&!['art','pick'].includes(tool))html='<p class="property-note">No extra properties for this tool. Painting terrain preserves nothing above it; painting a fixed component preserves its terrain when compatible.</p>';
 $('properties').innerHTML=html;
 $('art-brush').hidden=!['art','pick'].includes(tool);
 if($('propDirection'))$('propDirection').onchange=e=>direction=e.target.value;
 if($('propPair'))$('propPair').oninput=e=>pairId=e.target.value.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,12);
 if($('propCheckpoint'))$('propCheckpoint').onchange=e=>checkpointElement=e.target.value;
 if($('propReaction'))$('propReaction').onchange=e=>{reactionId=e.target.value;updateProperties();};
 for(const [id,update] of [
  ['propReactionInput1',v=>customInputs[0]=v],
  ['propReactionInput2',v=>customInputs[1]=v],
  ['propReactionOutput',v=>customOutput=v]
 ])if($(id))$(id).onchange=e=>{update(e.target.value);updateProperties();};
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function cellMarkup(c){
 let out='';
 const variant=window.EFVariants.resolve(c.componentArt,c.component);
 const illustrated=Boolean(variant)||window.EFBoardArt.structures.has(c.component);
 const url=c.component?assets.components?.[c.component]:assets.terrain?.[c.terrain];
 if(url)out+=`<img class="asset" src="${escapeHtml(url)}" alt="">`;
 else if(!illustrated&&!c.node&&c.component!=='confluence'&&(c.component||(!window.EFBoardArt.terrains.has(c.terrain)&&!window.EFVariants.resolve(c.terrainArt,c.terrain)))){
  out+=`<span class="glyph">${c.component?glyph('component',c.component):glyph('terrain',c.terrain)}</span>`;
 }
 if(c.node){
  const e=ELEMENTS[c.node.element];
  out+=`<span class="node-shape ${c.node.role}" style="background:${e.color};border-color:${e.color}">${c.node.role==='source'?'S':'D'}</span>`;
 }
 if(c.component==='phasePlate')out+='<span class="phase-plate-editor" aria-label="Day and Night pressure plate">◈</span>';
 if(c.props?.phaseShift)out+='<span class="phase-mark" aria-label="Shifts between Day and Night">↔</span>';
 if(c.component==='confluence'){
  const recipe=reactionEngine.confluenceRecipe(c.props),ports=reactionEngine.confluencePortSides(c.props);
  const entries=recipe&&ports?[[recipe.inputs[0],ports.input1],[recipe.inputs[1],ports.input2],[recipe.output,ports.output]]:[];
  out+='<span class="confluence-mark" aria-hidden="true"><span class="confluence-core">◇</span>'+
   entries.map(([kind,side])=>`<span class="confluence-port confluence-${kind} port-${side}" style="background:${ELEMENTS[kind].color}">${confluenceSymbol(kind)}</span>`).join('')+'</span>';
 }
  if(c.component&&c.props?.pairId&&(!illustrated||url))out+=`<span class="overlay">${escapeHtml(c.props.pairId)}</span>`;
 if((c.terrain==='oneway'||c.props?.direction)&&!c.node&&c.component!=='confluence')out+=`<span class="direction">${{N:'↑',E:'→',S:'↓',W:'←'}[c.props?.direction||'E']}</span>`;
 return out;
}
function decorateCell(element,cell){
 window.EFBoardArt.setTerrain(element,cell.terrain,cell.terrainArt);
 window.EFBoardArt.decorate(element,cell.component,{link:cell.props?.pairId,custom:Boolean(assets.components?.[cell.component]),spec:cell.componentArt});
}
function cellClass(c){return `cell ${c.terrain} ${c.component?'has-component':''} ${c.node?'node':''}`}
function cellLabel(c,i){
 return `Row ${Math.floor(i/map.width)+1}, column ${i%map.width+1}, ${c.node?ELEMENTS[c.node.element].name.toLowerCase()+' '+c.node.role:c.component==='confluence'?'Confluence: '+(reactionEngine.confluenceRecipe(c.props)?reactionLabel(reactionEngine.confluenceRecipe(c.props)):'invalid recipe')+', output '+(c.props?.direction||'E'):c.component||c.terrain}`;
}
function render(){const b=$('board');b.style.setProperty('--cols',map.width);b.style.setProperty('--rows',map.height);b.innerHTML=map.cells.map((c,i)=>`<div class="${cellClass(previewCell(c))}" data-i="${i}" role="gridcell" aria-label="${cellLabel(c,i)}">${cellMarkup(previewCell(c))}</div>`).join('');map.cells.forEach((cell,i)=>decorateCell(b.children[i],previewCell(cell)));$('count').textContent=`${map.width} × ${map.height} · ${map.width*map.height} cells`;$('width').value=map.width;$('height').value=map.height;updateHistory();window.EFEditorArt?.boardChanged()}
function refreshCell(i){
 const cell=map.cells[i],el=$('board').children[i];
 el.className=cellClass(previewCell(cell));
 el.innerHTML=cellMarkup(previewCell(cell));
 decorateCell(el,previewCell(cell));
 el.setAttribute('aria-label',cellLabel(cell,i));
}
function paint(i){
 if(i<0||i>=map.cells.length||i===lastIndex)return;
 lastIndex=i;
 if(tool==='inspect'){window.EFEditorArt?.select(i);return;}
 if(tool==='pick'){window.EFEditorArt.select(i);window.EFEditorArt.pick(i);drawing=false;return;}
 if(tool==='copy'){
  window.EFEditorArt?.select(i);
  copiedCell=clone(map.cells[i]);
  setTool('stamp');
  drawing=false;
  return;
 }
 const prev=map.cells[i];
 let next=clone(prev);
 const [kind,id]=tool.split(':');
 if(tool==='art')next=window.EFEditorArt.paintArt(prev);
 else if(tool==='stamp')next=clone(copiedCell);
 else if(tool==='phase:toggle'){
  if(!map.phaseRules||!['exposed','covered'].includes(prev.terrain)||prev.component||prev.node){
   showMessage('Enable Day/Night first, then mark an Exposed or Covered tile without a fixture.',false);return;
  }
  if(next.props?.phaseShift){delete next.props.phaseShift;if(!Object.keys(next.props).length)delete next.props;}
  else next.props={...next.props,phaseShift:true};
 }
 else if(tool==='erase'||tool==='terrain:land')next={terrain:'land'};
 else if(kind==='terrain')next={terrain:id,...(id==='oneway'?{props:{direction}}:{})};
 else if(kind==='node')next={terrain:'land',node:{element,role:id},...(prev.terrain==='land'&&prev.terrainArt?{terrainArt:prev.terrainArt}:{})};
 else if(kind==='component'){
  if(id==='confluence'&&!reactionEngine.confluenceRecipe(confluenceProps())){
   showMessage('Select three different elements for the custom reaction.',false);return;
  }
  next={terrain:prev.terrain,component:id,...(prev.terrainArt?{terrainArt:prev.terrainArt}:{})};
  if(['portal','tunnel'].includes(id))next.props={pairId:pairId.trim()||'A'};
  else if(['junction','sorter','gate','booster','confluence'].includes(id))next.props=id==='confluence'?{direction,...confluenceProps()}:{direction};
  else if(id==='checkpoint')next.props={element:checkpointElement};
  else if(id==='phasePlate')next.props={element};
 }
 if(kind==='terrain'||kind==='component'){
  const spec=window.EFEditorArt?.placementArt(kind,id);
  if(spec)next[kind==='terrain'?'terrainArt':'componentArt']=spec;
 }
 if(JSON.stringify(prev)===JSON.stringify(next)){window.EFEditorArt?.select(i);return;}
 if(!changedStroke){snapshot();changedStroke=true;}
 map.cells[i]=next;
 refreshCell(i);
 window.EFEditorArt?.select(i);
 dirty=true;
 $('dirty').textContent='Unsaved changes';
}
function indexFromPointer(event){
 const cell=document.elementFromPoint(event.clientX,event.clientY)?.closest('.cell');
 return cell&&$('board').contains(cell)?Number(cell.dataset.i):-1;
}
function paintBetween(from,to){
 if(from<0||from===to){paint(to);return;}
 let x=from%map.width,y=Math.floor(from/map.width);
 const endX=to%map.width,endY=Math.floor(to/map.width);
 const dx=Math.abs(endX-x),dy=-Math.abs(endY-y);
 const stepX=Math.sign(endX-x),stepY=Math.sign(endY-y);
 let error=dx+dy;
 while(x!==endX||y!==endY){
  const step=2*error;
  if(step>=dy){error+=dy;x+=stepX;}
  if(step<=dx){error+=dx;y+=stepY;}
  paint(y*map.width+x);
 }
}
const paintBoard=$('board');
let strokePointer=null;
paintBoard.addEventListener('pointerdown',event=>{
 if(window.EFPlay?.isActive()||event.button!==0||strokePointer!==null)return;
 const index=indexFromPointer(event);
 if(index<0)return;
 event.preventDefault();
 lastIndex=-1;
 changedStroke=false;
 drawing=true;
 strokePointer=event.pointerId;
 paintBoard.setPointerCapture(event.pointerId);
 paint(index);
});
paintBoard.addEventListener('pointermove',event=>{
 const index=indexFromPointer(event);
 if(index>=0)$('coords').textContent=`Row ${Math.floor(index/map.width)+1}, column ${index%map.width+1}`;
 if(!drawing||event.pointerId!==strokePointer)return;
 if(index<0){lastIndex=-1;return;}
 if(tool==='inspect')paint(index);
 else paintBetween(lastIndex,index);
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])paintBoard.addEventListener(type,event=>{
 if(event.pointerId!==strokePointer)return;
 strokePointer=null;
 drawing=false;
 lastIndex=-1;
 if(changedStroke)markDirty();
 changedStroke=false;
});
paintBoard.addEventListener('contextmenu',event=>event.preventDefault());
function resize(){const w=Number($('width').value),h=Number($('height').value);if(!Number.isInteger(w)||!Number.isInteger(h)||w<4||h<4||w>24||h>24){alert('Width and height must be whole numbers from 4 to 24.');return}if(w===map.width&&h===map.height)return;snapshot();const old=map;map={...old,width:w,height:h,cells:Array.from({length:w*h},(_,i)=>{const x=i%w,y=Math.floor(i/w);return x<old.width&&y<old.height?clone(old.cells[y*old.width+x]):{terrain:'land'}})};render();markDirty()}
$('resize').onclick=resize;$('newMap').onclick=()=>{if(!confirm('Start a new map? Unsaved changes will be lost.'))return;map=newBoard();history=[];future=[];syncMeta();render();markDirty();$('messages').textContent='New blank map created.'};$('clear').onclick=()=>{if(!confirm('Clear all cells?'))return;snapshot();map.cells=map.cells.map(()=>({terrain:'land'}));render();markDirty()};$('undo').onclick=()=>{if(!history.length)return;future.push(clone(map));map=history.pop();syncMeta();render();markDirty()};$('redo').onclick=()=>{if(!future.length)return;history.push(clone(map));map=future.pop();syncMeta();render();markDirty()};
function syncMeta(){
 $('phase-enabled').checked=Boolean(map.phaseRules);
 $('phase-preview').disabled=!map.phaseRules;
 if(!map.phaseRules)phasePreview='day';
 $('phase-preview').value=phasePreview;
 $('constraints').value=JSON.stringify(map.constraints||{},null,2);$('mapName').value=map.name;$('description').value=map.description;for(const [id,n] of Object.entries(map.inventory))if($('inv-'+id))$('inv-'+id).value=n}
$('phase-enabled').onchange=e=>{
 if(!e.target.checked&&map.cells.some(c=>c.component==='phasePlate'||c.props?.phaseShift)){
  e.target.checked=true;
  showMessage('Remove the phase plate and shifting channels before disabling Day/Night.',false);
  return;
 }
 snapshot();
 if(e.target.checked){
  map.phaseRules={initial:'day'};
  // The first phase prototype uses a fixed-map route puzzle with no loadout.
  for(const kind of Object.keys(map.inventory))map.inventory[kind]=0;
 }else delete map.phaseRules;
 phasePreview='day';
 syncMeta();render();markDirty();
};
$('phase-preview').onchange=e=>{phasePreview=e.target.value;render();};
$('mapName').onchange=e=>{const name=e.target.value.trim()||'Untitled Map';if(name!==map.name){snapshot();map.name=name;markDirty()}};$('description').onchange=e=>{if(e.target.value!==map.description){snapshot();map.description=e.target.value;markDirty()}};
$('inventory').innerHTML=COMPONENTS.map(([id,label])=>`<label class="inventory-row">${label}<input id="inv-${id}" type="number" min="0" max="99" value="${map.inventory[id]}"></label>`).join('');for(const [id] of COMPONENTS)$('inv-'+id).onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<0||n>99){e.target.value=map.inventory[id];return}if(n!==map.inventory[id]){snapshot();map.inventory[id]=n;markDirty()}};
$('validate').onclick=()=>{const {issues,matched}=structuralErrors(map),box=$('messages');box.className='messages '+(issues.length?'warn':'ok');box.textContent=issues.length?'Structure needs attention:\n• '+issues.join('\n• '):`Structure valid: ${matched} matched element pair(s).\nSolvability and component transport rules have NOT been checked.`};
function json(){return JSON.stringify(parseMap(map),null,2)}
function downloadJSON(contents,suffix){
 const blob=new Blob([contents],{type:'application/json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;
 const slug=map.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'element-forge-map';
 a.download=slug+suffix;
 a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showMessage(message,ok){
 $('messages').className='messages '+(ok?'ok':'warn');
 $('messages').textContent=message;
}
$('save').onclick=()=>{
 try{downloadJSON(json(),'.json');dirty=false;$('dirty').textContent='Exported JSON';}
 catch(err){showMessage('Export failed: '+err.message,false);}
};
$('saveLevel').onclick=()=>{
 try{
  const level=window.EFMap.createLevel(map);
  downloadJSON(JSON.stringify(level,null,2),'.level.json');
  showMessage('Verified game level exported.',true);
 }catch(err){showMessage('Level export failed: '+err.message,false);}
};
$('copyJSON').onclick=async()=>{
 try{
  const value=json();
  try{await navigator.clipboard.writeText(value);}
  catch{
   const field=document.createElement('textarea');
   field.value=value;
   document.body.appendChild(field);
   try{
    field.select();
    if(!document.execCommand('copy'))throw Error('Clipboard unavailable. Use Export JSON.');
   }finally{field.remove();}
  }
  showMessage('Map JSON copied.',true);
 }catch(err){showMessage('Copy failed: '+err.message,false);}
};
$('load').onclick=()=>$('file').click();
$('applyConstraints').onclick=()=>{try{const value=parseConstraints(JSON.parse($('constraints').value));if(JSON.stringify(map.constraints)!==JSON.stringify(value)){snapshot();map.constraints=value;markDirty();}$('messages').className='messages ok';$('messages').textContent='Element restrictions applied.';}catch(err){$('messages').className='messages warn';$('messages').textContent='Invalid restrictions: '+err.message;}};
let importSequence=0;
$('file').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const sequence=++importSequence;try{
 if(window.EFPlay.isActive())throw Error('Exit Playtest before importing.');
 if(f.size>1024*1024)throw Error('Map files must be 1 MiB or smaller.');
 const contents=await f.text();
 if(sequence!==importSequence)return;
 const source=JSON.parse(contents.replace(/^\uFEFF/,''));
 const next=source?.format==='element-forge-level'?window.EFMap.readLevel(source):parseMap(source);
 if(window.EFPlay.isActive())throw Error('Exit Playtest before importing.');if(dirty&&!confirm('Replace current map?'))return;snapshot();map=next;syncMeta();render();window.EFEditorArt?.saveDraft();dirty=false;$('dirty').textContent='Imported JSON';$('messages').className='messages';$('messages').textContent='Map imported. Run structural validation.'}catch(err){alert('Import failed: '+err.message)}finally{if(sequence===importSequence)e.target.value=''}};
document.addEventListener('keydown',e=>{if(window.EFPlay?.isActive()||e.target.matches('input,textarea,select'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?$('redo').click():$('undo').click()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();$('redo').click()}});
// Optional assets manifest; local file:// browsers may block fetch, so built-in glyphs always work.
if(!window.EFStandaloneEditor)fetch('assets.json').then(r=>r.ok?r.json():null).then(a=>{if(!a)return;for(const kind of ['terrain','components'])for(const [id,path] of Object.entries(a[kind]||{})){if(typeof path==='string'&&path&&/^(assets\/|\.\/assets\/)[\w./-]+\.(svg|png|webp)$/i.test(path))assets[kind][id]=path}if(!window.EFPlay?.isActive())render()}).catch(()=>{});
buildPalette();render();syncMeta();
