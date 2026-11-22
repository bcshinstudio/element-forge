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
CAMPAIGN_KEY = "element-forge.sleeping-valley.v1"
PLANS = [
    plan
    for filename in ("sleeping-valley-solutions.json", "gatekeepers-solutions.json", "primeval-crucible-solutions.json", "astral-loom-solutions.json", "celestial-confluence-solutions.json", "weavers-playground-solutions.json", "shattered-abyss-solutions.json", "world-heart-sanctuary-solutions.json")
    for plan in json.loads((ROOT / "game/tests/fixtures" / filename).read_text())
]


def open_stage_two(page, tap=False):
    # Start these focused checks at Stage 2 with saved progress.
    page.evaluate("""key => {
        const stage = EFChapter.chapter[0];
        localStorage.setItem(key, JSON.stringify({
            version: 2, completed: [stage.id],
            campaign: {id: stage.id, rules: stage.rulesVersion, board: {phase: 'complete'}}
        }));
    }""", CAMPAIGN_KEY)
    page.reload()
    page.locator("#title-enter").click()
    button = page.locator("#continue")
    button.tap() if tap else button.click()

def tile(page, index):
    return page.locator(f'[data-index="{index}"]')


def current_plan(page, index):
    if 0 <= index < len(PLANS):
        return {"status": "solved", **PLANS[index]}
    return page.evaluate("index => EFEngine.solveConstruction(EFMap.readLevel([...EFChapter.chapter,...EFChapter.chapterTwo,...EFChapter.chapterThree,...EFChapter.chapterFour,...EFChapter.chapterFive,...EFChapter.chapterSix,...EFChapter.chapterSeven,...EFChapter.chapterEight][index]))", index)


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
            label = {"tunnel": "Tunnel", "portal": "Portal", "intersection": "Intersection", "bridge": "Bridge"}[kind]
            for _ in range(count // 2 if kind in ("tunnel", "portal") else count):
                press(page.get_by_role("button", name="Add " + label, exact=True))
    press(page.locator("#start"))
    links = {}
    for index, placement in plan["placements"].items():
        kind = placement if isinstance(placement, str) else placement["kind"]
        if kind in ("tunnel", "portal"):
            links.setdefault((kind, placement["pairId"]), []).append(index)
        else:
            if kind != "bridge":
                press(page.locator(f'[data-tool="{kind}"]'))
            press(tile(page, index))
    for (kind, _), openings in links.items():
        press(page.locator(f'[data-tool="{kind}"]'))
        for index in openings:
            press(tile(page, index))


def drag_route(page, path, touch=False):
    start = tile(page, path[0])
    start.scroll_into_view_if_needed()

    def center(index):
        box = tile(page, index).bounding_box()
        return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2

    if touch:
        # CDP can batch adjacent moves in a frame. Let the browser deliver each
        # move and finish its touch sequence before starting another gesture.
        frame = "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
        cdp = page.context.new_cdp_session(page)
        for step, index in enumerate(path):
            x, y = center(index)
            event = "touchStart" if step == 0 else "touchMove"
            cdp.send("Input.dispatchTouchEvent", {"type": event, "touchPoints": [{"x": x, "y": y}]})
            page.evaluate(frame)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        page.evaluate(frame)
        cdp.detach()
    else:
        page.mouse.move(*center(path[0]))
        page.mouse.down()
        for index in path[1:]:
            page.mouse.move(*center(index))
        page.mouse.up()


def trace_route(page, path, tap=False, after_step=None):
    step = 0
    while step < len(path):
        index = path[step]
        locator = tile(page, index)
        if step and locator.get_attribute("data-structure") == "bridge":
            end = step + 1
            while end < len(path) and tile(page, path[end]).get_attribute("data-structure") == "bridge":
                end += 1
            end = min(end + 1, len(path))
            drag_route(page, path[step - 1:end], tap)
        else:
            end = step + 1
            locator.tap() if tap else locator.click()
        if after_step:
            for traced in range(step, end):
                after_step(traced, path[traced])
        step = end


def finish(page, plan, tap=False):
    for route in plan["routes"]:
        trace_route(page, route["path"], tap)
    button = page.locator("#check")
    button.tap() if tap else button.click()
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()


def test_terrain_and_bridge(browser, offline):
    page = browser.new_page(viewport={"width": 1280, "height": 1080}, reduced_motion="reduce")
    page.goto(offline.as_uri())
    page.evaluate("""key => {
        const stages = EFChapter.chapter;
        localStorage.setItem(key, JSON.stringify({
            version: 2, completed: stages.slice(0, 8).map(stage => stage.id),
            campaign: {id: stages[8].id, rules: stages[8].rulesVersion}
        }));
    }""", CAMPAIGN_KEY)
    page.reload()
    page.locator("#title-enter").click()
    page.locator("#continue").click()
    expect(page.locator("#puzzle")).to_have_text("Rust-Silt Gorge")
    prepare(page, {"placements": {}})
    for index in [19, 7, 6, 5, 4, 3, 2, 14, 13, 25, 37, 49]:
        tile(page, index).click()
    tile(page, 49).drag_to(tile(page, 61))
    expect(page.locator("#status")).to_contain_text("Earth cannot use ordinary bridges.")
    tile(page, 61).click()
    expect(tile(page, 61)).to_have_attribute("data-structure", "bridge")
    expect(tile(page, 61).locator(".track")).to_have_count(0)
    page.locator("#undo").click()
    expect(page.locator("#bridge-count")).to_have_text("Bridges left: 0")
    tile(page, 61).click()
    expect(page.locator("#bridge-count")).to_have_text("Bridges left: 1")
    tile(page, 61).click()
    expect(tile(page, 61)).to_have_attribute("data-structure", "bridge")
    page.locator("#home-button").click()
    page.locator("#stage-select").click()
    page.locator("#stage-list button").first.click()
    prepare(page, {"placements": {}})
    for index in [21, 20, 19]:
        tile(page, index).click()
    expect(page.locator("#status")).to_have_text("Fire cannot cross mountains.")
    page.close()


def test_stage_controls(browser, offline, touch):
    viewport = {"width": 360, "height": 760} if touch else {"width": 1280, "height": 920}
    page = browser.new_page(viewport=viewport, is_mobile=touch, has_touch=touch, reduced_motion="reduce")
    press = lambda locator: locator.tap() if touch else locator.click()
    page.goto(offline.as_uri())
    press(page.locator("#title-enter"))
    press(page.locator("#information"))
    press(page.locator("summary").filter(has_text="Quick Reference"))
    expect(page.locator("#information-reference table")).to_have_count(2)
    expect(page.locator("#information-reference tbody tr")).to_have_count(23)
    press(page.locator("#info-back"))
    press(page.locator("#new-campaign"))
    press(page.locator("#intro-next"))
    press(page.locator("#intro-begin"))
    expect(page.locator("#stage-number")).to_have_text("Chapter 1 · Stage 1")
    assert page.locator(".stage-actions").evaluate("e => e.getBoundingClientRect().right <= innerWidth")
    press(page.locator("#story-toggle"))
    expect(page.locator("#stage-story")).to_contain_text("collapsed aqueduct")
    expect(page.locator("#stage-story")).to_be_visible()
    press(page.locator("#story-toggle"))
    expect(page.locator("#stage-story")).to_be_hidden()
    expect(page.locator("#stage-note")).to_contain_text("P crosses forest")
    press(page.locator("#stage-tip"))
    expect(page.locator("#stage-reference tbody tr")).to_have_count(4)
    press(page.locator("#close-stage-help"))
    prepare(page, {"placements": {}}, tap=touch)
    board = page.locator("#board")
    width = board.bounding_box()["width"]
    # The approved Ashwood solution carries Plant over a bridge.
    route = next(r["path"] for r in PLANS[0]["routes"] if r["element"] == "nature")
    path = route[2:5]
    bridge = path[1]
    trace_route(page, route[:3], tap=touch)
    press(tile(page, bridge))
    assert abs(board.bounding_box()["width"] - width) < 0.5
    drag_route(page, path, touch)
    expect(tile(page, bridge)).to_have_attribute("data-structure", "bridge")
    expect(tile(page, bridge).locator(".track")).to_have_count(1)
    expect(tile(page, path[2]).locator(".track")).to_have_count(1)
    def check_plant(step, index):
        assert tile(page, index).locator(".track").count(), (touch, step, index, page.locator("#status").text_content())
    trace_route(page, route[5:], tap=touch, after_step=check_plant)
    expect(tile(page, route[-1]).locator(".track")).to_have_count(1)
    press(tile(page, bridge))
    expect(tile(page, bridge)).to_have_attribute("data-structure", "")
    expect(tile(page, path[2]).locator(".track")).to_have_count(0)
    expect(page.locator("#bridge-count")).to_have_text("Bridges left: 1")
    expect(page.locator("#status")).to_have_text("Bridge removed. Route cleared.")
    press(page.locator("#undo-bridge"))
    expect(page.locator("#undo-bridge")).to_be_hidden()
    expect(tile(page, bridge)).to_have_attribute("data-structure", "bridge")
    expect(tile(page, path[2]).locator(".track")).to_have_count(1)
    press(page.locator("#replan"))
    expect(page.locator("#restart-confirm")).to_be_visible()
    cancel = page.locator('#restart-confirm [value="cancel"]')
    confirm = page.locator('#restart-confirm [value="restart"]')
    assert abs(cancel.bounding_box()["width"] - confirm.bounding_box()["width"]) < 0.5
    press(page.locator('#restart-confirm [value="cancel"]'))
    expect(tile(page, path[2]).locator(".track")).to_have_count(1)
    press(page.locator("#replan"))
    press(page.locator('#restart-confirm [value="restart"]'))
    expect(tile(page, path[2]).locator(".track")).to_have_count(0)
    expect(page.locator("#bridge-count")).to_have_text("Bridges left: 1")
    expect(page.locator("#check")).to_be_visible()
    page.close()


def test_opening(browser, offline, width, height, touch):
    page = browser.new_page(viewport={"width": width, "height": height},
                            is_mobile=touch, has_touch=touch, reduced_motion="reduce")
    page.context.set_offline(True)
    press = lambda selector: page.locator(selector).tap() if touch else page.locator(selector).press("Enter")
    page.goto(offline.as_uri())
    press("#title-enter")
    expect(page.locator("#title-screen")).to_be_hidden()
    press("#new-campaign")
    expect(page.locator("#world-intro-title")).to_have_text("Chapter 1 · The Sleeping Valley")
    expect(page.locator("#play-view")).to_be_hidden()
    expect(page.locator("#story-line")).to_contain_text("I’m Jeeah")
    press("#intro-next")
    expect(page.locator("#story-caption")).to_have_text("The dormant Awakening Heart")
    assert page.locator("#intro-begin").evaluate(
        "button => { const r = button.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }"
    )
    press("#intro-begin")
    expect(page.locator("#puzzle")).to_have_text("Sunken Ashwood")
    plan = current_plan(page, 0)
    prepare(page, plan, tap=touch)
    path = plan["routes"][0]["path"]
    for index in path[:2]:
        press(f'[data-index="{index}"]')
    expect(tile(page, path[1]).locator(".track")).to_have_count(1)
    page.reload()
    press("#title-enter")
    expect(page.locator("#title-screen")).to_be_hidden()
    press("#new-campaign")
    expect(page.locator("#new-game-confirm")).to_be_visible()
    press("#new-game-cancel")
    expect(page.locator("#new-game-confirm")).to_be_hidden()
    press("#new-campaign")
    press("#new-game-start")
    press("#intro-next")
    press("#intro-back")
    expect(page.locator("#story-line")).to_contain_text("I’m Jeeah")
    press("#intro-back")
    expect(page.locator("#world-intro")).to_be_hidden()
    press("#continue")
    expect(page.locator("#world-intro")).to_be_hidden()
    expect(tile(page, path[1]).locator(".track")).to_have_count(1)
    for index in plan["placements"]:
        assert tile(page, index).get_attribute("data-structure")
    page.close()


def test_campaign(browser, url):
    page = browser.new_page(viewport={"width": 1280, "height": 950}, reduced_motion="reduce")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url + BASE)
    title_enter = page.locator("#title-enter")
    expect(title_enter).to_be_visible()
    title_enter.hover()
    page.mouse.down()
    expect(title_enter).to_have_css("background-color", "rgba(0, 0, 0, 0.27)")
    page.mouse.up()
    expect(page.locator("#title-screen")).to_be_hidden()
    expect(page.locator("#continue")).to_be_disabled()
    assert page.locator(".home-actions button").evaluate_all(
        "buttons => { const widths = buttons.map(b => b.getBoundingClientRect().width); "
        "return Math.max(...widths) - Math.min(...widths) < 0.1; }"
    )
    page.locator("#new-campaign").click()
    page.locator("#intro-next").click()
    page.locator("#intro-begin").click()
    expect(page.locator("#puzzle")).to_have_text("Sunken Ashwood")
    for index in range(len(PLANS)):
        expect(page.locator("#stage-number")).to_have_text(f"Chapter {index // 12 + 1} · Stage {index % 12 + 1}")
        if index == 14:
            expect(page.locator("#level option:checked")).to_contain_text("15. The Smelter")
            for width in (1280, 320):
                page.set_viewport_size({"width": width, "height": 950})
                title = page.locator("#puzzle").bounding_box()
                actions = page.locator(".stage-actions").bounding_box()
                number = page.locator("#stage-number").bounding_box()
                assert number["x"] + number["width"] <= actions["x"]
                assert actions["y"] <= number["y"] <= actions["y"] + actions["height"]
                assert title["y"] >= actions["y"] + actions["height"] - 0.5
                assert title["width"] > actions["x"] - title["x"]
                assert actions["x"] + actions["width"] <= width
                page.locator("#story-toggle").click()
                expect(page.locator("#stage-story")).to_be_visible()
                page.locator("#story-toggle").click()
                expect(page.locator("#stage-story")).to_be_hidden()
            page.set_viewport_size({"width": 1280, "height": 950})
        plan = current_plan(page, index)
        assert plan["status"] == "solved"
        prepare(page, plan)
        if index == 2:
            checkpoints = page.locator("#board .badge-checkpoint")
            assert checkpoints.count()
            expect(page.locator("#board .badge-checkpoint[data-visited]")).to_have_count(0)
            light = next(route["path"] for route in plan["routes"] if route["element"] == "light")
            checkpoint_step = next(step for step, cell in enumerate(light)
                                   if tile(page, cell).locator(".badge-checkpoint").count())
            checkpoint = tile(page, light[checkpoint_step]).locator(".badge-checkpoint")
            trace_route(page, light[:checkpoint_step + 1])
            expect(checkpoint).to_have_attribute("data-visited", "true")
            tile(page, light[checkpoint_step - 1]).click()
            expect(checkpoint).not_to_have_attribute("data-visited", "true")
            for route in reversed(plan["routes"]):
                path = route["path"]
                trace_route(page, path[checkpoint_step - 1:] if path == light else path)
            expect(page.locator("#board .badge-checkpoint[data-visited]")).to_have_count(checkpoints.count())
            expect(page.locator("#board .crossing-over")).to_have_count(1)
            expect(page.locator("#board .crossing-under")).to_have_count(1)
            expect(page.locator("#board .crossing-over .east")).to_be_visible()
            expect(page.locator("#board .crossing-under .dot")).to_be_hidden()
            directions = page.locator("#board .badge-arrow").evaluate_all(
                "badges => badges.map(badge => [badge.dataset.direction, getComputedStyle(badge).transform])"
            )
            assert directions
            assert all((matrix == "none") == (direction == "E") for direction, matrix in directions)
            page.locator("#check").click()
            expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
        else:
            finish(page, plan)
        if (index + 1) % 12:
            page.locator("#next").click()
            continue
        expect(page.locator("#next")).to_have_text("Chapter Ending")
        page.locator("#next").click()
        expect(page.locator("#world-intro")).to_be_visible()
        expect(page.locator("#story-skip")).to_be_disabled()
        if index in [11, 23, 95]:
            page.locator("#intro-next").click()
        if index == 95:
            expect(page.locator("#story-caption")).to_have_text("Chapter 8 Complete")
        page.locator("#intro-begin").click()
        if index != 95:
            expect(page.locator("#world-intro-title")).to_contain_text(f"Chapter {(index + 1) // 12 + 1}")
            page.locator("#intro-begin").click()
    expect(page.locator("#home-total")).to_contain_text("Campaign complete")
    page.reload()
    page.locator("#title-enter").click()
    page.locator("#settings").click()
    expect(page.locator("#settings-skip-tutorial-popups")).not_to_be_checked()
    page.locator("#settings-back").click()
    page.locator("#new-campaign").click()
    page.locator("#intro-next").click()
    page.locator("#intro-begin").click()
    expect(page.locator("#puzzle")).to_have_text("Sunken Ashwood")
    page.locator("#home-button").click()
    page.locator("#stage-select").click()
    expect(page.locator("#stage-list button").last).to_be_enabled()
    page.locator("#stage-list button").last.click()
    expect(page.locator("#puzzle")).to_have_text("The World-Heart")
    page.locator("#home-button").click()
    page.locator("#continue").click()
    expect(page.locator("#puzzle")).to_have_text("Sunken Ashwood")
    assert not errors, errors
    page.close()


