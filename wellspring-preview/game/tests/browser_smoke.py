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


def finish(page, plan, tap=False):
    for route in plan["routes"]:
        for index in route["path"]:
            locator = tile(page, index)
            locator.tap() if tap else locator.click()
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
        plan = current_plan(page, index)
        assert plan["status"] == "solved"
        prepare(page, plan)
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
    for index in path[3:]:
        tile(page, index).tap()
    for route in plan["routes"][1:]:
        for index in route["path"]:
            tile(page, index).tap()
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
            for step, index in enumerate(current["path"]):
                tile(page, index).tap()
                if i == 0 and route_index == 0 and step == 1:
                    page.reload()
                    page.locator("#title-enter").click()
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
                    test_terrain_and_bridge(browser, offline)
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
                    test_challenge_pack_offline(browser, offline)
                    print("PASS offline challenge pack, resume, next and pack import")
                    browser.close()
            finally:
                server.shutdown()
                thread.join()
