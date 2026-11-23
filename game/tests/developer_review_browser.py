"""Settings developer-review sequence: 3 check/uncheck cycles, then BC Shin Studio.

Runs against the regular game source pages. Review is transient and does not
mark Chapter 9 stages as completed.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os

from playwright.sync_api import expect, sync_playwright

ROOT=Path(__file__).resolve().parents[2]


def run():
    handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT))
    server=ThreadingHTTPServer(("127.0.0.1",0),handler)
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(
                headless=True,executable_path=os.environ.get("CHROMIUM_EXECUTABLE") or None
            )
            try:
                page=browser.new_page(viewport={"width":1280,"height":950},reduced_motion="reduce")
                errors=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                page.goto(f"http://127.0.0.1:{server.server_port}/game/index.html")
                page.locator("#title-enter").click()
                page.locator("#settings").click()
                credit=page.locator("#studio-credit")
                expect(page.locator("#settings-studio-credit")).to_have_count(0)
                control=page.locator("#settings-skip-tutorial-popups")
                expect(credit).to_be_visible()
                # Footer is inert when Settings is not the active panel.
                page.locator("#settings-back").click()
                credit.click()
                expect(page.locator("#home-start")).to_be_visible()
                page.locator("#settings").click()
                credit.click()
                expect(page.locator("#audio-settings")).to_be_visible()
                if control.is_checked():control.uncheck()
                for _ in range(2):
                    control.check()
                    control.uncheck()
                credit.click()
                expect(page.locator("#audio-settings")).to_be_visible()
                control.check()
                control.uncheck()
                credit.click()
                expect(page.locator("#stage-list")).to_be_visible()
                expect(page.locator("#stage-select")).to_contain_text("Review")
                choices=page.locator("#stage-list button")
                expect(choices).to_have_count(121)
                assert choices.evaluate_all("buttons=>buttons.every(button=>!button.disabled)")
                assert not any("✓" in choices.nth(i).inner_text() for i in range(108))

                choices.nth(96).click()
                expect(page.locator("#stage-number")).to_have_text("Chapter 9 · Stage 1")
                expect(page.locator("#puzzle")).to_have_text("The Alchemical Primer")
                assert not page.locator('#level option[value="107"]').is_disabled()
                page.locator("#level").select_option("107")
                expect(page.locator("#stage-number")).to_have_text("Chapter 9 · Stage 12")
                expect(page.locator("#puzzle")).to_contain_text("Grand Philosopher")
                page.locator("#level").select_option("96")

                page.locator("#start").click()
                def at(r,c):return (r-1)*12+c-1
                page.locator(f'#board [data-index="{at(9,7)}"]').click()
                assert page.locator(f'#board [data-index="{at(9,7)}"]').get_attribute("data-structure")=="bridge"
                routes=[
                    [(2,4),(3,4),(4,4),(5,4),(6,4)],
                    [(6,1),(6,2),(6,3),(6,4)],
                    [(6,4),(7,4),(8,4),(9,4),(9,5),(9,6),(9,7),(9,8),(9,9)],
                    [(2,11),(3,11),(4,11),(5,11),(6,11),(6,10),(6,9)],
                    [(5,7),(6,7),(6,8),(6,9)],
                    [(6,9),(5,9),(4,9),(3,9),(3,7),(3,6),(2,6),(2,5)]
                ]
                for route in routes:
                    previous=None
                    for r,c in route:
                        index=at(r,c)
                        target=page.locator(f'#board [data-index="{index}"]')
                        if (r,c)==(9,7):
                            page.locator(f'#board [data-index="{previous}"]').drag_to(target)
                        else:
                            target.click()
                        previous=index
                    assert page.locator("#status").inner_text()==""
                page.locator("#check").click()
                expect(page.get_by_role("heading",name="Delivery complete")).to_be_visible()
                assert not choices.nth(96).inner_text().endswith("✓")
                assert not errors,errors
                page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print("PASS: hidden review unlock, all 108 stages accessible, Stage 97 completion does not change progress")


if __name__=="__main__":
    run()
