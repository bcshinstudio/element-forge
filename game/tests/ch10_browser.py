"""Browser regression for the actual Chapter 10 campaign on phone and desktop.

Run after generating game/ch10-drafts/*.map.json and chapter module.
"""
import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import expect, sync_playwright
from browser_smoke import prepare, trace_route, finish

ROOT=Path(__file__).resolve().parents[2]
BASE='/game/index.html'
PLANS=json.loads((ROOT/'game/tests/fixtures/twilight-pendulum-solutions.json').read_text())

def open_developer_stage(page, index, tap=False):
    press=lambda loc:loc.tap() if tap else loc.click()
    press(page.locator('#title-enter'))
    press(page.locator('#settings'))
    checkbox=page.locator('#settings-skip-tutorial-popups')
    if checkbox.is_checked():checkbox.uncheck()
    for _ in range(3):
        checkbox.check()
        checkbox.uncheck()
    press(page.locator('#studio-credit'))
    expect(page.locator('#stage-list button')).to_have_count(121)
    press(page.locator('#stage-list button').nth(index))

def test_play(browser,url,stage,touch):
    context=browser.new_context(viewport={'width':390,'height':844} if touch else {'width':1280,'height':940},
        is_mobile=touch,has_touch=touch,reduced_motion='reduce')
    page=context.new_page();errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
    page.goto(url)
    open_developer_stage(page,stage-1,touch)
    plan=PLANS['twilight-pendulum-'+str(stage)]
    expect(page.locator('#puzzle')).to_have_text('First Eclipse' if stage==109 else 'The Celestial Orrery')
    expect(page.locator('#phase-indicator')).to_contain_text('Day')
    prepare(page,plan,touch)
    if stage==109:
        trace_route(page,plan['routes'][0]['path'],touch)
        expect(page.locator('#phase-indicator')).to_contain_text('Night')
        assert page.locator('#board [data-index="64"] .track').count()>0,'Light delivery disappeared after Night'
        for route in plan['routes'][1:]:
            trace_route(page,route['path'],touch)
        button=page.locator('#check')
        button.tap() if touch else button.click()
        expect(page.get_by_role('heading',name='Delivery complete')).to_be_visible()
    else:
        finish(page,plan,touch)
    assert page.locator('#board').evaluate('e=>e.getBoundingClientRect().right<=innerWidth+2')
    assert not errors,errors
    context.close()

def test_editor(browser,url):
    page=browser.new_page(viewport={'width':1280,'height':930},accept_downloads=True)
    errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
    page.goto(url)
    page.locator('#file').set_input_files(str(ROOT/'game/ch10-drafts/stage-121.map.json'))
    expect(page.locator('#mapName')).to_have_value('The Celestial Orrery')
    expect(page.locator('#phase-enabled')).to_be_checked()
    page.locator('#validate').click()
    expect(page.locator('#messages')).to_contain_text('Ready to playtest')
    with page.expect_download() as download: page.locator('#saveLevel').click()
    assert download.value.suggested_filename.endswith('.level.json')
    assert not errors,errors
    page.close()

def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or None)
            try:
                base=f'http://127.0.0.1:{server.server_port}'
                test_editor(browser,base+'/map-editor/index.html')
                for stage in (109,121):
                    for touch in (False,True):test_play(browser,base+BASE,stage,touch)
            finally:browser.close()
    finally:
        server.shutdown();server.server_close()
    print('PASS: Chapter 10 stage 109 + 121, phase switching, board fit, editable boss map, phone and desktop')

if __name__=='__main__':
    main()
