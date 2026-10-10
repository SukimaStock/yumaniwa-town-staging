# PUMPOKO 02 — seed-to-fruit validation, 2026-10-10

Base: `cbf10a3b2aa1781ecf6f0d32ed98ddaf593529a6` (#181). Design/source/protection and actual-device drill: [INTEGRATION.md](INTEGRATION.md).

- Final integration suite: **14/14 PASS**, all run together after the final art change. Includes actual detached seed projection, same-ground landing before growth, three plants with one real travelling hero, frozen opening world, natural zero-input roll, continuous camera, original integrator equivalence, all four contact exchanges, coast/ending/replay, primary pointer, and blur during both falling and growth.
- Existing Lab, original ending/audio, Engine input/audio lifecycle, work lifecycle and World Consistency regression: **196/196 PASS**. Total: 210 distinct automated cases.
- Exact diff protection: `physics.js`, `world.js`, `courses.js`, `prologue.js`, `material.js`, `style.css`, Engine/Codea, audio and logo bytes are unchanged from the base. No original PUMPOKO/Lab/data/shared/production changes.
- Native offscreen Canvas: title, falling seeds, soil, three fruits, same hero, four exchanges, actual final pair and title return were rendered and visually reviewed. Full replay tests cover 390×844, 1180×820 and 844×390 with canonical Engine/Codea and DOM/media doubles. [Frames](visual-review/continuous-journey.png) are not browser screenshots.
- Original ending `fruit()` and the new fruit were rendered side by side for comparison. The exact contour, broad orange lobes, diffuse underside, stem and highlight are retained; the final adaptation uses uniform scaling to preserve the original's plump proportions. Rutabaga has simplified purple/cream colour masses and no face or thin veins.
- Scope → Risk → Impact PASS; immutable Plan digest and trusted base-owned syntax/registry checks are separately recorded in the PR at the exact published SHA. Git whitespace PASS.
- A preliminary broad regression glob also selected the Lab's optional browser-smoke script and failed because Chromium is unavailable. It was not counted as a pass. The correct automated `.test.cjs` set was rerun and all 196 tests passed. No browser or device execution is claimed.
- Actual iPhone/iPad/Safari: seed-to-fruit pacing, recognition of the original art, subjective slide/bounce/pop, CSS orientation layout and audible BGM/SE remain **UNVERIFIED**. Existing single-player logical audio continuity passed media doubles; those do not establish audible playback.

Plan: `.change-plans/pumpoko-02-seed-to-fruit-20261010/r0.lock.json` registered alone before implementation. Work-owned changes plus the previously authorized mandatory root Plan only. Formal verificationState remains UNVERIFIED; no Release Complete claim or production promotion.
