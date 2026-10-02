# PUMPOKO Stage Builder v0.1

Staging-only author tool: `/works/pumpoko/builder/`. No town registration,
production publication, sharing service or physics parameter controls.

## Touch → play → refine

- Drag the white control points. X order clamps before neighbours and other
  surfaces; a draft that invalidates START/END is rejected with an explanation.
- Select a ground interval and choose flesh / polished / cushion. Drag the
  two points beside a GAP to change its width. + POINT inserts a point;
  DELETE removes a selected point (at least two remain) or Loop.
- Straight / Slope / Bowl / Ramp extend the final surface with editable points.
  Gap splits the selected surface at the selected location, leaving actual
  empty space. START and END must still lie on valid surfaces.
- Select a point with a tangent and drag its small brown handle to adjust the
  departure slope. The number in the inspector is an optional precise input.
- Drag the yellow TEST START triangle onto ground. PLAY FROM HERE places the
  same nine-seed runtime in a small zero-velocity 3×3 cluster. It bypasses only
  the Builder's prologue, never ordinary play. Drag the world or use arrows /
  WASD; Space taps. RESET starts again from this marker. EDIT keeps the draft.
- Thin tracks show the last run; small crosses mark the fall entry of lost
  grains. Recording is 10Hz, capped at 1,200 samples per grain, with at most
  nine loss marks. Seed positions never write into Stage Data.
- Wheel pans sideways; Ctrl/Command + wheel or +/− changes zoom. FIT shows the
  complete stage. Empty-space dragging pans in both dimensions. Pointer events
  and generous handles support touch, with desktop recommended for precision.
- SAVE DRAFT / LOAD DRAFT use only `kotsu-koro-stage-builder-v1` localStorage.
  The legacy storage key is intentional and must not be renamed.
  Storage failure is visible and EXPORT remains available. No automatic load
  hides the current canonical stage. Undo/redo retains 40 edit transactions.
- EXPORT JSON saves `pumpoko-stage.json` with the canonical v1 schema.
  Older `kotsu-koro-stage.json` files remain importable; names are not validated. IMPORT validates before adoption;
  invalid data leaves the current draft intact. TEST START is part of local
  drafts, not exported gameplay data. Export does not modify the repository.

## Loop

Loop adds an editable practice valley/runway and a small circular terrain
feature after the current stage. It moves TEST START to that valley. The ordinary
canonical stage has no Loop. Nothing is changed until the author adopts a JSON.

Drag a Loop's centre handle to position it, or the right handle to change its
radius. Radius defaults to 32 and clamps to 24–300 and the available stage width.
The lower entry/exit topology follows centre/radius; no freeform topology or
physics controls. The raised approach has a small open mouth, with a lower
return floor. Slow attempts can drop back and be tried again. Larger radii need
more momentum; a complete nine-grain synchronized lap is not guaranteed.

From the practice valley, try left tilt until the group climbs the left bank,
then right tilt through the bottom and along the runway. Keep watching the
party; small differences in orientation and drag remain. Ground, entry ramps
and circle normals cause the motion. No spline, orbit state, path index, seed
steering, boost, motor or forced animation exists.

## One definition, one implementation

- `stage-data.js`: frozen JSON-compatible canonical v1 data (same original stage).
- `stage-geometry.js`: validation, exact sampled height-curves, material intervals,
  gaps/bounds and geometric Loop/ramp contacts. Entry/exit ports use fixed v1
  topology. Immutable compiled snapshots are isolated from mutable drafts.
- `journey.js`: accepted world spring, seeds, collision, loss/finish and camera.
  `create(source, transitioning, geometry)` accepts canonical or compiled draft.
- `stage-draw.js`: shared terrain and Loop renderer used by both surfaces.
- `builder/model.js`: edit transactions, start placement, bounded run records,
  JSON round trips; `builder.js` supplies the pointer UI and render loop.

The optional Loop uses the existing curved-ground drag/friction preset and
flat-seed support along the radial normal. Restitution, gravity, world response
and fixed step remain shared. A circle only pushes against outward penetration;
insufficient speed can leave contact and fall. Entry ramps are one-sided surfaces,
with an open lower mouth for return. There is no position/velocity interpolation.

Validation rejects incompatible versions, non-JSON / nonfinite / oversized data,
duplicate ids, unordered or overlapping surfaces, bad materials/features,
invalid start/end, radii outside the supported range and malformed fixed ports.

## Verification boundary

`test-dynamics.cjs` 14, `test-journey.cjs` 30, `test-stage.cjs` 5,
`test-builder.cjs` 7, `test-loop.cjs` 7 focused checks. Pre-extraction sample,
normal/material and 60-second physics hashes are pinned to staging main
`df635443fbac3d22e4c788d6509398382aff7224`.

Actual deployed pointer observations and exact SHAs are recorded in the PR.
Author device feel is not inferred from test success. Formal verificationState
remains UNVERIFIED under Change Verification; no Release Complete claim.
