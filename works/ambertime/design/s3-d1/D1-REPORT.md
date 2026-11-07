# S3-D1 — stopped at malformed-candidate acceptance

## Decision

**D1 is not passed. Stop-condition reached; do not merge.** No formal save change, D2 implementation, or Production change. S3 remains incomplete.

Independent review found that a candidate can contain an invalid second `active.game.labConnection.town.events` array. After recomputing its unauthenticated integrity hash, `decode()` overwrites that array with the canonical table rather than rejecting the conflicting candidate. The reconstructed game still matches the independent original anchor. That does **not** excuse accepting an invalid candidate: the user's malformed-input rejection gate failed. We stopped instead of repairing the prototype and presenting the later run as an uninterrupted success.

## Completed evidence before stop

Base: `b7b5473b8081ae91f69744befe7bad13188a0994` (D0 #855); Node v24.22.1, isolated Linux workspace. Plan Lock precedes code (d5d5d4f5).

Input: #854 wide/seed42/month1200 research snapshot, **not a formal v8 save**. Game SHA-256 `b5701cdac0a8277abe9be432cc5dd3ea126fcedc8438a62567bfce9a80d50d55`; 9,808,696 UTF-16 units; 10,994,786 UTF-8 bytes. Counts: events 10,333, attempts 26,221, arrivals 8,153. No 100-year resimulation.

- Whole input JSON, game JSON and SHA roundtrip matched, including town/property order and collector sidecars.
- All individual rows retained: schema keys/order plus ordinal/schema ID/value rows; arrivals derived by exact ordered event positions, independently compared during encode.
- 1- and 3-month future comparisons matched all month-end game/collector hashes and final complete JSON, plus dialogue projection. One month added 15 events, 37 attempts, 11 arrivals, 1 delivery. Three months added 39/104/32/3 respectively. A separate single-month observed-public-operation comparison also passed (1 completed operation).
- 12-month extension was interrupted upon review failure. No 12-month/multiyear claim, no new bottling or new-generation proof. New releases during completed intervals: zero.
- 16 small boundary/fault tests passed, but **the independent additional malformed-history test failed**. These 16 passes are not D1 success.
- Existing formal size guard continues to reject the 100-year full JSON. Codec representation is not a formal-save result.

## Capacity and isolated performance

Actual candidate including sidecars, schema tables, ordinals, arrival indexes and integrity field: **6,018,719 UTF-8 bytes (6.019 MB / 5.740 MiB), 5,310,769 UTF-16 units**. Whole original research input including sidecars: 11,873,989 bytes. Comparison is not merely game versus session: game alone is 10,994,786 bytes. D0's ~5.82 MB was an earlier comparison representation, not this encoder. Hydrated game remains 9,808,696 units, above the unchanged 6,016,384-unit formal boundary.

Three independent Node processes (see evidence/cold.jsonl): input read/parse 109–219 ms; encode 446–490 ms; decode plus full anchor validation 548–776 ms. Peak RSS approximately 258–259 MiB; GC retained heap about 25 MiB for input, 41 MiB with candidate, 59 MiB with hydrated copy. Peaks include deliberately simultaneous input/candidate/hydrated state. This is not acceptable evidence of iPhone feasibility. Some measurements overlapped the subsequently cancelled future process; no uncontended benchmark claim.

Retaining original research input + candidate requires at least 17,892,708 logical bytes, before an additional backup or temporary serialized copies. Decode measurement combines hydrate and validation; no independent official replay benchmark was rerun. Node is not Chromium/Safari; no persistent storage test.

## Stop and remaining work

`node works/ambertime/design/s3-d1/reproduce-rejection-failure.mjs` exits 1 with Missing expected exception. The exact defect and proposed later correction are in D2-DECISION.md; correction was **not applied**.

Original 10/30-year formal wire files could not be found. Their hash-matching research snapshots exist, but no reconstructed formal-v8/old-reader protection experiment was completed before stop. Thus old-v8 protection is unconfirmed, not passed. No input fixture was modified.

Nine historical generation-boundary oracle checks are available as prior evidence, but old dependency fingerprints no longer match current model. They are not new D1 generation tests. Current twelve-month, nine-boundary, alternate-policy/seed, old-wine resale and all-browser checks remain incomplete.

Research only; no merge or Pages deployment. D1 must return to author judgment before further work.
