# SukimaStock New Work Flow

Updated: 2026-09-22

## Principle

The goal is not to put every unfinished idea on the Web immediately.

Use the environment that matches the stage of the work:

```text
LOCAL
large changes, fast destruction/rebuild

STAGING
real browser, real device, observation and refinement

RELEASE
frozen artifact, final smoke test, distribution
```

The handoff from Local to Staging happens when the work has **one meaningful playable loop**, not when it is "50% complete."

## 1. Start local

Use the current `SukimaStock-New-Work` starter artifact.

The local starter contains a frozen Engine snapshot so it can run independently of the repository.

Change `work-config.js` first, then work mainly in `sketch.js`.

During this phase:

- change structure aggressively
- replace whole systems if needed
- find the core interaction
- do not over-audit temporary implementation
- do not create a work-specific Engine fork

## 2. First playable loop

Examples:

```text
title -> play -> result
setup -> action -> finish
depart -> explore -> return
```

Once this exists, move the work into:

```text
works/<work-id>/
```

Then adopt the canonical Engine:

```bash
python3 engine/adopt-canonical-engine.py works/<work-id>
```

The local Engine copy is retained as rollback until the first Staging canary passes.

## 3. Staging canary

Do not redesign during the first migration pass.

Verify the same work against the canonical Engine.

Use:

```text
/works/<work-id>/
/works/<work-id>/?dev=1
```

The Starter automatically cache-busts `work-config.js` and `sketch.js` only on the Staging repository URL.

Check:

- ordinary play loop
- touch / keyboard as relevant
- audio
- save/load if present
- Safari background/resume
- Session Report

After acceptance:

```bash
python3 engine/adopt-canonical-engine.py works/<work-id> --remove-local
```

Now the repository owns one Engine again.

## 4. Web refinement

This is the long polishing phase:

```text
Push
-> touch on real device
-> observe
-> adjust
-> Push
-> repeat
```

DevTools is used when hidden runtime facts matter. It is not a substitute for touching the work.

## 5. Feed repeated friction back to Engine

A repeated annoyance is an Engine candidate only when it is generic.

Promote when:

- it has appeared in multiple works, or
- it is browser/runtime infrastructure, and
- common handling reduces maintenance without removing work-specific tuning freedom

Do not promote:

- story logic
- work physics
- composition
- motifs
- one-off interactions
- aesthetic timing that belongs to one work

## 6. Release

For Yumaniwa-only works, keep the canonical Engine reference.

For standalone/itch works, create a `standalone-export.json` and build from the canonical Engine:

```bash
python3 engine/export-standalone.py works/<work-id>/standalone-export.json
```

The exporter packages a frozen Engine copy into the release artifact.

The generated artifact itself must receive one final smoke test.

## Symmetry

The full Engine lifecycle is now:

```text
LOCAL STARTER
frozen Engine snapshot
        ↓
STAGING
canonical Engine
        ↓
STANDALONE RELEASE
frozen Engine snapshot
```

Humans should not manually maintain those copies.

The Engine is centralized while developing and frozen only at the edges where independence is useful.
