# L100-3 phase 1: save safety and test harness evidence

Base: `29697583d15f4e4524ba39ba9052b790fd66ae9c` (main fetched 2026-11-06).
Plan: `.change-plans/ambertime-l100-3/r0.lock.json`.
No runtime, save format, data cap, recall selection or Canvas change. Draft PR only; no merge or Production change.

## Repairs

- `recall-app.test.mjs`: the extracted save-failure seam lacked `debugSkipJob`, added by the decade skip feature. Supply its real idle state and add an active-job cancellation case. Committed game/recall preservation assertions remain.
- `h1-c1-module-cache.test.mjs`: the historical exact-source inverse was incorrectly fed today's app after S3/S4/H3 changes. Feed exact S1 commit `083bd63ef2d43074350e7220785d3819ee85919b`. Preserve exact comparison with pre-C1 `74924b2729565531dcc3a499dcb7e24bcc0dced8`, duplicated-hunk rejection and unrelated-byte preservation. Separate current-runtime tests still assert no cask-serial history replay in current app. Full git history is needed for this historical oracle.
- Both original failures reproduced first. Repaired suite: 7/7 pass including the new active-job case.

## Isolated fault evidence

`l100-3-save-faults.test.mjs`: 8/8 pass. Uses the actual current `boot` function extracted into Node VM and fake isolated storage. This is not a real browser quota, disk corruption, process crash or power-loss test.

- Invalid JSON, missing v8 fields and old v5: stop, preserve bytes, do not write a new game.
- Storage read denial: stop and do not write.
- Missing current key plus old key: stop and preserve old key.
- All keys absent: creates a new game. The current design cannot distinguish first install from externally lost storage. This does not establish recovery of missing data.
- First-write quota exception: no successful installation or write.
- Deliberately corrupted post-write readback: rejects success and stale retry; previous persistent bytes are not recoverable from this single key. This artificial backend violates ordinary localStorage atomic-write semantics and is not evidence that partial localStorage writes naturally occur.

Existing recall/S3/S4 tests cover atomic quota failure, exact candidate readback, stale-tab conflict, post-write read exception, current-state preservation, and next candidate replay equality. A post-write read exception may mean the new save was committed: it must not be described as preserving old persistent bytes.

## Storage design boundary

The formal path uses one `localStorage` key, not IndexedDB or a persistent checkpoint. Current v8 validates the official restored game, cask slots, ledger, history and recall before write; `writeCandidate` compares previous bytes, writes, then reads back. There is no durable prior-generation backup. On pre-write failure in-memory committed state remains; on boot corruption there is no automatic recovery source.

Checkpoint/IndexedDB research failure tests do not establish safety of the current formal path. Integrating that research or adding a redundant save generation changes the storage contract and needs a separate design stage. No automatic cap increase, validation removal, or checkpoint adoption was made here.

## Regression results

Command:
`node --test works/ambertime/tests/{formal-save,placement-save,s1-slot-save,s3-save,s4-save,recall-save,recall-app,h1-c1-module-cache,l100-3-save-faults,debug-time-skip,save-menu-ui}.test.mjs`

68 tests: 66 pass, 2 fail. Both remaining failures are the existing `save-menu-ui.test.mjs`, which extracts the former settings view. It lacks new debug bindings and expects old copy/controls that the current debug view no longer contains. They are reported rather than rewriting expected values to obtain a green run. This is not a full-suite pass.

Scope Guard, Risk Check, Impact Check and `git diff --check` passed on the phase-1 worktree. This is not final trusted verification or a real Safari pass.

## Outstanding

Actual browser fault injection, internal timing breakdown, state-consistent 110-year continuation, capacity improvement and physical Safari remain separate evidence requirements. The L100-2 real-browser results are baseline evidence, not proof that these untested conditions now pass. Overall long-term safety is still **保留** until these gaps and the near-term expanded-size cap risk are resolved.
