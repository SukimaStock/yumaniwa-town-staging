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
4. **Asset Loader** — complete in canonical Engine
5. **Lifecycle + robust input** — complete in canonical Engine
6. **Performance controls** — complete in canonical Engine
7. **DevTools + Session Report** — complete in canonical Engine

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

## Asset Loader

Asset Loader centralizes **when** assets are loaded and released without deciding **what** a work should contain.

It supports:

- images through the Codea Lite image loader
- JSON / text / binary fetches
- audio references that bridge to Audio v2 preload
- named asset groups
- nested groups with duplicate removal
- immediate preload
- scheduled preload after page load or during browser idle time
- best-effort fetch priority hints
- loading progress
- asset status/report data
- explicit release and Codea Lite image-cache cleanup
- reloading after release

Example:

```js
SSE.createApp({
  id: "small-diorama",
  assets: {
    items: {
      frame: "assets/frame.png",
      janBack: "assets/jan/back.webp",
      janFront: "assets/jan/front.webp",
      febBack: "assets/feb/back.webp",
      febFront: "assets/feb/front.webp",
    },
    groups: {
      common: ["frame"],
      january: ["janBack", "janFront"],
      february: ["febBack", "febFront"],
    },
  },
  setup() {
    SSE.assets.preload(["common", "january"], { priority: "high" });
    SSE.assets.schedule("february", {
      when: "idle",
      priority: "low",
    });
  },
});
```

A work can then keep a moving window of assets:

```js
await SSE.assets.preload(["previousMonth", "currentMonth", "nextMonth"]);
SSE.assets.release("monthThatMovedOutOfRange", { hard: true });
```

For Codea images, hard release removes the corresponding entry from Codea Lite's image cache and drops the decoded image reference when it is no longer shared by another active asset record.

This is the Engine-level version of the loading patterns already proven in Diorama Calendar and SteamClock: current/important visual material first, neighboring or decorative material later.

Audio files themselves remain defined by Audio v2. Asset Loader can include an audio reference in a visual/data preload group:

```js
items: {
  readyCue: { type: "audio", audio: "ready" },
}
```

so one semantic group can describe everything a Scene needs.

## Lifecycle + robust input

The Engine now owns browser lifecycle transitions instead of asking every work to wire `visibilitychange`, `pagehide`, `pageshow`, `blur`, and `focus` separately.

Default behavior:

- `visibilitychange → hidden` pauses the Engine
- `pagehide` pauses the Engine
- `pageshow` resumes the pagehide reason and also clears a stale hidden reason when the document is already visible
- `blur` always cancels active pointer/keyboard state but does not pause by default
- `pauseOnBlur: true` is available for works that should fully pause on desktop focus loss
- while paused, Scene update and Engine Motion stop while drawing remains available
- the first resumed frame does not inherit a large hidden-time delta
- Audio v2 pauses currently playing music and suspends Web Audio when possible, then resumes only the audio that had actually been playing

Example:

```js
SSE.createApp({
  id: "timer-work",
  lifecycle: {
    autoAudio: true,
    pauseOnBlur: false,
  },
  // ...
});

SSE.lifecycle.onPause(({ reason }) => {
  timer.setHidden(true);
});

SSE.lifecycle.onResume(() => {
  timer.setHidden(false);
});
```

The lifecycle API also supports manual reasons:

```js
SSE.lifecycle.pause("modal-external");
SSE.lifecycle.resume("modal-external");
```

Pause reasons are stacked. The Engine resumes only when all active reasons have been cleared.

### Pointer safety

An active primary pointer is remembered by the Engine. On blur, pagehide, or lifecycle pause it is converted to a synthetic `CANCELLED` touch and sent through the normal Scene route before pointer state is cleared.

This prevents stuck drag/thrust/movement state when the browser interrupts a gesture.

### Keyboard input

The Engine now provides normalized keyboard state and action bindings:

