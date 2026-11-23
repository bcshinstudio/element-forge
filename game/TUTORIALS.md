# Element Forge Rules 4 tutorials

Open the standalone HTML in a browser. Start the campaign or choose Challenges
to try the curated pack. In the editor, use Verified challenge packs to check,
play or export a new board. The classic generator remains available for
legacy boards.

Rules 4 starts a fresh 17-lesson campaign under a separate browser save key.
Earlier campaign clears, scores and drafts stay in their original save.
The new campaign starts from First Spark because the new boards teach
different lessons. An old saved Challenge can resume with its original
rule version. Imported Rules 1–3 levels and packs retain their routing rules.

Fire crosses lava and rejects all forms of water. Water can enter or leave
a river at any orthogonally adjacent legal shore, including an optional
bank marker. Unmarked open water still needs a suitable structure for
currents that can use a bridge. Electricity stays dry regardless of which
span is present. Woods are for Plant only, and Plant rejects portals.
Earth uses scree, Metal uses heated or abrasive ground, and both reject
lightweight bridges. Wind can jump one void to legal ground but cannot
use a tunnel. Ice uses shallow water and rejects heated terrain. Light
and Shadow reject each other's channel type. The new tutorials and
generated packs use no metal spans.

The focused lessons are verified with their required feature removed or
blocked. For example, closing the gap in One Clear Jump makes the stage
unsolvable. In Scarce Crossing, two otherwise legal exits independently
block Plant and Electricity. The remaining exit allows all three currents.

The results screen shows points, stage best and the campaign total where
applicable. Expand Score details for the unchanged calculation. The
unused construction line is hidden when it adds zero. Restore Harmony
still animates the routed energy and a board pulse. Skip and reduced
motion leave the clear and its saved score in place.

Build the standalone HTML with `python game/build.py Element_Forge_Tutorials.html`.
To regenerate the curated pack, run `node game/challenge-release.js output`.
For validation yield by tier, run `node game/challenge-sweep.js 6`.

On a physical phone, ask a new player to solve Free Current and One Clear
Jump without hints, then try Scarce Crossing. Observe mis-taps, whether
terrain symbols are distinguishable, and how readily the player
understands a blocked move and the completion feedback.
