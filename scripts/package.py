"""Build and package the deployable 研程 GitHub project.

The ZIP root contains index.html directly, so GitHub Pages can serve the
repository root without an extra parent folder.
"""

from __future__ import annotations

import hashlib
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
VERSION = "v1.2.0"
DATE = "2026-11-04"
ZIP_PATH = DIST / f"yancheng-github-{VERSION}-{DATE}.zip"

ROOT_FILES = [
    "index.html",
    "manifest.webmanifest",
    "sw.js",
    ".nojekyll",
    ".gitignore",
    "README.md",
    "LICENSE",
]
DIRS = ["icons", "docs", "src", "scripts"]


def should_include(path: Path) -> bool:
    if path.name in {"__pycache__", ".DS_Store", "Thumbs.db", "desktop.ini"}:
        return False
    if path.suffix in {".pyc", ".pyo"}:
        return False
    if path.name.startswith("~$"):
        return False
    if "dist" in path.parts:
        return False
    return True


def add_tree(archive: zipfile.ZipFile, directory: Path) -> None:
    for path in sorted(directory.rglob("*")):
        if not path.is_file() or not should_include(path):
            continue
        archive.write(path, path.relative_to(ROOT).as_posix())


def main() -> None:
    subprocess.run([sys.executable, str(ROOT / "scripts" / "build.py")], check=True)
    DIST.mkdir(exist_ok=True)

    missing = [name for name in ROOT_FILES if not (ROOT / name).is_file()]
    if missing:
        raise SystemExit(f"Missing required files: {', '.join(missing)}")

    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in ROOT_FILES:
            archive.write(ROOT / name, name)
        for directory in DIRS:
            add_tree(archive, ROOT / directory)

    digest = hashlib.sha256(ZIP_PATH.read_bytes()).hexdigest()
    checksum_path = ZIP_PATH.with_name(ZIP_PATH.name + ".sha256")
    checksum_path.write_text(f"{digest}  {ZIP_PATH.name}\n", encoding="utf-8")

    with zipfile.ZipFile(ZIP_PATH) as archive:
        names = archive.namelist()
        if "index.html" not in names:
            raise SystemExit("index.html is not at the ZIP root")
        if any(name.startswith(("task_plan", "findings", "progress", "preview.html", ".claude")) for name in names):
            raise SystemExit("A private planning/preview file leaked into the ZIP")
        if not any(name.startswith("docs/screenshots/") for name in names):
            raise SystemExit("Screenshots are missing from the ZIP")

    size_mb = ZIP_PATH.stat().st_size / (1024 * 1024)
    print(f"Wrote {ZIP_PATH}")
    print(f"Files: {len(names)}")
    print(f"Size: {size_mb:.1f} MiB")
    print(f"SHA-256: {digest}")


if __name__ == "__main__":
    main()
