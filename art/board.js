'use strict';
(() => {
 const structures = new Set(['bridge', 'intersection', 'tunnel', 'portal']);
 const terrains = new Set(['land', 'forest', 'mountain', 'void', 'water', 'river', 'shallow', 'heated', 'lava', 'scree']);

 function setTerrain(cell, terrain, spec) {
  const variant=window.EFVariants?.resolve(spec,terrain);
  const layer=cell.querySelector('.terrain-variant');
  if(!variant){layer?.remove();return;}
  if(layer?.dataset.variant===variant.id&&layer.dataset.rotation===String(spec.rotation??0))return;
  layer?.remove();
  const art=document.createElement('span');
  art.className='terrain-variant';
  applyVariant(art,variant,spec);
  cell.prepend(art);
 }

 function applyVariant(art,variant,spec){
  art.dataset.variant=variant.id;
  art.dataset.rotation=spec.rotation??0;
  art.style.backgroundImage=`url("${variant.src}")`;
  art.style.setProperty('--art-rotation',`${spec.rotation??0}deg`);
  art.setAttribute('aria-hidden','true');
 }

 function decorate(cell, kind, { link, custom = false, spec } = {}) {
  cell.querySelectorAll('.structure-art, .art-structure-label').forEach(node => node.remove());
  const variant=window.EFVariants?.resolve(spec,kind);
  const illustrated = Boolean(variant)||structures.has(kind) && !custom;
  cell.dataset.structure = illustrated ? kind : '';
  if (!illustrated) return;
  const art = document.createElement('span');
  art.className = 'structure-art';
  if(variant){
   art.classList.add('structure-variant');
   applyVariant(art,variant,spec);
  }
  art.setAttribute('aria-hidden', 'true');
  cell.append(art);
  if (link) {
   const label = document.createElement('span');
   label.className = 'art-structure-label';
   label.textContent = link;
   label.title = link;
   label.setAttribute('aria-hidden', 'true');
   cell.append(label);
  }
 }

 function nodeArtwork(mode,node){
  if(!node||!['library','books-only'].includes(mode))return null;
  const prefix=node.role==='source'?'source':mode==='library'?'destination':'open-destination';
  const type=node.role==='source'?'node-source':mode==='library'?'node-destination':'node-open-destination';
  return window.EFVariants?.resolve({id:'library-'+prefix+'-'+node.element},type)??null;
 }
 function setNode(cell,mode,node){
  const item=nodeArtwork(mode,node);
  const current=cell.querySelector('.library-node-art');
  if(current&&item&&current.dataset.artId===item.id)return;
  current?.remove();
  cell.classList.remove('illustrated-node');
  if(!item)return;
  const image=document.createElement('img');
  image.className='library-node-art';
  image.dataset.artId=item.id;
  image.alt='';
  image.src=item.src;
  image.onerror=()=>{image.remove();cell.classList.remove('illustrated-node');};
  cell.prepend(image);
  cell.classList.add('illustrated-node');
 }
 window.EFBoardArt = { decorate, setTerrain, structures, terrains, nodeArtwork, setNode };
})();
