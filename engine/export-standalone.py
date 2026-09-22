#!/usr/bin/env python3
"""Build a self-contained Web work ZIP from a standalone-export.json manifest.

The development copy may reference the canonical Engine outside the work folder.
The exported ZIP receives a local Engine copy and a rewritten marked script tag.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


ENGINE_TAG_RE_TEMPLATE = (
    r"<script\\b(?=[^>]*\\b{marker}\\b)[^>]*\\bsrc=(?P<quote>[\\"'])"
    r"(?P<src>.*?)(?P=quote)[^>]*>\\s*</script>"
)


class ExportError(RuntimeError):
    pass


def safe_relative(value: str, label: str) -> Path:
    raw = str(value or "").strip()
    if not raw:
        raise ExportError(f"{label} must not be empty.")
    posix = PurePosixPath(raw)
    if posix.is_absolute() or ".." in posix.parts:
        raise ExportError(f"{label} must stay inside its allowed root: {raw}")
    return Path(*posix.parts)


def load_manifest(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ExportError(f"Manifest not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ExportError(f"Manifest JSON is invalid: {exc}") from exc

    if data.get("schema") != 1:
        raise ExportError("Unsupported standalone export schema.")
    if not isinstance(data.get("include"), list) or not data["include"]:
        raise ExportError("Manifest include must be a non-empty list.")
    if not isinstance(data.get("engine"), dict):
        raise ExportError("Manifest engine configuration is required.")
    return data


def rewrite_engine_reference(entry_path: Path, marker: str, target: str) -> None:
    html = entry_path.read_text(encoding="utf-8")
    pattern = re.compile(
        ENGINE_TAG_RE_TEMPLATE.format(marker=re.escape(marker)),
        re.IGNORECASE | re.DOTALL,
    )
    matches = list(pattern.finditer(html))
    if len(matches) != 1:
        raise ExportError(
            f"Expected exactly one <script {marker} ...> in {entry_path.name}; "
            f"found {len(matches)}."
        )

    match = matches[0]
    tag = match.group(0)
    quote = match.group("quote")
    rewritten_tag = re.sub(
        r"\\bsrc=(?:[\\"']).*?(?:[\\"'])",
        f"src={quote}{target}{quote}",
        tag,
        count=1,
        flags=re.IGNORECASE | re.DOTALL,
    )
    html = html[: match.start()] + rewritten_tag + html[match.end() :]
    entry_path.write_text(html, encoding="utf-8")


def validate_export_tree(root: Path, entry: Path, engine_target: Path, marker: str) -> None:
    entry_file = root / entry
    engine_file = root / engine_target
    if not entry_file.is_file():
        raise ExportError(f"Export entry is missing: {entry.as_posix()}")
    if not engine_file.is_file():
        raise ExportError(f"Packaged Engine is missing: {engine_target.as_posix()}")

    html = entry_file.read_text(encoding="utf-8")
    pattern = re.compile(
        ENGINE_TAG_RE_TEMPLATE.format(marker=re.escape(marker)),
        re.IGNORECASE | re.DOTALL,
    )
    matches = list(pattern.finditer(html))
    if len(matches) != 1:
        raise ExportError("Packaged entry lost its marked Engine script tag.")

    src = matches[0].group("src").split("?", 1)[0]
    expected = engine_target.as_posix()
    if src != expected:
        raise ExportError(
            f"Packaged Engine src is {src!r}; expected {expected!r}."
        )

    if "../../engine/" in html or "../engine/" in html:
        raise ExportError("Packaged entry still references the repository Engine path.")


def write_zip(source_dir: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(
        destination,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for path in sorted(source_dir.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(source_dir).as_posix())


def build(manifest_path: Path, repo_root: Path, out_dir: Path, check_only: bool) -> Path | None:
    manifest = load_manifest(manifest_path)
    work_dir = manifest_path.parent.resolve()
    repo_root = repo_root.resolve()

    entry = safe_relative(manifest.get("entry", "index.html"), "entry")
    output_name = Path(str(manifest.get("output") or f"{manifest.get('id', 'work')}-standalone.zip")).name
    if not output_name.lower().endswith(".zip"):
        output_name += ".zip"

    engine = manifest["engine"]
    engine_source = safe_relative(engine.get("source"), "engine.source")
    engine_target = safe_relative(engine.get("target", "sukimastock-engine.js"), "engine.target")
    marker = str(engine.get("htmlMarker") or "data-sse-engine").strip()
    if not marker:
        raise ExportError("engine.htmlMarker must not be empty.")

    include_paths = [safe_relative(item, "include item") for item in manifest["include"]]
    if entry not in include_paths:
        raise ExportError("Manifest entry must also appear in include.")

    for rel in include_paths:
        src = work_dir / rel
        if not src.is_file():
            raise ExportError(f"Required runtime file is missing: {rel.as_posix()}")

    canonical_engine = repo_root / engine_source
    if not canonical_engine.is_file():
        raise ExportError(f"Canonical Engine is missing: {engine_source.as_posix()}")

    if check_only:
        return None

    out_dir.mkdir(parents=True, exist_ok=True)
    destination = out_dir / output_name

    with tempfile.TemporaryDirectory(prefix="sse-standalone-") as temp_name:
        package_root = Path(temp_name)

        for rel in include_paths:
            source = work_dir / rel
            target = package_root / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)

        packaged_engine = package_root / engine_target
        packaged_engine.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(canonical_engine, packaged_engine)

        rewrite_engine_reference(package_root / entry, marker, engine_target.as_posix())
        validate_export_tree(package_root, entry, engine_target, marker)
        write_zip(package_root, destination)

    return destination


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Build a self-contained SukimaStock Web work ZIP."
    )
    parser.add_argument("manifest", type=Path, help="Path to standalone-export.json")
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="Repository root. Defaults to the parent of /engine.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Output directory. Defaults to <repo>/dist.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate the manifest and source files without creating a ZIP.",
    )
    args = parser.parse_args(argv)

    manifest_path = args.manifest.resolve()
    repo_root = args.repo_root.resolve()
    out_dir = (args.out or (repo_root / "dist")).resolve()

    try:
        result = build(manifest_path, repo_root, out_dir, args.check)
    except ExportError as exc:
        print(f"[standalone-export] ERROR: {exc}", file=sys.stderr)
        return 1

    if args.check:
        print(f"[standalone-export] OK: {manifest_path}")
    else:
        print(f"[standalone-export] built: {result}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
