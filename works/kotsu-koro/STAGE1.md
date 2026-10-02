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
After that, gentle right tilt carries the party into END. Only the soil inside
the current END adds local damping and soft restitution; the receiving shelf
and large-gap catch remain unchanged. Release leaves any overshooting grains
free to roll back into the field. The author still evaluates timing and feel.

## Rooted field ending (current)

The run keeps every original grain. `party()` still means all non-lost seeds;
`travelling()` is the subset not yet rooted. Each travelling grain becomes
lost only below the compiled geometry's loss boundary, or arrives after 0.24 s
of actual top contact within that geometry's END at less than 95 px/s. Air
passage, the underside and lost seeds never count. Soil changes neither the
route nor the preceding receiving shelf. Arrival records the original object,
stable run index, active simulation time, grain pose and exact floor root.
Rooted grains stop participating in movement, knock and seed collisions, so
late travelling grains remain controllable and the normal camera follows them.

When no travelling seed remains, the result is frozen once. `finished` means
that result is fixed; growth completion and `replayReady` are separate states.
The ending captures the current camera/tilt and eases into a field-wide frame
in 2.8 s, with its own scale independent of the ordinary 1.15 zoom minimum.
Growth starts at 2.2 s with a 0.12 s stagger: the exact root sinks its original
grain, sprouts, opens two leaves and bears exactly one pumpkin. The last
pumpkin settles around 6.2 s; the small replay appears at 8.4 s. Deterministic
leaf/fruit poses make nearby roots readable without moving seeds into slots.
There are no decorative pumpkins, counters, cards, ranks or success text.

The soil patch and shallow furrows are already visible while approaching END.
They follow the same compiled floor/END used for contact, including draft END
moves. No Stage Data schema/JSON migration was added. Builder renders the same
soil, rooted grains and plants; EDIT and RESET remain immediate throughout.

With zero arrivals there is no field pullback or plant: hold the last camera,
finish the short visible falls, and permit replay after a quiet 2.4 s. Replay
creates the original three free/six attached grains and resets arrival/growth
and event state, while retaining Engine music and its playback position.

## Event-based sound

Work policy lives in `sketch.js` as `SOUND`. Only actual Stage 0 detachments
play the short existing `fiber` sound. Ordinary collisions, grabs, sliding and
knocks retain their physical effects but emit no SE. Arrivals emit a one-shot
work event, coalesced within a 0.12 s window. No existing file has been verified
as a suitable soft-soil sound, so the initial arrival policy is silent rather
than reusing a mismatched contact/fiber sound. Sprouts, leaves and fruit use
BGM only. All SE files remain for comparison. BGM asset, baseline level, first
trusted-input start, mute and Engine lifecycle behavior are unchanged.

All growth/settling time comes from fixed simulation updates. Canonical Engine
omits work updates while paused and clamps resume delta; no timeout chains or
queued sound bursts were introduced.

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
