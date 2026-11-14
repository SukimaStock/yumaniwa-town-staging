# Independent save-boundary and clone audit

Scope: research-only L100-4A-4. Reviewed save-boundary.mjs, compare.mjs, clone-research.mjs, clone-measure.mjs, their tests and unchanged official save paths. No official implementation changes. Reference source: prior #833 head 2b3dcc99b10cce336e1b39d4af451c5d867b2200; current research source provenance is recorded in the main report. Independent focused execution: 25/25 tests passed (save-boundary and clone-research combined, after virtual-path and formal-cap corrections). Subsequent changes require their applicable rerun.

## Formal trust boundaries

1. partner-orders.mjs:1302–1324 validates seed/origin/operations, validates core, replays the operation sequence (or a matching module-private previously validated prefix), handles permitted transient progress, and compares the full state by JSON.stringify. :1332–1333 expose formal serialize/restore. The trusted prefix is not an arbitrary persisted checkpoint.
2. save-codec.mjs:24–30 checks formal length, parse/stringify canonicality, event shape and unique nonempty string IDs, and exact JSON equality of arrivals to the ordered arrival event subset. It then replaces arrivals with null at the same property position. This is local representation consistency, NOT historical provenance.
3. expandFormalGame:32–38 checks the null marker, derives all arrival references, serializes the derived array and compact base, checks exact eventual UTF-16 size, parses arrival objects, and produces the complete formal string. Its pre-clone limit check still follows allocation of an arrival reference array and large strings.
4. development-save.mjs:14–28 accepts only current v8 sessions, checks exact keys/canonical JSON/timing/mode, calls the formal restore on expanded game, and validates slots, recent ledger, history and recall. A codec-only parse is not this reader.
5. serializeSession:30–38 validates the formal game and collectors, builds compact v8 output, runs the same official reader used on boot, and compares restored game and collectors. Streaming output equality does not remove these steps.
6. writeCandidate:41–45 checks the expected current storage string, writes and reads back exact text. shop-app.mjs:546–551 only commits in-memory session fields after writer success. These checks do not provide a persistent previous-generation backup or atomic multi-tab transaction.

The strict formal bound is raw.length < 6,016,384 UTF-16 code units; session bound is < 6,017,408. UTF-8 bytes, JavaScript heap, ArrayBuffer backing and browser quota are different quantities. Historical rationale for the multiplier is not established by this audit.

## Guarantees and evidence interpretation

- Representation: ordered scalar streaming can emit exactly the native JSON.stringify text without allocating a complete arrival array or full output string. Per-token exact expected-string comparisons plus final length are stronger evidence than hash equality alone. Native scalar JSON.stringify preserves escaping, lone-surrogate representation and number notation. Tokens do not split inside strings, permitting exact UTF-8 byte sums.
- Local acceptance: validateReferences checks every event ID and every arrival against the ordered subset. Invalid/missing/duplicate/non-arrival references reject. Matching values/property order do not prove that the world arose from valid operations.
- Replay: formal session/reconstruction guarantee remains with unchanged official replay and collector validators. Current comparison does not newly execute authoritative replay. Previous evidence must be attributed to its precise source/input scope, not described as a new pass.
- Explicit counterexample probe: unique nonsequential IDs, jointly changed event/arrival values, and jointly reordered events/arrivals pass official compact/expand roundtrip. New local checks accepting these are not necessarily bugs. ArrivalView additionally demands eN positional IDs and is narrower than the codec's input domain.
- Session metadata comparisons in compare.mjs establish unchanged passthrough, not independently revalidated history/recall. Formal state/RNG equality means input representation was preserved, not new monthly execution.

## Restricted serializer domain

Tests cover integer-like key ordering, own __proto__/constructor/toJSON data, controls, quotes/backslashes, lone surrogates and pairs, Japanese, finite numeric extremes/-0/exponents, null/empty objects/arrays, sparse arrays and repeated aliases. Unsupported values and custom prototypes reject; cycles reject. This is a finite JSON-compatible data subset, not universal JavaScript JSON.stringify replacement. JSON.parse alone can create nonfinite numbers from an overflowing numeric literal; canonical finite formal data remains the intended domain.

A dotted-path virtual-slot collision was identified by the implementation worker and corrected to exact key-array matching; the regression passes. A further review finding: inspectFormal's options spread allowed a caller to override the formal limit. The worker fixed this with Math.min(requestedLimit, officialLimit); an oversized-input regression with limit: Infinity passed in the independent rerun. The issue is resolved.

## Performance interpretation

A codec timing includes parse/canonicalization/derived serialization. B is a narrower reference scan. C includes exact oracle slicing/comparison, UTF-8 accounting and SHA-256. These are different workloads and cannot establish an end-to-end save speedup. Full baseline JSON exists in the research comparison process outside the proposed streaming path; total process memory is not a pure streaming-only footprint.

Clone measurements keep one source graph, measure clone before equality hydration, collect output-retained snapshots, and release iteration-local copies before subsequent measurements. No obvious retained comparison-output contamination was found. Peak memory is not measured synchronously; process lifetime maxRSS is not a clone-phase peak. C/D comparison combines descriptor, prototype/key checks and temporary descriptor allocation, not one isolated causal timer. D is intentionally unsafe for broader types. E has a tested parent-alias counterexample and is not a generic substitute. Neither D nor E is newly connected to monthly execution; no monthly correctness claim follows from clone equality alone.

## L100-4B handoff

Persisted checkpoint contents would need the complete formal state, RNG, collector/history boundary, operation prefix identity and schema/rules provenance. Events remain canonical; the arrivals index is derived and may be regenerated only after event validation. Sequential index validity cannot establish historical provenance. Checkpoint creation-time validation and load-time trust are separate contracts: a stored checkpoint is untrusted input, unlike the current module-private validated cache. Any skipping of operation replay needs its own explicit evidence/trust design and old-reader compatibility. Streaming/string equality alone does not authorize it.

## L100-4C handoff

A future backup protocol needs complete-generation identification tying canonical events, state, operations and collector records together; partial or mixed generations must never be accepted merely because local references resolve. Keep the last known-good generation until the new generation is completely written and validated/read back. A checksum can detect accidental damage but is not proof of valid gameplay or adversarial authenticity. A broken derived index may be regenerated from verified events; missing/corrupt events cannot be invented from the index. Preserve the old save and stop when reconstruction cannot be proven. All keys missing cannot currently be distinguished from first launch without an independently specified durable marker/backup. No backup or checkpoint implementation is included here.

## Recommendation

Additional research only. Non-expanding local validation and exact representation generation are useful results, but formal writer/reader still allocate whole strings and arrays, and authoritative replay remains unchanged. There is no proof of full save/cold-restart improvement, universal clone compatibility, browser performance or Safari behavior. Do not adopt a custom serializer or generic clone replacement, increase limits, weaken validation, or infer production readiness from these tests.
