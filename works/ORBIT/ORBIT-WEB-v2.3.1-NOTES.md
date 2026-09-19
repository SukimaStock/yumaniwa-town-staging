# ORBIT Web v2.3.1 — FOUNDATION FIX

Phase 12 foundation hotfix. Progression, fuel economy, resource placement, RESTORE costs, landing/takeoff tuning, Echo order, and LUMA generation are intentionally unchanged.

## 1. Stable screen-space thrust input
- The active touch is now stored in logical screen coordinates.
- Each fixed physics step reprojects that same screen position through the current camera before calculating thrust direction.
- Holding a finger still therefore expresses the same directional intent as continuously receiving pointer-move events.
- The directional exhaust cue uses the same live reprojection.
- Release still returns immediately to pure inertia/drift.

## 2. Same-session HOME checkpoint independent from localStorage
- Every valid HOME save now also refreshes an in-memory checkpoint before attempting the persistent write.
- BASE departure therefore always has a current rollback snapshot even when localStorage is unavailable, full, blocked, or throws.
- Fuel-out rescue first restores the in-memory HOME checkpoint. Persistent save is only the fallback when no volatile checkpoint exists.
- Loading CONTINUE also seeds the same-session checkpoint from the loaded HOME state.
- Persistent save failure is tracked internally but does not silently replace the session checkpoint with an older save.

## Deliberately unchanged
- FUEL max: 32 / 60 / 95 / 135 / 180
- distance fuel cost: 4.23 per 1,000 world units
- max speed 520
- vector assist 1.6 / sec
- landing thresholds / bounce
- 1 sec takeoff hold / launch speed 330
- SERA / VOX / LUMA placements and procedural generation
- RESTORE resource costs
- Echo story order and finale conditions

This build is intended to remove two foundation-level sources of false difficulty before MiniMap integration and human progression playtesting.
