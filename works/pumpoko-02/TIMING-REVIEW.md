# Shot timing revision

Base main: `d9c3f115eb7dda60e2c9d9dcc77432e4b2835307` (PR #187).

The owner approved three presentation adjustments: last-detachment pause 1.8 → 1.0 seconds, overlap the existing six-second final camera travel with natural deceleration, and final composition hold 5 → 2.5 seconds. Returning zoom/dissolve remains 3.6 seconds.

Only story.js changes runtime. The original moving-seed opening kernel, planting/growth curves, 1.25-second opening bridge, WORLD LOOP kernel/courses, four exchanges, normal gameplay camera, art/material/socket drawing and audio are unchanged.

The final shot starts at actual finish while the existing coast inputs, 1.8-second minimum and .4-second natural slow condition remain. Its bounds accumulate the two real bodies' observed travel. This can widen the frame without repeated zoom-in/zoom-out when the pumpkin returns through the valley. Once coast and camera travel have both completed, the view is fixed for 2.5 seconds. Physics continues; no plant is moved, stopped or teleported for the camera. Input reset and title replay remain the existing lifecycle.

## Measured same-input example

60Hz canonical Engine/Codea with DOM doubles; circular title drag 79×70 logical pixels, angular speed 2.3 rad/s until all nine grains are loose, then release. In gameplay, right input with a one-frame release every 40 frames while rutabaga is active; release at finish. Active play and natural deceleration depend on the player and are not fixed durations.

| Event, seconds after first touch | Before | After |
|---|---:|---:|
| All grains loose | 5.217 | 5.217 |
| Opening starts | 7.017 | 6.217 |
| Gameplay starts | 16.433 | 15.700 |
| Final arrival / coast starts | 34.550 | 33.850 |
| Existing natural slow condition reached | 44.317 | 43.617 |
| Returning begins | 55.333 | 46.133 |
| Title restored | 58.950 | 49.750 |
| Arrival → title | 24.400 | 15.900 |

Shorter title pause changes the inherited grain pose naturally, so first planting coordinates and exact growth completion can differ slightly; the grains remain physical and never target planted positions. The actual opening/growth/camera curves are unmodified. The measured total saves 9.2 seconds; the final shot saves 8.5 seconds by overlapping movement and shortening the hold. Natural deceleration in this example is still 9.767 seconds.

## Evidence and tests

[Opening frames](visual-review/timing-opening.png), [ending frames](visual-review/timing-ending.png) and [before/after video](visual-review/timing-comparison.mp4) align to actual all-loose and actual finish events respectively. Video samples the exact 60Hz states at 15fps, with one cut between opening and ending. Shorter variants hold their final captured frame for comparison; no internal event is retimed. Native Canvas evidence, no audio, not device footage.

- New timing tests: protected runtime/assets; real one-second pause; all four handoffs; exact fixed hold and replay; matched-start body/model-camera trajectories vs previous main; lifecycle interruption without timer catch-up. Existing title input clear occurs earlier with the shorter shot; the test separately verifies zero new input and negligible old residual while comparing all body/camera values exactly.
- Socket and material pixel tests retain their aperture, direction, art, solid-side material and read-only checks. Only their previous work-wide byte guards recognize the explicitly authorized story.js timing change. A new guard verifies every other runtime/asset against current base.
- Existing story ending assertions use the new hold state and duration, preserving framing, continuity, identity, replay, input/audio lifecycle and native portrait/landscape rendering checks.
- Exact command/results, trusted Scope → Risk → Impact → Static and CI are recorded in the PR.

Actual iPhone pacing, surprise on entry, perceived naturalness of the wide final shot and sufficiency of the 2.5-second hold remain UNVERIFIED. Production, original, lab, Engine, Codea Lite and shared foundations are untouched. Formal verificationState remains UNVERIFIED.

The PR uses one fresh r0 Plan, fixed before carrying the tested implementation, with the full existing guard-update scope declared. The v0.2 PR gates require a fresh r0 rather than a revision chain.
