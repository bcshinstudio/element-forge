"""Regression: hide deferred modes, show full story in planning, collapse in routing.

Exercises both source and actual standalone HTML on desktop and phone.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
STANDALONE = ROOT / "Wellspring_Chapter9_Clean_Stage_UI.html"


def exercise(browser, url, touch):
    context = browser.new_context(
        viewport={"width": 390, "height": 844} if touch else {"width": 1280, "height": 900},
        is_mobile=touch, has_touch=touch, reduced_motion="reduce"
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url)
    press = lambda locator: locator.tap() if touch else locator.click()
    press(page.locator("#title-enter"))
    for selector in ("#choose-challenge", "#home-custom", "#challenge-menu",
                     "#home-custom-panel", "#challenge-library", "#custom-level"):
        expect(page.locator(selector)).to_be_hidden()
    press(page.locator("#settings"))
    checkbox = page.locator("#settings-skip-tutorial-popups")
    if checkbox.is_checked(): checkbox.uncheck()
    for _ in range(3):
        checkbox.check()
        checkbox.uncheck()
    press(page.locator("#studio-credit"))
    expect(page.locator("#stage-list")).to_be_visible()
    press(page.locator("#stage-list button").nth(96))
    expect(page.locator("#puzzle")).to_have_text("The Alchemical Primer")
    expect(page.locator("#phase")).to_have_text("Plan your route")
    full_story = page.locator("#description").text_content().strip()
    assert len(full_story) > 150, "Stage 97 should show the whole story before Start Routing"
    expect(page.locator("#description")).to_be_visible()
    expect(page.locator("#story-toggle")).to_be_hidden()
    assert page.locator("#description").evaluate("e => e.closest('.field') !== null")
    assert page.locator("#description").evaluate("e => e.getBoundingClientRect().height > 0")
    assert not page.locator("#stage-story").count(), "Old short-story element should be gone"
    for selector in ("#challenge-library", "#custom-level"):
        expect(page.locator(selector)).to_be_hidden()

    press(page.locator("#start"))
    expect(page.locator("#phase")).to_have_text("Build the network")
    expect(page.locator("#description")).to_be_hidden()
    expect(page.locator("#story-toggle")).to_be_visible()
    expect(page.locator("#story-toggle")).to_have_attribute("aria-expanded", "false")
    assert page.locator("#description").evaluate("e => e.getBoundingClientRect().height === 0")
    assert page.locator("#story-toggle").evaluate(
        "e => e.getBoundingClientRect().right <= innerWidth + .5")

    press(page.locator("#story-toggle"))
    expect(page.locator("#story-toggle")).to_have_attribute("aria-expanded", "true")
    expect(page.locator("#description")).to_be_visible()
    expect(page.locator("#description")).to_have_text(full_story)
    press(page.locator("#story-toggle"))
    expect(page.locator("#description")).to_be_hidden()
    for selector in ("#challenge-library", "#custom-level"):
        expect(page.locator(selector)).to_be_hidden()
    assert not errors, errors
    page.close()
    context.close()


def run():
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True, executable_path=os.environ.get("CHROMIUM_EXECUTABLE") or None
            )
            try:
                urls = [f"http://127.0.0.1:{server.server_port}/game/index.html"]
                if STANDALONE.is_file(): urls.append(STANDALONE.as_uri())
                for url in urls:
                    for touch in (False, True):
                        exercise(browser, url, touch)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print("PASS: hidden legacy modes; full pre-routing story and collapsed in-game story, desktop/mobile, source/offline")


if __name__ == "__main__":
    run()
