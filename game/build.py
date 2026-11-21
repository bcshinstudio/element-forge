"""Package the game or map editor as one offline HTML file."""
import argparse
import base64
import re
from pathlib import Path

GAME = Path(__file__).resolve().parent


def build(editor=False):
    source_root = GAME.parent / "map-editor" if editor else GAME
    page = (source_root / "index.html").read_text(encoding="utf-8")

    def stylesheet(match):
        path = source_root / match[1]
        css = path.read_text(encoding="utf-8")

        def embed_art(image):
            source = path.parent / image[1]
            payload = base64.b64encode(source.read_bytes()).decode("ascii")
            return f"url(data:image/webp;base64,{payload})"

        css = re.sub(r"url\(((?:tiles/|\.\./art/)[\w-]+\.webp)\)", embed_art, css)
        return f"<style>\n{css}</style>"

    page = re.sub(r'<link rel="stylesheet" href="([^"]+)">', stylesheet, page)

    def inline(match):
        source = (source_root / match[1]).read_text(encoding="utf-8")
        if "</script" in source.lower():
            raise ValueError(f"Unsafe inline script delimiter in {match[1]}")
        scripts.append(f"<script>\n{source}</script>")
        return ""

    scripts = []
    page, count = re.subn(r'<script(?: defer)? src="([^"]+)"></script>', inline, page)
    if not count:
        raise ValueError("Application scripts missing from HTML")
    if editor:
        # Standalone builds use the embedded defaults without fetching a local manifest.
        scripts.insert(0, "<script>window.EFStandaloneEditor = true;</script>")
    page = page.replace('href="./index.html"', 'href="#"')
    return page.replace("</body>", "\n".join(scripts) + "\n</body>")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--editor", action="store_true", help="Package the map editor")
    args = parser.parse_args()
    args.output.write_text(build(editor=args.editor), encoding="utf-8")
