# Chapter One rebuild

Stages 1–3 keep their introductory layouts. The nine later slots retain their original progression identifiers and use layout revision 2. Unlocks, tutorial settings, and the saved challenge pack carry forward. Prior best scores remain recorded under revision 1 and do not count toward the revised layout totals. Continuing an unfinished revised stage starts that board over with a notice.

| Stage | Replacement | Routing decision |
| --- | --- | --- |
| 4 | Crosswind Commons | Leave Plant a route while giving Fire access to the shared crossing. |
| 5 | Canopy Gate | Reserve a path to Plant’s checkpoint when Water can get there first. |
| 6 | Floodplain Crossing | Spend one bridge where it preserves a complete network. |
| 7 | Scree Commons | Use Earth’s scree access while preserving routes around Plant’s checkpoint. |
| 8 | Three-Way Pass | Position one intersection where it can serve competing routes. |
| 9 | Valley Checkpoint | Weigh a bridge against an intersection before committing to a checkpoint approach. |
| 10 | Wellspring Basin | Preserve a crossing for the other currents when Water has a viable route of its own. |
| 11 | Kiln Commons | Allocate one construction tool across a wider board with a checkpoint. |
| 12 | Grove Overlook | Plan the checkpoint approach and shared Water route as one problem. |

The bundled pack and six-board playtest export use new candidates. Kiln Junction was identified as a corridor and removed from both the late campaign slot and bundled pack. The old Grove Crossing 1 passes structural difficulty heuristics, which do not establish a human difficulty rating. Its original pack remains loadable for saves and browser regression, and the replacement pack uses separately tested boards.

The reproducible regression evidence is in `game/tests/fixtures/rebuild-decisions.json`. For each new board the tests replay an actual winning route in the game session, then check that the documented complete solo route or fixed construction choice blocks solving the whole board. Generator difficulty ratings are provisional. Physical-device checks and first-play solve times remain human playtest tasks.
