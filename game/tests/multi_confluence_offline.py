"""Verify the actual standalone HTML editor and game with multi-chamber maps."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[2]
EDITOR=ROOT / os.environ.get("WELLSPRING_EDITOR","Wellspring_Multi_Confluence_Editor.html")
GAME=ROOT / os.environ.get("WELLSPRING_GAME","Wellspring_Multi_Confluence_Game.html")
SAMPLES=ROOT / "map-editor/examples"

def run():
    assert EDITOR.is_file() and GAME.is_file(),"Build both HTML files before this test"
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=os.environ.get("CHROMIUM_EXECUTABLE") or None)
        try:
            editor=browser.new_page(viewport={"width":1280,"height":950},accept_downloads=True)
            editor.goto(EDITOR.as_uri())
            editor.locator("#file").set_input_files(str(SAMPLES/"multi-confluence-cascade.map.json"))
            expect(editor.locator("#board .confluence-core")).to_have_count(3)
            editor.locator("#validate").click()
            expect(editor.locator("#messages")).to_contain_text("Ready to playtest")
            with editor.expect_download() as transfer:
                editor.locator("#saveLevel").click()
            assert transfer.value.suggested_filename.endswith(".level.json")
            editor.locator("#playMode").click()
            expect(editor.frame_locator("#playtest-frame").locator("#board .confluence-core")).to_have_count(3)
            editor.locator("#exit-playtest").click()
            editor.close()

            game=browser.new_page(viewport={"width":1280,"height":950})
            game.goto(GAME.as_uri())
            game.locator("#title-enter").click()
            game.evaluate("document.getElementById('home-custom').hidden = false")
            game.locator("#home-custom").click()
            game.locator("#home-import").set_input_files(str(SAMPLES/"multi-confluence-repeated-input.level.json"))
            expect(game.locator("#board .confluence-core")).to_have_count(2)
            game.locator("#start").click()
            for route in [
                [3,12,21],[39,30,21],[21,22,23,24],
                [45,46,47,48,57],[75,66,57],[57,58,59,60]
            ]:
                for index in route:
                    game.locator(f'#board [data-index="{index}"]').click()
            expect(game.locator("#board .confluence-ready")).to_have_count(2)
            game.locator("#check").click()
            expect(game.get_by_role("heading",name="Delivery complete")).to_be_visible()
            game.close()
        finally:
            browser.close()
    print("PASS: standalone offline editor import/verify/playtest/export and game repeated-route completion")

if __name__=="__main__":
    run()
