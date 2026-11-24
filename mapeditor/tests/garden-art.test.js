'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const catalog=require('../../art/catalog.json');
const F=require('../map-format.js'), F2=require('../../map-editor/map-format.js');
global.EFArtCatalog=catalog;
const A=require('../../art/variants.js');
const garden=Object.values(catalog).filter(a=>a.id.startsWith('garden-'));
test('all 166 Garden WebP assets resolve, including matching restoration states',()=>{
 assert.equal(garden.length,166);
 for(const item of garden){
  const b=fs.readFileSync(path.join(__dirname,'../../art/variants',item.file));
  assert.ok(b.length>100);
  assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.subarray(8,12).toString(),'WEBP');
  assert.equal(A.resolve({id:item.id},item.type),item);
  if(item.activeId){assert.ok(catalog[item.activeId],item.id);assert.equal(catalog[item.activeId].type,item.type);}
 }
 for(let i=1;i<=9;i++){const d=catalog['garden-heart-dormant-'+i],a=catalog['garden-heart-active-'+i];assert.equal(d.type,'wall');assert.equal(d.activeId,a.id);}
});
test('Garden palette preserves rules, nodes and custom artwork and round trips in both editors',()=>{
 const map=F.fresh(12,12);map.cells[1]={terrain:'wall'};map.cells[2]={terrain:'forest'};map.cells[3]={terrain:'water'};
 map.cells[12].node={element:'fire',role:'source'};map.cells[13].node={element:'fire',role:'destination'};
 const before=structuredClone(map);
 assert.equal(A.applyPalette(map,11),true);
 assert.equal(map.artPalette,12);assert.equal(map.nodeAppearance,'garden');
 assert.equal(map.cells[0].terrainArt.id,'garden-stone-floor');
 assert.equal(map.cells[1].terrainArt.id,'garden-hedge-straight');
 map.cells[1].terrainArt={id:'garden-heart-dormant-1',rotation:0};
 assert.equal(A.applyPalette(map,11),true);
 assert.equal(map.cells[1].terrainArt.id,'garden-heart-dormant-1');
 for(const codec of [F,F2]){
  const parsed=codec.parseMap(JSON.parse(JSON.stringify(map)));
  assert.equal(parsed.artPalette,12);assert.equal(parsed.nodeAppearance,'garden');
  assert.deepEqual(parsed.cells.map(({terrainArt,...c})=>c),before.cells);
  assert.equal(parsed.cells[13].node.role,'destination');
 }
 assert.equal(A.chapters[11],'The Garden of Forgotten Wonders');
});
test('garden source and inlet art resolves for all six approved pairs; other elements retain classic fallback',()=>{
 const window={EFVariants:A};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../art/board.js'),'utf8'),{window});
 for(const e of ['fire','water','nature','electricity','wind','arcane']){
  assert.equal(window.EFBoardArt.nodeArtwork('garden',{element:e,role:'source'}).id,'garden-source-'+e);
  assert.equal(window.EFBoardArt.nodeArtwork('garden',{element:e,role:'destination'}).id,'garden-inlet-'+e);
 }
 assert.equal(window.EFBoardArt.nodeArtwork('garden',{element:'light',role:'source'}),null);
 assert.equal(window.EFBoardArt.nodeArtwork('classic',{element:'fire',role:'source'}),null);
 assert.ok(window.EFBoardArt.nodeArtwork('library',{element:'fire',role:'source'}));
});
