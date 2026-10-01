# こつ、ころ。 — one horizontal pumpkin world

## Author direction, 2026-10-01

Keep the accepted half-pumpkin touch, rim circulation and tether physics. After
all nine seeds detach, the same cut surface becomes a giant fantasy landscape.
No tunnel, adjoining pumpkins, scene title, blackout or replacement party.

`dynamics.js`, its TUNE and `test-dynamics.cjs` stay byte-identical to
staging main `43eff88789468644f477d82847da8509d54cdf5f`.

## Single scene, three modes

- `prologue`: existing Stage 0 physics and rendering.
- `transition`: 1.8 seconds after the last detach, begin a 6.4-second camera zoom.
  The visible rim and its collision boundary expand together, the cut surface
  unrolls into open terrain, and vertical gravity gradually replaces the concave
  restoring force. The floor rises continuously from below while the camera
  follows the live party. Table shadow and captions ease away.
- `journey`: continuous simulation on the same objects and the same camera.
  No scene switch, seed respawn, teleport, loading or input reset.

Camera scale rises from 1 to 1.85 during the transition. Party follow later has a
1.15 minimum to retain readable grain size. The shell grows into a large curve
as it unrolls; this world transform lets the rim leave a tall portrait viewport
without enlarging the seeds so far that the nine-grain party vanishes offscreen.

## Explicit transfer

`J.create(source, true)` keeps `source.seeds` and every object in the array.
Stage 0 draws seed centres at `(x, .8*y)`, but rotates the grain in screen space.
Therefore Stage 1 bakes this projection into the coordinates:

- x -> x + START.x; vx unchanged
- y -> .8*y + START.y; vy -> .8*vy
- angle, spin, vessel position/velocity, pointer anchor, time and fixed-step
  accumulator unchanged

The initial camera, vessel transform and seed drawing exactly reproduce the
last Stage 0 frame. Tests compare the projected screen coordinates under a
moving, tilted, ringing vessel, then check every transition step for continuous
movement, unique identities, count and finite state. Grain roll starts at its
existing value and eases into Stage 1 tumbling rather than jumping at handoff.
The seed array is drawn once, above the evolving world.

## Five beats, one shared surface

The Stage 1 ground is a single sampled height curve (`J.terrain`). Collision
interpolates those same samples and computes their surface normals; rendering
uses those samples directly. Visible green boundaries enclose only the left
and right ends. The space above the ground stays open.

1. Safe start: broad level surface, no horizontal force until the world tilts.
2. Small slope: low rise and broad downward curve.
3. Group break/rejoin: shallow pale cushioned valley, reachable in both directions.
4. Round play: broad asymmetric half-pipe; swinging the world adds momentum,
   while its lower downstream lip allows a slow ordinary tilt route.
5. Release: slightly smoother bright ground leads into a wide quiet basin.

There is no invisible waypoint force, auto-steering, death, checkpoint or
teleport. Gravity and normal contact make the basin settle naturally.
Stage 1 vertical gravity and friction are work-owned values and do not alter
Stage 0. Per-grain drag differs slightly. Support uses the flat grain's
orientation, pairs exchange momentum, and fixed physics steps remain 1/120s.
World-knock force uses the physical party centre, never the render-rate camera.

All nine must enter the end and remain slow for 3.6 seconds before the small
`もういちど` button appears. Simulation continues after this; knocking or tilting
can still disturb the group. Replay resets the original prologue.

## Controls and boundaries

Drag the world, then release; arrow keys/WASD tilt it; Space knocks it.
There is no individual-grain movement or jump button.

`?dev=1&stage=1` starts the same Stage 1 for work inspection only. Ordinary and
`?dev=1` retain the physical tether prologue and zoom transition. Read-only
observations show mode, party bounds, camera and transition progress.

No Stage 2, enemy, HP, score, collection, story, town registration, production,
canonical Engine or Codea changes.
