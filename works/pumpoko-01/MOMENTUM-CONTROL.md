# Momentum gesture prototype — 2026-10-08

Baseline: the previously delivered `pumpoko-held-drag-update.zip`, applied to
the five-times course. This is a local prototype; no repository publication.

## Interaction

Keep a finger down. Drag horizontally to gather, accelerate, pump a bowl or
countersteer at a landing. Horizontal input has its own ±0.38 cap, independent
of vertical movement. Moving upward by 25.2 logical pixels is a new stroke,
not a second held force. It briefly lifts each grain according to that grain's
own forward speed along its most recent supporting surface.

Returning downward by 16.8px, or sideways by 25.2px, prepares another upward
stroke at the finger's current height. Rearming itself never jumps. Holding at
any height never accumulates lift or fires when speed later crosses a threshold.
The same mechanism is used by the main scene, keyboard and Builder PLAY.
Stage 0 retains its original independent-axis vessel controls.

## Bounded assistance

- Ground-tangent speed, signed in the input's horizontal direction; never total
  falling speed or the fastest grain's speed.
- Smoothstep strength from zero at 55 world px/s to 180 world px/s of vertical
  impulse at 230 world px/s; a weak run-up receives a weak response.
- Recent-ground grace: 0.12 seconds. A grain cannot receive another impulse
  until it has regained stable upward support for 0.06 seconds.
- Stage 1 vertical holding no longer reduces gravity or adds vessel-acceleration
  impulses. Ground geometry, drag, collisions and horizontal physics are intact.
- An early ineffective gesture is consumed. A later speed increase alone cannot
  turn it into a jump. Release/cancel, scene exit and a fresh run reset input
  bookkeeping; release never replenishes an airborne grain's spent assistance.

A single-grain controlled approach from x1260 with forward speed 250 crosses
the first large gap when the upward stroke is made at any tested point from
x1400 through x1530 (six positions), at 30/60/120fps. This fixture measures timing
margin, not ordinary-play completion. Separate full-route tests drive real drag
handlers and never inject grain velocities.

## Protection and scope

The five-times terrain, Stage 0 dynamics, Engine, Codea Lite, audio, drawing,
ending camera functions, growth, title and seed-arrival rules are unchanged.
Journey input/Stage 1 forces and Builder input routing are intentionally changed.
Historical tests whose route depended on indefinitely holding upward have new
input-only stroke fixtures; survival, actual gap crossings, object identity,
arrival/reward, stop/recovery and frame-rate assertions remain required.

Node physics and handler simulations do not establish iPhone touch feel,
rendered smoothness, or audible/BFCache behavior on the physical device.

The input fixture records separate ordinary routes for different initial grain
arrangements. These are test playthroughs, not in-game automation or a promise
that an identical stroke timing always saves every seed. Raw Stage 1 play via
the actual pointer handler completes with nine arrivals at 30/60/120fps using
seven upward strokes while the same finger remains down.

Timing sensitivity is not hidden by the exact route: shifting every stroke in
the raw Stage 1 route by −5 or +5 world pixels yields eight arrivals in each
case; the unshifted route yields nine. These complete playthroughs are separate
regressions, not replacements for the nine-seed completion assertion. A larger
shift can change collisions and leave a grain on an uphill slope that needs
another horizontal pumping action. No device-feel acceptance is claimed.

Alternative higher impulse ceilings, longer ground grace, distributed impulses
and momentum-proportional curves were compared locally. They shifted outcomes
but did not establish a reliable improvement, so they are not shipped here.

## Final verification

98 Node test-runner entries passed, including script-level suites with their
own detailed assertions. No failed or skipped entries in the runnable suite.
The separate migration audit and historical Stage Data audit remain blocked by
missing repository history in this standalone workspace; the Stage Data audit's
first five structural checks pass before that block. The unchanged Engine source
was supplied locally for the simulated audio suite. Main-scene title detachment,
neutral unfolding, drag travel, nine arrivals, growth and title return preserve
the same music player and timeline. This does not replace a physical iPhone test.
