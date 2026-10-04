# Phase 1: touch and viewport verification

Date: 2026-10-04
Base: `d83658a8982a0601c9b4e2dc50b5117c3b741acc`
Plan digest: `b74fc09b1402a919b67dde62f7da561910c21780a43194de2aef96e4e0da92ad`
Exact final candidate SHA and GitHub check results are recorded in the Draft PR.
Formal Change OS `verificationState` remains **UNVERIFIED**. Observed browser results below
are Chromium checks, not an attestation from physical iPhone Safari.

## Scope and design

- Current main inspected; initial Morning Thread PR #146 already merged. The only open staging PR
  at start was unrelated PUMPOKO #140; only existing Morning Thread remote branch was `feat/morning-thread`.
- Production/main baseline: `db4b91a01890e78cfed66a92169dfebc380c6a97`. Read-only comparison, no writes.
- Canonical Engine 0.3.0 blob: `1bc5b86b6098ab26ba19fc236ab8f8bae0256f48`.
  Codea 1.0.0 blob: `d618a94bc19ab2215f52ab227e6dfeb31b64c714`.
  Starter sketch blob: `259afee19dfe8f8fb828841ee7280b07de3d8ff3`.
  All are unchanged, as is `model.js` blob `fc10797101e4f626fa2759a961eafff6e90b4310`.
- Black bands came from Engine's fixed 390×844 logical viewport, centred letterboxing and
  `nightDeep` outer background. The sketch's screen-sized fill inherited the viewport clip.
- A: existing `outerBackground` and `SSE.viewport.configure` APIs now use ivory and actual
  viewport dimensions. The full-bleed canvas sits behind a 100dvh board, with safe-area
  header/footer and a notebook of at most 620px. Only the notebook scrolls. Short landscape
  screens place the notebook beside the map. No shared runtime changes or patches.
- B: shops themselves have native, labelled map hit targets, aligned with the canvas miniature.
  A press sinks the shop 1.5px; a tap opens a small ruled note slip. Discovery still goes through
  the existing model, and adding remains an explicit action. The old separate location menu is removed.
- C: paper objects depress in 80ms, lift with their shadow while held, and preview order without
  changing the route model. Adjacent papers yield in 200ms. Within 16px vertically / 34px horizontally,
  the held paper attracts to its slot over 130ms; releasing seats it over 140ms.
  Cancellation, loss of capture, Escape, blur, resize and notebook scrolling restore the pending order.
  Drag commits through existing `M.move`, and ↑/↓/× alternatives remain 44px targets.
- A single SVG thread follows both the held paper and yielding cards. New stitches extend in 200ms;
  the map's planned line also grows in 200ms. Missing links sag/dash with an explanatory note.
  The cancelled 08:44 lift stitch loosens and explicitly names the cancelled departure.
  This is known connection information, not an advance verdict on the complete itinerary.
- D: the bottom START/RESUME is a small departure stamp. It is quiet when the route is empty;
  pressing writes a display-only timestamp, then the notebook lowers and the mall runs.
  Marks are merged into the displayed chronological record, without changing model records or timing.
- Audio uses the existing Engine baseline and ON/OFF control. Pickup, magnetic entry, placement and
  stamping have short, falling tones (45ms, 65% of the existing UI reference). No music or new assets.
  Reduced Motion removes CSS/WAAPI movement and ambient motion, retaining static order/connection/state.
  No parallax was added; node response takes priority.

## Original references (Google Drive / SukimaStock)

Read the original code and article, not screenshots or copies of other games:

