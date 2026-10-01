# PUMPOKO — one horizontal pumpkin world

## Author direction, 2026-10-01

Keep the accepted half-pumpkin touch, rim circulation and tether physics. After
all nine seeds detach, the same cut surface becomes a giant fantasy landscape.
No tunnel, adjoining pumpkins, scene title, blackout or replacement party.

`dynamics.js`, its TUNE and `test-dynamics.cjs` stay byte-identical to
staging main `43eff88789468644f477d82847da8509d54cdf5f`.

## Single scene, three modes

- `prologue`: existing Stage 0 physics, with drawing-only subtle depth layers.
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

## Two gaps, three shared surfaces

`J.segments` defines three sampled surfaces. `floor(x)` returns null in each
hole and outside the terrain. Both drawing and contact use these same samples,
including their vertical cut sides: a grain below a landing lip is not pulled
back onto the top. No bridge, invisible floor or grain attraction.

1. Safe start, then a small slope.
2. GAP A: x455–503 (48 world px), with a slightly lower landing. Modest
   momentum carries the party; a slow or dispersed tail can fall.
3. Safe reunion, then the shallow cushioned valley near x810.
4. A continuous U-shaped polished bowl spans x1110–1545, with its bottom
   at x1350 / y500 and an upward launch tangent at x1545.
5. GAP B remains x1545–1640 (95 world px). A shallow cushioned receiving
   shelf at x1640–1775 precedes the long release into the quiet END.

The bowl and landing use cubic Hermite tangents sampled by the same renderer
and collision geometry. The early terrain and small-gap geometry are unchanged.
Reduced Stage 1 bowl drag (.30, still multiplied by each grain's dragFactor)
retains curved-surface momentum; ordinary contact friction remains so the party
can gather and rest. There is no pump bonus, jump force or seed steering.

Stage 1 alone blends toward grab K220/D21, return K70/D10 and world inertia3
as the zoom opens. Stage 0 retains K58/D7.2, return K36/D3.8 and its accepted
inertia. The response is still a continuous spring with a release tail. Stage 1
keyboard tilt gradually reaches the pointer's .38 maximum; Stage 0 stays .28.

The input-only acceptance route reaches the bowl, fully releases until every
seed is below 8px/s, tilts left until the median is around x1260, then reverses
right. Every seed remains inside the local bowl until launch: no long retreat
into the previous valley or carried initial launch velocity. Horizontal tilt
alone launches all nine. A premature reversal can lose grains; maintained
right/up flow can also cross, so stopping is optional.

A brief opposite tilt on landing reduces speed through the same world physics.
After that, gentle right tilt carries the party into END, where release leaves
the surviving arrangement to become quiet. No special receiving rule or result
UI is added. The author still evaluates the subjective timing and feel.

## Loss and surviving-party finish

Below y600, a grain becomes `lost`: excluded from party collision, knock,
median/span/zoom and END checks. Its same object keeps falling briefly; after
passing y1000 or two seconds it becomes inactive. The array always contains
all nine. A grain still on ground is never marked lost because it lags behind.

At least one survivor must be within END and slow for 3.6 seconds. Any survivor
count is accepted. Physics continues, and the remaining grains themselves are
the result; no count HUD, score or failure display. With zero survivors, hold
the last camera for a quiet 2.4 seconds before showing the same small replay.
Replay returns to the original three loose / six attached Stage 0 seeds.

## Drawing-only depth

Within the existing vessel transform, the lower skin offsets by (-5*x,-3*y),
the flesh by (-.7*x,-.5*y), and the bowl by (7*x,4*y). The maximum relative
horizontal difference is 4.56 local pixels. Seeds, tethers, their clip and hit
positions retain the original transform. The tabletop shadow retains its
existing lower follow amount. These offsets ease to zero by transition progress
.36, before the local shell begins expanding. The last prologue and first zoom
frame therefore use the same depth offsets without a layer snap.

## Controls and boundaries

Drag the world, then release; arrow keys/WASD tilt it; Space knocks it.
There is no individual-grain movement or jump button.

`?dev=1&stage=1` starts the same Stage 1 for work inspection only. Ordinary and
`?dev=1` retain the physical tether prologue and zoom transition. Read-only
observations show mode, party bounds, maximum speed, tilt, camera and transition progress.

No Stage 2, enemy, HP, score, collection, story, town registration, production,
canonical Engine or Codea changes.

## Browser refinement: repeated grabs

Actual browser play at `5ff848a80ae3ffe001cc545771f8f0d941ec35fd` showed that
knocking on every Stage 1 pointer-BEGAN scattered the party after repeated grabs.
Stage 1 now treats a drag as world tilt and an unmoved short tap as a knock on
release; cancellation does not knock. The accepted Stage 0 grab knock remains.
Camera follow uses the median grain position, so one remote grain cannot put
the camera in a completely empty gap. This is view-only, not a recovery force.
Two regressions cover actual scene regrabs/taps/cancellation and a dispersed
camera fixture. The original refinement added two regressions. The current risk tests extend them.

## Stage Data / Builder v0.1

The canonical geometry now lives in `stage-data.js`, compiled once by
`stage-geometry.js`. This migration preserves exact terrain samples, queried
normals/materials and the pinned 60-second mixed-input physics hash of main
`df635443fbac3d22e4c788d6509398382aff7224`; all current journey regressions remain.
Drawing and runtime read `s.geometry`, so canonical and Builder draft stages
share one compiler and the same journey implementation. Stage 0 dynamics,
input, parallax and the canonical zoom composition are unchanged.

The separate noindex author tool at `builder/` edits only draft terrain and can
start nine grains from a movable test marker. Its optional circular Loop uses
radial contact normals and existing seed support, with real gravity detachment.
The canonical Stage 1 features array remains empty. See `BUILDER.md` for controls.
