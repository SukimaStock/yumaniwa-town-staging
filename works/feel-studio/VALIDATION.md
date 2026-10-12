# Feel Studio 0.1 — validation

Date: 2026-10-12. Staging only. Base: bf80954d54deed9a5b7a0756d4d8ff3f5ee2d7f4.
Plan-first commit: 0fbe81f64c9e4fd84f55ac6995a1b83a5c5f759b.
Locked plan digest: 447b9a8529ab904807addbc6940d999168af25e366a7c545863cf288c9171c0c.

## Executed

The exact CommonJS modules and the tracked tests/verify.cjs verification function were evaluated in the available V8 JavaScript tool runtime, with the unchanged Motion Lab Runner loaded from the base SHA. 26 scenarios passed, 0 failed. No shell, Node executable, real browser controller or physical device was exposed in this session. The test entrypoint is also executable with Node using the command in README.

- Three distinct paths under identical 480 recorded frames: final x = A 677.24, B 499.54, C 544.91.
- The same drop rebounds 9.39 pixels with soft collision, 226.62 with elastic, 0 with dead.
- On the same flat contact, horizontal speed 100 falls after half a second to coast 83.95, viscous 9.07, dry 0.
- B drive + B bounce + A stop creates a running M child and differs from pure B.
- Terrain and force edits change actual physics. Handle constraints and fast contact tests pass.
- Exact replay is deterministic; 30/60fps through the original Runner reach the same 120Hz state.
- A2/A3 preserve parent snapshots. Unsaved drafts, restore, undo, adoption and keep work.
- JSON roundtrip/merge preserve previous snapshots; bad versions/terrain/input/source/IDs and cyclic histories are rejected before mutation.
- Quota failure retains memory state; corrupt persisted data is not overwritten.
- Simulated touch routing edits terrain and clears input on cancellation/resize/visibility with the original Runner.
- A DOM/Canvas harness runs real app handlers for tabs/edit/save/compose/adopt, notes, clipboard/fallback, import and download.
- Registry accepts another adapter without modifying Studio or shared Engine.
- Existing LAB generator evaluated with source files and tree-backed filesystem adapters: baseline output matched lab/index.html byte for byte before adding the entry.
- V8 parses changed JS/CJS; trusted GitHub candidate syntax and scope/risk/impact checks are separate evidence in the PR.

## Source fingerprints (SHA256 UTF-8)

- works/feel-studio/registry.js: 07f276bdd6cf7ac2a2f63b039724bdb0cf35b61601e737983864ddacab7c1fb5
- works/feel-studio/disc.js: 3c13b1b876ef99dd266ad9259015ba9c11edf13dbf252a55699dba0816c59024
- works/feel-studio/session.js: b40e1b9287a3cf41ce38b630fc8461ff61e8a1ff585dc8b94f30cec888526525
- works/feel-studio/bench.js: 94e083d5e7046728d9e580a521a0d98850c8587fc765a7fb2cb0969d8cba997f
- works/feel-studio/app.js: 468c30eec027be032fea108ba8ec7c377cc3c21b950b7daa901bd5310e348214
- works/feel-studio/tests/verify.cjs: 9b0d74ccaf685bffc7fc0d5e646d8484dde98c028651520474d517f08413d13b

## Not verified

Actual rendered layout in a real browser; physical iPhone/iPad Safari pointer feel, performance, safe areas, share/download permission behavior, storage persistence and browser lifecycle; screenshot review. Harness events and Canvas method calls are not browser or device evidence. Author adoption remains undecided.

## Remaining release evidence

PR checks, merged SHA and Pages deployment are recorded in the PR and completion report after they occur. No claim that they already passed is embedded here.

## Suggested 0.2

Use this desk on an iPhone first, then refine handles/force mapping and consider simultaneous A/B views. Add another small adapter. Keep arbitrary mechanic synthesis explicit.
