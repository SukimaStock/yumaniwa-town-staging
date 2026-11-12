# v1.0 C-boundary proof: privately owned archive / isolated public snapshots

**Limited positive result, not main integration.** This explicitly tests selective current-state copying in a private transaction rather than componentizing all fields. It follows the rejected full-copy partition Lab #934. A is native original economy.mjs; C changes only an exact Node loader hook, no shipped source.

## Proven boundary

`economicMonthly` itself neither reads nor updates `labConnection`. All actual writes to town occur outside this economic stage (partner-orders syncTown/actions, reactions, some auto paths). An entrance clones the entire public input into private ownership. Six calls to the **actual economicMonthly function** run inside the private boundary. C clones current fields, retaining only that privately owned labConnection. A clones every field each call. Exit clones the complete result before return. No intermediate candidate escapes. A preflight rejects any object alias crossing labConnection/current boundary.

This is NOT six full game months: consignment settlement, automation, generations, action recording and town progression normally surrounding economicMonthly are deliberately NOT invoked. Existing histories/operations remain byte-identical in A/C. It is not a 100-year cold restore, formal-save guarantee, or a speed estimate for the whole game. Exact proof is restricted to five saved century snapshots and six economic stages each.

Private labConnection is mutable storage owned exclusively by the transaction, but unchanged by this stage. It is **not shared town with caller snapshots**, not Object.freeze, not a claim that historical town is universally immutable. Old/new public graphs are fully disjoint. In a future complete replay, town writes would need explicit transaction/rollback semantics before this technique could be applied.

## Correctness and failure

Each immutable synthetic century fixture is SHA-verified. Ten child processes A/C completed with exit0; all five A/C complete output JSON bytes match. Each runs three identical transactions; output reproducible. Cross-boundary alias preflight, archive unchanged, full public node-set disjointness and both-direction post-return mutation pass. Failure injected after third stage modifies private cash then throws; original input including operations stays unchanged. Abort discards entire private transaction. This is **not** proof of full-game partial monthly rollback or storage fault safety.

No owner save, browser storage, history, reader acceptance, economic constants or runtime file changed. No integration; no merge or deploy.

## Measured Node proof

Node24.22.1/Linux x86_64, same fixture/env, one fresh process per variant/strategy, three transactions per process. Fixed A→C order; median milliseconds. Full transaction includes entry and exit clone, archive-invariance serialization/assertion (outside stage timing), so it is not uninstrumented product latency. Metadata sampling and graph isolation are outside measured phase. RSS includes all proof allocations and postchecks, not isolated reader RSS.

|Career|A total|C total|A six-stage|C six-stage|A peak KiB|C peak KiB|
|---|---:|---:|---:|---:|---:|---:|
|local|1143.03|414.06|750.50|40.16|955888|699092|
|regional|602.71|244.43|370.56|45.62|502108|378652|
|bulk|768.75|249.73|474.03|39.75|546336|437068|
|small|837.11|313.17|571.87|63.33|660808|633320|
|dispersed|505.11|218.06|380.92|59.83|523080|370252|

C avoids six copies of archive payload per transaction, but retains two boundary full clones (same in A). Native core-stage copies remain. Logical archive JSON bytes5.77–12.32MB versus current0.31–0.73MB; these are not physical allocations. Removed logical traffic about34.6–73.9MB per six-stage transaction, not actual memory freed. Raw sample/phase times retained.

## Decision / remaining safety work

The ownership boundary has meaningful potential in this restricted phase. Unlike B-partition, it really avoids cloning the large archive during these phases. It is NOT yet safe to connect this shortcut to full tickDistillery: automatic bottling/shipping can invoke actions and mutate town before the enclosing funds check, and legitimate monthly rollback must reproduce prior state rather than merely throw/discard whole restoration. Public snapshots, final save materialization, alias identity, legacy reader paths and five formal century protocols remain to prove. Do not transplant this helper into production/private replay solely on these measurements.

Next experiment should give town writes an explicit owned transaction boundary with journals/checkpoints or copy-on-first-write isolation, then compare actual full ticks including automation+funds rollback and exceptions. It must preserve history, RNG order, native aliases and original reader outputs. That is a distinct scope/Plan; this small phase-only Plan intentionally excludes it. No limited main connection is justified yet because the relevant full-game safety conditions are unproven.

## Identity and reproduction

Base #934 initial452712109b4f97b9bd0d0193633abe5e0da8991e -> #932 -> #931. New local Plan-only39a065f9 before implementation; digest7c859866a29a21339e7e6850365e6d266d2f51bda0a548c1ee7514044553e0fc. Plan scope design/state-owned-v10 only. Prior B Lab unrelated guard failures are not resolved by this proof.

```
python3 works/ambertime/design/state-owned-v10/run.py REPO FIXTURES NEW_OUTPUT
```

Fixture source v03 frozen five expected/*-1200.json; each result includes SHA. Raw game outputs can be reproduced but are not committed. Synthetic metadata only in results. Local formal scope/risk/impact and independent review/CI status must be reported separately. iPhone/browser/IndexedDB unverified.

## Independent review corrections

The `ownedStage` WeakSet is a Lab call-scope check, **not** an enforced provenance/security boundary: a caller can mark arbitrary objects. The trusted wrapper, not that helper, establishes entry ownership. The cross-alias preflight is performed once for these fixtures, not inside a generic reusable API. Do not export this as a safe public transaction API.

Independent review confirms economy stage does not call syncTown. Reviewer independently mutated private town event and appended an event after three stages, then threw: original local-century public input remained byte-identical. Final proof additionally injects a town event mutation plus cash mutation before throwing and compares A/C internal alias-signature hashes. This proves complete transaction abort isolation, **not** internal partial-stage rollback. Whole-game valid month progression and reader acceptance still untested. Full game integration remains unsafe to infer.

Local Plan/Scope/Risk/Impact and native syntax checks PASS. Remote Plan-only equivalent2764c3a34a44d62a1569be0d96e8a05b541b0cea precedes Lab tree. GitHub CI status is not inferred from these local results.

Final-source rerun: all10 processes and parent exit0, all five whole-state bytes AND internal alias hashes match. Archive+cash mutation before injected exception leaves original full input unchanged. Median totalms A→C: local 2108.81→462.24, regional 588.29→247.16, bulk 817.65→332.98, small 916.89→411.92, diversified 574.55→274.46. Both rounds retained; timings vary and are phase-proof measurements, not formal restore predictions.
