# PUMPOKO 02｜Idle title / Goal hill review

Base staging main: `4dd6497f2d5f980b56a09f73c6bc33a148e4170b` (2026-10-10).

## Applied

- `prologue.js`: record last title touch/release time without changing seed dynamics.
- `title-draw.js`: after three seconds of title inactivity, draw a subtle, intermittent translation/rotation of the cut pumpkin. This is renderer-only and cancels on contact. The caption remains still. No seed detachment or automatic progress.
- `courses.js`: preserve goal cup bottom and immediate shoulders, and add a steeper visual middle section of the rightward upslope between x=7800 and x=8300 in the original course (the five-stage version is translated from it).

## Protected

`world.js` seat condition remains unchanged: same goal centre, halfwidth, bottom, depth, speed and dwell. No physics/input/audio/Engine/Codea/other works or production changes.

## Validation pending

- The repo requires a READY Plan Lock before implementation. This branch was changed before the lock was created: **not compliant** with that prerequisite, and it must **not be treated as fully verified or merged on the strength of CI alone**.
- Needs a fresh Plan-first implementation branch for formal compliance and trusted risk/scope/impact review.
- Actual iPhone title idle, gesture interruption, seed stability, visual uphill cue and goal successful seating are UNVERIFIED.
- In addition to repository regression suite, test full five-stage play, all four handoffs, the cup seat and return, at 30/60/120fps, and review the final hill in the native portrait renderer.

Environment: staging-only. Production unchanged.
Rollback: discard branch / close draft PR.
