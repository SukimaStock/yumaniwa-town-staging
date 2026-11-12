# v1.3 formal-replay ownership Lab — completed small-gate report — rejected for integration

Research only, not shipped. No merges or Pages deployment. Exact independent review is in INDEPENDENT-REVIEW.md. Source, scripts, synthetic fixture hashes and results are preserved; author saves are not included.

## Implemented
A = unchanged native formal session reader. B = long-lived explicit formal-replay scope with private readonly town sharing only for source-proven start/stop/price/list. C = same restricted scope plus journal and materialization boundaries. Native operations outside that allowlist retain full native behavior. Nested formal validators get independent sessions. Every unsafe operation invalidates cross-alias certification.

The implementation is intentionally narrower than general mutable-town incremental replay. C optimizes no town writes. It cannot establish a general journal commit mechanism. The 74-write funds-rollback case is executed in private scope but falls back to unchanged native month behavior.

## Correctness completed
B: 10 safety cases; C: 13 cases. Injected apply-before/after, safe-operation, before/after checkpoint, replay publication; C additionally snapshot and journal commit boundaries. Invalid tail after legal prefix, valid retry, different-game branching, returned-state mutation, external-input mutation rejection, native projection observer throw/retained mutation are covered. Separate synthetic full-month rollback and bidirectional mutation pass B/C. Full JSON equals native, including original-state rollback semantics. Source audit identified fill as unsafe and removed it from selective scope.

An initial nested-validation rejection was a candidate defect and is preserved as initial-nested-failure.log. It was corrected; safety was rerun. A local invocation using --import instead of --loader was a harness invocation error and produced a missing-hook assertion, not a candidate pass.

## Measurements
5-year native-derived legal prefixes and 25-year prefixes were generated for local and actual two-desk diversified strategies, then formally round-tripped. See prefix-manifest. Elapsed years begin after setup (absolute months preserved). Ordinary timed trials include full formal readSession, sidecar acceptance and expected whole-session comparison. All process exits must be zero. No instrumentation of every clone is mixed into ordinary timing.

5-year local medians A1622/B1719/C1699ms; peak RSS roughly A145340–145744 / B164584–170256 / C175356–175840 KiB. No local improvement; memory worse. Diversified medians A3482/B2512/C2352ms but ranges broad. The final diversified repetition may overlap startup of the 25-year runner; preserve these values as exploratory/confounded rather than a clean reproducible speedup. 25-year sequential gate completed: all 18 children and the parent exited zero, whole-session output hashes equal across A/B/C.

## Not established
No candidate 100-year benchmark, five-strategy full formal save/cold/next/save/cold protocol, actual IndexedDB faults, two-generation startup, browser/iPhone or power-loss test. Total clone volume and replay-only timing are not measured in this limited ordinary gate; omitted town-copy counts are explicit adapter counters, not all-copy counts. Existing #931/#932 successes are not evidence for this new candidate. Native exact CI is separate from this Lab's tests.

No main connection is proposed while benefit and memory gates fail. C's readonly restriction and native fallback leave general mutable-town private replay unproven. Do not relax graph certification, alias separation or official reader acceptance to manufacture speed.

## Reproduction
```
node --loader ./works/ambertime/design/private-replay-v13/prefix-loader.mjs works/ambertime/design/private-replay-v13/build-prefixes.mjs FIXTURES PREFIXES
AMBERTIME_REPLAY_VARIANT=B node --loader ./works/ambertime/design/private-replay-v13/loader.mjs works/ambertime/design/private-replay-v13/safety.mjs PREFIXES OUTPUT.json B
# repeat safety for C; stress.mjs takes FIXTURES OUTPUT VARIANT
python works/ambertime/design/private-replay-v13/run-gate.py REPO FIXTURES PREFIXES OUTPUT 25 3
```

## Final 25-year gate and decision
Median total verified returned-result milliseconds (three rotated runs):

|strategy|A native|B private|C journal|A median RSS KiB|B|C|
|---|---:|---:|---:|---:|---:|---:|
|local|12674.95|17789.99|14536.06|307596|348936|432904|
|actual two-desk diversified|11074.44|10043.98|11759.28|267688|297300|365984|

B local +40.4%, diversified -9.3%; C local +14.7%, diversified +6.2%. Ranges and heap/raw metrics are preserved. RSS is worse for both alternatives in both strategies. Local B shows reproducible deterioration (all B samples exceed all A); diversified B ranges overlap and cannot establish broad reliable benefit. The native A first25 trial may include the tail of the prior5-year runner; later25 trials are sequential. This does not rescue local B or the memory gate; do not present the suite as perfectly exclusive-machine benchmarking.

Decision: reject both current alternatives for main integration. This limited optimization avoids some private readonly town copies, but certification and materialization costs plus higher retained memory prevent the required overall benefit. C adds journal complexity without optimized town mutations. No further small variant or source-contract relaxation is justified. General long-lived mutable-state replay remains unproven, not mathematically impossible.

Consequently no candidate100-year expansion, five-strategy full protocol or actual IndexedDB/browser integration was run. Those are conditional downstream tests, not missing results silently marked PASS. Next research would need a separately justified ownership/data-boundary design reducing graph recertification without weakening proof, rather than more microchanges to this rejected Lab.

Dynamic price/list gap closed: price-list-safety.mjs creates a native legal one-bottle product from cask29, appends standard-price/list, then separate B/C formal restore and canonical serialization match; each exercises price1/list1. Source input and returned-state/cache isolation pass. No candidate source changes followed the independent review.

Local Scope/Risk/Impact pass for declared Lab-only scope. Exact remote CI is recorded on the PR separately; CI success cannot change the rejected performance decision.
