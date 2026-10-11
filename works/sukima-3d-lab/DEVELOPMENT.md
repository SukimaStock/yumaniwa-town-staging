# Touch Lab v0.1 — implementation and verification

## Scope and provenance

Started from staging/main `80647c70a2a8284771af8c29f909cd537dce3be9` on 2026-10-11.
Checked current open PRs (#209, #200, #140); none belongs to this work. Existing Engine 0.3.0 and Codea Lite ownership were read. This work does not load or modify either.
The only shared-source change is one appended active lifecycle record. No town listing, SEO, shared runtime, other work or production changes. Pages uses the existing main-branch publication path; no deployment workflow is added.
The lifecycle append requires the existing full Plan Lock route; lock precedes all implementation in Git history. This introduces no new management system.

## Independent engine

No Three.js, Babylon.js, Unity, Godot, third-party math, physics or rendering libraries. Browser-standard WebGL 2 and Pointer Events only; no external runtime requests or package dependencies.

| File in `engine/` | Responsibility |
| --- | --- |
| `math.js` | Vectors, normalized quaternions, projection matrices, triangle-ray intersections |
| `geometry.js` | Irregular icosahedron, outward winding, welded vertices, 20 face IDs, nearest deformed-surface picking, flat normals |
| `camera.js` | Perspective and matching inverse pointer rays; aspect-dependent distance |
| `renderer.js` | WebGL 2 shaders/buffers, matte face lighting and a soft ground shadow; DPR capped at 2 |
| `dynamics.js` | Quaternion rotation, damped flick, small settling spring, local vertex springs |
| `interaction.js` | Primary-pointer capture, 7 CSS px drag threshold, stale-flick cutoff, cancellation |
| `loop.js` | One RAF, delta cap, stop/resume without catch-up |

`app.js` owns the one specimen, DOM, responsive sizing, visibility/BFCache/context handling and optional debug panel. `style.css` and `index.html` own presentation. Engine modules contain no specimen UI, external communication or storage.

The shell has 12 shared corner vertices plus 20 face centres. Each visible semantic face is triangulated into three GPU triangles (60 total). Centres remain coplanar at rest; subdividing permits actual local dents. Shared corner displacement keeps neighbouring faces welded. Springs change positions and normals, not just colors. Hit barycentrics attach pressure to the undeformed surface; nearest-hit tests use the currently deformed vertices. Small edge tolerances prevent a seam hit from selecting the back of the object.

Reuse the classes by importing them from this folder (or copying the `engine/` modules into a new isolated work). Generate a mesh; create a `Camera`, `TouchBody`, `Renderer` and `TouchInput`; run `body.step(dt)` and `renderer.draw(mesh, body.pose(), camera)` from `AnimationLoop`. The host owns resize, visibility and WebGL context-loss events, and should call `input.destroy()`, `loop.stop()` and `renderer.destroy()` at teardown. v0.1 picking/body deformation expects triangular convex shell faces and the generated mesh topology; support for arbitrary imported models is not claimed.

## Development controls

Open `?debug` to show damping, dent depth, restoring stiffness and settling strength. Normal entry displays none of these controls. Debug-only `window.touchLab` and the panel expose face ID, angular speed and GL error code for verification. Parameters are ephemeral. Reduced-motion preference shortens inertia and disables settling.

Run `node --test works/sukima-3d-lab/tests/*.test.mjs` from the repository root, or `npm test` from this folder. No install step is needed.

## Validation and limits

- 9 Node tests: all 20 face centres and welded outward topology; inverse camera rays at offset canvas positions; real localized deformation/restoration; finite normals; monotonic flick decay and timestep consistency at 30/60/120fps; 300 repeated press/drag/cancel cycles; pointer threshold, ignored second pointer, stale release and capture cleanup; viewport containment across portrait/landscape and many orientations; WebGL2-unavailable constructor path; one RAF and pause/resume timing.
- Existing lifecycle and Engine input/boot, audio/assets, audio lifecycle, diagnostics suites pass.
- Scope → Risk → Impact and node syntax checks run against the final implementation commit. Existing gates remain unchanged.
- Local browser preview could not start: managed supervisor reported `bwrap: Can't mount proc on /newroot/proc: Operation not permitted`; a directly served localhost preview was unreachable from the remote browser. No local GPU, touch emulation or browser resize PASS is inferred from Node tests. Post-publication browser findings are recorded in the PR.
- Physical iPhone/iPad Safari, real mobile GPU performance and subjective touch quality remain UNVERIFIED. CI is not author adoption or production authorization. No Release Complete/final VERIFIED claim.

## Device drill

1. Press the centre of several visible faces; hold briefly and lift. The selected area should dent slightly, then soften back.
2. Press near an edge; check that the front surface reacts, without a hole or a rear-face response.
3. Slowly drag both ways, then flick and release. Observe gradual slowing and the small final settling motion.
4. Drag, pause with the finger still down, then lift: it should not launch an old flick.
5. Re-touch while spinning. Repeatedly switch between press and drag.
6. Rotate the device during a hold, open another app and return, try a second finger, and repeat in landscape. No stuck press or jump should remain.

## v0.2 questions, not implemented

- Calibrate dent depth, release time, inertia and settling on actual iPhone/iPad; compare lightly irregular forms and clay colors.
- Decide whether local pressure should follow a tiny finger slide before rotation begins, and whether rotation needs an arcball near the silhouette.
- Establish a small documented mesh contract before adding a second specimen; current geometry is deliberately specific.
- Measure Safari GPU/frame pacing, context restoration and battery usage; consider rendering only while motion is active.
- Only after this specimen feels good, choose the next single interaction for “触れるらくがき 3D”. No scene system, editor, assets or physics framework yet.

Rollback: revert this PR and only its appended lifecycle record.
