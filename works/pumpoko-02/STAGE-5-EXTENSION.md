# PUMPOKO 02 — STAGE 5 master-level interlude

Base main: `067646e904f53ba639a8e1f1425712bd053870ae`. STAGING only. User approved making Stage 5 **substantially more challenging**, after confirming successful additive Stage 3 (surprise mid-flat gap) and Stage 4 (voluntary retreat) changes.

## Concept: apply learned momentum, catching and restraint

The existing **five Stage 5 cliffs remain exactly authored**. A final interlude is inserted **after** old cliff 5 (x41030–41230), *not* by replacing original level segments:

1. A big but rounded descending bowl from x41770 through a low basin x42020 y−15, then a long rising receiving shoulder.
2. A first 160-wide physically unsupported gap **x42800–42960**, approached via a ridge at y190/slope .5.
3. Only **300 units later**: an upward bank, brief catch valley and a second 130-wide unsupported gap **x43260–43390**. Its far bank is **higher**, at y240 vs near y210. The raised bank is a consequence of the level's geometry, not an invisible collision.
4. After overcoming the pair, a gently descending free-running stretch returns to the **original final goal approach and the original fruit-size 'spot' cup**, translated in X.

No extra action, forced countersteer, HUD, momentum boost, new checkpoint or physics tuning. The user has to manage approach momentum and receiving positions with ordinary left/right controls. The very end remains deliberately quiet rather than making the cup a third new cliff.

## Evidence of meaningful difficulty, not an impassable block

Exact PUMPOKO 02 `physics.js`, `world.js`, `courses.js`, and existing 240-Hz integrator were run from the **same physical pumpkin state**, fixed at x41530, vx497 on the original ground, with no speed writes during play:

| Player controls | 30 fps | 60 fps | 120 fps |
| --- | --- | --- | --- |
| Right held throughout | FALL near x43407 | FALL near x43407 | FALL near x43406 |
| Brief left in x42540–42710, otherwise right | real goal seated | real goal seated | real goal seated |
| Brief left in x42600–42730, otherwise right | real goal seated | real goal seated | real goal seated |

The success family isn't one unique frame. The sample player's brake controls **precede** the first new gap and adjust the intermediate catch; short physical ground contact occurs at x~43084 between the first and second gaps. An actual landing is observed between the new gaps, so this is not a fake double obstacle or a single giant jump. The second far shore is 30 world units higher than its near shore.

An independent full Story run (30/60/120 fps) with **observational test-player input only** reached all five stages, four handoffs, all new gaps, the original goal seat and title return with no added falls. This sample-player code is only in `tests/five-stage-controls.cjs`; the game itself has no player steering automation.

## Structural protection of prior work

- STAGE 1–4 are **completely unchanged**, including user's personally protected higher far side in STAGE 4 x25740–25870 and accepted Stage 3 long-flat experiments.
- All five original Stage 5 gaps, banks and authored Hermite points through x41530 are identical. New course data occupy the inserted section; all original points beyond x41530 are rigidly shifted right **3000**.
- Stage 5 length **10600 → 13600**. The other stage lengths are unchanged. Total physical gaps **18 → 20**; Stage 5 has 7.
- Original goal x42630 → x45630, identical parameters `halfWidth=16, bottom=60, depth=18, speed=150, dwell=.06`; all original relative pocket points, finale visual scenery and handoff sockets are preserved.
- Stage 5 cameraFloor 50, failY−715, retrySeconds .65 are explicitly kept despite the deeper new basin; the long-stage retry burden requires real-device assessment.
- Existing Stage 1/2/3/4 constraints, common runtime, music, drawing, opening and outro stay identical.
- Test helpers precisely strip only the newly added Stage 5 interlude when comparing older golden snapshots. The strict earlier 18-gap *stationary run-up* tests remain intact. The new paired cliffs are intentionally not single-run-up obstacles; a separate focused Stage 5 test verifies each solid lip, genuine missing ground, near/far shore height, right-only fail, controlled success, intermediate physical landing, original pocket, and the complete five-stage journey at three frame rates.

## Verification boundary and follow-up

An automatic, repeatable full-world physics/Story example and GitHub gate checks are mechanical evidence only. Real-device iPhone Safari fun, whether the pre-gap countersteer feels intuitive without hints, late failure retry fatigue, visual continuity of the final quiet approach, and overall game difficulty remain **UNVERIFIED** until the owner plays.

Key human observation: the final stage should ask the player to **think with the physics**, not simply jump a wider chasm. If the second far bank seems arbitrary or failure late in the long level feels punishing, tune only the new interlude, not the previously adopted five gaps or the unique landing/ending pocket.

Staging only. Rollback = revert this isolated PR. No production changes.
