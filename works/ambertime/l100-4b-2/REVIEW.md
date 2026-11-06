# L100-4B-2 independent trust review

Initial source review: prior #837 checkout; new working baseline must be confirmed by implementation owner. No formal source changed.

## Formal cache assurance

`partner-orders.mjs:1292–1324`: the module-local singleton checkpoint is matched by seed, exact serialized origin, operation count and exact serialized prefix. It is published only after reconstructing the target via formal apply(), restoring transient distillation/tasting state and exact JSON equality. Cache state is an operation-boundary snapshot; `partial` is a separate strictly validated progress snapshot and may be reused only within the identical operation epoch with nondecreasing progress. Treating final session state as this boundary state is incorrect.

The key does not authenticate cached state/context: safety relies on module privacy, internally replay-derived snapshots and detached clones. A raw external cache setter would introduce a new trust boundary, regardless of digest checks. Projection tokens are separately held in a WeakMap and expressly detached from validation; they do not authorize formal save validation.

`development-save.mjs:30–38` retains formal size checks, sidecar checks, roundtrip reader and full game/sidecar equality. Fast game restore may not bypass these. Warm saves gain speed because the first serialize validates and installs the replay cache, and readback reuses its prefix.

## Context dependencies

- manualFills/manualBottles initialize staffExperience and staff unlock flags at `enable-staff-experience` (424–426). Counters evolve at 1283–1284. Already-enabled snapshots may hide corruption from terminal equality.
- manualSources gates staff hiring and supplies manual recipe provenance, order and latest recipe choice (655–697). The operation index and generation identity matter, not only final recipe values.
- nearbyCasks supplies recipe stop point, cask type, flavor, generation and provenance to staff reservations (648–688). Corruption can change future game computation.
- nearbyProducts accumulates listing/sales/price receipts and is exposed by nearbyComparisonFacts (1248–1278,1328–1330). An unused entry can be invisible in one terminal session while influencing a later query or ID reuse bug.
- All context Maps are mutable even if their containing object is Object.freeze'd. A trusted token must own a detached private graph; returning it or storing caller-owned Maps destroys the guarantee.

## First-save acceptance gate

1. Explicitly state whether trust is live-process replay-derived capability, or persisted creator-attested checkpoint. Hash-only self-asserted validation is not a capability and does not authenticate creation.
2. Bind origin, seed, full prefix bytes/digest and length, checkpoint state, context, source v8 bytes, model dependency fingerprint, generation and collector boundary. Prefix length is not storage revision.
3. Mint trust only after actual formal full replay + independently matching context, or derive an increment from a previously valid private capability using the exact official apply semantics. Caller-provided verified:true, matching session digest or an imported arbitrary token is insufficient.
4. Detach all snapshots; test edits of source checkpoint/context, returned state and clone/forgery/other-factory tokens. No time-of-check/time-of-use window in asynchronous admission.
5. Replay and validate only the new tail against a fixed authenticated-by-capability prefix; compare entire formal game/session. Do not trust arbitrary caller-supplied future state. Keep transient partial-progress snapshot separate.
6. Publish new trusted cache/checkpoint only after candidate formal checks and readback checks all succeed. Failure leaves previous capability and original v8 intact. Failed admission must not poison a cache that a subsequent call can reuse.
7. Fingerprint/code changes, altered origin/prefix, context mutation or generation mixing invalidate the capability. Cold persisted recovery lacking proven provenance must use full replay or clearly remain a weaker creator-trust research path.
8. Extend to 12 months only after gate proofs; do not characterize a runtime-only safe optimization as solved cold persistence.

## Required adversarial probes

Rehash coherent context alterations (all five context fields); mutate after issuance; clone/forge/cross-factory token; mix same-seed prefix and different origin; valid prefix + reordered/duplicated/dropped tail; swap same-month sessions; corrupt state but preserve source digests; operation-boundary vs transient-progress mismatch; failure after candidate validation but before publication; wrong fingerprint; stale token after newer commit; original bytes unchanged. Test both immediate refusal and a subsequent valid save to detect poisoning.

A serialized token loses WeakMap identity across process restart. Re-establishing it from a persisted unkeyed hash alone does not preserve the private-cache guarantee. Full startup revalidation preserves assurance but relocates the expensive replay; report that cost honestly.

## Prototype independent review

Reviewed `l100-4b-2/trust.mjs`. The diagnostic model copy only adds an apply counter and detached snapshot accessor; it does not add a cache setter or alter the validator branch. Public methods do not return this model. Capability records are private WeakMap entries and detached from callers. `save` retains official serializer/readback and publishes a new token only after sidecar and candidate equality checks.

New reviewer execution on Node v24.22.1: eight independent small-fixture probes passed. Proxy and inherited-token forgeries reject; history/recall/recentLedger/caskSlots failures do not cause a later modified-cash candidate to pass; valid retries and original session roundtrip remain correct; mutated returned game/receipt does not change private records. A valid old-token branch still saves an independently valid older branch: this is not storage revision/CAS protection.

Copied-tree dependency mutation (recent-ledger source comment) caused read, next, save and admit to reject: four paths confirmed. The first isolated run lacked a sibling flavor module and did not run; resolving sibling read-only paths allowed successful execution. Active measurement worktree was not modified. Results: probe-results.json and fingerprint-result.json. Tests are small official-fixture trust checks, not 100-year performance, browser or persistence evidence.

No unsafe cache injection found. The implementation safely demonstrates normal same-process official-cache continuation, not safe persisted checkpoint admission or cold first-save acceleration. Fresh manager first admission executes full formal replay; later admit on the same manager may reuse the existing official prefix cache and must not be labelled cold/full independent replay. Ending before 12-month and new generation-boundary testing is appropriate because the requested cold inheritance gate has not passed.
