# Private formal replay: bounded ownership comparison

## Scope and independent source audit

This is a Lab-only source-gated loader, not a runtime change. It wraps the actual `validateDistillery` operation replay loop and the actual `apply` function. All calculation, operation order, replay context capture, final exact JSON equality, checkpoint cloning, partial progress and reader acceptance remain unchanged.

Only four recorded operations are optimized: `start`, `stop`, `price`, `list`. Independent source review found these use the economy action (operation append), not partner-orders action/syncTown. Their helpers and generation updates do not read or write town. `apply`'s captureNearby/manual context reads non-town state, which remains separately cloned. Stop's progress prelude calls economy distillStep, not automatic completeUsual. Source gates cover partner-orders, clone-data, economy and generations.

`fill` is deliberately excluded. Its automatic assignment path calls delegate/reserve/pause and partner action/syncTown. Month, generation, consignment, bottling, fill and every unlisted operation use original native behavior. This exclusion is not skipped testing: the formal replay still executes them, without optimization.

## A: native comparator

All operations and full-state clones use the original implementation. The loader's observer wrappers remain but do not optimize. Compare uninstrumented native separately if measuring observer overhead.

## B: private owned read-only town

The replay state is generated natively from newDistillery/upgraded or a detached verified checkpoint. It is not the parsed expected/public state. Inside the four audited operations only, a full-state clone detaches every non-town field but carries the same private town reference. No mutation of town occurs in this scope. First clone is omitted as well as any subsequent town clone; this is safe because no historical town reader/mutator occurs in these four operations.

Between operations the private town continues as part of the private state. An unsafe operation runs entirely natively, preserving its ordinary old branch and rollback behavior. No public entry clone or exit clone is added per month. An exception abandons the private replay; its tentative state is never returned and checkpoint is not promoted. Final native checkpoint clone still detaches town. restoreDistillery returns the parsed, formally compared state, not the private optimized replay object.

Graph crossing between town/current or labConnection/other roots is rejected at the first optimized connected state and again after every unsafe/native operation invalidates the certificate. The audit is not skipped for performance. Within a safe segment the four source-reviewed operations preserve the boundary. This is not a generic promise for arbitrary callbacks, object classes or injected states.

## C: journal overhead comparator

C uses the SAME four-operation allowlist, but puts town in a privately owned reversible journal for each consecutive safe segment. Non-town clones remain native. A snapshot materializes town before an unsafe operation or at the formal loop boundary; no full game snapshot is added per month.

Because the four optimized operations do not change town, journal writes are expected to be zero. C is therefore a journal ownership/overhead comparator, NOT a demonstration that changing town can be incrementally replayed correctly. Actual town mutations in unsafe operations remain native. A test whose callback `afterTownWrite` never fires cannot count as town-write fault injection success. Native bottling/consignment/month fault coverage likewise does not prove a C journal mutation path.

## Hooks and failure scope

configureLab({variant:'A'|'B'|'C',hooks}) and getLabMetrics() are Lab APIs. Hooks expose only labels/counters, never tentative state. onApplyBefore/After run for every formal operation; afterSafeOperation only for optimized operations. C has afterSnapshot, beforeTownCommit, afterTownCommit and afterTownWrite (expected unreachable in current readonly allowlist). beforeReplayPublish is before leaving the private loop. beforeCheckpoint is after formal equality but before native checkpoint assignment. abort reports private replay failure.

afterCheckpoint is an observer immediately after the ORIGINAL checkpoint assignment. A failure here means the cache already contains the formally verified candidate, while the public call throws. It is not a rollback test and does not promise the old cache pointer is retained. Test old public snapshots and a subsequent correct retry against native. Neither assignment nor verification is weakened or rolled back. Failures at private commit/after-operation can abandon the entire private replay; they do not establish an external database transaction guarantee. Existing checkpoint/public isolation must be tested by restoring again after injected failures.

## Evidence limitations

Initial implementation uses only the four independently reviewed paths. Performance benefit, canonical equality, alias topology, all fixtures and exception handling still require actual runs. No full mutable-town replay ownership claim, production connection, cache-trust weakening, history deletion, merge or deployment is authorized by this Lab. Do not generalize first-clone omission to every privateReplay call.

## Native recursive validation

The first safety run exposed enableStage4 → enableStaffExperience → validateDistillery recursively entering the loop. The initial blanket nested-loop rejection was incorrect for native behavior. Each nested loop now installs its own journal/certification/clone context and restores both parent session and active context in finally, including exception paths. No inner ownership or certification is borrowed. The initial failure log is retained; the fix requires rerun of actual fixtures.

## Synthetic monthly stress boundary

The loader-only `__labStressMonth(s)` first natively clones caller input, then enters the private wrapper and invokes actual apply for one month operation with a fresh replay context. It is not a formal reader and does not validate that the synthetic state follows from its operation history. It exists to test the previous nested-bottling/low-cash stress case inside the wrapper, rather than merely calling a public tick outside it. A null-tasting, no-progress synthetic fixture should match native tick; other preludes require comparison to native apply, not assumptions.

Month remains outside the allowlist, so B/C take the native fallback. This proves the private wrapper does not corrupt this monthly rollback path; it does not prove C journal writes, optimized month, or a full formal restore. Caller input is detached before execution and only the actual operation result is returned. No persistent save or checkpoint promotion is performed by this exporter.
