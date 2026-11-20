import json
import os
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BASE = "/game/index.html"
FIRE_SHORTCUT = [50, 51, 52, 53, 54, 55, 56]
FIRE_DETOUR = [50, 51, 52, 40, 39, 27, 28, 29, 30, 42, 54, 55, 56]
WATER = [99, 111, 112, 113, 114, 115]


def tile(page, index):
    return page.locator(f'[data-index="{index}"]')


def route(page, path, drag=False):
    if not drag:
        for index in path:
            tile(page, index).click()
        return
    tile(page, path[0]).scroll_into_view_if_needed()
    points = [tile(page, i).bounding_box() for i in path]
    center = [(rect["x"] + rect["width"] / 2, rect["y"] + rect["height"] / 2)
              for rect in points]
    page.mouse.move(*center[0])
    page.mouse.down()
    for point in center[1:]:
        page.mouse.move(*point, steps=3)
    page.mouse.up()


def unlock_through(page, count):
    page.evaluate("""count => {
        const completed = EFLevels.catalog.slice(0, count).map(level => level.id);
        localStorage.setItem('element-forge.campaign.v1', JSON.stringify({completed}));
    }""", count)
    page.reload()


def test_main_loop(browser, url):
    page = browser.new_page(viewport={"width": 1280, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url + BASE)
    expect(page.get_by_role("heading", name="Ember Meadow")).to_be_visible()
    expect(page.locator(".tile")).to_have_count(144)
    page.get_by_role("button", name="Start building").click()
    route(page, [40, 52, 64], drag=True)
    expect(tile(page, 64).locator(".track")).to_have_count(1)
    route(page, [64, 76, 88, 89, 90, 102, 103, 104, 92], drag=True)
    page.get_by_role("button", name="Test delivery").click()
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
    expect(page.locator(".orb")).to_have_count(1)
    page.get_by_role("button", name="Next puzzle").click()
    expect(page.get_by_role("heading", name="Brook Bridge")).to_be_visible()

    unlock_through(page, 3)
    page.locator("#level").select_option("3")
    expect(page.get_by_role("heading", name="Plan your route")).to_be_visible()
    expect(tile(page, 113)).to_be_visible()
    expect(page.get_by_role("button", name="Draw track")).to_be_hidden()
    bridge_count = page.locator('input[name="bridge"]')
    bridge_count.fill("2")
    expect(page.get_by_role("button", name="Start building")).to_be_disabled()
    expect(page.locator("#budget")).to_have_text("2 points over budget")
    # Visiting a fixed-inventory puzzle clears the over-budget button state.
    page.locator("#level").select_option("1")
    expect(page.get_by_role("button", name="Start building")).to_be_enabled()
    page.locator("#level").select_option("3")
    bridge_count.fill("1")
    page.get_by_role("button", name="Start building").click()

    expect(page.locator("#bridge-count")).to_have_text("Bridges left: 1")
    tile(page, 53).click()
    expect(page.locator("#bridge-count")).to_have_text("Bridges left: 0")
    tile(page, 53).click(button="right")
    expect(page.locator("#bridge-count")).to_have_text("Bridges left: 1")
    tile(page, 53).click()
    route(page, FIRE_SHORTCUT)
    page.get_by_role("button", name="Test delivery").click()
    expect(page.locator("#status")).to_contain_text("water: missing route")
    expect(page.get_by_role("button", name="Restart", exact=True)).to_be_hidden()
    expect(page.locator("#import")).to_be_hidden()
    expect(page.get_by_role("button", name="Bridge (0)")).to_have_count(0)
    page.get_by_text("Puzzle options", exact=True).click()
    expect(page.get_by_role("button", name="Remove tool")).to_be_visible()
    page.get_by_role("button", name="Restart", exact=True).click()
    expect(page.locator("#bridge-count")).to_have_text("Bridges left: 1")
    expect(tile(page, 53)).to_have_attribute("aria-label", "Row 5, column 6, water")
    page.get_by_text("Puzzle options", exact=True).click()
    page.get_by_role("button", name="Replan tools").click()
    expect(page.get_by_role("heading", name="Plan your route")).to_be_visible()
    expect(bridge_count).to_have_value("1")
    page.get_by_role("button", name="Start building").click()
    route(page, FIRE_DETOUR[:3])
    route(page, WATER[:3])
    tile(page, 113).click()
    route(page, WATER[3:])
    route(page, FIRE_DETOUR[2:])
    page.get_by_role("button", name="Undo").click()
    route(page, FIRE_DETOUR)
    page.get_by_role("button", name="Test delivery").click()
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
    expect(page.locator("#score")).to_have_text("Track length 17 · Construction spend 2 pt")
    expect(page.locator(".orb")).to_have_count(2)
    expect(page.get_by_role("button", name="Replay puzzle")).to_be_enabled(timeout=8000)
    page.get_by_role("button", name="Replay puzzle").click()
    expect(page.get_by_role("heading", name="Plan your route")).to_be_visible()
    assert not errors, errors
    page.close()


def test_reedwater_endpoints_and_lock(browser, url):
    page = browser.new_page(viewport={"width": 1280, "height": 1000})
    page.goto(url + BASE)
    unlock_through(page, 5)
    page.locator("#level").select_option("5")
    page.locator("#start").click()
    left, right = tile(page, 98), tile(page, 117)
    expect(left.locator(".endpoint-role")).to_have_text("D")
    expect(right.locator(".endpoint-role")).to_have_text("S")
    left.click()
    expect(page.locator("#status")).to_contain_text("This is a destination (D)")
    right.click()
    expect(right.locator(".track")).to_have_count(1)
    assert page.locator('#level option[value="6"]').evaluate("option => option.disabled")
    page.locator("#level").evaluate("""select => {
        select.value = '6';
        select.dispatchEvent(new Event('change'));
    }""")
    expect(page.get_by_role("heading", name="Reedwater Ford")).to_be_visible()
    expect(page.locator("#level")).to_have_value("5")
    expect(page.get_by_role("button", name="Skip to next puzzle")).to_have_count(0)
    expect(page.locator("#campaign-progress")).to_have_text("5 / 15 complete")
    page.close()


def test_offline_touch_and_import(browser, offline):
    page = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True,
                            reduced_motion="reduce")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.context.set_offline(True)
    page.goto(offline.as_uri())
    expect(page.locator(".tile")).to_have_count(144)
    assert page.evaluate("document.documentElement.scrollWidth === window.innerWidth")
    page.locator("#start").tap()
    route(page, [40, 52, 64, 76, 88, 89, 90, 102, 103, 104, 92])
    page.locator("#check").tap()
    page.locator("#next").tap()
    page.locator("#start").tap()
    tile(page, 53).tap()
    expect(page.locator("#bridge-count")).to_have_text("Bridges left: 0")
    cells = [{"terrain": "land"} for _ in range(16)]
    for index, role in ((0, "source"), (3, "destination")):
        cells[index]["node"] = {"role": role, "element": "fire"}
    level = {"format": "element-forge-level", "schemaVersion": 1, "rulesVersion": 1,
             "map": {"format": "element-forge-map", "schemaVersion": 2, "name": "Legacy path",
                     "width": 4, "height": 4, "cells": cells, "inventory": {}}}
    field = page.locator("#import")
    expect(field).to_be_hidden()
    page.get_by_text("Open a custom level", exact=True).tap()
    expect(field).to_be_visible()
    field.set_input_files({"name": "legacy.level.json", "mimeType": "application/json",
                           "buffer": json.dumps(level).encode()})
    expect(page.get_by_role("heading", name="Legacy path")).to_be_visible()
    expect(page.locator(".tile")).to_have_count(16)
    page.get_by_role("button", name="Start building").tap()
    for index in range(4):
        tile(page, index).tap()
    page.get_by_role("button", name="Test delivery").tap()
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
    expect(page.locator(".orb")).to_have_count(0)
    expect(page.locator("#campaign-progress")).to_have_text("1 / 15 complete")
    assert not errors, errors
    page.close()


