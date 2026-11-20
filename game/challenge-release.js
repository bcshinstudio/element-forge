'use strict';
const {mkdirSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const G=require('./challenges');

const options={seed:'river-valley-26',count:6,includeReferences:true};
function release(){
 const {pack,report}=G.generate(options);
 if(report.shortfall)throw Error('The curated seed no longer produces enough verified stages.');
 const {level,solution,alternatives}=G.verifyScarce();
 level.difficulty='Medium';
 pack.stages.splice(2,0,level);
 report.evidence.splice(2,0,{origin:'authored',solution,alternatives,difficulty:'Medium'});
 const expert=G.generate({seed:'expert-0',count:1,attempts:72,difficulty:'Expert'});
 if(expert.report.shortfall)throw Error('The Expert reference seed no longer verifies.');
 pack.stages.push(expert.pack.stages[0]);
 report.evidence.push({...expert.report.evidence[0],seed:'expert-0'});
 report.requested+=2;
 report.accepted+=2;
 return {pack,report};
}
if(require.main===module){
 const destination=process.argv[2]||'.';
 const {pack,report}=release();
 mkdirSync(destination,{recursive:true});
 writeFileSync(join(destination,'curated.js'),"'use strict';\nwindow.EFCurated="+JSON.stringify(pack)+';\n');
 writeFileSync(join(destination,'Element_Forge_Harmony_Pack.json'),JSON.stringify(pack,null,2)+'\n');
 writeFileSync(join(destination,'curated-evidence.json'),JSON.stringify({options,...report},null,2)+'\n');
}
module.exports={release};
