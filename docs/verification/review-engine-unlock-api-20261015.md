# Engine public unlock API compatibility — 2026-10-15

Base: `af98f9d7d5dd74d77fc6aa12685ef53b70bf6cc4` (Staging main after PR #383).

[PR #381 P1 review](https://github.com/SukimaStock/yumaniwa-town-staging/pull/381#discussion_r4281565845) identified a valid compatibility regression in its optional gesture parameter. The public `SSE.audio.unlock()` no-argument API is explicitly called inside native click handlers (`works/engine-canary/app.js`, `works/ametsugi/app.mjs`), which bypass `SSE.input.userGesture`. A pending non-gesture lifecycle resume remained stuck despite a valid control click.

Restore the public no-argument gesture default. All three Engine-internal callers (`play`, `playMusic`, `resumeMusic`) now explicitly pass `false`, preserving automatic-work polling coalescing and later trusted recovery. No caller work, stored data, controls or audio settings change. First-unlock media activation remains unchanged.

## Reproduction and repair

Two new permanent tests failed before repair: direct no-argument unlock after pending lifecycle resume made only one native resume call (expected two); direct unlock after failed lifecycle plus programmatic retry made only two calls (expected three).

The first minimal runtime repair (default true + three explicit internal false arguments) passed both new cases and all earlier regressions. No second correction was needed.

## Verification

`node --test tests/test-engine-audio-lifecycle.cjs tests/test-engine-audio-assets.cjs tests/test-engine-diagnostics.cjs tests/test-engine-input-boot.cjs`: **153/153 PASS** (33 lifecycle).

`python tests/test_engine_canary.py`: **3/3 PASS**.

`node --check engine/sukimastock-engine.v0.3.0.js`: **PASS**.

The actual Engine executes in deterministic VM fixtures. Cases preserve media identity, position, loop and rate; trusted/untrusted input; explicit cancellation; pending-media coalescing; stale native promises; real CoffeeFactory lifecycle/update callbacks; and no-argument public controls without the Engine input adapter. Scope/Risk/Impact and CI results are pinned to the PR's reachable implementation HEAD. An independent reviewer checks the stable patch.

**UNVERIFIED:** native Safari/iPhone/iPad audio rendering and actual activation policy. Local optional Playwright test cannot launch because the Chromium executable is not installed; this is not counted as PASS.

Rollback: revert only this follow-up. No migration or human design decision is required. Production is untouched.
