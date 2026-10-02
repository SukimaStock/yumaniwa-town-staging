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

## Ending author review

Each arrived seed grows one small pumpkin on the nursery surface, with a short
vine and two leaves. After growth, “もういちど” offers an early return. Waiting
keeps the farm in view briefly, then moves toward a central fruit and reveals
the existing half-pumpkin/title in that same place. The same music player keeps
running. An empty result keeps its quiet manual replay; Builder PLAY keeps its
farm view and existing RESET/EDIT controls.

Development placement fixtures: `?dev=1&ending=1` or `?dev=1&ending=9`.
They exercise real soil contact/growth after placement; they are separate from
ordinary-play verification. Device appearance and audible playback remain for
author review.
