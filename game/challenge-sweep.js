'use strict';
const {performance}=require('node:perf_hooks');
const G=require('./challenges');
const samples=Number(process.argv[2]??30);
if(!Number.isInteger(samples)||samples<1||samples>1000)throw Error('Use 1–1000 seeds per family and difficulty.');
const categories=[];
for(const family of G.families)for(const difficulty of G.difficulties){
 const category={family,difficulty,samples,requested:samples*6,accepted:0,fullPacks:0,fallback:0,repeated:0,rejected:0};
 const uniqueDecisions=new Set();
 const durations=[];
 for(let i=0;i<samples;i++){
  const start=performance.now();
  const {report}=G.generate({family,difficulty,seed:'sweep-'+i,count:6});
  durations.push(performance.now()-start);
  category.accepted+=report.accepted;
  category.fullPacks+=Number(report.accepted===6);
  category.fallback+=report.fallback;
  category.repeated+=report.rejections.filter(r=>r.reason==='Repeated layout or decision').length;
  category.rejected+=report.rejections.length;
  for(const stage of report.evidence)uniqueDecisions.add(stage.decision);
 }
 durations.sort((a,b)=>a-b);
 category.p95Ms=Math.round(durations[Math.ceil(samples*.95)-1]);
 category.uniqueDecisions=uniqueDecisions.size;
 categories.push(category);
}
console.log(JSON.stringify({revision:G.revision,categories},null,2));
