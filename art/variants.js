'use strict';
(function(root){
 const catalog=root.EFArtCatalog??{};
 const chapters=['The Sleeping Valley','The Gatekeepers','The Primeval Crucible','The Astral Loom',
  'The Celestial Confluence',"The Weaver’s Playground",'The Shattered Abyss','The World-Heart Sanctuary','The Confluence Forges','The Twilight Pendulum','The Archive of First Currents','The Garden of Forgotten Wonders'];
 const themes=[
  {land:0,forest:1,bridge:0,portal:0}, {land:2,wall:1,bridge:1,gate:0},
  {land:3,mountain:0,lava:1,heated:2,bridge:2,tunnel:2}, {land:2,mountain:2,exposed:1,portal:1},
  {land:0,mountain:1,wall:0,exposed:2,bridge:1}, {land:1,forest:2,intersection:1,junction:0},
  {land:3,mountain:2,wall:2,void:0,covered:0,portal:2}, {land:0,mountain:1,water:1,exposed:2,converter:2},
  {land:2,mountain:1,wall:1,water:1,forest:1,lava:1,gate:1,metalSpan:1,portal:1,tunnel:1,intersection:1},
  {land:2,exposed:1,covered:0,wall:1,gate:1,intersection:0,forest:1,portal:2}
 ];
 const compass=['N','E','S','W'];
 const headings={N:'north',E:'east',S:'south',W:'west'};
 const opposite=d=>compass[(compass.indexOf(d)+2)%4];
 const byType=new Map();
 for(const item of Object.values(catalog)){
  if(!byType.has(item.type))byType.set(item.type,[]);
  byType.get(item.type).push(item);
 }
 function options(type){return byType.get(type)??[];}
 function resolve(spec,type){return spec?.id&&Object.hasOwn(catalog,spec.id)&&catalog[spec.id].type===type?catalog[spec.id]:null;}
 function classify(item){return item?.piece?.split('-')[0];}
 function neighbors(map,i){
  const x=i%map.width,y=Math.floor(i/map.width);
  return {N:y?map.cells[i-map.width]:null,E:x<map.width-1?map.cells[i+1]:null,
   S:y<map.height-1?map.cells[i+map.width]:null,W:x?map.cells[i-1]:null};
 }
 function suggestedPiece(map,i,type){
  const cell=map.cells[i],adj=neighbors(map,i),direction=cell.props?.direction;
  if(type==='oneway'||type==='gate')return headings[direction]??'east';
  if(type==='junction')return 'stem-'+(headings[direction]??'east');
  if(['bridge','metalSpan','intersection'].includes(type))return ['N','S'].includes(direction)?'vertical':'horizontal';
  if(type==='river'){
   const links=compass.filter(d=>adj[d]?.terrain==='river');
   const incoming=links.find(d=>adj[d]?.props?.direction===opposite(d));
   const exit=direction??links.find(d=>d!==incoming&&(!incoming||d===opposite(incoming)))??links.at(-1)??'E';
   const entry=incoming??links.find(d=>d!==exit);
   return entry&&entry!==exit&&entry!==opposite(exit)?('bend-'+entry+'-'+exit).toLowerCase():'straight-'+headings[exit];
  }
  if(type==='bank'){
   const wet=cell=>['river','water','shallow'].includes(cell?.terrain);
   const edges=compass.filter(d=>wet(adj[d]));
   const corner=['NW','NE','SE','SW'].find(pair=>[...pair].every(d=>edges.includes(d)));
   const diag={NW:i-map.width-1,NE:i-map.width+1,SE:i+map.width+1,SW:i+map.width-1};
   const diagonal=Object.keys(diag).find(pair=>[...pair].every(d=>adj[d])&&wet(map.cells[diag[pair]]));
   return corner||(!edges.length&&diagonal)?'corner-'+(corner??diagonal).toLowerCase():'edge-'+headings[edges[0]??'N'];
  }
  return '';
 }
 function suggest(map,i,type,styleIndex=0){
  const choices=options(type);
  const styles=[...new Set(choices.map(item=>item.label))];
  const style=typeof styleIndex==='string'&&styles.includes(styleIndex)?styleIndex:styles[styleIndex]??styles[0];
  return choices.find(item=>item.label===style&&item.piece===suggestedPiece(map,i,type))??
   choices.find(item=>item.label===style);
 }
 function gardenTerrain(type){
  const id={land:'garden-stone-floor',wall:'garden-hedge-straight',forest:'garden-tree-green',water:'garden-water-straight'}[type];
  return id&&resolve({id},type)?{id,rotation:0}:null;
 }
 function applyPalette(map,index){
  if(index===11){
   map.artPalette=12;map.nodeAppearance='garden';
   for(const cell of map.cells){const spec=gardenTerrain(cell.terrain);if(spec&&!cell.terrainArt?.id?.startsWith('garden-'))cell.terrainArt=spec;}
   return true;
  }
  if(index===10){
   map.artPalette=11;
   for(const cell of map.cells){
    if(cell.terrain==='land'||cell.terrain==='wall') cell.terrainArt={id:cell.terrain==='land'?'library-stone-floor':'library-bookshelf',rotation:0};
   }
   return true;
  }
  const theme=themes[index];
  if(!theme)return false;
  map.artPalette=index+1;
  map.cells.forEach((cell,i)=>{
   for(const [field,type] of [['terrainArt',cell.terrain],['componentArt',cell.component]]){
    const art=suggest(map,i,type,theme[type]??0);
    if(art)cell[field]={id:art.id,rotation:0};
   }
  });
  map.toolArt=Object.fromEntries(['bridge','metalSpan','intersection','tunnel','portal'].flatMap(type=>{
   const items=options(type), art=items.find(item=>item.label===[...new Set(items.map(item=>item.label))][theme[type]??0]);
   return art?[[type,{id:art.id,rotation:0}]]:[];
  }));
  return true;
 }
 function heading(spec,type){
  const piece=resolve(spec,type)?.piece;
  const base=compass.find(d=>headings[d]===piece||'stem-'+headings[d]===piece);
  return base?compass[(compass.indexOf(base)+(spec.rotation??0)/90)%4]:null;
 }
 function toolAppearance(spec,kind,vertical){
  const item=resolve(spec,kind);
  if(!item||vertical===undefined||!['bridge','metalSpan','intersection'].includes(kind))return spec;
  if(classify(item)!=='horizontal'&&classify(item)!=='vertical')return spec;
  const target=vertical?'vertical':'horizontal';
  const art=options(kind).find(other=>other.label===item.label&&other.piece===target);
  return art?{...spec,id:art.id}:spec;
 }
 function campaignLevel(level,index){
  const map=structuredClone(level.map);
  applyPalette(map,index);
  return {...level,map};
 }
 const api={campaignLevel,chapters,options,resolve,suggest,suggestedPiece,applyPalette,heading,toolAppearance,gardenTerrain};
 root.EFVariants=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
