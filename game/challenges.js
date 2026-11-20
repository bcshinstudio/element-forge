'use strict';
(function(root){
 const E=typeof module==='undefined'?root.EFEngine:require('../map-editor/engine.js');
 const F=typeof module==='undefined'?root.EFMap:require('../map-editor/map-format.js');
 const S=typeof module==='undefined'?root.EFSession:require('./session.js');
 const revision='challenge-v1';
 const families=['budget','passage','checkpoint','combined'];
 const difficulties=['Easy','Medium','Hard','Expert'];
 const hints={
  budget:'Before spending the bridge, check whether either current can get around the water.',
  passage:'Trace both currents through the disputed passage. An intersection only works when both pass straight through.',
  checkpoint:'Trace the checkpoint route first. Compare what each current can reach without the bridge.',
  combined:'Plan the checkpoint and the crossing together. Check which current has no dry route.'
 };

 function random(seed){
  let state=2166136261;
  for(const letter of String(seed))state=Math.imul(state^letter.charCodeAt(0),16777619);
  return n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return Math.floor(state/4294967296*n);};
 }

 function sketch(width,height){
  const map=F.fresh(width,height);
  map.cells=map.cells.map(()=>({terrain:'mountain'}));
  const at=(x,y)=>y*width+x;
  const write=(x,y,value)=>{map.cells[at(x,y)]=value;};
  const line=(x,y,a,b)=>{
   const dx=Math.sign(a-x),dy=Math.sign(b-y);
   while(x!==a||y!==b){write(x,y,{terrain:'land'});x+=dx;y+=dy;}
   write(a,b,{terrain:'land'});
  };
  const node=(x,y,element,role)=>write(x,y,{terrain:'land',node:{element,role}});
  return {map,at,write,line,node};
 }

 function recipe(family,tier,pick){
  const width=9+pick(3),height=12;
  const {map,at,write,line,node}=sketch(width,height);
  const west=1,east=width-2,mid=3+pick(width-6);
  const swap=pick(2)===1,reverse=pick(2)===1;
  const A=family==='checkpoint'||family==='combined'?'nature':swap?'water':'fire';
  const B=A==='water'||(A==='nature'&&swap)?'fire':'water';
  const nodes=(x,y,a,b,element)=>{
   node(x,y,element,reverse?'destination':'source');
   node(a,b,element,reverse?'source':'destination');
  };
  let tool,probes,profile;
  if(family==='passage'){
   tool='intersection';
   const cross=2+pick(2),turn=5+pick(2),bottom=height-2;
   const westTip=mid-1,eastTip=mid+1;
   line(mid,0,mid,bottom);
   line(west,cross,east,cross);
   line(west,turn,mid,turn);
   line(west,cross,west,turn);
   line(east,cross,east,turn+1);
   line(mid,turn+1,east,turn+1);
   if(tier>0){line(westTip,cross-1,westTip,cross);line(eastTip,cross+1,eastTip,cross);}
   if(tier>1){line(west,turn+1,west,turn+2);line(west,turn+2,westTip,turn+2);}
   if(tier>2){line(east,turn+1,east,turn+3);line(eastTip,turn+3,east,turn+3);}
   nodes(west,cross,east,turn+1,A);
   nodes(mid,0,mid,bottom,B);
   probes=[at(mid,cross),at(mid,turn),at(mid,turn+1)];
   profile=[family,tier,A,cross,turn,mid-west,east-mid];
  }else{
   tool='bridge';
   const upper=3,lower=8,dry=1;
   const optional=swap?lower:upper,required=swap?upper:lower;
   const endWest=west+pick(2),endEast=east-pick(2);
   for(const row of [upper,lower]){
    line(west,row,east,row);
    write(mid,row,{terrain:'water'});
   }
   const bypass=optional===upper?dry:10;
   line(west,optional,west,bypass);line(east,optional,east,bypass);
   line(west,bypass,east,bypass);
   nodes(endWest,optional,endEast,optional,A);
   // Connect the detour to the usable side of each endpoint without passing through it.
   if(endWest!==west){line(endWest,optional,endWest,bypass);node(endWest,optional,A,reverse?'destination':'source');}
   if(endEast!==east){line(endEast,optional,endEast,bypass);node(endEast,optional,A,reverse?'source':'destination');}
   nodes(west,required,east,required,B);
   probes=[at(mid,optional),at(mid,required)];
   for(let offset=1;offset<=tier;offset++){
    const row=lower+offset<=10&&required===upper?upper+offset:lower-offset;
    if(Math.abs(row-required)>3||row===optional||row===bypass)continue;
    // Higher tiers may open a second viable crossing farther from the endpoints.
    line(mid-1,required,mid-1,row);
    if(offset===tier&&tier>1&&family!=='combined')line(mid+1,required,mid+1,row);
    write(mid,row,{terrain:'water'});
    probes.push(at(mid,row));
   }
   if(family==='checkpoint'||family==='combined'){
    const station=mid+(pick(2)?1:-1);
    write(station,bypass,{terrain:'forest',component:'checkpoint',props:{element:A}});
    map.constraints[B]={forbidTerrain:['forest']};
   }
   if(family==='combined'){
    // A fixed crossing couples a third current to the required bridge route.
    const col=mid+1;
    line(col,required-1,col,required+1);
    write(col,required,{terrain:'land',component:'intersection'});
    nodes(col,required-1,col,required+1,'electricity');
   }
   profile=[family,tier,A,B,optional===upper,probes.length,mid-endWest,endEast-mid];
  }
  map.inventory={[tool]:1};
  map.construction={budget:1,prices:{[tool]:1}};
  const level={format:'element-forge-level',schemaVersion:1,rulesVersion:2,map,hint:hints[family]};
  return {level,tool,probes:[...new Set(probes)],profile};
 }

 function layoutKey(map){
  const base=map.cells.map(cell=>[cell.terrain,cell.node?.element,cell.node?.role,cell.component,cell.props?.element].join(':'));
  const forms=[];
  for(const swap of [false,true])for(const rx of [false,true])for(const ry of [false,true]){
   const w=swap?map.height:map.width,h=swap?map.width:map.height;
   const cells=Array.from({length:w*h},(_,i)=>{
    let x=i%w,y=Math.floor(i/w);
    if(rx)x=w-1-x;
    if(ry)y=h-1-y;
    return base[(swap?x:y)*map.width+(swap?y:x)];
   });
   forms.push(w+'x'+h+':'+cells.join('|'));
  }
  return forms.sort()[0]+JSON.stringify(map.inventory)+JSON.stringify(map.construction)+JSON.stringify(map.constraints);
 }

 function replay(level,result){
  const session=S.createSession(level);
  const counts=E.placementCounts(result.placements);
  if(!session.start(counts).ok)return false;
  for(const [index,value] of Object.entries(result.placements)){
   if(!session.place(Number(index),E.placementKind(value),value.pairId).ok)return false;
  }
  for(const route of result.routes)for(const index of route.path){
   if(!session.route(index).ok)return false;
  }
  return session.verify().ok;
 }

 function verify(candidate,{limit=100000}={}){
  const {level,tool,probes}=candidate,map=F.readLevel(level);
  const solve=placements=>E.solve(map,{limit,allowPlacement:false,initialPlacements:placements});
  const clean=E.solveConstruction(map,{limit});
  const empty=solve({});
  const alternatives=probes.map(index=>{
   const result=solve({[index]:tool});
   return {index,status:result.status==='solved'&&!replay(level,result)?'replay-failed':result.status,nodes:result.nodes,track:result.score?.track};
  });
  const summary={clean:clean.status,empty:empty.status,alternatives};
  if(clean.status!=='solved')return {...summary,accepted:false,reason:'Clean-board solve: '+clean.status};
  if(!replay(level,clean))return {...summary,accepted:false,reason:'Game replay failed'};
  if(empty.status!=='unsolved')return {...summary,accepted:false,reason:empty.status==='solved'?'Tool-free bypass':'Tool necessity inconclusive'};
  if(alternatives.some(a=>!['solved','unsolved'].includes(a.status)))return {...summary,accepted:false,reason:'Alternative search inconclusive'};
  const winning=alternatives.filter(a=>a.status==='solved');
  const distinctLengths=new Set(winning.map(a=>a.track));
  if(!winning.length||(!alternatives.some(a=>a.status==='unsolved')&&distinctLengths.size<2)){
   return {...summary,accepted:false,reason:'No verified placement consequence'};
  }
  if(!winning.some(a=>Object.hasOwn(clean.placements,a.index)))return {...summary,accepted:false,reason:'Unmodeled winning placement'};
  const metrics={placementChoices:alternatives.length,winningPlacements:winning.length,
   failedPlacements:alternatives.length-winning.length,budgetSlack:map.construction.budget-E.constructionCost(map,E.placementCounts(clean.placements)),
   activeCurrents:clean.routes.length,requiredCheckpoints:map.cells.filter(cell=>cell.component==='checkpoint').length};
  return {...summary,metrics,accepted:true,reason:'Verified tool necessity and placement consequence',solution:clean};
 }

 const referenceSeeds={budget:'river-reference',passage:'pass-reference',checkpoint:'grove-reference',combined:'relay-reference'};
 function reference(family,difficulty){
  return recipe(family,difficulties.indexOf(difficulty),random(referenceSeeds[family]+difficulty));
 }
 function generate({seed='forge',family='mixed',difficulty='mixed',count=6,attempts=count*8}={}){
  if(!Number.isInteger(count)||count<1||count>20||!Number.isInteger(attempts)||attempts<0||attempts>400||
     !['mixed',...families].includes(family)||!['mixed',...difficulties].includes(difficulty))throw Error('Invalid generator options.');
  const pick=random(revision+':'+seed);
  const stages=[],evidence=[],rejections=[],layouts=new Set(),decisions=new Set();
  let fallback=0;
  function add(candidate,f,t,origin){
   const key=layoutKey(candidate.level.map),decision=candidate.profile.join(':');
   if(layouts.has(key)||decisions.has(decision)){rejections.push({family:f,difficulty:difficulties[t],reason:'Repeated layout or decision'});return;}
   const check=verify(candidate);
   if(!check.accepted){rejections.push({family:f,difficulty:difficulties[t],reason:check.reason});return;}
   layouts.add(key);decisions.add(decision);
   const special=f==='combined';
   candidate.level.map.name=difficulties[t]+' · '+({budget:'Scarce Crossing',passage:'Contested Pass',checkpoint:'Grove Crossing',combined:'Crossing Relay'})[f]+' '+(stages.length+1);
   candidate.level.map.description=hints[f];
   Object.assign(candidate.level,{family:f,difficulty:difficulties[t],special});
   stages.push(candidate.level);
   evidence.push({origin,decision,...check});
   if(origin==='fallback')fallback++;
  }
  const requested=index=>({f:family==='mixed'?families[index%families.length]:family,
   t:difficulty==='mixed'?Math.min(3,Math.floor(index*4/count)):difficulties.indexOf(difficulty)});
  for(let i=0;i<attempts&&stages.length<count;i++){
   const {f,t}=requested(stages.length);
   add(recipe(f,t,pick),f,t,'generated');
  }
  // Reproducible reference-derived fallback pool, with the same checks and filters.
  for(let i=0;i<count*24&&stages.length<count;i++){
   const {f,t}=requested(stages.length);
   const candidate=i%24===0?reference(f,difficulties[t]):recipe(f,t,random('fallback:'+f+':'+t+':'+(i%24)));
   add(candidate,f,t,'fallback');
  }
  return {pack:{format:'element-forge-challenges',version:1,revision,seed:String(seed),stages},
   report:{revision,seed:String(seed),requested:count,accepted:stages.length,fallback,rejections,evidence}};
 }
 function readPack(value){
  if(value?.format!=='element-forge-challenges'||value.version!==1||!Array.isArray(value.stages)||
     value.stages.length<1||value.stages.length>20)throw Error('Invalid challenge pack.');
  return value.stages.map(stage=>{
   const map=F.readLevel(stage);
   return {format:stage.format,schemaVersion:stage.schemaVersion,rulesVersion:stage.rulesVersion,map,
    hint:typeof stage.hint==='string'?stage.hint.slice(0,200):''};
  });
 }
 const api={families,difficulties,revision,reference,verify,replay,generate,readPack,layoutKey};
 root.EFChallenges=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
