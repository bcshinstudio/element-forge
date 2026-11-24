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
                expect(choices).to_have_count(122)
                labels=choices.all_text_contents()
                assert [int(label.split(".")[0]) for label in labels if label.split(".")[0].isdigit()]==list(range(1,121))
                assert "Archive of First Currents" in labels[36]
                assert "Garden of Forgotten Wonders" in labels[61]
                assert labels[60].startswith("60.")
                assert labels[62].startswith("61.")
                choices.nth(35).click()
                expect(page.locator("#stage-number")).to_have_text("Chapter 3 · Stage 12")
                page.locator("#developer-complete").click()
                expect(page.locator("#world-intro")).to_be_visible()
                expect(page.locator("#intro-begin")).to_have_text("Enter the Archive")
                page.locator("#intro-begin").click()
                expect(page.locator("#world-intro-title")).to_have_text("The Archive of First Currents")
                def verify_dialogue(part):
                    panels=page.evaluate("(part)=>EFArchive.panels(part)",part)
                    for i,panel in enumerate(panels):
                        expect(page.locator(".jeeah-dialogue strong")).to_have_text(panel["speaker"])
                        portrait=page.locator(".jeeah-portrait")
                        expect(portrait).to_have_attribute("data-speaker",panel["speaker"])
                        if panel["speaker"]=="Narrator":
                            expect(portrait).to_be_hidden()
                        else:
                            expect(portrait).to_be_visible()
                            expect(portrait).to_have_attribute("aria-label",panel["speaker"])
                            if panel["speaker"]=="Eldrin":
                                assert "eldrin-portrait.webp" in portrait.evaluate("(el)=>getComputedStyle(el).backgroundImage")
                        if i<len(panels)-1:
                            page.locator("#intro-next").click()
                verify_dialogue("opening")
                page.get_by_role("button",name="Skip sequence").click()
                expect(page.locator("#stage-number")).to_have_text("Interlude · The Archive")
                labels=page.evaluate("""()=>EFArchive.level.map.cells.flatMap((cell,i)=>cell.node?[{
                    expected:EFMap.ELEMENTS[cell.node.element].name+' '+(cell.node.role==='source'?'source':'tome'),
                    actual:document.querySelector('#board [data-index="'+i+'"]').title,
                    accessible:document.querySelector('#board [data-index="'+i+'"]').getAttribute('aria-label')
                }]:[])""")
                assert len(labels)==22
                assert all(x["expected"]==x["actual"] and "Row " in x["accessible"] for x in labels)

                page.locator("#developer-reset-stage").click()
                expect(page.locator("#stage-number")).to_have_text("Interlude · The Archive")
                page.locator("#developer-complete").click()
                expect(page.locator("#world-intro-title")).to_have_text("The Archive of First Currents")
                verify_dialogue("ending")
                page.get_by_role("button",name="Skip sequence").click()
                expect(page.locator("#world-intro-title")).to_contain_text("Chapter 4")
                while page.locator("#intro-next").is_visible():
                    page.locator("#intro-next").click()
                page.locator("#intro-begin").click()
                expect(page.locator("#stage-number")).to_have_text("Chapter 4 · Stage 1")
                # Leave review mode and re-enter it to exercise Garden through Stage 60.
                page.locator("#developer-exit-stage").click()
                page.locator("#settings").click()
                control=page.locator("#settings-skip-tutorial-popups")
                if control.is_checked():control.uncheck()
                for _ in range(3):
                    control.check()
                    control.uncheck()
                page.locator("#studio-credit").click()
                page.locator("#stage-list button").nth(60).click()
                expect(page.locator("#stage-number")).to_have_text("Chapter 5 · Stage 12")
                page.locator("#developer-complete").click()
                expect(page.locator("#intro-begin")).to_have_text("Enter the Garden")
                while page.locator("#intro-next").is_visible():
                    page.locator("#intro-next").click()
                page.locator("#intro-begin").click()
                expect(page.locator("#world-intro-title")).to_have_text("The Garden of Forgotten Wonders")
                def verify_garden(part):
                    panels=page.evaluate("(part)=>EFGarden.panels(part)",part)
                    assert len(set(p["art"] for p in panels))==5
                    for i,panel in enumerate(panels):
                        expect(page.locator(".jeeah-dialogue strong")).to_have_text(panel["speaker"])
                        expect(page.locator("#story-line")).to_contain_text(panel["line"])
                        loaded=page.evaluate("""async key=>{const img=new Image();img.src=EFGarden.art[key];await img.decode();return img.naturalWidth>0&&img.naturalHeight>0;}""",panel["art"])
                        assert loaded
                        if panel["speaker"]!="Narrator":
                            portrait=page.locator(".jeeah-portrait")
                            expect(portrait).to_be_visible()
                            assert "garden-"+panel["speaker"].lower()+"-portrait.webp" in portrait.evaluate("(el)=>getComputedStyle(el).backgroundImage")
                            assert portrait.evaluate("(el)=>getComputedStyle(el).backgroundSize")=="contain"
                        if i<len(panels)-1:
                            page.locator("#intro-next").click()
                verify_garden("opening")
                page.get_by_role("button",name="Skip sequence").click()
                expect(page.locator("#stage-number")).to_have_text("Interlude · The Garden")
                assert page.locator("#board [data-index]").count()==169
                page.locator("#developer-reset-stage").click()
                expect(page.locator("#stage-number")).to_have_text("Interlude · The Garden")
                page.locator("#developer-complete").click()
                expect(page.locator("#world-intro-title")).to_have_text("The Garden of Forgotten Wonders")
                verify_garden("ending")
                page.get_by_role("button",name="Skip sequence").click()
                expect(page.locator("#world-intro-title")).to_contain_text("Chapter 6")
                while page.locator("#intro-next").is_visible():
                    page.locator("#intro-next").click()
                page.locator("#intro-begin").click()
                expect(page.locator("#stage-number")).to_have_text("Chapter 6 · Stage 1")
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
    print("PASS: both interludes, chapter transitions, Garden artwork, portraits, reset, exit and storage isolation on desktop and mobile")

if __name__=="__main__":
    run()
