# Independent boundary review

Reviewed the research adapter, map adapter, monthly runner, measurements, handover runner, reconnection runner and design. Official model base is 28f00c81cb1b374758da34dc79cf7f63dfe657c2; 42d327d6 is the pre-implementation Plan Lock commit. No official model edits were made by this reviewer.

## Findings corrected during review

1. The B clone marker originally transformed an ordinary exact-shape marker object into an ArrivalView. Source records now reject the reserved marker. Both clone modes have rejection tests.
2. Assignment into an ordinary object originally lost an own `__proto__` data key and could alter its prototype. That special key now uses explicit data-property definition; ordinary keys retain fast assignment. Both clone modes are tested against native-clone behavior for that case.
3. The measurement's output-release GC sample originally retained result-holder references. The holders are now cleared before that sample.

The reviewer independently reran the final focused suite: 20/20 passed. Independent marker-collision and own-property reproductions also pass after correction.

## Scope of the positive evidence

The runner calls the real unchanged partner-orders monthly calculation and the original history, ledger and recall collectors. Hydrated comparison objects are not fed into the next month. Source hashes and lengths, independent event arrays, and explicit mutation/alias tests support source independence. Map Set membership is deeply compared. Map ordering is not represented by mapProgress's aggregate result; full-state equality and index tests supply the separate ordering evidence.

Inspection found no full-arrivals array construction on the formal runtime path used here. Current direct town access is append and recursive quantization; canonical events remain traversed. The adapter records allocations through its own map/filter/slice and rejects full hydration while guarded. This is a source-audited result for the tested path, not a universal allocation detector: arbitrary future Array.from/spread on its iterator would evade those counters. Every new consumer requires another audit. Collector suffix arrays are allowed and separately counted.

The synchronous global clone interception is acceptable as isolated research scaffolding, not production integration. It deliberately rejects unsupported graph shapes and transfer options. Formal initial loading and formal serialization continue to expand arrays; no formal capacity-limit or cold-start improvement has been established. Supplemental generation fixtures are codec-decoded comparisons, not repeated authoritative input revalidation or browser tests.

## Evidence freshness and verdict

The existing result files showed three one-month gates, 72 subsequent policy/month/mode exact comparisons, and 36 handover/next-month comparisons. The added key checks and corrected result retention may change measured performance. Pre-fix timing and GC results must not be presented as final-code measurements. Re-run final-code numerical measurements and continuity tests, and bind the report to their exact revision before publication.

No remaining source-level blocker was identified for an isolated Draft PR after those reruns. A production adoption recommendation is not established. Candidate versus additional-research classification must use final-code performance: retained-memory savings alone do not excuse clone/monthly regressions, and B projection/native-clone cost must remain visible.
