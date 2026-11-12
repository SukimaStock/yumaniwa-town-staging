# AmberTime v1.1 — town ownership / reversible-journal independent Lab

**Draft only, no runtime connection or deployment.** This investigates actual native town writes and incremental private transactions. It does not replace the formal reader, save format, economics or full game tick. No history is removed.

## Prior candidates and current identity

Main at start0778bcf4555737ec45947a80aca8f761f39fa429. #933 exact2c643f00d349bb91af47020bf38fcf95f4c527cb and #934 exactc79c0c0313877467bec81759c4b061485987c7a4: Gate, Trusted Evidence, Release and native Chromium all success checked. #936 exact882f63ff5ad28007ace1c272f566c522a7a369fb also all four success. They remain Draft, unmerged. #933 guards three reviewed inverse hunks; #934 rejected full partition-copy candidate; #936 limited economic-stage ownership proof. Native Chromium jobs cover inherited runtime, not a Node-only Lab algorithm.

This branch depends on #936. New local Plan-only619fabbe was fixed before journal implementation; remote equivalentf21dc946927896583e39c87bc59335e12fe0c5e0. No prior Plan was broadened. Earlier unimplemented COW planning was superseded by this explicit reversible-write journal Plan before implementation.

## Field audit and growth

`WRITE-AUDIT.md` maps writers, readers, IDs, cursors and update semantics. `results/field-sizes.json` gives every field's exact native JSON UTF-8 bytes, count, type and 30→100-year increase using manifest-verified frozen checkpoints. 30/100 refers to360/1200 career months after setup (absolute492→1332, dispersed610→1450). Not a new career simulation. Logical JSON repeats aliases and is not physical heap/clone allocation.

Largest fields at100y (bytes / items):

|Career|events|arrivals|attempts|seen keys|
|---|---:|---:|---:|---:|
|local|4,605,745 /12,576|3,608,447 /8,992|3,476,695 /29,791|375,887 /8,992|
|regional|2,418,768 /5,935|1,792,710 /3,859|1,415,202 /12,467|293,476 /3,859|
|bulk|2,737,496 /6,670|2,051,718 /4,410|1,609,982 /14,178|337,173 /4,410|
|small|3,658,231 /8,859|2,749,753 /5,879|2,141,981 /18,861|458,484 /5,879|
|dispersed|2,298,351 /5,502|1,667,507 /3,504|1,245,001 /11,094|276,316 /3,504|

Local30→100 growth: events+3,222,544 bytes, arrivals+2,531,477, attempts+2,429,054; seen+266,491. Events provide causal IDs and visible news; arrivals alias corresponding events in live graphs; attempts retain successful/failed draws; seen prevents re-arrival loops. These are not safe deletion targets. RecordBottle/receiveActual also require old release/receipt identity and conflicting duplicate validation. History/recall use eN positions and cursor blocks, so display dedup cannot justify deleting source records.

Classification: month/generation/nodes/current queues/lastEncounter change; events/arrivals/attempts append but public quantization revisits old fractional numbers; private replay alone certifies rounded prefixes. External releases become stable after late eventId initialization, shipments append, seen grows. Memory mode's memories mutate retired/resurfaced (empty in current external response fixtures); do not generalize immutability. See audit for autonomous Lab paths distinct from external main path.

## Compared ownership forms

A native baseline: clone private town for each update using existing cloneReplayState wrapper so rounded-prefix transfer is preserved, then execute actual native adapter calls. No artificial baseline loss of private prefix optimization.

B immutable/selective field archive: not assumed safe. Array sharing with caller is rejected; external public quantization and event/arrival aliases prevent simple frozen-history substitution. Previous #934 component-full-copy experiment is NOT reimplemented.

C reversible private journal: entrance structuredClone owns the entire town. Stable proxies intercept writes to private workspace, recording original descriptors once per property. Idempotent numeric assignments do not create undo entries. Array extension/shrink/deletion retain enough descriptors/length for undo. Model-local new release/event objects remain private and preserve late initialization and aliases. No operation return escapes. Each transaction retains undo through tentative revision and all validation hooks. Exception undoes changes and revision; successful publication discards journal. Public snapshot is native structuredClone, not a mutable shared archive.

This is **not an immutable archive**: it safely mutates private owned work with a reversible delta. Formal/public snapshots stay elsewhere and cannot observe intermediate writes. Callback/argument ownership is a trusted fixed Lab adapter convention, not a security API. Caller operation arguments are cloned. No raw/proxy workspace, model-local object or borrowed reference may escape. Unsupported accessors/prototypes/nonplain graphs and object-key deletion/descriptor narrowing reject safely. External native town path has queue reassignment/filtering and array operations, not object-key deletes; this is not a general transaction library.

## Important defect found and fixed

Private replay prefix metadata is separate from town data. If a failed transaction rounds a caller-modified old fractional value then remembers a prefix, descriptor rollback restores the unrounded value. Reusing that cached prefix would be unsafe. On abort, the journal invalidates cached proxy identities so array-prefix certification is redone on retry. An adversarial preexisting event.fit with extra decimals, failed update, then retry matches native. The original helper without this reset is not adopted.

