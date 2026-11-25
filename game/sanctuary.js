'use strict';
(function(root){
 const elements=['fire','water','earth','wind','nature','light'];
 const isSanctuary=map=>map?.nodeAppearance==='sanctuary'&&map.name==='The Sanctuary of Silent Guardians';
 function delivered(map,routes){
 return new Set(routes.filter(r=>elements.includes(r.element)&&map.cells[r.path[0]]?.node?.role==='source'&&map.cells[r.path[0]].node.element===r.element&&map.cells[r.path.at(-1)]?.node?.role==='destination'&&map.cells[r.path.at(-1)].node.element===r.element).map(r=>r.element));
 }
 function view(map,routes){
 const done=delivered(map,routes),complete=elements.every(e=>done.has(e));
 return map.cells.map(cell=>{
 const id=cell.terrainArt?.id??'';
 return {effect:cell.node?.role==='destination'&&done.has(cell.node.element)?'inlet':id.startsWith('sanctuary-grand-altar-')&&complete?(id.endsWith('-center')?'crystal':'heart'):id==='sanctuary-gate-closed'&&complete?'gate':id==='sanctuary-fountain'&&done.has('water')?'water':id==='sanctuary-lantern'&&done.has('light')?'light':null};
 });
 }
 function motion(tile,item){
 const effect=item?.effect??null;
 if(!effect){delete tile.dataset.sanctuaryEffect;return;}
 tile.dataset.sanctuaryEffect=effect;
 }
 const api={elements,isSanctuary,delivered,view,motion};
 root.EFSanctuary=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
