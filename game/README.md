# Element Forge G2

Open `game/index.html` from a repository checkout, or run
`python game/build.py Element_Forge_G2.html` from the repository root and open
the resulting offline file. No account or network connection is required.

## Campaign

| # | Puzzle | Focus |
|---:|---|---|
| 1 | Ember Meadow | Route around a ridge |
| 2 | Brook Bridge | Place a bridge across a brook |
| 3 | Stone Pass | Cross two straight routes at an intersection |
| 4 | The River Crossing | Save the single affordable bridge for the route that needs it |
| 5 | Firebreak Fen | Respect a terrain restriction |
| 6 | Reedwater Ford | Apply different rules to Nature and Water |
| 7 | Briar Hollow | Route Fire through a clearing while Nature uses the woods |
| 8 | Granite Gate | Build and use one bidirectional tunnel |
| 9 | Under the Escarpment | Budget for a complete tunnel |
| 10 | Twin Ravines | Share a budget between bridge and tunnel tools |
| 11 | Lantern Station | Visit a required checkpoint |
| 12 | Two Waystations | Match each element to its own station |
| 13 | Signal at the Pass | Combine checkpoint and intersection rules |
| 14 | Coldwater Relay | Combine elemental restrictions, checkpoints and a bridge budget |
| 15 | The Threefold Divide | Plan a three-element network through two intersections and a brook |

Inspect the board first, then select a loadout if the level has a shared
budget. In Build mode, tap a source or drag from it to draw a route. Release
and resume from the unfinished tip. Arrow keys move board focus and Enter
or Space activates a tile. Tap empty water to place a bridge before or during a route.
The bridge counter shows how many are left. Select intersections, tunnels or portals explicitly, since they can share the same placement tiles. Place a
selected tool to return to routing.
Choose the highlighted tool again to cancel placement. A tunnel is one item.
Choose two open tiles on the same row or column with at least one blocked
tile between them. There is no separate distance cap. The game assigns
matching labels such as T1 and T2. Either opening leads to the other.
Cancel an unfinished pair with Escape, the highlighted tool, the first
opening, or a click outside the board and toolbar.

N is Nature. Woods block the other elements in campaign levels; custom
levels use their own terrain rules. Click a different source to switch
tracks and click an unfinished tip to resume it. Construction stays available.

Undo cancels an unfinished route or restores the previous action. Restart
resets the board using the same loadout. Replan returns to tool selection.
Right-click a placed tool to remove it, or use Remove tool in Puzzle options.
Test delivery checks every route and animates success. Use the puzzle
selector to revisit unlocked campaign levels. Finishing a puzzle unlocks the next. Completion marks and the last
selected campaign puzzle are saved in browser storage when available.
Custom levels and unfinished boards are session-only.

## Level format

The game reads editor-exported `.level.json` packages. Rules version 1
retains fixed inventory. Rules version 2 uses the same wrapper and schema 2 map
plus a map-level `construction` object, for example:

```json
{"budget": 4, "prices": {"bridge": 2, "tunnel": 1}}
```

Inventory remains the maximum available count per tool. Each offered tool
requires a positive price. Both the loadout and actual placements must fit the
budget. Rules version 2 supports priced bridges, intersections and tunnel ends.
The level file stores prices and inventory per opening for compatibility.
The game presents two openings as one tunnel with one combined price.
Fixed map components are independent of player spend. Compatible native
exports can be opened from **Open a custom level**. The shared solver
searches a bounded set of placements for one constructed link pair, which
is sufficient for this campaign.

## Verification

- `npm --prefix map-editor test` and `npm --prefix map-editor run check`
- `node --test game/tests/*.test.js`
- `python game/tests/browser_smoke.py` with Playwright and Chromium installed.
  Set `CHROMIUM_EXECUTABLE` to use an existing Chrome or Chromium executable.

The automated suite solves and plays every campaign level, including through
the browser. G3 covers advanced puzzles such as portal budgets, ordered
stations and efficiency scoring. G4 covers curated procedural generation.
