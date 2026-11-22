"""End-to-end acceptance checks against the standalone downloads."""
import json
import os
import re
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
EDITOR = Path(os.environ.get('WELLSPRING_EDITOR_HTML', ROOT / 'Wellspring_Map_Editor.html'))
GAME = Path(os.environ.get('WELLSPRING_GAME_HTML', ROOT / 'Wellspring.html'))
SAVE = 'element-forge.sleeping-valley.v1'


def export_map(page):
    with page.expect_download() as event:
        page.locator('#save').click()
    return json.loads(event.value.path().read_text())


def load_file(page, control, value):
    page.locator(control).set_input_files({
        'name': 'sample.json',
        'mimeType': 'application/json',
        'buffer': json.dumps(value).encode(),
    })


def artwork(page, index):
    return page.locator(f'[data-index="{index}"] > .terrain-variant').evaluate(
        'node => [node.dataset.variant, node.dataset.rotation, node.style.backgroundImage]'
    )


def run(browser):
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    context.route('http*://**/*', lambda route: route.abort())
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(EDITOR.as_uri())
    page.locator('#load-stage').click()
    page.locator('#apply-palette').click()
    expect(page.locator('#board .terrain-variant')).to_have_count(144)
    page.locator('[data-tool="art"]').click()
    page.locator('#art-type').select_option('land')
    grass = page.locator('#paint-images-grid button').filter(has_text='Tall grass').get_attribute('data-art-id')
    page.locator(f'#paint-images-grid [data-art-id="{grass}"]').click()
    index = page.locator('#board .land').first.get_attribute('data-i')
    cell = page.locator(f'[data-i="{index}"]')
    cell.click()
    expect(cell.locator('.terrain-variant')).to_have_attribute('data-variant', grass)
    page.locator('#terrainArt-rotation').select_option('90')
    expect(cell.locator('.terrain-variant')).to_have_attribute('data-rotation', '90')
    page.locator('#undo').click()
    expect(cell.locator('.terrain-variant')).to_have_attribute('data-rotation', '0')
    page.locator('#redo').click()
    expect(cell.locator('.terrain-variant')).to_have_attribute('data-rotation', '90')
    page.locator('#phone-preview').click()
    assert page.locator('#board').bounding_box()['width'] <= 360
    before = export_map(page)
    page.locator('#playMode').click()
    frame = page.frame_locator('#playtest-frame')
    expect(frame.locator('#puzzle')).to_have_text(before['name'])
    playing = artwork(frame, index)
    assert playing[:2] == [grass, '90']
    assert playing[2].startswith('url("data:image/webp;base64,')
    frame.locator('#editor-solution').click()
    expect(frame.locator('#phase')).to_have_text('Delivery complete')
    expect(frame.locator('#board .track').first).to_be_visible()
    page.locator('#exit-playtest').click()
    expect(cell).to_have_class(re.compile('selected-cell'))
    expect(page.locator('#undo')).to_be_enabled()
    assert export_map(page) == before
    load_file(page, '#file', before)
    expect(page.locator('#dirty')).to_have_text('Imported JSON')
    page.reload()
    expect(cell.locator('.terrain-variant')).to_have_attribute('data-variant', grass)
    assert export_map(page) == before

    game = context.new_page()
    game.on('pageerror', lambda error: errors.append(str(error)))
    game.goto(GAME.as_uri())
    game.evaluate("""key => {
      const stage=EFChapter.chapter[0], session=EFSession.createSession(stage);
      session.start();
      const start=EFEngine.pairs(session.map)[0].source;
      session.route(start);
      localStorage.setItem(key,JSON.stringify({version:2,completed:[],
        campaign:{id:stage.id,rules:stage.rulesVersion,layout:stage.layout??1,board:session.snapshot()}}));
    }""", SAVE)
    game.reload()
    game.locator('#title-enter').click()
    game.locator('#continue').click()
    expect(game.locator('#board .track')).to_have_count(1)
    game.locator('#puzzle-home').click()
    game.locator('#home-custom').click()
    load_file(game, '#home-import', before)
    expect(game.locator('#puzzle')).to_have_text(before['name'])
    assert artwork(game, index) == playing

    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    touch_page = mobile.new_page()
    touch_page.on('pageerror', lambda error: errors.append(str(error)))
    touch_page.goto(EDITOR.as_uri())
    touch_page.locator('#board .cell').nth(1).tap()
    expect(touch_page.locator('#board .cell').nth(1)).to_have_class(re.compile('mountain'))
    touch_page.locator('#undo').tap()
    expect(touch_page.locator('#board .cell').nth(1)).to_have_class(re.compile('land'))
    assert not errors, errors
    print('PASS offline editor → artwork → playtest → export → reload → game import, campaign resume and touch')
    mobile.close()
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
        run(browser)
        browser.close()
