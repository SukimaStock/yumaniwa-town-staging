# AmberTime v1.0 — owned state partition Lab (Draft, not connected)

## Decision

Reject the measured B candidate: splitting the full snapshot into independently cloned alias-connected root components preserves results, but does not reduce the data that must be detached and introduces graph traversal/allocation. Initial five-strategy century-state **one-month** medians all worsened. No runtime file/import/cache, reader, schema, game rule, or deployment changed. This is not a successful new 100-year cold-restore protocol.

A remains the safe baseline. C (owned current state plus immutable historical storage) remains a potential **private replay transaction architecture**, not a frozen/shared mutable `town`. Do not claim it was implemented or proven. A public function returning raw mutable snapshots cannot skip detaching mutable reachable objects and simultaneously satisfy arbitrary future bidirectional mutation isolation. An owned archive requires a new internal boundary, write-path migration and fresh materialization at public/save boundaries. Existing prefix bookkeeping only avoids repeated quantization; it does not establish immutable ownership of the public object graph.

## Identity, reproduction and scope

Base #932 ad2ce4eb562c66836e3c961e79895bd2535ef2c6, runtime same as a287c61ab694ddff16d8025ed9d746c560cf3ee9. New Plan committed **before** implementation, dd4e5d97763256d71397278dab2d93d6616dfa0d, digest afb5b53ddaa7762ce45bb0e8ac40e38afb5c88c08b988577116f1564dff19b49. Stacked on #932 -> #931. No merge/deploy authorized.

Node v24.22.1 Linux x86_64. Synthetic immutable v03 expected century fixtures, manifest-verified before reading. Original 1200-month careers start after setup, absolute month1332 (four) /1450 (actual two-desk dispersed). No owner data. Each result includes exact fixture SHA. Reproduce:

```
python3 works/ambertime/design/state-v10/run.py REPO FIXTURES NEW_OUTPUT
STATE_LAB_FAULT=after-detach node --experimental-loader ./works/ambertime/design/state-v10/loader.mjs works/ambertime/design/state-v10/fault.mjs FIXTURES/expected/local-1200.json
```

`run.py` requires fresh output, runs ten child processes and verifies byte-identical next-game snapshots plus low-cash outputs. A uses original module; B uses an exact one-occurrence Node loader hook at `economicMonthly`'s outer clone. No generic replacement of structuredClone. No shipping import of the Lab.

## Actual write-path audit

| Area | Classification / writes | Risk of naive immutable separation |
|---|---|---|
| core, casks, products, cash, RNG | mutable monthly; economicMonthly -> advanceMonthly -> advanceMonth | Must remain independent; ordering and rollback preserved |
| releases | appended AND updated: partner-orders syncReleases changes sold/revenue/status/listed/price | Not immutable launch history |
| records/result | syncRecords revises sold/revenue; result may alias records entry | Separate per-field clones must preserve alias |
| operations | public action appends; private automation temporarily push/pops | Not universally append-only |
| generations | active advances; fix/advanceGeneration writes history | Closed entries need individual proven write boundary |
| labConnection.town.releases | external register validates existing profile/count, appends new entry | More promising narrow archive, but small relative to reaction histories |
| town.events / arrivals / attempts | append structurally; public quantizeReaction writes old numeric values; events/arrivals share event objects | Freeze-only/shared old arrays violate public behavior and alias contracts |
| town.nodes / packets / pending / seen | mutable reaction propagation, nodes and queues updated each step | Not historical archive |
| shop deliveries / trade histories | used by syncTown receipt boundary and replay; not disposable | Preserve exact receipt identity, count and order |
| recallRecord / historyRecord / recentLedger | session sidecars outside `game` | They are not the dominant game clone payload; removing their copy cannot explain this bottleneck |
| old saved generation bytes | storage-owned immutable raw record | Not part of economicMonthly clone; no changes here |

References: partner-orders `action` line52, `syncTown`322, `syncReleases`1140, `syncRecords`1290, `tickDistillery`1385; economy `economicMonthly`47; town-simulation/v01/model `registerExternalRelease`252, `receiveExternal`260, `quantizeReaction`275. Line numbers refer to base, not generated files. This is relevant-path audit, not proof every future feature never mutates any record.

## Payload composition (UTF-8 JSON bytes, NOT allocated memory)

| Career | Whole game | labConnection | Share |
|---|---:|---:|---:|
| local |12,623,055|12,316,374|97.6%|
| regional |6,512,149|6,164,277|94.7%|
| bulk |7,356,896|7,009,002|95.3%|
| small |10,069,507|9,340,615|92.8%|
| dispersed |6,213,247|5,767,255|92.8%|