def test_android_report(browser, offline):
    context = browser.new_context(viewport={"width": 393, "height": 720},
                                  is_mobile=True, has_touch=True, reduced_motion="reduce")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(offline.as_uri())
    title = page.locator(".title-art").bounding_box()
    assert title["height"] >= 719 and title["width"] >= 392, title
    expect(page.locator(".portrait-enter")).to_be_visible()
    page.evaluate("""key => {
      const stage = EFChapter.chapter[1];
      localStorage.setItem(key, JSON.stringify({version:2, completed:[],
        campaign:{id:stage.id, rules:stage.rulesVersion}}));
    }""", CAMPAIGN_KEY)
    page.reload()
    page.locator("#title-enter").tap()
    page.locator("#continue").tap()
    expect(page.locator("#puzzle")).to_have_text("Sunken Ashwood")
    expect(page.locator("#status")).to_contain_text("first unfinished stage")

    open_stage_two(page, tap=True)
    plan = current_plan(page, 1)
    prepare(page, {**plan, "placements": {i: p for i, p in plan["placements"].items()
                                         if not isinstance(p, dict) or p["kind"] != "tunnel"}}, tap=True)
    for route in plan["routes"]:
        if route["element"] != "earth":
            for index in route["path"]:
                tile(page, index).tap()
    button = page.locator('[data-tool="tunnel"]')
    button.tap()
    expect(button).to_have_attribute("aria-pressed", "true")
    expect(page.locator("#status")).to_contain_text("beside the ridge")
    page.locator("#puzzle").tap()
    expect(button).to_have_attribute("aria-pressed", "true")
    tile(page, 0).tap()
    expect(page.locator("#status")).to_contain_text("open tunnel exit")
    expect(button).to_have_attribute("aria-pressed", "true")
    for index in (44, 92):
        tile(page, index).tap()
        if index == 44:
            expect(tile(page, index)).to_have_class(re.compile(r"\btunnel-preview\b"))
            expect(page.locator("#status")).to_contain_text("First opening selected")
            expect(tile(page, index)).to_have_attribute("data-structure", "tunnel")
            expect(tile(page, index).locator(".structure-art")).to_be_visible()
            expect(tile(page, 92)).to_have_attribute("data-structure", "")
            expect(button).to_contain_text("× 1")
            page.locator("#stage-tip").tap()
            expect(page.locator("#stage-reference")).to_contain_text("Wind cannot use it")
            page.locator("#toggle-reference").tap()
            expect(page.locator("#stage-help-title")).to_have_text("Quick Reference")
            page.locator("#close-stage-help").tap()
            expect(button).to_have_attribute("aria-pressed", "true")
            expect(tile(page, index)).to_have_class(re.compile(r"\btunnel-preview\b"))
    for index in (44, 92):
        expect(tile(page, index)).to_have_attribute("data-structure", "tunnel")
    for index in next(route["path"] for route in plan["routes"] if route["element"] == "earth"):
        tile(page, index).tap()
    page.locator("#check").tap()
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
    assert not errors, errors
    context.close()


