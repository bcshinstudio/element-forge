'use strict';
(function(root){
 const map={
 "format": "element-forge-map",
 "schemaVersion": 2,
 "name": "The Archive of First Currents",
 "description": "Deep within an ancient library lies a forgotten collection of elemental knowledge. Reconnect the eleven elemental tomes to awaken the Living Index and uncover the secrets of the World-Engines.",
 "width": 12,
 "height": 12,
 "cells": [
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-archway",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-archway",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-ladder",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "fire",
    "role": "source"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "water",
    "role": "source"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "fire",
    "role": "destination"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "water",
    "role": "destination"
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-lantern",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "nature",
    "role": "source"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "electricity",
    "role": "source"
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-lantern",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-armillary",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "nature",
    "role": "destination"
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-reading-desk",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-reading-desk",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "electricity",
    "role": "destination"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-book-cart",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-catalog-cabinet",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "arcane",
    "role": "source"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "arcane",
    "role": "destination"
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-living-index",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-map-table",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "wind",
    "role": "destination"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "wind",
    "role": "source"
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-catalog-cabinet",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-catalog-cabinet",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "earth",
    "role": "source"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "earth",
    "role": "destination"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "ice",
    "role": "destination"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "ice",
    "role": "source"
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-catalog-cabinet",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-reading-chair",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "metal",
    "role": "destination"
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-reading-desk",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-reading-desk",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "light",
    "role": "destination"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-reading-chair",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-lantern",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "metal",
    "role": "source"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "light",
    "role": "source"
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-lantern",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "shadow",
    "role": "source"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-stone-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "land",
   "node": {
    "element": "shadow",
    "role": "destination"
   }
  },
  {
   "terrain": "land",
   "terrainArt": {
    "id": "library-mosaic-floor",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-ladder",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-sealed-gate",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-sealed-gate",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-bookshelf",
    "rotation": 0
   }
  },
  {
   "terrain": "wall",
   "terrainArt": {
    "id": "library-stone-wall",
    "rotation": 0
   }
  }
 ],
 "constraints": {},
 "inventory": {
  "bridge": 1,
  "metalSpan": 0,
  "intersection": 1,
  "tunnel": 0,
  "portal": 0,
  "junction": 0,
  "sorter": 0,
  "converter": 0,
  "gate": 0,
  "checkpoint": 0,
  "remover": 0,
  "booster": 0,
  "confluence": 0,
  "phasePlate": 0
 },
 "rulesVersion": 4,
 "nodeAppearance": "library"
};
 const level={id:'archive-first-currents',format:'element-forge-level',schemaVersion:1,rulesVersion:4,map,layout:1};
 const scenes=[
 ['The Arrival',0,[['Narrator','Beyond the lands of the Primeval Crucible stood a sanctuary untouched by the passage of time.'],['Narrator','Here, the memories of a forgotten world waited patiently to be rediscovered.'],['Jeeah','An ancient library? I wonder what knowledge still remains within these walls.']]],
 ['The Grand Archive',1,[['Narrator','Warm lanterns illuminated shelves of forgotten knowledge.']]],
 ['The Keeper',2,[['Narrator','At a quiet reading desk, the keeper of the archive studied an ancient manuscript.']]],
 ['First Meeting',3,[['Eldrin','Ah, a visitor! It has been quite some time since anyone found their way here.'],['Jeeah',"I hope I’m not disturbing you."],['Eldrin','Not at all. Books are wonderful companions, but they rarely offer much conversation.'],['Eldrin','My name is Eldrin, keeper of this archive. And you are?'],['Jeeah',"I’m Jeeah. I’ve been following the elemental currents, trying to restore what has been lost."],['Eldrin','The elemental currents, you say? Then perhaps your arrival is no coincidence.']]],
 ['The Dormant Archive',4,[['Eldrin','Long ago, the eleven elemental currents flowed through this archive, preserving the knowledge of civilizations that came before us.'],['Jeeah','What happened to them?'],['Eldrin','Their connections were broken. Without those currents, the Living Index fell silent, sealing away much of its knowledge.'],['Jeeah','Perhaps I can restore them.'],['Eldrin','If you can reconnect all eleven tomes, we may finally discover what the archive has been trying to tell us.'],['Jeeah',"Then let’s bring this place back to life."]]],
 ['Restoring the Eleven Currents',null,[]],
 ['The Awakening',5,[['Eldrin','All these years... I wondered whether I would ever see its pages turn again.'],['Jeeah',"It’s beautiful."],['Eldrin','Indeed. Some things are worth waiting a lifetime to witness.']]],
 ['The Revelation',6,[['Eldrin',"Wait... These markings. I’ve seen fragments of them in the oldest manuscripts."],['Jeeah','What do they mean?'],['Eldrin','The Astral Loom. A place where the elemental currents intertwine with the fabric of the heavens.'],['Jeeah','Another World-Engine?'],['Eldrin','Yes. And perhaps more than that. The ancient records suggest that the World-Engines were never meant to function independently.'],['Jeeah',"They’re connected to one another?"],['Eldrin','Precisely. Like threads in a great tapestry. When one begins to unravel, the others cannot remain untouched.'],['Jeeah','Then restoring the currents here was only the beginning.'],['Eldrin','I believe so, my young friend.']]],
 ['A New Companion',7,[['Jeeah',"Thank you, Eldrin. I couldn’t have discovered this without you."],['Eldrin','And I could not have awakened the archive without you.'],['Eldrin','For most of my life, I have studied the world through the pages of books.'],['Jeeah',"Perhaps it’s time to see some of it for yourself."],['Eldrin','At my age? I had nearly convinced myself that my adventures were behind me.'],['Jeeah',"It’s never too late for a new adventure."],['Eldrin','Well then, would you mind the company of an old librarian?'],['Jeeah',"I’d be happy to have you with me."],['Eldrin','Knowledge is a lantern, Jeeah. But someone must still choose where to walk.']]],
 ['Beyond the Archive',8,[['Narrator','The keeper of forgotten knowledge closed a chapter of his life and opened another.']]],
 ['A New Journey',9,[['Narrator','No longer traveling alone, Jeeah continued her journey toward the mysteries that lay beyond the stars.']]],
 ['Chapter IV',null,[]]
];

 const art=["../art/story/archive-1.webp","../art/story/archive-2.webp","../art/story/archive-3.webp","../art/story/archive-4.webp","../art/story/archive-5.webp","../art/story/archive-6.webp","../art/story/archive-7.webp","../art/story/archive-8.webp","../art/story/archive-9.webp","../art/story/archive-10.webp"];
 const panels=part=>scenes.slice(...(part==='opening'?[0,5]:[6,11])).flatMap(([title,i,lines])=>lines.map(([speaker,line])=>({caption:title,speaker,line,art:'archive-'+(i+1),motion:'archive',duration:9000})));
 const api={level,panels,art};root.EFArchive=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
