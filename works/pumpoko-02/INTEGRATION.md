# PUMPOKO 02 — inside the cut, 2026-10-10

Base: `7ef0384aa7073c314cda338a1b808720cc468336` (merged #182). Source is GitHub's read-only `works/pumpoko/`, not Drive. The original-only draft #140 is not applied.

## Opening continuity

The original `sketch.js` holds a short breath after detachment; `journey.js` transfers the displayed seed coordinates once and moves the camera through the opening; `stage-draw.js` expands the cut into the material world while revealing terrain. These spatial responsibilities are adapted to 02's Y-up world and existing 390×740 presentation. Original seed gameplay is not imported.

After actual detachment, the existing title dynamics continue for a 1.35-second breath. A 6.1-second opening then carries one camera from the title projection to the unchanged .8× playing frame. Quintic easing gives zero velocity and acceleration at its endpoints; a restrained zoom push overlaps the translation. This replaces the previous late-only camera move.

The shell stays opaque and enlarges until its flesh surrounds the view. Its exact lower skin outline, including depth and vessel tilt, is sampled through the same title transform. From 1.6 to 3.05 seconds that expanded rim unrolls into `World.surfaceHeight()` of the real initial course. The foreground and sky clipping share that surface: air and distant colour planes open above the rim while flesh continues below it. There is no early separate stage or disappearing-shell fade. Once unrolling finishes, drawing uses the exact unchanged collision surface.

Each detached seed's initial world pose is the inverse of its actual displayed title pose. The camera then projects that same seed continuously; there is no second seed set at a new location. Falling starts during expansion (1.45 seconds plus small offsets); landing follows the completed terrain (3.2 seconds plus offsets). Growth follows each group's actual arrival on that terrain. Expansion, falling, air reveal and planting overlap.

The three adopted miniature fruits and their positions are retained. The rightmost is drawn at the existing real hero's position, scale and silhouette before control begins. The physical world stays frozen during presentation. Normal play then resumes; the unchanged initial slope supplies its roll, without a scripted kick or teleport. Title seed dynamics remain separate from WORLD LOOP physics.

## Protected behavior

`draw.js`, `physics.js`, `world.js`, `courses.js`, `prologue.js`, `material.js`, `style.css`, logo/audio assets and Engine/Codea bytes are unchanged from #182. This preserves the original ending-inspired pumpkin and matching rutabaga, nursery result, four real-contact exchanges, input transfer, integrator constants, course difficulty, control bindings, viewport fit, gameplay camera, ending and title return. Audio still uses the existing single Engine player.

Only work-owned opening presentation, tests, review images and documentation change, plus the previously authorized mandatory root Plan. Original PUMPOKO, other works, shared infrastructure and production have no diff. Rollback is a revert of the isolated staging PR; no saved-data migration.

## Review and device drill

Run `node --expose-gc --test works/pumpoko-02/tests/story.test.cjs`, `node --expose-gc works/pumpoko-02/tests/render-review.cjs` and `node --expose-gc works/pumpoko-02/tests/opening-review.cjs`.

[Opening comparison](visual-review/opening-comparison.png) shows original PUMPOKO, pre-fix #182 and this revision in five columns: title, expansion, falling, growth, play. Original PUMPOKO has no growth in its opening, so that cell explicitly says so. Each row uses its own actual timing; these are native offscreen Canvas renders, not synchronized browser screenshots. [Complete journey](visual-review/continuous-journey.png) also covers all four exchanges, the final pair and return.

On iPhone/iPad/Safari, assess whether the cut envelops the view and becomes the ground, whether seeds remain easy to follow, and whether the 1.35+6.1-second pacing feels natural. Confirm the grown hero rolls directly into the same-size gameplay. Check touch interruption during expansion/fall/growth, portrait/landscape layout, four exchanges, replay and audible music continuity. These subjective and actual-device checks remain UNVERIFIED.

Plan: `.change-plans/pumpoko-02-inside-opening-20261010/r0.lock.json`, locked alone before implementation. Formal verificationState remains UNVERIFIED; no production promotion or Release Complete claim.
