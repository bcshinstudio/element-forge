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

The nested map contains dimensions, row-major cells, inventory, element restrictions, name, and description. Indices are zero-based. The current rules support up to eight element pairs and board dimensions from 4 to 24. The official board standard is 12 × 12. Fixed components supported by this rules version are bridges, intersections, portals, tunnels, gates, and checkpoints. Players can place bridges, intersections, portals and tunnel ends. Solution routes and placements are omitted from the file.

A future game client can call `EFMap.readLevel(document)` or import `readLevel` from `map-format.js`. It checks the package versions and playable structure and returns the normalized map. Call `createLevel(map)` to independently verify solvability before distributing a third-party map. The editor also accepts level files through **Import JSON**.

## Tests

- `npm test` runs the full Node suite and legacy regression scripts.
- `npm run check` checks JavaScript syntax.
- `python tests/browser_smoke.py` runs Playwright Chromium coverage. Install Playwright and its Chromium build first, or set `CHROMIUM_EXECUTABLE` to an installed Chromium path.


## Chapter 9 prototype: Flexible Confluence Chamber

A **Confluence Chamber** is one fixed, directional cell that accepts two
different input elements and creates one distinct output element. Players must
connect all three routes. It is not a construction tool; place it in the map
editor. The current shared engine supports **one chamber per map**, and does
not add Chapter 9 to the released campaign.

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
   Land. One fixture is supported per map.
3. Place **one Source for each input element** and **one Destination for the
   output element**. Do **not** place input destinations or an output source:
   the chamber is the inputs' destination and the output's source.
4. The first input approaches from the counterclockwise side relative to
   the output direction, the second input from the clockwise side.
   With output **East**, input 1 is **North**, input 2 **South**, and output
   **East**. The port letters and colors display the selected elements.
5. You may also select a placed chamber to change its recipe, its custom
   elements, or direction in the **Selected cell** inspector. If you change
   a recipe, also update the Sources and Destination to match.
6. Use **Check Map**, **Enter playtest**, and **Export verified level**.
   The output route can be planned first, but harmony requires both inputs.

### Importable examples

- `examples/confluence-root-chamber.map.json` — Water + Earth → Plant
- `examples/confluence-fire-earth-metal.map.json`
- `examples/confluence-fire-water-wind.map.json`
- `examples/confluence-water-wind-ice.map.json`
- `examples/confluence-light-shadow-electricity.map.json`
- `examples/confluence-custom.map.json` — example custom: Ice + Metal → Arcane

Maps saved by the previous single-recipe prototype remain compatible:
a Confluence cell with no `props.recipe` defaults to Water + Earth → Plant.
New maps keep their preset ID or explicit custom inputs/output in the
same version-2 map schema. The game, map editor, and solver share one
reaction definition and reject invalid custom combinations.
