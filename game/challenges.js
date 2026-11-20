'use strict';
(function(root){
 const E=typeof module==='undefined'?root.EFEngine:require('../map-editor/engine.js');
 const F=typeof module==='undefined'?root.EFMap:require('../map-editor/map-format.js');
 const R=typeof module==='undefined'?root.EFRoutingSearch:require('./routing-search');
 const S=typeof module==='undefined'?root.EFSession:require('./session.js');
 function random(seed){
  let state=2166136261;
  for(const letter of String(seed))state=Math.imul(state^letter.charCodeAt(0),16777619);
  return n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return Math.floor(state/4294967296*n);};
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

 function readPack(value){
  if(value?.format!=='element-forge-challenges'||value.version!==1||!Array.isArray(value.stages)||
     value.stages.length<1||value.stages.length>20)throw Error('Invalid challenge pack.');
  return value.stages.map(stage=>{
   const map=F.readLevel(stage);
   return {format:stage.format,schemaVersion:stage.schemaVersion,rulesVersion:stage.rulesVersion,map,
    hint:typeof stage.hint==='string'?stage.hint.slice(0,200):''};
  });
 }
 const revision='harmony-v3';
 const families=['budget','passage','checkpoint','combined'];
 const difficulties=['Easy','Medium','Hard','Expert'];
 const names={budget:'Scarce Crossing',passage:'Contested Pass',checkpoint:'Grove Crossing',combined:'Valley Relay'};
 const hints={
  budget:'Compare what each current can still reach after you spend the bridge.',
  passage:'A route can reach its inlet and still take space another current needs.',
  checkpoint:'Check what space Plant leaves for other currents on either side of its checkpoint.',
  combined:'Compare approaches to the checkpoint before committing construction.'
 };

 function fromRows(rows,family){
  const map=F.fresh(rows[0].length,rows.length);
  const elements={w:'water',p:'nature',f:'fire',e:'electricity'};
  map.cells=rows.join('').split('').map(char=>{
   const element=elements[char.toLowerCase()];
   if(element)return {terrain:'land',node:{element,role:char===char.toLowerCase()?'source':'destination'}};
   if(char==='@')return {terrain:'forest',component:'checkpoint',props:{element:'nature'}};
   if(char==='+')return {terrain:'land',component:'intersection'};
   return {terrain:({'#':'mountain','~':'water','*':'forest'})[char]||'land'};
  });
  map.inventory={bridge:Number(family==='budget'||family==='combined'),intersection:Number(family==='passage'||family==='combined')};
  map.construction={budget:1,prices:Object.fromEntries(Object.keys(map.inventory).filter(kind=>map.inventory[kind]).map(kind=>[kind,1]))};
  return {format:'element-forge-level',schemaVersion:1,rulesVersion:2,map,hint:hints[family],family};
 }

 function recipe(family,pick,{intro=false,wide=false}={}){
  const width=wide?8+pick(2):6+pick(2),height=wide?8+pick(2):6+pick(2);
  const river=['budget','combined'].includes(family)?2+pick(width-4):-1;
  const gap=pick(height);
  const board=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>
   x===river&&y!==gap?'~':pick(100)<14?'#':'.'));
  if(river>=0)board[gap][river]='.';
  const open=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(board[y][x]==='.')open.push([x,y]);
  const use=(choices,char)=>{
   const [x,y]=choices[pick(choices.length)];
   board[y][x]=char;
   open.splice(open.findIndex(([a,b])=>a===x&&b===y),1);
   return [x,y];
  };
  const checkpoint=['checkpoint','combined'].includes(family);
  if(checkpoint){
   const interior=open.filter(([x,y])=>x>0&&y>0&&x<width-1&&y<height-1);
   if(!interior.length)return null;
   use(interior,'@');
  }
  const elements=intro?(checkpoint?'pw':'we'):(checkpoint?'pwe':'wep');
  for(const element of elements){
   if(open.length<2)return null;
   const [x,y]=use(open,element);
   const targets=open.filter(([a,b])=>Math.abs(x-a)+Math.abs(y-b)>=3);
   if(!targets.length)return null;
   use(targets,element.toUpperCase());
  }
  return fromRows(board.map(row=>row.join('')),family);
 }

 const defaultLimit=32000;
 function verify(level,{limit=defaultLimit}={}){
  const map=F.readLevel(level);
  const model=R.prepare(map);
  let work=0;
  const solve=options=>{
   const result=R.solve(model,{limit:Math.max(0,limit-work),...options});
   work+=result.nodes;
   return result;
  };
  const reject=(reason,details={})=>({accepted:false,reason,nodes:work,...details});
  const dry=solve({placements:{}});
  if(!['solved','unsolved'].includes(dry.status))return reject('Starting board '+dry.status,{clean:dry.status});
  const clean=dry.status==='solved'?dry:solve({});
  if(clean.status!=='solved')return reject('Construction search '+clean.status,{clean:clean.status});
  if(!replay(level,clean))return reject('Game replay failed',{clean:'invalid'});
  if(['budget','combined'].includes(level.family)&&dry.status==='solved')return reject('Tool-free bypass',{clean:'solved'});
  const area=map.rulesVersion===3?map.cells.filter(cell=>cell.terrain!=='mountain').length:map.cells.length;
  const open=map.cells.filter(cell=>['land','forest'].includes(cell.terrain)).length;
  const shared=model.adjacency.filter((neighbors,i)=>
   ['land','forest'].includes(map.cells[i].terrain)&&
   neighbors.filter(next=>['land','forest'].includes(map.cells[next].terrain)).length>=3).length;
  if(open<area/2||shared<5)return reject('Visible corridors or independent lanes',{clean:'solved'});

  const solo=[];
  const plans=[{},...model.sites.filter(site=>E.spanKinds.includes(site.kind)).map(({i,kind})=>({[i]:kind}))];
  for(const pair of model.pairs){
   const candidates=[];
   for(const placement of plans){
    const path=solve({solo:pair.element,placements:placement});
    if(path.status==='inconclusive')return reject('Solo comparison inconclusive',{clean:'solved'});
    if(path.status==='solved')candidates.push(path);
   }
   candidates.sort((a,b)=>a.score.track-b.score.track||a.score.components-b.score.components);
   solo.push(candidates);
  }
  const obvious=solo.map(paths=>paths[0]?.routes[0]).filter(Boolean);
  const obviousPlacement=Object.assign({},...solo.map(paths=>paths[0]?.placements));
  if(!E.checkAll(map,obvious,obviousPlacement).length)return reject('Independent shortest routes win',{clean:'solved'});

  const alternatives=[];
  const prefixes=[];
  for(const candidates of solo){
   if(!candidates.length)continue;
   const best=candidates[0], {element,path}=best.routes[0];
   const waypoint=path.findIndex(index=>map.cells[index].component==='checkpoint');
   const handoff=waypoint>1?waypoint-1:Math.max(1,Math.floor((path.length-1)/2));
   const avoid=[...new Set([path[handoff],path[1]])];
   const detours=avoid.map(index=>solve({solo:element,placements:best.placements,avoid:{[element]:[index]}}));
   if(detours.some(route=>route.status==='inconclusive'))return reject('Solo comparison inconclusive',{clean:'solved'});
   const local=new Set();
   for(const candidate of [best,...detours.filter(route=>route.status==='solved'),...candidates.slice(1)]){
    const route=candidate.routes[0].path;
    if(route.length>path.length+3||route.length<4)continue;
    const checkpoint=route.findIndex(index=>map.cells[index].component==='checkpoint');
    const prefix=route.slice(0,Math.max(3,Math.ceil(route.length*.65),checkpoint+1));
    const used=Object.keys(candidate.placements).every(index=>route.includes(Number(index)));
    const key=prefix.join(',');
    if(!used||local.has(key))continue;
    local.add(key);
    prefixes.push({element,prefix,placement:candidate.placements,soloPath:route});
    if(local.size===3)break;
   }
  }
  for(const probe of prefixes){
   const {element,prefix,placement}=probe;
   const result=solve({prefixes:{[element]:prefix},required:placement});
   if(result.status==='solved'&&!replay(level,result))return reject('Alternative replay failed',{clean:'solved'});
   alternatives.push({...probe,status:result.status,witness:result.status==='solved'?result:undefined});
  }
  const failed=alternatives.filter(probe=>probe.status==='unsolved');
  let inconclusive=alternatives.some(probe=>probe.status==='inconclusive');
  for(const probe of failed){
   let left=1,right=probe.prefix.length;
   while(left<right){
    const mid=Math.floor((left+right)/2);
    const test=solve({prefixes:{[probe.element]:probe.prefix.slice(0,mid)},required:probe.placement});
    if(test.status==='inconclusive'){inconclusive=true;break;}
    if(test.status==='solved')left=mid+1;
    else if(test.status==='unsolved')right=mid;
    else return reject('Prefix verification failed',{clean:'solved'});
   }
   if(left===right)probe.firstBlockedAt=left;
   probe.blocks=[];
   for(const pair of model.pairs.filter(pair=>pair.element!==probe.element)){
    const test=solve({only:[probe.element,pair.element],prefixes:{[probe.element]:probe.prefix},required:probe.placement});
    if(test.status==='unsolved')probe.blocks.push(pair.element);
    if(test.status==='inconclusive')inconclusive=true;
   }
  }
  const placementChoices=[];
  const usefulBridgeSites=[...new Set(solo.flatMap(paths=>paths.flatMap(path=>
   Object.entries(path.placements).filter(([index,kind])=>E.spanKinds.includes(kind)&&path.routes[0].path.includes(Number(index))).map(([index,kind])=>index+':'+kind))))];
  for(const site of usefulBridgeSites){
   const [cell,kind]=site.split(':');
   const index=Number(cell);
   const placement={[index]:kind};
   const result=solve({placements:placement});
   if(result.status==='solved'&&!replay(level,result))return reject('Construction alternative replay failed',{clean:'solved'});
   const soloStates=solo.map(paths=>({
    element:paths[0]?.routes[0].element,
    reachable:paths.some(path=>!Object.keys(path.placements).length||path.placements[index]),
    usesBridge:paths.some(path=>path.placements[index]&&path.routes[0].path.includes(index))
   }));
   placementChoices.push({index,kind,usableBy:soloStates.filter(state=>state.usesBridge).map(state=>state.element),
    stranded:soloStates.filter(state=>!state.reachable).map(state=>state.element),
    status:result.status,witness:result.status==='solved'?result:undefined});
  }

  // Either commitment can extend to a win independently. Together they must
  // leave each committed route individually viable but prevent a whole-board win.
  let linked;
  let linkUnknown=false;
  const winners=alternatives.filter(item=>item.status==='solved');
  if(model.pairs.length>=3)for(const first of winners){
   if(linked)break;
   const trials=[
    ...placementChoices.filter(choice=>choice.status==='solved').map(choice=>({placement:{[choice.index]:'bridge'}})),
    ...winners.filter(other=>other.element!==first.element).map(other=>({other}))
   ];
   for(const {placement,other} of trials){
    const construction=other?.placement||placement;
    if(Object.keys(first.placement).some(i=>!Object.hasOwn(construction,i)))continue;
    if(other?.prefix.some(cell=>first.prefix.includes(cell)))continue;
    if(!other&&Object.keys(first.placement).length)continue;
    const options={required:construction,prefixes:{[first.element]:first.prefix}};
    if(other)options.prefixes[other.element]=other.prefix;
    const local=solve({...options,solo:first.element});
    if(local.status==='inconclusive'){linkUnknown=true;break;}
    if(local.status!=='solved')continue;
    const joint=solve(options);
    if(joint.status==='inconclusive'){linkUnknown=true;break;}
    if(joint.status==='unsolved'){
     if(other){
      const secondLocal=solve({...options,solo:other.element});
      if(secondLocal.status==='inconclusive'){linkUnknown=true;break;}
      if(secondLocal.status!=='solved')continue;
     }
     linked={first:{element:first.element,prefix:first.prefix},
      second:other?{element:other.element,prefix:other.prefix}:{placement:construction},status:joint.status};
     break;
    }
   }
   if(linkUnknown)break;
  }

  const placementConflict=placementChoices.some(choice=>choice.status==='unsolved');
  const constructionUnknown=placementChoices.some(choice=>choice.status==='inconclusive');
  if(level.family==='budget'&&(!placementConflict||!placementChoices.some(choice=>choice.status==='solved')))
   return reject('No verified credible bridge tradeoff',{clean:'solved',alternatives,placementChoices});
  if(level.family==='checkpoint'&&!failed.some(probe=>probe.element==='nature'))
   return reject('No verified competing Plant approach',{clean:'solved',alternatives,placementChoices});
  if(!failed.length&&!placementConflict)return reject('No verified consequential local choice',{clean:'solved',alternatives,placementChoices});
  const complete=!inconclusive&&!constructionUnknown;
  const linkStatus=linked?'verified':linkUnknown?'inconclusive':'no conflict among tested commitments';
  const lateFailure=failed.some(probe=>probe.firstBlockedAt>=3)||
   placementChoices.some(choice=>choice.status==='unsolved'&&!choice.stranded.length);
  const multiPlanBridge=placementChoices.filter(choice=>choice.status==='solved').length>=2;
  const twoCurrentComparison=failed.some(probe=>probe.firstBlockedAt>=3)||multiPlanBridge;
  const tier=model.pairs.length===2?(twoCurrentComparison?'Medium':'Easy'):
   complete&&linked&&!linkUnknown&&lateFailure?'Expert':complete&&lateFailure?'Hard':'Medium';
  const strategy={
   conflicts:[...new Set(failed.map(probe=>[probe.element,probe.blocks.join('+')||'joint',
    probe.firstBlockedAt>=3?'after-approach':'near-source'].join(':')))].sort(),
   family:level.family,
   tools:Object.values(clean.placements).sort(),
   blocked:[...new Set(failed.map(probe=>probe.element))].sort(),
   bridges:[...new Set(placementChoices.map(choice=>choice.status+':'+choice.usableBy.slice().sort().join(',')+
    '/'+choice.stranded.slice().sort().join(',')))].sort(),
   linked:linked?[linked.first.element,linked.second.element||'bridge'].sort().join(':'):null
  };
  return {accepted:true,reason:'Verified whole-board routing consequence',clean:'solved',difficulty:tier,nodes:work,
   alternatives,placementChoices,linked,linkStatus,complete,strategy,solution:clean};
 }

 function reference(family){
  const spec=referenceBoards[family];
  if(!spec)throw Error('Unknown reference family');
  const stage=fromRows(spec.rows,family);
  stage.map.name=names[family];
  stage.map.description=spec.description;
  return stage;
 }

 const referenceBoards={
  budget:{
   rows:['...~e..','.*.~#.#','...~...','..P~W..','...~.*.','.w.pE..','...~...'],
   description:'One bridge is available. Deliver all three currents across the floodplain.'
  },
  passage:{
   rows:['P.....','.#...#','..*#..','#....F','.f.W..','.#p..w','......'],
   description:'Three currents share a clearing. You may build one intersection.'
  },
  checkpoint:{
   rows:['#......','..####.','.......','PW...w.','.E.@...','.#..p.#','..e.*..'],
   description:'Plant must visit its checkpoint while all three currents reach the Engine.'
  },
  combined:{
   rows:['#.~p..','.#~...','##~E.W','..~.@.','......','eP~...','..~.w.'],
   description:'Plant has a checkpoint. Your budget buys a bridge or an intersection.'
  }
 };

 function variant(family,pick){
  const spec=referenceBoards[family];
  const board=spec.rows.map(row=>[...row]);
  const sites=board.flatMap((row,y)=>row.map((tile,x)=>({x,y,tile})));
  const symbols=sites.filter(({tile})=>/[wpef@]/i.test(tile));
  const {x,y,tile}=symbols[pick(symbols.length)];
  const options=sites.filter(site=>site.tile==='.'&&Math.abs(site.x-x)+Math.abs(site.y-y)<=2);
  if(options.length){
   const target=options[pick(options.length)];
   board[target.y][target.x]=tile;
   board[y][x]='.';
  }
  const edits=sites.filter(site=>site.tile==='#'||board[site.y][site.x]==='.');
  const edit=edits[pick(edits.length)];
  board[edit.y][edit.x]=edit.tile==='#'?'.':'#';
  return fromRows(board.map(row=>row.join('')),family);
 }

 function expand(level,pick){
  const map=level.map;
  const x=pick(13-map.width),y=pick(13-map.height);
  const cells=Array.from({length:144},()=>({terrain:'mountain'}));
  for(const [i,cell] of map.cells.entries())cells[(y+Math.floor(i/map.width))*12+x+i%map.width]=cell;
  if(map.inventory.bridge){
   // Wet layouts use a conductive span so Electricity can cross as well.
   map.inventory.metalSpan=map.inventory.bridge;
   map.inventory.bridge=0;
   map.construction.prices.metalSpan=map.construction.prices.bridge;
   delete map.construction.prices.bridge;
   level.hint='Compare what each current can still reach after you spend the span.';
  }
  return {...level,rulesVersion:3,map:{...map,rulesVersion:3,width:12,height:12,cells}};
 }

 function scarceCrossing(){
  const board=Array.from({length:12},()=>Array(12).fill('#'));
  const put=(x,y,tile)=>{board[y][x]=tile;};
  for(let y=2;y<=9;y++)put(4,y,'=');
  for(const y of [3,5,8])for(let x=5;x<=10;x++)put(x,y,x===5?':':'.');
  for(let y=3;y<=8;y++)put(10,y,'.');
  put(8,5,'~');put(9,6,'E');put(5,6,'e');
  put(5,1,'p');put(5,2,'*');put(5,4,'P');
  put(2,7,'w');put(3,7,':');put(10,7,'W');
  const rows=board.map(row=>row.join(''));
  const level=fromRows(rows,'budget');
  for(const [i,tile] of rows.join('').split('').entries()){
   if(tile==='='||tile===':')level.map.cells[i].terrain=tile==='='?'river':'bank';
  }
  level.rulesVersion=level.map.rulesVersion=3;
  level.map.name='Scarce Crossing';
  level.map.description='Choose where Water leaves the river while Plant reaches the woods and Electricity reaches its span.';
  level.map.inventory={metalSpan:1};
  level.map.construction={budget:1,prices:{metalSpan:1}};
  level.hint='Trace the three landings from the river before committing.';
  return level;
 }

 function verifyScarce(){
  const level=scarceCrossing();
  const model=R.prepare(F.readLevel(level));
  const solve=options=>R.solve(model,{limit:64000,...options});
  const solution=solve({});
  if(solution.status!=='solved'||!replay(level,solution))throw Error('Scarce Crossing failed replay');
  const alternatives=[3,5,8].map(exit=>{
   const placements={[5*12+8]:'metalSpan'};
   const vertical=Array.from({length:Math.abs(exit-7)+1},(_,i)=>(7+i*Math.sign(exit-7))*12+4);
   const prefix=[7*12+2,7*12+3,...vertical,exit*12+5];
   const options={placements,prefixes:{water:prefix}};
   return {exit,solo:solve({...options,solo:'water'}).status,status:solve(options).status,
    plant:solve({...options,only:['water','nature']}).status,electricity:solve({...options,only:['water','electricity']}).status};
  });
  if(alternatives.some(entry=>entry.solo!=='solved')||alternatives[0].plant!=='unsolved'||alternatives[1].electricity!=='unsolved'||
   alternatives[0].status!=='unsolved'||alternatives[1].status!=='unsolved'||alternatives[2].status!=='solved')
   throw Error('Scarce Crossing alternatives changed: '+JSON.stringify(alternatives));
  return {level,solution,alternatives};
 }

 function generate({seed='forge',family='mixed',difficulty='mixed',count=6,attempts=count*12,limit=defaultLimit,includeReferences=false,legacy=false}={}){
  if(!Number.isInteger(count)||count<1||count>20||!Number.isInteger(attempts)||attempts<0||attempts>400||
     !Number.isInteger(limit)||limit<0||!['mixed',...families].includes(family)||
     !['mixed',...difficulties].includes(difficulty))throw Error('Invalid generator options.');
  const activeRevision=legacy?'routing-v2':revision;
  const pick=random(activeRevision+':'+seed);
  const stages=[],evidence=[],rejections=[],layouts=new Set(),decisions=new Set();
  let fallback=0;
  function add(level,origin){
   if(!level)return;
   if(!legacy)level=expand(level,random(activeRevision+':'+seed+':'+origin+':'+(stages.length+rejections.length)));
   const key=layoutKey(level.map);
   if(layouts.has(key)){rejections.push({family:level.family,reason:'Repeated layout or decision'});return;}
   const check=verify(level,{limit});
   if(!check.accepted){rejections.push({family:level.family,reason:check.reason,nodes:check.nodes});return;}
   const decision=JSON.stringify(legacy?check.strategy:{
    ...check.strategy,
    conflicts:[...new Set(check.strategy.conflicts.map(conflict=>conflict.replace(/:(after-approach|near-source)$/,'')))].sort()
   });
   if(decisions.has(decision)){rejections.push({family:level.family,reason:'Repeated layout or decision'});return;}
   if(difficulty!=='mixed'&&difficulty!==check.difficulty){
    rejections.push({family:level.family,reason:'Verified '+check.difficulty+' rather than requested '+difficulty});return;
   }
   layouts.add(key);decisions.add(decision);
   Object.assign(level,{difficulty:check.difficulty,special:level.family==='combined'&&!!check.linked});
   level.map.description||='Route each current to its matching inlet.';
   stages.push(level);evidence.push({origin,decision,...check});
   if(origin==='fallback')fallback++;
  }
  if(includeReferences)for(const f of families.filter(f=>referenceBoards[f]&&(family==='mixed'||family===f))){
   if(stages.length<count)add(reference(f),'reference');
  }
  for(let i=0;i<attempts&&stages.length<count;i++){
   const f=family==='mixed'?families[i%4]:family;
   const intro=difficulty==='Easy'||(f==='budget'&&difficulty==='Medium'&&i%2===0)||(difficulty==='mixed'&&!stages.some(stage=>stage.difficulty==='Easy'));
   add(!intro&&i%3!==0?variant(f,pick):recipe(f,pick,{intro,wide:!legacy&&i%6===3}),'generated');
  }
  for(const f of families.filter(f=>referenceBoards[f]&&(family==='mixed'||family===f))){
   if(stages.length<count)add(reference(f),'fallback');
  }
  if(difficulty==='mixed'){
   const order=stages.map((stage,i)=>i).sort((a,b)=>
    difficulties.indexOf(stages[a].difficulty)-difficulties.indexOf(stages[b].difficulty));
   const orderedStages=order.map(i=>stages[i]);
   const orderedEvidence=order.map(i=>evidence[i]);
   stages.splice(0,stages.length,...orderedStages);
   evidence.splice(0,evidence.length,...orderedEvidence);
  }
  stages.forEach((stage,index)=>{
   const suffix=evidence[index].origin==='generated'?' '+(index+1):'';
   stage.map.name=stage.difficulty+' · '+names[stage.family]+suffix;
  });
  const shortfall=count-stages.length;
  return {pack:{format:'element-forge-challenges',version:1,revision:activeRevision,seed:String(seed),stages},
   report:{revision:activeRevision,seed:String(seed),family,difficulty,limit,attempts,includeReferences,requested:count,accepted:stages.length,shortfall,fallback,rejections,evidence}};
 }

 const api={families,difficulties,revision,reference,verify,replay,generate,readPack,layoutKey,recipe,random,fromRows,scarceCrossing,verifyScarce};
 root.EFChallenges=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
