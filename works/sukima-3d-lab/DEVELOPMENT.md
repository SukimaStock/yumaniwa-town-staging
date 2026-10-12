# Touch Lab v0.2 — tactile response and verification

## Scope and history

v0.2 starts from staging/main `294b68b8ff4179750cdd3b8853cdb9f90d50841d` (2026-10-12). Current open PRs #209/#200/#140 concern other works. The earlier v0.1 launch (#274), shadow correction (#275), and clearer dent (#276) are retained in Git history. Owner feedback on v0.1: it displays, overall touch feels good, but the dent is weak. That feedback is not certification of v0.2.

Only this work, its target lifecycle title and the required pre-implementation Plan Lock change. No 2D Engine/Codea, other work, town, SEO, deployment workflow, production or lifecycle status changes. No v0.3 pinch/pull or new specimen. Shared lifecycle title and a multi-file work change use the existing full Plan route; no new management system.

No Three.js, Babylon.js, third-party math/physics, package dependencies, asset downloads, storage or external runtime communication. Browser-standard WebGL 2 and Pointer Events only. Optional native GLES QA uses host EGL/Mesa and Pillow, exclusively in tests.

## Modules and response

| File | Responsibility |
| --- | --- |
| `engine/response.js` | HARD/SOFT/BOUNCY parameters and a small reusable scalar spring step |
| `engine/dynamics.js` | Contact impulse, gradual held pressure/spread, bounded elastic restoration; existing quaternion rotation/inertia |
| `engine/geometry.js` | Same rest shape, welded topology and picking; shape-owned compliance and optional face-centre metadata |
| `engine/interaction.js` | Pointer identity/capture, 7 CSS px drag threshold, real hold duration and distinct drag/cancel release |
| `debug.js` | Opt-in material selector and sliders; RAF-driven diagnostic updates, no separate timer |
| `app.js` | Composition, resize/visibility/context lifecycle, keyboard and debug-only mounting |
| `engine/camera.js`, `renderer.js`, `math.js`, `loop.js` | Camera/light/shaders/math/loop retained |

A contact seeds a bounded inward vertex velocity before any RAF. If down/up occurs in one frame, that energy still produces a shallow dent and a small rebound. There is no delayed task, effect queue or accumulated tap force. Repeated presses replace the required inward component, with less energy as a vertex is already compressed.

Holding grows the target with `1 - exp(-age * pressRate)`. The local contact field gradually blends toward a wider field, so neighbouring surfaces move slightly while the selected face remains legible. Releasing preserves current positions and velocities, changes the target to rest, and uses the material's return spring/damping. Holding up to one second reduces return damping by at most 7%, making a deeper/longer release a little livelier. No position snap or automatic whole-body bounce.

Crossing the drag threshold stops the pending contact impulse, restores any existing dent quietly and keeps the established drag/flick equations. Cancellation, resize, blur, hidden/pagehide and context loss remove pending contact energy. A secondary pointer's cancel/lost-capture cannot cancel the primary pointer. The offset magnitude cap is 0.28 mesh units; outward velocity at that cap is removed. The cap is a safety bound for adversarial input, not the normal feel.

## Comparison settings

SOFT is the normal baseline: modest immediate contact, a slower deeper hold and restrained release. It is a provisional default; the author must judge actual iPhone/iPad comfort.

| Parameter | HARD | SOFT (default) | BOUNCY |
| --- | ---: | ---: | ---: |
| depth (mesh units) | 0.145 | 0.205 | 0.195 |
| propagation radius (mesh units) | 0.78 | 1.08 | 0.98 |
| pressRate (1/s) | 14 | 4.8 | 6.5 |
| press spring stiffness (1/s²) | 460 | 210 | 240 |
| press damping ratio | 0.90 | 0.95 | 0.85 |
| return spring stiffness (1/s²) | 460 | 185 | 230 |
| base return damping ratio | 0.78 | 0.68 | 0.46 |
| tap velocity impulse (mesh units/s) | 3.1 | 2.9 | 3.0 |

HARD is shallower and faster. SOFT holds deeper and returns more slowly. BOUNCY has more rebound with a shorter damping ratio, without a long vibration. All presets leave rotation damping (1.85) and settling (0.014) unchanged. Reduced-motion preference still uses shorter rotation inertia and disables rotational settling.

