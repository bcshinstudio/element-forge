# Chapter Four · The Astral Loom

Beyond the Primeval Crucible, five elemental currents weave the seasons, storms, and tides. The Conduit Weaver restores the Loom's shuttles and finally the Grand Weaver Core.

Stages 37–48 each have five pairs on a 12×12 board. The supplied endpoints, tool budgets, and counts of gates and checkpoints carry through to the release. Every checkpoint and every supplied tool is used in the recorded clears. Some gates can be bypassed. The suggested difficulty progression remains a playtest target.

| Stage | Adjustments to the supplied draft and verified tool use |
| --- | --- |
| 37 · The Five-Thread Shuttle | Plant uses the bridge at row 7, column 2. Metal takes the dry lower perimeter, and Fire crosses the upper dry opening. |
| 38 · Starlight Bobbin | Earth uses the tunnel. The two mouths are on buildable ground beside the ridge. |
| 39 · Conductive Spool | Metal and Electricity cross on the dry intersection. |
| 40 · Tidal Spindle | Ice takes the bridge at (6,7). The southbound gate moves one row down. Electricity stays dry, and Wind and Earth share the intersection. |
| 41 · The Amber Warping-Frame | Shadow takes the portal into the covered vault. |
| 42 · Gale-Shuttle Causeway | Metal takes the tunnel through the bulkhead. Ice bridges one deep-water tile at (11,9); Earth takes a dry detour. |
| 43 · Prism-Thread Gallery | Shadow takes the portal. Fire and Electricity share the dry intersection. |
| 44 · The Slag-Weave Manifold | Wind bridges (7,9) and crosses Water on the separate dry intersection at (7,8). Metal uses the tunnel. |
| 45 · Umbral Counterweight | Plant bridges the water, Shadow takes the portal, and Light and Electricity cross. One wall opens for the lower approach. |
| 46 · Chrono-Spindle Bastion | Earth and Water cross on a dry tile. Metal tunnels and Shadow uses the portal. |
| 47 · The Gordian Loom | Plant takes the bridge at (6,2). Electricity crosses Water on a dry intersection at (6,7). Light uses the portal. |
| 48 · The Grand Weaver Core | Wind bridges (9,10) separately from the dry intersection at (9,8), Metal tunnels, and Shadow uses the portal. The final gate layout uses the draft's alternate gate at (11,11). |

The exact coordinates are in `astral-loom.js`. The construction placements and winning routes are in `tests/fixtures/astral-loom-solutions.json`. The campaign regression replays all twelve boards through the game session and checks save progression, dimensions, pair counts, and inventories.