def test_campaign_and_progress(browser, url):
    page = browser.new_page(viewport={"width": 1280, "height": 1000}, reduced_motion="reduce")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url + BASE)
    plans = page.evaluate("""EFLevels.catalog.map(level => {
        const map = EFMap.readLevel(level);
        const solution = EFEngine.solveConstruction(map);
        return {name: map.name, budget: !!map.construction, ...solution};
    })""")
    assert len(plans) == 15
    for i, plan in enumerate(plans):
        expect(page.get_by_role("heading", name=plan["name"], exact=True)).to_be_visible()
        assert plan["status"] == "solved", plan
        if plan["budget"]:
            counts = {}
            for placement in plan["placements"].values():
                kind = placement if isinstance(placement, str) else placement["kind"]
                counts[kind] = counts.get(kind, 0) + 1
            for kind, count in counts.items():
                page.locator(f'input[name="{kind}"]').fill(str(count // 2 if kind == "tunnel" else count))
        page.get_by_role("button", name="Start building").click()
        tunnel_openings = {}
        for index, placement in plan["placements"].items():
            kind = placement if isinstance(placement, str) else placement["kind"]
            if kind == "tunnel":
                pair = tunnel_openings.setdefault(placement["pairId"], [])
                pair.append(index)
                if len(pair) == 1:
                    continue
                page.locator('[data-tool="tunnel"]').click()
                tile(page, pair[0]).click()
                expect(tile(page, pair[0])).to_have_class("tile land tunnel-preview")
                page.keyboard.press("Escape")
                expect(tile(page, pair[0])).to_have_class("tile land")
                page.locator('[data-tool="tunnel"]').click()
                tile(page, pair[0]).click()
                tile(page, pair[1]).click()
                expect(tile(page, pair[0])).to_have_attribute("aria-label", re.compile(r"Tunnel T[0-9]+$"))
            else:
                if kind != "bridge":
                    page.locator(f'[data-tool="{kind}"]').click()
                tile(page, index).click()
            expect(page.locator("#instructions")).to_contain_text("Tap a source")
        for path in plan["routes"]:
            route(page, path["path"])
        page.get_by_role("button", name="Test delivery").click()
        expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
        expect(page.locator("#campaign-progress")).to_have_text(f"{i+1} / 15 complete")
        if i < 14:
            page.get_by_role("button", name="Next puzzle").click()
    expect(page.get_by_role("button", name="Next puzzle")).to_be_disabled()
    page.reload()
    expect(page.get_by_role("heading", name="The Threefold Divide")).to_be_visible()
    expect(page.locator("#campaign-progress")).to_have_text("15 / 15 complete")
    page.locator("#level").select_option("0")
    expect(page.locator("#level option").first).to_have_text("1. Ember Meadow ✓")
    expect(page.locator("#campaign-progress")).to_have_text("15 / 15 complete")
    assert not errors, errors
    page.close()


def test_portrait_tunnels(browser, url):
    page = browser.new_page(viewport={"width": 360, "height": 640},
                            is_mobile=True, has_touch=True, reduced_motion="reduce")
    page.goto(url + BASE)
    unlock_through(page, 7)
    page.locator("#level").select_option("7")
    assert page.evaluate("document.documentElement.scrollWidth === innerWidth")
    page.locator("#puzzle-hint summary").tap()
    expect(page.locator("#hint-text")).to_contain_text("Either opening")
    page.locator("#start").tap()
    assert tile(page, 50).evaluate("tile => getComputedStyle(tile).touchAction") == "none"
    assert page.locator("#board").evaluate("board => getComputedStyle(board).touchAction") == "pan-y pinch-zoom"
    session = page.context.new_cdp_session(page)
    page.evaluate("scrollTo(0, 0)")
    rect = tile(page, 52).bounding_box()
    x, y = rect["x"] + rect["width"] / 2, rect["y"] + rect["height"] / 2
    session.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
    for distance in range(20, 141, 20):
        session.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y-distance}]})
    session.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    page.wait_for_function("scrollY > 0")
    expect(page.locator(".track")).to_have_count(0)
    tunnel = page.get_by_role("button", name="Tunnel (1)", exact=True)
    tunnel.tap()
    tile(page, 51).tap()
    expect(tile(page, 51)).to_have_class(re.compile("tunnel-preview"))
    tile(page, 51).tap()
    expect(page.locator(".tunnel-preview")).to_have_count(0)
    tunnel.tap()
    tile(page, 51).tap()
    page.locator("#puzzle").tap()
    expect(page.locator(".tunnel-preview")).to_have_count(0)
    expect(tunnel).to_be_visible()
    tunnel.tap()
    tile(page, 51).tap()
    tile(page, 56).tap()
    for index in (51, 56):
        expect(tile(page, index)).to_have_attribute("aria-label", re.compile("Tunnel T1$"))
    page.get_by_role("button", name="Remove tool").tap()
    tile(page, 56).tap()
    for index in (51, 56):
        expect(tile(page, index)).to_have_attribute("aria-label", re.compile("land$"))
    expect(tunnel).to_be_visible()
    page.close()


