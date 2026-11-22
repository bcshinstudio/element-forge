'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');

test('every literal DOM ID used by the game exists in its HTML',()=>{
 const source=readFileSync(join(__dirname,'../app.js'),'utf8');
 const markup=readFileSync(join(__dirname,'../index.html'),'utf8');
 const ids=new Set(Array.from(markup.matchAll(/\bid="([^"]+)"/g),match=>match[1]));
 const missing=new Set();
 for(const [,id] of source.matchAll(/\$\('([^']+)'\)/g)){
  if(!ids.has(id))missing.add(id);
 }
 assert.deepEqual([...missing],[]);
});