def test_mobile_resume(browser, offline, width, height):
    page = browser.new_page(viewport={"width": width, "height": height}, is_mobile=True, has_touch=True,
                            reduced_motion="reduce")
    page.context.set_offline(True)
    page.goto(offline.as_uri())
    page.locator("#title-enter").click()
    page.locator("#settings").tap()
    page.locator("#music-enabled").uncheck()
    page.locator("#effects-enabled").uncheck()
    open_stage_two(page, tap=True)
    plan = current_plan(page, 1)
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
    page.locator("#title-enter").click()
    page.locator("#settings").tap()
    expect(page.locator("#music-enabled")).not_to_be_checked()
    expect(page.locator("#effects-enabled")).not_to_be_checked()
    expect(page.locator("#home-start")).to_be_hidden()
    page.locator("#settings-back").tap()
    page.locator("#continue").tap()
    expect(tile(page, path[2]).locator(".track")).to_have_count(1)
    trace_route(page, path[2:], tap=True)
    for route in plan["routes"][1:]:
        trace_route(page, route["path"], tap=True)
    page.locator("#check").tap()
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
    page.locator("#home-button").tap()
    page.locator("#information").tap()
    expect(page.locator("#tutorial-list button")).to_have_count(29)
    page.locator("#tutorial-list summary").filter(has_text="Wind practice").tap()
    page.locator("#tutorial-list button").filter(has_text="Wind over the Rift").tap()
    expect(page.locator("#puzzle")).to_have_text("Wind over the Rift")
    page.locator("#return-lesson").tap()
    expect(page.locator("#home-start")).to_be_hidden()
    page.locator("#info-back").tap()
    page.locator("#continue").tap()
    expect(page.locator("#puzzle")).to_have_text("The Sun-Dial Sanctum")
    expect(page.locator("#stage-note")).to_contain_text("L uses sunlit")
    expect(page.locator("#stage-note")).to_contain_text("E stays dry")
    prepare(page, current_plan(page, 2), tap=True)
    page.locator("#mobile-menu").tap()
    page.locator("#back-to-game").tap()
    expect(tile(page, 62)).to_have_attribute("data-structure", "intersection")
    page.reload()
    page.locator("#title-enter").click()
    page.locator("#continue").tap()
    expect(tile(page, 62)).to_have_attribute("data-structure", "intersection")
    page.close()


