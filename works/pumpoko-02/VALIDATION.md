# PUMPOKO 02 — current validation

The original #178 route and artwork comparison record has been superseded by the 2026-10-09 original-PUMPOKO integration. Current design, protection, scope conflict and device drill: [INTEGRATION.md](INTEGRATION.md).

- Current physical kernel (`physics.js`, `world.js`) is unchanged. Course geometry, fruit palette, title, presentation camera and music integration are deliberately adapted.
- Integration tests: 12 distinct cases passed (11-case full suite, then the strengthened repeated-play case and new primary-touch case; the physical/runtime implementation is identical). Native Canvas, canonical Engine/Codea, DOM/media doubles. Native 390×844 / 1180×820 / 844×390 renders passed; these are not real browser layouts.
- Existing Lab + original PUMPOKO ending/audio + Engine input/audio lifecycle + work lifecycle + World Consistency regression: 196 tests, 196 passed.
- Scope→Risk→Impact, immutable work-local Plan digest, JavaScript syntax and Git whitespace checks passed.
- Native visual inspection covers title, opening, both cellar layers, all four exchanges, final pair, zoom return and replay. Initial native test attempts exhausted memory; the renderer now rasterizes periodically so deferred native commands do not accumulate. Those failed verification attempts are not counted as successes.
- Arrival release probes after 0/2/10/30 seconds of continued input all reach ending and return under unchanged constants.
- Local Playwright is unavailable because Chromium is not installed. Actual iPhone/iPad/Safari, CSS orientation changes, audible BGM continuity, loudness and subjective touch remain **UNVERIFIED**.
- Required PR gate is blocked by the user-scoped Plan path. It accepts `.change-plans/.../r0.lock.json` only, but all authorized changes are inside this work. The reviewed implementation is provided as a draft PR; staging/main and production are unchanged until that conflict is resolved.

No test, native image or CI status establishes real-device feel or Release Complete. No production promotion is authorized.
