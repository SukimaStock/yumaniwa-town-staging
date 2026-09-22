# CoffeeFactory — Engine v0.2 Canary Migration

Updated: 2026-09-22

## Purpose

CoffeeFactory is the third real-work canary for canonical SukimaStock Engine v0.2.

Phase 1 changes only the Engine reference.

CoffeeFactory is deliberately treated more cautiously than SteamClock and Diorama Calendar because it already contains work-specific browser/audio/time infrastructure.

## Phase 1 changed

`index.html` now loads:

```text
../../engine/sukimastock-engine.v0.2.0.js
```

instead of the work-local v0.1.1 Engine.

Script order remains:

```text
codea-lite.js
→ canonical SukimaStock Engine v0.2
→ sketch.js
```

The local Engine copy is retained temporarily for rollback until real-device validation passes.

CoffeeFactory has no work-specific service worker.

## Intentionally unchanged in Phase 1

### RecipeClock

CoffeeFactory's clock has special hidden-page semantics:

- foreground uses `performance.now()`
- hidden/background time uses `Date.now()`
- returning to the page reconciles elapsed wall time

Canonical Engine lifecycle pauses Scene updates while hidden, but it does not decide CoffeeFactory's brewing-time semantics.

Therefore the work-local `RecipeClock.setHidden()` lifecycle path remains.

### Custom BGM

CoffeeFactory currently owns:

- one looping BGM media element
- Web Audio gain routing
- Setup / Prep / Brew / Finish scene volume levels
- gradual level interpolation
- the Finish drop / hold / rise curve
- user-gesture unlock handling

This remains unchanged for the canary.

### Custom SE

CoffeeFactory currently owns:

- Web Audio buffer fetch/decode
- per-sound volume
- cooldown
- playback-rate variation
- hidden-page muting

This also remains unchanged for Phase 1.

### Setup persistence

Coffee setup values still use the existing direct `localStorage` path.

No Storage v2 migration is included in the Engine-only canary.

## Why the duplicate lifecycle is currently acceptable

Canonical Engine lifecycle handles runtime safety:

- cancel active pointer
- clear keyboard state
- pause Scene update / Engine Motion
- reset frame timing on resume

CoffeeFactory's lifecycle handler handles work semantics:

- RecipeClock hidden-wall-time mode
- Prep clock hidden-wall-time mode
- custom BGM visibility state
- custom SE visibility state
- cue suppression after interruption

These are not yet the same responsibility.

## Static integration checks passed

- Codea Lite loads before Engine
- canonical v0.2 loads before sketch.js
- old local Engine is no longer referenced by index.html
- app id remains `coffeefactory`
- RecipeClock remains work-local
- work lifecycle listeners remain present
- custom BGM remains present
- custom SE remains present
- canonical Engine reports v0.2.0
- canonical Engine contains DevTools

## Real-device Staging check

Normal:

```text
https://sukimastock.github.io/yumaniwa-town-staging/works/coffee-factory/
```

Diagnostics:

```text
https://sukimastock.github.io/yumaniwa-town-staging/works/coffee-factory/?dev=1
```

Check:

1. Setup controls behave exactly as before
2. existing setup values still persist after reload
3. Prep timing works
4. 3-2-1 / Brew start pacing is unchanged
5. Pour / Wait transitions occur at the expected times
6. Pause / resume still works
7. previous/next pour controls still work
8. BGM starts after user interaction
9. BGM level still changes by scene
10. SE still plays
11. Finish BGM break / finish cue still works
12. sound enable/disable still works
13. while actively brewing, leave Safari for several seconds and return
14. RecipeClock should advance by the real elapsed background time
15. returning must not cause a large animation jump
16. no stuck input after return
17. SSE DEV appears only with `?dev=1`
18. Session Report has no unexpected Engine-level ERROR

Expected Phase 1 report limitations:

```text
ASSETS 0/0/0/0
```

because CoffeeFactory still loads its few icon assets outside SSE.assets.

The Engine Audio section will also not yet describe CoffeeFactory's custom BGM/SE internals. That is expected until the dedicated audio migration phase.

## Phase 2 after acceptance

Do not migrate all subsystems at once.

Recommended sequence:

1. Lifecycle wiring — use SSE.lifecycle events while preserving RecipeClock semantics
2. Setup Storage — move direct localStorage to Storage v2
3. icon assets — move to SSE.assets
4. SE — move to Audio v2
5. BGM — only after the scene-volume and Finish-break curve can be reproduced exactly

The BGM migration should be last because its feel has already been tuned through real brewing use.
