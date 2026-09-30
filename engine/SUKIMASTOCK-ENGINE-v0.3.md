# SukimaStock Engine 0.3.0 — Input / Boot and Audio / Asset readiness

Canonical runtime implementation complete. Phase 1b adopts it in the new-work starter and its ZIP/handoff paths. Browser verification remains UNVERIFIED. This is not a claim that the entire 0.3.0 plan is released.
Baseline: staging `f99978bb6699967798556d2cc30675ab3d34a73f`.

## Canonical files

- `engine/sukimastock-engine.v0.3.0.js`: new Engine source. v0.2.0 is immutable.
- `engine/codea-lite.v1.0.0.js`: Codea source, based on the previous starter.
- `works/_starter/` adopts Engine 0.3.0 and a byte-identical Codea Lite 1.0.0 distribution snapshot.
- Existing work-local Codea/Engine files are legacy pinned runtimes, not canonical sources.

Load Codea, Engine, configuration, sketch/createApp, then start the canvas. The isolated browser fixture demonstrates the new runtime combination. Phase 1b uses the same load order in the starter; export rewrites only the marked Engine URL.

## Ownership

Codea owns DOM pointer/capture handlers, resize/orientation handlers, canvas backing size/DPR, actual focus, raw pointer state, and one RAF. It does not import Masala's DPR cap or FPS policy.

Engine owns keyboard and browser lifecycle handlers, logical/primary pointer selection, logical viewport, pause/audio lifecycle, and valid audio-gesture entry. Work owns action bindings, direction/touch priority, game reset, dialogue and action eligibility. Host owns iframe launch/navigation/retry.

`CodeaLite.clearPointers()` is a narrow adapter hook: it clears raw pointers and releases capture silently. It is not game reset or a public destroy/mount API. Legacy Codea without this hook still loads, but cannot provide the new raw-cleanup guarantee.

## Boot

Same-canvas start, including reentrant start during setup, is a no-op. A different canvas throws without disturbing the running runtime. One RAF remains scheduled across browser lifecycle events; pageshow never creates another loop.

Missing canvas/context and setup/registration/scheduling failures are terminal until document reload. Codea removes its registered handlers, releases captures, cancels pending RAF/orientation timers, removes only tabindex it added, and clears its boot state. Engine removes its owned keyboard/lifecycle/debug handlers, resets input/lifecycle, and clears a created DevTools timer/panel. Engine setup returns a boot-only rollback callback consumed by Codea if scheduling fails; this is not a work-level teardown API.

Arbitrary effects started by work setup (including external async loads or game mutations) are not transactional and are not automatically retried or reset. The Phase 2 section below defines resource loading semantics; document reload remains the recovery path after boot failure.

Same-version script reload preserves globals. A conflicting runtime version is rejected before overwriting them. Legacy scripts loaded later cannot be made safe by this runtime; load exactly one version of each runtime.

## Input

Focus is attempted only for a trusted canvas pointerdown, before preventDefault, using preventScroll. Only an unsupported-options TypeError attempts the legacy focus form. Explicit tabindex is retained. No boot/frame/move/pageshow/visibility autofocus.

Input/textarea/select/contenteditable and descendants (including composed event paths) do not create keyboard game state, prevent defaults, or trigger audio unlock. Keyup in an editor silently clears the previously held key and its transient state.

Initial keydown generates pressed; repeats only maintain held. A repeat received after blur/pagehide clear cannot resurrect input. Bindings/action APIs are unchanged.

Interruption order: logical CANCELLED once → keyboard clear → silent Codea raw/capture cleanup → existing pause/audio lifecycle. Native pointercancel/lost capture use the ordinary pointer input path. Cleanup cannot generate a second touch event. Blur does not pause by default; the existing pauseOnBlur option remains.

