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
 const previousChapter=[
  {...spark,hint:'Tap the previous tile to backtrack. Start again at the spring whenever you want to revise.',lesson:null},
  stage(twinCrossings,'twin-crossings','Look for the junction where both lines can continue straight.'),
  stage(boards.cinder,'cinder-ford','Follow the river before committing Fire to a crossing.'),
  ...boards.maps.map((entry,index)=>stage(entry,ids[index],entry.hint,lessons[index],2))
 ];
 const chapterTwo=typeof module==='undefined'?root.EFGatekeepers:require('./gatekeepers');
 const chapter=typeof module==='undefined'?root.EFSleepingValley:require('./sleeping-valley');
 const archivedTutorials=previousChapter.slice(1).map(level=>({...level,lesson:null}));
 const chapterThree=typeof module==='undefined'?root.EFPrimevalCrucible:require('./primeval-crucible');
 const chapterFour=typeof module==='undefined'?root.EFAstralLoom:require('./astral-loom');
 const chapterFive=typeof module==='undefined'?root.EFCelestialConfluence:require('./celestial-confluence');
 const chapterSix=typeof module==='undefined'?root.EFWeaversPlayground:require('./weavers-playground');
 const chapterSeven=typeof module==='undefined'?root.EFShatteredAbyss:require('./shattered-abyss');
 const chapterEight=typeof module==='undefined'?root.EFWorldHeartSanctuary:require('./world-heart-sanctuary');
 const chapterNine=typeof module==='undefined'?root.EFConfluenceForges:require('./confluence-forges');
 const chapterTen=typeof module==='undefined'?root.EFTwilightPendulum:require('./twilight-pendulum');
 const api={chapter,chapterTwo,chapterThree,chapterFour,chapterFive,chapterSix,chapterSeven,chapterEight,chapterNine,chapterTen,archivedTutorials,previousChapter};
 root.EFChapter=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
