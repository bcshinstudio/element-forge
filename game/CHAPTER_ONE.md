# Element Forge · Chapter One

Chapter One follows the Conduit Weaver from the first working spring to the valley’s World-Engine. Stage difficulty remains provisional pending human first-solve observations.

| Stage | Intended decision | Alternative checked |
|---|---|---|
| 1 · First Spark | Draw a route and backtrack to change it. | The adjacent mountain rejects the first wrong turn. |
| 2 · Twin Crossings | Preserve straight exit lines for both currents and place a single intersection. | An intersection one row higher also works if Fire takes the upper approach. |
| 3 · Cinder Ford | Follow the river before choosing where to intersect Fire’s lava approach. | Spending the intersection on Fire’s first dry approach strands a current. |
| 4 · Dry Junction | Keep the wooded approach for Plant and give Electricity a straight crossing. | Moving the intersection one cell left fails. |
| 5 · Scarce Crossing | Choose a river exit after tracing the dry circuit and the wooded route. | The upper exit blocks Plant and the middle exit blocks Electricity. The lower exit works. |
| 6 · Spillway Watch | Reserve separate roles for the bridge and intersection. | A bridge one row too low leaves the intended crossing disconnected. |
| 7 · Scree and Timber | Let Earth use scree and give Plant the bridge. | An alternate nearby intersection works with the bridge kept in place. |
| 8 · Engine Underpass | Keep the river crossing open by placing the tunnel mouths off the Water line. | The fixed tunnel shortcut through Water’s crossing fails even with the spare intersection available. |
| 9 · Riftwater | Leave an ordinary intersection before the one-gap Wind jump. | The last tile before the jump is too late for the intersection. |
| 10 · The Last Relay | Use the portal, keep the straight river crossing clear, then visit Fire’s checkpoint. | An early intersection before the river fails. |
| 11 · Kiln Junction | Assign the heated approach to Metal and the lava approach to Fire. | A nearby alternative crossing works with a different approach. |
| 12 · Grove Overlook | Plan both crossings before allocating the two-intersection budget. | Spending one intersection before the first crossing leaves one route blocked. |

The checks use supported solver rules and the stated fixed placements. They do not establish that a board has a unique solution. Six chapter boards come from the authored challenge pack, five are new or revised, and First Spark retains its original geometry. The original 18 lessons remain accessible through Information.

## Verified construction and routes

The regression suite solves each stage and replays every result through the player session, including paired tunnel placement. Grid indices below are zero-based in row-major order. Each route runs from source to destination.

### 1. First Spark

- fire · 50 → 51 → 52 → 53 → 65 → 77 → 78 → 79 → 80

### 2. Twin Crossings

Place intersection at 65.

- electricity · 41 → 53 → 65 → 77 → 89
- fire · 62 → 63 → 64 → 65 → 66 → 67 → 68

### 3. Cinder Ford

Place intersection at 62.

- water · 27 → 39 → 51 → 50 → 62 → 74 → 75 → 87 → 99
- fire · 60 → 61 → 62 → 63 → 64 → 65 → 66 → 78 → 79 → 80 → 81 → 82 → 70

### 4. Dry Junction

Place intersection at 65.

- electricity · 29 → 41 → 53 → 65 → 77 → 89 → 101
- nature · 60 → 61 → 62 → 63 → 64 → 65 → 66 → 67 → 68 → 69 → 70

### 5. Scarce Crossing

- nature · 17 → 29 → 41 → 53
- electricity · 77 → 65 → 66 → 67 → 68 → 69 → 81 → 93
- water · 85 → 86 → 87 → 88 → 100 → 101 → 102 → 103 → 104 → 105 → 106 → 107 → 95

### 6. Spillway Watch

Place bridge at 64, intersection at 67.

- electricity · 43 → 55 → 67 → 79 → 91
- nature · 61 → 62 → 63 → 64 → 65 → 66 → 67 → 68 → 69

### 7. Scree and Timber

Place intersection at 64, bridge at 65.

- earth · 29 → 41 → 53 → 52 → 64 → 76 → 77 → 89 → 101
- nature · 60 → 61 → 62 → 63 → 64 → 65 → 66 → 67 → 68 → 69 → 70

### 8. Engine Underpass

Place tunnel at 62, tunnel at 68.

- water · 40 → 52 → 64 → 76 → 88 → 100
- fire · 61 → 62 → 68 → 69

### 9. Riftwater

Place intersection at 63.

- wind · 61 → 62 → 63 → 64 → 66 → 67 → 68 → 69 → 70
- water · 39 → 51 → 63 → 75 → 87 → 88 → 89 → 90 → 91 → 92 → 93

### 10. The Last Relay

Place intersection at 68.

- water · 44 → 56 → 68 → 80 → 92 → 104
- fire · 61 → 62 → 63 → 64 → 66 → 67 → 68 → 69 → 81 → 82 → 70

### 11. Kiln Junction

Place intersection at 65.

- metal · 29 → 41 → 53 → 65 → 77 → 89 → 101
- fire · 60 → 61 → 62 → 63 → 64 → 65 → 66 → 67 → 68 → 69 → 70

### 12. Grove Overlook

Place intersection at 63, intersection at 67.

- electricity · 27 → 39 → 51 → 63 → 75 → 87 → 99
- earth · 31 → 43 → 55 → 67 → 79 → 91 → 103
- nature · 60 → 61 → 62 → 63 → 64 → 65 → 66 → 67 → 68 → 69 → 70

## Saves, art, and audio

The chapter writes to its own save key. It can carry forward a compatible unfinished First Spark board and the existing challenge slot. Old tutorial results and personal bests remain in their original lesson records. An incompatible old board stays archived in the old save. New starts a fresh run and retains chapter unlocks and best scores.

The World-Engine landscape is original generated artwork created for this project. The restored chapter screen adds a lit valley treatment to the same landscape. The music and audio cues are original pitch sequences synthesized offline through Web Audio. They use no external samples, streams, or dependencies. Keep **Element Forge** while playtesting. **Worldweaver** better emphasizes the Conduit Weaver’s role if the story becomes the focus of a future rename.

## Validation

- All 12 chapter solutions replayed through the game session.
- Fixed-placement and movement alternatives checked for all stages.
- Unit and regression suites reported 169 passes, zero failures, and zero skips. Legacy editor scripts also passed.
- The standalone builder embeds the title art, approved board images, and synthesizer.
- The browser smoke suite covers the chapter, lesson return, replay and resume, portrait and landscape menus, keyboard routing, editor imports, and the challenge pack. Local Chromium could not start the automated run because the environment blocked its Unix socket. Physical iPhone and Android testing and listening checks remain pending.
