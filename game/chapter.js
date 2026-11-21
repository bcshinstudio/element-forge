'use strict';
(function(root){
 const L=typeof module==='undefined'?root.EFLevels:require('./levels');
 const boards=typeof module==='undefined'?root.EFRevisedBoards:require('./revised-boards');
 const [spark]=L.catalog;
 const ids=['dry-junction','scarce-crossing','spillway','scree-and-timber','engine-underpass','riftwater','last-relay','kiln-junction','grove-overlook'];
 const lessons=['rules4-forest-shortcut',null,'rules4-build-a-bridge','rules4-scree-shelf','rules4-cross-at-right-angles'];
 function stage(entry,id,hint,lesson=null,layout=1){
  return {...entry,id:'chapter-one-'+id,hint,lesson,layout};
 }
 const twinCrossings=L.lesson('Twin Crossings','Give Fire and Electricity room to cross. Build one intersection where both can go straight.',[
  '###E###','##...##','F.....f','##...##','###e###'
 ],{tools:{intersection:1}});
 const chapter=[
  {...spark,hint:'Tap the previous tile to backtrack. Start again at the spring whenever you want to revise.',lesson:null},
  stage(twinCrossings,'twin-crossings','Look for the junction where both lines can continue straight.'),
  stage(boards.cinder,'cinder-ford','Follow the river before committing Fire to a crossing.'),
  ...boards.maps.map((entry,index)=>stage(entry,ids[index],entry.hint,lessons[index],2))
 ];
 const chapterTwo=[
  L.lesson('East Gate','Enter and leave a gate in its marked direction. Find the approach to the eastbound gate.',[
   'F..#..f','...#...','.......','...#...'
  ],{components:[[3,2,'gate',{direction:'E'}]]}),
  L.lesson('Two Watchposts','Fire must pass both watchposts before reaching its inlet.',[
   'F.......f','##.#.#.##','##1...1##'
  ]),
  L.lesson('Gatehouse Crossing','Follow the gate arrows and leave room for the other route at the shared crossing.',[
   '####E####','####.####','###...###','F.......f','###...###','####.####','####e####'
  ],{tools:{intersection:1},components:[[2,3,'gate',{direction:'E'}],[4,1,'gate',{direction:'S'}]]}),
  L.lesson('Ridge Watch','Deliver Fire through the eastbound gate and its watchpost. Use the tunnel to cross the ridge.',[
   '....#....','F...#...f','....#.1..','....#....'
  ],{tools:{tunnel:2},components:[[2,1,'gate',{direction:'E'}]]}),
  L.lesson('The Two Inlets','Choose the approaches to both watchposts. Budget for a crossing, and keep Electricity on dry ground.',[
   '####E####','###...###','###._.###','F..1....f','###...###','###.1.###','###...###','####e####'
  ],{tools:{intersection:1},budget:1,prices:{intersection:1},components:[[2,3,'gate',{direction:'E'}]]})
 ].map(level=>({...level,id:'chapter-two-'+level.id}));
 const api={chapter,chapterTwo};
 root.EFChapter=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
