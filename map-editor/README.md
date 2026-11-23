# Wellspring Map Editor

Open `index.html` in a browser or serve the directory with `python -m http.server`. Use the editor to paint terrain, place endpoints and fixed components, edit inventory and restrictions, and enter Playtest to build and check routes.

## v1.8 · Interior choices

The **Crossing: interior choices** preset generates an interior mountain and two bypasses. It verifies both sides of the obstacle with a bridge shortcut and with a dry route. The editor displays the number of verified choices and ranges for track, turns, and cost. These measurements describe sampled solutions. Human difficulty and globally optimal cost require separate evaluation. Existing presets remain available with their original seeded layouts.

## v1.9 · Editing and JSON interchange

**Export JSON** and **Copy map JSON** preserve editable draft maps, including incomplete layouts. **Import JSON** accepts map schemas 1 and 2 and upgrades v1 links to schema 2, assigning legacy links without an ID to group A. A successful import can be undone. Invalid input leaves the current map in place. Structure validation checks endpoint counts, paired links, and tunnel alignment and intervening terrain. Exit Playtest to edit the board.

## v2.0 · Game level format

**Export verified level** checks the playable rules and runs the bounded construction solver. It exports only after the shared route checker accepts the solution. A solver budget limit or an unsupported component can block export. Keep using the draft JSON controls when a map is in progress.

A `.level.json` file contains these required fields.

| Field | Value |
| --- | --- |
| `format` | `element-forge-level` |
| `schemaVersion` | `1` |
| `rulesVersion` | `1` |
| `map` | The complete `element-forge-map` schema 2 object |

The nested map contains dimensions, row-major cells, inventory, element restrictions, name, and description. Indices are zero-based. The current rules support up to eight traditional element pairs (or sixteen route segments in multi-chamber prototype maps) and board dimensions from 4 to 24. The official board standard is 12 × 12. Fixed components supported by this rules version are bridges, intersections, portals, tunnels, gates, and checkpoints. Players can place bridges, intersections, portals and tunnel ends. Solution routes and placements are omitted from the file.

A future game client can call `EFMap.readLevel(document)` or import `readLevel` from `map-format.js`. It checks the package versions and playable structure and returns the normalized map. Call `createLevel(map)` to independently verify solvability before distributing a third-party map. The editor also accepts level files through **Import JSON**.

## Tests

- `npm test` runs the full Node suite and legacy regression scripts.
- `npm run check` checks JavaScript syntax.
- `python tests/browser_smoke.py` runs Playwright Chromium coverage. Install Playwright and its Chromium build first, or set `CHROMIUM_EXECUTABLE` to an installed Chromium path.


## Chapter 9 prototype: Flexible Confluence Chamber

A **Confluence Chamber** is one fixed, directional cell that accepts two
different input elements and creates one distinct output element. Players must
connect all three routes. It is not a construction tool; place it in the map
editor. The shared engine supports **multiple chambers per map**, including
sequential reactions and several independent routes of the same element.
It does not add Chapter 9 to the released campaign.

### Built-in recipes

| Input 1 | Input 2 | Output |
| --- | --- | --- |
| Water | Earth | Plant |
| Fire | Earth | Metal |
| Fire | Water | Wind (the in-game equivalent of steam) |
| Water | Wind | Ice |
| Light | Shadow | Electricity |

The **Custom: choose elements** option lets the map designer choose any two
different existing elements as inputs and a third different element as the
output. Custom combinations are map rules, not real chemistry, and they
do **not** introduce any additional element types.

### Build a Confluence map

1. Under **Tools & Fixtures**, select **Confluence Chamber**.
2. Under **Paint settings**, select a **Reaction recipe**, or **Custom** and
   three distinct elements. Set the **Output direction**. Paint the fixture on
   Land. You may place multiple chambers, each with its own recipe and direction.
