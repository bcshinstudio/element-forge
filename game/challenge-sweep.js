'use strict';
const {performance}=require('node:perf_hooks');
const G=require('./challenges');
const samples=Number(process.argv[2]??30);
if(!Number.isInteger(samples)||samples<1||samples>1000)throw Error('Use 1–1000 seeds per family and difficulty.');
const categories=[];
const baseSeed='sweep-';
for(const family of G.families)for(const difficulty of G.difficulties){
 const category={family,difficulty,samples,requested:samples*6,accepted:0,fullPacks:0,fallback:0,repeated:0,rejected:0,inconclusive:0};
 const uniqueDecisions=new Set();
 const durations=[];
 for(let i=0;i<samples;i++){
  const start=performance.now();
  const {report}=G.generate({family,difficulty,seed:baseSeed+i,count:6});
  durations.push(performance.now()-start);
  category.accepted+=report.accepted;
  category.fullPacks+=Number(report.accepted===6);
  category.fallback+=report.fallback;
  category.repeated+=report.rejections.filter(r=>r.reason==='Repeated layout or decision').length;
  category.rejected+=report.rejections.length;
  category.inconclusive+=report.rejections.filter(r=>r.reason.includes('inconclusive')).length;
  for(const stage of report.evidence)uniqueDecisions.add(stage.decision);
 }
 durations.sort((a,b)=>a-b);
 category.p95Ms=Math.round(durations[Math.ceil(samples*.95)-1]);
 category.uniqueDecisions=uniqueDecisions.size;
 category.decisionReusesAcrossPacks=category.accepted-uniqueDecisions.size;
 categories.push(category);
}
console.log(JSON.stringify({revision:G.revision,seedPrefix:baseSeed,stagesPerBatch:6,categories},null,2));
