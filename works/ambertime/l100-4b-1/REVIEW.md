# Independent design and implementation review: L100-4B-1

Reviewed main 6a1707c106afb4bf0658a274edf404bbc541de64 and research adapter.mjs/run.mjs/faults.mjs on 2026-11-06. This review does not certify tests still running. No implementation files edited.

## Current restore audit

Official `development-save.readSession` parses canonical v8, verifies exact session keys/version/elapsed/placement, expands compact game through `save-codec`, restores the formal model, and validates caskSlots/recentLedger/historyRecord/recallRecord against it. The official `partner-orders.validateDistillery` replays operations through private apply with context maps, finalizes partial distillation/tasting and requires exact game JSON equality. In-memory prefix/partial caches can avoid some repeat work in warm sessions; they must not stand in for independent cold replay. `serializeSession` runs the same reader and compares restored state/sidecars before write.

Previously diagnosed H1-C1 whole-history projection in cask-serial lookup was removed in S1. Current L100-3 evidence instead identifies full replay and nested structuredClone calls as dominant. Those are nested measurements, not additive phase durations. Capture fresh clone counts on the current source, as this implementation does.

The new fast path retains untouched v8 and exact expanded raw, validates the checkpoint against source and dependency fingerprints, replays only tail, compares resulting formal JSON, then invokes original readSession with a narrowly bound restore callback. All current session sidecar assertions remain active. It is not the official independent full-replay reader for the game component.

## A–D comparison and trust

| Route | Actual operation work | Guarantee | Limitation |
|---|---|---|---|
| A | Every original operation | Independent model reconstruction plus v8 sidecar checks | Long cold time; warm caches must be excluded |
| B | Checkpoint tail only | Source/prefix/tail/code/metadata consistency, exact final state, official endpoint sidecar checks | Trusts creator's prefix state/context; no independent prefix reconstruction at load |
| C | B and separate independent A | Independent full-session agreement via fresh-process digests; creation also verifies full context | Not a measured integrated boot route; A+B estimate must be labeled arithmetic |
| D | A on original or supplied older complete v8 | Complete validated source fallback, no candidate mixing | Cannot recover without at least one valid full source |

A full SHA-256 digest comparison is suitable evidence of cross-process exact-session equality, but report the exact serialization/hash protocol and compare same input SHA. Both processes need the same frozen code fingerprint. A cached read in `future`/`boundary` is a roundtrip regression, not an independent cold restore.

The design intentionally loads present-day collectors from the original v8. The checkpoint alone does not recreate missing history or recalls and is not a standalone save. Preserving that requirement is an appropriate minimal research scope, but must remain visible in adoption conclusions.

## Findings on implementation

- Exact callback binding, full target JSON comparison and unchanged official sidecar assertions are appropriate.
- Fallback returns complete older sessions, not new collectors with old game; all-invalid sources throw. No writes or implicit new game are present.
- Model pin and five H1 collector pins match current main. Broad source fingerprint additionally covers research and sidecar code; freeze before artifact creation. It is conservative, not a product-ready versioning scheme.
- Checkpoint revision currently means prefix operation count, not storage monotonic revision. Game generation is not a storage generation ID. CONTRACT correctly distinguishes these.
- Fault suite initially altered seed under the `rng` label, and inner checkpoint mutations retained stale inner integrity hashes. Those prove integrity rejection, not semantic RNG/context validation. Reviewer requested separate inner-resealed core RNG/trade RNG/context variants and honest acceptance limits.
- An altered context unused by the tested tail may leave final game unchanged. Self-hash plus consistency does not prove its independent semantic provenance; compare full final context in C/creation and disclose B's creator-trust limit. Do not silently repair it or describe resealable hashes as authentication.

## Measurement caveats

`run cold` loads source and executes target(text), and loads/parses checkpoint, before its internal timer. Fast then decodes target again inside its timer. Report internal restore processing and outer process wall separately; only outer wall includes the initial setup and process startup. A and B internal measurements have different decode paths by design. No browser startup/interaction measurement follows.

The wrapper counts global structuredClone time only; JSON stringify/parse copies and memory traffic are not included. Model clone time can be nested inside replay. `peakRSS` is process lifetime RSS high-water, not precise live-JS-heap peak; `heapUsed` after explicit GC is a distinct metric. OS file caches are not flushed.

Creation's fullReplay plus official validation is a one-off verification cost, with checkpoint captures taken during that replay. It does not measure the cost of maintaining every periodic checkpoint for an entire 100-year career. Four interval candidates are retained comparison samples, not evidence that all historical checkpoints should remain stored. Report complete source + envelope (which includes tail) without double-counting separately displayed tailBytes.

