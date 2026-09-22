# SteamClock — Engine v0.2 Canary Migration

Updated: 2026-09-22

## Purpose

SteamClock is the first real-work canary for the canonical SukimaStock Engine v0.2.

This first migration step intentionally changes as little work-specific code as possible.

## Changed

### index.html

SteamClock now loads:

```text
../../engine/sukimastock-engine.v0.2.0.js
```

instead of its local:

```text
sukimastock-engine.js
```

Script order remains:

```text
codea-lite.js
→ canonical SukimaStock Engine v0.2
→ SteamClock compatibility/deferred-asset helpers
→ sketch.js
```

The work-local v0.1.1 Engine file is deliberately retained for rollback/reference.

### PWA service worker

Cache version:

```text
steamclock-staging-v10
→ steamclock-staging-v11
```

The precache now includes the canonical Engine URL and no longer precaches the local Engine copy.

## Not changed yet

This canary step does **not** yet replace SteamClock's custom deferred image-loading shim with `SSE.assets`.

It does not change:

- clock visuals
- clock timing
- particle/effect behavior
- font handling
- SteamClock's existing `?debug=1` panel
- sketch.js
- work-specific tuning
- production release

The purpose is to isolate Engine compatibility before cleanup/refactoring.

## Static integration checks passed

- Codea Lite loads before Engine
- canonical v0.2 loads before sketch.js
- old local Engine is no longer referenced by index.html
- service worker cache version bumped
- canonical Engine is precached
- old local Engine is not precached
- SteamClock app id remains `steamclock`
- SteamClock still uses `SSE.createApp`
- canonical Engine reports version `0.2.0`
- canonical Engine contains DevTools

## Real-device Staging check

Open the direct work:

```text
https://sukimastock.github.io/yumaniwa-town-staging/works/steamclock/
```

Then the Engine diagnostic view:

```text
https://sukimastock.github.io/yumaniwa-town-staging/works/steamclock/?dev=1
```

Existing SteamClock debug tools can be combined:

```text
...?debug=1&dev=1
```

Check:

1. clock appears normally
2. analog / nixie time remain synchronized
3. gears / pendulum / steam / barometer still move
4. delayed decorative assets fill in normally
5. no unexpected pause after app switching
6. SSE DEV panel appears only with `?dev=1`
7. ATTENTION has no unexpected ERROR
8. COPY SESSION REPORT produces readable text
9. iPhone touch/scroll behavior around DevTools controls is usable
10. installed/offline PWA still starts after the v11 service worker has installed

## Next step after real-device pass

Only after the canary behavior is accepted:

- replace SteamClock's custom deferred-image shim with Asset Loader groups
- compare first paint / decorative-load timing
- remove duplication only if behavior is unchanged


## Phase 2 — Asset Loader migration

Completed after the Engine-only canary passed on a real SteamClock Session Report.

The first canary report showed healthy runtime performance but `ASSETS 0/0/0/0`, proving that SteamClock's custom image path was invisible to Engine diagnostics.

Phase 2 replaces that custom path with `SSE.assets`.

### Asset groups

```text
critical          6  immediate / high priority
decorativeEarly   4  after page load / 0ms / low priority
decorativeGauge   2  after page load / 150ms / low priority
decorativeLate    4  after page load / 300ms / low priority
```

Total tracked assets: 16.

The unused legacy `spring.png` is no longer requested.

### Gear compatibility

The previous gear model captured `images.gear1` / `images.gear2` when the gear list was first built.

That was compatible with the old transparent-placeholder shim, but unsafe when Asset Loader assigns delayed images later.

Gears now store an `imageKey` and resolve `images[imageKey]` while drawing, so delayed Assets can appear after startup without rebuilding gear geometry.

### Engine feedback from migration

The Asset Loader now exposes a loading Codea image reference through:

```js
SSE.assets.peek(name)
```

The reference is the same object that later becomes ready. Existing ready-only `SSE.assets.image(name)` semantics are unchanged.

### Removed

SteamClock no longer overrides `window.readImage` in `index.html`.

The custom transparent-placeholder / deferred-assets shim has been removed.

### PWA

SteamClock staging cache version is now:

```text
steamclock-staging-v13
```

### Static audit passed

- 16 unique image assets registered
- group counts: 6 / 4 / 2 / 4
- no direct SteamClock `readImage("assets/...")` calls remain
- old deferred `readImage` shim removed
- unused spring asset not requested
- gear images use dynamic binding
- sketch.js parses successfully
- canonical Engine parses successfully

### Expected real-device Session Report

After delayed Assets have completed:

```text
ASSETS
ready/loading/error/idle: 16/0/0/0
```

During the first few hundred milliseconds, some decorative groups may legitimately be `idle` or `loading`.