def test_world_engine_offline(browser, offline):
    page = browser.new_page(viewport={"width": 390, "height": 844},
                            is_mobile=True, has_touch=True, reduced_motion="reduce")
    page.context.set_offline(True)
    page.goto(offline.as_uri())
    expect(page.locator("#world-intro")).to_be_visible()
    page.locator("#intro-skip").tap()
    expect(page.locator("#world-intro")).to_be_hidden()
    page.locator("#level").select_option("15")
    page.locator("#start").tap()
    for index in (62, 63, 64):
        tile(page, index).tap()
    expect(tile(page, 66)).to_have_class(re.compile("wind-landing"))
    tile(page, 65).tap()
    expect(page.locator("#status")).to_contain_text("cannot stop")
    for index in (66, 67, 68, 69):
        tile(page, index).tap()
    page.locator("#check").tap()
    expect(page.locator("#engine-restoration")).to_contain_text("World-Engine online")
    assert page.locator(".engine-wheel").evaluate("wheel => getComputedStyle(wheel).animationName") == "none"
    expect(page.locator("#campaign-progress")).to_have_text("0 / 15 complete")
    page.locator("#replay").tap()
    expect(page.locator("#world-intro")).to_be_hidden()
    page.reload()
    expect(page.locator("#world-intro")).to_be_hidden()
    page.close()


