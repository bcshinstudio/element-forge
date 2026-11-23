"""Expand committed, reproducible Chapter 10 designs into editable maps and game content.

Source blueprint: game/ch10-source-blueprint.txt
Verified authored designs: game/ch10-drafts/verified-maps.zlib.b64
Run from repo root: python3 scripts/build_ch10_campaign.py
"""
from pathlib import Path
import base64
import json
import zlib

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / "game"
DRAFTS = GAME / "ch10-drafts"
PAYLOAD = DRAFTS / "verified-maps.zlib.b64"


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def build():
    packed = PAYLOAD.read_text(encoding="ascii").strip()
    data = json.loads(zlib.decompress(base64.b64decode(packed)).decode("utf-8"))
    if sorted(map(int, data)) != list(range(109, 122)):
        raise ValueError("Verified chapter data must contain exactly Stages 109–121.")

    # Keep the original 13-map source archive for historical design review,
    # but retire Sundial Sluice (original 110) from the playable chapter.
    # Every regenerated level after that is renumbered consecutively.
    source_stages = [109, *range(111, 122)]
    assert data["110"]["m"]["name"] == "Sundial Sluice"
    levels = []
    witnesses = {}
    for stage, original_stage in enumerate(source_stages, start=109):
        row = data[str(original_stage)]
        m = row["m"]
        if m["name"] == "" or m.get("phaseRules") != {"initial": "day"}:
            raise ValueError(f"Stage {stage} has invalid phase metadata.")
        if m.get("width") != 12 or m.get("height") != 12 or len(m.get("cells", [])) != 144:
            raise ValueError(f"Stage {stage} must remain a 12×12 blueprint.")
        level = {
            "format": "element-forge-level", "schemaVersion": 1, "rulesVersion": 4,
            "map": m, "id": f"twilight-pendulum-{stage}", "layout": 1,
            "hint": "Plan Day deliveries before the pressure plate activates Night. "
                    "Earlier deliveries remain valid after switching phases.",
        }
        placements = row["placements"]
        routes = row["routes"]
        if not isinstance(placements, dict) or not (4 <= len(routes) <= 16):
            raise ValueError(f"Stage {stage} missing construction witness or route sequence.")
        # Editable drafts carry a proof that the editor verifies against every
        # tile and rule. The shipped levels omit the solution to avoid spoilers.
        editable = {**m, "phaseWitness": {"placements": placements, "routes": routes}}
        write_json(DRAFTS / f"stage-{stage}.map.json", editable)
        write_json(DRAFTS / f"stage-{stage}.level.json", level)
        write_json(DRAFTS / f"stage-{stage}.solution.json", {"placements": placements, "routes": routes})
        levels.append(level)
        witnesses[level["id"]] = {"placements": placements, "routes": routes}
    # Clean up old 13-map campaign output on subsequent rebuilds.
    for stale in DRAFTS.glob("stage-121.*.json"):
        stale.unlink()
    write_json(GAME / "tests/fixtures/twilight-pendulum-solutions.json", witnesses)
    module = ("'use strict';\n(function(root){\n const chapter="
              + json.dumps(levels, separators=(",", ":"), ensure_ascii=False)
              + ";\n root.EFTwilightPendulum=chapter;\n "
              "if(typeof module!=='undefined')module.exports=chapter;\n"
              "})(typeof window==='undefined'?globalThis:window);\n")
    (GAME / "twilight-pendulum.js").write_text(module, encoding="utf-8")
    print(f"Generated {len(levels)} Chapter 10 levels, editable maps, and verified route witnesses.")


if __name__ == "__main__":
    build()
