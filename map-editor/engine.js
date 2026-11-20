'use strict';
/* Shared rules: browser global and Node test export. Prototype scope deliberately explicit. */
(function(root){
const ELEMENTS=['fire','water','nature','electricity','arcane'];
const neighbors=(i,w,h)=>[[i-w,'N'],[i+1,'E'],[i+w,'S'],[i-1,'W']].filter(([j,d])=>j>=0&&j<w*h&&(d!=='E'||Math.floor(j/w)===Math.floor(i/w))&&(d!=='W'||Math.floor(j/w)===Math.floor(i/w)));
const axis=(a,b,w)=>Math.floor(a/w)===Math.floor(b/w)?'h':'v';
const pairs=m=>ELEMENTS.map(element=>({element,source:m.cells.findIndex(c=>c.node?.element===element&&c.node.role==='source'),destination:m.cells.findIndex(c=>c.node?.element===element&&c.node.role==='destination')})).filter(p=>p.source>=0||p.destination>=0);
const placementKind=v=>typeof v==='string'?v:v?.kind||null;
const effective=(m,placements,i)=>placementKind(placements?.[i])||m.cells[i].component||null;
const pairIdAt=(m,placements,i)=>placements?.[i]?.pairId||m.cells[i]?.props?.pairId||null;
const linkPartner=(m,i,placements={})=>{
 const kind=effective(m,placements,i),id=pairIdAt(m,placements,i);
 if(!['portal','tunnel'].includes(kind)||!id)return -1;
 const matches=[];for(let j=0;j<m.cells.length;j++)if(effective(m,placements,j)===kind&&pairIdAt(m,placements,j)===id)matches.push(j);
 if(matches.length!==2)return -1;
 const other=matches[0]===i?matches[1]:matches[0];
 if(kind==='tunnel'){
  const row=Math.floor(i/m.width)===Math.floor(other/m.width),col=i%m.width===other%m.width;
  if(!row&&!col)return -1;
  const step=row?(other>i?1:-1):(other>i?m.width:-m.width);
  let blocked=false;for(let k=i+step;k!==other;k+=step)if(!['land','forest','ice'].includes(m.cells[k].terrain))blocked=true;
  if(!blocked)return -1;
 }
 return other;
};
const routeNeighbors=(m,i,placements={})=>[...neighbors(i,m.width,m.height).map(([j])=>j),...(linkPartner(m,i,placements)>=0?[linkPartner(m,i,placements)]:[])];
const terrainOK=(c,component)=>['land','forest','ice','oneway'].includes(c.terrain)||(c.terrain==='water'&&component==='bridge');
const direction=(a,b,w)=>b===a-w?'N':b===a+w?'S':b===a+1&&Math.floor(a/w)===Math.floor(b/w)?'E':b===a-1&&Math.floor(a/w)===Math.floor(b/w)?'W':null;
function allowedTransition(m,element,from,to,placements={}){
 const c=m.cells[from],next=m.cells[to],step=direction(from,to,m.width);
 if(!step)return linkPartner(m,from,placements)===to;
 if(c.terrain==='oneway'&&step!==(c.props?.direction||'E'))return false;
 if(c.component==='gate'&&step!==(c.props?.direction||'E'))return false;
 if(next.component==='gate'&&step!==(next.props?.direction||'E'))return false;
 if(next.terrain==='oneway'&&step!==(next.props?.direction||'E'))return false;
 return true;
}
function constraintError(m,element,path,placements={}){
 const rules=m.constraints?.[element]||{};
 if(rules.forbidTerrain?.some(t=>path.some(i=>m.cells[i].terrain===t)))return 'Element terrain restriction violated';
 if(rules.forbidComponents?.some(t=>path.some(i=>effective(m,placements,i)===t)))return 'Element component restriction violated';
 if(rules.requireComponents?.some(t=>!path.some(i=>effective(m,placements,i)===t)))return 'Required component not used';
 return null;
}
function canPlace(m,placements,i,kind){const c=m.cells[i];return !!c&&!c.node&&!c.component&&!placements[i]&&(kind==='bridge'?c.terrain==='water':['intersection','portal','tunnel'].includes(kind)?['land','forest','ice'].includes(c.terrain):false)}
function validatePath(m,element,path,other=[],placements={}){
 const p=pairs(m).find(x=>x.element===element);if(!p||p.source<0||p.destination<0)return 'Missing endpoints';
 if(!Array.isArray(path)||path.length<2||path[0]!==p.source||path.at(-1)!==p.destination)return 'Route must connect its source to destination';
 const seen=new Set();for(let k=0;k<path.length;k++){const i=path[k],c=m.cells[i];if(!Number.isInteger(i)||!c||seen.has(i))return 'Route leaves board or loops';seen.add(i);
 const comp=effective(m,placements,i);if(!terrainOK(c,comp))return `Blocked terrain at cell ${i+1}`;
 if(comp&&!['bridge','intersection','checkpoint','portal','tunnel','gate'].includes(comp))return `Unsupported component: ${comp}`;
 if(c.node&&(c.node.element!==element||(k!==0&&k!==path.length-1)))return 'Another endpoint blocks route';
 if(c.component==='checkpoint'&&c.props?.element&&!['any',element].includes(c.props.element))return 'Checkpoint belongs to another element';
 if(k&& !routeNeighbors(m,path[k-1],placements).includes(i))return 'Routes must use adjacent cells or valid paired links';
 if(k&&!allowedTransition(m,element,path[k-1],i,placements))return 'One-way direction violated';
 }
 const restriction=constraintError(m,element,path,placements);if(restriction)return restriction;
 for(const r of other){if(r.element===element)continue;for(const i of path){if(!r.path.includes(i))continue;if(effective(m,placements,i)!=='intersection')return 'Different elements cannot share a cell';const a=path.indexOf(i),b=r.path.indexOf(i);if(a===0||a===path.length-1||b===0||b===r.path.length-1)return 'Crossing cannot be at an endpoint';const a1=axis(path[a-1],i,m.width),a2=axis(i,path[a+1],m.width),b1=axis(r.path[b-1],i,m.width),b2=axis(i,r.path[b+1],m.width);if(!direction(path[a-1],i,m.width)||!direction(i,path[a+1],m.width)||!direction(r.path[b-1],i,m.width)||!direction(i,r.path[b+1],m.width)||a1!==a2||b1!==b2||a1===b1)return 'Intersection needs straight perpendicular routes';}}
 return null;
}
function checkAll(m,routes,placements={}){const errors=[];const counts={};for(const [i,v] of Object.entries(placements)){const k=placementKind(v);if(!canPlace(m,Object.fromEntries(Object.entries(placements).filter(([j])=>j!==i)),+i,k))errors.push(`Invalid ${k} placement at ${+i+1}`);counts[k]=(counts[k]||0)+1;}for(const [k,n] of Object.entries(counts))if(n>(m.inventory?.[k]||0))errors.push(`Inventory exceeded: ${k}`);
 for(let i=0;i<m.cells.length;i++)if(['portal','tunnel'].includes(effective(m,placements,i))&&linkPartner(m,i,placements)<0)errors.push(`Invalid or unpaired ${effective(m,placements,i)} at cell ${i+1}`);
 for(const p of pairs(m)){if(p.source<0||p.destination<0){errors.push(`${p.element}: unmatched endpoints`);continue;}const r=routes.find(r=>r.element===p.element);if(!r){errors.push(`${p.element}: missing route`);continue;}const err=validatePath(m,p.element,r.path,routes.filter(x=>x!==r),placements);if(err)errors.push(`${p.element}: ${err}`);for(let i=0;i<m.cells.length;i++){const c=m.cells[i];if(c.component==='checkpoint'&&['any',p.element].includes(c.props?.element)&&!r.path.includes(i))errors.push(`${p.element}: required checkpoint not visited`);}}
 return errors;}
function score(m,routes,placements={}){const track=routes.reduce((s,r)=>s+r.path.length-1,0),components=Object.values(placements).length,cost=track+components*5;return {track,components,cost};}
/* Bounded search: route first; when water encountered, may consume bridge; when another route is present, may consume intersection.
   Search limits are NOT evidence of unsolvability. */
function solve(m,{limit=120000,maxPairs=3,allowPlacement=true,initialPlacements={}}={}){
 const ps=pairs(m);if(!ps.length||ps.some(p=>p.source<0||p.destination<0))return {status:'invalid',message:'Missing or unmatched endpoints'};
 if(ps.length>maxPairs)return {status:'unsupported',message:`Maximum ${maxPairs} pairs for prototype solver`};
 if(m.cells.some(c=>c.component&&!['bridge','intersection','checkpoint','portal','tunnel','gate'].includes(c.component)))return {status:'unsupported',message:'Map contains advanced components not supported by solver'};
 if(m.cells.some(c=>!['land','forest','ice','water','mountain','wall','void','lava','oneway'].includes(c.terrain)))return {status:'unsupported',message:'Unknown terrain'};


 for(let i=0;i<m.cells.length;i++){const c=m.cells[i];if(['portal','tunnel'].includes(c.component)&&linkPartner(m,i)<0)return {status:'invalid',message:`Invalid ${c.component} connection at cell ${i+1}; tunnel ends must align and cross blocked terrain`};}
 let nodes=0,exhausted=false;const budget={bridge:allowPlacement?(m.inventory?.bridge||0):0,intersection:allowPlacement?(m.inventory?.intersection||0):0};
 const distance=(i,d)=>Math.abs(i%m.width-d%m.width)+Math.abs(Math.floor(i/m.width)-Math.floor(d/m.width));
 const ordered=[...ps].sort((a,b)=>distance(a.source,a.destination)-distance(b.source,b.destination));
 function visitPair(pi,routes,placements){if(pi===ordered.length){const errors=checkAll(m,routes,placements);return errors.length?null:{routes,placements};}
 const p=ordered[pi],stack=[{path:[p.source],seen:new Set([p.source]),placements}];
 while(stack.length){if(++nodes>limit){exhausted=true;return null;}const state=stack.pop(),cur=state.path.at(-1);
 if(cur===p.destination){if(validatePath(m,p.element,state.path,routes,state.placements))continue;const needed=m.cells.map((c,i)=>c.component==='checkpoint'&&['any',p.element].includes(c.props?.element)?i:-1).filter(i=>i>=0);if(needed.some(i=>!state.seen.has(i)))continue;const found=visitPair(pi+1,[...routes,{element:p.element,path:state.path}],state.placements);if(found)return found;if(exhausted)return null;continue;}
 const ns=routeNeighbors(m,cur,state.placements).filter(i=>!state.seen.has(i));ns.sort((a,b)=>distance(b,p.destination)-distance(a,p.destination));
 for(const i of ns){if(!allowedTransition(m,p.element,cur,i,state.placements))continue;const c=m.cells[i];if(c.node&&!(c.node.element===p.element&&c.node.role==='destination'))continue;let pl=state.placements,comp=effective(m,pl,i);const overlaps=routes.filter(r=>r.path.includes(i));let wanted=null;
 if(!terrainOK(c,comp)){if(c.terrain==='water'&&!comp)wanted='bridge';else continue;}
 if(comp&&!['bridge','intersection','checkpoint','portal','tunnel','gate'].includes(comp))continue;
 if(overlaps.length){if(overlaps.length>1)continue;if(comp==='bridge')continue;if(comp!=='intersection')wanted='intersection';}
 if(wanted){if(!allowPlacement||!canPlace(m,pl,i,wanted))continue;const used=Object.values(pl).filter(x=>placementKind(x)===wanted).length;if(used>=budget[wanted])continue;pl={...pl,[i]:wanted};}
 const path=[...state.path,i];if(overlaps.length){const r=overlaps[0],j=r.path.indexOf(i);if(j===0||j===r.path.length-1||path.length<3)continue;const b1=axis(r.path[j-1],i,m.width),b2=axis(i,r.path[j+1],m.width);if(b1!==b2)continue;const a1=axis(path[path.length-2],i,m.width);if(a1===b1)continue; /* require straight exit on next step */}
 if(path.length>m.width*m.height)continue;
 stack.push({path,seen:new Set([...state.seen,i]),placements:pl});
 }
 }
 return null;}
 const result=visitPair(0,[],initialPlacements);return result?{status:'solved',...result,nodes,score:score(m,result.routes,result.placements)}:{status:exhausted?'inconclusive':'unsolved',nodes,message:exhausted?'Search budget reached; result unknown':'No solution under supported rules'};
}
/* Bounded construction search. First try ordinary routes, then try candidate portal/tunnel pairs.
   This is a heuristic, not an exhaustive proof of unsolvability or optimality. */
function solveConstruction(m,{limit=120000,maxPairs=3,maxCandidates=180}={}){
 const direct=solve(m,{limit,maxPairs});
 if(direct.status==='solved'||direct.status==='invalid'||direct.status==='unsupported')return {...direct,constructionAttempts:0};
 const ps=pairs(m);if(!ps.length)return direct;
 const dist=(a,b)=>Math.abs(a%m.width-b%m.width)+Math.abs(Math.floor(a/m.width)-Math.floor(b/m.width));
 const validCells=m.cells.map((_,i)=>i).filter(i=>canPlace(m,{},i,'portal'));
 const kinds=['tunnel','portal'].filter(k=>(m.inventory?.[k]||0)>=2);
 let attempts=0,hitLimit=false;
 for(const kind of kinds){
  for(const pair of ps){
   const starts=[...validCells].sort((a,b)=>dist(a,pair.source)-dist(b,pair.source)||a-b).slice(0,14);
   const ends=[...validCells].sort((a,b)=>dist(a,pair.destination)-dist(b,pair.destination)||a-b).slice(0,14);
   const candidates=[];
   for(const a of starts)for(const b of ends){if(a===b)continue;
    const pl={[a]:{kind,pairId:'AUTO'},[b]:{kind,pairId:'AUTO'}};
    if(linkPartner(m,a,pl)!==b)continue;
    candidates.push({a,b,pl,cost:dist(a,pair.source)+dist(b,pair.destination)});
   }
   candidates.sort((a,b)=>a.cost-b.cost||a.a-b.a||a.b-b.b);
   for(const candidate of candidates){
    if(attempts>=maxCandidates)return {status:'inconclusive',message:'Construction candidate budget reached; solvability unknown',constructionAttempts:attempts};
    attempts++;
    const result=solve(m,{limit:Math.max(10000,Math.floor(limit/4)),maxPairs,initialPlacements:candidate.pl});
    if(result.status==='solved')return {...result,constructionAttempts:attempts,constructionKind:kind};
    if(result.status==='inconclusive')hitLimit=true;
   }
  }
 }
 return {status:hitLimit||direct.status==='inconclusive'?'inconclusive':'unsolved',message:hitLimit?'Some construction searches exceeded their limits':'No solution found within supported construction candidates',constructionAttempts:attempts};
}
const api={placementKind,pairIdAt,allowedTransition,constraintError,neighbors,routeNeighbors,linkPartner,pairs,canPlace,effective,validatePath,checkAll,score,solve,solveConstruction,solveFixed:(m,o)=>solve(m,{...o,allowPlacement:false})};root.EFEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