Nearly all labConnection is town. Region operations133,719 bytes and releases109,846 bytes are much smaller. Session history148,437 / recall354,075 bytes are outside game. JSON counts repeated aliases twice and is neither physical heap nor actual clone volume. Nested field sizes and alias analysis are sampled outside timed transition; not serialized every copy.

## B: graph-aware independent root components

Build a union of root fields connected by a shared reachable object, clone each component using native structuredClone, reconstruct root in original key order. All components are copied. Unsupported prototypes/root cycles use native baseline. This is a formal plain-state Lab, not a general clone library. Scanning costs are included in B transition time. It preserves native within-game alias topology while severing all mutable old/new references. It does **not** reduce payload bytes; raw clone call counts increase, so fewer full-root calls would be misleading.

Checks: full snapshot equality; alias signatures equal native; exhaustive object-set intersection empty; adversarial cross-field alias and both-direction mutations; invalid expected month leaves input unchanged; low-cash result identical; injected exception after detached candidate cash mutation leaves source game/operations untouched. No real storage write is made, so these checks do not certify formal storage failure safety. Existing #931/#932 save/normal-generation proofs remain separate.

## Initial measured results

One fresh process per variant/strategy, five transitions of identical century state; median ms:

|Career|A|B|
|---|---:|---:|
|local|165.484|222.400|
|regional|88.895|105.437|
|bulk|87.805|93.221|
|small|128.343|137.222|
|dispersed|75.802|95.921|

Ten processes and both low-cash/full-state comparisons completed. Separate final-source rerun is stored alongside initial results. Timed transitions use no clone counter/size instrumentation, but prior audit allocations may affect GC; loader overhead is a confound. This is a screening microbenchmark, not stable cold-restore performance. Heap/RSS recorded after audit/alias copies and transitions, so **do not** present as isolated restoration RSS. Initial B process RSS higher in every strategy. No memory benefit demonstrated.

## Why no formal cold-restore rerun / main integration

B failed the prerequisite benefit screen. Running 15 lengthy formal cold processes would not rescue an all-data-copy algorithm that already adds ownership traversal. No candidate is adopted; no claim that Lab results establish five-strategy formal save/canonical continuation, two-generation boot or iPhone behavior. The preserved #932 protocol is the last formal five-strategy evidence, with mixed performance, not proof of this Lab.

C is not implemented: migrating mutable historical writes into owned immutable blocks is not a safe one/two-site edit. The next plausible experiment is a **private replay-owned town archive** with explicit append/quantization boundary and detached materialization, preserving events/arrivals alias identity and formal reader output. It needs distinct Plan, proof of all readers/writers and independent tests. No old shared-town shortcut is accepted. This decision follows measured insufficient benefit and unsafe shortcut rejection, not an arbitrary time cutoff.

## Verification status

Local syntax and Plan/scope checks, independent review and CI status are recorded below as observed, not inferred. No native IndexedDB, browser or iPhone tested in this Lab. No main connection. No Staging/Production merge or Pages deployment. Guard repair and final v09 preservation are separate work items; this Draft does not claim #932 guard fixed.

### Final-source rerun

After native fallback guard for non-plain prototypes/root cycles, full runner completed all10 child processes and parent exit0. Five per-process transitions: local148.96→197.86ms; regional115.48→103.49ms; bulk81.98→103.41ms; small108.76→131.27ms; dispersed77.47→94.86ms. Regional reversal shows noise; four others worsened again. No reproducible broad benefit. Both rounds retained, never select only favorable values. All five next-month whole-state bytes and low-funds outcomes match. Fault injection was rerun with candidate partition clone, not baseline clone.

Local Plan Lock, Scope, Risk and Impact checks PASS. Native syntax checks PASS. GitHub/CI and independent review still pending at this record. The remote Plan-only equivalent commit is c7ec2621e0b2ad6b0aa6292b5eff9a557e4d6885; local original Plan-only dd4e5d97 predates implementation.

### Independent review and stronger transition checks

Independent reviewer distinguishes B-partition (componentized **full** copy) from requested selective-copy B. This rejection does not prove selective B or C impossible. All five actual B monthly outputs were subsequently checked for complete old/new graph disjointness and bidirectional post-return mutation. All five low-cash paths explicitly retain month and cash, show a funds choice, revert town and retail state, and return graph-disjoint rollback output. `transition-safety.mjs` and raw results retain these assertions. These are transition-level checks, not only direct clone tests. Source baseline retained.

At exact4527121: Gate43287596760, Trusted Evidence43287596775, Release43287596964 success; nativeChromium43287597022 still running at observation. This native workflow exercises unchanged product code, not Node-only Lab clone. Separate owned economic-stage proof will test a minimal private C boundary; C is not dismissed by this negative B screen.
