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