def test_challenge_pack_offline(browser, offline):
    page = browser.new_page(viewport={"width": 390, "height": 844},
                            is_mobile=True, has_touch=True, reduced_motion="reduce")
    page.context.set_offline(True)
    page.goto(offline.as_uri())
    page.locator("#challenge-library summary").tap()
    page.locator("#curated-pack").tap()
    pack = page.evaluate("EFCurated")
    expect(page.locator("#puzzle")).to_contain_text(pack["stages"][0]["map"]["name"])
    plans = page.evaluate("EFCurated.stages.map(level => EFChallenges.verify(level).solution)")
    assert all(plan and plan["status"] == "solved" for plan in plans)
    for i, plan in enumerate(plans):
        page.locator("#start").scroll_into_view_if_needed()
        for index, tool in plan["placements"].items():
            page.locator(f'#loadout input[name="{tool}"]').fill("1")
        page.locator("#start").tap()
        for index, tool in plan["placements"].items():
            if tool != "bridge":
                page.locator(f'[data-tool="{tool}"]').tap()
            tile(page, index).tap()
        for current in plan["routes"]:
            for index in current["path"]:
                tile(page, index).tap()
        page.locator("#check").tap()
        expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
        if i < len(plans)-1:
            page.get_by_role("button", name="Next Stage").tap()
    expect(page.locator("#next")).to_be_disabled()
    expect(page.locator("#campaign-progress")).to_have_text("0 / 15 complete")
    page.locator("#challenge-library summary").tap()
    page.locator("#pack-file").set_input_files({"name": "pack.json", "mimeType": "application/json",
                                               "buffer": json.dumps(pack).encode()})
    expect(page.locator("#puzzle")).to_contain_text(pack["stages"][0]["map"]["name"])
    page.close()


def test_keyboard(browser, url):
    page = browser.new_page(reduced_motion="reduce")
    page.goto(url + BASE)
    page.locator("#start").focus()
    page.keyboard.press("Enter")
    expect(tile(page, 40)).to_be_focused()
    page.keyboard.press("Enter")
    for key in ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "ArrowRight",
                "ArrowRight", "ArrowDown", "ArrowRight", "ArrowRight", "ArrowUp"]:
        page.keyboard.press(key)
        page.keyboard.press("Enter")
    page.locator("#check").focus()
    page.keyboard.press("Enter")
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
    page.close()


if __name__ == "__main__":
    import subprocess
    from tempfile import TemporaryDirectory

    with TemporaryDirectory() as temp:
        offline = Path(temp, "standalone.html")
        subprocess.run(["python", str(ROOT / "game/build.py"), str(offline)], check=True)

        with ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT))) as server:
            thread = Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                url = f"http://127.0.0.1:{server.server_port}"
                with sync_playwright() as playwright:
                    browser = playwright.chromium.launch(executable_path=os.getenv("CHROMIUM_EXECUTABLE"))
                    test_main_loop(browser, url)
                    print("PASS desktop: start and resume drag routing, overspend, direct bridge placement and removal, wrong bridge, restart, replan, undo, animation, next and replay")
                    test_reedwater_endpoints_and_lock(browser, url)
                    print("PASS Reedwater: distinguish Water endpoints, start from its source and keep the next puzzle locked")
                    test_offline_touch_and_import(browser, offline)
                    print("PASS standalone mobile emulation: responsive board, legacy import, touch routing and reduced motion")
                    test_portrait_tunnels(browser, url)
                    print("PASS portrait touch: scroll, hints, cancel either way, paired placement and removal")
                    test_world_engine_offline(browser, offline)
                    print("PASS offline World-Engine intro, Wind jump, reduced motion and replay")
                    test_challenge_pack_offline(browser, offline)
                    print("PASS offline touch challenge pack: all eight stages, next and import")
                    test_keyboard(browser, url)
                    print("PASS keyboard: start, navigate, draw and deliver without a pointer")
                    test_campaign_and_progress(browser, url)
                    print("PASS campaign: all 15 levels playable, next and replay navigation, completed progress survives reload")
                    browser.close()
            finally:
                server.shutdown()
                thread.join()
