# FEEL LAB coordinate / input repair

Base `c4f2ad83c262944128ec886c9485905722d25307`.

## Root cause

The game renderer called `c.scale(.78,-.78)` inside the Codea Lite `withCanvasContext` which already presents a Y-up canvas, causing a second inversion of terrain and the PUMPOKO fruit artwork. Changed it to positive Y scale and recentered the ground within the logical scene (`c.translate(500,175)`). This is drawing-only and does not change physics positions, course points, touch routing or physical coefficients.

## Touch route

The current source sends `scene.touch` logical `t.x` left/right into `touchAxis`, applies `P.input(state,axis)` each update, and runs fixed 240Hz `P.integrate` with the sampled world-curve contact. This path is unchanged. If the user still experiences no movement, the input or slope/edge behavior needs instrumentation rather than further drawing guesses.

## Verification

- The code path and transformation have been reviewed from source. Actual iPhone frame motion and gesture behavior remain UNVERIFIED.
- Required: perform actual two-second right hold and left hold on both characters, confirm x changes in expected directions, confirm character stays in contact with correctly oriented terrain, confirm reset and four terrain buttons, inspect portrait clipping.
- Do not claim successful mobile operation from CI syntax / scope checks.

Staging only; PUMPOKO 02 untouched.
