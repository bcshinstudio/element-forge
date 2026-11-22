# Harmony campaign

Open the standalone HTML in a browser and use **Start Campaign** or
**Continue**. Use **Stage Select** to revisit unlocked boards. Campaign and
Challenges keep separate resume slots in the same browser. Use the game
title to return to the mode menu. A reload after restoring harmony continues
to the next unlocked stage. **Start New Campaign** asks before resetting
campaign progress and leaves the Challenge slot available.

The map editor defaults to a 12 × 12 Rules 3 map. Open **Verified challenge
packs**, select a tier and seed, and choose **Generate challenge batch**.
You can open and play a verified stage, export the exact stage or pack, or
review counterfactual evidence. Unfilled slots are reported. The legacy
generator remains available for existing editor workflows. The game can play
the curated pack offline or import an exported pack from **Challenge stages**.
The generator's provisional tiers describe routing evidence. They need
human calibration.

Build the standalone game with `python game/build.py Element_Forge_Harmony.html`.
Regenerate the built-in campaign challenge pack and verification evidence with
`node game/challenge-release.js output`. Run
`node game/challenge-sweep.js 8` for the validation sweep.

## Terrain defaults

Rules 1 and 2 retain their original behavior. Rules 3 models marked banks as
land that is orthogonally adjacent to a river tile. Only Water can enter and
leave a river without a span, and only via those banks. Ordinary land, banks,
and the non-opposing channel types are generally passable. Deep water without
a river marker requires a span. Fire cannot cross deep water with any span.
A lightweight bridge or metal span supports eligible currents on water,
river, or shallow water. Only a metal span conducts Electricity, and Earth
and Metal reject lightweight bridges. A span on a river does not waive
Water's bank requirement. Ice can use shallow water unaided. Freezing is a
property of its route, with no persistent terrain conversion. Lava, woods,
scree, heated ground, and abrasive ground each have the restrictions taught
in the game. Terrain restrictions still apply at link openings, and links
do not let Plant use portals or Wind use tunnels.

## Scoring and validation

The base is the total number of board cells, including on legacy boards.
Subtract twice the number of unique final route tiles, including endpoints.
Add ten times the unspent construction budget based on tools actually
placed. Fixed-inventory levels receive a zero budget bonus. Clamp the result
at zero. A legal clear advances the campaign at any score. Replays update
the best score and the total reflects only the sum of stage bests.

Campaign v1 progress migrates by stable level ID. An incompatible saved board
can restart without losing unlocks or scores. Completion writes the board
and score together before animation. Saves are local to the browser.

For a blind phone playtest, ask players to resume a partially drawn route,
try Scarce Crossing without hints, and replay a clear to improve the score.
Record first solve time, routing errors and plan changes, and whether the
restoration feels rewarding. Check reachability of controls on a physical
phone and confirm that reduced motion still gives clear feedback.
