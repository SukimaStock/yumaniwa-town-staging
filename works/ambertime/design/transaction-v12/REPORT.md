# AmberTime v1.2 actual full-tick ownership experiment

## Decision
Performance candidate REJECTED. No shipped module or formal reader changed. No Staging/Production merge/deployment. This is an independent Node loader experiment, not main integration or full century replay acceleration.

Baseline #937 a3a28226676bfdc9aef20179815f32f52ce72da0 has all4 CI SUCCESS, and bounded town-only independent review. Fresh Plan for this Lab was fixed before code (remote a5ebb9a390242fcd71eb401991ed0d3914bff9e4). Dependencies #931/#932 runtime and #933 guard, #934 rejected component-copy, #936 private economic-stage, #937 bounded journal are distinct evidence, not merged features.

## Exact transaction order and ownership
See INDEPENDENT-AUDIT.md and DESIGN.md. Actual tickDistillery is executed unchanged except exact-hash/count-gated observation hooks and cloneReplayState delegation. Economic month precedes shipping/consignment/bottling, then reserve check/old-state rollback, then final action/syncTown. Nested bottling actions can syncTown earlier. Original s remains alive for shopEvidence and funds/generation paths. It MUST NOT observe forward town writes.

The entry full clone preserves old s independently. First clone forks a second town into an owned journal; non-town data detach on every projected clone. Recognized forward clones retain that unpublished journal; a later clone(original s) uses native clone. A returned old/plain branch discards forward journal. Output detaches entirely. Cross-boundary object aliases reject. This only treats audited synchronous single-tick flows, not arbitrary saved intermediate snapshots or async callbacks.

## Completed focused tests
- Five century fixtures: actual monthly native/candidate entire game JSON and internal alias topology equal; input unchanged, exhaustive public node disjointness and two-direction post-return mutation tests.
- All5 simple insufficient-cash cases: exact native returned state including funds/history behavior; original-state-native-clone branch observed and forward journal discarded. These alone DO NOT prove nested town-update-before-rollback.
- Actual official-reader regional live graph: first tick and alias topology equal. Input was previously native-reader restored, not candidate cold restore.
- Cross-boundary alias negative case rejected.
- Seven injected exception points on legal actual consignment-sale fixture: after economy, first town write, multiple town writes, after actual consignment settlement, before private journal commit, during tentative private commit, before full detached output publication. Inputs unchanged and retry full state equal.
- Two same/alternate branch checks pass.
- Final safety parent exit0 with12 cases, faults parent exit0 with9 cases. Exact source hashes and commands are reproducible from scripts.

The ordinary five century snapshots had no consignment sales or automatic bottlings on their next month. A separate legal fixture (naturalDeliveryFixture plus native assignment/consignment commands) produces actual1-bottle bar sale month134→135. It is not a manually invented economic record. True nested auto-bottling then insufficient-funds case remains a distinct review gate until documented below.

## End-to-end performance
15 separate child processes normal exit: five each #931, #937 native, candidate. Each5 repeats, same fixtures and environment. A/C pair order alternates; #931 measured afterward. No global clone instrumentation in timing. Every candidate and baseline output SHA matches. These are ACTUAL ONE-MONTH GAME TICKS, not full cold restores.

|strategy|#931 median ms|#937 native median ms|candidate median ms|#931 RSS KiB|candidate RSS KiB|
|---|---:|---:|---:|---:|---:|
|local|185.4|172.6|1551.9|417004|880008|
|regional|107.0|85.5|718.7|299468|487416|
|bulk|122.0|122.2|1457.4|337436|527752|
|small|157.4|192.6|1283.0|372628|772416|
|diversified|82.3|105.4|774.7|234432|476624|

All ranges/raw trials/heap/RSS retained. Candidate is consistently slower with higher RSS. Native ordinary tick has only one full-town fork; this adapter adds entry/fork/exit and graph validation to protect old/public states. Local phase medians: entry124.8, boundary audit177.5, town fork273.8, tick854.1, exit136.7 ms. Component medians need not sum to total median. Proxy-heavy quantization dominates tick overhead, in addition to necessary boundaries. Prior #937 36-update town-only amortization does NOT transfer to single full game transactions.

## Not performed / why not
No new candidate100-year full replay, formal five-strategy save/cold/resave/re-cold, actual IndexedDB storage fault matrix, two-generation startup, power interruption, actual quota or iPhone test. Candidate is not installed in formal reader or browser; running unchanged native tests cannot certify it. Required end-to-end performance benefit is absent. Do not expand this rejected candidate into formal storage/browser integration or present pre-existing #931/#932 formal success as candidate success.

A limited improvement assessment must preserve original-state evidence reads, rollback and public graph separation; see supplementary evaluation when available. Further architecture is not justified by deleting history, weakening readers, trusting unverified prefixes, or sharing original town.

## Reproduction
Run from repository root; fixtures are unchanged manifest-verified synthetic century records. Node v24.22.1.

```
node --experimental-loader ./works/ambertime/design/transaction-v12/loader.mjs works/ambertime/design/transaction-v12/safety.mjs FIXTURES OUTPUT.json
node --experimental-loader ./works/ambertime/design/transaction-v12/loader.mjs works/ambertime/design/transaction-v12/faults.mjs OUTPUT.json
python3 works/ambertime/design/transaction-v12/run-measure.py REPO FIXTURES NEW_OUTPUT_DIRECTORY
node works/ambertime/design/transaction-v12/measure-931.mjs REPO_931 FIXTURES OUTPUT.json STRATEGY
```

Independent final review and exact CI must be recorded separately. Research-source success never authorizes merge or deployment.

## Critical nested rollback case completed
`nested-rollback.mjs` derives a synthetic stress state from verified local-century fixture (cash30, active one-bottle reservation on cask314, hired staff, unlisted product mirrors). It is deliberately NOT a formally replayable career save. Actual native control executes automatic bottling, writes74 town fields including new release and event, then fails reserve and uses original-state-native-clone. Candidate returns the exact same full JSON state, including funds/month operation and normalization; forward journal discarded. Original input unchanged. Injected exception after fifth town write and subsequent retry also preserve input and exact native result. Parent process exit0.

An initial test expectation incorrectly demanded all returned release metadata equal old input; native syncReleases legitimately normalizes listed flags after the manually altered setup. That assertion failed before candidate execution. Corrected test preserves release IDs/count while comparing the ENTIRE candidate result to native; no gameplay logic or native equality requirement was weakened. Do not claim rollback means returning literal original state.

## Limited correction assessment
See IMPROVEMENT-EVALUATION.md. Duplicate shape-validation reduction was considered but is not promising: even removing all validation/fork overhead would leave proxy-heavy tick plus required output separation substantially above native. Phase medians are non-additive samples, so hypothetical arithmetic is not a measured improvement. Removing old-entry ownership or public detach changes safety guarantees; it is not an admissible micro-fix. No extra speculative variant was added. The tested design remains rejected for performance, with source and evidence retained.
