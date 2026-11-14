# D1-F validation and reproduction

See D1-F-REPORT.md for input/version/plan gate and limitations. Frozen codec and all official files unchanged.

## Executed
- Existing codec/structure regression:80 passed; `evidence/final/regression.log`.
- `node works/ambertime/design/s3-d1/f-future.mjs INPUT OUTPUT`:12 months,18 public mutations, exact whole game/sidecar/dialogue pairs. Completed independent-module output in evidence. Aborted shared-cache run preserved separately and not counted.
- `node works/ambertime/design/s3-d1/f-v8.mjs OUTPUT`:new24month formal v8, exact original protection,9 rejection/fallback cases. No historical wire identity claim.
- `node works/ambertime/design/s3-d1/f-history.mjs OUTPUT`:nine frozen historical material oracle matches; current3 completed recalls and historical release profiles preserved. This script expects the original and completed research snapshots at the /tmp paths used by F1.
- `node --expose-gc works/ambertime/design/s3-d1/f-measure.mjs prepare INPUT DIR OUTPUT` then `cold INPUT DIR OUTPUT`, three sequential fresh processes each. Timing-only instrumented copy; exact output comparison. Raw evidence retained.

## Acceptance matrix
| requirement | result |
|---|---|
| source game SHA; full JSON/town order/individual records | pass, exact roundtrip |
| each public mutation;1/3/12month continuation | pass |
| new release and actual sales | pass, release50 |
| older release resale | pass43/44/45; decades-old scenario not established |
| RNG, ID/source, all game fields | pass within compared continuations |
| dialogue output and existing recalls unchanged | pass in executed12months |
| nine current generation transitions and future recall effects | unverified; frozen old oracle is not equivalent |
| malformed candidate regression |80 existing tests pass;9 F2 recovery cases pass |
| normal v8 original unchanged | pass on newly generated24month wire only |
| historical10/30year original wire protection | unavailable, not claimed |
| fresh-process codec resource comparison | pass measurement, mobile feasibility unverified |
| formal100year save/reload, browser/Safari | not established |

## Independent review and limits

Read-only reviewer audited runners and source contracts. It noted that initial F1 status alone did not assert all scenario goals; stored results were independently inspected and `f-history.mjs` adds explicit release-sale and preserved-memory assertions. It also noted whole-process memory must not be labelled restore-only. Both limitations are reflected in the report. No extra model/codec fixes were made. Historical nine-boundary dependencies differ, so their successful oracle comparison is deliberately not promoted to current-model proof.

All new evidence is distinguished from D0/D1/D1-R and old checkpoint evidence. Plan-only commit precedes every new implementation/testing action. Draft #856 only; no merge or Pages. D1 remains incomplete pending author decision on remaining bounded verification.

Additional review: release43 resale at1210 was174months after bottling, not decades. Interrupted candidate creation uses a deliberately truncated file, not a killed process. Fixed historical source SHAs and nine-row count are now asserted. Completed recall JSON string equality is explicitly asserted. No malformed acceptance was found.

### Added bounded current-model boundary
Command: `node f-future.mjs /tmp/s3-d1-f-final.research.json OUTPUT 36 82ec4f599a4bf126e4129467be05280d0286e57ff002a3c283cc346ec7a34226 SNAPSHOT` (from the runner directory, or use full runner path). Months1213–1248:98 returned states and36month checkpoints exact. Generation4 handover1237, next generation through1248,662candidates/967context entries. All collector content and scene text included in per-operation equality. Current confirmed newly executed boundaries:1, NOT9. The original twelve-month result remains unchanged; its runner has only been parameterized for this explicitly bounded extension.
