"""Developer story navigation and player-save isolation, using the real game UI."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import expect, sync_playwright

def run():
    root=Path(__file__).resolve().parents[2]
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(SimpleHTTPRequestHandler,directory=str(root)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            for viewport in [{"width":1280,"height":950},{"width":390,"height":844}]:
                page=browser.new_page(viewport=viewport,reduced_motion="reduce")
                errors=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                page.goto(f"http://127.0.0.1:{server.server_port}/game/index.html")
                page.locator("#title-enter").click()
                expect(page.locator("#developer-tools")).to_be_hidden()
                page.locator("#settings").click()
                control=page.locator("#settings-skip-tutorial-popups")
                if control.is_checked():control.uncheck()
                for _ in range(3):
                    control.check()
                    control.uncheck()
                snapshot=page.evaluate("JSON.stringify(localStorage)")
                page.locator("#studio-credit").click()
                expect(page.locator("#developer-tools")).to_be_visible()
                choices=page.locator("#stage-list button")
                expect(choices).to_have_count(121)
                choices.nth(35).click()
                expect(page.locator("#stage-number")).to_have_text("Chapter 3 · Stage 12")
                page.locator("#developer-complete").click()
                expect(page.locator("#world-intro")).to_be_visible()
                expect(page.locator("#intro-begin")).to_have_text("Enter the Archive")
                page.locator("#intro-begin").click()
                expect(page.locator("#world-intro-title")).to_have_text("The Archive of First Currents")
                page.get_by_role("button",name="Skip sequence").click()
                expect(page.locator("#stage-number")).to_have_text("Interlude · The Archive")
                page.locator("#developer-reset-stage").click()
                expect(page.locator("#stage-number")).to_have_text("Interlude · The Archive")
                page.locator("#developer-complete").click()
                expect(page.locator("#world-intro-title")).to_have_text("The Archive of First Currents")
                page.get_by_role("button",name="Skip sequence").click()
                expect(page.locator("#world-intro-title")).to_contain_text("Chapter 4")
                while page.locator("#intro-next").is_visible():
                    page.locator("#intro-next").click()
                page.locator("#intro-begin").click()
                expect(page.locator("#stage-number")).to_have_text("Chapter 4 · Stage 1")
                page.locator("#developer-exit-stage").click()
                expect(page.locator("#developer-tools")).to_be_hidden()
                page.locator("#stage-select").click()
                assert page.locator("#stage-list button").nth(35).is_disabled()
                assert page.evaluate("JSON.stringify(localStorage)")==snapshot
                assert not errors,errors
                page.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print("PASS: Stage 36, Archive, Chapter 4, reset, exit and storage isolation on desktop and mobile")

if __name__=="__main__":
    run()
