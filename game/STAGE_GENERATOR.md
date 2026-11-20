# Routing Decision Challenge Generator

Open the map editor, scroll to **Verified challenge packs**, and choose a
family, difficulty, seed and stage count. Select **Generate challenge batch**.
Open a candidate and use **Enter Playtest**. Expand **Verification and
rejection details** to inspect competing plans, or export the evidence as JSON.
These details include solutions. **Export selected stage** and **Export pack**
return the verified bytes from the batch, independent of later editor changes.

Open **Challenge stages → Play curated pack** in the offline game. The same
menu imports a challenge pack. Use **Next Stage** after delivery, or choose a
stage in the puzzle menu. The tutorial campaign and its saved progress are
independent from challenge play.

## References and curated pack

Generate the exact release pack and its proof data with
`node game/challenge-release.js /tmp/forge-release`. Its seed is
`river-valley-26`, with eight stages, mixed family and tier, and references
enabled. Generate the offline game with
`python game/build.py Element_Forge_Routing.html`.

| Reference | Intended insight |
| --- | --- |
| Scarce Crossing | Inspect how Water and Plant share the dry crossing before spending a bridge. More than one bridge plan wins. One useful Water bridge site leaves every current individually routable, yet it makes the full board impossible. |
| Contested Pass | A completed Fire route can use space the other two currents need together. Two independently winning Water and Plant beginnings cannot coexist. |
| Grove Crossing | Two reasonable approaches reach Plant's checkpoint. Approaching from the losing side leaves Plant a valid local route but prevents delivery of Water. |
| Valley Relay | A budget can buy one bridge or intersection. Two bridge plans win and serve different currents. One is incompatible with a promising Water approach. |

The evidence JSON includes exact coordinates as flat zero-based indices,
the playable winning plans, the solo witness for a tempting route, first
blocked prefix lengths, paired conflicts, and linked commitments. Fire's
bridge rule is unchanged. Fire appears in the dry Contested Pass reference
and cannot provide an alternative water route there. The water-based
references and generated release stages use other currents.

## Search and grading

The challenge model treats each current as one unsplittable flow. At fixed
construction, shortest routes are searched independently, then conflicting
assignments are split by excluding one of the overlapping uses. A collision
at an intersection branches on local entry/exit patterns so valid straight
perpendicular crossings survive. Candidate construction is enumerated
within inventory and budget. Checkpoints are part of the path-search state,
and repeated-cell walks are resolved using simple paths. Tiny-board tests
cross-check this search against independent exhaustive enumeration.

The model covers orthogonal routes, land, forest, ice, water, blocked cells,
bridges, intersections and checkpoints. Other editor mechanics continue
using the editor's general rules and existing solver. The verifier starts
from the player map and replays accepted solutions through the actual session.
It distinguishes `solved`, `unsolved` (within the supported model and
specified commitments), and `inconclusive` at the deterministic work limit.
The sampled alternatives are deliberately bounded and do not enumerate
every plausible human move or prove solution uniqueness.

The generator perturbs shared-space references and samples new endpoint
placements on small open grids. It rejects corridor fixtures, winning
independent shortest routes and irrelevant bridge budgets in the scarce-tool
family. Strategic signatures use the tested route conflicts, bridge users
and linked commitments. Rotations and reflections are canonicalized separately.
This catches a useful subset of strategic repeats. Comparison is within a
batch, and across-batch repetition is reported by the sweep.

Easy introduces the choice with two currents. Medium requires a verified
consequential choice, such as comparing multiple bridge plans.
Hard requires a verified conflict that takes some commitment to encounter,
with completed route and bridge probes. Expert also needs a verified pair
of independently winning commitments that makes joint delivery impossible.
Insufficient evidence for an advanced tier is a reason to withhold it.
Special is independent of tier. Fallback references pass the same checks
and cannot fill a slot at the wrong tier. Any remaining gap is shown.

Run `node game/challenge-sweep.js 40` to reproduce the seed sweep by family
and difficulty. It reports usable stages, decision repeats, fallback use,
inconclusive rejections and p95 batch times. Time depends on the device.

## Human playtest

Give players who know the rules the offline pack with hints collapsed. For
each first solve, record active time, hints, restarts, the point where the
player first changes plans, whether the failed plan felt fair, and whether
they voluntarily tap **Next Stage**. Try this on a physical phone as well
as desktop. Preliminary targets are 3–5 minutes for Medium, 5–10 for Hard,
and 10+ for Expert. Treat solve time, enjoyment and physical-device usability
as unverified until people play the pack.
