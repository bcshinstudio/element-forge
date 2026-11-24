"""Browser checks for the live Garden artwork editing workflow."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect
import json

root=Path(__file__).resolve().parents[2]
server=ThreadingHTTPServer(("127.0.0.1",0),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch()
        for viewport in [{"width":1440,"height":1000},{"width":390,"height":844}]:
            page=browser.new_page(viewport=viewport,accept_downloads=True)
            errors=[]
            page.on("pageerror",lambda e:errors.append(str(e)))
            page.goto(f"http://127.0.0.1:{server.server_port}/mapeditor/")
            expect(page.locator("#board [data-i]")).to_have_count(144)
            page.locator("#art-palette").select_option("12")
            page.locator("#apply-palette").click()
            expect(page.locator("#node-appearance")).to_have_value("garden")
            page.locator('[data-tool="terrain:wall"]').click()
            for i in range(9):
                item=page.locator(f'#paint-images-grid [data-art-id="garden-heart-dormant-{i+1}"]')
                item.click()
                page.locator(f'#board [data-i="{(i//3+4)*12+i%3+4}"]').click()
                expect(page.locator(f'#board [data-i="{(i//3+4)*12+i%3+4}"] [data-art-id="garden-heart-dormant-{i+1}"]')).to_have_count(0)
            page.locator('[data-tool="node:source"]').click()
            page.locator('[data-element="fire"]').click()
            page.locator('#board [data-i="0"]').click()
            page.locator('[data-tool="node:destination"]').click()
            page.locator('#board [data-i="1"]').click()
            expect(page.locator('#board [data-i="0"] img.library-node-art')).to_have_attribute("data-art-id","garden-source-fire")
            expect(page.locator('#board [data-i="1"] img.library-node-art')).to_have_attribute("data-art-id","garden-inlet-fire")
            expect(page.locator('#board [data-i="1"]')).to_have_attribute("aria-label","Row 1, column 2, fire inlet")
            assert page.locator('#board [data-i="0"] img.library-node-art').evaluate('(img)=>img.complete && img.naturalWidth>0')
            assert page.locator('#board [data-i="1"] img.library-node-art').evaluate('(img)=>img.complete && img.naturalWidth>0')
            with page.expect_download() as info: page.locator("#save").click()
            result=json.loads(Path(info.value.path()).read_text())
            assert result["artPalette"]==12 and result["nodeAppearance"]=="garden"
            for i in range(9):
                assert result["cells"][(i//3+4)*12+i%3+4]["terrainArt"]["id"]==f"garden-heart-dormant-{i+1}"
            assert result["cells"][1]["node"]["role"]=="destination"
            page.locator("#playMode").click()
            expect(page.locator("#playtest-panel")).to_be_visible()
            page.locator("#exit-playtest").click()
            expect(page.locator("#board")).to_be_visible()
            assert not errors,errors
            page.close()
        browser.close()
finally:
    server.shutdown()
