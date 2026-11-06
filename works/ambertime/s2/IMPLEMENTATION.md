# S2 daily notebook — Draft verification

Base: `083bd63ef2d43074350e7220785d3819ee85919b` (S1 merged main).
Plan: `.change-plans/ambertime-s2-recent-ledger/r0.lock.json`.

## Implemented contract

The normal recipe/cask notebook no longer creates or posts a full game to the cask history Worker. It reads a bounded `recentLedger` sidecar plus current formal inventory. The historical collector/Worker files remain available to existing research and their regression tests; the app does not load them. The separate history Worker and formal save replay are unchanged.

- Recent recipes: newest eight manual fills, deduplicated by batch ID. Automatic completion does not count. Saved recipes are merged for display by source cask ID and retain the existing 64-entry recipeBook limit, selection and staff APIs.
- Current casks: up to four, displayed in S1 slot order. Initial profile/source are captured at fill; current profile, tasting, care and recent cask history come from the formal state.
- Ended casks: newest eight removals in actual archive order, including same-month endings. Partial bottling leaves a cask current. Store final profile/result and last two tasting samples, release IDs and origin; no lifetime tasting/care reconstruction.
- Recipe detail no longer requires a retained cask record. An old saved recipe remains usable through the formal recipeBook. Its historical initial profile is shown only when retained, never reconstructed by guesswork.
- Recipe/cask lists have no pagination. Related release buttons retain formal release IDs and defer the unchanged release projection until the release is opened. Links to casks outside the retained notebook are omitted, while release provenance remains intact.

## Persistence and migration

Session v5 adds `recentLedger` beside the unchanged compact formal game and S1 slots, under the existing formal key. Validate the exact candidate through the official reader before the single conditional storage write. Publish game, slots and notebook together only on success; rollback uses committed state, including clock updates where the current game has already advanced. Readback, conflict, quota recovery, original export and exact backup-file confirmation remain.

V2/v3/v4 reads perform one migration replay in memory, collecting only retained facts. No write happens merely because reading succeeds. Origins contribute surviving facts only; unsupported facts remain unknown. A successful confirmed v5 save eliminates this ledger migration on subsequent loads. Abandoning migration and reopening the unchanged old save can repeat the migration. The formal reader still replays operations to validate all versions.

The migration adapter shares the app's formal-model module URL. New saves explicitly pass the sidecar; serializer default migration exists only for old programmatic callers. No independent localStorage key, new game operation, checkpoint or game-model field was added.

Malformed schema, mismatched operation count/month, duplicate IDs, invalid sources, active identities, ended archive facts and release references stop reading. Terminal facts are checked against the formal archive. Display labels never replace internal IDs. Reset explicitly initializes a new notebook; import supplies the imported notebook rather than carrying current facts into it.

## Validation and known limits

Final focused regression: 98/98 pass (S2 notebook/app, history Worker lifecycle, formal save/codec/recovery, S1 slots, market UI, warehouse effects and render lifecycle). Existing recipe-book/nearby/cask-ledger regression: 32/32 pass. H2-5 unit/archive checks: 5/5 pass. Scope, Risk and Impact checks pass. Formal model/recipe/reputation/history sources and fixed expected hashes are not changed.

Actual trajectories cover nine manual batches and endings, saved recipe retained beyond both limits, automatic usual production, real monthly automatic bottling, partial extraction, four-slot reuse, exact paired formal state/RNG and separate-process cold session restoration. Multiple-cask-per-batch and evaporation are synthetic reducer boundary checks, not claims of a newly reproduced real-model evaporation trajectory. H2-5's 63-file closure is byte-identical to base; see `h25-dependencies.json`. The 100-year nine-boundary research was not rerun.

The sidecar's omitted/reordered ended records are rejected against bounded archive24; persistence reads/writes also check the last eight manual fill indices. Normal open/update skips that cumulative index scan. Evicted manual profile/source values are not independently replay-proven during v5 read; required schema, operation position and surviving formal references are checked, and unchanged formal APIs resolve the actual recipe/cask ID for every game operation.

Chromium failed before page load with `socket() failed: Operation not permitted (1)`. No before/after browser display, startup, first interaction, browser memory or localStorage-capacity measurements are claimed. Node diagnostics in `long-save-results.json` are supplementary, not browser acceptance. Do not merge this Draft until the required browser behavior and same-environment before/after measurements pass.

The existing R5 historical reverse-source pin also fails on the base S1 tree. S2 changes cause its inverse matcher to fail earlier; no expected hash or historical fixture was rewritten. This is not a claim that every historical source-pin suite is green.

## Remaining acceptance

Run real Chromium on the exact candidate: recent8 + saved recipes; current4/ended8; compare/reuse/save/staff; taste/care/bottle; partial/automatic removal; slot reuse; v2/v3/v4 backup migration; quota/conflict/interruption; new-v5 cold reload and generation review. Measure recipes, casks, saved recipes, reopen, month advancement, startup, memory and storage at 30/60/90/100 years against S1 in the same environment sequentially.

On iPhone Safari: confirm narrow-screen tap targets and scroll behavior, saved recipe outside recent8, fixed slots after removal/reload/cold reopen, and backup confirmation/recovery. No physical-device result is claimed. Production is untouched.
