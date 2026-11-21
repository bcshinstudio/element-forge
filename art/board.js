'use strict';
(() => {
 const structures = new Set(['bridge', 'intersection', 'tunnel', 'portal']);
 const terrains = new Set(['land', 'forest', 'mountain', 'void', 'water', 'river', 'shallow', 'heated', 'lava', 'scree']);

 function decorate(cell, kind, { link, custom = false } = {}) {
  cell.querySelectorAll('.structure-art, .art-structure-label').forEach(node => node.remove());
  const illustrated = structures.has(kind) && !custom;
  cell.dataset.structure = illustrated ? kind : '';
  if (!illustrated) return;
  const art = document.createElement('span');
  art.className = 'structure-art';
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

 window.EFBoardArt = { decorate, structures, terrains };
})();
