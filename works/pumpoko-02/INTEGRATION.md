# PUMPOKO 02 integration — 2026-10-09

Base: `b71b444b0eea6080db501cc0bf52401f46d3f0fc` (PR #179).
Related PRs: #176 world kernel, #177 four-swap route, #178 independent game, #179 owner latest original PUMPOKO. The only open PUMPOKO PR at start was the older original-only #140; it is not applied.

## Sources and boundaries

Current original `stage-data.js`, `stage-geometry.js`, `stage-draw.js`, `journey.js`, `dynamics.js` and `sketch.js` are read-only source references. Drive's SukimaStock/Code folder was also checked; neither PUMPOKO, pumpoko nor こつ had a matching named source there. The explicitly supplied current staging code is the implementation reference, including #179's owner snapshot.

- Inherited: exact original logo and unchanged audio bytes; 390×740 title composition, shell silhouette, flesh gradients, rind thickness, seed/vessel dynamics and tethers; 1.8-second post-detachment pause and fiber fade; original warm palette, soft terrain shoulders, green rind/cream rim; gentle long-run undulations, rounded half-pipe, catches; exponential tracking, velocity anticipation, residual motion, one continuous pullout and hero zoom return.
- Protected: `physics.js` and `world.js` are byte-identical to the adopted #178 kernel. Fruit constants, 240Hz stepping, input edges, real-contact eligibility, tolerance/speed checks, 75ms compression, 180ms seating, bounded launch/inheritance and exactly four swaps are unchanged. The Lab, original game, Engine, Codea and production have no diff.
- Adapted: Y-down original terrain becomes work-local Y-up Hermite data. Five distinct sections lead to sockets x=1400, 2790, 5210, 7050, finish x=7380. Local socket approaches retain the original mouth/floor relation. The second surface has a broad half-pipe; second cellar has a deeper irregular basin. The final catch near the last socket makes both actual vegetables readable without relocating either body.
- Prologue, drawing material, title drawing, physical world, courses, view/story and audio integration have separate responsibilities. Seed states never enter WORLD LOOP; seed journey/collection/growth are not loaded. Only selected title functions are adapted; original runtime files are not loaded or cloned wholesale into the game.

## Time and layout

The title still requires actual seed detachment. Pointer grabs/dragging use original impulse, 210px drag mapping and original vessel tuning; keyboard left/right moves the same vessel and existing Space/Enter touches it. Detachment is not a timer or count of taps. After the last seed, 1.8 seconds of quiet precede a 3.2-second opening, adapted from the original 6.4-second opening for a single fruit. The fresh WORLD LOOP remains frozen until its opening completes, with gesture/key residue cleared.

Canonical Engine fit uses 390×740 portrait coordinates, including the input midpoint 195. Landscape retains this composition with letterboxing rather than stretching the physics. Real CSS layout, rotation and Safari fit remain device checks.

The model camera remains untouched; a work-local low-pass velocity look-ahead (±55 world pixels) affects only presentation. Final motion is still physical. After release, grounded low speed for 0.4 seconds permits a six-second pullout plus five-second hold, then a 3.6-second zoom into the same pumpkin and continuous overlap with a fresh title shell. Continued coast input is permitted. Replay creates a fresh world with all four sockets unused.

The original BGM uses one canonical Engine music resource, starts on trusted gestures, loops, and never seeks/restarts on scene changes or replay. Original shell/fiber/don/seed sounds cover contact, detachment, exchange and substantial landings. Roll and boost ticks are removed. No delayed queue after resume. Actual loudness and timbre are unverified.

## Validation

Run `node --expose-gc --test works/pumpoko-02/tests/story.test.cjs` and `node --expose-gc works/pumpoko-02/tests/render-review.cjs`.

The harness uses canonical Engine/Codea with DOM and audio/media doubles, and @napi-rs/canvas for native rendering. Media-clock assertions prove logical player continuity, not audible Safari playback. Native Canvas defers raster work; the harness reads a pixel periodically and releases native resources to bound verification memory. Early render test attempts exhausted verification memory; these were not counted as passes. Local Playwright cannot run: its Chromium executable is absent.

The tests check asset/kernel byte identity, physical seed detachment, frozen world and safe transfer, exact Lab integrator equivalence using the **new course** at 30/60/120Hz and default/min/max tuning, all four input-driven exchanges, portrait target bounds, real-body final framing, low/high/offset contacts and speed caps, distinct geometry/clearance, stop/reverse/recovery, canonical lifecycle/replay/one RAF, native drawings at 390×844 / 1180×820 / 844×390, and single BGM player/mute/resume. The new terrain deliberately does not produce the old course's trajectories; tests compare the unchanged integrator supplied with identical new geometry.

Native review `visual-review/continuous-journey.png` is offscreen rendering, not a browser screenshot. Scope→Risk→Impact and syntax/whitespace checks are separate from device evidence.

## Mandatory PR gate conflict

User explicitly limits every changed file to `works/pumpoko-02/`. The immutable pre-implementation lock therefore lives at `works/pumpoko-02/INTEGRATION-PLAN.lock.json`, committed first. All implementation paths satisfy that scope.

`AGENTS.md` requires an immutable plan; `.github/workflows/change-pr-gate.yml` accepts only a first commit adding `.change-plans/<id>/r0.lock.json`. Under the strict user scope this external file cannot be added. The required gate will report zero root Plan Locks. Do not weaken the gate, override it or merge this PR. A narrowly authorized root-plan exception would require a fresh base branch with the accepted Plan as its first commit, then reapply this reviewed work-only implementation and rerun checks.

Formal verificationState: **UNVERIFIED**. No production promotion.

## Device drill

1. iPhone portrait: touch and drag the cut shell, observe seed/tether response, fiber fade and opening. Check the last detached seed → slide transition feels continuous and not slow.
2. Make all four exchanges; stop, reverse and restart in each section. Check weight, bounce rhythm, pop contact, target visibility and vertical follow. Compare to the adopted 02.
3. At final surface release gently; also hold for 2/10/30 seconds before releasing. Check natural catch, two-plant framing and uninterrupted return zoom.
4. Repeat complete play twice. Interrupt a held pointer with tab switch, lock, orientation change or pagehide, then resume; no held motion should persist.
5. Listen through title, game, ending, return and replay. Check BGM continuity, subtle pop/landing balance, mute and page return; do not infer Safari recovery from media doubles.

Rollback: revert this isolated work-only PR. No data or save migration.
