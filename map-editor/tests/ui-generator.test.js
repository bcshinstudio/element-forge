'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const E=require('../engine.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const options=[...html.matchAll(/<option value="([^"]+)"/g)].map(x=>x[1]);
const script=fs.readFileSync(path.join(__dirname,'../generator.js'),'utf8');
for(const challenge of options){
 test(`generator UI selection ${challenge} produces verified editable map`,()=>{
  const nodes=new Map();
  const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',className:''});return nodes.get(id);};
  get('genSeed').value='1042';get('genDifficulty').value=challenge;
  let rendered=0, synced=0;
  const context={EFEngine:E,document:{getElementById:get},dirty:false,history:[],future:[],syncMeta:()=>synced++,render:()=>rendered++,console};
  context.window=context;
  vm.createContext(context);
  vm.runInContext('let map;',context);
  vm.runInContext(script,context,{filename:'generator.js'});
  get('generate').onclick();
  assert.equal(get('generatorMessages').className,'messages ok',get('generatorMessages').textContent);
  assert.equal(vm.runInContext('map.format',context),'element-forge-map');
  assert.equal(vm.runInContext('map.width',context),12);assert.equal(vm.runInContext('map.height',context),12);
  assert.equal(rendered,1);assert.equal(synced,1);
  assert.equal(get('dirty').textContent,'Generated · unsaved');
 });
}
