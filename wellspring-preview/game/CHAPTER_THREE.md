# Chapter Three · The Primeval Crucible

The Sovereign Gate opens into the forge where the original Well-Springs were braided together. This chapter adds stages 25–36 to the existing campaign. Existing stage IDs, scores, and the campaign save key carry forward. The completed Stage 24 save opens Stage 25 on Continue.

All twelve boards use the supplied names, element pairs, endpoints, and tool budgets. Each is 12×12. Gates and checkpoints retain the draft counts. A few checkpoints or gates moved for legal routes, and some terrain changed to accommodate access, competing routes, or structural placement. For exact coordinates and winning plans, see `primeval-crucible.js` and `tests/fixtures/primeval-crucible-solutions.json`. Some gates are optional in the verified plans. Difficulty remains provisional.

| Stage | Verified route feature and changes from the draft |
| --- | --- |
| 25 | Wind uses a bridge beside a dry intersection and jumps the void. The southbound gate moved to the takeoff tile. Three walls opened to connect the approaches. |
| 26 | Shadow uses the portal and Metal uses the tunnel. The tunnel mouths and two approach tiles became usable ground. |
| 27 | Earth tunnels to a checkpoint relocated one row south. Electricity and Fire cross at a dry intersection. Three ridge tiles opened for access. |
| 28 | Light uses the portal and Plant uses the bridge. One wall opened beside the destination approaches. |
| 29 | Wind jumps the void. Metal tunnels across the upper ridge and crosses Electricity on dry ground. Ice uses the bridge on the southern approach. |
| 30 | Shadow uses the portal and Earth uses the tunnel. The Earth checkpoint moved past the tunnel exit, and the east-side approaches opened. |
| 31 | Plant uses the bridge and crosses Light. Wall and shallows changes connect the shore approaches. |
| 32 | Plant uses the bridge, Metal uses the tunnel, Fire uses the portal, and Wind jumps. Ground was opened around the tool mouths and their approaches. |
| 33 | Shadow uses the portal. Light uses the bridge and crosses Water at a separate dry intersection. Several central wall and water tiles changed to ground for the interlocking routes. |
| 34 | Earth uses the tunnel, Shadow uses the portal, and Metal crosses Ice. The central ridge was trimmed to connect the lower approaches. |
| 35 | Fire tunnels and Electricity stays on dry ground. Wind uses the bridge and intersects Water on a separate dry tile. Three approach tiles changed. |
| 36 | Five currents connect in the finale. Wind uses a bridge beside the dry Water intersection, then jumps the void. The western wall approach and bottom edge changed. |

The game and editor regression suites passed, including checks for each new board's tool budget, five-pair imports through the game parser, construction placement, route drawing, delivery, unlocks, and score carryover. The browser suite covers all 36 campaign stages and both chapter transitions when Chromium is available. Local Chromium launch was blocked by the execution environment. Physical-phone play and solve times remain unverified.
