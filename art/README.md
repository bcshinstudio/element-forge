# Illustrated boards

The game and editor share terrain and transparent structure assets from the approved Wellspring art review. The map format and construction rules use their existing IDs. Terrain outside the illustrated set keeps its existing color and symbol. The browser draws river tiles using a repeating current texture.

Build the offline game with `python game/build.py Wellspring.html`. Build the offline editor with `python game/build.py --editor Wellspring_Map_Editor.html`. Both outputs embed all default illustrations. Hosted editor deployments can still load overrides from `map-editor/assets.json`.

For static hosting, include the `art`, `game`, and `map-editor` folders with their relative paths intact.
