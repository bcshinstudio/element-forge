"""Chapter 10 opt-in Shifting Phases end-to-end browser checks.

Covers map editor import/configuration/phase preview/export, game routes,
permanent completed Day delivery, Night terrain, and phone touch layout.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
from playwright.sync_api import expect, sync_playwright

ROOT=Path(__file__).resolve().parents[2]
EXAMPLE=ROOT/"map-editor/examples/phase-first-nightfall.map.json"
LEVEL=ROOT/"map-editor/examples/phase-first-nightfall.level.json"
STANDALONE=ROOT/"Wellspring_Shifting_Phases_Preview.html"
EDITOR_OFFLINE=ROOT/"Wellspring_Shifting_Phases_Map_Editor.html"

def test_editor(browser,url,mobile=False):
    page=browser.new_page(viewport={"width":390,"height":844} if mobile else {"width":1280,"height":930},
        is_mobile=mobile,has_touch=mobile,accept_downloads=True)
    errors=[];page.on("pageerror",lambda err:errors.append(str(err)))
    page.goto(url)
    expect(page.locator("#phase-enabled")).not_to_be_checked()
    page.locator("#phase-enabled").check()
    expect(page.locator("#phase-preview")).to_be_enabled()
    page.locator("#phase-preview").select_option("night")
    page.locator("#phase-preview").select_option("day")
    page.once("dialog",lambda dialog:dialog.accept())
    page.locator("#file").set_input_files(str(EXAMPLE))
    expect(page.locator("#phase-enabled")).to_be_checked()
    expect(page.locator("#mapName")).to_have_value("First Nightfall")
    expect(page.locator('#board [data-i="9"]')).to_have_class(__import__("re").compile(".*exposed.*"))
    expect(page.locator('#board [data-i="9"] .phase-mark')).to_have_text("↔")
    expect(page.locator('#board [data-i="10"] .phase-plate-editor')).to_be_visible()
    page.locator("#phase-preview").select_option("night")
    expect(page.locator('#board [data-i="9"]')).to_have_class(__import__("re").compile(".*covered.*"))
    page.locator("#phase-preview").select_option("day")
    page.locator("#validate").click()
    expect(page.locator("#messages")).to_contain_text("Ready to playtest")
    with page.expect_download() as download:
        page.locator("#saveLevel").click()
    assert download.value.suggested_filename.endswith(".level.json")
    page.locator("#playMode").click()
    frame=page.frame_locator("#playtest-frame")
    expect(frame.locator("#puzzle")).to_have_text("First Nightfall")
    expect(frame.locator("#phase-indicator")).to_contain_text("Day")
    page.locator("#exit-playtest").click()
    assert not errors,errors
    page.close()

def test_game(browser,url,touch):
    context=browser.new_context(viewport={"width":390,"height":844} if touch else {"width":1280,"height":930},
        is_mobile=touch,has_touch=touch,reduced_motion="reduce")
    page=context.new_page();errors=[];page.on("pageerror",lambda err:errors.append(str(err)))
    press=lambda loc:loc.tap() if touch else loc.click()
    page.goto(url)
    press(page.locator("#title-enter"))
    page.evaluate("document.getElementById('home-custom').hidden=false")
    press(page.locator("#home-custom"))
    page.locator("#home-import").set_input_files(str(LEVEL))
    expect(page.locator("#puzzle")).to_have_text("First Nightfall")
    expect(page.locator("#phase-indicator")).to_contain_text("Day")
    expect(page.locator("#phase-indicator")).to_be_visible()
    expect(page.locator('#board [data-index="38"]')).to_have_class(__import__("re").compile(".*exposed.*"))
    press(page.locator("#start"))
    for i in [8,9,10,11,12]:
        press(page.locator(f'#board [data-index="{i}"]'))
    expect(page.locator("#phase-indicator")).to_contain_text("Night")
    expect(page.locator('#board [data-index="38"]')).to_have_class(__import__("re").compile(".*covered.*"))
    expect(page.locator('#board [data-index="9"]')).to_have_class(__import__("re").compile(".*covered.*"))
    assert page.locator('#board [data-index="9"] .track[data-element="light"]').count()==1
    assert page.locator("#phase-indicator").evaluate("e=>e.getBoundingClientRect().right <= innerWidth")
    for i in [36,37,38,39,40]:
        press(page.locator(f'#board [data-index="{i}"]'))
    press(page.locator("#check"))
    expect(page.get_by_role("heading",name="Delivery complete")).to_be_visible()
    expect(page.locator("#phase-indicator")).to_contain_text("Night")
    assert not errors,errors
    context.close()

if __name__=="__main__":
    handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT))
    server=ThreadingHTTPServer(("127.0.0.1",0),handler)
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,
                executable_path=os.environ.get("CHROMIUM_EXECUTABLE") or None)
            try:
                base=f"http://127.0.0.1:{server.server_port}"
                editors=[base+"/map-editor/index.html"]
                if EDITOR_OFFLINE.is_file():editors.append(EDITOR_OFFLINE.as_uri())
                for editor_url in editors:
                    for mobile in (False,True):test_editor(browser,editor_url,mobile)
                urls=[base+"/game/index.html"]
                if STANDALONE.is_file():urls.append(STANDALONE.as_uri())
                for url in urls:
                    for mobile in (False,True):test_game(browser,url,mobile)
            finally:browser.close()
    finally:
        server.shutdown();server.server_close()
    print("PASS: Shifting Phases editor, verified level export/playtest, desktop/phone gameplay, permanent Day route")
