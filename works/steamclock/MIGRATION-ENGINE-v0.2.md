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
