"""Chapter 9 browser regression: saved progress migration, all 12 puzzles and finale."""
import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import expect, sync_playwright
from browser_smoke import prepare, finish

ROOT=Path(__file__).resolve().parents[2]
PLANS=json.loads((ROOT/"game/tests/fixtures/confluence-forges-solutions.json").read_text())
KEY="element-forge.sleeping-valley.v1"

def test_chapter(browser,base):
    page=browser.new_page(viewport={"width":1280,"height":950},reduced_motion="reduce")
    errors=[]
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(base+"/game/index.html")
    page.evaluate("""key => {
      const old=[EFChapter.chapter, EFChapter.chapterTwo, EFChapter.chapterThree,
        EFChapter.chapterFour, EFChapter.chapterFive, EFChapter.chapterSix,
        EFChapter.chapterSeven, EFChapter.chapterEight].flat();
      const last=old.at(-1);
      localStorage.setItem(key,JSON.stringify({
        version:2,completed:old.map(level=>level.id),selected:last.id,
        campaign:{id:last.id,rules:last.rulesVersion,layout:last.layout??1,
          board:{version:1,phase:'complete'}}
      }));
    }""", KEY)
    page.reload()
    page.locator("#title-enter").click()
    expect(page.locator("#home-total")).to_contain_text("Stage 97 of 121")
    page.locator("#continue").click()
    expect(page.locator("#world-intro-title")).to_contain_text("Chapter 9")
    expect(page.locator("#story-caption")).to_have_text("The pulse beyond the Sanctuary")
    page.locator("#intro-next").click()
    expect(page.locator("#story-caption")).to_have_text("The crystalline reaction chambers")
    page.locator("#intro-begin").click()
    for i,plan in enumerate(PLANS):
        stage=97+i
        expect(page.locator("#stage-number")).to_have_text(f"Chapter 9 · Stage {i+1}")
        expect(page.locator("#level option:checked")).to_contain_text(f"{stage}.")
        expect(page.locator("#board .confluence-core")).to_have_count([2,1,1,1,1,2,2,2,3,2,2,3][i])
        prepare(page,plan)
        finish(page,plan)
        if stage==108:
            expect(page.locator("#next")).to_have_text("Chapter Ending")
            page.locator("#next").click()
            expect(page.locator("#world-intro-title")).to_contain_text("Chapter 9")
            expect(page.locator("#story-caption")).to_have_text("The Grand Philosopher's Engine · Stage 108")
            page.locator("#intro-next").click()
            expect(page.locator("#story-caption")).to_have_text("The Confluence Forges restored")
            page.locator("#intro-begin").click()
            expect(page.locator("#world-intro-title")).to_contain_text("Chapter 10")
            page.locator("#intro-next").click()
            page.locator("#intro-begin").click()
            expect(page.locator("#puzzle")).to_have_text("First Eclipse")
        else:
            page.locator("#next").click()
    page.reload()
    page.locator("#title-enter").click()
    expect(page.locator("#home-total")).to_contain_text("Campaign complete")
    assert errors==[],errors
    page.close()

if __name__=="__main__":
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser=playwright.chromium.launch(headless=True,executable_path=os.environ.get("CHROMIUM_EXECUTABLE") or None)
            try:
                test_chapter(browser,f"http://127.0.0.1:{server.server_port}")
            finally:
                browser.close()
    finally:
        server.shutdown();server.server_close()
    print("PASS: Stage 96 progress preserved; Chapter 9 Stages 97–108 completed; finale and saved completion verified")
