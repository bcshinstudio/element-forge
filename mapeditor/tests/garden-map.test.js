'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const F=require('../map-format'),E=require('../engine'),F2=require('../../map-editor/map-format');
const map=require('../../maps/the-garden-of-forgotten-wonders.json'),solution=require('../../game/tests/fixtures/garden-solution.json'),catalog=require('../../art/catalog.json');
test('13x13 Garden preset has six matching pairs, valid dormant artwork and an independently solvable layout',()=>{
 assert.equal(map.width,13);assert.equal(map.height,13);assert.equal(map.cells.length,169);
 assert.equal(F.mapFindings(map).matched,6);assert.deepEqual(F.mapFindings(map).findings,[]);
 for(let i=0;i<9;i++)assert.equal(map.cells[(5+Math.floor(i/3))*13+5+i%3].terrainArt.id,'garden-heart-dormant-'+(i+1));
 for(const cell of map.cells)assert.equal(catalog[cell.terrainArt.id].type,cell.terrain);
 assert.deepEqual(E.checkAll(map,solution.routes,solution.placements),[]);
 assert.equal(E.solveConstruction(map).status,'solved');
 assert.deepEqual(F2.readLevel(F.createLevel(map)),F.parseMap(map));
 const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../../maps/garden-preset.js'),'utf8'),{window});assert.equal(JSON.stringify(window.EFGardenPreset),JSON.stringify(map));
});
