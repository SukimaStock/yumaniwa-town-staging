# DotWeather — Engine v0.2 Migration

Updated: 2026-09-22

## Purpose

DotWeather is the next real-work migration after SteamClock, Diorama Calendar, and CoffeeFactory.

Unlike CoffeeFactory, DotWeather already uses the Engine for most shared concerns. The main migration risk is therefore compatibility rather than subsystem replacement.

## Audit summary

DotWeather currently has:

- 14 work-side JavaScript modules
- local Engine v0.1.1
- 30fps Engine configuration
- 7 persisted keys
- 6 Engine-generated tone call sites
- Open-Meteo forecast requests
- Open-Meteo geocoding requests
- staging-only weather-state override Debug UI
- zero direct image loads
- zero work-side browser lifecycle listeners

Persisted keys:

```text
activeCity
cityState
customCitiesV1
lowPower
temperatureUnit
viewMode
weatherCacheV1
```

## What stays work-local

### Open-Meteo integration

Keep in DotWeather:

- forecast endpoint and query shape
- geocoding endpoint and query shape
- request timeout policy
- AbortController handling
- 30-minute refresh policy
- 12-hour cache-age policy
- response normalization
- demo fallback
- city catalog and custom-city behavior

These are product semantics, not generic Engine infrastructure.

### DotWeather Debug

`dotweather-debug.js` stays.

It is not a replacement for Engine DevTools.

DotWeather Debug is a staging-only **weather-state simulator**:

- force clear/cloudy/rain/etc.
- force dawn/day/dusk/night
- force wind speed
- force wind direction
- return immediately to live Open-Meteo conditions

Engine DevTools observes runtime health.

Both serve different purposes.

### Existing sound levels

DotWeather's existing `SSE.audio.tone()` values remain unchanged.

The new SukimaStock Audio Baseline is for future/new audio implementation and is not automatically applied during migration of an existing work.

## Phase 1 — canonical Engine canary

Only `index.html` changed.

Before:

```text
sukimastock-engine.js
```

After:

```text
../../engine/sukimastock-engine.v0.2.0.js
```

The local v0.1.1 Engine copy remains temporarily for rollback.

No DotWeather work code changed.

## Compatibility checks passed

- Codea Lite loads before canonical Engine
- canonical Engine loads before DotWeather modules
- DotWeather modules load before sketch
- old local Engine is no longer referenced by index.html
- `frameRate: 30` remains unchanged
- legacy `SSE.storage` API is preserved by v0.2
- `SSE.audio.tone()` is preserved
- analytics API is preserved
- canonical Lifecycle is available
- canonical DevTools is available
- DotWeather staging weather Debug remains present

## Real-device Staging check

Normal:

```text
https://sukimastock.github.io/yumaniwa-town-staging/works/dotweather/
```

Diagnostics:

```text
https://sukimastock.github.io/yumaniwa-town-staging/works/dotweather/?dev=1
```

Check:

1. weather screen renders normally
2. frame rate remains around 30fps
3. current saved city remains selected
4. temperature unit remains saved
5. Low Power remains saved
6. Forecast / Ambient mode remains saved
7. live weather refresh works
8. city search works
9. manual refresh success/error tone still behaves as before
10. city/menu interaction tones remain as before
11. staging DotWeather DEV weather override panel still works
12. Engine DevTools also opens with `?dev=1`
13. background / resume does not leave touch or scrolling stuck
14. no Engine-level errors in Session Report

Expected current limitations:

- Session Report may show no defined Storage v2 keys even though legacy-compatible Engine storage contains DotWeather data.
- ASSETS should remain `0/0/0/0` because DotWeather has no image assets to migrate.

## Next phase after canary acceptance

Do not change network behavior.

The useful next step is Storage v2 definitions for the current DotWeather keys so DevTools can report their persistence state and future schema migrations can be explicit.

The old `activeCity` key should be treated as legacy compatibility data rather than promoted as a current schema.

No Asset Loader migration is needed unless future DotWeather versions add external visual assets.


## Phase 1 real-device result

Accepted.

Session Report:

```text
ATTENTION
[OK] No Engine-level problems detected in this session.

PERFORMANCE
FPS average: 29.4
FPS current: 30.3
minimum FPS: 20.4
frame p95: 41ms
frame max: 49ms
rendered/skipped/slow: 1049 / 1087 / 1
draw average: 7.92ms
```

The approximately 1:1 rendered/skipped ratio is expected because DotWeather intentionally targets 30fps while the browser RAF runs around 60Hz.

One slow frame out of 1049 rendered frames does not indicate a sustained problem.

Audio context was active and Engine health remained clean.

## Phase 2 — Storage v2 schemas

Seven existing DotWeather storage keys are now registered with Storage v2:

```text
cityState
activeCity
temperatureUnit
lowPower
viewMode
customCitiesV1
weatherCacheV1
```

All remain schema version 1.

No persistent data rewrite is required because local Engine v0.1.1 already stored values as:

```json
{ "version": 1, "value": ... }
```

which is directly compatible with Storage v2.

### Validation added

- `cityState`: versioned object with string city ids
- `activeCity`: string
- `temperatureUnit`: C or F
- `lowPower`: boolean
- `viewMode`: forecast or ambient
- `customCitiesV1`: versioned city array
- `weatherCacheV1`: versioned cache object with timestamp and forecast map

### Compatibility smoke test

Representative records written in the exact old v0.1.1 wrapper format were read through canonical v0.2.

Validated:

- all seven values preserved exactly
- all remained persistent
- all reported stored schema version 1
- no migration rewrite occurred
- invalid temperature unit was rejected
- invalid view mode was rejected
- rejected writes did not corrupt the existing saved value

`activeCity` remains defined only for backward compatibility. `cityState` is the current authoritative city-selection structure.

## Phase 2 real-device expectation

Session Report should now list Storage v2 entries instead of:

```text
No defined Storage v2 keys.
```

Most existing-used keys should report:

```text
v1 | persistent=true | memory=true | memoryPreferred=false
```

A key that has never been written on that installation may legitimately show no stored version/persistence yet.

No network, cache-age, refresh, city-search, visual, or audio behavior changed in Phase 2.


## Phase 2 cache note

The first real-device report after adding Storage v2 definitions still showed:

```text
STORAGE
No defined Storage v2 keys.
```

Repository inspection confirmed that the seven schema definitions were present in the current `sketch.js`.

The cause was an unversioned script reference:

```html
<script src="sketch.js"></script>
```

which allowed the browser/CDN to reuse an older cached copy.

The page now loads:

```html
<script src="sketch.js?v=20260922-storage-v2"></script>
```

so the Storage v2 definitions are forced into the next real-device load.

This did not change DotWeather behavior; it only guarantees that the migrated work script is the version actually executed.
