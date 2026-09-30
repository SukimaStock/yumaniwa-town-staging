# Engine 0.3.0 Phase 1 validation

Baseline: staging `f99978bb6699967798556d2cc30675ab3d34a73f`.
Current main equalled the design baseline at implementation start; no related delta required adaptation.

## Automated

`node --test tests/test-engine-input-boot.cjs`

28 Node mock tests passed: single/duplicate/reentrant/different-canvas start, setup/context/RAF/registration failures, terminal failure and owned-resource cleanup, duplicate scripts, one RAF/listener set, tabindex/focus requests, editable controls/composed paths/keyup, held/pressed/repeat, residual repeat, primary pointer, native cancel/lost capture, blur/pagehide/hidden cancellation order, raw/capture cleanup, audio gesture filtering, starter snapshot equality, and unchanged Phase 2/3 subsystem source.

Node mocks verify listener/focus/capture requests and ordering, not native browser behavior or autoplay permission.

Scope Guard, Risk Gate and Impact Check are run against the locked Phase 1 paths. The lock is the first branch commit and is not modified after implementation starts. These checks are scope/contract evidence, not final VERIFIED certification.

## Browser attempt

`node tests/test-engine-input-boot-browser.cjs`

UNVERIFIED: the environment has Playwright but no installed Chromium executable. Browser launch failed. Installing Chromium headless shell also failed because the download was not a valid ZIP. No browser test is reported as passing.

The committed runner/fixture is ready for an environment with Playwright and Chromium. It covers actual DOM focus/editing, key repeat, editable keyup, pointer capture/up, duplicate start, starter boot and isolated ORBIT old-adapter/new-Engine boot. The runner itself remains unverified until executed with a browser. ORBIT's entry is never rewritten.

## Remaining manual checks (UNVERIFIED)

1. iPhone Safari: touch, editing controls, gesture audio and background/foreground recovery.
2. Real keyboard: held/repeat, editor focus/keyup, blur and re-entry.
3. Real pointer interruption/capture loss and multitouch; no duplicate cancel or stuck drag.
4. Actual BFCache back/forward navigation; one loop and usable input after restore.
5. Nested iframe focus and Masala/ORBIT reference behavior. No full gameplay/audio migration claim.

## Preserved boundaries

v0.2.0 and all five named existing work directories remain unchanged. Masala local Audio is not merged or swapped. Scene/Storage/Audio readiness/Assets/bridge/diagnostic reporting are not redesigned. Production remains outside the change.

At the baseline/current main, work-ready.js still contains the legacy embedUrl-first retry expression: unresolved, outside this PR.
