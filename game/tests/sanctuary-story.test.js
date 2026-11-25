'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),S=require('../sanctuary-story');
test('Ten ordered sanctuary scenes, valid speaker and expression references',()=>{
 const opening=S.panels('opening'),ending=S.panels('ending');
 assert.deepEqual([...new Set(opening.map(p=>p.art))],Array.from({length:5},(_,i)=>'sanctuary-'+(i+1)));
 assert.deepEqual([...new Set(ending.map(p=>p.art))],Array.from({length:5},(_,i)=>'sanctuary-'+(i+6)));
 const all=[...opening,...ending];assert.equal(new Set(all.map(p=>p.voiceId)).size,all.length);
 for(const p of all){assert.ok(S.art[p.art]);assert.ok(p.line);assert.ok(p.duration>0);if(p.speaker==='Caelan')assert.ok(S.portraits[p.expression]);}
 assert.ok(ending.some(p=>p.speaker==='Caelan'&&p.line.includes('accompany you')));
});
