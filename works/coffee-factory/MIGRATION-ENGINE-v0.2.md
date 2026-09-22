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


## Phase 1 real-device result

Accepted.

The Engine-only canary completed through Finish with no Engine-level warnings.

Observed:

```text
FPS average: 59.9
p95: 17ms
max: 29ms
update average: 0.27ms
draw average: 0.91ms
active session: 54.1s
paused/background time: 16.7s
```

Three hidden/resume cycles were recorded by SSE.lifecycle, and CoffeeFactory still completed normally.

## Phase 2 — lifecycle wiring

CoffeeFactory no longer listens directly to:

```text
visibilitychange
pagehide
pageshow
```

These browser events are now normalized by the canonical Engine.

The work subscribes to:

```js
SSE.lifecycle.onPause(() => lifecycle(true));
SSE.lifecycle.onResume(() => lifecycle(false));
```

The existing CoffeeFactory `lifecycle(hidden)` function remains responsible for work semantics:

- RecipeClock hidden-wall-time mode
- Prep clock hidden-wall-time mode
- custom BGM hidden state
- custom SE hidden state
- cue suppression after interruption

The Engine remains responsible for runtime safety:

- suspend Scene update while hidden
- cancel active pointer
- clear keyboard state
- reset frame timing on resume

### RecipeClock smoke validation

A deterministic clock test verified:

```text
foreground +2.0s      -> 2.0s
hidden +8.0s          -> 10.0s
visible resume        -> 10.0s
foreground +1.5s      -> 11.5s
```

This confirms that replacing browser listeners with SSE.lifecycle did not change CoffeeFactory's background-time semantics.

Direct `visibilitychange`, `pagehide`, and `pageshow` listeners are now absent from the work.

The work-local blur and resize gesture-reset listeners remain.


## Phase 2 real-device result

Accepted.

After routing CoffeeFactory through `SSE.lifecycle`, a Brew session was backgrounded for 18.1 seconds and resumed normally.

Session health remained:

```text
ATTENTION
[OK] No Engine-level problems detected in this session.

FPS average: 60.0
p95: 17ms
max: 29ms
paused/background time: 18.1s
```

The work remained in Brew after resume and the Engine recorded the hidden/resume pair once.

## Phase 3 — Setup persistence migrated to Storage v2

CoffeeFactory's setup choices now use:

```js
SSE.storage.define("setup", {
  version: 1,
  ...
})
```

The stored payload contains:

- cup preset
- bean grams
- roast

Runtime-fixed values `grind: "Coarse"` and `recipeMode: "kasuya"` remain work semantics and are reconstructed after loading.

### Existing-user migration

The previous direct key:

```text
coffeefactory.v1.setup
```

is imported once when no Storage v2 setup record exists.

The new canonical key is:

```text
sse:coffeefactory:data:setup
```

The old key is removed only when the new record is confirmed persistent.

If localStorage persistence fails:

- the current session continues with Storage v2 memory fallback
- the old legacy key remains untouched for the next page load
- DevTools can report the memory-only state

### Validation

Deterministic Storage tests passed:

- legacy setup values preserved
- new v2 namespace created
- legacy key removed after successful persistent migration
- legacy key retained after simulated persistent-write failure
- memory fallback keeps the migrated value usable during the session
- clean install uses the expected default setup

## Phase 3 real-device check

Change setup to a clearly non-default combination, for example:

```text
2 cups
27g
Light roast
```

Reload the page.

The same choices should remain.

Session Report should now include a Storage entry similar to:

```text
STORAGE
- setup v1 | persistent=true | memory=true | memoryPreferred=false
```

The exact `memory` value may depend on whether the record has been read in the current session, but `persistent=true` and `memoryPreferred=false` are the important expected values.


## Phase 3 real-device result

Accepted.

Storage v2 is now visible in Session Report:

```text
STORAGE
- setup v1 | persistent=true | memory=true | memoryPreferred=false
```

This confirms that setup persistence is durable and not using the in-memory fallback.

## Phase 4 — visual assets migrated to SSE.assets

CoffeeFactory had four direct image loads:

- cup icon
- bean icon
- kettle icon
- factory exterior line art

All four are now registered in the canonical Asset Loader.

Asset ids:

```text
icon.cup
icon.beans
icon.water
factory.exterior
```

They are grouped as:

```text
visuals
```

and loaded at high priority during app setup.

The work now uses `SSE.assets.peek()` to bind the Codea image object immediately while loading, preserving the existing first-render behavior.

### Static audit

Passed:

- 4 registered visual assets
- 4 assets in the `visuals` group
- zero direct `loadImage()` calls remain
- zero direct `readImage()` calls remain
- sketch parses successfully

### Phase 4 real-device expectation

After initial loading settles:

```text
ASSETS
ready/loading/error/idle: 4/0/0/0
```

Visual checks:

- cup icon visible
- bean icon visible
- kettle icon visible
- factory exterior illustration visible
- no initial flash or missing-image regression
