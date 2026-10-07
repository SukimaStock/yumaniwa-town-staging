# ORBIT Web v2.2 — Vector Assist

## Phase 11: first tactile steering pass

Goal: make active piloting feel better without changing the accepted drifting feel.

### Changed
- Added touch-only velocity steering assist.
- Existing velocity is blended gently toward the current thrust direction while touching.
- Assist scales up with ship speed so high-speed turning is less disconnected from the finger.
- A hard reversal bleeds velocity first rather than snapping direction.

### Intentionally unchanged
- max speed 520
- thrust acceleration baseline (16 × 26)
- open-space damping 0.9980
- gravity / planet capture
- landing / takeoff, including launch speed 330
- faint signal
- resources / BASE / Echo / save progression

### First-pass value
- turnAssistPerSec: 1.6
- minimum assist speed: 40
- full assist by speed: 260

This is deliberately a feel-test build. Tune only this assist after hands-on play before changing the rest of the flight physics.
