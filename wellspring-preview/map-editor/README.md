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
