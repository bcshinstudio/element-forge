"""Browser integration: Confluence editor import/playtest, game routing, and exports."""
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
EXAMPLE = ROOT / "map-editor/examples/confluence-root-chamber.map.json"
LEVEL = ROOT / "map-editor/examples/confluence-root-chamber.level.json"


def trace(page, indices):
    for index in indices:
        page.locator(f'#board [data-index="{index}"]').click()


def test_game(browser, base):
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.goto(base + "/game/index.html")
    page.locator("#title-enter").click()
    page.locator("#home-custom").click()
    page.locator("#home-import").set_input_files(str(LEVEL))
    expect(page.locator("#puzzle")).to_have_text("Root Chamber – Confluence Introduction")
    chamber = page.locator('#board [data-index="24"]')
    expect(chamber.locator(".confluence-port")).to_have_count(3)
    assert chamber.locator(".port-N").inner_text() == "W"
    assert chamber.locator(".port-S").inner_text() == "E"
    assert chamber.locator(".port-E").inner_text() == "P"
    page.locator("#start").click()
    trace(page, [24, 25, 26, 27])  # Plant may be planned before either input.
    page.locator("#check").click()
    expect(page.locator("#status")).to_contain_text("water: missing route")
    trace(page, [3, 10, 17, 24])
    assert chamber.get_attribute("class").find("confluence-pending") >= 0
    trace(page, [45, 38, 31, 24])
    expect(chamber).to_have_class(__import__("re").compile(r".*confluence-ready.*"))
    page.locator("#check").click()
    expect(page.get_by_role("heading", name="Delivery complete")).to_be_visible()
    page.close()


def test_editor(browser, base):
    page = browser.new_page(viewport={"width": 1280, "height": 900}, accept_downloads=True)
    page.goto(base + "/map-editor/index.html")
    expect(page.locator('[data-tool="component:confluence"]')).to_have_count(1)
    page.locator("#file").set_input_files(str(EXAMPLE))
    expect(page.locator("#mapName")).to_have_value("Root Chamber – Confluence Introduction")
    expect(page.locator('#board [data-i="24"] .confluence-port')).to_have_count(3)
    page.locator("#validate").click()
    expect(page.locator("#messages")).to_contain_text("Ready to playtest")
    with page.expect_download() as transfer:
        page.locator("#saveLevel").click()
    assert transfer.value.suggested_filename.endswith(".level.json")
    page.locator("#playMode").click()
    frame = page.frame_locator("#playtest-frame")
    expect(frame.locator("#puzzle")).to_have_text("Root Chamber – Confluence Introduction")
    expect(frame.locator('#board [data-index="24"] .confluence-port')).to_have_count(3)
    page.locator("#exit-playtest").click()
    page.close()


if __name__ == "__main__":
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    worker = Thread(target=server.serve_forever, daemon=True)
    worker.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as play:
            browser = play.chromium.launch(
                headless=True,
                executable_path=os.environ.get("CHROMIUM_EXECUTABLE") or None
            )
            try:
                test_editor(browser, base)
                test_game(browser, base)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print("PASS: Confluence editor, export, playtest and game routes")
