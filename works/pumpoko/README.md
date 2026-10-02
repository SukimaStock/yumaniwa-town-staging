# PUMPOKO

Current staging entry: `works/pumpoko/` ([open game](./)).
Builder: `works/pumpoko/builder/` ([open Builder](./builder/)); see [BUILDER.md](./BUILDER.md).

From the repository root, serve locally with `python3 -m http.server 8000`
and open `http://localhost:8000/works/pumpoko/` (Builder: append `builder/`).
Run focused checks with `node --test works/pumpoko/test-*.cjs`.

The former `works/kotsu-koro/` and its `builder/` entry contain only compatibility
redirects. They preserve query/hash and replace the current history entry.
No game, Engine or audio is booted by those pages.

Legacy persistence keys are intentionally retained: `kotsu-koro.sound`,
`kotsu-koro-stage-builder-v1`, and the optional Engine language preference
`sse:kotsu-koro:language`. Do not rename, copy, clear or migrate them.
EXPORT now saves `pumpoko-stage.json`; old JSON filenames remain importable.
Stage schema, version, IDs, coordinates, materials and END are unchanged.

[VALIDATION.md](./VALIDATION.md), [RESEARCH.md](./RESEARCH.md), and historical
parts of [STAGE1.md](./STAGE1.md) retain the names/paths and SHAs of their
original observations. Immutable Plan Locks and pinned historical Git paths
also remain unchanged. See [MIGRATION.md](./MIGRATION.md) for the reference audit.

This remains an unregistered staging work. The rename does not add town
registration, analytics, production publication or standalone distribution.
A Draft PR is not a deployed new URL.
