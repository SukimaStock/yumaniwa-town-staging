# SukimaStock Engine v0.2

Updated: 2026-09-22

## Purpose

SukimaStock Engine exists to shorten the time between "the work runs" and "the author can inspect the small details."

It is not a system for making every work look or behave the same.

The engine owns repeated Web/runtime friction. Each work keeps its own rules, composition, writing, art, timing decisions, and identity.

## v0.2 implementation order

1. **Baseline consolidation** — complete
2. **Audio v2** — complete in canonical Engine
3. **Storage v2** — complete in canonical Engine
4. Asset Loader
5. Lifecycle + robust input
6. Performance controls
7. DevTools + Session Report

Later candidates:

- Result/history data helpers
- Feedback extension (particle / shake / hit-stop)
- Sensor extension
- Publisher integration

## 0.2 baseline

Canonical file:

```text
engine/sukimastock-engine.v0.2.0.js
```

The baseline starts from the stable v0.1.1 engine and brings back fixes that were proven inside real works.

### Integrated from CoffeeFactory

- Do not create an unnecessary AudioContext when the configured HTMLAudio pool is empty.
- This is especially important for works that use their own audio layer or have no engine-managed sounds.

### Integrated from DotWeather

- Optional `frameRate` configuration.
- When set, Engine throttles update/draw work to the requested rate and supplies a measured frame delta.
- When unset, behavior remains compatible with v0.1.1.

Example:

```js
SSE.createApp({
  id: "quiet-clock",
  frameRate: 30,
  // ...
});
```

### Integrated from ORBIT

- Remember the active primary pointer.
- On `blur` or `pagehide`, convert a still-active pointer into a synthetic `CANCELLED` touch and pass it through the normal Scene input route.
- This prevents stuck drag / movement state after leaving and returning to the page.

## Compatibility rule

The new canonical file is **not yet referenced by existing works**.

Current CoffeeFactory, Diorama Calendar, DotWeather, SteamClock and ORBIT builds keep their local engine copies until each migration step is tested.

This means adding the v0.2 baseline cannot change a currently published work by itself.

## Promotion rule

A feature enters Engine when both are true:

1. It has solved a real problem in at least two works, or it is clearly browser/runtime infrastructure rather than work-specific behavior.
2. Moving it into Engine reduces repeated maintenance without removing a work's ability to tune its own feel.

Do not promote:

- game rules
- work-specific physics
- compositions
- story logic
- named visual motifs
- one-off interaction ideas

Prefer promoting:

- browser lifecycle handling
- audio infrastructure
- persistence/version handling
- asset loading
- input normalization
- performance instrumentation
- debugging and test-report plumbing

## Source-of-truth rule

From v0.2 onward, reusable Engine changes are developed in `/engine` first.

A work may temporarily prove a new solution locally. Once promoted, the reusable version must be returned to `/engine` before it is copied to other works.

Do not let multiple work-local `sukimastock-engine.js` files silently become separate products again.

## Current status

Audio v2 now provides the shared infrastructure needed to replace much of CoffeeFactory's and ORBIT's duplicated audio plumbing:

- legacy HTMLAudio pool playback remains compatible
- `mode: "buffer"` SE with fetch/decode/preload
- master / music / SE buses
- BGM definitions and playback
- BGM fade / crossfade / level control
- bus volume control
- persistent global sound enable/disable

The work-specific volume curves, cue timing, and musical decisions remain in each work.

Existing works still keep their local Engine copies. Audio v2 will be validated during later work-by-work migration before those copies are removed.

## Storage v2

Storage v2 keeps the old `SSE.storage.set/get/has/remove/clear` API compatible while adding a safer structured API.

Example:

```js
const settings = SSE.storage.define("settings", {
  version: 2,
  fallback: {
    cups: 1,
    roast: "Medium",
  },
  migrations: {
    1(value) {
      return {
        ...value,
        roast: value.roast || "Medium",
      };
    },
  },
  validate(value) {
    return value && (value.cups === 1 || value.cups === 2);
  },
});

const current = settings.get();
settings.set({ cups: 2, roast: "Light" });
```

Storage v2 provides:

- app-scoped namespacing
- schema version per stored key
- step-by-step `migrations`
- catch-all `migrate(value, fromVersion, toVersion)`
- optional validation
- protection against silently overwriting newer/future data
- in-memory fallback when localStorage is missing, blocked, full, or throws
- same-session preference for the newest memory value when an older persistent value remains
- in-memory checkpoints for rollback-sensitive works
- `info()` for persistence/debug status

Checkpoint example:

```js
const save = SSE.storage.define("save", {
  version: 3,
  fallback: null,
});

save.set(currentHomeState);
save.checkpoint(); // clones the current saved value in memory

const latestHome = save.getCheckpoint(null);
```

A checkpoint is deliberately not persistent. It is the Engine-level equivalent of ORBIT's same-session HOME rollback safety: a failed persistent write must not force the current session back to an older state.

Existing works still keep their current save implementations until work-by-work migration is verified.

The next implementation step is Asset Loader.
