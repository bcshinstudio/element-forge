'use strict';
const {mkdirSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const G=require('./challenges');

const options={seed:'river-valley-26',count:8,includeReferences:true};
function release(){
 const batch=G.generate(options);
 if(batch.report.shortfall||!G.difficulties.every(tier=>batch.pack.stages.some(stage=>stage.difficulty===tier))){
  throw Error('The curated seed no longer produces a full progression.');
 }
 return batch;
}
if(require.main===module){
 const destination=process.argv[2]||'.';
 const {pack,report}=release();
 mkdirSync(destination,{recursive:true});
 writeFileSync(join(destination,'curated.js'),"'use strict';\nwindow.EFCurated="+JSON.stringify(pack)+';\n');
 writeFileSync(join(destination,'Element_Forge_Routing_Pack.json'),JSON.stringify(pack,null,2)+'\n');
 writeFileSync(join(destination,'curated-evidence.json'),JSON.stringify({options,...report},null,2)+'\n');
}
module.exports={release};
