# v1.3 formal-replay ownership Lab — provisional gate report

Research only, not shipped. No merges or Pages deployment. Exact independent review is in INDEPENDENT-REVIEW.md. Source, scripts, synthetic fixture hashes and results are preserved; author saves are not included.

## Implemented
A = unchanged native formal session reader. B = long-lived explicit formal-replay scope with private readonly town sharing only for source-proven start/stop/price/list. C = same restricted scope plus journal and materialization boundaries. Native operations outside that allowlist retain full native behavior. Nested formal validators get independent sessions. Every unsafe operation invalidates cross-alias certification.

The implementation is intentionally narrower than general mutable-town incremental replay. C optimizes no town writes. It cannot establish a general journal commit mechanism. The 74-write funds-rollback case is executed in private scope but falls back to unchanged native month behavior.

## Correctness completed
B: 10 safety cases; C: 13 cases. Injected apply-before/after, safe-operation, before/after checkpoint, replay publication; C additionally snapshot and journal commit boundaries. Invalid tail after legal prefix, valid retry, different-game branching, returned-state mutation, external-input mutation rejection, native projection observer throw/retained mutation are covered. Separate synthetic full-month rollback and bidirectional mutation pass B/C. Full JSON equals native, including original-state rollback semantics. Source audit identified fill as unsafe and removed it from selective scope.

An initial nested-validation rejection was a candidate defect and is preserved as initial-nested-failure.log. It was corrected; safety was rerun. A local invocation using --import instead of --loader was a harness invocation error and produced a missing-hook assertion, not a candidate pass.

## Measurements
5-year native-derived legal prefixes and 25-year prefixes were generated for local and actual two-desk diversified strategies, then formally round-tripped. See prefix-manifest. Elapsed years begin after setup (absolute months preserved). Ordinary timed trials include full formal readSession, sidecar acceptance and expected whole-session comparison. All process exits must be zero. No instrumentation of every clone is mixed into ordinary timing.

5-year local medians A1622/B1719/C1699ms; peak RSS roughly A145340–145744 / B164584–170256 / C175356–175840 KiB. No local improvement; memory worse. Diversified medians A3482/B2512/C2352ms but ranges broad. The final diversified repetition may overlap startup of the 25-year runner; preserve these values as exploratory/confounded rather than a clean reproducible speedup. 25-year results are being completed sequentially and will govern the decision.

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
