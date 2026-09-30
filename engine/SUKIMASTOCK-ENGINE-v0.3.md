# SukimaStock Engine 0.3.0 — Phase 1 Input / Boot

Implementation candidate, not a claim that the entire 0.3.0 plan is released.
Baseline: staging `f99978bb6699967798556d2cc30675ab3d34a73f`.

## Canonical files

- `engine/sukimastock-engine.v0.3.0.js`: new Engine source. v0.2.0 is immutable.
- `engine/codea-lite.v1.0.0.js`: Codea source, based on the previous starter.
- `works/_starter/codea-lite.js`: exact generated/distribution snapshot of that source; never independently edit it.
- Existing work-local Codea/Engine files are legacy pinned runtimes, not canonical sources.

Load Codea, Engine, configuration, sketch/createApp, then start the canvas. The starter and its standalone manifest demonstrate this order. No exporter schema or production entry changes are needed.

## Ownership

Codea owns DOM pointer/capture handlers, resize/orientation handlers, canvas backing size/DPR, actual focus, raw pointer state, and one RAF. It does not import Masala's DPR cap or FPS policy.

Engine owns keyboard and browser lifecycle handlers, logical/primary pointer selection, logical viewport, pause/audio lifecycle, and valid audio-gesture entry. Work owns action bindings, direction/touch priority, game reset, dialogue and action eligibility. Host owns iframe launch/navigation/retry.

`CodeaLite.clearPointers()` is a narrow adapter hook: it clears raw pointers and releases capture silently. It is not game reset or a public destroy/mount API. Legacy Codea without this hook still loads, but cannot provide the new raw-cleanup guarantee.

## Boot

Same-canvas start, including reentrant start during setup, is a no-op. A different canvas throws without disturbing the running runtime. One RAF remains scheduled across browser lifecycle events; pageshow never creates another loop.

Missing canvas/context and setup/registration/scheduling failures are terminal until document reload. Codea removes its registered handlers, releases captures, cancels pending RAF/orientation timers, removes only tabindex it added, and clears its boot state. Engine removes its owned keyboard/lifecycle/debug handlers, resets input/lifecycle, and clears a created DevTools timer/panel. Engine setup returns a boot-only rollback callback consumed by Codea if scheduling fails; this is not a work-level teardown API.

Arbitrary effects started by work setup (including external async loads or game mutations) are not transactional and are not automatically retried or reset. Existing font/asset loading and audio subsystem contracts are unchanged; document reload is the recovery path after boot failure.

Same-version script reload preserves globals. A conflicting runtime version is rejected before overwriting them. Legacy scripts loaded later cannot be made safe by this runtime; load exactly one version of each runtime.

## Input

Focus is attempted only for a trusted canvas pointerdown, before preventDefault, using preventScroll. Only an unsupported-options TypeError attempts the legacy focus form. Explicit tabindex is retained. No boot/frame/move/pageshow/visibility autofocus.

Input/textarea/select/contenteditable and descendants (including composed event paths) do not create keyboard game state, prevent defaults, or trigger audio unlock. Keyup in an editor silently clears the previously held key and its transient state.

Initial keydown generates pressed; repeats only maintain held. A repeat received after blur/pagehide clear cannot resurrect input. Bindings/action APIs are unchanged.

Interruption order: logical CANCELLED once → keyboard clear → silent Codea raw/capture cleanup → existing pause/audio lifecycle. Native pointercancel/lost capture use the ordinary pointer input path. Cleanup cannot generate a second touch event. Blur does not pause by default; the existing pauseOnBlur option remains.

Valid trusted pointerdown and bound non-repeat keydown may invoke existing audio unlock/resume. Editable, synthetic, unbound-key and cancellation paths do not. This does not change Audio/Asset readiness, autoplay guarantees, audio buses, volume or music semantics. Old adapters without an original DOM event cannot use the new automatic pointer gesture entry; their work's existing audio play/unlock calls remain unchanged.

## Boundaries

Scene, Storage, Asset Loader, Audio subsystem, host bridge and Session Report contracts are retained. No Phase 2 readiness fix, Phase 3 diagnostic expansion, existing-work migration or town retry change is included.

See `SUKIMASTOCK-ENGINE-v0.3-VALIDATION.md` for executed checks and UNVERIFIED browser/device coverage.