Object-key deletion could restore values but reorder canonical JSON keys. The bounded adapter rejects this unsupported operation rather than silently accepting a generic unsafe rollback. Array-index deletion and length rollback remain tested.

## Faults and reference isolation

`faults.mjs` exercises actual adapter writes with afterWrite injection, full input/snapshot/revision comparisons, frozen original formal bytes retained, old/new branch retries and conflicting receipt IDs. Ten requested cases are covered at these explicit scopes:

1. Native town monthly update midway.
2. Native release registration midway.
3. Native receipt registration midway.
4. **Town reflection of a consignment-shaped receipt**, not the game's economic settlement.
5. Before private commit.
6. After tentative private revision, before public publication; not after durable IDB commit.
7. Retry old state and identical receipt no-op.
8. Divergent branches and conflicting duplicate rejection.
9. **Mock save/Quota failure hook**, not real IndexedDB.
10. First town update from an actual formally restored live regional session; compare full town/alias topology with native. Not full-game continuation.

Additional: exhaustive public node-set separation, both-direction post-publication mutations, array shrink/delete/push rollback, event aliases, irreversible descriptor rejection, object-key deletion rejection, prefix-cache abort/retry. An initial run lacked restored input and correctly reported case10 NOT RUN; retained separately. Final result must not conceal that earlier incomplete run.

Original formal bytes remain unchanged in these Lab tests. The synthetic town-only added releases/receipts are NOT valid full-game histories and must not be serialized as formal game saves. Do not describe mock storage or tentative private revision as formal-save safety validation.

## Performance protocol and limits

Five frozen century states; actual native recordBottle once, then receiveActual+advanceTown for6 or36 town months. Synthetic new release and consignment-shaped receipts are town inputs, not economic sales. A and C have identical commands, three repeats per process, native full JSON and internal alias comparison; same Node24.22.1 environment. Input ownership and final public snapshot costs are included. No per-write JSON sizing. C returns descriptor counts/no-op writes; A counts full-town copies. Heap/RSS includes harness/alias checks, not isolated application peak.

Initial6-update screen: local/bulk/small C median slower; regional strongly affected by concurrent reader; dispersed C faster. Do not cherry-pick region or infer whole-game speed. Longer36-update experiment amortizes one-time ownership and prefix certification; all sample/median/ranges retained. Full-copy counts per37 transactions: A37, C0, plus entrance/exit copies for both. Initial C ownership validation traverses graph and is not free. Logical town size times copies is only an estimate, not bytes allocated.

Native unchanged baseline's existing15 formal5-strategy results were independently checked against recorded digests, terminal success, whole-state/canonical assertions and98 fixture SHA hashes.449 runtime files matched original trial source. A fresh regional official readSession/canonical resave passed (138.657s/3.863s under concurrent work, NOT comparative performance). Its live graph was transferred by Node v8 serialization solely to preserve aliases for case10; v8 transfer is NOT a game-save format. `formal-reader.mjs` is a portable reproducer; original measured report is retained.

**New journal's full five-strategy formal save/cold/next/save/recold and two-generation startup are NOT tested.** It is not connected to full model or formal storage. Existing native success is not journal evidence. Browser/iPhone not tested for the journal. Native CI's inherited-runtime success cannot fill these gaps.

## Decision / next boundary

Keep as independent Lab. If final36-update comparisons and safety checks pass, it supports exploring transaction ownership rather than copying all past reactions per action. It does NOT justify main connection: all full-game call sites, nested automatic actions before funds rollback, formal save publication, caller-visible snapshots and cache lifetimes must share one proven atomic boundary. Current trusted callback restrictions are not a main API contract.

Next bounded experiment should wrap complete real game actions with owned town transactions, deliberately fail automatic bottling/consignment before funds rollback, and run all five formal protocols plus native storage faults. That requires a separate Plan and independent review; no partial adapter is enabled in Staging. No Staging/Production merge/deploy. No permission/CI bypass.

## Reproduction

```
node works/ambertime/design/town-v11/sizes.mjs FIXTURES OUTPUT.json
python3 works/ambertime/design/town-v11/run.py REPO FIXTURES NEW_OUTPUT 36
node works/ambertime/design/town-v11/formal-reader.mjs REPO FIXTURES RESTORED_PREFIX
node works/ambertime/design/town-v11/faults.mjs FIXTURES OUTPUT.json RESTORED_PREFIX.v8
```

## Exact final-source 36-update results

All 10 child processes and parent exit0; 3 repeats per process, complete town values and alias topology agree on all5. Times are milliseconds, not full century cold restores.

|strategy|A median ms|C median ms|A peak RSS KiB|C peak RSS KiB|
|---|---:|---:|---:|---:|
|local|5225.4|1706.1|1162984|680896|
|regional|2011.5|885.5|515952|446040|
|bulk|2951.6|988.7|582976|476936|
|small|3442.3|1944.8|824420|615196|
|diversified|2124.8|1910.6|532660|441704|

Full ranges, per-trial timing, counters and prior screens retained in results. RSS is process high-water, including pre-timed input/parsing/audit; not incremental allocation. The diversified timing ranges overlap; no universal speed claim. Final 16 focused checks pass, with mock/storage and town-only limitations above. No browser tests or full-game journal formal protocol were run.
