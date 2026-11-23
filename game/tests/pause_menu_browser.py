"""Verify improved pause menu + information/tutorials on desktop and phones.

Use the same static HTML output that will be published to GitHub Pages.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os

from playwright.sync_api import expect, sync_playwright

ROOT=Path(__file__).resolve().parents[2]
BUILT=ROOT/"Wellspring_Pause_Menu_Preview.html"

def open_game(page):
    page.locator("#title-enter").click()
    page.locator("#new-campaign").click()
    page.locator("#intro-next").click()
    page.locator("#intro-begin").click()
    expect(page.locator("#play-view")).to_be_visible()

def assert_fits_viewport(page, selector):
    box=page.locator(selector).bounding_box()
    assert box, f"{selector} has no box"
    width=page.evaluate("window.innerWidth")
    height=page.evaluate("window.innerHeight")
    assert box["x"]>=-1 and box["x"]+box["width"]<=width+1, (selector,box,width)
    assert box["y"]>=-1 and box["y"]+box["height"]<=height+1,(selector,box,height)

def check(browser,url,width,height,touch):
    context=browser.new_context(
        viewport={"width":width,"height":height},is_mobile=touch,has_touch=touch,
        reduced_motion="reduce")
    page=context.new_page()
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.goto(url)
    open_game(page)
    press=lambda element: element.tap() if touch else element.click()
    if touch:
        press(page.locator("#mobile-menu"))
    else:
        page.evaluate("document.getElementById('game-menu').showModal()")
    expect(page.locator("#game-menu")).to_be_visible()
    expect(page.locator("#game-menu-title")).to_have_text("Game menu")
    expect(page.locator("#menu-main")).to_be_visible()
    expect(page.locator("#menu-lessons")).to_be_hidden()
    expect(page.locator("#back-to-game")).to_be_visible()
    for selector in ("#back-to-game","#menu-home","#menu-information"):
        expect(page.locator(selector)).to_be_visible()
        assert page.locator(selector).evaluate("e=>e.getBoundingClientRect().height>=44")
    assert_fits_viewport(page,"#game-menu")
    # Both actions are stacked, not irregularly wrapped as before.
    first=page.locator("#menu-home").bounding_box()
    second=page.locator("#menu-information").bounding_box()
    assert second["y"]>first["y"]+first["height"]-1,(first,second)
    assert abs(second["width"]-first["width"])<2,(first,second)
    press(page.locator("#menu-information"))
    expect(page.locator("#game-menu-title")).to_have_text("Information & Tutorials")
    expect(page.locator("#menu-main")).to_be_hidden()
    expect(page.locator("#menu-lessons")).to_be_visible()
    expect(page.locator("#menu-lessons-back")).to_be_visible()
    expect(page.locator("#menu-lessons #information-panel")).to_be_visible()
    expect(page.locator("#menu-lessons #tutorial-list button")).to_have_count(29)
    expect(page.locator("#menu-lessons #information-reference table")).to_have_count(2)
    assert_fits_viewport(page,"#game-menu")
    press(page.locator("#menu-lessons-back"))
    expect(page.locator("#menu-main")).to_be_visible()
    expect(page.locator("#menu-lessons")).to_be_hidden()
    expect(page.locator("#game-menu-title")).to_have_text("Game menu")
    press(page.locator("#menu-information"))
    press(page.locator("#back-to-game"))
    expect(page.locator("#game-menu")).to_be_hidden()
    expect(page.locator("#play-view")).to_be_visible()
    # The information panel must return to its home container after close.
    assert page.locator("#information-panel").evaluate("e=>e.parentElement.id==='home-support'")
    if touch:
        press(page.locator("#mobile-menu"))
        expect(page.locator("#game-menu-title")).to_have_text("Game menu")
        press(page.locator("#menu-home"))
        expect(page.locator("#home")).to_be_visible()
        expect(page.locator("#game-menu")).to_be_hidden()
    assert not errors,errors
    context.close()

if __name__=="__main__":
    handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT))
    server=ThreadingHTTPServer(("127.0.0.1",0),handler)
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser=playwright.chromium.launch(
                headless=True,executable_path=os.environ.get("CHROMIUM_EXECUTABLE") or None)
            try:
                urls=[f"http://127.0.0.1:{server.server_port}/game/index.html"]
                if BUILT.exists(): urls.append(BUILT.as_uri())
                for url in urls:
                    for width,height,touch in [(1280,900,False),(390,844,True),(844,390,True)]:
                        check(browser,url,width,height,touch)
            finally:
                browser.close()
    finally:
        server.shutdown();server.server_close()
    print("PASS pause menu and tutorial navigation, desktop + phone portrait/landscape, source + standalone")
