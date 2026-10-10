# PUMPOKO 02 — seed to fruit, 2026-10-10

Current base: `cbf10a3b2aa1781ecf6f0d32ed98ddaf593529a6` (merged #181). Related #176/#177/#178 establish the adopted four-swap world; #179 is the owner's latest original PUMPOKO snapshot. #180 was superseded by #181. The older original-only #140 is not applied.

## Source and result

The owner clarified: “Driveにはないです。githubですよ”. The read-only source is GitHub's `works/pumpoko/stage-draw.js`, especially its ending `fruit()` and `leaf()` functions. Drive's SukimaStock/Code was checked before that clarification; no named PUMPOKO source was found. No Drive file supplies this implementation.

The opening now keeps one visible cause and effect: touch the cut shell → detach its seeds → those same seeds fall onto the actual initial surface → three little pumpkins grow → the rightmost starts the journey. The old expanding-shell opening is removed. The shell recedes softly while the ground appears below it; the camera follows the planting ground continuously into the unchanged playing view.

- After actual detachment of all seeds, a .55-second breath precedes 4.3 seconds of falling, planting and growth. The original title dynamics and hit test remain isolated and unchanged.
- Every seed's starting world pose is obtained by inverting the initial camera around its actual transformed title position. Three groups land at distinct points of the existing surface. Growth begins only after that group's seeds have landed.
- The rightmost grown fruit uses the same position, scale, silhouette and renderer as the existing initial WORLD LOOP body. The physical model remains frozen throughout the opening. Normal play then resumes and the original initial slope supplies its roll; there is no scripted kick, teleport or seed-to-body physics conversion.
- The other two fruits stay at their roots, remain drawable during play, and add no collision or gameplay rules. The travelling plant's small leaves stay at its root and quietly disappear as it moves away. Replaying creates a fresh nursery and world.
- `draw.js` adapts the original ending fruit's exact plump contour, orange gradient, two broad lobes, underside shade, stem and small highlight. Fine rib lines and grain are absent. One uniform art scale keeps the original proportions; a small visual seating offset does not affect contact circles. The same renderer serves all grown and rolling pumpkins.
- Rutabaga keeps its purple shoulder, cream bulb, short root and small green leaves. Its drawing uses broad soft fills instead of rim/vein detail. Original spin, pulse and stretch inputs still animate its art. No faces or additional character mechanics.

## Protected bytes and layout

`physics.js`, `world.js`, `courses.js`, `prologue.js`, `material.js`, `style.css`, all audio and logo assets are unchanged from #181. The logical viewport is still 390×740, with the same fit and primary pointer/keyboard bindings. Four real-contact exchanges, 240Hz integration, input transfer, compression/seating, speed inheritance, bounce/slide, course and gameplay/ending camera are unchanged. BGM keeps the existing single Engine player across all phases.

Changes are restricted to work-owned presentation, art, tests and documentation plus the previously authorized mandatory root Plan. Original PUMPOKO, Lab, Engine, Codea, shared data and production have no diff.

## Verification and actual-device drill

Run `node --expose-gc --test works/pumpoko-02/tests/story.test.cjs` and `node --expose-gc works/pumpoko-02/tests/render-review.cjs`.

The canonical Engine/Codea harness uses DOM/media doubles and native offscreen Canvas. It checks actual detached-seed projection, landing-before-growth, frozen physical world, same hero, natural zero-input departure, camera continuity, four exchanges, stop/reverse/recovery, replay, interruption, one RAF and one music player. Native Canvas comparison covers the opening, all exchanges, final pair and return; it is not a browser screenshot or proof of audible Safari playback.

On iPhone/iPad/Safari, focus on:

1. Touch/drag the shell: the seeds visibly land, then produce three fruits; the rightmost is recognisably the very same fruit you control. Assess the .55+4.3-second pacing and follow shot.
2. Recognise the old ending's round miniature pumpkin, including while rolling; assess whether rutabaga belongs alongside it without excessive characterisation.
3. Make all four exchanges, including stop/reverse/restart. Compare slide, bounce, pop and camera framing to #181.
4. Finish and replay twice; interrupt title, falling, growth and play with page switch/lock/orientation. Check fresh seeds/plants/sockets and no residual touch.
5. Listen through the opening, play, ending, return, mute and page resume. Music/timbre/volume on a real device remain unverified.

Plan: `.change-plans/pumpoko-02-seed-to-fruit-20261010/r0.lock.json`, committed alone before implementation. Formal verificationState: **UNVERIFIED**. No production promotion. Rollback: revert this isolated staging PR; no saved-data migration.