def test_keyboard_and_import(browser, url):
    page = browser.new_page(reduced_motion="reduce")
    page.goto(url + BASE)
    page.locator("#title-enter").click()
    open_stage_two(page)
    plan = current_plan(page, 1)
    prepare(page, plan)
    path = plan["routes"][0]["path"]
    tile(page, path[0]).press("Enter")
    previous, index = path[:2]
    direction = {1: "ArrowRight", -1: "ArrowLeft", 12: "ArrowDown", -12: "ArrowUp"}[index-previous]
    page.keyboard.press(direction)
    page.keyboard.press("Enter")
    expect(tile(page, index).locator(".track")).to_have_count(1)
    page.locator("#custom-level summary").click()
    level = page.evaluate("EFLevels.prototype")
    page.locator("#import").set_input_files({"name": "wind.json", "mimeType": "application/json",
                                             "buffer": json.dumps(level).encode()})
    expect(page.locator("#puzzle")).to_have_text("Wind over the Rift")
    expect(page.locator("#stage-number")).to_be_hidden()
    level = page.evaluate("""() => {
      const level = structuredClone(EFChapter.chapter[0]);
      const map = level.map;
      map.cells[16] = {terrain: 'water', component: 'bridge'};
      map.cells[130] = {terrain: 'mountain'};
      map.cells[129] = map.cells[131] = {terrain: 'land'};
      Object.assign(map.inventory, {bridge: 1, tunnel: 2, portal: 2});
      return level;
    }""")
    page.locator("#custom-level summary").click()
    page.locator("#import").set_input_files({"name": "bridge.json", "mimeType": "application/json",
                                             "buffer": json.dumps(level).encode()})
    prepare(page, {"placements": {}})
    tile(page, 16).click()
    expect(page.locator("#status")).to_have_text("This bridge is part of the stage.")
    tile(page, 50).click()
    expect(tile(page, 50)).to_have_attribute("data-structure", "bridge")
    for kind, origin in [("tunnel", 129), ("portal", 0)]:
        button = page.locator(f'[data-tool="{kind}"]')
        button.click()
        tile(page, origin).click()
        expect(tile(page, origin)).to_have_class(re.compile("tunnel-preview"))
        tile(page, 50).click()
        expect(page.locator("#status")).to_contain_text(kind.capitalize() + " is selected.")
        expect(tile(page, origin)).to_have_class(re.compile("tunnel-preview"))
        expect(button).to_have_attribute("aria-pressed", "true")
        expect(tile(page, 50)).to_have_attribute("data-structure", "bridge")
        button.click()
    page.close()


