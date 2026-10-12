# Touch Lab v0.3 — surface grab and elastic pull

## Scope / baseline

Started from staging/main `ddb4166106696f2aa0cda241732e5beb941dfcef`, after reviewing merged #277 (v0.2 tactile response), #278 (complete versioned browser module graph), current code, AGENTS and Change operations. The explicit v0.3 instruction supersedes the earlier v0.2 restriction on pull. The work remains **active / staging-only**.

Changes are confined to this work, its lifecycle title and the required pre-implementation Plan Lock. Shared 2D Engine, other works, town, SEO, deployment workflow, production, lifecycle status and public URL are unchanged. No new specimen, editor, multi-object system or two-finger scaling. No Three.js, Babylon.js, external runtime package, physics library, storage or API. Browser-standard WebGL 2, ES modules and Pointer Events remain the implementation.

## Modules

| File | Responsibility |
| --- | --- |
| `engine/interaction.js` | Captured primary pointer; press → rotate or armed → grab; RAF hold age and cancellation |
| `engine/camera.js` | Projection, inverse picking ray, frozen camera-plane drag mapping |
| `engine/pull.js` | Mesh-independent barycentric attachment, smooth neighbour weights, resistant displacement and topology safety |
| `engine/dynamics.js` | Existing press/impulse and quaternion inertia, held pull targets, shared return springs |
| `engine/response.js` | Unchanged v0.2 HARD/SOFT/BOUNCY material parameters and scalar spring |
| `engine/geometry.js` | Unchanged irregular shape: 20 logical faces, 32 welded vertices, 60 GPU triangles; deformed-mesh picking |
| `debug.js` | Opt-in material and parameter UI; values shown beside sliders |
| `app.js` | Input/body composition and existing resize/visibility/BFCache/context cancellation |
| `engine/renderer.js`, `math.js`, `loop.js` | Existing shaders, lighting, quaternion/vector math and RAF |

All runtime imports, CSS/app entry points and browser fixtures use `?v=0.3.0`, checked by the version-graph regression. Some otherwise unchanged rendering/geometry files differ only in import version. A warm older graph cannot mix with v0.3. No import map, Service Worker or new asset framework.

## Gesture contract

- **Tap / ordinary hold:** seed the exact v0.2 bounded contact impulse and retain progressive pressure. A stationary hold keeps deepening even after it becomes eligible for grabbing. Release retains positions and velocities for natural return.
- **Ordinary drag:** travel at least **10 CSS px before 380 ms** commits to rotation for the rest of that pointer capture. The threshold is slightly more tolerant than v0.2's 7 px to allow finger drift. Quaternion drag equations, speed cap, inertia, stale-flick cutoff and rotational settling are retained.
- **Long press:** **380 ms** without crossing the rotation threshold arms the grab. It does not stop the pressure spring or move the shape by itself. After arming, at least **3 CSS px** from the armed position starts pulling; it can no longer turn into rotation. No timer, queued gesture or normal-mode button. Hold age advances on the existing RAF; event timestamps also handle the first move after a stationary hold without an intervening frame.
- **Grab:** bake the current settling pose, stop angular momentum, capture current offsets and keep orientation fixed. The same picked triangle/barycentrics stay attached throughout, including during earlier deformation recovery.
- **Release / interruption:** release clears grab/contact state without a position snap; the rest shape becomes the spring target. Cancel/lost capture, resize, blur, hidden/pagehide and context loss also clear pointer capture and angular/vertex velocity. Current positions recover using the same bounded spring. There is no stale projection plane or delayed grab on re-entry. A secondary pointer cannot cancel the primary one.

This is one-finger or mouse surface grabbing. The word "pinch" does not mean a two-finger scale gesture in this version.

## Screen-to-3D calculation

At grab start, interpolate the **current deformed triangle** with the picked barycentrics. Transform that attachment into world space with the frozen pose. A camera-parallel plane passes through its world Z. For a CSS-pixel delta `(dx,dy)`, use:

```
depth = camera.distance - attachmentWorld.z
worldDelta = [2*depth*tan(fov/2)*aspect*dx/width,
             -2*depth*tan(fov/2)*dy/height, 0]
localDelta = inverse(frozenPose) * worldDelta
```

Canvas offsets, CSS size and camera distance/aspect are respected. Mapping is independent of DPR; the renderer still caps DPR at 2. Right/up finger motion remains right/up on screen after arbitrary object rotation. Resize cancels the capture rather than reusing an obsolete plane. At small displacement the attachment follows this mapped delta; deliberate resistance and the safety bound make large drags fall behind the finger rather than stretch indefinitely.

## Deformation and feel

Pull weights are a spatial field over **rest vertices**, with a flat core out to 35% of the propagation radius and a cubic smoothstep falloff to zero at the radius. Normalize by the barycentric attachment weight so nearby triangles follow the grab without a special face-centre ID or separate face geometry. Shared vertices keep seams welded. Pull does not depend on the 20-face shape or its v0.2 press-compliance metadata.

Target displacement uses `maxPull * tanh(length * pullStrength / maxPull)` in the mapped direction. It is nearly linear for small motion, then resists more strongly. Captured pressure offsets are retained as the baseline, preventing a shape jump at the transition. Critically damped tracking springs follow the live target; the existing material return springs restore every vertex to its exact rest position.

