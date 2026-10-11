# PUMPOKO 02 — STAGE 4 additive choice-of-momentum interlude

Base staging/main `251f9da7937cf268d718c1410e2cd4bafde91be2`. Work-only staging experiment; production not modified. Formal verificationState remains **UNVERIFIED** until iPhone testing.

## What the user protected

The user supplied an iPhone screenshot of an unexpectedly **higher far-side bank** and explicitly asked that this obstacle be protected. In the current STAGE 4 underground2 course, the high receiving bank at the existing gap `stage4-3` runs from **x25740, y−135** to **x25870, y−65** (a rise of 70 world units). The original height, curve tangents, texture, approach, physical gap and pocket after it are **exactly unchanged**. All **four** existing STAGE 4 gaps and their full upstream control-point arrays through x27950 are unchanged. Do not replace or flatten this feature in future changes.

## New, additive section

Following the fourth existing STAGE 4 chasm (x27500..27650), the fruit continues on unchanged ground until x27950, then enters an extra, authored interlude:

- Gentle descending shoulder into a small basin (x28140→28330, down to y−215).
- An upward return shoulder (x28520→28730) and a **long breathing flat at y−125**.
- A new **unsupported physical gap x29440..29560, width120** halfway through that flat. It is neither a bonus-action nor an introduced jump: the fruit crosses only through the current PUMPOKO 02 physics.
- A long receiving bank (until around x30620), merging smoothly with the former last three STAGE 4 points rigidly translated by **+2400**.

A stopped rutabaga approximately x29310 (=130 units before the lip) approaching rightward falls under unchanged physics, while an unprompted reverse to regain momentum can cross. Importantly, the user can also reach this obstacle with sufficient speed and cross without reversing. No popups, forced stopping, special acceleration or additional checkpoint were added.

**Experiment-driven tuning:** first draft width150 created an unacceptably narrow reverse-success window. Keeping the rest of the level exactly the same, only the *new* gap was reduced to width120, allowing a broader voluntary reversing interval. The intentionally high earlier shore is unaffected.

## Stage boundaries, sockets and finale

STAGE 4 grows from **8830 to 11230** world units, adding **2400** without removing existing difficulty. STAGE 5 remains **10600** world units with identical original curves and relative gaps, simply translated right +2400 (no difficulty changes). STAGE 1–3—including the previous FEEL LAB STAGE 3 addition—remain exact.

The STAGE 4→5 socket moves from x29630 to x32030; the final goal-pocket x40230→x42630. STAGE 5 floor/gaps, lower cellar ceiling `right/roofStart/exitX`, bridge endpoint, stage starts/ends, global goal/finale camera reference geometry and the original pocket/ending pose all translate consistently. Existing stage 4 cameraFloor−125, failY−890 and retrySeconds .65 are expressly protected, so the new low basin doesn't change the old camera/failure presentation.

Total chasms **17 → 18** (Stage 4 now has five). All earlier 17 gaps are preserved.

## Mechanical verification so far

The current candidate `courses.js` was dynamically loaded with the **unmodified** work-local `physics.js`, `world.js`, `prologue.js`, `opening.js` and `story.js`. The current test-player input policy is isolated test code, not runtime game guidance.

- Full five-stage title-to-title test: 30/60/120 FPS all reached all four baton transfers, the goal pocket and title return, with 0 falls and 0 JavaScript errors.
- The original four STAGE 4 gap descriptors, their early terrain through x27950, and specifically the x25740..25870 rising far shore are byte-for-byte unchanged.
- The current full geometry, after **reversing exactly and only the new Stage 4 additive insertion and +2400 translation**, matches the immediately preceding staging/main world for every property (including Stage 3's previously adopted new content). Historical pre-Stage-3 references normalize only the two declared approved insertions.
- STAGE 4 BOUNCE at x29310, with no initial velocity, low-speed **right hold** falls; voluntary **left for 1.7–2.4 seconds then right** crosses the width120 obstacle in synthetic full-story physical tests at 60fps, with actual leftward distance and no state boost. The added test source `stage4-extension.test.cjs` exercises both patterns at 30/60/120fps.
- Existing final goal's seating speed, dwell and geometry remain unchanged; the same original short ending is preserved.

These are physics/structure tests, **not** proof of visual legibility on iPhone or of an intuitively discoverable decision. Especially important human checks: the screenshot's previously high far bank must still surprise; does the new flat actually give the rutabaga space to consider retreat; is returning from the longer Stage 4 start after a failed late jump too punitive; and is it still pleasant to land and resume? If the added choice is not fun, adjust the new section alone, never erase the protected high far shore.

Rollback: revert this isolated staging PR. No production or Engine/Codea changes.
