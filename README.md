# Wellspring

Wellspring is a browser puzzle game by BC Shin Studio. Connect elemental sources to their inlets through 96 stages across eight chapters.

Open [the game](game/index.html) or [the map editor](map-editor/index.html) from a static server rooted at the repository. To build standalone HTML files for offline use, run:

```sh
python game/build.py Wellspring.html
python game/build.py --editor Wellspring_Map_Editor.html
```

## Testing

```sh
npm --prefix map-editor test
node --test game/tests/*.test.js
```

The existing browser smoke tests in each test directory use Python Playwright and Chromium. The standalone artwork browser test additionally takes the generated game and editor paths as documented in its source.

## Credits and privacy

Game, artwork direction and production by BC Shin Studio, with AI-assisted illustrations, story animation and development. Music and sound effects are synthesized in the browser. The game uses system font stacks and ships no font files. Game progress and settings are saved on the current browser and device. The map editor also saves its current draft locally. GitHub hosting is separate from this local game storage.

The standalone game and editor do not load remote fonts or audio and have no analytics or account system. The hosted editor fetches its playtest page and artwork manifest from the same site. Saves are separate across devices and site origins. GitHub Pages may record visitor IP addresses for security.
