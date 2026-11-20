# Stage Generator v1

Open the map editor and find **Verified challenge packs** under the original
generator. Choose a family, difficulty, seed, and stage count. Generate,
select a stage to load into the editor, and use **Enter Playtest**. Open the
verification disclosure to review placements and rejected candidates. Export
the pack and report separately. The pack is the exact generated selection;
edits made after opening a candidate in the editor can be saved separately.

Open **Challenge stages** in the standalone game to play the built-in pack
or import an exported pack. Challenge play leaves tutorial progress alone.
The curated seed is `curated-v1`, eight stages, mixed family and difficulty.
Special relay stages combine a bridge, checkpoint and fixed crossing.
The seed is reproducible with the generator revision recorded in the pack.
The standalone game build works offline.

## Verification and difficulty

Four authored recipes model a scarce bridge, contested intersections, a
checkpoint detour, and a relay with a third current. Optional routes,
crossing sites, corridor arrangements and the current that has to detour
vary with the seed. The generator checks the clean board, checks whether
the tool can be omitted, then probes designated sites at fixed placement.
Solutions replay through the game session. A site marked unsolved means
the supported fixed-placement route search was exhausted. A limited search
is inconclusive. The report does not prove global uniqueness or optimal
track length. Solved probe lengths describe individual solutions.

Difficulty is provisional. The recipes set the available alternatives and
routing layout. Evidence reports credible placements that solved, failed
sites, resource slack, route count, and required checkpoints for review.
The catalog is based on four topology families. Duplicate detection is
exact for supported symmetries and uses a recipe decision signature for
similarity. It does not establish semantic equivalence of arbitrary grids.
A broader puzzle vocabulary and calibrated human difficulty need playtests.

Fallbacks use a deterministic pool derived from the references and pass the
same verification and duplicate gates. An exhausted pool can yield a short
pack, which the editor reports. Run `node game/challenge-sweep.js 40` for
per-family and per-tier yields, duplicates, fallback and local p95 duration.

## Human playtest

Give players the curated pack without showing the verification report. Note
where they hesitate, spend a tool, undo, request a hint, or stop. After each
level, ask what decision mattered and whether a wrong plan felt recoverable.
Let players decide whether to continue. Compare voluntary Next Stage use
and perceived difficulty across the pack before changing tier labels or
publishing a larger selection. Include a physical phone and desktop session.
