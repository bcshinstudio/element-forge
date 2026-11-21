'use strict';
const {mkdirSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const G=require('./challenges');

const E=require('../map-editor/engine');
const F=require('../map-editor/map-format');
const {pack}=require('./revised-boards');

function release(){
 const evidence=pack.stages.map(stage=>{
  const solution=E.solveConstruction(F.readLevel(stage));
  if(solution.status!=='solved'||!G.replay(stage,solution))throw Error('Cannot replay '+stage.map.name);
  return {origin:'curated',solution,difficulty:stage.difficulty};
 });
 return {pack,report:{requested:pack.stages.length,accepted:pack.stages.length,shortfall:0,evidence}};
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
