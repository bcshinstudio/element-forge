'use strict';
(function(root){
 const F=typeof module==='undefined'?root.EFMap:require('../map-editor/map-format.js');

 // Scenic sketches are row-major. Uppercase endpoints are sources.
 function level(name,description,rows,inventory={},construction,constraints={}){
  const map=F.fresh();
  const terrain={'.':'land','#':'mountain','~':'water','*':'forest','o':'void','=':'river',':':'bank','!':'lava','_':'shallow','%':'scree','^':'heated','&':'abrasive','+':'exposed','-':'covered'};
  const elements={f:'fire',w:'water',n:'nature',e:'electricity',v:'wind',r:'earth',i:'ice',m:'metal',l:'light',h:'shadow'};
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
   for(const element of ['fire','water','electricity','arcane','wind']){
    const rule=constraints[element]??{};
    constraints[element]={...rule,forbidTerrain:[...new Set([...(rule.forbidTerrain??[]),'forest'])]};
   }
  }
  if(construction)map.construction=construction;
  return {id:name.toLowerCase().replaceAll(' ','-'),format:'element-forge-level',schemaVersion:1,rulesVersion:construction?2:1,map};
 }

 const catalog=[
  level('Ember Meadow','Draw a route from the Fire spring to its matching forge. Tap the source (S), then tap adjacent tiles or drag toward its destination (D). Trees block Fire.',[
   '************','***......***','**........**','*...F.#....*','*.....##...*','*.....##...*',
   '*.....##...*','*......#f..*','**........**','***......***','************','************'
  ]),
  level('Brook Bridge','Tap an empty water tile to build a bridge to carry Water across the brook.',[
   '#####~######','##...~...###','#....~....##','#....~.w..##','#..W.~....##','#....~....##',
   '##...~...###','###..~..####','####.~.#####','#####~######','#####~######','#####~######'
  ],{bridge:1}),
  level('Stone Pass','Fire and Plant meet in a narrow pass. Place an intersection where the two routes cross, then pass straight through it.',[
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
  level('Reedwater Ford','Plant avoids water. Water can cross with a bridge. Leave room for both routes on the east bank.',[
   '############','####....####','###......###','##....~...##','##N...~..n##','####..~..###',
   '#######..###','###...~..###','##w...~...##','##....~..W##','###...~..###','############'
  ],{bridge:1},undefined,{nature:{forbidTerrain:['water']}}),
  level('Briar Hollow','P is Plant. Plant can route through woods. Fire must stay in the clearing.',[
   '############','##***N***###','#**....****#','#*.F......*#','#*.....f..*#','#***###...*#',
   '#**********#','##*******n*#','##*********#','###******###','############','############'
  ],{},undefined,{fire:{forbidTerrain:['forest']}}),
  level('Granite Gate','Tap Tunnel, then tap two open tiles in the same row or column with blocked terrain between them. Either opening works in both directions.',[
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
  level('Signal at the Pass','Plant stops at its checkpoint. The two routes must still cross straight at the intersection.',[
   '############','#####N######','#####.######','#####3######','#####.######','#####.######',
   '#F........f#','#####.######','#####.######','#####n######','############','############'
  ],{intersection:1}),
  level('Coldwater Relay','Water must cross the brook and visit its station. Fire must find a dry route to its own station.',[
   '############','##...~...###','##W..~...###','##...~.2w###','###..~..####','############',
   '####....####','###.1....###','##...~.f..##','##F..~....##','###..~...###','#####~######'
  ],{bridge:2,intersection:1},{budget:2,prices:{bridge:2,intersection:1}},{fire:{forbidTerrain:['water']}}),
  level('The Threefold Divide','Plan two intersections, a bridge, and Plant’s checkpoint. Tap a different source to switch routes. You can build with routes unfinished.',[
   '############','###.N###w.##','###.3###..##','####.###.###','####.###.###','####.###.###',
   '#F........f#','####.###.###','####n###~###','####.###.###','#######.W.##','############'
  ],{intersection:2,bridge:2,tunnel:2},{budget:4,prices:{intersection:1,bridge:2,tunnel:1}},
  {fire:{forbidTerrain:['water']}})

 ];

 const hints=[
  'Look for open ground around a ridge tip. Fire stays out of the woods.',
  'A bridge makes one water tile usable. Check that both banks have reachable land.',
  'An intersection lets two routes cross at right angles. Both must go straight through.',
  'Check whether either element can go around the water before spending the only bridge.',
  'Fire cannot enter a water tile, even with a bridge. Trace the edge of the fen.',
  'Plant needs dry land. Leave some space between the bridge and each destination.',
  'P stands for Plant. Only Plant can cross the trees in this campaign.',
  'Both tunnel openings go on open tiles across a barrier. Either opening can be entered first.',
  'The tunnel price shown buys both openings. Compare the tool costs with the available budget.',
  'A bridge spans water and a tunnel connects open tiles across a barrier. Account for both jobs.',
  'A connected route still has to visit its matching checkpoint before delivery.',
  'Check the letter on each station to see which element must visit it.',
  'Plan the checkpoint visit and approach each intersection in a straight line.',
  'Check each element’s terrain rule and station before using the bridge budget.',
  'Tap another source to start its route. Tap an unfinished tip to return to it, and place tools whenever needed.'
 ];
 for(const [index,entry] of catalog.entries())entry.hint=hints[index];

 const prototype=level('Wind over the Rift','Tap a highlighted landing tile to carry Wind straight over one hole. Wind cannot use tunnels.',[
  '############','############','#####..#####','####..######','####...##..#','##V..o...v.#',
  '####.oo##..#','####...#####','############','############','############','############'
 ]);
 prototype.hint='Land directly across one hole. Two holes in a row and diagonal jumps cannot be crossed.';
 // Preserve IDs and the original layouts for regression and legacy imports.
 const legacyCatalog=catalog.map(entry=>JSON.parse(JSON.stringify(entry)));
 function modern(entry){
  entry.rulesVersion=3;
  entry.map.rulesVersion=3;
  return entry;
 }
 function replace(index,description,rows,inventory={},construction){
  const old=catalog[index];
  catalog[index]=level(old.map.name,description,rows,inventory,construction);
 }
 replace(1,'Water can travel in the river. Follow the bank markers to enter and leave.',[
  '############','############','##...=...###','##...=.w.###','##W..=...###','##..:=...###',
  '##...=:..###','##...=...###','############','############','############','############'
 ]);
 catalog[1].hint='A marked bank touches the river on each shore.';
 replace(3,'Water uses marked banks. Electricity needs one metal span across open water.',[
  '############','##...~...###','##E..~.e.###','##...~...###','############','##...=...###',
  '##W.:=...###','##...=:w.###','##...=...###','############','############','############'
 ],{metalSpan:2},{budget:2,prices:{metalSpan:2}});
 catalog[3].hint='Water follows the river unaided. Put the metal span where Electricity can reach both shores.';
 replace(4,'Fire can cross lava unaided. Deep water blocks even bridged Fire.',[
  '############','############','##..~....###','##F.~..f.###','##..~....###','##..!....###',
  '##..!....###','############','############','############','############','############'
 ],{bridge:1});
 const briar=catalog[6];
 briar.map.description+=' Plant cannot take the portal shortcut.';
 for(const i of [2*12+5,5*12+9])briar.map.cells[i]={terrain:'land',component:'portal',props:{pairId:'A'}};
 catalog[4].hint='Try crossing the lava at the bottom of the inlet.';
 const lessons=[
  level('Wind over the Rift','Jump one hole in a straight line. Wind cannot use tunnels.',[
   '############','############','####...#####','####...#####','####...#####','##V..o...v##',
   '####.oo#####','############','############','############','############','############'
  ],{tunnel:2}),
  level('Shifting Ridge','Earth crosses scree. Lightweight bridges cannot carry it.',[
   '############','############','##...~...###','##R..~..r###','##...~...###','##...%...###',
   '##...%...###','############','############','############','############','############'
  ],{bridge:1}),
  level('The Winter Ford','Ice freezes shallow water as it travels. Heated ground blocks it.',[
   '############','############','##...^...###','##I..^..i###','##..._...###','##..._...###',
   '############','############','############','############','############','############'
  ]),
  level('Foundry Run','Metal crosses heated and abrasive ground. It cannot use lightweight bridges.',[
   '############','############','##..^.&..###','##M.^.&.m###','##..^.&..###','##..~.&..###',
   '############','############','############','############','############','############'
  ],{bridge:1}),
  level('Sun and Shade','Light uses exposed channels. Shadow uses covered channels.',[
   '############','############','##...+...###','##L..+..l###','##...+...###','##...#...###',
   '##...-...###','##h..-..H###','##...-...###','############','############','############'
  ]),
  level('The Living Basin','Route Earth through scree and Metal through the heated channel. Ice needs the shallow ford.',[
   '############','##..%....###','##R.%..r.###','##..%....###','############','##..^....###',
   '##M.^..m.###','##..^....###','############','##.._....###','##I._..i.###','############'
  ])
 ];
 lessons[0].id='wind-campaign-lesson';
 catalog.push(...lessons);
 catalog.forEach(modern);
 modern(prototype);
 const api={catalog,prototype,legacyCatalog,level,modern};
 root.EFLevels=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