def test_import_navigation(browser, offline, width, height, touch):
    page = browser.new_page(viewport={"width": width, "height": height}, is_mobile=touch,
                            has_touch=touch, reduced_motion="reduce")
    press = lambda locator: locator.tap() if touch else locator.click()
    page.context.set_offline(True)
    page.goto(offline.as_uri())
    page.locator("#title-enter").click()
    press(page.locator("#new-campaign"))
    press(page.locator("#intro-next"))
    press(page.locator("#intro-begin"))
    if touch:
        press(page.locator("#mobile-menu"))
    press(page.locator("#challenge-library summary"))
    original = ROOT / "game/tests/fixtures/original-harder-pack.json"
    page.locator("#pack-file").set_input_files(original)
    expect(page.locator("#puzzle")).to_have_text("Hard · Grove Crossing 1")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    for control in ["#mobile-menu", "#puzzle-home"]:
        assert page.locator(control).evaluate("e => e.getBoundingClientRect().top >= 0 && e.getBoundingClientRect().bottom <= innerHeight")
    press(page.locator("#mobile-menu"))
    press(page.locator("#menu-information"))
    expect(page.locator("#menu-lessons #tutorial-list button")).to_have_count(29)
    press(page.locator("#back-to-game"))
    expect(page.locator("#puzzle")).to_have_text("Hard · Grove Crossing 1")
    expect(page.locator("#start")).to_be_visible()
    press(page.locator("#puzzle-home"))
    press(page.locator("#choose-challenge"))
    expect(page.locator("#challenge-puzzles button")).to_have_count(6)
    page.reload()
    page.locator("#title-enter").click()
    press(page.locator("#choose-challenge"))
    press(page.locator("#challenge-puzzles button").first)
    expect(page.locator("#puzzle")).to_have_text("Hard · Grove Crossing 1")
    press(page.locator("#puzzle-home"))
    press(page.locator("#choose-challenge"))
    page.locator("#home-pack-file").set_input_files(ROOT / "game/tests/fixtures/revised-harder-pack.json")
    expect(page.locator("#challenge-puzzles button")).to_have_count(6)
    press(page.locator("#challenge-puzzles button").last)
    expect(page.locator("#puzzle")).to_have_text("Wide Relay")
    page.close()


