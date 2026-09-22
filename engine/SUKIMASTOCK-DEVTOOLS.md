# SukimaStock Engine DevTools

Updated: 2026-09-22

## Purpose

DevTools exists to turn invisible Web/runtime state into text the author can inspect and hand to an AI collaborator.

It is not only an error overlay.

A work may look normal while still having:

- slow frames
- an AudioContext stuck in `suspended`
- a save that fell back to memory and was not persisted
- one failed asset among many successful assets
- a lifecycle pause/resume sequence
- a pointer or key interrupted by the browser
- a runtime exception that was caught and did not produce a useful visible screen

DevTools gathers those states into one Session Report.

## Enable the panel

The default configuration is `enabled: "auto"`.

Add:

```text
?dev=1
```

to the work URL.

Examples:

```text
.../works/example/?dev=1
.../works/example/?showcase=1&dev=1
```

The panel is not shown during normal use unless explicitly enabled.

A work may also force or disable it:

```js
SSE.createApp({
  devtools: {
    enabled: true,   // always show
    panel: true,
  },
});
```

or:

```js
devtools: {
  enabled: false,
}
```

## Live panel

The panel summarizes:

- current and average FPS
- p95 frame interval
- slow-frame count
- average update and draw cost
- asset ready/error counts
- AudioContext state
- Storage persistence state
- the highest-priority current health issue

The panel can be collapsed.

## Session Report

Use the panel button:

```text
COPY SESSION REPORT
```

or call:

```js
const text = SSE.dev.reportText();
```

Structured data is available with:

```js
const report = SSE.dev.report();
```

The report contains:

- app / Engine version / current Scene
- browser and viewport metadata
- lifecycle state
- performance snapshot
- audio state
- Storage v2 status
- Asset Loader status
- active pointer / keyboard state
- registered tuning values
- diagnostic events
- automatically generated health/attention items

The report intentionally does not include stored save-data contents.

## ATTENTION

Session Report synthesizes human-readable attention items.

Current examples include:

- runtime error captured
- asset load failure
- latest save is memory-only
- storage error
- active AudioContext unexpectedly suspended
- slow frames observed
- work currently lifecycle-paused
- diagnostic warnings/errors recorded

If nothing is currently suspicious:

```text
[OK] No Engine-level problems detected in this session.
```

## Diagnostic events

Reusable Engine systems add events when meaningful conditions occur.

Examples:

```text
asset-load-failed
audio-buffer-load-failed
storage-memory-fallback
lifecycle-pause
lifecycle-resume
runtime-error
tuning-change
report-copied
```

Works may also add their own events:

```js
SSE.diagnostics.info(
  "brew-start",
  "Brew started.",
  { cups: 2 }
);

SSE.diagnostics.warn(
  "sensor-fallback",
  "DeviceOrientation unavailable; using drag."
);
```

Useful APIs:

```js
SSE.diagnostics.recent(20);
SSE.diagnostics.summary();
SSE.diagnostics.clear();
```

## Live tuning

A work can expose a numeric tuning point:

```js
SSE.dev.number("camera.speed", 0.8, {
  min: 0.2,
  max: 1.5,
  step: 0.05,
  onChange(value) {
    CAMERA_SPEED = value;
  },
});
```

Read or change it programmatically:

```js
SSE.dev.get("camera.speed");
SSE.dev.set("camera.speed", 0.9);
```

When the Dev panel is visible, registered numbers appear as sliders.

Slider input updates the value live without rebuilding the control on every movement. The final change is recorded as a diagnostic event.

This is intended for values such as:

- BGM level
- parallax strength
- camera speed
- fade duration
- animation timing
- spacing
- thresholds

It should not be used to turn core work identity or game rules into one universal Engine configuration.

## Recommended testing workflow

```text
1. Open Staging with ?dev=1
2. Use the work normally on the real device
3. Watch the compact health line only when something feels wrong
4. Adjust registered tuning values when appropriate
5. Reproduce the problem once
6. Tap COPY SESSION REPORT
7. Paste the report into ChatGPT/Astra with the visual observation
```

The goal is not to stare at telemetry while creating.

The goal is to have a textual witness available when the eye says, "something feels off."

## Current boundary

The canonical Engine has DevTools, but existing works still use their local Engine copies.

Therefore `?dev=1` will become available per work only after that work is migrated to canonical v0.2 and verified.

Do not replace every local Engine at once.
