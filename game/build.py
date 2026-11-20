"""Package the G1 game and its shared rules as one offline HTML file."""
import argparse
import re
from pathlib import Path

GAME = Path(__file__).resolve().parent


def build():
    page = (GAME / "index.html").read_text(encoding="utf-8")
    styles = (GAME / "styles.css").read_text(encoding="utf-8")
    page = page.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{styles}</style>")

    def inline(match):
        source = (GAME / match[1]).read_text(encoding="utf-8")
        if "</script" in source.lower():
            raise ValueError(f"Unsafe inline script delimiter in {match[1]}")
        # Preserve script order at the end of the document after the controls exist.
        scripts.append(f"<script>\n{source}</script>")
        return ""

    scripts = []
    page, count = re.subn(r'<script defer src="([^"]+)"></script>', inline, page)
    if not count:
        raise ValueError("Game scripts missing from HTML")
    page = page.replace('href="./index.html"', 'href="#"')
    return page.replace("</body>", "\n".join(scripts) + "\n</body>")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.write_text(build(), encoding="utf-8")