def test_challenge_fallback(browser, url):
    page = browser.new_page()
    page.goto(url + BASE)
    page.locator("#title-enter").click()
    page.evaluate("EFChallenges.generate = () => ({pack:{stages:[]}})")
    page.locator("#choose-challenge").click()
    page.locator("#challenge-tier").select_option("Easy")
    page.locator("#generate-challenge").click()
    expect(page.locator("#challenge-status")).to_contain_text("No verified puzzle")
    page.locator("#challenge-tier").select_option("Hard")
    page.locator("#generate-challenge").click()
    expected = page.evaluate("EFRevisedBoards.pack.stages.find(s => s.difficulty === 'Hard').map.name")
    expect(page.locator("#puzzle")).to_have_text(expected)
    page.close()


def test_layout_migration(browser, url):
    page = browser.new_page()
    page.goto(url + BASE)
    page.locator("#title-enter").click()
    page.evaluate("""() => {
      const id = EFChapter.previousChapter[0].id;
      localStorage.setItem('element-forge.chapter-one.v1', JSON.stringify({
        version:2, completed:[id], best:{[id]:99},
        campaign:{id,rules:4,board:{phase:'build'}}
      }));
    }""")
    page.reload()
    page.locator("#title-enter").click()
    expect(page.locator("#continue")).to_be_disabled()
    page.locator("#stage-select").click()
    expect(page.locator("#stage-list button").first).to_contain_text("Sunken Ashwood")
    expect(page.locator("#stage-list button").nth(1)).to_be_disabled()
    assert page.evaluate("""() => Object.values(JSON.parse(
      localStorage.getItem('element-forge.chapter-one.v1')).best)[0] === 99""")
    page.close()


