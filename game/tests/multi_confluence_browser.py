"""Browser regression for multiple chambers, chained output and repeated element routes."""
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PLANS = {
    "multi-confluence-twin-chambers": [
        [3,12,21],[28,29,30,21],[21,22,23,24],
        [39,48,57],[75,66,57],[57,58,59,60]
    ],
    "multi-confluence-repeated-input": [
        [3,12,21],[39,30,21],[21,22,23,24],
        [45,46,47,48,57],[75,66,57],[57,58,59,60]
    ],
    "multi-confluence-cascade": [
        [2,14,26],[50,38,26],[26,27,28,29,30,42],
        [66,54,42],[42,43,44,45,57,69],[93,81,69],[69,70,71]
    ]
}

def check_editor(browser, base):
    page = browser.new_page(viewport={"width":1280,"height":950},accept_downloads=True)
    page.goto(base+"/map-editor/index.html")
    for name in PLANS:
        page.locator("#file").set_input_files(str(ROOT/"map-editor/examples"/(name+".map.json")))
        assert page.locator("#mapName").input_value()
        count = 3 if name=="multi-confluence-cascade" else 2
        expect(page.locator("#board .confluence-core")).to_have_count(count)
        page.locator("#validate").click()
        expect(page.locator("#messages")).to_contain_text("Ready to playtest")
        with page.expect_download() as download:
            page.locator("#saveLevel").click()
        assert download.value.suggested_filename.endswith(".level.json")
        page.locator("#playMode").click()
        frame = page.frame_locator("#playtest-frame")
        expect(frame.locator("#board .confluence-core")).to_have_count(count)
        page.locator("#exit-playtest").click()
    page.close()

def check_game(browser, base):
    for name,paths in PLANS.items():
        page = browser.new_page(viewport={"width":1280,"height":950})
        page.goto(base+"/game/index.html")
        page.locator("#title-enter").click()
        page.evaluate("document.getElementById('home-custom').hidden = false")
        page.locator("#home-custom").click()
        page.locator("#home-import").set_input_files(
            str(ROOT/"map-editor/examples"/(name+".level.json"))
        )
        expected = 3 if name=="multi-confluence-cascade" else 2
        expect(page.locator("#board .confluence-core")).to_have_count(expected)
        page.locator("#start").click()
        for path in paths:
            for index in path:
                page.locator(f'#board [data-index="{index}"]').click()
        expect(page.locator("#board .confluence-ready")).to_have_count(expected)
        page.locator("#check").click()
        expect(page.get_by_role("heading",name="Delivery complete")).to_be_visible()
        page.close()

if __name__ == "__main__":
    handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT))
    server=ThreadingHTTPServer(("127.0.0.1",0),handler)
    Thread(target=server.serve_forever,daemon=True).start()
    base=f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,executable_path=os.environ.get("CHROMIUM_EXECUTABLE") or None)
            try:
                check_editor(browser,base)
                check_game(browser,base)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print("PASS: three multi-chamber maps: editor, verification, export, playtest and gameplay")
