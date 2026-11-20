import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BASE = "/game/index.html"
def tile(page, index):
    return page.locator(f'[data-index="{index}"]')


def current_plan(page, index):
    return page.evaluate("index => EFEngine.solveConstruction(EFMap.readLevel(EFChapter.chapter[index]))", index)


def prepare(page, plan, tap=False):
    press = lambda locator: locator.tap() if tap else locator.click()
    if page.locator("#mechanic-tip").evaluate("dialog => dialog.open"):
        press(page.locator("#continue-stage"))
    counts = {}
    for placement in plan["placements"].values():
        kind = placement if isinstance(placement, str) else placement["kind"]
        counts[kind] = counts.get(kind, 0) + 1
    for kind, count in counts.items():
        if page.locator(f'#loadout input[name="{kind}"]').count():
            label = {"tunnel": "Tunnel", "intersection": "Intersection", "bridge": "Bridge"}[kind]
            for _ in range(count // 2 if kind == "tunnel" else count):
                press(page.get_by_role("button", name="Add " + label, exact=True))
    press(page.locator("#start"))
    tunnel = []
    for index, placement in plan["placements"].items():
        kind = placement if isinstance(placement, str) else placement["kind"]
        if kind == "tunnel":
            tunnel.append(index)
        else:
            if kind != "bridge":
                press(page.locator(f'[data-tool="{kind}"]'))
            press(tile(page, index))
    if tunnel:
        press(page.locator('[data-tool="tunnel"]'))
        for index in tunnel:
            press(tile(page, index))


def finish(page, plan, tap=False):
    for route in plan["routes"]:
        for index in route["path"]:
            locator = tile(page, index)
            locator.tap() if tap else locator.click()
    button = page.locator("#check")
    button.tap() if tap else button.click()
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()


def test_campaign(browser, url):
    page = browser.new_page(viewport={"width": 1280, "height": 950}, reduced_motion="reduce")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url + BASE)
    expect(page.locator("#continue")).to_be_disabled()
    assert page.locator(".home-actions button").evaluate_all(
        "buttons => { const widths = buttons.map(b => b.getBoundingClientRect().width); "
        "return Math.max(...widths) - Math.min(...widths) < 0.1; }"
    )
    page.locator("#new-campaign").click()
    if page.locator("#intro-skip").is_visible():
        page.locator("#intro-skip").click()
    for index in range(12):
        plan = current_plan(page, index)
        assert plan["status"] == "solved"
        if index == 3:
            expect(page.locator("#mechanic-tip")).to_be_visible()
            page.locator("#try-lesson").click()
            expect(page.locator("#puzzle")).to_have_text("Forest Shortcut")
            page.locator("#return-lesson").click()
            expect(page.locator("#puzzle")).to_have_text("Dry Junction")
            expect(page.locator("#mechanic-tip")).to_be_hidden()
        prepare(page, plan)
        finish(page, plan)
        if index == 2:
            page.reload()
            page.locator("#continue").click()
            expect(page.locator("#puzzle")).to_have_text("Dry Junction")
        else:
            page.locator("#next").click()
    expect(page.locator("#home-total")).to_contain_text("Chapter One complete")
    page.locator("#new-campaign").click()
    expect(page.locator("#puzzle")).to_have_text("First Spark")
    page.locator("#home-button").click()
    page.locator("#stage-select").click()
    expect(page.locator("#stage-list button").last).to_be_enabled()
    page.locator("#stage-list button").last.click()
    expect(page.locator("#puzzle")).to_have_text("Grove Overlook")
    page.locator("#home-button").click()
    page.locator("#continue").click()
    expect(page.locator("#puzzle")).to_have_text("First Spark")
    assert not errors, errors
    page.close()


def test_mobile_resume(browser, offline, width, height):
    page = browser.new_page(viewport={"width": width, "height": height}, is_mobile=True, has_touch=True,
                            reduced_motion="reduce")
    page.context.set_offline(True)
    page.goto(offline.as_uri())
    page.locator("#settings").tap()
    page.locator("#music-enabled").uncheck()
    page.locator("#effects-enabled").uncheck()
    page.locator("#new-campaign").tap()
    plan = current_plan(page, 0)
    prepare(page, plan, tap=True)
    path = plan["routes"][0]["path"]
    for index in path[:2]:
        tile(page, index).tap()
    for _ in range(3):
        page.locator("#mobile-menu").tap()
        expect(page.locator("#game-menu")).to_be_visible()
        page.locator("#back-to-game").tap()
        expect(page.locator("#game-menu")).to_be_hidden()
        expect(tile(page, path[1]).locator(".track")).to_have_count(1)
    page.locator("#mobile-menu").tap()
    page.keyboard.press("Escape")
    expect(page.locator("#game-menu")).to_be_hidden()
    tile(page, path[2]).tap()
    page.reload()
    page.locator("#settings").tap()
    expect(page.locator("#music-enabled")).not_to_be_checked()
    expect(page.locator("#effects-enabled")).not_to_be_checked()
    page.locator("#continue").tap()
    expect(tile(page, path[2]).locator(".track")).to_have_count(1)
    for index in path[3:]:
        tile(page, index).tap()
    page.locator("#check").tap()
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
    page.locator("#home-button").tap()
    page.locator("#information").tap()
    expect(page.locator("#tutorial-list button")).to_have_count(18)
    page.locator("#tutorial-list button").last.tap()
    expect(page.locator("#puzzle")).to_have_text("Wind over the Rift")
    page.locator("#return-lesson").tap()
    page.locator("#continue").tap()
    expect(page.locator("#puzzle")).to_have_text("Twin Crossings")
    prepare(page, current_plan(page, 1), tap=True)
    page.locator("#mobile-menu").tap()
    page.locator("#back-to-game").tap()
    expect(tile(page, 65)).to_have_attribute("data-structure", "intersection")
    page.reload()
    page.locator("#continue").tap()
    expect(tile(page, 65)).to_have_attribute("data-structure", "intersection")
    page.close()


