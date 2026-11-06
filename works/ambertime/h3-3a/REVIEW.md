# H3-3A independent review

Reviewed by agents separate from the reviewed implementation roles; root integrated findings.

## Findings resolved

1. **Speculative fill was observed as a real operation.** The fill-choice rendering calls the native fill function to test affordability. It now uses `nativeModel.fillBarrel`, outside the observed namespace. The actual fill commit still uses the observed model. A real native-state test verifies both probes leave the collector/game unchanged.
2. **Preparation exception after a committed generation notice.** `showGeneration` previously restored only its earlier game reference if recall preparation failed after notice saving. Its catch now uses existing `saveFailure`, restoring the complete committed session, clearing preview and stopping progress. A VM test extracts the actual application functions and reproduces that exact failure boundary.

Each issue required one implementation correction; regression tests pass. No test expectation was changed to conceal a game/selection mismatch.

## Collector / save independent review

The reviewer inspected files they did not implement: collector, operation adapter, development-save and shop-app. Candidate copies, stale boundary/input digest rejection, frozen payload checksums, pin cleanup, commit-after-write/readback, failed readback persistence uncertainty, source references, S4 provenance and direct frozen-scene readout were checked.

Three corruption probes (batch-start month, cask type, unexpected root property) are rejected by the collector integrity marker. The marker is accidental-corruption detection, not an authentication signature. The official native reader remains authoritative for the game.

The independent collector/save/operation test run passed 14 tests, with no failures/skips. The application issue regressions passed two tests, with no failures/skips.

## Limits

Real Chromium could not launch due socket restrictions. The independent review is not real-browser validation. Full collector cloning, prefix comparison and integrity calculation are measured by the actual production `advanceRecall` in the long-run harness; observer-only research timings are not substituted.
