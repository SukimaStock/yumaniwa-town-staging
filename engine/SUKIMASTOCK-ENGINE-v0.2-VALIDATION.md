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