```js
SSE.createApp({
  keyboard: {
    bindings: {
      left: ["ArrowLeft", "KeyA"],
      right: ["ArrowRight", "KeyD"],
      action: ["Space"],
    },
  },
});

if (SSE.input.action("left")) {
  // held
}

if (SSE.input.actionPressed("action")) {
  // first frame only
}

if (SSE.input.actionReleased("action")) {
  // release frame only
}
```

Available helpers include:

- `bind(action, keys)`
- `unbind(action)`
- `isDown(key)`
- `wasPressed(key)`
- `wasReleased(key)`
- `action(name)`
- `actionPressed(name)`
- `actionReleased(name)`

Bound keys prevent browser default behavior by default. Keyboard state is cleared on blur/lifecycle interruption so a missing keyup event cannot leave an action stuck.

This is the shared version of the browser-interruption fixes already proven in ORBIT and the lifecycle handling previously written directly inside CoffeeFactory.

## Performance controls

Performance controls combine frame-rate targeting with lightweight runtime measurement.

The existing `frameRate` option remains supported for compatibility. New works can use:

```js
SSE.createApp({
  id: "quiet-clock",
  performance: {
    targetFps: 30,
    sampleWindow: 120,
    slowFrameFactor: 1.75,
  },
});
```

`performance.targetFps` takes precedence over the legacy `frameRate` value.

The Engine records:

- current / average / minimum FPS
- current / average / p95 / maximum frame interval
- update cost
- draw cost
- total Engine work cost
- RAF calls
- rendered frames
- update frames
- frames skipped by FPS throttling
- slow frames
- paused draws
- total paused time
- pause count
- active session time

Example:

```js
const report = SSE.performance.snapshot();

console.log(report.fps.average);
console.log(report.frame.p95Ms);
console.log(report.frames.slow);
console.log(report.session.pausedMs);
```

`SSE.performance.report()` currently returns the same structured snapshot and is intended as the handoff point for DevTools / Session Report.

A slow frame is judged against the work's target frame interval. By default the threshold is:

```text
target frame time × 1.75
```

so a deliberate 30fps work is not treated as slow merely because it is not running at 60fps. A fixed threshold can be supplied with `slowFrameMs`.

For low-FPS works, Engine delta clamping also expands with the target frame interval instead of permanently using the old 50ms cap. This prevents a deliberately low target FPS from making time-based motion run too slowly.

Important: Performance controls do **not** automatically lower quality, reduce effects, or change a work's target FPS. The Engine measures and reports; the author keeps control over feel.

Metrics can be disabled while frame-rate throttling remains active:

```js
performance: {
  enabled: false,
  targetFps: 30,
}
```

This keeps measurement optional without changing the work's timing policy.

## DevTools + Session Report

DevTools completes the v0.2 foundation by turning Engine state into readable diagnostic text.

Enable the panel with:

```text
?dev=1
```

The live panel shows performance, Asset, Audio, Storage and health status and can expose work-registered tuning sliders.

The full handoff artifact is:

```js
SSE.dev.reportText()
```

or the panel's:

```text
COPY SESSION REPORT
```

The report includes an `ATTENTION` section that converts Engine-known failure or fallback states into sentences instead of requiring the author to infer them from code or console output.

The implementation also adds `SSE.diagnostics`, a small event log shared by Engine systems and available to each work.

Detailed usage is documented in:

```text
engine/SUKIMASTOCK-DEVTOOLS.md
```

## v0.2 foundation status

The planned v0.2 foundation is now implemented in the canonical Engine:

1. Baseline consolidation
2. Audio v2
3. Storage v2
4. Asset Loader
5. Lifecycle + robust input
6. Performance controls
7. DevTools + Session Report

The next phase is **work-by-work migration and comparison**, not adding more Engine features.

Each existing work should be migrated separately, validated against its current behavior, and only then have duplicated local infrastructure removed.
