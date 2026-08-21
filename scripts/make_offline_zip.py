#!/usr/bin/env python3
"""Pack a runnable offline site. Zip is gitignored; attach it to the GitHub release."""
from __future__ import annotations

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "storescope-offline.zip"

SKIP_DIR = {
    ".git", ".github", ".arena", ".cache", "__pycache__", "uploads",
    "node_modules", ".venv",
}
SKIP_FILE = {
    "storescope-offline.zip",
    ".gitignore",
    ".assetsignore",
    ".env",
}

INCLUDE_ROOT_FILES = {
    "index.html", "privacy.html", "404.html", "manifest.json", "package.json",
    "sw.js", "server.py", "robots.txt", "_headers", ".nojekyll",
    "LICENSE", "README.md", "STORESCOPE.md", "DEPLOY.md", "SHOPIFY_APP.md",
    "shopify.app.toml", "og.jpg",
}


def keep(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    parts = rel.parts
    if parts[0] in SKIP_DIR:
        return False
    if path.name in SKIP_FILE or path.name.endswith(".pyc"):
        return False
    if path.is_dir():
        return True
    if parts[0] in {"css", "js", "data", "fonts", "icons", "samples"}:
        return True
    if path.name in INCLUDE_ROOT_FILES:
        return True
    return False


def main() -> None:
    files = []
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        if keep(p):
            files.append(p)
    files.sort()
    names = {p.name for p in files}
    if "issues.json" not in names:
        raise SystemExit("issues.json missing from zip set")
    if "howto.json" not in names:
        raise SystemExit("howto.json missing from zip set")
    if "howto.js" not in names or "siteSearch.js" not in names:
        raise SystemExit("howto.js / siteSearch.js missing from zip set")
    if OUT.exists():
        OUT.unlink()
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for p in files:
            z.write(p, p.relative_to(ROOT).as_posix())
    mb = OUT.stat().st_size / (1024 * 1024)
    print(f"wrote {OUT.name} ({len(files)} files, {mb:.2f} MB)")


if __name__ == "__main__":
    main()
