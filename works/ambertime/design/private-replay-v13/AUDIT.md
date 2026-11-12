# Formal replay and ownership audit

This independent loader Lab is based on #938, with shipped runtime unchanged. #938 latest head 62f04704925ff2e66e7a509947d69cb208120002 has four successful CI checks, including native Chromium. Its full-tick candidate remains rejected for performance; that workflow is not proof of this experiment.

## Native boundaries
`restoreDistillery` returns parsed input after `validateDistillery` independently replays and compares complete JSON. Validation copies a matching checkpoint or creates a new state. Native apply retains old state for `captureNearby` and tick can read old town evidence after forward town changes. We retain non-town copies and use native copies for month and every unproven operation.

Checkpoint publication follows exact full JSON equality. Nested enable-stage validation can publish a verified checkpoint before an outer replay completes. Therefore an injected post-checkpoint observer exception is not a rollback test. Prior public snapshots and acceptance on retry must remain intact, but cache identity need not be unchanged.

Projection replay and its observer are unchanged. Observer snapshots are detached by native code; tests exercise failure and retained-snapshot mutation, not optimized observer performance. Quantized prefix metadata is private native state, not authorization to mutate an arbitrary public input. The exported withPrivateReplay flag alone grants no ownership in this Lab.

## Selective region
Only source-reviewed start, stop, price and list permit private readonly town sharing. Fill is excluded because automatic bottling assignment can invoke partner action and syncTown. Every unknown operation, month, generation, fill and consignment uses native behavior. Graph cross-alias certification resets before native execution and reruns before the next selective region.

B preserves complete copies of non-town data while avoiding copies of the private town in those four operations. C wraps exactly those readonly regions with the earlier journal and materializes before native operations/end. It has zero optimized town writes: it does not demonstrate mutable-town incremental replay or replace full monthly transactional isolation. The full native month in the synthetic stress fixture is explicitly fallback.

Native nested formal validators require independent stacked sessions. An initial nested-replay rejection was detected by the fixture test and corrected, rather than weakening the fixture. Each child restores parent session/clone scope in finally.

## Gate
Measure complete formal session read, all native acceptance checks and full expected JSON comparison. Child processes run sequentially; ordinary wall time is not clone-instrumented. Three rotated A/B/C repetitions include peak process RSS and heap at return. New 5/25-year prefixes are reconstructed by native operation replay from frozen 100-year fixtures and independently round-tripped with formal v9 session reader. Years mean elapsed after initial setup; absolute months are retained in manifests. Diversified prefixes use two desks with actual sales.

No shipped reader, cache contract, game rule, save content or public API is changed. No main integration is authorized unless complete correctness, meaningful performance and complexity gates are met. Five-strategy full protocols and real browser/IDB tests are later conditional gates, not implied by this small experiment.
