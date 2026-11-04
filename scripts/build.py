"""Inline the 研程 source into a deployable index.html and artifact preview."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

CSS_FILES = [
    "base.css",
    "layout.css",
    "components.css",
    "overlays.css",
    "today.css",
    "schedule.css",
    "habits.css",
    "projects.css",
    "settings.css",
    "sparks.css",
    "sync.css",
]

JS_FILES = [
    "js/utils.js",
    "js/state.js",
    "js/seed.js",
    "js/stats.js",
    "js/ui.js",
    "js/components.js",
    "js/views/today.js",
    "js/views/schedule.js",
    "js/views/habits.js",
    "js/views/projects.js",
    "js/views/sparks.js",
    "js/gist-sync.js",
    "js/modals.js",
    "js/settings.js",
    "js/spark-actions.js",
    "js/app.js",
    "js/daily-tick.js",
]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def inline_source() -> tuple[str, str]:
    css = "\n\n".join(
        f"/* ---- {name} ---- */\n{read(SRC / 'styles' / name)}" for name in CSS_FILES
    )
    js = "\n\n".join(
        f"/* ---- {name} ---- */\n{read(SRC / name)}" for name in JS_FILES
    )
    html = read(SRC / "index.html")
    html = html.replace("<!-- INLINE:CSS -->", f"<style>\n{css}\n</style>")
    html = html.replace("<!-- INLINE:JS -->", f"<script>\n{js}\n</script>")
    if "<!-- INLINE:" in html:
        raise SystemExit("A source marker was not replaced")
    return html, css


def make_preview(source_html: str, css: str) -> str:
    title_match = re.search(r"<title>(.*?)</title>", source_html, flags=re.S)
    title = title_match.group(1).strip() if title_match else "研程"
    font_match = re.search(
        r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/[^"]+)">',
        source_html,
    )
    font_link = f'<link rel="stylesheet" href="{font_match.group(1)}">' if font_match else ""
    body_match = re.search(r"<body[^>]*>(.*)</body>", source_html, flags=re.S)
    if not body_match:
        raise SystemExit("Could not find body content")
    body = body_match.group(1)
    body = re.sub(r"<script>[\s\S]*?</script>", "", body)
    js = "\n\n".join(
        f"/* ---- {name} ---- */\n{read(SRC / name)}" for name in JS_FILES
    )
    preview = f"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="研程：把科研拆成今天能做完的事。日程、习惯、课题推进与闪念，本地优先。">
{font_link}
<style>
{css}
</style>
{body}
<script>window.__YC_PREVIEW__ = true;</script>
<script>
{js}
</script>
"""
    return preview


def main() -> None:
    source_html, css = inline_source()
    (ROOT / "index.html").write_text(source_html, encoding="utf-8")
    preview = make_preview(source_html, css)
    (ROOT / "preview.html").write_text(preview, encoding="utf-8")
    print(f"Wrote {ROOT / 'index.html'} ({len(source_html) / 1024:.1f} KiB)")
    print(f"Wrote {ROOT / 'preview.html'} ({len(preview) / 1024:.1f} KiB)")


if __name__ == "__main__":
    main()
