from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import threading
from playwright.sync_api import sync_playwright
p=Path(__file__).resolve().parents[1]/'index.html'
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(p.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--allow-file-access-from-files'])
    page=browser.new_page(viewport={'width':1600,'height':1000})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
    assert page.locator('#board .cell').count()==144
    page.locator('[data-tool="node:source"]').click()
    page.locator('#board .cell').nth(37).click()
    page.locator('[data-tool="node:destination"]').click()
    page.locator('#board .cell').nth(42).click()
    page.locator('#inv-portal').fill('2')
    page.locator('#inv-portal').dispatch_event('change')
    page.locator('#playMode').click()
    page.locator('[data-play-tool="portal"]').click()
    page.locator('#board .cell').nth(39).click()
    page.locator('#board .cell').nth(40).click()
    assert page.locator('#left-portal').inner_text()=='0'
    page.locator('[data-play-tool="erase"]').click()
    page.locator('#board .cell').nth(39).click()
    assert page.locator('#left-portal').inner_text()=='1'
    assert not errors, errors
    print('PASS browser smoke: board render, endpoint editing, player portal placement, inventory restoration, no JS exceptions')
    browser.close()
