# Element Forge G1

Open `game/index.html` from a repository checkout or run
`python game/build.py Element_Forge_G1.html` from the repository root to create a
single offline file. No accounts or network connection are required to play.

## Puzzles

| Puzzle | Learn |
| --- | --- |
| Ember Meadow | Route an element around a ridge |
| Brook Bridge | Use a bridge to cross one water tile |
| Stone Pass | Cross two straight routes at an intersection |
| The River Crossing | Plan for both colors before spending the one-bridge budget |

Inspect the full board before entering construction. Tap or drag tiles to draw a
track from a source, or use the arrow keys to move board focus and Enter to
activate a tile. Backtracking removes the last step. Undo cancels an unfinished
track or restores the previous construction action. Restart restores the empty
board with the selected tools. Replan clears the board and returns to tool
selection. Test delivery checks every route and animates a successful network.

## Level format

The game uses shared Map Editor v2.0 rules and accepts exported `.level.json`
packages. Rules version 1 retains the fixed inventory. Rules version 2 uses
the same wrapper and schema 2 map plus a map-level `construction` object:

```json
{"budget": 2, "prices": {"bridge": 2, "intersection": 1}}
```

Inventory remains the maximum available count per tool. Credits are whole
numbers. Each offered tool requires a positive price. A chosen loadout must
fit the budget, and actual placements must fit both the loadout and budget.
Fixed map components are independent of player spend. Rules 2 currently
supports priced bridges and intersections. The editor preserves the budget
when round-tripping level data and honors it in playtest. Define or change
prices in the level data. The game displays track length and actual
construction spend after a successful delivery.

## Verification

Run from the repository root:

- `npm --prefix map-editor test` and `npm --prefix map-editor run check`
- `node --test game/tests/*.test.js`
- `python game/tests/browser_smoke.py` with Playwright and Chromium installed.
  Set `CHROMIUM_EXECUTABLE` to use an existing Chrome or Chromium executable.

G1 contains four handcrafted puzzles. The broader campaign, saved progress,
advanced budgeted tools and terrain events belong to later milestones.
