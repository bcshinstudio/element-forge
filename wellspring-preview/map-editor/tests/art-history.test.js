'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const F=require('../map-format');
const app=fs.readFileSync(require.resolve('../app.js'),'utf8');

test('one fast touch stroke paints matching cells and restores the entire stroke with one undo',()=>{
 const historyCode=app.slice(app.indexOf('function snapshot'),app.indexOf('function glyph'));
 const gestureCode=app.slice(app.indexOf('function paint(i)'),app.indexOf('function resize()'));
 const undoCode=app.slice(app.indexOf("$('undo').onclick"),app.indexOf('function syncMeta'));
 const original=F.fresh(4,4);
 original.cells[0].node={element:'fire',role:'source'};
 original.cells[2].terrain='forest';
 original.cells[3].component='portal';
 original.cells[3].props={pairId:'A'};
 const art={id:'land-tall-grass',rotation:90};
 const board={contains:()=>true,setPointerCapture:()=>{},addEventListener(type,callback){this[type]=callback;}};
 const buttons={board,dirty:{},undo:{},redo:{}};
 const context={window:{EFEditorArt:{
  select:()=>{},saveDraft:()=>{},validate:()=>{},
  paintArt:cell=>cell.terrain==='land'?{...cell,terrainArt:art}:cell
 }},$ :id=>buttons[id],clone:structuredClone,refreshCell:()=>{},syncMeta:()=>{},render:()=>{},
 document:{elementFromPoint:x=>({closest:()=>({dataset:{i:String(x)}})})}};
 context.initial=structuredClone(original);
 context.coords={};
 buttons.coords=context.coords;
 vm.createContext(context);
 vm.runInContext(`let map=initial, history=[], future=[], drawing=false, changedStroke=false,
  lastIndex=-1, dirty=false, tool='art';`+historyCode+gestureCode+undoCode,context);
 const pointer=(x,pointerId)=>({button:0,pointerId,clientX:x,clientY:0,preventDefault(){}});
 board.pointerdown(pointer(0,10));
 board.pointermove(pointer(15,11));
 board.pointermove(pointer(3,10));
 board.pointerup(pointer(3,10));
 const state=()=>JSON.parse(vm.runInContext('JSON.stringify(map)',context));
 const painted=state();
 assert.deepEqual(painted.cells.slice(0,4).map(c=>c.terrainArt),[art,art,undefined,art]);
 assert.deepEqual(painted.cells[0].node,original.cells[0].node);
 assert.deepEqual(painted.cells[3].props,original.cells[3].props);
 assert.equal(painted.cells[15].terrainArt,undefined);
 assert.equal(vm.runInContext('history.length',context),1);
 buttons.undo.onclick();
 assert.deepEqual(state(),original);
 buttons.redo.onclick();
 assert.deepEqual(state(),painted);
});

test('offline Playtest gives the game its own map and art, then returns to the draft',async()=>{
 const catalog=require('../../art/catalog.json');
 const land=Object.values(catalog).find(item=>item.label==='Tall grass');
 const span=Object.values(catalog).find(item=>item.type==='bridge'&&item.piece==='vertical');
 const draft=F.fresh(4,4);
 draft.rulesVersion=4;
 draft.name="Custom $& $' </script>";
 draft.cells[0]={terrain:'land',node:{element:'fire',role:'source'},terrainArt:{id:land.id,rotation:90}};
 draft.cells[1]={terrain:'land',node:{element:'fire',role:'destination'}};
 draft.toolArt={bridge:{id:span.id,rotation:0}};
 const fields=Object.fromEntries(['playtest-panel','playtest-frame','playMode','playtest-document','editor-layout','exit-playtest']
  .map(id=>[id,{hidden:id==='playtest-panel',focus(){this.focused=true;},removeAttribute(key){delete this[key];}}]));
 fields['playtest-document'].textContent=JSON.stringify('<html><body><main></main></body></html>');
 const header={inert:false};
 const error=[];
 const context={map:draft,document:{getElementById:id=>fields[id],querySelector:()=>header},
  showMessage:message=>error.push(message),window:{EFMap:F,EFArtCatalog:catalog,EFVariants:{
   resolve:spec=>catalog[spec.id],options:type=>Object.values(catalog).filter(item=>item.type===type)
  }}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../play.js'),'utf8'),context);
 await fields.playMode.onclick();
 assert.deepEqual(error,[]);
 assert.equal(context.window.EFPlay.isActive(),true);
 assert.equal(fields['editor-layout'].hidden,true);
 assert.equal(header.inert,true);
 const game={window:{}};
 vm.runInNewContext(fields['playtest-frame'].srcdoc.match(/<script>([\s\S]*?)<\/script>/)[1],game);
 assert.equal(game.window.EFEditorDraft.map.name,draft.name);
 assert.deepEqual(JSON.parse(JSON.stringify(game.window.EFEditorDraft.map.cells)),draft.cells);
 assert.equal(Object.keys(game.window.EFArtCatalog).length,3);
 game.window.EFEditorDraft.map.cells[0].terrain='forest';
 assert.equal(context.map.cells[0].terrain,'land');
 fields['exit-playtest'].onclick();
 assert.equal(context.window.EFPlay.isActive(),false);
 assert.equal(fields['editor-layout'].hidden,false);
 assert.equal(fields.playMode.focused,true);
 assert.equal(header.inert,false);
});
