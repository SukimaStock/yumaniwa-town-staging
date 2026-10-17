# Phase 2 verification

Staging-only experiment. Base: `bf11ff656c25be0817d4372c1f9a0417cdcaa252` (Phase 1 / PR436).
Plan Lock: `.change-plans/ambertime-distillation-models-phase2-20261017/r0.lock.json`, digest `fc32d05d76f3b94ac142bcf83ec095ad28ffd5a87c1e687c4a9a57a7a240b930`.

## Isolation

- All 258 baseline AmberTime files other than `index.html` are byte-identical to the base. The index change is one footer link. No player runtime, parameters, saves, replay operations, or Production changes.
- Main `model.mjs` SHA-256: `53e73398202961ff4bab147c48c86148466e488cac6619bb5a4a7f5fc4dcb2e1`.
- Candidate `models.mjs` SHA-256: `f321c7fd03a5012934b974853cf67a5bf6cefb556ee8a89bdc3523e9cdeb5e26`. Frozen in local pre-analysis commit `ba9836e71bf6fe8f65b2099af9b8201cfb3ffc19`; mirrored as `cb4fb210a97ac607108ae48851cf253a1ca7852f`. Results and curves record this hash. No post-analysis curve tuning.
- Existing LAB AmberTime entry → AmberTime footer → comparison experiment; experiment links back to the game and LAB. `work-lifecycle --write-lab` produced no diff; `--check` passed. No new work identity or shared renderer change.

## Numerical checks

`node --test works/ambertime/experiments/distillation/tests/*.test.mjs`: 21 tests passed.

Combined regression: `node --test works/ambertime/experiments/distillation/tests/*.test.mjs works/ambertime/tests/*.test.mjs` — 357/357 passed (336 existing + 21 experiment), 0 failures/skips, 322.1 seconds. Includes manual/usual distillation, parallel aging/sales, wholesale, special orders, brands/reputation, and existing save/replay fixtures.

Independent tests cover eight seeds × all 70 legal stop positions against the public current-game operations, seeded next-batch variation, initial 24 L and volume-weighted mass balance, quadrature convergence, continuity, unmodified aging and retail controls, costs, strict special-order boundaries, shared customer caps, and no composition-only economic bonus.

`node works/ambertime/experiments/distillation/analyze.mjs`: 1,680 raw profiles, 13,440 aging conditions, 26,919 retail scenarios, 646,056 monthly retail calculations. `results.json` status is `complete`. See `REPORT.md` / `report.html` for assumptions, sample tables and limits. A separate reviewer checked every persisted sample's cost and profit arithmetic, result counts, model hashes and key report claims.

## Browser checks

`node works/ambertime/experiments/distillation/tests/browser-run.mjs`: passed Chromium 1280×900, 390×844 and 390×667. See `tests/browser-results.json` and three screenshots.

- Application's actual 100 ms timers: minimum stop, arbitrary stop, pause/resume, retry, model-switch cancellation, explicit stop at 99.
- 72 position/cask/age combinations, each showing all three models, matched numerical controls.
- Pending position edits followed by cask/age changes remain synchronized. Report, curve, game and LAB links resolve.
- Zero Storage calls and an unchanged save sentinel. No horizontal page overflow, controls at least 44 px, still/gauges/stop visible together on the short phone viewport. Report tables scroll inside their own containers.
- Node/Chromium transcendental calculations differ around 6e-16; cross-engine diagnostic comparisons use 1e-12, without weakening or changing the main replay validator.

## Review and limits

Implementation, independent tests, numerical analysis, browser checks, and independent source review had separate owners. A minor pending-position display mismatch found in review was fixed and browser-tested; no blocking findings remain.

B's passive composition retention is an experimental hypothesis, not chemical validation or recognition by the existing scalar economy. Scalar aroma saturation, A's wider special-order eligibility and late-yield financial advantages remain adoption questions. Two strength gauges cannot fully communicate composition; the phrase and optional mixture table preserve that difference.

Physical iPhone Safari, cross-runtime bit-exact experimental replay, and human motivation to stop/retry are UNVERIFIED. Automatic/overall `VERIFIED` is not claimed. A Staging merge is not adoption of a model or Production approval.
