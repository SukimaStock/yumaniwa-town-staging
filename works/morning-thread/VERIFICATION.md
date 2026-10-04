# Morning Thread — paper and thread phase

Formal verificationState: **UNVERIFIED** under CHANGE-VERIFICATION.md's current closure boundary. The observations below are local automated browser observations; physical-device Human Attestation and production Release Complete are not claimed.

## Baseline and protected sources

- Repository: SukimaStock/yumaniwa-town-staging; base `712fb6369f2bc423fbb695a6ab507bc536ef6ba8`.
- Previous Phase 1: merged PR #147, staging merge `98f249ec20abcdedf172719dd5b5d5995f3d2c0f`. No Morning Thread / Engine / starter changes between that merge and this base. Open PR #140 is unrelated PUMPOKO; morning branches were `feat/morning-thread` and `feat/morning-thread-touch`, with no open Morning Thread PR.
- Read-only production/main at start: `db4b91a01890e78cfed66a92169dfebc380c6a97`.
- Canonical Engine 0.3.0 blob `1bc5b86b6098ab26ba19fc236ab8f8bae0256f48`; Codea 1.0.0 blob `d618a94bc19ab2215f52ab227e6dfeb31b64c714`; starter sketch blob `259afee19dfe8f8fb828841ee7280b07de3d8ff3`. All unchanged.
- `model.js` / `work-config.js` unchanged. No new Chapter, route rule, time condition, event, storage contract, asset or shared runtime.
- Plan locked before implementation: `.change-plans/morning-thread-paper-gestures/r0.lock.json`, digest `b2410e0cbeb36251737638d974d663f47121fcc317e6b59fdb5a1a1e03a445d1`.
- Exact published head and gate / CI evidence are recorded in the Draft PR body. This file cannot contain its own enclosing commit hash.

## Source references

Read the originals in the Google Drive SukimaStock folder: 「ひねる、積む、なぞる。触れるらくがきの話」, 「ゲーム未満、アプリ未満の心地よさ」, RakugakiEngine.codea (Main.lua), Calendar.txt (Diorama Room swipe/tilt), PocketLeather.txt, ClockworkGarden.txt, Tap master.txt and AmberTime.txt.

Applied ideas: input ownership and a target that follows the finger (Rakugaki); held-object state and cancellation (PocketLeather); continuous input leaves a visible result (ClockworkGarden and the tracing essay); soft settling after release (Calendar / Tap Master); a short punctuation before an outcome (essay / AmberTime). No assets/code copied, no tilt permission or parallax workload added. The morning map and palette remain the work's own.

## Implementation boundaries

- **Canvas/sketch:** existing miniature map plus shop replies; paper, card shadows/press/lift, thread curves, preview, magnet, tension, departure tail and stamp. `paper-board.js` owns the visual state only; `sketch.js` adapts completed operations to existing M.add/remove/move/start APIs.
- **DOM:** title/result/record, goal and clock, retained shop/card note, sound/settings, live announcements; transparent accessible projections of physical objects; a secondary tap/keyboard operation memo. No primary add/close/reorder/delete/START command toolbar during play.
- **Visual vs game state:** cards on paper can remain loose without entering the route. Acquisition, free position, preview order, paper height, thread lag and animation time are independent of the integer-minute game model. Route mutations occur on an accepted drop or equivalent tap/keyboard command. Future connections are not graded as a completed route.
- **Notebook:** CLOSED leaves 58px plus bottom safe area; PEEK exposes a portion of the itinerary; OPEN exposes the planning paper while the upper mall/clock remain present. Paper-edge tap cycles PEEK→OPEN→PEEK→CLOSED→PEEK. Drag follows the finger; release chooses the nearest stop with a bounded 90ms velocity projection for a fresh flick. A stale held release uses position. Cancellation restores the previous stop. No bounce.
- **Hit testing:** viewport CSS coordinates; map rectangles align with the unchanged sketch layout; paper header, slip, card, origin, knot and thread-tail hit regions. Cards >=54px high, paper/tail/knot >=44px targets. 2-column serpentine paper, 4 columns on short wide screens; desktop paper width capped at 620px.
- **Cards and snap:** 7px drag threshold; a slip carried near paper lifts it to OPEN. A card centre approaches the seam below another card. Preview within 64px; attraction within the final 24px; drop commits only within 30px. Preview targets use committed order, not yielding positions, so the target cannot chase its own animation. Loose cards can also be joined. Neighbours move toward preview slots; release settles from the held position. A connected card dropped away from a seam stays at that paper position without changing itinerary order; its position follows the paper. A new connection/reorder normalizes the visual slots. Direct card tap retains its information memo.
- **Thread:** cubic Bezier, 70ms punctuation + 200ms partial-curve growth via de Casteljau. Endpoints follow cards; control points use a 90ms exponential visual trail. Unknown/unavailable connections sag/dash in morning colours. No traffic-light grading.
- **Disconnect:** pull a connected card above the paper header, more than 95px from its resting position; hold tension for >=140ms and release. Short/fast accidental pulls do not cut it. The loose card remains for reconnection. A selected knot also offers a tap/keyboard equivalent.
- **Departure:** pull the small thread-end wooden tab >=44px right, or tap it. After 80ms, existing M.start commits once; a displayed START/RESUME stamp is retained separately from model records and the paper returns to PEEK. No pending departure survives RESET.
- **Pointer:** one primary pointer, pointer capture, touch-action:none on the object surface. Cancel/lost capture/Escape/blur/resize restores without committing an incomplete drag; secondary fingers cannot steal the held object. Settings remain above the gesture surface.
- **Fallback:** slip tap→paper origin/card tap connects; card selection→knot tap disconnects; tail tap departs. Transparent native buttons project the same objects for Enter/Space and screen readers. Operation memo retains inspect/add/forward/back/disconnect/start/reset, including acquired notes; no drag required. Main settings have 44px targets.
- **Reduced Motion:** same state changes, selection border, positions, thread order and stamp; immediate paper/card settling, complete thread, no shop wobble or ambient animation. No large spring/parallax.
- **Sound:** existing explicit ON/OFF maintained; short quiet falling tones at pickup/snap/unravel/paper/departure using canonical audio baseline at 0.5 UI reference. Audible hardware character remains unconfirmed.

