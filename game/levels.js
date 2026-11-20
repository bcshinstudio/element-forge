'use strict';
(function(root){
 const F=typeof module==='undefined'?root.EFMap:require('../map-editor/map-format.js');

 // Scenic sketches are row-major. Uppercase endpoints are sources.
 function level(name,description,rows,inventory={},construction,constraints={}){
  const map=F.fresh();
  const terrain={'.':'land','#':'mountain','~':'water','*':'forest'};
  const elements={f:'fire',w:'water',n:'nature',e:'electricity'};
  const checkpoints={'1':'fire','2':'water','3':'nature'};
  if(rows.length!==12||rows.some(row=>row.length!==12))throw Error('Expected a 12 × 12 level.');
  map.name=name;
  map.description=description;
  map.inventory=inventory;
  map.cells=rows.join('').split('').map(mark=>{
   if(checkpoints[mark])return {terrain:'land',component:'checkpoint',props:{element:checkpoints[mark]}};
   if(terrain[mark])return {terrain:terrain[mark]};
   const element=elements[mark.toLowerCase()];
   if(!element)throw Error('Unknown level symbol: '+mark);
   return {terrain:'land',node:{element,role:mark===mark.toUpperCase()?'source':'destination'}};
  });
  map.constraints=constraints;
  if(rows.some(row=>row.includes('*'))){
   for(const element of ['fire','water','electricity','arcane']){
    const rule=constraints[element]??{};
    constraints[element]={...rule,forbidTerrain:[...new Set([...(rule.forbidTerrain??[]),'forest'])]};
   }
  }
  if(construction)map.construction=construction;
  return {id:name.toLowerCase().replaceAll(' ','-'),format:'element-forge-level',schemaVersion:1,rulesVersion:construction?2:1,map};
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
  ],{bridge:2,intersection:1},{budget:2,prices:{bridge:2,intersection:1}}),
  level('Firebreak Fen','Fire cannot enter water, even on a bridge. Route it around the head of the fen.',[
   '############','###....#####','###.##..####','##..#~...###','#F...~..f..#','##..#~.#..##',
   '###..~.#.###','####.~..####','#####~..####','#####~.#####','#####~######','############'
  ],{bridge:1},undefined,{fire:{forbidTerrain:['water']}}),
  level('Reedwater Ford','Nature avoids water. Water can cross it with a bridge. Plan both routes before using the crossing.',[
   '############','####....####','###......###','##....~...##','##N...~..n##','####..~..###',
   '############','###...~..###','##w...~...##','##....~..W##','###...~..###','############'
  ],{bridge:1},undefined,{nature:{forbidTerrain:['water']}}),
  level('Briar Hollow','N is Nature. Nature can route through woods. Fire must stay in the clearing.',[
   '############','##***N***###','#**....****#','#*.F......*#','#*.....f..*#','#***###...*#',
   '#**********#','##*******n*#','##*********#','###******###','############','############'
  ],{},undefined,{fire:{forbidTerrain:['forest']}}),
  level('Granite Gate','Select Tunnel, then choose two open tiles in the same row or column with blocked terrain between them. Either opening works in both directions.',[
   '############','############','###..##...##','##...##...##','##F..##...##','##...##.f.##',
   '###..##...##','############','############','############','############','############'
  ],{tunnel:2}),
  level('Under the Escarpment','One tunnel connects two openings and costs two points. Budget for the whole tunnel before building.',[
   '############','###..#####.#','##...###.f.#','##...###...#','##...###...#','##...###...#',
   '##F..###...#','##...###...#','###..###..##','############','############','############'
  ],{tunnel:2,bridge:1},{budget:2,prices:{tunnel:1,bridge:1}}),
  level('Twin Ravines','One route must cross a brook and another must go under a ridge. Buy enough equipment for both.',[
   '############','##...~...###','##W..~...###','##...~..w###','##...~...###','############',
   '###..###..##','##...###...#','##n..###...#','##...###.N.#','###..###..##','############'
  ],{bridge:2,tunnel:2,intersection:1},{budget:4,prices:{bridge:2,tunnel:1,intersection:1}}),
  level('Lantern Station','Fire must visit the marked checkpoint before reaching its forge. The direct route skips it.',[
   '############','###......###','##.......###','##F....f..##','##..##....##','###..#...###',
   '####..1.####','#####...####','############','############','############','############'
  ]),
  level('Two Waystations','Visit the checkpoint marked for each element. Fire and Water cannot use each other’s station.',[
   '############','###.1....###','##.......###','##F....f..##','###......###','############',
   '###.....2###','##........##','##w.#..W..##','###.......##','####.....###','############'
  ]),
  level('Signal at the Pass','Nature stops at its checkpoint. The two routes must still cross straight at the intersection.',[
   '############','#####N######','#####.######','#####3######','#####.######','#####.######',
   '#F........f#','#####.######','#####.######','#####n######','############','############'
  ],{intersection:1}),
  level('Coldwater Relay','Water must cross the brook and visit its station. Fire must find a dry route to its own station.',[
   '############','##...~...###','##W..~...###','##...~.2w###','###..~..####','############',
   '####....####','###.1....###','##...~.f..##','##F..~....##','###..~...###','#####~######'
  ],{bridge:2,intersection:1},{budget:2,prices:{bridge:2,intersection:1}},{fire:{forbidTerrain:['water']}}),
  level('The Threefold Divide','Plan two intersections, the brook crossing, and Nature’s checkpoint. Give each color room to finish its route.',[
   '############','###.N###w.##','###.3###..##','####.###.###','####.###.###','####.###.###',
   '#F........f#','####.###.###','####n###~###','####.###.###','#######.W.##','############'
  ],{intersection:2,bridge:2,tunnel:2},{budget:4,prices:{intersection:1,bridge:2,tunnel:1}},
  {fire:{forbidTerrain:['water']}})

 ];

 const api={catalog};
 root.EFLevels=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
