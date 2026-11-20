'use strict';
const {mkdirSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const G=require('./challenges');

const E=require('../map-editor/engine');
const F=require('../map-editor/map-format');
const {stages}=require('./challenge-boards');

function verifyAuthored(stage){
 const map=F.readLevel(stage);
 const solution=E.solveConstruction(map);
 if(solution.status!=='solved'||!G.replay(stage,solution))throw Error('Cannot replay '+map.name);
 const checks=stage.requires.map(feature=>{
  const trial=structuredClone(map);
  if(trial.inventory[feature])trial.inventory[feature]=0;
  else for(const cell of trial.cells)if(cell.terrain===feature)cell.terrain='wall';
  const status=E.solveConstruction(trial).status;
  if(status!=='unsolved')throw Error(map.name+' requirement '+feature+' is '+status+' when removed');
  return {feature,status};
 });
 return {origin:'authored',solution,checks,difficulty:stage.difficulty};
}

function release(){
 const boards=stages();
 const evidence=boards.map(verifyAuthored);
 const {level,solution,alternatives}=G.verifyScarce();
 level.difficulty='Medium';
 boards.splice(4,0,level);
 evidence.splice(4,0,{origin:'authored',solution,alternatives,difficulty:'Medium'});
 const stagesForPlay=boards.map(({requires,...stage})=>stage);
 return {
  pack:{format:'element-forge-challenges',version:1,revision:'authored-playtest-v1',stages:stagesForPlay},
  report:{requested:boards.length,accepted:boards.length,shortfall:0,evidence}
 };
}
if(require.main===module){
 const destination=process.argv[2]||'.';
 const {pack,report}=release();
 mkdirSync(destination,{recursive:true});
 writeFileSync(join(destination,'curated.js'),"'use strict';\nwindow.EFCurated="+JSON.stringify(pack)+';\n');
 writeFileSync(join(destination,'Element_Forge_Challenge_Playtest.json'),JSON.stringify(pack,null,2)+'\n');
 writeFileSync(join(destination,'curated-evidence.json'),JSON.stringify(report,null,2)+'\n');
}
module.exports={release};
