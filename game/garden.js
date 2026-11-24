'use strict';
(function(root){
 const elements=['fire','water','nature','electricity','wind','arcane'];
 const isGarden=map=>map.nodeAppearance==='garden'&&map.name==='The Garden of Forgotten Wonders';
 const group=id=>/^garden-heart-dormant-/.test(id)||id==='garden-gate-closed'?'complete':
  /^garden-fountain.*(?:idle|dormant)$/.test(id)?'water':
  /^garden-flower-.*(?:closed|idle)$/.test(id)?'nature':
  /^garden-(?:power-|gear-)/.test(id)?'electricity':
  /^garden-windmill-state-idle$/.test(id)?'wind':
  /^garden-lantern-gold$/.test(id)?'fire':null;
 function delivered(map,routes){
  return new Set(routes.filter(r=>elements.includes(r.element)&&map.cells[r.path[0]]?.node?.role==='source'&&map.cells[r.path[0]].node.element===r.element&&map.cells[r.path.at(-1)]?.node?.role==='destination'&&map.cells[r.path.at(-1)].node.element===r.element).map(r=>r.element));
 }
 function view(map,routes,catalog){
  const done=delivered(map,routes),complete=elements.every(e=>done.has(e));
  return map.cells.map(cell=>{
   const spec=cell.terrainArt,id=spec?.id??'',kind=group(id);
   const active=kind==='complete'?complete:done.has(kind);
   const arcane=done.has('arcane')&&id.startsWith('garden-heart-dormant-');
   const effect=active?kind:arcane?'arcane':null;
   return {spec:active&&catalog[id]?.activeId?{...spec,id:catalog[id].activeId}:spec,effect};
  });
 }
 const level={id:'garden-forgotten-wonders',format:'element-forge-level',schemaVersion:1,rulesVersion:4,map:{"format":"element-forge-map","schemaVersion":2,"name":"The Garden of Forgotten Wonders","description":"Restore the six elemental currents to awaken the Heart of Wonders and open the garden gate.","width":13,"height":13,"cells":[{"terrain":"wall","terrainArt":{"id":"garden-wall-moss","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-wall-moss","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-gate-closed","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-wall-moss","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-wall-moss","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge-pink","rotation":0}},{"terrain":"land","node":{"element":"fire","role":"source"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-flower-ground-2","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-lantern-gold","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-flower-ground-2","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-moss-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-moss-stone","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-flower-ground-2","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-lantern-gold","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-flower-ground-2","rotation":0}},{"terrain":"land","node":{"element":"water","role":"source"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-pink","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge-pink","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-grass","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","node":{"element":"water","role":"destination"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-grass","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-yellow","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-pink","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-butterfly-statue","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-fountain-state-idle","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-power-engine","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-fountain-state-idle","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-grass","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-yellow","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-purple","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-flower-ground","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-gear-large","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-gear-cluster","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-gear-mechanism","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-grass","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-white","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-purple","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-sun-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","node":{"element":"fire","role":"destination"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-heart-dormant-1","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-heart-dormant-2","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-heart-dormant-3","rotation":0}},{"terrain":"land","node":{"element":"wind","role":"destination"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-circle","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-white","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-windmill-state-idle","rotation":0}},{"terrain":"land","node":{"element":"electricity","role":"source"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flower-green-closed","rotation":0}},{"terrain":"water","terrainArt":{"id":"garden-water-straight","rotation":0}},{"terrain":"water","terrainArt":{"id":"garden-pond","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-heart-dormant-4","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-heart-dormant-5","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-heart-dormant-6","rotation":0}},{"terrain":"water","terrainArt":{"id":"garden-pond","rotation":0}},{"terrain":"water","terrainArt":{"id":"garden-water-straight","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flower-purple-closed","rotation":0}},{"terrain":"land","node":{"element":"wind","role":"source"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flower-gold-idle","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-mixed","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-sun-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","node":{"element":"electricity","role":"destination"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-heart-dormant-7","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-heart-dormant-8","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-heart-dormant-9","rotation":0}},{"terrain":"land","node":{"element":"arcane","role":"destination"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-circle","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-purple","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-mixed","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-grass","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"water","terrainArt":{"id":"garden-water-vertical","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-flower-ground","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-purple","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-mixed","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-flower-ground-2","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-telescope","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-fountain-state-idle","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"water","terrainArt":{"id":"garden-water-vertical","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-crystal-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-fountain-state-idle","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-armillary","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-grass","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-purple","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-blue","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-flower-ground","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flower-blue-closed","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","node":{"element":"nature","role":"destination"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-grass","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-white","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-blue","rotation":0}},{"terrain":"land","node":{"element":"nature","role":"source"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-blue","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-garden-bench","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-blue","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-blue","rotation":0}},{"terrain":"land","terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-white","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-white","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-workbench","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-white","rotation":0}},{"terrain":"land","node":{"element":"arcane","role":"source"},"terrainArt":{"id":"garden-stone-floor","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-flowers-white","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-wall-moss","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge-straight","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge-straight","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge-straight","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge-straight","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-wall-stone","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-garden-arch","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-wall-stone","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge-straight","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge-straight","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge-straight","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-hedge-straight","rotation":0}},{"terrain":"wall","terrainArt":{"id":"garden-wall-moss","rotation":0}}],"constraints":{"wind":{"requireComponents":["bridge"]},"nature":{"forbidComponents":["bridge"]}},"inventory":{"bridge":1,"metalSpan":0,"intersection":0,"tunnel":0,"portal":0,"junction":0,"sorter":0,"converter":0,"gate":0,"checkpoint":0,"remover":0,"booster":0,"confluence":0,"phasePlate":0},"rulesVersion":4,"nodeAppearance":"garden","artPalette":12,"toolArt":{"bridge":{"id":"bridge-stone-footbridge-horizontal","rotation":0}}},layout:1};
 function motion(tile,item){
  const effect=item?.effect??null;
  const prior=tile.dataset.gardenEffect??null;
  if(!effect){delete tile.dataset.gardenEffect;tile.querySelector('.garden-motion')?.remove();return;}
  tile.dataset.gardenEffect=effect;
  let layer=tile.querySelector('.garden-motion');
  if(layer&&prior===effect)return;
  layer?.remove();
  layer=tile.ownerDocument.createElement('span');layer.className='garden-motion';layer.setAttribute('aria-hidden','true');
  const id=item.spec?.id??'';
  const type=effect==='electricity'?(id.includes('engine')?'engine':'gear'):effect==='complete'?(id.includes('gate')?'gate':'heart'):effect;
  layer.dataset.motion=type;
  const counts={fire:3,water:7,nature:5,engine:4,gear:1,wind:4,arcane:3,gate:5,heart:4};
  for(let i=0;i<counts[type];i++){
   const p=tile.ownerDocument.createElement('i');
   p.style.setProperty('--n',String(i));
   p.style.setProperty('--x',String((i*37+23)%73+13)+'%');
   p.style.setProperty('--delay',(-i*.27)+'s');
   layer.append(p);
  }
  tile.append(layer);
 }
 const art={
  "garden-1": "../art/story/garden-1.webp",
  "garden-2": "../art/story/garden-2.webp",
  "garden-3": "../art/story/garden-3.webp",
  "garden-4": "../art/story/garden-4.webp",
  "garden-5": "../art/story/garden-5.webp",
  "garden-6": "../art/story/garden-6.webp",
  "garden-7": "../art/story/garden-7.webp",
  "garden-8": "../art/story/garden-8.webp",
  "garden-9": "../art/story/garden-9.webp",
  "garden-10": "../art/story/garden-10.webp"
};
 const portraits={
  "Jeeah": "../art/story/garden-jeeah-portrait.webp",
  "Eldrin": "../art/story/garden-eldrin-portrait.webp",
  "Tessa": "../art/story/garden-tessa-portrait.webp"
};
 const scenes=[
  {
    "scene": 1,
    "caption": "The Hidden Garden",
    "art": "garden-1",
    "effect": "petals",
    "dialogue": [
      {
        "speaker": "Narrator",
        "line": "Beyond the Celestial Confluence, a forgotten path led into a garden of brass and stone."
      },
      {
        "speaker": "Jeeah",
        "line": "Look, Eldrin. Someone built an entire garden around that crystal."
      },
      {
        "speaker": "Eldrin",
        "line": "Remarkable. Its mechanisms have been silent for a very long time."
      }
    ]
  },
  {
    "scene": 2,
    "caption": "The Unexpected Explosion",
    "art": "garden-2",
    "effect": "sparks",
    "dialogue": [
      {
        "speaker": "Narrator",
        "line": "A sudden crackle interrupted the silence."
      },
      {
        "speaker": "Tessa",
        "line": "Oh! That was supposed to happen. Well… most of it."
      },
      {
        "speaker": "Eldrin",
        "line": "An unconventional greeting, I must say."
      },
      {
        "speaker": "Jeeah",
        "line": "Are you all right?"
      }
    ]
  },
  {
    "scene": 3,
    "caption": "Meeting Tessa",
    "art": "garden-3",
    "effect": "petals",
    "dialogue": [
      {
        "speaker": "Tessa",
        "line": "Perfectly fine! I'm Tessa, wandering inventor. And this little troublemaker is Pip."
      },
      {
        "speaker": "Jeeah",
        "line": "I'm Jeeah. This is Eldrin. We've been restoring the elemental currents."
      },
      {
        "speaker": "Tessa",
        "line": "Then you two are exactly who I've been looking for!"
      }
    ]
  },
  {
    "scene": 4,
    "caption": "The Friendly Challenge",
    "art": "garden-4",
    "effect": "motes",
    "dialogue": [
      {
        "speaker": "Tessa",
        "line": "I've mapped the garden, but I can't get its six currents to work together. Care to try?"
      },
      {
        "speaker": "Eldrin",
        "line": "The inscriptions suggest each mechanism responds to a different element."
      },
      {
        "speaker": "Jeeah",
        "line": "Let's see what we can do together."
      }
    ]
  },
  {
    "scene": 5,
    "caption": "The Forgotten Mechanism",
    "art": "garden-5",
    "effect": "motes",
    "dialogue": [
      {
        "speaker": "Eldrin",
        "line": "The Heart of Wonders will awaken only when every current reaches its inlet."
      },
      {
        "speaker": "Tessa",
        "line": "Fire, Water, Plant, Electricity, Wind and Arcane. Six deliveries, one garden."
      },
      {
        "speaker": "Jeeah",
        "line": "Then let's bring it back to life."
      }
    ]
  },
  {
    "scene": 6,
    "caption": "The Garden Awakens",
    "art": "garden-6",
    "effect": "gold",
    "dialogue": [
      {
        "speaker": "Narrator",
        "line": "The six currents converged. The Heart of Wonders awakened."
      },
      {
        "speaker": "Tessa",
        "line": "It works! Every single mechanism!"
      },
      {
        "speaker": "Jeeah",
        "line": "It's beautiful."
      },
      {
        "speaker": "Eldrin",
        "line": "A splendid reminder of what can be achieved together."
      }
    ]
  },
  {
    "scene": 7,
    "caption": "Laughter Among Friends",
    "art": "garden-7",
    "effect": "water",
    "dialogue": [
      {
        "speaker": "Narrator",
        "line": "One of the newly awakened fountains had a surprise for Eldrin."
      },
      {
        "speaker": "Eldrin",
        "line": "I believe the fountain is rather enthusiastic."
      },
      {
        "speaker": "Tessa",
        "line": "At least we know the water pressure is excellent!"
      },
      {
        "speaker": "Jeeah",
        "line": "Careful, Pip! You're next."
      }
    ]
  },
  {
    "scene": 8,
    "caption": "An Invitation to Adventure",
    "art": "garden-8",
    "effect": "petals",
    "dialogue": [
      {
        "speaker": "Jeeah",
        "line": "We're heading into the next realm. Would you like to join us?"
      },
      {
        "speaker": "Tessa",
        "line": "More forgotten inventions? More mysteries? Absolutely!"
      },
      {
        "speaker": "Eldrin",
        "line": "I suspect our journey is about to become considerably less quiet."
      }
    ]
  },
  {
    "scene": 9,
    "caption": "The Weaver’s Playground Revealed",
    "art": "garden-9",
    "effect": "motes",
    "dialogue": [
      {
        "speaker": "Narrator",
        "line": "The northern gate opened onto a realm of floating paths and impossible bridges."
      },
      {
        "speaker": "Tessa",
        "line": "Look at those structures! Pip, wait for us!"
      },
      {
        "speaker": "Jeeah",
        "line": "The next current is waiting."
      }
    ]
  },
  {
    "scene": 10,
    "caption": "A Journey Shared",
    "art": "garden-10",
    "effect": "gold",
    "dialogue": [
      {
        "speaker": "Narrator",
        "line": "Three companions and one little inventor's creation set out together."
      },
      {
        "speaker": "Eldrin",
        "line": "There is much yet to discover."
      },
      {
        "speaker": "Jeeah",
        "line": "And we'll discover it together."
      }
    ]
  }
];
 const panels=type=>scenes.filter(s=>type==='opening'?s.scene<=5:s.scene>5).flatMap(s=>s.dialogue.map((d,i)=>({...d,caption:s.caption,art:s.art,effect:s.effect,motion:'garden',duration:4500,voiceId:'garden-'+s.scene+'-'+(i+1)})));
 const api={art,portraits,scenes,panels,elements,isGarden,group,delivered,view,motion,level};
 root.EFGarden=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
