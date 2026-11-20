import json
import os
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
    page.get_by_role("button", name="Draw track").click()
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


def test_main_loop(browser, url):
    page = browser.new_page(viewport={"width": 1280, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url + BASE)
    expect(page.get_by_role("heading", name="Ember Meadow")).to_be_visible()
    expect(page.locator(".tile")).to_have_count(144)
    page.get_by_role("button", name="Start building").click()
    route(page, [40, 52, 64, 76, 88, 89, 90, 102, 103, 104, 92], drag=True)
    page.get_by_role("button", name="Test delivery").click()
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
    expect(page.locator(".orb")).to_have_count(1)
    page.get_by_role("button", name="Next puzzle").click()
    expect(page.get_by_role("heading", name="Brook Bridge")).to_be_visible()

    page.locator("#level").select_option(label="The River Crossing")
    expect(page.get_by_role("heading", name="Plan your route")).to_be_visible()
    expect(tile(page, 113)).to_be_visible()
    expect(page.get_by_role("button", name="Draw track")).to_be_hidden()
    bridge_count = page.locator('input[name="bridge"]')
    bridge_count.fill("2")
    expect(page.get_by_role("button", name="Start building")).to_be_disabled()
    expect(page.locator("#budget")).to_have_text("2 points over budget")
    # Visiting a fixed-inventory puzzle clears the over-budget button state.
    page.locator("#level").select_option(label="Brook Bridge")
    expect(page.get_by_role("button", name="Start building")).to_be_enabled()
    page.locator("#level").select_option(label="The River Crossing")
    bridge_count.fill("1")
    page.get_by_role("button", name="Start building").click()

    page.get_by_role("button", name="Bridge (1)").click()
    tile(page, 51).click()
    expect(page.get_by_role("status")).to_contain_text("cannot be placed")
    tile(page, 53).click()
    route(page, FIRE_SHORTCUT)
    page.get_by_role("button", name="Test delivery").click()
    expect(page.get_by_role("status")).to_contain_text("water: missing route")
    expect(page.get_by_role("button", name="Restart", exact=True)).to_be_hidden()
    expect(page.locator("#import")).to_be_hidden()
    expect(page.get_by_role("button", name="Bridge (0)")).to_have_count(0)
    page.get_by_text("Puzzle options", exact=True).click()
    expect(page.get_by_role("button", name="Remove tool")).to_be_visible()
    page.get_by_role("button", name="Restart", exact=True).click()
    expect(page.get_by_role("button", name="Bridge (1)")).to_be_visible()
    expect(tile(page, 53)).to_have_attribute("aria-label", "Row 5, column 6, water")
    page.get_by_text("Puzzle options", exact=True).click()
    page.get_by_role("button", name="Replan tools").click()
    expect(page.get_by_role("heading", name="Plan your route")).to_be_visible()
    expect(bridge_count).to_have_value("1")
    page.get_by_role("button", name="Start building").click()
    page.get_by_role("button", name="Bridge (1)").click()
    tile(page, 113).click()
    route(page, FIRE_DETOUR)
    route(page, WATER)
    page.get_by_role("button", name="Undo").click()
    route(page, WATER)
    page.get_by_role("button", name="Test delivery").click()
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
    expect(page.locator("#score")).to_have_text("Track length 17 · Construction spend 2 pt")
    expect(page.locator(".orb")).to_have_count(2)
    expect(page.get_by_role("button", name="Replay puzzle")).to_be_enabled(timeout=8000)
    page.get_by_role("button", name="Replay puzzle").click()
    expect(page.get_by_role("heading", name="Plan your route")).to_be_visible()
    assert not errors, errors
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
    assert not errors, errors
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
                    print("PASS G1 desktop: drag routing, overspend, invalid placement, wrong bridge, restart, replan, undo, animation, next and replay")
                    test_offline_touch_and_import(browser, offline)
                    print("PASS G1 standalone mobile emulation: responsive board, legacy import, touch routing and reduced motion")
                    browser.close()
            finally:
                server.shutdown()
                thread.join()
