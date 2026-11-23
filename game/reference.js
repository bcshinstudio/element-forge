'use strict';
(function(root){
 const elements={
  fire:['Flows through lava.','Water blocks it, even with a span.'],
  water:['Flows through water, deep rivers and shallows without a tool.','Enter or leave a deep river through an adjacent tile.'],
  nature:['Plant is the only current that can travel through forest.','Portals block Plant. Use a span to cross water.'],
  electricity:['Routes across dry ground.','Water blocks it, even with a metal span.'],
  arcane:['Routes across ordinary ground and can use spans across water.','Has no special terrain permissions.'],
  wind:['Jumps one void tile in a straight line between open landing tiles.','Tunnels and forest block it. Use a span across water.'],
  earth:['The only current that can cross loose scree.','Ordinary bridges block it. Use a metal span across water.'],
  ice:['Crosses shallows without a span.','Heated ground blocks it. Deep water needs a span.'],
  metal:['Crosses heated and abrasive ground.','Ordinary bridges block it. Use a metal span across water.'],
  light:['Travels through exposed channels.','Covered channels block it. Use a span across water.'],
  shadow:['Travels through covered channels.','Exposed channels block it. Use a span across water.']
 };
 const tools={
  bridge:['Carries compatible currents over water.','Tap an empty water, river or shallow tile to place it. Tap again to remove it. Fire, Electricity, Earth and Metal cannot use it.'],
  metalSpan:['Carries Earth, Metal and other compatible currents over water.','Select Metal span and tap an empty water, river or shallow tile. Fire and Electricity still cannot cross.'],
  intersection:['Lets two currents cross on the same tile.','Select Intersection and tap open ground. Each route must go straight through at right angles to the other.'],
  tunnel:['Carries a current through a ridge. Wind cannot use it.','Select Tunnel and tap two open tiles in the same row or column with only wall or mountain between them. Removing one end removes the pair.'],
  portal:['Carries a current directly to its paired exit. Plant cannot use it.','Select Portal and tap two open ground tiles. Continue from the paired exit. Removing one end removes the pair.'],
  gate:['Passes currents in the direction of its arrow.','Enter and leave in the marked direction. Permanently built into the board.'],
  checkpoint:['Marks a required waypoint for its assigned current.','Route through it before reaching the inlet. A checkpoint marked for any element must be visited by each route. Built into the board.'],
  confluence:['Merges any two selected input currents into a third output current.','Choose one of five preset recipes or configure three distinct elements in the Map Editor. The two inputs end at their marked ports; the output begins at the chamber. All three routes must be complete. This is a fixed map fixture.']
 };
 const reserved=['junction','sorter','converter','remover','booster'];
 const notes={
  'sleeping-valley-01':[['New on this stage','F crosses lava ♨. P crosses forest ♣.']],
  'sleeping-valley-02':[['New on this stage','V leaps one void ◼. R needs a tunnel ◉ through the ridge.'],['Watch for','Two straight routes can cross at ╋.']],
  'sleeping-valley-03':[['New on this stage','L uses sunlit ☀ channels. H uses covered ☾ channels.'],['Watch for','E stays dry. Follow gate arrows and visit matching flags ⚑.']],
  'sleeping-valley-04':[['New on this stage','R takes loose scree ⋰. M crosses heated and abrasive ground.'],['Watch for','Use the paired portal ◎ with a current other than P.']],
  'sleeping-valley-05':[['New on this stage','I crosses shallows ≋. Keep E on dry ground.']],
  'sleeping-valley-07':[['Watch for','V leaps the gap ◼. Reserve the tunnel ◉ for a ground current.']],
  'sleeping-valley-09':[['Watch for','R and M cannot use the bridge ═. Look for another crossing.']],
  'sleeping-valley-10':[['Watch for','The portal ◎ can link separate channels for L or H. P cannot use it.']],
  'sleeping-valley-11':[['Watch for','I can cross shallows ≋. E stays dry and M handles heated ground.']],
  'gatekeepers-13':[['Watch for','Read the gate arrows before lining up straight approaches to ╋.']],
  'gatekeepers-24':[['Watch for','Reserve a tunnel ◉ for a ground current. V jumps the rift.']],
  'primeval-crucible-25':[['Watch for','Use the forest for P and leave V a clear landing beyond the rift.']],
  'astral-loom-47':[['Watch for','Use different crossings for W and E. E needs a dry route.']],
  'celestial-confluence-52':[['Watch for','P can use the tunnel ◉. Leave the portal ◎ for another current.']],
  'weavers-playground-63':[['Watch for','Plan both ends of each portal ◎ around the gate arrows and flags ⚑.']],
  'weavers-playground-70':[['Watch for','Trace the gate arrows around the perimeter before choosing an approach.']],
  'shattered-abyss-84':[['Watch for','Line up straight approaches to both intersections ╋ before routing across them.']],
  'world-heart-sanctuary-96':[['Watch for','Keep the ☀ and ☾ channels clear for L and H while lining up ╋ crossings.']]
 };
 function story(description=''){
  const sentences=description.trim().split(/(?<=[.!?])\s+/);
  const instructions=sentences.findIndex(sentence=>/^(?:guide|route|connect|deliver|reconnect|restore|unite|reunite|braid|spiral|launch|untangle)\b/i.test(sentence));
  return sentences.slice(0,instructions===-1?2:Math.min(instructions,2)).join(' ')||sentences[0];
 }
 const api={elements,tools,reserved,notes,story};
 root.EFReference=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