def test_keyboard_and_import(browser, url):
    page = browser.new_page(reduced_motion="reduce")
    page.goto(url + BASE)
    page.locator("#new-campaign").press("Enter")
    page.locator("#intro-skip").press("Enter")
    page.locator("#start").press("Enter")
    plan = current_plan(page, 0)
    path = plan["routes"][0]["path"]
    tile(page, path[0]).press("Enter")
    for previous, index in zip(path, path[1:]):
        direction = {1: "ArrowRight", -1: "ArrowLeft", 12: "ArrowDown", -12: "ArrowUp"}[index-previous]
        page.keyboard.press(direction)
        page.keyboard.press("Enter")
    page.locator("#check").press("Enter")
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
    page.locator("#custom-level summary").click()
    level = page.evaluate("EFLevels.prototype")
    page.locator("#import").set_input_files({"name": "wind.json", "mimeType": "application/json",
                                             "buffer": json.dumps(level).encode()})
    expect(page.locator("#puzzle")).to_have_text("Wind over the Rift")
    page.close()


def test_challenge_pack_offline(browser, offline):
    page = browser.new_page(viewport={"width": 390, "height": 844},
                            is_mobile=True, has_touch=True, reduced_motion="reduce")
    page.context.set_offline(True)
    page.goto(offline.as_uri())
    page.locator("#choose-challenge").tap()
    page.locator("#home-curated").tap()
    pack = page.evaluate("EFCurated")
    expect(page.locator("#puzzle")).to_contain_text(pack["stages"][0]["map"]["name"])
    plans = page.evaluate("EFCurated.stages.map(level => level.map.name === 'Scarce Crossing' ? EFChallenges.verifyScarce().solution : EFEngine.solveConstruction(EFMap.readLevel(level)))")
    assert all(plan and plan["status"] == "solved" for plan in plans)
    for i, plan in enumerate(plans):
        assert page.locator("#start").evaluate("e => e.getBoundingClientRect().bottom <= innerHeight")
        for tool in set(plan["placements"].values()):
            field = page.locator(f'#loadout input[name="{tool}"]')
            if field.count():
                assert field.evaluate("e => e.readOnly")
                for _ in range(list(plan["placements"].values()).count(tool)):
                    page.get_by_role("button", name="Add " + tool.title(), exact=True).tap()
        page.locator("#start").tap()
        for index, tool in plan["placements"].items():
            if tool != "bridge":
                page.locator(f'[data-tool="{tool}"]').tap()
            tile(page, index).tap()
        for route_index, current in enumerate(plan["routes"]):
            for step, index in enumerate(current["path"]):
                tile(page, index).tap()
                if i == 0 and route_index == 0 and step == 1:
                    page.reload()
                    page.locator("#choose-challenge").tap()
                    page.locator("#resume-challenge").tap()
                    expect(tile(page, index).locator(".track")).to_have_count(1)
        page.locator("#check").tap()
        expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
        if i < len(plans)-1:
            page.get_by_role("button", name="Next Stage").tap()
    expect(page.locator("#next")).to_be_disabled()
    expect(page.locator("#campaign-progress")).to_have_text("0 / 12 complete")
    assert not page.locator("#game-menu").evaluate("dialog => dialog.open")
    page.locator("#mobile-menu").tap()
    page.locator("#challenge-library summary").tap()
    page.locator("#pack-file").set_input_files({"name": "pack.json", "mimeType": "application/json",
                                               "buffer": json.dumps(pack).encode()})
    expect(page.locator("#puzzle")).to_contain_text(pack["stages"][0]["map"]["name"])
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
                    test_campaign(browser, url)
                    print("PASS all chapter stages, lesson return, replay isolation and new run")
                    test_mobile_resume(browser, offline, 390, 844)
                    test_mobile_resume(browser, offline, 844, 390)
                    print("PASS offline portrait and landscape touch, menu dismissal, resume and audio settings")
                    test_keyboard_and_import(browser, url)
                    print("PASS keyboard routing and editor import")
                    test_challenge_pack_offline(browser, offline)
                    print("PASS offline challenge pack, resume, next and pack import")
                    browser.close()
            finally:
                server.shutdown()
                thread.join()