A global displacement cap scales the entire field, preserving smooth neighbour relationships. A safety guard also requires each triangle's signed projected area to remain at least 18% of its rest area and each edge length between 35% and 200% of rest. Extreme input uses a bounded bisection to reduce the whole offset field. The guard covers release overshoot and repeat interactions until offsets are small. It is a compact deformation safeguard, not collision/volume-preserving physics. Arbitrary imported or degenerate meshes are not supported.

Pull release reduces the material damping ratio by at most 10%, proportional to stretch, for a small final rebound. Return stiffness/damping remain the same controls for both pressing and pulling. SOFT is the provisional normal default; actual device comfort is not certified.

| Pull parameter | Default | Debug range |
| --- | ---: | ---: |
| holdDelay (ms) | 380 | 200–700 |
| pullStrength | 1.00 | 0.50–1.50 |
| maxPull (mesh units) | 0.48 | 0.20–0.60 |
| pullRadius (mesh units) | 1.45 | 1.00–1.90 |
| pull tracking stiffness (1/s²) | 520 | fixed |
| tracking damping ratio | 1.00 | fixed |
| return stiffness (1/s²) | 185 SOFT | 100–500 |
| return damping ratio | 0.68 SOFT | 0.40–0.98 |

Higher return damping means less final shaking. Sliders cancel the current contact before changing parameters; presets retain pull settings and rotation preferences while changing the material response. The debug panel scrolls in short viewports. It adds no normal controls or separate update timer.

| v0.2 material retained | HARD | SOFT (default) | BOUNCY |
| --- | ---: | ---: | ---: |
| press depth | 0.145 | 0.205 | 0.195 |
| press radius | 0.78 | 1.08 | 0.98 |
| pressRate (1/s) | 14 | 4.8 | 6.5 |
| press stiffness | 460 | 210 | 240 |
| press damping | 0.90 | 0.95 | 0.85 |
| return stiffness | 460 | 185 | 230 |
| return damping | 0.78 | 0.68 | 0.46 |
| tap velocity impulse | 3.1 | 2.9 | 3.0 |

HARD returns quickly with less rebound; SOFT is slower and deeper; BOUNCY has a livelier release. Pull tracking is shared so comparison isolates press and release feel. Rotation damping/settling are unchanged by presets. Existing reduced-motion rotation preferences remain respected.

## Reproducible verification

```sh
node --test works/sukima-3d-lab/tests/*.test.mjs
node tests/test-work-lifecycle.cjs
node works/sukima-3d-lab/tests/render-scenes.mjs | python works/sukima-3d-lab/tests/check-gles.py /tmp/touch-v03-render
```

38/38 work tests and 18/18 existing lifecycle tests pass locally. The suite retains all v0.2 tap/press/flick/cache/fallback tests. New cases cover stationary arming with unchanged pressure, pre-hold rotation, post-hold capture, jitter, no-RAF timestamp arming, cancellation/capture loss, 600 mapping/attachment checks across 120 rotated viewport configurations, material return at 30/60/120 fps, all faces and off-centre pulls, extreme changing directions, repeated interactions, complete settling and vertex-order independence. Exact counts/results and checked PR SHA are recorded in the PR.

Optional Mesa/EGL script compiles/links the exact shipped shaders and renders rest, tap, hold, release, pull and pull release at 390×844, 844×390 and 900×900. 57 frames passed with visible pixel differences and GL error 0. These establish native GLES geometry/shader evidence; they do **not** certify browser WebGL, mobile performance or physical touch feel. Native rendering excludes UI/ground shadow.

`tests/debug-fixture.html` mounts the actual body, input and debug UI, with a labelled 2D pointer region and visible state/offset readouts. Every point in that fixture deliberately selects the centre face. It checks real browser pointer capture, gesture switching and settings, **not** 3D picking/rendering. The cloud browser has previously lacked WebGL2; main fallback and fixture observations after publishing are reported separately.

Formal verificationState remains **UNVERIFIED** under the current repository contract. iPhone/iPad Safari gestures, real mobile frame pacing and browser context restoration remain unobserved. CI/staging merge is not author adoption or production authorization.

## Device evaluation / next decisions

1. Tap rapidly and hold without moving: compare the preserved v0.2 dent/rebound.
2. Drag immediately and flick: compare ordinary rotation; wait with finger still down and move again to confirm it remains rotation.
3. Hold about 0.4 seconds, drift slightly, then pull right/up and diagonally. Check the arming delay, attachment drift and increasing resistance.
4. Rotate to several faces, then repeat pulling near the centre and an edge. Release shallow and deep pulls; check final rebound and exact recovery.
5. Compare HARD/SOFT/BOUNCY at `?debug`; adjust hold time, strength, max amount/radius and return speed/damping. Report accidental mode changes or excessive lag.
6. Rotate device during a grab, leave/return to the tab and briefly touch with a second finger. No active grab should remain.

Future tuning depends on those observations: long-press discoverability/time, screen attachment lag versus resistance, neighbour radius/strain limits on other shapes and device performance. No additional gestures/editor are implemented.

Rollback: revert this isolated PR, including only its target lifecycle title. The preceding v0.2 and cache repair remain available in Git history (#277/#278).
