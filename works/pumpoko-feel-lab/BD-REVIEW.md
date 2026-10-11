# PUMPOKO FEEL LAB — B→D variation study

**2026-10-11**, staging-only, based on main `30112d5dcf78a97dc10ba9d2bc20aa4475198fe4`. The user reported that B→D was especially enjoyable for *both* ROLL and BOUNCE, and distinguished enjoyment of controlling a character from challenge and post-clear satisfaction. This study keeps those distinctions separate. No goal, score or checkpoint is added.

## Four controlled experiments

| Variant | What changes | Authored points | End X |
| --- | --- | --- | --- |
| B→D baseline | **None**: exact `orderPoints.bd` as already adopted | 27 | 4080 |
| B→D short flat | D plateau x 2680,2880,3055 → 2680,2780,2855; post-plateau D translated -200 in X | 27 | 3880 |
| B→D long flat | D plateau x 2680,2880,3055 → 2680,3005,3305; post-plateau D translated +250 in X | 27 | 4330 |
| B→D→B | Exact baseline followed by original B (RHYTHM) using the same 180-unit Hermite seam with Y translation only | 42 | 6460 |

The control plateau remains at **y=40, zero slope**, with length 375 baseline, 175 short and 625 long. Other existing vertices' Y values, slopes, and earlier B course stay unchanged. The appended third B uses unchanged control-point shape and is simply translated. The existing PUMPOKO 02 `physics.js`, `world.js`, `draw.js` remain untouched.

All older experiments remain selectable through their original Single, Chain and Order modes. The new fourth "B→D 研究" mode defaults to the unchanged baseline. Both kinds can run every variant. The selected variant and segment label appear while scrolling through a course. The optional existing impression buttons are **not** success/failure scores; `もう一回！`, `良い瞬間`, `勢いが切れた` record tactile experiences rather than goal difficulty. Existing localStorage key is retained; records include actual Hermite geometry, source course IDs, modified factor and a free note.

## Mechanical verification

An in-memory JS/DOM canvas fixture executed the exact fetched PUMPOKO 02 Physics/World/Art modules and the candidate FEEL LAB app, with a no-op canvas for draw-call safety. ROLL/BOUNCE × 4 variants = **8 cases**, each driven for 15 seconds of right-held input at synthetic 60 fps, traversed to the final side (x=4029,3829,4279,6409 for pumpkin; x=4033,3833,4283,6413 for rutabaga), with **no JavaScript exceptions**. All cases selected the intended terrain/mode and recorded their actual point arrays through the unchanged localStorage key. Original Single, Chain and Order mode selection was also smoke-tested.

Reference geometry check: exact `JSON.stringify(bdVariants.baseline) === JSON.stringify(orderPoints.bd)`. Every curve has strictly increasing X and finite control points. D plateau vertices were measured for all variants (positions above); short and long move only the flat midpoint, flat end and later X positions. For B→D→B the first 27 points exactly match baseline, the second seam uses the same connector profile as prior order studies.

Rendering improvement: visible-area sample drawing only; avoids drawing thousands of outside-view curve points on the long replay course. Game physics retains 240Hz integrator, no tuning changes.

The numerical/DOM fixture **does not render a real browser frame or emulate iPhone Safari**. Device touch, UI clipping, actual painted art, subjective fun and whether any variant improves replay value are **UNVERIFIED** pending user testing. Do not claim this study proves which form is most fun. Formal verificationState remains UNVERIFIED.

## On-device evaluation

First confirm baseline feels identical to earlier B→D. Compare shorter vs longer D flat separately with both fruit kinds, with no need to reach a goal. Finally try B→D→B and ask whether returning to rhythmic bouncing makes the player want to keep playing. If a course feels bad, record whether movement or momentum *during play* is less fun; do not conflate this with success difficulty. Revert only this PR to roll back.