def test_challenge_pack_offline(browser, offline):
    page = browser.new_page(viewport={"width": 390, "height": 844},
                            is_mobile=True, has_touch=True, reduced_motion="reduce")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.context.set_offline(True)
    page.goto(offline.as_uri())
    page.locator("#title-enter").click()
    page.locator("#choose-challenge").tap()
    page.locator("#home-curated").tap()
    pack = page.evaluate("EFRevisedBoards.pack")
    expect(page.locator("#puzzle")).to_contain_text(pack["stages"][0]["map"]["name"])
    plans = page.evaluate("EFRevisedBoards.pack.stages.map(level => EFEngine.solveConstruction(EFMap.readLevel(level)))")
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
            def check_resume(step, index):
                expect(tile(page, index).locator(".track").first,
                       f'{pack["stages"][i]["map"]["name"]} {current["element"]} step {step}').to_be_visible()
                if i == 0 and route_index == 0 and step == 1:
                    page.reload()
                    page.locator("#title-enter").click()
                    page.locator("#choose-challenge").tap()
                    page.locator("#resume-challenge").tap()
                    expect(tile(page, index).locator(".track")).to_have_count(1)
            trace_route(page, current["path"], tap=True, after_step=check_resume)
        assert page.locator("#check").evaluate("button => button.classList.contains('ready')"), (
            pack["stages"][i]["map"]["name"], page.locator("#status").text_content(),
        )
        check = page.locator("#check")
        check.scroll_into_view_if_needed()
        check.tap()
        try:
            expect(page.locator("#phase")).to_have_text("Delivery complete")
        except AssertionError as failure:
            raise AssertionError((
                pack["stages"][i]["map"]["name"],
                page.locator("#phase").text_content(),
                page.locator("#status").text_content(),
                errors,
            )) from failure
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
    file = {"name": "pack.json", "mimeType": "application/json", "buffer": json.dumps(pack).encode()}
    page.locator("#mobile-menu").tap()
    page.locator("#custom-level summary").tap()
    page.locator("#import").set_input_files(file)
    expect(page.locator("#status")).to_contain_text("Imported")
    page.reload()
    page.locator("#title-enter").click()
    page.locator("#choose-challenge").tap()
    expect(page.locator("#challenge-puzzles button")).to_have_count(len(pack["stages"]))
    page.locator("#home-pack-file").set_input_files(file)
    expect(page.locator("#challenge-status")).to_contain_text("Choose one below")
    page.locator("#challenge-puzzles button").nth(1).tap()
    expect(page.locator("#puzzle")).to_have_text(pack["stages"][1]["map"]["name"])
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
                    for width, height, touch in [(1280, 950, False), (390, 844, True), (844, 390, True)]:
                        test_opening(browser, offline, width, height, touch)
                    print("PASS offline opening, restart cancellation and draft resume")
                    test_android_report(browser, offline)
                    print("PASS portrait title, recovery from a locked save, touch tunnel and Stage 2 completion")
                    test_challenge_pack_offline(browser, offline)
                    print("PASS offline challenge pack, resume, next and pack import")
                    test_terrain_and_bridge(browser, offline)
                    for touch in (False, True):
                        test_stage_controls(browser, offline, touch)
                    print("PASS stage story, reference, mouse and touch bridge gestures, and restart")
                    test_campaign(browser, url)
                    print("PASS Stages 1–96 clear, finale unlock, replay isolation and new run")
                    test_mobile_resume(browser, offline, 390, 844)
                    test_mobile_resume(browser, offline, 844, 390)
                    print("PASS offline portrait and landscape touch, menu dismissal, resume and audio settings")
                    test_keyboard_and_import(browser, url)
                    print("PASS keyboard routing and editor import")
                    test_challenge_fallback(browser, url)
                    print("PASS challenge fallback uses only the requested tier")
                    test_layout_migration(browser, url)
                    print("PASS clean campaign start and retention of original campaign save")
                    for width, height, touch in [(1280, 650, False), (390, 844, True), (844, 390, True)]:
                        test_import_navigation(browser, offline, width, height, touch)
                    print("PASS exact six-pack navigation on desktop and portrait/landscape touch")
                    browser.close()
            finally:
                server.shutdown()
                thread.join()
