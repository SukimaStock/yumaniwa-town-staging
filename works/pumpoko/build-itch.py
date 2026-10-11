#!/usr/bin/env python3
"""Build an itch.io HTML5 ZIP without modifying canonical PUMPOKO 02 source."""
from __future__ import annotations
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

WORK = Path(__file__).resolve().parent
ROOT = WORK.parent.parent
MANIFEST = WORK / "standalone-export.json"
CODEA_SOURCE = "engine/codea-lite.v1.0.0.js"
ORIGINAL_CODEA_SRC = "../../engine/codea-lite.v1.0.0.js"
LOCAL_CODEA_SRC = "./codea-lite.js"


def relative_file(path: str) -> Path:
    posix = PurePosixPath(path)
    if not path or posix.is_absolute() or ".." in posix.parts or str(posix) != path:
        raise ValueError("Invalid manifest path: " + path)
    return Path(*posix.parts)


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    includes = manifest["include"]
    if len(includes) != len(set(includes)) or "index.html" not in includes or "codea-lite.js" not in includes:
        raise ValueError("Missing required entries or duplicate includes")
    with tempfile.TemporaryDirectory(prefix="pumpoko-itch-") as temporary:
        work = Path(temporary) / "work"
        work.mkdir()
        for item in includes:
            relative = relative_file(item)
            source = ROOT / CODEA_SOURCE if item == "codea-lite.js" else WORK / relative
            target = work / relative
            if not source.is_file():
                raise FileNotFoundError(str(source))
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)

        entry = work / "index.html"
        html = entry.read_text(encoding="utf-8")
        if html.count(ORIGINAL_CODEA_SRC) != 1:
            raise ValueError("Expected exactly one canonical Codea Lite script reference")
        html = html.replace(ORIGINAL_CODEA_SRC, LOCAL_CODEA_SRC)
        if html.count("<title>PUMPOKO 02</title>") != 1:
            raise ValueError("Unexpected game title; check before packaging")
        html = html.replace("<title>PUMPOKO 02</title>", "<title>PUMPOKO</title>")
        entry.write_text(html, encoding="utf-8")
        (work / "standalone-export.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        subprocess.run([
            sys.executable, str(ROOT / "engine/export-standalone.py"),
            str(work / "standalone-export.json"),
            "--repo-root", str(ROOT), "--out", str(ROOT / "dist")
        ], check=True)

    archive = ROOT / "dist" / manifest["output"]
    expected = set(includes) | {manifest["engine"]["target"]}
    with zipfile.ZipFile(archive) as zipped:
        found = set(zipped.namelist())
        if found != expected or zipped.testzip() is not None:
            raise ValueError("ZIP member or CRC mismatch: " + repr(sorted(found ^ expected)))
        html = zipped.read("index.html").decode("utf-8")
        if ("../../engine/" in html or
                'src="./codea-lite.js"' not in html or
                'data-sse-engine src="sukimastock-engine.js"' not in html):
            raise ValueError("Non-portable index.html references")
        if zipped.read("codea-lite.js") != (ROOT / CODEA_SOURCE).read_bytes():
            raise ValueError("Codea Lite does not match canonical source")
        if zipped.read(manifest["engine"]["target"]) != (ROOT / manifest["engine"]["source"]).read_bytes():
            raise ValueError("Engine does not match canonical source")
        for item in includes:
            if item not in ("index.html", "codea-lite.js") and zipped.read(item) != (WORK / item).read_bytes():
                raise ValueError("Source changed during packaging: " + item)
    print("Validated itch.io package:", archive, "files:", len(expected))


if __name__ == "__main__":
    main()
