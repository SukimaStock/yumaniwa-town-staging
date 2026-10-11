# PUMPOKO 02 — original opening, actual roots, 2026-10-10

Base: `7a5fadefc589bcf5b743ee86ac35a104df8ad9da` (#184). Original GitHub work is read-only. Main and open PRs were checked first; original-only draft #140 is not applied. Production is untouched.

## What is reused as one opening

`opening.js` extracts the original `journey.js` opening kernel, rather than a new flight animation: title seed objects and their velocity/spin are retained; the .8 title projection is baked once; fixed 1/120-second vessel inertia, concavity, expanding physical rim, ellipse support, terrain bounce, pair collisions, rolling pose, opening curve, median/velocity camera and 1→1.85 zoom run together. The original post-detachment 1.8-second breath is restored; title dynamics continue during it. Original seed gameplay controls, jump rewards, final field layout and ending state machine are not imported.

`opening-draw.js` reuses the original `stage-draw.js` shot ordering and timing: broad distant planes appear with opening progress; the cut expands by `1 + opening * 1150 / 94` under the seed camera; its outline fades on the original curve; terrain rises by `(1-opening) * 700`; exactly one copy of each grain is drawn. The title's existing original vessel primitive supplies the cut. No matched rim contour, new zoom timeline, suction or dark transition is added.

The connection adapter keeps original Y-down coordinates, converts once to 02 Y-up units (`1.85 / .8`), and samples the existing 02 surface for both seed contact and terrain rendering. The initial floor is 100 original units below the cut centre, as in the source. This changes the landing terrain to the actual 02 course, not the opening's motion/camera equations. The original course is not copied over the accepted WORLD LOOP course.

## Removed scheduled flight

The three predetermined plants, nine destination coordinates, `depart` / `land` deadlines, `origin→target` interpolation, frozen in-flight seed poses and independent 7.1-second shell/camera timeline are removed. A grain can root only after the surface has fully unfolded and its actual one-sided top contact stays stable for .24 seconds below speed 95, using the original arrival contact condition. Root x/y/time are immutable observations. Rooted grains remain members of the original median camera party until the handover, so early rooting cannot abruptly switch its transition anchor. Seeds are never attracted, snapped, collected into a group or rearranged afterward. If any grain is still falling when play begins, its independent original integrator continues; it is not discarded at the handover.

## Actual root → original growth → same body

Each actual arrival grows at its recorded surface position. Original ending shoot/leaf timing, .90-second quiet onset and the 2.25-second overshooting fruit-growth curve are reused locally, without the original final-field composition, reward sizing or fruit layout. The adopted pumpkin/rutabaga art functions are byte-identical to #184.

At the end of the original inward transition, one observed root is selected, favouring a downhill contact so normal gravity can begin its roll. Selection does not alter seed flight. The existing `world.entities[0]` body is seated there **before fruit is visible**, with the same root x and a vertical solution for the unchanged contact circle. Its art identity is retained. Other roots stay where they landed; their miniature size uses the original nine-fruit density.

The 1.25-second camera bridge overlaps leaves/fruit growth and ends at full growth, the identical .8× gameplay frame and the already seated body. There is no body replacement, later relocation, scripted velocity kick or new input. Normal WORLD LOOP integration then resumes at that actual birthplace. Remaining local growth continues while that one pumpkin rolls away.

## Protected behavior

`physics.js`, `world.js`, `courses.js`, `prologue.js`, `material.js`, `style.css`, audio/logo assets, original PUMPOKO and Engine/Codea are unchanged. The full playing/coast/ending/title-return block is byte-identical to #184. Four real collision handoffs, slide/bounce/pop, controls and gameplay .8× frame remain. The initial playable location follows the selected actual root instead of teleporting to the old fixed start.

Only `works/pumpoko-02/` changes, plus the previously authorized mandatory root Plan Lock committed alone before implementation: `.change-plans/pumpoko-02-original-fall-growth-20261010/r0.lock.json`. No shared runtime or external service dependency is added. Rollback: revert this staging PR.

## Motion evidence

[14-second three-way comparison](visual-review/opening-film.mp4): original / exact #184 / revision, identical actual pointer detachment gesture, 60Hz updates captured at 15fps, 210 frames, no retiming or audio. A .8-second title still precedes the detachment-aligned sequence. [Sequential frames](visual-review/opening-sequence.png) show every second after detachment. [Five-scene detail](visual-review/opening-comparison.png) and [complete journey](visual-review/continuous-journey.png) supplement the motion capture.

The original row runs actual original scenes; 02 rows run canonical Engine/Codea with DOM/media doubles. All images are native offscreen Canvas, **not browser or iPhone recordings**. Code-level continuity is tested; whether the old entering-the-world feeling succeeds awaits the owner's actual iPhone review. See [TESTING.md](TESTING.md).
