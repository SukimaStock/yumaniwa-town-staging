# Native Start audio recovery — 2026-10-15

Current audit/Plan base: `172029ccde101f590ff261fb23efdf62d16595ce` (robust Engine tri-state compatibility fix #385 merged).

The native Start button calls `beginMusic(event)` directly, outside SSE's canvas/key user-gesture route. Although its existing guard checks trust, visibility, lifecycle and sound setting, it did not explicitly unlock audio before requesting playback. Internal Engine music requests correctly remain non-gesture, so a lifecycle resume stalled by autoplay policy could stay pending after clicking Start.

Minimal repair: call the existing public `SSE.audio.unlock()` immediately after that guard, before `resumeMusic` / `playMusic`. No Engine, physics, visuals, input mapping, saved key or Production changes.

Regression evidence uses the existing full PUMPOKO app harness and actual Engine, with controlled native AudioContext/media promises:

1. Start the same BGM normally, hide and return, leave the first lifecycle context resume pending.
2. Emit native trusted Start directly without SSE's canvas/key input path: a second context request succeeds, the same BGM player resumes exactly once.
3. Settle the old pending request and repeat Start: neither duplicates playback.
4. Synthetic, hidden, paused and muted Start do not invoke unlock or advance playback.
5. A fresh exact-base comparison permits only this one added runtime line. The earlier review-runtime inverse-diff guard removes that same explicit authorized line before its existing comparison; every prior byte invariant remains enforced.

Before repair on the merged #385 Engine, the trusted Start test fails (one resume rather than two), while all four rejection cases pass. After repair:

```
node --test works/pumpoko/tests/start-audio.test.cjs works/pumpoko/tests/review-runtime.test.cjs
```

9/9 pass: 6 Start cases plus 3 prior review regressions, including all 20 current gap far banks and silent sound-button state. This is controlled integration evidence, not physical Safari audio renderer verification. Physical iPhone/iPad/Safari remain UNVERIFIED. Original historical byte-guard failures described in REVIEW-20261015.md are not claimed repaired or green by this change.
