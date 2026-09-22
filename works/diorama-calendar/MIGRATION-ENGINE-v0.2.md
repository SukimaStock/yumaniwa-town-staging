# Diorama Calendar — Engine v0.2 Canary Migration

Updated: 2026-09-22

## Purpose

Diorama Calendar is the second real-work canary for the canonical SukimaStock Engine v0.2.

Phase 1 changes only the Engine reference.

The goal is to verify that the new shared runtime does not alter:

- upright sensor parallax
- drag fallback
- month taps
- layered month crossfade
- current / previous / next theme behavior
- showcase behavior

before moving the work's custom Asset window into SSE.assets.

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
→ themes.generated.js
→ sketch.js
```

The local v0.1.1 Engine copy is retained temporarily for rollback until real-device validation passes.

Diorama Calendar has no work-specific service worker, so there is no PWA cache-version migration in this phase.

## Not changed yet

`sketch.js` is unchanged.

Still work-local:

- DeviceOrientation / DeviceMotion permission and calibration
- upright neutral baseline
- sensor-to-parallax mapping
- drag fallback
- theme image loading
- current/previous/next theme window
- Codea Lite image-cache release
- layered month crossfade
- showcase automation

This isolates Engine compatibility from refactoring.

## Static integration checks passed

- Codea Lite loads before Engine
- canonical Engine loads before themes and sketch
- old local Engine is no longer referenced by index.html
- app id remains `diorama-calendar`
- sensor code remains work-local
- 3-theme window code remains work-local
- canonical Engine reports v0.2.0
- canonical Engine contains DevTools

## Real-device Staging check

Normal direct work:

```text
https://sukimastock.github.io/yumaniwa-town-staging/works/diorama-calendar/
```

Engine diagnostic view:

```text
https://sukimastock.github.io/yumaniwa-town-staging/works/diorama-calendar/?dev=1
```

Showcase + diagnostics:

```text
https://sukimastock.github.io/yumaniwa-town-staging/works/diorama-calendar/?showcase=1&dev=1
```

Check on iPhone:

1. initial current month appears normally
2. holding the phone in the established upright posture feels neutral
3. tilting left/right/up/down produces the same parallax feel
4. permission request behavior remains normal if the browser requires it
5. dragging inside the frame still controls parallax
6. short left/right taps still change month
7. layered crossfade still progresses back-to-front
8. rapid repeated taps do not break the pending transition guard
9. previous/current/next month loading still allows smooth adjacent changes
10. app switch / return does not leave drag stuck
11. SSE DEV appears only with `?dev=1`
12. ATTENTION contains no unexpected ERROR/WARN

Expected Phase 1 Asset section:

```text
ASSETS
ready/loading/error/idle: 0/0/0/0
```

That is intentional until Phase 2.

## Phase 2 after acceptance

After Phase 1 real-device acceptance:

- register common frame/matte assets in SSE.assets
- register the 12 theme groups generated from themes.generated.js
- migrate the moving three-theme window to SSE.assets
- use SSE.assets.release() instead of direct Codea Lite image-cache manipulation
- make Session Report show exactly which theme/layer failed
- keep sensor behavior work-local unless a second work proves the same sensor abstraction


## Phase 1 real-device result

Accepted.

Session Report after the Engine-only migration:

```text
ATTENTION
[OK] No Engine-level problems detected in this session.

PERFORMANCE
FPS average: 59.9
p95: 17ms
max: 29ms
update average: 0.04ms
draw average: 1.11ms

LIFECYCLE
Active
paused during app/background interval: 3.7s

DIAGNOSTICS
lifecycle-pause: hidden
lifecycle-resume: hidden
```

The hidden/resume sequence was correctly observed by Engine diagnostics.

## Phase 2 — moving theme window migrated to SSE.assets

Completed after Phase 1 acceptance.

### Registered assets

```text
common assets: 2
theme assets: 12 themes × 4 layers = 48
total registered: 50
```

### Steady-state memory window

Only current / previous / next month themes are loaded.

Expected steady state:

```text
ready: 14
loading: 0
error: 0
idle: 36
```

The 14 ready assets are:

```text
matte + frame = 2
current theme = 4
previous theme = 4
next theme = 4
```

### Priority

- current theme: high
- previous theme: low
- next theme: low
- common frame/matte: high

### Release

The work no longer manipulates `CodeaLite.state.imageCache` directly.

When a theme leaves the ±1-month window:

```js
SSE.assets.release(themeGroupName(themeKey), { hard: true })
```

handles decoded-image cleanup and Codea Lite cache removal.

### Work-local behavior retained

Still intentionally work-specific:

- month/theme mapping
- which three months should be resident
- transition timing
- back-to-front layer stagger
- sensor calibration and parallax mapping
- showcase movement

### Static Phase 2 audit passed

- 12 themes present
- 48 unique theme layer files
- 2 common assets
- 50 total registered
- no direct `loadImage()` or `readImage()` calls remain in sketch.js
- no direct Codea image-cache access remains
- current-first load ordering retained
- adjacent-theme preload retained
- hard release delegated to SSE.assets

## Phase 2 real-device check

After initial loading settles, Session Report should normally show:

```text
ASSETS
ready/loading/error/idle: 14/0/0/36
```

Then change several months in both directions.

The count should remain approximately:

```text
14/0/0/36
```

after each transition settles.

This verifies that new neighboring months are loaded and old distant months are actually released rather than accumulating through the year.

Any failed layer should now appear by its Engine asset id, for example:

```text
theme.autumn.mid
```

instead of remaining a visually missing but otherwise silent image.
