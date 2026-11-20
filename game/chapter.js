'use strict';
(function(root){
 const L=typeof module==='undefined'?root.EFLevels:require('./levels');
 const curated=typeof module==='undefined'?root.EFCurated:require('./challenge-release').release().pack;
 const [spark,river,,forest]=L.catalog;
 const [,tunnel,portal]=L.catalog.slice(12,15);
 const [ford,junction,,,scarce,timber,kiln,grove]=curated.stages;
 function stage(entry,id,hint,lesson=null){
  return {...entry,id:'chapter-one-'+id,hint,lesson};
 }
 const twinCrossings=L.lesson('Twin Crossings','Give Fire and Electricity room to cross. Build one intersection where both can go straight.',[
  '###E###','##...##','F.....f','##...##','###e###'
 ],{tools:{intersection:1}});
 const spillway=L.lesson('Spillway Watch','Guide both currents across the spillway. Budget for a bridge and keep the dry approaches open.',[
  '######E##','######.##','N..~....n','...~##.##','...~##e##'
 ],{tools:{bridge:1,intersection:1},budget:2,prices:{bridge:1,intersection:1}});
 const wind=L.lesson('Riftwater','Wind can jump a single hole. Water can follow the river. Find a landing that keeps both currents moving.',[
  '##W#######','##=.#.####','V...o....v','##=#.#####','##======w#'
 ],{tools:{intersection:1}});
 const tunnels=L.lesson('Engine Underpass','Find a tunnel alignment that keeps the valley approach open.',[
  '###W#####','###=#####','F...#...f','....#....','...=#####','###w#####'
 ],{tools:{tunnel:2,intersection:1},budget:3,prices:{tunnel:1,intersection:1}});
 const relay=L.lesson('The Last Relay','Send Fire through the relay and its checkpoint while Water reaches the lower intake.',[
  '#######W##','#######=##','F...#....f','#######.1.','#######=##','#######w##'
 ],{tools:{intersection:1},components:[[3,2,'portal',{pairId:'A'}],[5,2,'portal',{pairId:'A'}]]});
 const chapter=[
  {...spark,hint:'Tap the previous tile to backtrack. Start again at the spring whenever you want to revise.',lesson:null},
  stage(twinCrossings,'twin-crossings','Look for the junction where both lines can continue straight.'),
  stage(ford,'cinder-ford','Follow the river before committing Fire to a crossing.'),
  stage(junction,'dry-junction','Look at which current can take the wooded approach.',forest.id),
  stage(scarce,'scarce-crossing','Trace the dry circuit before choosing where Water leaves the river.',river.id),
  stage(spillway,'spillway','Check which shore tiles leave room for a straight crossing.','rules4-build-a-bridge'),
  stage(timber,'scree-and-timber','Try the scree approach before spending your bridge.','rules4-scree-shelf'),
  stage(tunnels,'engine-underpass','Compare two alignments before placing a tunnel.',tunnel.id),
  stage(wind,'riftwater','Pick a landing across exactly one hole.','rules4-one-clear-jump'),
  stage(relay,'last-relay','Plan the route through the checkpoint after leaving the relay.',portal.id),
  stage(kiln,'kiln-junction','Compare the heated route with the lava approach.','rules4-foundry-floor'),
  stage(grove,'grove-overlook','Find both crossings before using an intersection.')
 ];
 const api={chapter};
 root.EFChapter=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
