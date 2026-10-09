# PUMPOKO: poyon growth and all-nine reward

Apply this changed-files-only ZIP on top of the visible-growth camera update
(`pumpoko-visible-growth-update.zip`). Paths are relative to the repository:
`works/pumpoko/`.

## Visual change

- Every pumpkin grows, overshoots to 114%, compresses gently to 97%, then rests
  exactly at 100%. This is a single finite animation, not a repeating wobble.
- With exactly nine of nine arrivals, the rightmost Hero Pumpkin retains a
  24% larger final size. Its growth overshoot is 120% of that larger size.
  There are still nine pumpkins; no seeds or pumpkins merge.
- The existing successful-jump richness bonus (up to 8% fruit size) remains
  independent and multiplies the Hero bonus. Grass and leaves retain their
  established richness behavior.
- Fruit remains anchored at its soil contact. No physical seed, arrival count,
  stage terrain, gesture, audio, Engine or Codea changes.
- Camera bounds reserve overshoot room as a constant composition, avoiding
  event-by-event camera bumps. The same enlarged Hero and scale are used for
  the continuous title connection, avoiding a size reset.
- Existing stagger, visibility-gated growth after tracking laggards, and the
  uninterrupted ending shot are preserved. The fruit settles within the
  existing growth-duration budget.

## Verification

123 executable Node checks pass, including 13 new poyon cases. Coverage includes
0/1/8/9 arrivals at 30/60/120fps, exact rest, ground anchoring, finite peak bounds,
maximum richness, nine-only reward, actual drawing scale, controls, full route,
visible-growth return, framing, and final title-size continuity.
Two historical audits (`test-migration.cjs`, `test-stage.cjs`) remain blocked
by missing original Git history in this local ZIP environment.

Independent full game-renderer Offscreen Canvas review checks peak/rest and
maximum richness. It is not an iPhone or browser acceptance test. The existing
work has no reduced-motion mode; none is introduced by this visual-only patch.

## Changed files

- journey.js
- stage-draw.js
- test-ending.cjs
- test-course.cjs
- POYON-REWARD.md