3. For a single chamber, place one **Source for each input element** and one
   **Destination for its output**. The chamber itself provides the input
   Destinations and output Source. With several chambers, you may connect one
   chamber's output directly to a later chamber's matching input (a chain).
   Every route must have exactly one source and one destination.
   If two chambers both consume Fire, provide **two independent Fire sources**
   (or one additional chamber producing Fire); one Source cannot split into
   two routes in this version.
4. The first input approaches from the counterclockwise side relative to
   the output direction, the second input from the clockwise side.
   With output **East**, input 1 is **North**, input 2 **South**, and output
   **East**. The port letters and colors display the selected elements.
5. You may also select a placed chamber to change its recipe, its custom
   elements, or direction in the **Selected cell** inspector. If you change
   a recipe, also update the Sources and Destination to match.
6. Use **Check Map**, **Enter playtest**, and **Export verified level**.
   Output routes can be planned before their inputs, but every chamber must
   ultimately receive two powered inputs. A circular reaction chain with no
   external source cannot activate. The verifier checks matching source/target
   counts, port direction, overlaps, and upstream dependencies.

### Importable examples

- `examples/confluence-root-chamber.map.json` — Water + Earth → Plant
- `examples/confluence-fire-earth-metal.map.json`
- `examples/confluence-fire-water-wind.map.json`
- `examples/confluence-water-wind-ice.map.json`
- `examples/confluence-light-shadow-electricity.map.json`
- `examples/confluence-custom.map.json` — example custom: Ice + Metal → Arcane
- `examples/multi-confluence-twin-chambers.map.json` — two independent chambers
- `examples/multi-confluence-repeated-input.map.json` — two Fire sources
- `examples/multi-confluence-cascade.map.json` — three chained chambers

Each multi-chamber sample also has a matching `.level.json` game import.
The multi-chamber solver is bounded and supports up to **16 route segments**;
a search-limit result is *inconclusive*, not proof that a puzzle is impossible.

Maps saved by the previous single-recipe prototype remain compatible:
a Confluence cell with no `props.recipe` defaults to Water + Earth → Plant.
New maps keep their preset ID or explicit custom inputs/output in the
same version-2 map schema. The game, map editor, and solver share one
reaction definition and reject invalid custom combinations.

## Chapter 10 prototype: Shifting Phases (Day / Night)

**This feature is opt-in** and does not change any Chapters 1–9 maps or rules.
It adds a single event-driven change (Day → Night), not an internal clock.

### Build in the Map Editor

1. Under **Chapter 10 · Shifting Phases**, enable **Day/Night puzzle**. The first prototype sets construction inventory to zero.
2. Paint Exposed (☀) or Covered (☾) terrain, then choose **Mark shifting channel ↔** and click each tile that should reverse when Night begins.
3. Select the triggering element (typically Light) in **Element**, then place one **Day/Night Pressure Plate** on Land.
4. Add Sources and Destinations; the triggering route must pass the plate and reach its Destination.
5. Use **Preview board** to inspect Day and Night. This does not modify map data.
6. **Check Map**, **Enter playtest**, and **Export verified level** to validate the route order.

### Delivery rules

- Initial phase: **Day**. No automatic timer; only a completed designated delivery activates Night.
- Completed Day deliveries remain valid even when old route terrain changes at Night.
- Completed routes still occupy their tiles; no corridor reuse.
- Undo restores the previous delivery and phase; Restart returns to Day; saves remember the phase of each delivery.
- Map settings use `phaseRules: {"initial":"day"}`, marked tiles use `props.phaseShift: true`, and the plate uses `component: "phasePlate", props: {"element":"light"}`.
- Existing maps without phase metadata are unchanged.

### Prototype scope

Supports two to four routes, one fixed pressure plate and a single Day→Night transition.
Combining phases with Confluence Chambers, player construction, multiple plates, tides,
automatic clocks or Night→Day transitions is reserved for later playtesting.
Solver search limit means **inconclusive**, not proof that a puzzle is impossible.

Editable sample: `examples/phase-first-nightfall.map.json` with corresponding
`.level.json` and `.solution.json` fixtures.
