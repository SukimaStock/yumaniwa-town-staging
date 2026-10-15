# Engine unlock activation provenance — 2026-10-15

Base: `af98f9d7d5dd74d77fc6aa12685ef53b70bf6cc4` (Staging after PR #383).

PR #381's [new P1](https://github.com/SukimaStock/yumaniwa-town-staging/pull/381#discussion_r4281565845) was valid: public no-argument `unlock()` is used directly from native work controls, outside Engine input, and must retry blocked lifecycle recovery. The initial repair in unmerged PR #384 defaulted every omitted call to a gesture. Its [P1](https://github.com/SukimaStock/yumaniwa-town-staging/pull/384#discussion_r4281679954) was also valid: Morning Thread's automatic phase tone calls the same public no-argument API. That timer call must not consume the next actual gesture retry. PR #384 was closed without merging; this fresh immutable Plan precedes the replacement implementation.

## Design

Keep three provenance states using the existing resume/preparation flags:

- Explicit `true`: Engine observed trusted input. Pending trusted recovery coalesces.
- Explicit `false`: internal `play`/`playMusic`/`resumeMusic` polling. Pending recovery coalesces.
- Omitted: legacy caller with unknown activation. Attempt native resume synchronously (preserving native control callers), but keep the resulting promise gesture-retryable. An unknown call never supersedes a pending known-trusted resume.

The first-context path uses `ensureContext(gesture === true)` so even a first-ever unknown/programmatic unlock cannot claim observed activation. There is no dependency on `navigator.userActivation` or work-specific patch. Media request tokens, BGM intent, mute/pause/stop/reconfigure and no-duplicate rules remain.

## Reproduction and attempts

1. PR #384 restored public attempts with a true default. Its two public-control tests passed, but review found timer-driven legacy calls could consume activation. That PR was not merged.
2. This replacement distinguishes known/unknown activation, reusing the existing preparation flag to retain retryability. First implementation passes all cases; no further correction needed.

Seven new lifecycle cases cover direct no-argument controls, failed recovery followed by polling and direct unlock, unknown timer followed by explicit/omitted activation, unknown timer while known-trusted recovery remains pending, and first-ever unknown/programmatic unlock. The preload/initial-media case now explicitly delivers trusted Engine input before claiming gesture-driven recovery.

Against actual merged PR #381 Engine, the expanded lifecycle suite fails six cases (32 pass). Against actual unmerged PR #384 Engine, it fails four timer/initial-context cases (34 pass). Against this implementation: **158/158 relevant JS tests PASS**, including **38 lifecycle tests**.

Commands:

`node --test tests/test-engine-audio-lifecycle.cjs tests/test-engine-audio-assets.cjs tests/test-engine-diagnostics.cjs tests/test-engine-input-boot.cjs`

`python tests/test_engine_canary.py`: **3/3 PASS**.

`node --check engine/sukimastock-engine.v0.3.0.js`: **PASS**.

Scope/Risk/Impact and CI are pinned to the reachable PR implementation HEAD. Independent review examines the stable exact patch. Tests execute actual Engine code with deterministic native/media clocks; they do not prove browser audio policy.

**UNVERIFIED:** native Safari/iPhone/iPad audio, actual sound and activation. Optional local Playwright cannot launch because Chromium executable is absent. No browser success is claimed.

No work code, saved data, controls, new UI or Production changes. Rollback: revert this follow-up only; no migration. The separate PUMPOKO native Start control still needs its explicit public unlock call and is handled separately.