Valid trusted pointerdown and bound non-repeat keydown may invoke existing audio unlock/resume. Editable, synthetic, unbound-key and cancellation paths do not. This does not guarantee audible output or change audio buses, volume or music semantics. Phase 2 resource readiness is described below. Old adapters without an original DOM event cannot use the new automatic pointer gesture entry; their work's existing audio play/unlock calls remain unchanged.

## Boundaries

Scene, Storage, host bridge and Session Report contracts are retained. Phase 2 changes only Audio/Asset resource readiness as described below. No Phase 3 diagnostic expansion, existing-work migration or town retry change is included.

See `SUKIMASTOCK-ENGINE-v0.3-VALIDATION.md` for executed checks and UNVERIFIED browser/device coverage.

## Phase 1b — Starter Adoption

The starter HTML, export manifests and explicit-work adoption default now select
Engine 0.3.0. The Codea snapshot and generated ZIP are byte-checked against canonical
1.0.0. The generic exporter is unchanged; --engine still supports older explicit pins.
No existing works are migrated.

Phase 1a's immutable lock and historical validation are unchanged. Phase 1b has its
own lock and validation: see SUKIMASTOCK-ENGINE-v0.3-PHASE1b-VALIDATION.md.
Browser verification remains UNVERIFIED; packaging checks do not establish browser behavior.

## Phase 2 — Audio / Asset readiness

`ready` means the resource needed by the selected playback path is prepared. It
never promises audible output. Mute, zero volume, gesture waiting, a suspended
AudioContext, and autoplay rejection do not turn a prepared resource into a load
failure. `unlock()` retries a suspended Context even after an earlier unlock;
resume rejection stays separate from resource state.

`SSE.audio.resourceState(name)` exposes `status`, `reason`, and `kind` without
changing the Session Report. States are `idle`, `loading`, `ready`, `failed`, and
`unavailable`. Undefined names and missing required APIs are unavailable. HTTP,
network, decode, media errors and media timeouts are failures; each keeps a reason.

- Buffer: successful fetch and a usable decoded AudioBuffer are required. Empty or
  invalid decoded values cannot succeed. `loadBuffer()` still resolves buffer/null.
- HTMLAudio sound pools and music: all elements used by that resource must reach
  `HAVE_FUTURE_DATA` (`readyState >= 3`, normally `canplay`) without a media error.
  Element construction and `loadedmetadata` are insufficient. `canplaythrough` is
  not required. Readiness waits time out after 15 seconds by default;
  `audio.mediaTimeoutMs` in the configuration can override this. Every attempt
  removes its listeners/timers on success, error, timeout, or cancellation.
- Generated sound: the existing explicit `tone(options)` API needs no file and
  checks Web Audio oscillator/gain support. Its `toneResource` stores readiness
  separately from output enablement. The Engine had no named generated-sound
  registry; Phase 2 adds none. A missing name or fileless named sound never falls
  back to tone.

`audio.preload()` still returns a resolving Promise of resource/null values. It
now waits for requested media readiness too; without names it covers configured
sounds and music. Settlement alone is not success: inspect each named resource's
state/reason. Concurrent requests share one attempt. Repeating preload/load is an
explicit retry; there is no automatic retry loop. Failed media retries replace
old elements so stale events cannot affect the new attempt. Reconfiguration
invalidates pending attempts and cached resources from the old definitions.

The Asset Loader retains its existing public vocabulary: Audio ready becomes
Asset `ready`, loading remains `loading`, and failed/unavailable becomes Asset
`error` with an Error/reason. Existing Asset `{ retry: true }`, strict, and aggregate
preload behavior are preserved. An optional failure is reported for that asset;
Phase 2 adds no global boot-failure policy.

The unchanged non-Audio/Asset contracts remain protected by the Phase 1 regression
suite. Browser autoplay, actual playback, codecs and iPhone lifecycle are
UNVERIFIED: Node mocks are not browser or hardware evidence. See
`SUKIMASTOCK-ENGINE-v0.3-PHASE2-VALIDATION.md`.
