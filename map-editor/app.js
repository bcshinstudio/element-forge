'use strict';
// Editor data is renderer-independent. Future generator/solver should use this schema.
const {TERRAIN,COMPONENTS,ELEMENTS,DIRECTIONS,fresh,parseConstraints,parseMap,structuralErrors}=window.EFMap;
const $=id=>document.getElementById(id),clone=o=>JSON.parse(JSON.stringify(o));
const newBoard=()=>({...fresh(),rulesVersion:3});
let map=newBoard(),tool='terrain:mountain',element='fire',direction='E',pairId='A',checkpointElement='any',history=[],future=[],drawing=false,changedStroke=false,lastIndex=-1,dirty=false,assets={terrain:{},components:{}};
function snapshot(){history.push(clone(map));if(history.length>100)history.shift();future=[];updateHistory()}
function updateHistory(){
 const inPlay=window.EFPlay?.isActive();
 $('undo').disabled=inPlay||!history.length;
 $('redo').disabled=inPlay||!future.length;
}
window.EFEditor={updateHistory};
function markDirty(){window.EFPlay?.refresh();dirty=true;$('dirty').textContent='Unsaved changes'}
function glyph(type,id){const item=(type==='terrain'?TERRAIN:COMPONENTS).find(x=>x[0]===id);return item?.[2]||''}
function setTool(t){tool=t;document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));$('selected').textContent='Selected: '+(t==='erase'?'Eraser':t==='inspect'?'Inspect':t.startsWith('node:')?`${ELEMENTS[element].name} ${t.split(':')[1]}`:t.split(':')[1]);updateProperties()}
function buildPalette(){let html='';for(const [name,entries] of [['Terrain',TERRAIN],['Fixed components',COMPONENTS]]){html+=`<div class="group-title">${name}</div><div class="palette-grid">`;for(const [id,label,icon] of entries)html+=`<button class="tool" data-tool="${name==='Terrain'?'terrain':'component'}:${id}"><span class="symbol">${icon}</span><span>${label}</span></button>`;html+='</div>'}html+='<div class="group-title">Element nodes / editing</div><div class="palette-grid"><button class="tool" data-tool="node:source">● Source</button><button class="tool" data-tool="node:destination">◎ Destination</button><button class="tool" data-tool="inspect">⌖ Inspect</button><button class="tool" data-tool="erase">⌫ Erase</button></div>';$('palette').innerHTML=html;document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$('elements').innerHTML='<div class="element-grid">'+Object.entries(ELEMENTS).map(([id,e])=>`<button class="element" data-element="${id}" title="${e.name}" aria-label="${e.name}"><span class="swatch" style="background:${e.color}"></span>${e.icon?e.icon+' '+e.name:e.name}</button>`).join('')+'</div>';document.querySelectorAll('[data-element]').forEach(b=>b.onclick=()=>{element=b.dataset.element;document.querySelectorAll('[data-element]').forEach(x=>x.classList.toggle('active',x.dataset.element===element));setTool(tool)});document.querySelector('[data-element="fire"]').classList.add('active');setTool(tool)}
function updateProperties(){const type=tool.split(':')[1];let html='';if(['oneway','junction','sorter','gate','booster'].includes(type))html+=`<label>Orientation<select id="propDirection">${DIRECTIONS.map(d=>`<option value="${d}" ${direction===d?'selected':''}>${{N:'North ↑',E:'East →',S:'South ↓',W:'West ←'}[d]}</option>`).join('')}</select></label>`;if(['portal','tunnel'].includes(type))html+=`<label>Connection ID (two matching endpoints)<input id="propPair" maxlength="12" value="${escapeHtml(pairId)}"></label><p class="property-note">Place exactly two ${type} endpoints with the same ID. Tunnel travel between ends is intended to pass under intervening terrain; paired links work in Playtest. Tunnel ends must align horizontally or vertically with blocked terrain between them.</p>`;if(type==='checkpoint')html+=`<label>Required element<select id="propCheckpoint"><option value="any">Any element</option>${Object.entries(ELEMENTS).map(([id,e])=>`<option value="${id}" ${checkpointElement===id?'selected':''}>${e.name}</option>`).join('')}</select></label>`;if(tool==='inspect')html='<p class="property-note">Click any cell to inspect its terrain, fixed component, orientation, connection ID, or node.</p>';if(!html)html='<p class="property-note">No extra properties for this tool. Painting terrain preserves nothing above it; painting a fixed component preserves its terrain when compatible.</p>';$('properties').innerHTML=html;if($('propDirection'))$('propDirection').onchange=e=>direction=e.target.value;if($('propPair'))$('propPair').oninput=e=>pairId=e.target.value.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,12);if($('propCheckpoint'))$('propCheckpoint').onchange=e=>checkpointElement=e.target.value}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function cellMarkup(c){let out='';const url=c.component?assets.components?.[c.component]:assets.terrain?.[c.terrain];if(url)out+=`<img class="asset" src="${escapeHtml(url)}" alt="">`;else out+=`<span class="glyph">${c.component?glyph('component',c.component):glyph('terrain',c.terrain)}</span>`;if(c.node){const e=ELEMENTS[c.node.element];out+=`<span class="node-shape ${c.node.role}" style="background:${e.color};${c.node.role==='destination'?`border-color:${e.color};`:''}">${c.node.role==='source'?'S':'D'}</span>`}if(c.component&&c.props?.pairId)out+=`<span class="overlay">${escapeHtml(c.props.pairId)}</span>`;if((c.terrain==='oneway'||c.props?.direction)&&!c.node)out+=`<span class="direction">${{N:'↑',E:'→',S:'↓',W:'←'}[c.props?.direction||'E']}</span>`;return out}
function cellClass(c){return `cell ${c.terrain} ${c.component?'has-component':''} ${c.node?'node':''}`}
function cellLabel(c,i){
 return `Row ${Math.floor(i/map.width)+1}, column ${i%map.width+1}, ${c.node?ELEMENTS[c.node.element].name.toLowerCase()+' '+c.node.role:c.component||c.terrain}`;
}
function render(){const b=$('board');b.style.setProperty('--cols',map.width);b.style.setProperty('--rows',map.height);b.innerHTML=map.cells.map((c,i)=>`<div class="${cellClass(c)}" data-i="${i}" role="gridcell" aria-label="${cellLabel(c,i)}">${cellMarkup(c)}</div>`).join('');$('count').textContent=`${map.width} × ${map.height} · ${map.width*map.height} cells`;$('width').value=map.width;$('height').value=map.height;updateHistory();window.EFPlay?.refresh()}
function inspect(i){const c=map.cells[i];$('messages').className='messages';$('messages').textContent=`Cell (${i%map.width+1}, ${Math.floor(i/map.width)+1}):\n${JSON.stringify(c,null,2)}`;if(c.props?.direction)direction=c.props.direction;if(c.props?.pairId)pairId=c.props.pairId;if(c.props?.element)checkpointElement=c.props.element}
function paint(i){if(i<0||i>=map.cells.length||i===lastIndex)return;lastIndex=i;if(tool==='inspect'){inspect(i);return}const prev=map.cells[i];let next=clone(prev);const [kind,id]=tool.split(':');if(tool==='erase'||tool==='terrain:land')next={terrain:'land'};else if(kind==='terrain')next={terrain:id,...(id==='oneway'?{props:{direction}}:{})};else if(kind==='node')next={terrain:prev.terrain==='land'?prev.terrain:'land',node:{element,role:id}};else if(kind==='component'){next={terrain:prev.terrain,component:id};if(['portal','tunnel'].includes(id))next.props={pairId:pairId.trim()||'A'};else if(['junction','sorter','gate','booster'].includes(id))next.props={direction};else if(id==='checkpoint')next.props={element:checkpointElement};if(prev.node)delete next.node;}if(JSON.stringify(prev)===JSON.stringify(next))return;if(!changedStroke){snapshot();changedStroke=true}map.cells[i]=next;const el=$('board').children[i];el.className=cellClass(next);el.innerHTML=cellMarkup(next);el.setAttribute('aria-label',cellLabel(next,i));markDirty()}
function indexFromPointer(e){const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('.cell');return el&&$('board').contains(el)?Number(el.dataset.i):-1}
$('board').addEventListener('pointerdown',e=>{if(window.EFPlay?.isActive()){window.EFPlay.pointer(e);return;}if(e.button!==0)return;e.preventDefault();lastIndex=-1;changedStroke=false;drawing=true;$('board').setPointerCapture(e.pointerId);paint(indexFromPointer(e))});$('board').addEventListener('pointermove',e=>{if(window.EFPlay?.isActive()){window.EFPlay.pointer(e);return;}const i=indexFromPointer(e);if(i>=0)$('coords').textContent=`Row ${Math.floor(i/map.width)+1}, column ${i%map.width+1}`;if(drawing)paint(i)});for(const event of ['pointerup','pointercancel','lostpointercapture'])$('board').addEventListener(event,()=>{drawing=false;lastIndex=-1;changedStroke=false});$('board').addEventListener('contextmenu',e=>e.preventDefault());
function resize(){const w=Number($('width').value),h=Number($('height').value);if(!Number.isInteger(w)||!Number.isInteger(h)||w<4||h<4||w>24||h>24){alert('Width and height must be whole numbers from 4 to 24.');return}if(w===map.width&&h===map.height)return;snapshot();const old=map;map={...old,width:w,height:h,cells:Array.from({length:w*h},(_,i)=>{const x=i%w,y=Math.floor(i/w);return x<old.width&&y<old.height?clone(old.cells[y*old.width+x]):{terrain:'land'}})};render();markDirty()}
$('resize').onclick=resize;$('newMap').onclick=()=>{if(!confirm('Start a new map? Unsaved changes will be lost.'))return;map=newBoard();history=[];future=[];syncMeta();render();markDirty();$('messages').textContent='New blank map created.'};$('clear').onclick=()=>{if(!confirm('Clear all cells?'))return;snapshot();map.cells=map.cells.map(()=>({terrain:'land'}));render();markDirty()};$('undo').onclick=()=>{if(!history.length)return;future.push(clone(map));map=history.pop();syncMeta();render();markDirty()};$('redo').onclick=()=>{if(!future.length)return;history.push(clone(map));map=future.pop();syncMeta();render();markDirty()};
function syncMeta(){$('constraints').value=JSON.stringify(map.constraints||{},null,2);$('mapName').value=map.name;$('description').value=map.description;for(const [id,n] of Object.entries(map.inventory))if($('inv-'+id))$('inv-'+id).value=n}
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
 if(window.EFPlay.isActive())throw Error('Exit Playtest before importing.');if(dirty&&!confirm('Replace current map?'))return;snapshot();map=next;syncMeta();render();dirty=false;$('dirty').textContent='Imported JSON';$('messages').className='messages';$('messages').textContent='Map imported. Run structural validation.'}catch(err){alert('Import failed: '+err.message)}finally{if(sequence===importSequence)e.target.value=''}};
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?$('redo').click():$('undo').click()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();$('redo').click()}});
// Optional assets manifest; local file:// browsers may block fetch, so built-in glyphs always work.
fetch('assets.json').then(r=>r.ok?r.json():null).then(a=>{if(!a)return;for(const kind of ['terrain','components'])for(const [id,path] of Object.entries(a[kind]||{})){if(typeof path==='string'&&path&&/^(assets\/|\.\/assets\/)[\w./-]+\.(svg|png|webp)$/i.test(path))assets[kind][id]=path}if(!window.EFPlay?.isActive())render()}).catch(()=>{});
buildPalette();render();syncMeta();