## Interval and storage recommendation

Use measured 6/12/24/60-month tails to decide a provisional latency/storage tradeoff only. The first boundary reaching target-month minus interval creates approximately worst-case nonempty tails, not a steady operational scheduler. Month interval alone does not bound replay operation count or clone cost. A 12-month starting candidate is sensible only if measured results support it; do not make it a formal default.

Prefer bounded latest acceleration checkpoint(s) alongside the intact current v8 and independently verified previous complete v8. Do not retain every checkpoint forever, and do not delete the only recovery save to fit a new accelerator. A failed optional checkpoint can leave the current v8 valid and fall back to full replay. Checkpoint size does not address the formal 6,016,384 UTF-16 limit or town-record growth.

## L100-4C handoff

- Separate storage generation ID and monotonically increasing revision from game generation and checkpoint prefix count.
- Bind v8 SHA, checkpoint hash, prefix length/digest, tail, model/code fingerprint and endpoint collectors to one committed storage generation.
- Candidate creation verification, byte readback/integrity, head/revision CAS and old-generation retention are separate obligations; transaction success is not power-loss durability.
- Retain current complete v8 and at least one independently validated normal predecessor until the new save is verified and committed. Never select old state with new sidecars.
- Corrupt checkpoint alone permits original v8 formal fallback. Corrupt v8 needs an intact older whole source. Missing authoritative events cannot be repaired from a derived index.
- GC must serialize or coordinate with readers and commits; protect head, predecessor and pinned readers. Incomplete candidates are not recovery sources.
- All-origin loss cannot be proven from records that vanished with it. Safe stop/no auto overwrite; external backup is a separate future scope.

## Review disposition

Core research design is suitable to continue measurement. Final adoption-candidate status still requires completed 12-source equality, 9 generation boundaries, 3x12-month continuation, independently cold A/B evidence, and explicit rejection/acceptance layer reporting for semantic faults. Browser durability, iPhone Safari and self-contained collector recovery are not certified by this study.

## Independent semantic fault results (executed)

`semantic-faults.mjs` ran eight adversarial cases against the immutable local30 source/checkpoint, recomputing both inner checkpoint and outer envelope hashes. Actual core.rngState, trade.rng, missing context Map, changed game generation and changed month were rejected; all five fell back to the exact original full session. The original v8 and checkpoint file remained unchanged in all eight cases.

Three context changes were accepted: incrementing manualFills, incrementing manualBottles, and adding an unused nearbyProducts Map entry. In all three, final session remained equal but returned replay context differed from baseline. This is direct evidence that exact endpoint session comparison does not independently certify context provenance. An independent C context comparison is necessary to claim full context equivalence on arbitrary checkpoints. Clean creation already compares contexts to a full-replay oracle, but that is creation-time evidence, not independent per-load C context verification.

Do not label these three accepted adversarial cases as passed rejection tests. They expose the explicitly weaker creator-trust boundary, not an accidental hash failure. Do not remedy them by changing expected results or pretending self hashes authenticate creation. Before formal use, the product must either accept and define the trusted creation boundary or add independent audit/provenance mechanisms appropriate to its threat model.

## Deferred cost: cold accelerated load followed by official interaction

An independent fresh-process test without first calling the official full reader exposed a moved cost. On local30: checkpoint restore 776.7 ms; first ordinary month 49.8 ms; first official save 12,684.7 ms (11,819 structuredClone calls, 10,286.0 ms clone time); second month 36.7 ms; second save 268.2 ms. Shared-host research work was active, so timings are observations, not isolated performance estimates.

The research `fast` route returns a game/context but does not install it into the official model's private validation cache. `serializeSession` invokes the official serialize/restore path and revalidates history through full replay on its first save. Thus low B restore time does not by itself establish low end-to-end resume/autosave latency. Existing future tests call full A first and may prime that official cache; they establish equality but not cold first-interaction performance. Do not install a private cache as an unreviewed fix in this study. Recommended verdict: additional research, until a safe formal validator/cache trust boundary is designed and tested.

The corresponding local100 fresh-process probe confirmed the same issue: B restore 1,529.2 ms; first month 127.4 ms; first official save **60,196.2 ms**, 37,549 clones / 48,649.4 ms clone time. Second month 94.6 ms; second save 653.1 ms. Input source/checkpoint IO was outside the timer. Creation jobs were active on the shared host. This is not a browser result, but it directly demonstrates first-save deferred full replay on an actual 100-year v8.

Independent review is complete. No formal cache injection, model modifications or further implementation scope is recommended in this task. Preserve the observed limitation in the final verdict and carry trusted-cache/provenance design into a separately authorized next stage.