Open `?debug` to switch materials and adjust strength, propagation range, press rate, return stiffness/elasticity, damping and tap impulse. Existing rotation controls remain available there. No controls appear in normal mode. Changing a preset cancels any active contact, updates sliders, and retains the current shape until it restores. Slider steps exactly represent preset values. The panel scrolls in a short landscape viewport. It has no extra timer, so diagnostics stop/resume with the app's RAF and BFCache lifecycle.

## Small mesh contract

`TouchBody` consumes `rest`, `vertices` and ray-hit triangle indices/barycentrics. Optional `deformation.compliance` is one finite 0..1 value per vertex; default is 1. Optional `deformation.faceCenters[faceId]` maps a logical face to a vertex that should bend gently even on an off-centre hit. Dynamics contains no fixed corner count or centre offset. Contact normal comes from the rest triangle, so translated shapes work. Shapes should use consistent outward winding and a sensible normalized size; arbitrary imported scenes/models are not claimed.

Generated polyhedron metadata uses gentle shared-corner compliance and full face-centre compliance. It has the same 12 corners, 20 face centres, 20 logical faces and 60 GPU triangles as v0.1. Camera, rest positions, face colors, lighting and background are preserved.

## Checks and their limits

`node --test works/sukima-3d-lab/tests/*.test.mjs` — 28 tests pass:

- Zero-frame and short taps have actual inward movement, small rebound and finite settling for each material.
- Long holds progressively deepen, spread slightly, stabilize and restore without a position jump.
- 1000 rapid taps per material remain bounded, finite and preserve triangle orientation; debug extremes recover too.
- 30/60/120fps short/held/release traces remain consistent, including the already-visible shape at release.
- Primary/secondary input, quick swipe without a tap impulse, paused flick, interruption and tap during spin.
- Vertex permutation produces matching responses; a translated tetrahedral test mesh and a mesh without optional metadata work.
- Existing geometry, inverse camera rays, welded mesh, 60 off-centre face cases, resizing math, RAF lifecycle and rotation tests.

Existing lifecycle suite: 18/18 pass. JavaScript syntax, Python compilation, diff check and Scope → Risk → Impact pass. Exact PR head/CI and Pages publication results are recorded in the PR.

Optional reproducible shader/geometry evidence:

```sh
node works/sukima-3d-lab/tests/render-scenes.mjs | python works/sukima-3d-lab/tests/check-gles.py /tmp/touch-v02-render
```

Mesa OpenGL ES 3.2 llvmpipe compiled/linked the exact shipped shaders and rendered 39 frames at 390×844, 844×390 and 900×900. Each material's sub-frame tap, early hold, full hold and release changes hundreds or thousands of pixels, with GL error 0. Portrait SOFT rest/tap/held output was visually inspected. The fixture intentionally renders only the specimen, with a plain background and no ground shadow/UI. This is native GLES drawing evidence, not WebGL/browser/touch/device verification.

`tests/debug-fixture.html` mounts the real debug panel and real body without GL, for browser checks of preset/slider connections. Its visible heading explicitly identifies a UI test, and it does not simulate or certify 3D rendering. The cloud browser previously had no usable WebGL2 context; post-publication browser findings are recorded in the PR.

Physical iPhone/iPad Safari touch feel, actual mobile frame pacing and browser context-restoration/rendering remain UNVERIFIED until observed. No final VERIFIED/Release Complete claim. User adoption and production permission are separate from CI success.

## Device comparison

1. In normal mode, tap very briefly, then tap five times at different faces. A small "コツッ" should still be visible after lifting.
2. Hold for about one second and release. Compare the slow deeper dent and its short elastic return with a quick tap.
3. In `?debug`, repeat exactly those gestures with HARD, SOFT and BOUNCY; identify excessive rebound or sluggishness.
4. Swipe immediately, then flick, pause before lifting, and touch the spinning body again. Existing rotation should feel familiar.
5. Try a face edge, a second finger, rotation to landscape during a hold, and leaving/returning to the app. No stuck press or queued tap should remain.

Rollback: revert this isolated PR and only its target lifecycle title update. v0.3 waits for v0.2 device evaluation.
