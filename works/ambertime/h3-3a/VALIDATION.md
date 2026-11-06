# H3-3A validation

Runtime implementation commit: `699c05c6` (full SHA in Git history).
Base: `2df1ca9db957de576fbf9fa7e29b762c83023cb3`.
Plan Lock: `.change-plans/ambertime-h3-3a/r0.lock.json`, standalone first commit `78d968a9`.

## Related tests

`node --test works/ambertime/tests/recall-*.test.mjs works/ambertime/tests/s[1-4]-*.test.mjs`

100 tests: **98 passed, 1 pre-existing failure, 1 skipped**. The skipped test is optional Chromium; enabled launch separately failed at the environment socket boundary, so no browser assertions passed.

The single failure is `s1-source-inverse.test.mjs`: its historical authorized inverse hunks no longer match current main after S3/S4. The same first-hunk failure was independently reproduced on untouched base `2df1ca9`. The inverse oracle was not rewritten.

Expanded old source-harness audit: 18 failures across six older suites occurred both on current changes and untouched main, with identical failed test names. They are not reported as passing or fixed. S2/S3/S4 active save/application and recall-save regression batch passed all 49 tests, zero skips.

Final collector/app/save rerun after internal export cleanup: 11 passed, zero failures/skips. Independent reviews and corruption probes are in REVIEW.md.

## Gates and remaining evidence

Scope → Risk → Impact passed locally against implementation HEAD. Changed JavaScript modules passed `node --check`; `git diff --check` passed. Required GitHub CI has **not run**: automatic approval review rejected pushing the explicitly requested Staging branch, including a second attempt after verifying the exact remote and Plan-only committed payload. GitHub confirms the remote branch does not exist. No alternative upload route was used.

No PR, merge, Pages deployment, or Production change occurred. Repository `verificationState` remains UNVERIFIED by its current contract. A Draft PR is required when upload becomes possible; real-browser and capacity verification remain required before merge.

Long-run numerical results and research comparison are recorded separately in measure-*.json and REPORT.md. Node timings are not Safari measurements.
