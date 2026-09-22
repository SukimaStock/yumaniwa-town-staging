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
