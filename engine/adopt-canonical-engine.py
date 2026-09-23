#!/usr/bin/env python3
"""Switch a local SukimaStock work from its bundled Engine to canonical /engine.

The local Engine copy is kept by default as a rollback canary.
Use --remove-local only after the Staging canary has been accepted.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path


SCRIPT_TAG_RE_TEMPLATE = r"<script\b(?=[^>]*\b{marker}\b)[^>]*>"
SRC_RE = re.compile(r"""\bsrc\s*=\s*(["\'])(?P<src>.*?)\1""", re.IGNORECASE | re.DOTALL)


class AdoptError(RuntimeError):
    pass


def marked_engine_tag(html: str, marker: str):
    pattern = re.compile(
        SCRIPT_TAG_RE_TEMPLATE.format(marker=re.escape(marker)),
        re.IGNORECASE | re.DOTALL,
    )
    matches = list(pattern.finditer(html))
    if len(matches) != 1:
        raise AdoptError(
            f"Expected exactly one <script {marker} ...>; found {len(matches)}."
        )
    match = matches[0]
    src_match = SRC_RE.search(match.group(0))
    if not src_match:
        raise AdoptError("Marked Engine script has no src attribute.")
    return match, src_match


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Adopt the canonical SukimaStock Engine for a work."
    )
    parser.add_argument("work_dir", type=Path, help="Work folder, e.g. works/my-game")
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="Repository root. Defaults to the parent of /engine.",
    )
    parser.add_argument(
        "--engine",
        default="engine/sukimastock-engine.v0.2.0.js",
        help="Canonical Engine path relative to repository root.",
    )
    parser.add_argument(
        "--marker",
        default="data-sse-engine",
        help="HTML attribute marking the Engine script.",
    )
    parser.add_argument(
        "--remove-local",
        action="store_true",
        help="Delete work-local sukimastock-engine.js after an accepted canary.",
    )
    args = parser.parse_args(argv)

    repo_root = args.repo_root.resolve()
    work_dir = args.work_dir.resolve()
    entry = work_dir / "index.html"
    engine = (repo_root / args.engine).resolve()

    try:
        work_dir.relative_to(repo_root)
    except ValueError as exc:
        raise SystemExit("[adopt-engine] ERROR: work_dir must be inside the repository.") from exc

    if not entry.is_file():
        print("[adopt-engine] ERROR: index.html is missing.", file=sys.stderr)
        return 1
    if not engine.is_file():
        print("[adopt-engine] ERROR: canonical Engine is missing.", file=sys.stderr)
        return 1

    try:
        html = entry.read_text(encoding="utf-8")
        tag_match, src_match = marked_engine_tag(html, args.marker)
    except AdoptError as exc:
        print(f"[adopt-engine] ERROR: {exc}", file=sys.stderr)
        return 1

    relative = os.path.relpath(engine, work_dir).replace(os.sep, "/")
    tag = tag_match.group(0)
    quote = src_match.group(1)
    rewritten_tag = (
        tag[: src_match.start()]
        + f"src={quote}{relative}{quote}"
        + tag[src_match.end() :]
    )
    html = html[: tag_match.start()] + rewritten_tag + html[tag_match.end() :]
    entry.write_text(html, encoding="utf-8")

    local_engine = work_dir / "sukimastock-engine.js"
    if args.remove_local and local_engine.exists():
        local_engine.unlink()

    print(f"[adopt-engine] canonical: {relative}")
    if local_engine.exists():
        print("[adopt-engine] rollback copy retained: sukimastock-engine.js")
    elif args.remove_local:
        print("[adopt-engine] local rollback copy removed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