- [Calendar / Diorama Room](https://drive.google.com/file/d/1D3fSJIV46twv9xJzVTk255DYep9sXx-6/view): layered input targets and gentle return.
- [PocketLeather](https://drive.google.com/file/d/1pb0cp3UrRSYJ9NiVv2p9BL57n8xZTVfw/view): held-button state and release/cancel distinction.
- [ClockworkGarden](https://drive.google.com/file/d/1S0lRyA8Ahm7Ol6hERh4L4pR6grYCRMk-/view): an action leaves a continuous trace.
- [AmberTime](https://drive.google.com/file/d/1cAtwEtLj0DoMbrw7XOwI0XdcA2dopTFi/view): short input feedback / freeze mechanism.
- [ゲーム未満、アプリ未満の心地よさ](https://drive.google.com/file/d/1bJvteZ2xEwJ3dETtecmEM_HRMvgbsibB/view): the response to a small touch.

Only input-response ideas are applied; no source code, visual style or game rules are copied.

## Observed tests

- `node --test works/morning-thread/test-model.cjs`: **15/15 PASS**; the model and tests are unchanged.
  Integer-minute movement, waits, deadline ±1 minute, event stop, duplicate protection,
  success/failure recovery and identical 30/60/120fps records are preserved.
- `node --test tests/test-*.cjs`: **390/390 PASS**, including real Engine input/boot browser fixture.
  First attempt lacked Playwright's default Chromium executable; installed test-only binary path,
  then reran the complete suite successfully. No fixture/code changes to bypass checks.
- `python3 -B -m unittest discover -s tests -p 'test_*.py'`: **62/62 PASS**.
- Syntax / whitespace / immutable Plan Lock / Scope → Risk → Impact: **PASS**.
  Trusted base static syntax and exact published tree comparison are reported in the PR.
- `CHROMIUM_EXECUTABLE=/tmp/morning-chromium node works/morning-thread/test-browser.cjs`:
  **PASS**, real Chromium 153.0.8010.0 / Playwright / locally HTTP-served repository, no game-state injection.
- Home → mall → event → flower route **08:48**, escalator **08:47**, lift failure → immediate replan
  → **08:50** success. Clock stayed unchanged during the announcement's one-second wait.
- Add, duplicate disabled, remove, ↑ reorder, clear, START/RESUME, RESET and reload: **PASS**.
- Actual mouse and CDP touchscreen drag: slot snap within 3px, adjacent yielding and changing thread
  geometry observed. Touch cancellation restores the order and leaves no ghost/dialog: **PASS**.
- **320×568, 390×844, 844×390, 1280×800**: no document horizontal/vertical overflow; canvas edge
  pixels are light morning colours and viewport offsets are zero; shop hit targets ≥44px;
  departure controls stay in viewport. Screenshots inspected, including the 320px board and landscape.
- Reduced Motion: reorder still works, stitches remain visible, active animations **0**.
- Sound OFF persists through RESET; explicit ON unlocks WebAudio; switching OFF works.
- pageerror **0**, external requests **0**. Engine / Codea boot state **running**.
  Diagnostics error count **0**; health has no error-level item.
- Last headless snapshot: average FPS **56.3**, p95 frame **31.1ms**, max **32.4ms**;
  Engine update average **0.077ms**, draw average **0.125ms**, managed work max **0.6ms**.
  `slow-frames` warning remains: **19 / 461 rendered frames (4.1%)**. These figures include browser
  automation and do not measure all DOM work or establish physical-device performance.

## Unverified and Phase 2 connection points

Physical iPhone Safari, real notch/home-indicator and dynamic Safari toolbar behaviour, hardware audio
balance, subjective one-handed comfort and sustained real-device frame rate remain UNVERIFIED.
Safe-area env declarations and dynamic viewport behaviour were checked in Chromium; hardware evidence
is not substituted. No merge/deploy or production delivery is part of this Draft.

No new stage, event or rule is added. The existing `state.phase === "event"` branch still opens the
editable notebook, with the same `state.now` / pending `state.route`. Phase 2 can provide announcement
presentation there, and thread state comes from existing `M.edge` / `state.event`; `M.start` continues
RESUME from the existing place/time. Presentation marks and drag previews remain outside the model.

---

# First playable verification

Date: 2026-10-04
Base: `17bffca036eb18084bcdee672e3b32fb671ef1e2`
Plan digest: `38ab8b6ad9fe235fa0c779eb6958097c10eb51a3fa3b48e5d0584eb2a35061dc`

Formal Change OS verificationState remains `UNVERIFIED` under the repository contract.
The following are observed checks, not a production release or an iPhone attestation.
The exact candidate SHA is recorded in the Draft PR.

## Observed

- Work rules: **15/15 PASS** (`node --test works/morning-thread/test-model.cjs`).
  Waiting, scheduled departures, missed connection, duplicate/edit protection, exact deadline,
  failure recovery, partial route continuation, frozen announcement and 30/60/120fps records.
- Existing standard Node tests: **390/390 PASS** (`node --test tests/test-*.cjs`).
  Includes the existing real Chromium Engine input/boot fixture.
- Existing Python tests: **62/62 PASS** (`python3 -B -m unittest discover -s tests -p 'test_*.py'`).
- New real-browser script: **PASS**, Chromium 153.0.8010.0, Playwright, HTTP-served repository.
  Interaction uses actual DOM buttons and pointer events, without injecting game state.
- Home → mall → announcement → flower route → record: **08:48**.
- Escalator route → record: **08:47**.
- Cancelled lift → failure board → food/florist reroute → success: **08:50**.
- Add/remove/tap reorder, duplicate disabled in notebook, actual handle drag and subsequent tap: **PASS**.
- During the announcement, clock unchanged across a real one-second browser wait: **PASS**.
- Widths **320 / 390 / 844 / 1280**, portrait and landscape: no horizontal overflow; controls remain operable.
- Reload returns safely to the cover, ready to start again.
- Screenshots of title, home board, mall board, announcement and result inspected visually.
  Japanese system font was installed only in the test environment; the game has no external font dependency.
- Browser page exceptions: **0**. External requests: **0**.
- Engine **0.3.0** / Codea **1.0.0**, both running. WebAudio context running after the native sound button.
- Diagnostics: no error-level issues. The final automated run reports `slow-frames`:
  **20 frames (12.7%), p95 37.3ms, max 66.5ms**. This is a remaining headless measurement,
  not proof of iPhone performance. Browser automation includes screenshots and viewport resizing.
- Scope → Risk → Impact and diff whitespace checks: **PASS**. Trusted static syntax result is in the PR.

## Supplemental existing browser failures

The broad `tests/*.cjs` glob includes two standalone browser helpers in addition to the standard tests.
They fail identically in the candidate and an untouched detached worktree at the base SHA:

- `creation-draft-browser.cjs`: `#creation-save` exists but is not visible; 30s click timeout.
- `map-asset-browser.cjs`: fixture assumes `.git` is a directory, but a Git worktree has a `.git` file;
  `FileExistsError` while creating `.git` metadata.

These helpers and their fixtures are unmodified. Their failures are recorded, not marked PASS.

## Unverified / intentionally limited

- Physical iPhone Safari, safe-area behavior on actual hardware, interruption by an actual phone app,
  audible sound balance and subjective one-handed comfort.
- Real-device performance. Frame-independent rule tests do not establish device rendering speed.
- Town host entry/return, production delivery and install/SEO/OGP metadata. This Draft is standalone within staging.
- Journey records are session-local and return to the cover on reload; no new persistent save contract.
- No registered town work, merge, deployment, production change, canonical Engine/Codea change,
  or unrelated existing-work change.
