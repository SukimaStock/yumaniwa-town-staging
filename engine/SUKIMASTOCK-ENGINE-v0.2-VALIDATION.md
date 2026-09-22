# SukimaStock Engine v0.2 Validation

Updated: 2026-09-22

Canonical engine:

```text
engine/sukimastock-engine.v0.2.0.js
```

## Baseline consolidation

Validated:

- JavaScript syntax
- CoffeeFactory-proven empty-audio-pool unlock guard
- DotWeather-proven optional frame-rate throttling
- ORBIT-proven active-pointer cancellation on blur/pagehide

Existing works do not reference the canonical v0.2 file yet, so these changes do not alter current published behavior by themselves.

## Audio v2 smoke test

Validated with mocked Web Audio / HTMLAudio runtime:

- engine construction
- Audio v2 configuration
- buffer preload
- buffer SE playback
- BGM playback
- music bus volume changes
- music level fade path
- global sound disable/enable
- legacy `SSE.audio.play()` remains present

## Storage v2 smoke test

Validated:

1. Legacy `set/get` compatibility
2. Versioned migration from schema v1 to v2
3. Migrated value is rewritten at the new version
4. Future/newer schema is not overwritten by an older Engine definition
5. Failed localStorage write keeps the newer memory value for the current session
6. An older persistent value cannot override that newer in-memory value
7. Completely blocked localStorage still allows current-session storage
8. Checkpoints clone their value and are isolated from later mutation
9. Calling checkpoint without existing data fails instead of inventing state
10. Validation rejects invalid writes and accepts valid writes
11. `info()` reports whether the latest state is actually persistent or memory-preferred

## Migration rule

No existing work is migrated to canonical v0.2 until its current behavior can be compared directly against the new Engine path.

The preferred order remains:

```text
build shared capability in /engine
→ smoke test
→ migrate one real work
→ compare behavior
→ only then remove duplicated work-local code
```


## Asset Loader smoke test

Validated:

1. Nested asset groups resolve correctly
2. Duplicate asset names are removed while preserving order
3. Image preload completes and records ready state
4. Best-effort image fetch priority is applied
5. JSON and text assets load through fetch
6. Audio assets bridge to Audio v2 preload
7. Idle-scheduled preload completes
8. Group progress reports total/ready/loading/error/idle
9. Asset report exposes status/type/file/error metadata
10. Hard image release removes the Codea Lite cache entry
11. Released images return to idle state
12. A released image can be preloaded again successfully

The release path deliberately checks whether another active asset record references the same file before dropping the shared Codea image/cache entry.


## Lifecycle + robust input smoke test

Validated:

1. Keyboard action binding works for Code-based and key-based input
2. Bound keys can prevent browser default behavior
3. Pressed/released keyboard state lasts for one rendered Engine frame
4. Held state remains until keyup
5. Blur clears held keyboard state
6. Blur dispatches a synthetic CANCELLED touch for an active pointer
7. Blur does not pause by default
8. `pauseOnBlur: true` pauses and focus resumes
9. `visibilitychange → hidden` pauses the Engine
10. Scene update does not advance while lifecycle-paused
11. Visible state resumes Engine update
12. Currently playing BGM pauses during lifecycle pause and resumes afterward
13. `pagehide/pageshow` pause/resume works
14. Stacked `hidden + pagehide` reasons are cleared safely on visible pageshow
15. Pause/resume listeners fire only on actual paused-state transitions
16. Resume resets Engine frame timing so hidden time is not applied as a large next-frame delta


## Performance controls smoke test

Validated with a deterministic mocked clock:

1. `performance.targetFps` throttles rendered Engine frames
2. Skipped RAF calls are counted separately from rendered frames
3. Current / average / minimum FPS are derived from actual rendered-frame intervals
4. Slow-frame detection respects target frame time
5. p95 and maximum frame interval are reported
6. Scene update cost is measured independently
7. Scene draw cost is measured independently
8. Total Engine work cost is measured
9. Lifecycle pause duration is accumulated separately from active time
10. Resume resets frame timing so hidden time does not become one huge frame
11. Deliberately low target FPS expands the Engine delta cap appropriately
12. `report()` returns the same structured data as `snapshot()`
13. `reset()` clears session metrics
14. Legacy `frameRate` remains supported
15. `performance.targetFps` overrides legacy `frameRate`
16. Performance metrics may be disabled while FPS throttling remains active

Deterministic calibration case:

- target: 30fps
- one throttled RAF call
- normal rendered intervals: about 33.4ms
- one slow rendered interval: 80ms
- mocked Scene update cost: 2ms
- mocked Scene draw cost: 4ms
- lifecycle pause: exactly 500ms

The Engine reported:

- one skipped frame
- one slow frame
- minimum FPS: 12.5
- maximum/p95 interval: 80ms
- average update cost: 2ms
- average draw cost: 4ms
- paused time: 500ms


## DevTools + Session Report smoke test

Validated:

1. `?dev=1` enables DevTools in automatic mode
2. DevTools query parsing does not require `URLSearchParams`
3. Structured Session Report includes app, environment, lifecycle, performance, audio, storage, assets, input, tuning and diagnostics
4. Human-readable report includes an `ATTENTION` section
5. Numeric tuning values can be registered, read and changed
6. Tuning callbacks receive live values
7. Clipboard copy returns the exact generated Session Report text
8. Lifecycle pause/resume events appear in diagnostics
9. Runtime errors captured by the Engine appear in diagnostics and ATTENTION
10. Asset load failure appears in diagnostics and ATTENTION
11. Storage memory fallback appears in diagnostics and ATTENTION
12. Unexpected active AudioContext suspension appears in ATTENTION
13. Slow-frame observation appears in ATTENTION
14. Diagnostic warnings/errors are summarized
15. A clean session synthesizes `[OK] No Engine-level problems detected`

Combined fault-injection test intentionally produced:

- a Storage write failure
- an Asset 404
- a suspended AudioContext while active
- a slow frame
- a captured runtime exception

The generated health codes included:

```text
runtime-error
asset-error
storage-memory-fallback
audio-suspended
slow-frames
diagnostic-errors
```

The generated human-readable report contained all major sections and the registered tuning value.

## DevTools panel smoke test

Validated with a minimal DOM implementation:

1. Panel mounts only when DevTools is enabled
2. Live summary renders performance / Asset / Audio / Storage information
3. Registered numeric tuning appears as a range control
4. Slider input updates the work live
5. Slider movement does not rebuild its DOM control on every input event
6. Final slider change is recorded as a diagnostic event
7. Refresh interval updates the live summary
8. Copy Session Report works from the same DevTools state

## Diagnostic hardening found during testing

Testing exposed two assumptions inside the diagnostic layer itself:

1. `URLSearchParams` may not exist in lightweight or restricted runtimes.
2. A `document` object may exist without the full browser DOM methods used by the visual error overlay.

Both assumptions were removed.

The diagnostic/reporting path therefore continues to function even when the visual overlay cannot be mounted.

## v0.2 foundation validation status

All seven planned foundation areas now have implementation-level smoke coverage:

1. Baseline consolidation
2. Audio v2
3. Storage v2
4. Asset Loader
5. Lifecycle + robust input
6. Performance controls
7. DevTools + Session Report

This is not yet equivalent to real-device validation of migrated works.

The next validation phase is work-by-work migration on Staging.


## Real-work calibration — SteamClock canary

SteamClock produced the first real Session Report after migration to canonical Engine v0.2:

- 294 rendered frames
- average FPS: 59.9
- minimum FPS: 34.5
- average frame interval: 16.7ms
- p95 frame interval: 17ms
- maximum frame interval: 29ms
- average update cost: 0.03ms
- average draw cost: 1.13ms
- one frame crossed the original slow-frame threshold

The original health rule warned whenever `slowFrames > 0`. This made one isolated near-threshold frame appear as ATTENTION even though the sustained performance was healthy.

Health synthesis was calibrated using this real-work result.

A slow-frame warning now requires at least one of:

- p95 frame interval exceeds the slow-frame threshold
- at least 3 slow frames and at least 2% of measured update frames are slow
- a severe single hitch exceeds `max(120ms, slowThreshold × 4)`

The SteamClock sample now synthesizes a healthy status, while repeated slow frames, sustained p95 degradation, and a severe isolated hitch still produce warnings.


## Asset Loader real-work refinement — loading image references

SteamClock migration exposed a Codea-specific requirement: a work may need to retain the image object while it is still loading.

Asset Loader now supports:

```js
SSE.assets.peek(name)
```

for loading/ready records while preserving `SSE.assets.image(name)` as ready-only.

Validated:

- `peek()` exposes the Codea image during loading
- fetch priority is already applied to that object
- the resolved ready image is the exact same object
- `image()` still returns null until ready
- after readiness, both APIs refer to the same image object


## Audio baseline validation

The opt-in SukimaStock audio baseline was added after CoffeeFactory real-device tuning exposed a repeated AI-assisted workflow problem: newly implemented audio was often attenuated too aggressively and then manually raised several times.

Validated:

1. `SSE.audio.baseline()` returns the `sukimastock` preset
2. baseline buses are `master=1.0 / music=1.0 / se=1.0`
3. BGM reference values are `0.075 / 0.135 / 0.225 / 0.270`
4. SE reference values are `0.24 / 0.36 / 0.46 / 0.68 / 0.75`
5. `SSE.audio.withBaseline(options)` merges work overrides without losing nested audio config
6. returned baseline data is cloned; mutating one returned object does not alter the canonical preset
7. legacy `audio.configure({})` defaults remain unchanged at `master=0.7 / music=1 / se=1`
8. therefore existing works are unaffected unless they explicitly opt in

The authoring rule is documented in:

```text
engine/SUKIMASTOCK-AUDIO-BASELINE.md
```

This baseline is intentionally a starting point, not an automatic remastering system.
