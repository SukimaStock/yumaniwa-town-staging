# Engine PR #168 review revalidation — 2026-10-15

Base: `b00d1161ffc3ffa1e653f3a448ea8f7decc24fd2` (current Staging main at investigation).
Scope: shared canonical Engine and its existing deterministic lifecycle suite. No Production/work/source-data changes.

## Findings and result

- [P1 review](https://github.com/SukimaStock/yumaniwa-town-staging/pull/168#discussion_r4207684503): **repair required**, reproduced before fix. Lifecycle `resumeContext()` left its native pending resume non-retryable. All non-gesture context resumes are now retryable from trusted Engine input. Pending media requests are rebound only when they await an obsolete context promise.
- [P2 review](https://github.com/SukimaStock/yumaniwa-town-staging/pull/168#discussion_r4207684515): **repair required**, reproduced before fix. `resumeFromLifecycle()` discarded track intent before output recovery. The existing set now survives rejection/throw/still-suspended results until successful media playback. Explicit mute/pause/stop/reconfigure still clear it.

The reproduction added four initially failing cases (pending native recovery and three failed context recovery modes) to the existing suite. No new player, music rewind, loop/rate change, stored data, public work requirement or background retry loop is introduced. Optional internal gesture indication separates trusted Engine input from work update calls to `playMusic`/`resumeMusic`, which also call `unlock`.

## Repair attempts

1. Retry non-gesture resumes and retain intent. New reproductions passed; existing real CoffeeFactory/update coalescing exposed programmatic `unlock()` being treated as new activation.
2. Restrict replacement retries to trusted Engine gestures. Existing suites passed. Added pending-media repeated-gesture regression exposed cancellation of an already running media request.
3. Track each player's context-wait promise, clear it before starting media, and cancel only waits on an obsolete context promise. All 150 relevant tests passed, including the newly added pending-media case. Independent review then found a separate missing case: a programmatic request after a failed lifecycle recovery was still marked as activation. Passing the actual optional gesture indication to `resumeContext` fixes this; a new regression proves a later trusted gesture replaces that pending request. Final relevant suite: 151/151 PASS.

## Validation

`node --test tests/test-engine-audio-lifecycle.cjs tests/test-engine-audio-assets.cjs tests/test-engine-diagnostics.cjs tests/test-engine-input-boot.cjs`: **151/151 PASS** (31 lifecycle).

The lifecycle harness executes the actual Engine in a VM with controlled native resume/suspend and media clocks. Cases include trusted/untrusted gestures; suspended/interrupted/pending/rejected/thrown resumes; failed recovery followed only by a gesture; late obsolete promise completion; repeated gestures during pending media; hide during recovery; mute/pause/stop/reconfiguration; BFCache/visibility ordering; media identity, playback position/rate/loop; fallback without AudioContext; no SE replay; the real CoffeeFactory lifecycle/update callback.

Syntax, Scope, Risk and Impact gates run against the committed implementation SHA and are also reported in the PR. The Plan Lock was committed before any Engine/test implementation.

**UNVERIFIED:** physical iPhone/iPad and native Safari audio rendering, actual autoplay policy and sound. Deterministic mock coverage does not certify these. No author-facing feel/design choice is required by this fix.

Rollback: revert this PR; no state migration or data repair is necessary.
