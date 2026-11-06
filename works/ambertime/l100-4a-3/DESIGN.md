# L100-4A-3 boundary design

Research only. Do not merge or import these modules into the game.

## Scope and baseline

Repository SukimaStock/yumaniwa-town-staging, main 28f00c81cb1b374758da34dc79cf7f63dfe657c2, fetched 2026-11-06. Main contains the H4 Canvas changes; no Canvas/player/UI edits are included. Draft #828 (739754b57e80620235ca2550d2978f69c0813294), #831 (05d20df8148d14b6f5029e59b989d252b4d05923), and #832 (03f8312f65cfffb869393bda431beabcec746aea) were open and unmerged when checked. Only #832's ordered event-index idea is reimplemented in this new isolated directory. No entire prior branch is merged or silently adopted.

Plan Lock is .change-plans/ambertime-l100-4a-3/r0.lock.json, digest 0628d5e76ff8a4082c164553ae85a239b0b952403c8aef21e464a4903e3ca9cb. It predates implementation. Model and adapter are separate. No user-facing UI, copy or decorative content is added.

## A / B / C cloning

A: ordinary arrivals and native structuredClone. Full ordinary data retained, simplest compatibility baseline.

B: validate compact source, project a plain-data graph with a private research marker in place of each view, preserve graph aliases/cycles with a seen map, native-clone it, and rebuild an ordered arrival index against copied events. No arrival body array is constructed, but projection itself copies the other records once before native clone. Its temporary cost is real and must not be hidden behind retained-heap figures.

C: dedicated seen-map graph clone of supported records/arrays, reconstructing arrival views against the copied event graph. No native-clone intermediate projection. Dates, Maps, Sets, symbols, accessors and unexpected prototypes reject. It is a restricted research clone, not a universal structuredClone replacement. Formal gameplay currently passes plain records/arrays; future model changes require re-audit.

Both reject stale/incomplete source arrival indexes before rebuilding. Aliases of events elsewhere in the graph stay aliases of new events, not old ones. Each cloned view captures its own index length; adding an event then explicitly pushing its reference registers it once. Old snapshot length is unchanged. Whole-game and town/view-root cases are tested. Mutation of copied event payloads must not change source payloads.

## Formal monthly boundary

The synchronous withCompactClone call replaces globalThis.structuredClone only within a research process and restores it in finally. No model source is modified. Every formal module's existing clone call resolves through this boundary; computation algorithms remain the actual partner-orders.mjs/town model and original collectors. No asynchronous callback is allowed. Native restore and serialize calls run outside the boundary. This is an experimental integration technique, not a proposal to patch globals in production.

One-month three-policy gates precede the retained 12-month result set. Each month compares the complete session after explicit comparison-only expansion, including core RNG, all town arrays, order/IDs, shops, history, ledger, recall and slots. The expanded comparison object is discarded, never assigned back to the next compact month. Source hashes and lengths prove source independence. Explicit expansion metrics plus view allocation guards and source audit distinguish traversal from array construction. Traversing all events/arrivals is not the same as constructing a full arrivals array.

The actual formal monthly path touches arrivals only through append and quantization; quantization visits canonical events, and repeated quantization of baseline arrivals is idempotent at this boundary. Lab export and formal serialization are deliberately outside compact execution. View map/filter/full-slice and hydrate reject during guarded execution. Methods allocating bounded suffix arrays are explicitly counted.

## Map boundary

The existing map source is loaded read-only. A single asserted guard replacement accepts ordered iteration; relative imports are resolved, and original source SHA is recorded. No rendering statement is changed. The iterator and display-only at(index) accessor produce exactly equal mapProgress results, including Set shop membership. Direct original mapProgress on a view still silently ignores arrivals; a negative test catches this. The returned map aggregates do not express arrival order, so whole-session ordered equality and independent index tests cover order separately. Small display allocations are allowed; no full arrivals copy is made for each map read.

## Formal save, validation and cap

The v8 session's game wire representation already stores arrivals:null and events as canonical bodies. save-codec.expandFormalGame derives an ordinary array; compactFormalGame requires exact ordinary-array JSON equality to filtered event records and a roundtrip-identical JSON string. MAX_FORMAL_CODE_UNITS is 6,016,384 (strict less-than); session limit 6,017,408. These UTF-16 JSON lengths are not heap bytes or disk bytes. Formal model restore independently validates full replay and full JSON equality. Research compact objects are not valid formal saves, and have no implicit JSON serializer.

Order, ID uniqueness/type, count, indexed event membership, and value equality can be checked streaming without a full arrivals object array. Exact expanded JSON length could also be accounted streaming, but requires a specified canonical serializer and tests for escaping, property order, surrogate/code-unit length and alias semantics. No such replacement validator or cap change is made here. Formal serialization still explicitly reconstructs the ordinary array and its full JSON. Initial current-formal load also expands it. This study cannot claim formal capacity/headroom or cold-replay startup solved.

Safe future migration must first use the existing v8 parser and authoritative validation, then derive a view in memory with no source mutation. That may save retained memory after load, not initial expansion peak. A different trusted compact reader would need an independently designed compatibility and validation contract. Event order/IDs and all historical records must be retained; never repair missing events by inventing records or quietly starting a new game.

## L100-4B / 4C contracts

An arrival index is disposable derived state. Rebuild it from fully validated events in canonical order; do not persist private class fields. If only a persisted index/cache is corrupt, discard it and rebuild from independently valid events. This research rejects an inconsistent live view rather than silently repairing it inside cloning. If events are missing, reordered, duplicate or corrupt, index rebuild is not recovery: stop and retain original bytes, then use a separately validated old save/backup if available.

Checkpoint must bind model/rules fingerprint, exact operation-prefix digest and length, RNG, game state, replay context, collectors, origin and generation identity. H1-A2 documents Maps/context not derivable from current game alone. H1-A3/H1-A4 creator validation, commit-last publication and fallback contracts can be reused as requirements, not assumed proof for this different runtime representation. Hashes detect accidental corruption and correspondence, not legitimacy of a forged checkpoint. Arrival indexes can be regenerated after the event generation is accepted.

Split event segments, tail, collectors and manifest must be bound to the same generation/commit IDs and hashes; never combine individually valid pieces from different generations. Commit the manifest last, validate a full candidate before exposing it, retain last-known-good bytes until new generation is complete, and never overwrite a failed original with a fresh game. This repository still uses the existing single-key formal storage; no IndexedDB, checkpoint adoption, durable backup or recovery implementation is added.
