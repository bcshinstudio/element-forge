# Element Forge Map Editor v1.6.0

## Integrated changes
- Curated route maze now evaluates **two independently validated solutions** (the standard solver result and the dry alternative) when selecting candidates.
- Candidate scoring combines existing structural metrics with bounded bonuses for distinct paths, bridge choices, track differences, and cost differences.
- Generator status displays route-choice score alongside junction and dead-end counts.
- Added persistent gameplay-quality tests for seeded determinism, candidate ranking, and rejection of invalid alternatives.

**Limitations:** This is heuristic candidate ranking, not proof of global optimality or calibrated human difficulty. The generator still uses structured maze backbones. Browser and device interaction are not verified by the Node tests.

Run `npm test` and `npm run check` in the editor directory.

# Element Forge Map Editor v1.5 — Curated maze selection

New **Crossing: curated route maze** challenge: generate three deterministic maze candidates, independently verify each with the shared engine, and select the candidate with the strongest *structural exploration score* (junctions, dead ends, walkable tiles). The UI reports how many candidates verified and the selected map's structural metrics. Candidate failures are excluded, not treated as successful solutions.

This is **not** a proof of puzzle difficulty, uniqueness, component necessity, or cost optimality. It does not yet replace the template-based generator. The existing crossing, maze, construction, and editor workflows remain available. Existing schemaVersion 2 maps remain compatible.

Run `npm test` and `npm run check`. Full Chrome interaction and physical mobile testing remain unverified.


## v1.7: Interior detour challenge
New generator option **Crossing: interior detour** places an impassable cell in the vertical corridor and carves a narrow bypass, plus seeded interior obstacles. The shared solver verifies each candidate. The generator is still template-based and does not certify optimality or calibrated difficulty. Run `npm test` and `npm run check`.
