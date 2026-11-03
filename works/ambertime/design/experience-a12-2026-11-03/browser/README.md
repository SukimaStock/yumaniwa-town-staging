# A1-2 natural-time browser verification

`node works/ambertime/tests/a1-browser-completion.mjs` remains the established entrypoint and imports `a1-2-browser-completion.mjs`. No fake clock or performance override is used. Real pointer stop follows a lawful collecting fixture. All 40 cases passed with zero page errors, and product source hashes at start/end match.

## Coverage

- Chromium 140 / WebKit 26.5 ×360×568,375×620,390×680,430×740, DPR1/2/3, normal/reduced:16 cases.
- Twelve lifecycle/boundary cases per engine: hidden, pagehide, room, modal, reload, reset, mid-reduce, save conflict, repeated stop clicks, font loss, context-loss predicate, stopped RAF. Hidden/pagehide/storage/context/RAF boundaries are synthetic, not OS or physical device observations.
- Every normal stage has exactly4 changed native world cells and zero changes outside the8-cell rim path; suppressed-paint comparison preserves controls DOM, hit regions, focus and ARIA. Main Canvas submissions and external RAF opportunities are recorded separately. Saved bytes/formal result match the public model; reset intentionally creates a new game.
- Existing A1 fixed250/300/400ms two-cell expectations are superseded by the authorized350ms four-cell/three-stage behavior. Original A1 artifacts remain unchanged. Every original viewport/save/cancel/callback/pixel protection is retained or extended; fixed phase injection is replaced by natural three-stage observation.

## Measured timings

|Engine|Width|Finish ms|Glint Canvas submissions|Glint external RAF opportunities|Modal open ms|First modal RAF opportunity ms|
|---|---:|---:|---:|---:|---:|---:|
|chromium|360|394.0|5|12|420.1|422.8|
|chromium|375|419.6|5|13|444.0|447.8|
|chromium|390|382.4|5|12|417.8|429.6|
|chromium|430|406.5|5|12|444.2|449.4|
|webkit|360|387.0|5|11|405.0|463.0|
|webkit|375|403.0|3|3|465.0|542.0|
|webkit|390|480.0|3|3|507.0|635.0|
|webkit|430|450.0|5|6|483.0|587.0|

Timings include shared-host scheduling and synchronous render costs. A destination Canvas submission or an external RAF opportunity is evidence of browser drawing opportunity, not proof of physical screen presentation. Every normal case has all three submitted stages before finish/open. Each stage is held for its minimum span; late scheduling can extend the350ms nominal design within the bounded fallback.

PNG labels: settled=first non-sliding frame, light-1/2/3=actual destination Canvas stages, light-off=glint cleared, modal=full-page transition. Representative375px normal frames are saved per engine.

## Diagnostics retained

- `initial-source-change-results.json` / log:40 functional cases passed but final source-stability guard rejected the run because product code changed while running. These measurements are not final exact-source evidence.
- `reduced-render-load-diagnostic.json` / log:initial stable-source harness required modal-open less than150ms after arm even in reduced mode. Shared-host synchronous render exceeded that arbitrary bound; no animation was accepted and no completion callback ran. The guard was replaced with direct no-wait semantics: accepted=false, no active completion frame, no finish/callback, immediate normal render path event ordering. No old assertion or pixel threshold was relaxed.

Physical iPhone Safari visibility/feel, physical display presentation, VoiceOver, real OS background and real BFCache remain unverified.
