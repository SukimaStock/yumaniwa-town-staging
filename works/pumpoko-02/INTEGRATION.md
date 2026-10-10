# PUMPOKO 02 — entering the material world, 2026-10-10

Base: `b40842a3b919277ad432f3452e98e366ea980d92` (#183). Source is GitHub's read-only `works/pumpoko/`. Current main and related PRs were checked first; original-only draft #140 is not applied.

## Re-evaluating the original as a shot

Before implementation, 165 timed native Canvas frames (15fps / 11 seconds) and an MP4 compared actual original scenes with #183. Both were aligned at real nine-seed detachment, not at selected matching silhouettes. Original `sketch.js` leaves a 1.8-second breath. `journey.js` changes view scale from 1 to 1.85 over its 6.4-second transition. Its opening curve begins after 36% of that transition; `stage-draw.js` enlarges the cut, releases its outline, and brings terrain up from below while broad distant planes appear.

The perceived threshold is losing the enclosing perimeter: before that, cream space surrounds a recognisable object; afterward, flesh occupies the whole view and the remaining seed grains become its scale reference. Grains grow in the view rather than becoming miniature props. Quiet time before and during this loss of the edge allows attention to change from watching a pumpkin to looking around inside its material. Sky and land arrive while this change is still underway, rather than giving a separate explanation of the transformation.

#183's timed sequence reveals a clear ground early and shrinks its grains from title size toward .52 screen scale. Its exact skin-to-course interpolation makes the mechanism legible quickly. The hypothesis for this revision is that this certainty, and the outward scale change, work against the original's ambiguity. This is an interpretation of code and timed renders, not a claim of successful iPhone perception.

## Opening prototype

- Remove `shellScale`, `openingSurface`, the captured lower-rim data and its clipping/morph renderer. No contour is fitted to the course.
- Keep the existing 1.35-second post-detachment breath. During the 7.1-second opening, enlarge the cut gently, let its perimeter leave the view, and keep warm flesh present before the landscape becomes legible.
- Project the same title grains into presentation space once. Start the opening camera at .42× and move inward to the unchanged .8× playing frame, with a very small settling overshoot (peak approximately .807×). Airborne grains retain their own scale, so their apparent size grows to almost twice the title size. They quietly fade into planting only after landing.
- Reveal air/distant planes while the actual course rises from below the viewport. This is a temporary uniform presentation lift, not a course morph or collision change. Lift is zero at 4.7 seconds, before first landing at 4.9 seconds.
- Seed fall overlaps enclosure and landscape reveal. Growth happens within the shot; the nine-to-three grouping receives no extra marker or explanation. The three adopted fruits and their locations remain. The rightmost uses the same real hero renderer/size/position before natural physics resumes at 7.1 seconds.
- There is no dark transition, suction effect, scripted launch, new control or seed-to-WORLD-LOOP physics conversion.

## Protected behavior and scope

`draw.js`, `physics.js`, `world.js`, `courses.js`, `prologue.js`, `material.js`, `style.css`, audio/logo assets, Engine/Codea and original PUMPOKO are unchanged. Four real handoffs, initial course slope, slide/bounce/pop, gameplay .8× view and controls, adopted art, ending and title return are protected. The physical world stays frozen during opening and resumes without a kick.

Only work-owned opening code/tests/review assets/docs change, plus the previously authorized mandatory Plan-only root file. Production is untouched. Rollback: revert this isolated staging PR.

## Motion comparison and owner review

[Timed three-way MP4](visual-review/opening-film.mp4): original / before #183 / revision, 60Hz scene updates captured at 15fps, 11 seconds, no audio or retiming. An initial .8-second title still precedes each real detachment-to-play sequence. [Sequential frames](visual-review/opening-sequence.png) compare every second after detachment, left to right. [Five-scene references](visual-review/opening-comparison.png) and [complete journey](visual-review/continuous-journey.png) provide closer detail. Original has no opening growth; the five-scene reference explicitly marks that difference.

The original row uses actual original scene code with minimal DOM/audio doubles; 02 rows use the canonical Engine/Codea harness. These are native offscreen Canvas renders, not browser/device recordings. Generation: `node --expose-gc works/pumpoko-02/tests/opening-film.cjs` (requires ffmpeg/ffprobe), `opening-review.cjs` and `render-review.cjs` in the same directory.

On iPhone, compare the previous revision and this prototype for when the pumpkin stops feeling like an object, whether the surrounding flesh has enough time to become a place, whether scale change feels pleasant, and whether growth starts feeling like an explanation again. Confirm the adopted hero/controls and all four handoffs afterward. Subjective success, touch visibility, orientation layout and audible sound await the owner's actual-device review.

Plan: `.change-plans/pumpoko-02-world-entry-20261010/r0.lock.json`, locked alone before implementation. Formal verificationState remains UNVERIFIED. This is a staging prototype, not a declared artistic success or production release.
