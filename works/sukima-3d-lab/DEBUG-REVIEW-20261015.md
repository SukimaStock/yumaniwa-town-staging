# Touch Lab combined debug review — 2026-10-15

Source review: [PR #295 / discussion_r4248932992](https://github.com/SukimaStock/yumaniwa-town-staging/pull/295#discussion_r4248932992).
Audit base: `b00d1161ffc3ffa1e653f3a448ea8f7decc24fd2` (Staging main at start).

## Finding and scope

**要修正 → implementation and behavioral regression complete.** The current
`app.js` assigned `debug` once for Motion, then replaced that object with the
Manipulation panel. Both independently appended `.debug` elements used the same
absolute right/bottom coordinates. This remains relevant to a supported specimen
with the two behaviors on different rigid parts, even though most gallery
specimens use only one capability.

The existing panel creation now has one updater that visits every active panel.
A debug-only flex stack gives panels separate normal-flow boxes inside a bounded,
scrollable area. Gallery definitions, geometry, rendering, input, normal exhibit
controls, behavior schema, source saves and common Engine are unchanged.

Final implementation base: `a502d437c92b4595227c1dcbfe23a542c9acb13e`.
The reviewed implementation was transplanted after a fresh committed Plan Lock.
Normal entry app/CSS and the changed debug module use `debug-20261015` URL
queries, preventing a new named export from being requested from cached old
debug source. Unchanged engine URLs stay at 0.7.1; the cache graph regression
checks both the normal entry and combined fixture.

## Reproduction and checks

- `node --test works/sukima-3d-lab/tests/combined-debug.test.mjs` — 2/2 pass.
  A real `SpecimenSession` selects the existing door definition with a test-only
  Motion spin on `lintel` and the unchanged hinge on `door-leaf`. Real panel
  factories run with a small DOM stub; both outputs refresh after a session step
  and manipulation, Motion pause updates immediately and stops its time, reset
  restores both states, and clear/recreation creates exactly two outputs.
- `node --test works/sukima-3d-lab/tests/*.test.mjs` — 649/649 pass, including
  immutable source/geometry/preview/Motion baselines, all 300 registered models,
  existing pointer behavior, lifecycle and cache graph tests.
- Initial test expectation used a 0.5-second clock increase from one call; the
  existing Motion player intentionally caps one step at 0.05 seconds. Corrected
  the test expectation to its current contract; no runtime timing change.

The executable browser fixture is
`works/sukima-3d-lab/tests/combined-debug-fixture.html`. Serve the repository,
open this page, and inspect both panels while using pause/play, manipulate,
reset and reopen. At desktop, portrait (390×844) and landscape (844×390), verify
separate panel bounds and scroll access to the lower panel. It deliberately
uses the same panel factory and stylesheet as the app, with no gallery entry.

## Unverified

No real browser layout or GPU result is claimed. Local Playwright has no browser
binary; installation returned an empty/truncated download. The DOM-stub test is
behavioral evidence, not a browser layout measurement. Browser layout confirmation
and physical Safari/iPhone/iPad touch feel remain UNVERIFIED. The fixture makes
that missing check reproducible without changing normal exhibition content.

Production is excluded. Scope/Risk/Impact and CI results belong to the final PR
head; merge/publication are not established by this file.
