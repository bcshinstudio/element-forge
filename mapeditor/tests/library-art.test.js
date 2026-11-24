'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const F=require('../map-format.js');
const root=path.resolve(__dirname,'../..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'art/catalog.json'),'utf8'));
global.EFArtCatalog=catalog;const variants=require('../../art/variants.js');
test('all 59 library assets are registered and nonempty',()=>{const library=Object.values(catalog).filter(x=>x.id.startsWith('library-'));assert.equal(library.length,59);for(const item of library)assert.ok(fs.statSync(path.join(root,'art/variants',item.file)).size>0);});
test('all three node modes serialize; legacy maps remain unchanged',()=>{const map=F.fresh(4,4);assert.equal(F.parseMap(map).nodeAppearance,undefined);for(const mode of ['classic','library','books-only'])assert.equal(F.parseMap({...map,nodeAppearance:mode}).nodeAppearance,mode);assert.throws(()=>F.parseMap({...map,nodeAppearance:'invalid'}));});
test('library palette preserves logic and registers all endpoints',()=>{const map=F.fresh(4,4);map.cells[1]={terrain:'wall'};map.cells[0].node={role:'source',element:'fire'};const before=JSON.stringify(map.cells[0].node);assert.equal(variants.applyPalette(map,10),true);assert.equal(map.artPalette,11);assert.equal(map.cells[1].terrainArt.id,'library-bookshelf');assert.equal(JSON.stringify(map.cells[0].node),before);assert.equal(F.parseMap(map).artPalette,11);for(const element of Object.keys(F.ELEMENTS)){for(const [prefix,type] of [['source','node-source'],['destination','node-destination'],['open-destination','node-open-destination']])assert.ok(variants.resolve({id:'library-'+prefix+'-'+element},type));}});