## Mechanical and browser observations

- Model + paper unit tests: **22/22**. Existing model 15 tests cover waits, exact deadline, missed departure, pleasant event link, duplicate/current/unknown nodes, failure recovery, paused clock and identical 30/60/120fps records. New paper 7 tests cover loose acquisition, preview/commit boundary, stable targets, loose-card connection, tap/drag/flick/cancel, tension hold, RESET/pending departure and visual settling at 30/60/120fps (<0.05px final difference), plus connected free placement without itinerary mutation.
- Staging common Node tests `node --test tests/test-*.cjs`: **390/390**.
- Staging common Python tests `python3 -B -m unittest discover -s tests -p 'test_*.py'`: **62/62**.
- Scope→Risk→Impact, syntax, immutable Plan, diff whitespace and trusted base static checks: see exact-head evidence in PR.
- Real headless Chromium 153, 390×844 mobile/touch at DPR2: start→paper repeated taps/drag/flick→shop→grasp slip→carry to paper→proximity preview/snap→drag reorder→tension cut→reconnect→pull departure→home success 08:16→mall event at 08:41 (wait observed frozen)→resume→success 08:47. Flower route succeeds 08:48; cancelled lift fails 08:44 and direct recovery arrives 08:50. Results/records/RESET/reload checked.
- Actual CDP touch drag, touchCancel, multi-touch cancellation and mouse drag; keyboard Enter and tap-only surface connection/disconnection; fallback reorder/remove and duplicate-add disabled; sound ON context running, then OFF retained through RESET. Current-place slips are rejected by the original model before any loose target is added; the fallback add control is disabled for that place. This boundary is exercised after the bakery event. No game-state injection in browser tests.
- 320×568, 390×844, 844×390, 1280×800: document size exactly viewport, no horizontal/page overflow, edge canvas pixels `[243,238,227,255]`, paper inside viewport, >=44px paper handle. Seven pending cards fit OPEN at 320×568. Generated screenshots visually inspected. Safe-area CSS and measured bottom inset feed geometry; Chromium's inset is zero, not evidence of physical Safari's nonzero inset.
- Final Chromium report: diagnostics info/warn/error **0/0/0**, Engine health `healthy`; page errors **0**, external runtime requests **0**. During a real held-card drag, RAF sample **133 frames**, mean **16.665ms**, p95 **16.7ms**, max **16.8ms** (~60fps). Engine 120-frame window: effective average **59.03fps**, update mean **0.126ms**, draw mean **0.356ms**, total work max **1.2ms**, frame p95 **17.2ms**, max **32.1ms**, two isolated recent slow frames (work **0.5–0.7ms**). Lifetime at that sample included **14 slow frames / 816 rendered**. No sustained drag jank observed; the occasional Engine render skip is reported rather than hidden. This is headless Chromium on this runner, not an iPhone benchmark.
- Release Validator `--env staging --ids morning-thread`: 45 PASS / 1 FAIL / 2 WARNING / 2 EXTERNAL_CHECK_REQUIRED, **identical on the untouched base**. FAIL `metadata.identity` because Morning Thread is not registered in WORKS. Metadata registration / publication set are outside this work-only phase and untouched. This is not Release Complete.

## Remaining unconfirmed

Physical iPhone Safari, Safari bottom chrome transitions, nonzero hardware safe-area inset, VoiceOver reading order and audible device mix; actual 30/120Hz hardware. Local headless browser and unit tests do not certify those. Draft only: no merge/deploy/production change or observation of this new phase at the staging Pages URL.

## Next event integration point

Existing bakery event and pause/resume remain intact. The renderer derives sag/unravelling from current model edge/event state; `board.sheet(2)` opens the same paper when the model enters event/failed. Future event presentation can use that visual seam and thread trail without changing the route clock or adding a second event model. No events added here.

Rollback: revert the isolated work implementation and its Plan commit.
