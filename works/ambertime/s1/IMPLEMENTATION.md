# S1 fixed warehouse slots — Draft checkpoint

The four labels identify warehouse positions, not lifetime cask serials. `cask-slots.mjs` stores four internal IDs/nulls, retains every surviving assignment, releases departed IDs, and places new casks in the lowest free position. Canvas and accessible rack use the same slot coordinates; actions still send the original internal ID.

Session v4 adds only `caskSlots` outside the unchanged compact formal game. A candidate reconciles slots before encoding, writes the entire session conditionally, and publishes game/slots together only after successful write/readback. Rollback restores both. No second storage key, replay operation or checkpoint was introduced. V4 requires an exact one-to-one correspondence with the live casks; malformed/future data stops without repairing or overwriting it.

V2/v3 readers assign current casks in `filledMonth`/ID order. Reading does not overwrite the source: the existing backup export plus exact file confirmation gate now applies to v3→v4 as well. Import/export carry explicit current slots, including holes. Capacity and all formal operation validation remain model-owned.

The production app no longer imports the serial resolver, its history projection or cache. `cask-serials.mjs` remains solely for existing historical research/tests. Formal save validation and other history projections are unchanged. Past source/recipe/release labels use production month or release provenance, never a reusable current slot.

`model.mjs`, `partner-orders.mjs`, `save-codec.mjs` and all history/chronicle sources remain byte-identical to the baseline. Exact inverse fixtures preserve historical source oracles: old B2 reader/writer evidence describes the old implementation only, not v4. New S1 tests independently cover the changed slot/session behavior.

## Incomplete acceptance

Chromium execution failed before page load and execution-policy escalation was rejected. No measured before/after 100-year timing or actual browser QA is claimed (see PERFORMANCE.md). Keep this PR Draft; do not merge to Staging or promote to Production until browser behavior, sequential performance, CI and remaining regressions are resolved.

On iPhone Safari verify 4 positions at narrow width; remove slot 2 and refill it; verify 1/3/4 do not move; partial bottling/automatic removal; tasting and staff actions retain their selected cask; reload and cold reopen preserve holes; v2/v3 backup confirmation and interrupted migration preserve the original; capacity/conflict failures preserve game and slots together. Safari has not been tested on a physical device.

## Local test checkpoint

- S1 slot/session suite: 11/11 pass, including real fill/capacity rejection, partial/full bottling, slot reuse, automatic monthly bottling removal, exact paired formal state/RNG and cold restoration.
- Codec/save/app/Canvas focused suites: 37/37 pass.
- Adapted affected source/VM regression group: 94/95 pass; A1 immutable historical pin fails identically on baseline. Separate Canvas/R4/cache group: 22/22 pass.
- Baseline `d521c3a` targeted check: 40/43 pass; inherited A1/R4/R5 historical source pins fail. These oracles are not relabeled or weakened. This Draft does not claim a completely green broad suite.
- Syntax checks and diff whitespace checks pass. Browser tests and all 100-year comparison metrics remain unverified.
