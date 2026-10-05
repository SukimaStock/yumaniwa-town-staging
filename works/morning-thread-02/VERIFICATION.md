# Verification — 2026-10-04

Scope: independent `morning-thread-02`, staging only. Not a release certification. No merge/deploy/production change, town registration, shared runtime modification or old-work edit.

## Checks

- New model test: six permutations, two successful orders, four late orders; incomplete-task failure; backtracking and reset; 30/60/120 Hz equal rule/time/history results; exponential follower position differs by less than 1e-9 after one second.
- Real headless Chromium with native CDP touch events, 390×844 and DPR 3: trace route, reverse two connections, execute, interruption, preserve 8:11 and completed coffee, reconnect, succeed at 8:19; retry and fail at 8:22; reset, touchCancel, tap alternative.
- 375×667, 430×932 and 844×390: touch connections and reset after resize. Portrait is primary; landscape fits but objects and text are smaller.
- Canvas backing store 1170×2532 at 390×844/DPR 3. Inspected plan/change/success screenshots. No document scroll after correcting the visually hidden announcement paragraph's default margin.
- No browser exceptions or external requests. All assets are procedural; no font/image loading dependencies.
- Engine report: Engine 0.3.0, morning scene, diagnostics errors 0, warnings 0 in observed normal sessions. Target 60fps; observed roughly 59fps, update about 0.006ms and draw about 0.20ms in a 120-sample window. Some slow frames occur around automation/resize; these are recorded, not claimed absent.
- Existing Morning Thread model 15/15 and paper 7/7 regression tests pass. Existing files and canonical scripts have zero diff.
- Plan Lock committed before implementation. Scope Guard → Risk Check → Impact Check declarations pass. Node parse checks and trusted PR gate are additionally checked at the candidate head.

Run from repository root:

    node works/morning-thread-02/test-model.cjs
    node works/morning-thread-02/test-browser.cjs

Browser test requires the environment's Playwright + Chromium. It creates a local server, observes the shipped app using a read-only snapshot and writes screenshots/report to /tmp. There is no alternate testing input path in the game.

## Unverified

Physical iPhone/Safari, actual 30/120Hz displays, perceived touch pleasure, one-handed comfort and deployment. Frame-rate invariance is a deterministic model simulation, not a claim of three hardware refresh-rate tests. No accessibility-equivalent keyboard playthrough exists yet. Engine diagnostics and browser automation cannot decide whether the core is fun.
