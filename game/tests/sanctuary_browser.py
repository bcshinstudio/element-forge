"""Exercise actual Sanctuary rendering and capture restoration screenshots."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import expect, sync_playwright

root=Path(__file__).resolve().parents[2]
out=root/'test-results'/'sanctuary'
out.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch()
        for label,viewport,reduced in [('desktop',{'width':1280,'height':950},'no-preference'),('mobile',{'width':390,'height':844},'no-preference'),('reduced',{'width':390,'height':844},'reduce')]:
            page=browser.new_page(viewport=viewport,reduced_motion=reduced)
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(f'http://127.0.0.1:{server.server_port}/game/index.html')
            page.locator('#title-enter').click()
            page.locator('#settings').click()
            control=page.locator('#settings-skip-tutorial-popups')
            if control.is_checked():control.uncheck()
            for _ in range(3):
                control.check()
                control.uncheck()
            page.locator('#studio-credit').click()
            page.locator('#stage-list button').nth(98).click()
            if page.locator('#world-intro').is_visible():
                page.get_by_role('button',name='Skip sequence').click()
            expect(page.locator('#stage-number')).to_have_text('Interlude · The Sanctuary')
            board=page.locator('#board')
            if page.locator('#start').is_visible():page.locator('#start').click()
            expect(board.locator('.sanctuary-motion')).to_have_count(0)
            board.screenshot(path=str(out/f'{label}-before.png'))
            routes=page.evaluate('EFEngine.solveConstruction(EFSanctuary.level.map).routes')
            assert len(routes)==6
            for route in routes:
                for i in route['path']:
                    board.locator(f'[data-index="{i}"]').click()
                expect(board.locator('[data-sanctuary-effect="inlet"]')).to_have_count(routes.index(route)+1)
                if route==routes[2]:
                    board.screenshot(path=str(out/f'{label}-partial.png'))
            expect(board.locator('[data-sanctuary-effect="heart"]')).to_have_count(8)
            expect(board.locator('[data-sanctuary-effect="crystal"]')).to_have_count(1)
            expect(board.locator('[data-sanctuary-effect="light"]')).to_have_count(4)
            expect(board.locator('[data-sanctuary-effect="fountain"]')).to_have_count(1)
            expect(board.locator('[data-sanctuary-effect="fire"]')).to_have_count(3)
            expect(board.locator('[data-sanctuary-effect="earth"]')).to_have_count(5)
            expect(board.locator('[data-sanctuary-effect="nature"]')).to_have_count(8)
            expect(board.locator('[data-sanctuary-effect="wind"]')).to_have_count(1)
            expect(board.locator('[data-variant="sanctuary-gate-open-restored"]')).to_have_count(1)
            expect(board.locator('[data-variant^="sanctuary-grand-altar-"][data-variant$="-awake"]')).to_have_count(9)
            particle=board.locator('.sanctuary-motion[data-motion="fountain"] i').first
            assert particle.evaluate('(el)=>getComputedStyle(el).animationName')==('none' if reduced=='reduce' else 'garden-droplet')
            assert particle.evaluate('(el)=>getComputedStyle(el).display')==('none' if reduced=='reduce' else 'block')
            assert board.locator('.sanctuary-motion').first.evaluate('(el)=>getComputedStyle(el).pointerEvents')=='none'
            page.wait_for_timeout(1800)
            board.screenshot(path=str(out/f'{label}-restored.png'))
            page.locator('#developer-reset-stage').click()
            expect(board.locator('.sanctuary-motion')).to_have_count(0)
            expect(board.locator('[data-variant$="-awake"]')).to_have_count(0)
            assert not errors,errors
            page.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
print('PASS: Sanctuary actual rendered restoration, desktop/mobile/reduced motion, screenshots and reset')
