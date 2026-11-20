'use strict';
(function(root){
 const F=typeof module==='undefined'?root.EFMap:require('../map-editor/map-format.js');

 // Scenic sketches are row-major. Uppercase endpoints are sources.
 function level(name,description,rows,inventory={},construction){
  const map=F.fresh();
  const terrain={'.':'land','#':'mountain','~':'water','*':'forest'};
  const elements={f:'fire',w:'water',n:'nature'};
  if(rows.length!==12||rows.some(row=>row.length!==12))throw Error('Expected a 12 × 12 level.');
  map.name=name;
  map.description=description;
  map.inventory=inventory;
  map.cells=rows.join('').split('').map(mark=>{
   if(terrain[mark])return {terrain:terrain[mark]};
   const element=elements[mark.toLowerCase()];
   if(!element)throw Error('Unknown level symbol: '+mark);
   return {terrain:'land',node:{element,role:mark===mark.toUpperCase()?'source':'destination'}};
  });
  if(construction)map.construction=construction;
  return {format:'element-forge-level',schemaVersion:1,rulesVersion:construction?2:1,map};
 }

 const catalog=[
  level('Ember Meadow','Draw a route from the Fire spring to its matching forge. The ridge leaves a way around both ends.',[
   '************','***......***','**........**','*...F.#....*','*.....##...*','*.....##...*',
   '*.....##...*','*......#f..*','**........**','***......***','************','************'
  ]),
  level('Brook Bridge','Build a bridge on one water tile to carry Water across the brook.',[
   '#####~######','##...~...###','#....~....##','#....~.w..##','#..W.~....##','#....~....##',
   '##...~...###','###..~..####','####.~.#####','#####~######','#####~######','#####~######'
  ],{bridge:1}),
  level('Stone Pass','Fire and Nature meet in a narrow pass. Place an intersection where the two routes cross, then pass straight through it.',[
   '############','######N#####','######.#####','######.#####','######.#####','######.#####',
   '#F........f#','######.#####','######.#####','######n#####','############','############'
  ],{intersection:1}),
  level('The River Crossing','You can afford one bridge. Study the river bend and both pairs of endpoints before choosing where to build.',[
   '############','####....####','###......###','##...~....##','##F..~..f.##','###..~...###',
   '#######.####','###..~...###','##.W.~....##','##...~.w..##','###..~...###','#####~######'
  ],{bridge:2,intersection:1},{budget:2,prices:{bridge:2,intersection:1}})
 ];

 const api={catalog};
 root.EFLevels=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
