# S3-D1-R — strict canonical-candidate repair

## Decision and scope

The **bounded D1-R rejection repair and 1/3-month regression passed in the stated independent-fixture-anchor contract**. D1 overall is not complete, formal save remains unsupported at this size, S3 remains incomplete. Keep #856 Draft; no merge, Pages deployment, D2, 12-month run, nine-boundary extension, old-v8 extension or browser acceptance.

Base #856 head: ff4132323d75b628f99af347516c6d97c2dd19c7. Same research-only files; formal model/save/validator/caps/Canvas/UI unchanged. The repair plan was generated before implementation, but a missing stdout redirect meant its lock file/commit was not persisted first. This process deviation was discovered at publication preparation and disclosed; the lock is now retained in a later commit rather than falsifying earlier history. The existing D1 research scope was not exceeded. Original report, failure and benchmark artifacts remain preserved. `evidence/repair/` contains new results.

## Failure first, then repair

The original `reproduce-rejection-failure.mjs` was run before edits and exited 1 with Missing expected exception. The same assertion now exits 0 because shadow history is rejected before hydrate. We did not replace the expected rejection with expected acceptance.

D1's overwriting construction remains only after validation. `validateCandidate` first checks:

1. JSON-derived data domain (no dropped undefined/nonfinite/accessor/sparse fields).
2. Exact envelope keys and version; active container path.
3. Absence of **all** active town events/attempts/arrivals, even correct duplicate bodies.
4. Exact table keys, nonempty unique ordered schemas, unique property names.
5. Row width, dense ordinal, valid schema ID, first-use schema order, every schema used.
6. Current town e1…eN event identity/order and backwards source links; available source month/release consistency; attempt source membership/time.
7. Exact ordered complete arrival positions matching actual arrival events.
8. Unique complete townKeys, retaining arbitrary legitimate nonhistory game fields.
9. Self-integrity and independently fixed candidate anchor.
10. Only then hydrate; independently compare full game and input hashes.

`decode` cannot build restored history/game objects before `validateCandidate` returns. Inspection reads schema rows directly; validation still traverses and hashes all content. It is not a claim of zero allocations or a streaming formal validator.

## Independent-anchor contract and limits

The research `anchor(input)` now additionally records the exact candidate hash, computed from the independently known input, alongside game/input hashes. This detects deleted/reordered content and changed town-key order before hydrate, even if the untrusted candidate's own hash is recomputed. No serialized candidate gets to choose its trusted anchor. Anchor generation incurs an additional encode and its cost is measured below.

This is a **research contract/API change**, not a save-format change: candidate version/content itself is unchanged. It does not authenticate who created persistent data, validate a maliciously replaced original anchor, prove original game-model correctness or replace formal replay. Source checks preserve absent optional values instead of manufacturing them; they do not constitute a comprehensive native semantic schema. Unknown legitimate active game fields remain legal. Current known fixture and JSON boundary examples are covered, not every historical game version.

## Tests and independent review

- Original reproducer now PASS (exit 0).
- 80 tests PASS: 16 prior plus structural cases, both original and recalculated self-hashes, normal candidate and JSON-domain controls. Includes shadows, unknown keys, unused/duplicate/empty schema, column/ordinal/ID/source/time defects, arrivals, townKeys and integrity.
- Independent reviewer: **45/45 additional small-candidate corruptions rejected by validateCandidate before hydrate**, normal JSON exact and source input unchanged. No new wrongful acceptance found. Reviewed codec SHA256 f3e0748284b7e6f3e4dbed1bd7df94b37cf1e73934e33ac276800ace0ea124dd. Reviewer did not modify code or execute long/history/v8 extensions.
- Test-authoring error preserved: first 80-case run had 79 passes and one wrong expectation. It corrupted only integrity, then restored the exact correct hash, producing the original normal candidate byte-for-byte. We interrupted the future run, proved exact identity, and made it an explicit normal control. No codec relaxation or baseline game expectation change was used.

## Full 100-year and bounded future regression

Same wide seed42/month1200 fixture; game SHA b5701cdac0a8277abe9be432cc5dd3ea126fcedc8438a62567bfce9a80d50d55; input SHA ee2849503b2b9113b388a2c8049a1c8b650afc64821719ad7c42703fa9f14cf4. Counts remain 10,333 events, 26,221 attempts, 8,153 arrivals. Full input/game JSON exactly equal, including property order and all collector sidecars.

Fresh 1- and 3-month comparisons check every completed observed public operation, each month-end game/records/dialogue, and final full JSON. Results match previous successful outputs. One month adds 15 events/37 attempts/11 arrivals/1 delivery; three months adds 39/104/32/3. Both have zero new releases, so they do not establish new-bottling or long-period-generation acceptance. No 12-month expansion.

## Capacity and performance

Candidate remains **6,018,719 UTF-8 bytes / 5,310,769 UTF-16 units**. Hydrated game remains 9,808,696 units, above unchanged formal cap. No capacity benefit is claimed for repair.

Node v24.22.1; sequential fresh processes, three old-code runs then three repaired-code runs, no simultaneous D1 worker benchmark. Median (range), milliseconds:

| Phase | Original D1 | D1-R |
|---|---:|---:|
| Read/parse original fixture | 95.41 (93.75–101.93) | 105.73 (100.60–106.92) |
| Independent anchor creation | 200.39 (195.04–208.57) | 629.33 (628.18–637.49) |
| Encode | 263.43 (254.60–263.95) | 359.56 (358.57–360.94) |
| Decode, validation, full hash checks | 418.27 (411.66–427.98) | 669.73 (663.34–686.80) |
| Peak RSS, KiB | 264,048 (263,796–264,128) | 325,876 (325,604–325,980) |

More validation and pre-hydrate anchoring cost time and temporary memory. Decode median is ~60% slower; peak RSS rises from ~258 to ~318 MiB. Do not hide this regression or call the prototype suitable for iPhone. Full data traversal, extra canonical hashing and JSON-domain inspection are included; hydrate and validation are not separately instrumented. No formal replay/cold application/browser measurement. A later bounded memory design is required before real deployment.

## Reproduction

- `node --test works/ambertime/tests/s3-d1-codec.test.mjs works/ambertime/tests/s3-d1-r-structure.test.mjs`
- `node works/ambertime/design/s3-d1/reproduce-rejection-failure.mjs`
- `node works/ambertime/design/s3-d1/run.mjs /path/wide-1200.research.json` (strict known SHA, 1/3 months only)
- `node --expose-gc works/ambertime/design/s3-d1/measure.mjs /path/wide-1200.research.json` in three independent processes.

Old benchmark used codec extracted unchanged from base ff41323 and the same measurement harness. Raw old/new JSONL is committed. Scope/Risk/Impact and diff checks passed locally. CI status must be read for the final remote SHA; local checks do not imply CI/device acceptance.

## Still unresolved

D1's 12-month/longer progress, new-release/old-wine recurrence, nine generation boundaries, old-v8 protection, formal validator boundary, true persistence/fallback, and Safari remain unconfirmed. The correctness of an externally supplied anchor is a research assumption. D1-R repairs the candidate-rejection defect only. Request author judgment before resuming any remaining D1 work.
