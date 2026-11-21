from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import threading
import json
import os
from playwright.sync_api import expect, sync_playwright
p=Path(__file__).resolve().parents[1]/'index.html'
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(p.parent.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
    page=browser.new_page(viewport={'width':1600,'height':1000})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/map-editor/index.html')
    assert page.locator('#board .cell').count()==144

    def square_tiles():
        sizes=page.locator('#board .cell').evaluate_all(
            'cells => cells.map(cell => {const r=cell.getBoundingClientRect(); return [r.width,r.height]})')
        assert all(abs(width-height)<0.1 for width,height in sizes), sizes[:12]
        return sizes

    initial_sizes=square_tiles()
    page.locator('[data-tool="node:source"]').click()
    page.locator('#board .cell').nth(37).click()
    page.locator('[data-tool="node:destination"]').click()
    page.locator('#board .cell').nth(42).click()
    assert square_tiles()==initial_sizes
    page.locator('#inv-portal').fill('2')
    page.locator('#inv-portal').dispatch_event('change')
    page.locator('#playMode').click()
    page.locator('[data-play-tool="portal"]').click()
    page.locator('#board .cell').nth(39).click()
    page.locator('#board .cell').nth(40).click()
    assert page.locator('#left-portal').inner_text()=='0'
    assert square_tiles()==initial_sizes
    page.locator('[data-play-tool="erase"]').click()
    page.locator('#board .cell').nth(39).click()
    assert page.locator('#left-portal').inner_text()=='1'
    assert square_tiles()==initial_sizes
    assert not errors, errors
    print('PASS browser smoke: board render, endpoint editing, player portal placement, inventory restoration, no JS exceptions')
    expect(page.locator('#resize')).to_be_disabled()
    page.locator('#playMode').click()
    expect(page.locator('#resize')).to_be_enabled()

    def download(button):
        with page.expect_download() as event:
            page.locator(button).click()
        return json.loads(event.value.path().read_text())

    def upload(value):
        page.locator('#file').set_input_files({
            'name': 'map.json',
            'mimeType': 'application/json',
            'buffer': json.dumps(value).encode(),
        })

    draft = download('#save')
    assert draft['schemaVersion'] == 2
    assert draft['cells'][37]['node']['role'] == 'source'
    level = download('#saveLevel')
    assert level['format'] == 'element-forge-level'
    assert level['rulesVersion'] == 4
    assert level['map'] == draft

    page.once('dialog', lambda dialog: dialog.accept())
    page.locator('#newMap').click()
    expect(page.get_by_role('gridcell', name='Row 4, column 2, land', exact=True)).to_be_visible()
    page.once('dialog', lambda dialog: dialog.accept())
    upload(level)
    expect(page.locator('#dirty')).to_have_text('Imported JSON')
    expect(page.get_by_role('gridcell', name='Row 4, column 2, fire source', exact=True)).to_be_visible()
    page.locator('#undo').click()
    expect(page.get_by_role('gridcell', name='Row 4, column 2, land', exact=True)).to_be_visible()
    page.locator('#redo').click()
    expect(page.get_by_role('gridcell', name='Row 4, column 2, fire source', exact=True)).to_be_visible()

    dialogs = []
    def accept_invalid(dialog):
        dialogs.append(dialog.message)
        dialog.accept()
    page.once('dialog', accept_invalid)
    upload(dict(draft, width=99))
    page.wait_for_function("document.getElementById('file').value === ''")
    assert len(dialogs) == 1 and 'Invalid dimensions or cell count' in dialogs[0]
    expect(page.get_by_role('gridcell', name='Row 4, column 2, fire source', exact=True)).to_be_visible()

    page.locator('#playMode').click()
    page.locator('[data-play-tool="route"]').click()
    for index in range(37, 43):
        page.locator('#board .cell').nth(index).click()
    page.locator('#playCheck').click()
    expect(page.locator('#playMessages')).to_contain_text('Valid network!')
    page.locator('#animate').click()
    expect(page.locator('#playMessages')).to_contain_text('All elements delivered!')
    page.locator('#playMode').click()
    page.locator('#genDifficulty').select_option('interior-choices')
    page.once('dialog', lambda dialog: dialog.accept())
    page.locator('#generate').click()
    expect(page.locator('#generatorMessages')).to_contain_text('4 verified choices')
    assert not errors, errors
    print('PASS browser integration: edit, history, JSON round-trip, failed import, solve check, animation and interior generator')
    page.locator('#challenge-count').fill('2')
    page.locator('#challenge-generate').click()
    expect(page.locator('#challenge-status')).to_contain_text('2/2 verified')
    expect(page.locator('#challenge-details')).to_be_hidden()
    with page.expect_download() as capture:
        page.locator('#challenge-export').click()
    pack = json.loads(capture.value.path().read_text())
    assert len(pack['stages']) == 2
    with page.expect_download() as capture:
        page.locator('#challenge-export-stage').click()
    selected = json.loads(capture.value.path().read_text())
    assert selected == pack['stages'][0]
    game = browser.new_page()
    game.goto(f'http://127.0.0.1:{server.server_port}/game/index.html')
    game.locator('#import').set_input_files({
        'name': 'verified.json', 'mimeType': 'application/json', 'buffer': json.dumps(selected).encode()
    })
    expect(game.locator('#puzzle')).to_contain_text(selected['map']['name'])
    game.close()
    page.locator('#challenge-evidence summary').click()
    expect(page.locator('#challenge-details')).to_contain_text('whole-board routing consequence')
    assert not errors, errors
    print('PASS challenge editor: generation, hidden verification and export')
    browser.close()
