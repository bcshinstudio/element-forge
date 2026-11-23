# Chapter 9 — Verified Design Changes

Source: the user-provided **The Confluence Forges** blueprint for Stages 97–108.
The 12 original stage plans are preserved in `../ch9-source-blueprints.json`.
`design-audit.json` logs initial coordinate/terrain normalization.
This supplement records further gameplay corrections made while proving the
routes with `EFEngine.checkAll` and `EFSession.createSession`.

The source's phrase *verified solution* is **not** proof of compatibility with
the current engine: the coordinates and route narratives conflict in places.
No underlying gameplay permission was weakened to make a map pass.

| Stage | Necessary changes relative to the supplied blueprint |
|---|---|
| 97 — Alchemical Primer | Relocated Water S2 to clear the Wind jump landing. Corrected the Wind landing and Plant Bridge water tile; preserved both reaction chambers, two Gates, and two Checkpoints. |
| 98 — Root-Soil Synthesis | Moved Metal Source away from the Tunnel opening; changed Tunnel endpoints to Land as required by construction rules. Preserved the three Checkpoints and three Gates. |
| 99 — Smelting Crucible | Replaced the proposed incompatible Metal-on-Bridge crossing with a **Metal Span** on a separate water tile. Put the Intersection on adjacent dry ground; adjusted Wind around its Gate. |
| 100 — Gale-Steam Condenser | Kept the source-to-chamber routes, paired Shadow Portal, and Wind Void jump with validated positions. |
| 101 — Permafrost Cascade | Electricity cannot enter Water, even with a Bridge. Moved the Bridge to Plant's water crossing and kept the Electricity/Ice Intersection dry. |
| 102 — Twin-Chamber Foundry | Adjusted chamber input directions to actual approach sides and ensured the Tunnel openings were on Land. Metal and Ice cross at a valid Intersection. |
| 103 — Lightning Prism | Replaced the incompatible Electricity-over-Water Bridge with a dry Intersection; moved Shadow's Checkpoint to avoid Wind's jump landing. Adjusted Light around the unrelated directional Gate. |
| 104 — Living Alloy | Corrected Fire/Earth inlet assignments; kept distinct Earth Sources, moved necessary Tunnel mouths to Land and preserved Portal, Tunnel, and perpendicular Intersection. |
| 105 — Cascade Chain-Reaction | Preserved the full Fire + Water → Wind → Ice cascade, the parallel Plant chamber, and the intended Bridge/Intersection crossing. Routed Fire around the directional Gate. |
| 106 — Six-Stream Reactor | Relocated a Shadow Checkpoint to prevent collision with the Metal route. Verified Bridge, Tunnel, Portal pair, and dry Intersection together. |
| 107 — Octa-Confluence Core | Relocated second Water Source and its Checkpoint to separate crossing lanes; shifted Shadow Portal exit and Gate to an open approach; made Light use the Bridge and retained two genuine Intersections. |
| 108 — Grand Philosopher's Engine | Reworked a directional Gate and final crossing positions; the final route now uses two genuine perpendicular Intersections, a Portal pair and a Plant Bridge. The available Tunnel is optional and is not used in the validated witness. |

## Validation and limits

- Every saved `stage-97..108.solution.json` was checked by the shared route
  engine with its exact placements and then completed using the interactive
  game-session API. The corresponding `.level.json` files were imported
  through the map-format reader.
- The separate Node/browser regression suite is the final check for UI,
  save/progress compatibility, campaign navigation, offline packaging, and
  previous chapter behavior. Do not mark these tests PASS until CI confirms it.
- A bounded solver reaching its search limit reports **inconclusive**,
  not unsolvable. This is especially relevant for larger, construction-heavy
  stages. Verified witness routes are retained so design review does not
  depend solely on expensive open-ended searches.
- Custom three-port directions are encoded in `props.ports`; old Confluence
  maps without `props.ports` retain their prior behavior.
- No changes were made to the released Chapters 1–8 level files or IDs.
