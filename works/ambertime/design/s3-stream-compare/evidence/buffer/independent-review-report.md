# Independent technical review of buffered B1

2026-11-08. Read-only implementation review with reviewer-owned small tests. This is a technical result, not HQ approval, owner acceptance, formal-save adoption, D1/S3 completion, merge permission, or production evidence. No 100-year simulation, full-size benchmark, or new formal-wire generation was run by this reviewer.

## Reviewed versions and result

- B0 compare.mjs SHA-256: `f3c994374c6ed5b31587b8f7e053a695d238ae63ba77049dca58cf9da0bf93cb`, unchanged.
- B1 compare-buffered.mjs SHA-256: `de13fea88904586b7d2d627640517e32529fb2d79f57986162cb5849e8efda04`.
- D1-R codec.mjs SHA-256: `f3e0748284b7e6f3e4dbed1bd7df94b37cf1e73934e33ac276800ace0ea124dd`, unchanged.
- Final reviewed measurement runner SHA-256: `95398905c8fdcd28241e4882b819294fab7dfb85658f02dccafa8915afd95083`.
- Buffered formal-wire protection runner SHA-256: `1f5b321952ccaed06b7b574dea9e9b9c58fa77d94be6b612cee4ef749ed15b3b`.
- Repository HEAD at final inspection: `32e6ce9a3fa8f1266be6a85d1c25daad6d949ce7`. Earlier tests were run while the author was committing the same comparator bytes; the exact file hashes, not a moving HEAD, identify test targets.

No remaining B1 comparator defect was found after the location-state correction. The inherited strict codec is called before any reference-file read. All-input comparison includes all sidecars, keeps separate game/output hashes, performs direct unit comparison, checks both EOF directions, verifies the pre-read reference hash, and verifies raw bytes again during comparison. Candidate objects are not modified.

## Tests actually run

- New independent boundary suite: 31 PASS, 0 FAIL, 0 skipped. `independent-review-final.tap`.
- Implementation's B1 suite rerun: 76 PASS, 0 FAIL, 0 skipped. `independent-review-implementation-tests.tap`.
- Existing independent adversarial suite rerun against B1: 31 PASS, 0 FAIL, 0 skipped. `independent-review-inherited-tests.tap`.
- Total: 138 passing tests across these three suites. Assertions inside parameterized tests cover more individual cases; these are test counts, not an invented assertion count.
- Node syntax checks passed for the comparator, measurement runner, and protection runner.
- Updated measurement supervisor was invoked with deliberately nonexistent fixture paths. The first worker failed; the parent rejected the run with exit 1 and did not report success. `independent-review-supervisor-failure.log`. This is expected failure evidence, not a benchmark result.

Commands from repository root:

```
node --test --test-reporter=tap works/ambertime/design/s3-stream-compare/evidence/buffer/independent-review-boundaries.test.mjs
node --test --test-reporter=tap works/ambertime/tests/s3-stream-buffered.test.mjs
AMBER_REVIEW_COMPARATOR_URL=../compare-buffered.mjs node --test --test-reporter=tap works/ambertime/design/s3-stream-compare/evidence/reviewer-adversarial.test.mjs
```

The new suite checks every ASCII mismatch offset and every truncation offset of a compact complete fixture against B0 at capacities 1/7/16384; game first/middle/last among all seven root positions; both scopes; game sizes exactly 4096/16384 plus or minus one UTF-16 unit; exact 64KiB EOF; changed raw bytes with identical decoded Unicode; actual bounded string hash inputs; frozen candidate/round-trip immutability; alternating schemas, numeric-index properties and arrivals; and strict non-JSON domain rejections. Inherited tests cover all control characters, lone and paired surrogates, real multibyte file boundaries, finite number formatting, missing/null differences, special names, ID/order/source/time/release integrity, malformed tables, all six sidecars, and deterministic differential cases.

## Findings and preserved failures

1. Initial B1 SHA `750c1c099584e525c399ffa91f228ac7c5220e46a42e21ce2050237663996317` used object identity to locate the special town node. The unchanged validator accepts acyclic shared references. An alias can preserve candidate bytes and its independent hash while making a sidecar point to the stripped town object. B0 accepts; the initial B1 inserted histories again in that sidecar and falsely rejected it. The actual original output and reproduction are preserved in `independent-review-original-alias-reproduction.txt`. The author replaced identity detection with fixed-depth structural location state. Four normal alias regression tests now pass, without changing candidate bytes, anchors, codec, or B0.
2. The first full independent suite ran after the alias correction: 30 PASS / 1 FAIL. The failure was reviewer probe accounting: its monkeypatched open counter also counted the probe's own write-open. The comparator's expected during-read-hash rejection already passed. The probe now counts read mode `r` only. Original TAP and hashes are retained in `independent-review-initial.tap` and `independent-review-initial-sha256.txt`. No product expectation was weakened.
3. The original measurement runner enforced the 768MiB ceiling only after worker completion. The final runner adds parent `/proc/<pid>/status` RSS sampling every 50ms and SIGKILL on sampled RSS above 768MiB, a 120-second timer, and output limits. It retains the worker lifetime high-water rejection, so peaks missed between samples still fail the result. This is sampled safety supervision, not an instantaneous OS-enforced RSS cap. Supervisor branches for actual over-limit RSS and timeout were inspected, not triggered with large allocations or a two-minute wait.

## Memory bound: precise scope

The B1 success traversal retains no history-row object array, no reconstructed arrivals array, no complete output string, and no growing diagnostic span collection. Output aggregation is capped at the selected 1..16384 UTF-16 units. Incremental escape scratch is at most capacity plus five units before emission. Each text hash may retain one high surrogate. The file reader uses one 65536-byte buffer plus bounded decoder state and the decoded current block. Two current schema-layout caches replace per-row retained state. Actual string hash feeds were instrumented in a small test and remained within capacity plus one surrogate unit.

This does not make the entire operation constant-memory for arbitrary input. Schema layout size depends on current schema width; object key arrays and recursion depend on object width/depth. Failure diagnostics rewalk and allocate bounded-key logical paths whose total size depends on depth, while the paused first traversal is still on the stack. The unchanged validator retains its existing complete-candidate stringification, ID maps and other allocations. No claimed comparison bound should hide those costs.

## Preparation and formal-wire review

The measurement runner uses sequential fresh workers, rotated order, the same Node heap/GC flags, fixed fixture anchors, and three repetitions per group. Preparation and comparison execute in the same worker for old-B0/old-B1/improved-B1; the reported whole-worker high-water RSS is not obtained by adding or subtracting phase maxima. Improved preparation releases the raw/game/original scopes earlier and omits the optional game-reference file without changing candidate bytes or the independent raw/game anchors. Forced GC appears only after measured timing and memory snapshots. Preparation substeps and comparison are reported separately as well as together.

The 50ms parent supervisor is outside the measured worker. Worker process-lifetime RSS includes startup/imports even though timed work starts after imports (`moduleLoadIncluded:false`). Filesystem cache is uncontrolled, and these are not formal cold-replay results.

The protection runner differs from its immutable baseline only in importing B1. Existing formal-reader recovery, unchanged-original checks, no-original SAFE_STOP checks, and the explicit disclaimer that interruption is truncated in-memory candidate text are preserved. Its reuse path computes an anchor from the file present at run start; it does not itself prove that file matches the previously recorded wire. The author will capture external pre/post SHA checks against the known preserved wire SHA in the final run. No claim about browser atomicity/durability or old-wire rediscovery is justified by this script.

Full-size equality, benchmark performance/peak results, reused-v8 external SHA evidence, final scope/risk/impact gates, remote exact-head checks, and any final PR status are outside this review's execution and must be reported from their actual separate evidence.

## Final measurement artifact audit

The author subsequently supplied the completed runs. This section is a read-only audit of their evidence, not a new benchmark execution. `final-measurements.json` SHA-256 is `1aa7ce6878d6ab6e93ef8f7f4f4e6b7e9af162b51eb63b24c0d6ce1d95d60dcf`. Comparator and runner file hashes still match the reviewed versions above and `identity-final.json` binds them to code commit `32e6ce9a3fa8f1266be6a85d1c25daad6d949ce7`.

All 18 rows passed independent artifact-consistency assertions: three repetitions of each of six modes; exact rotated sequential order; identical Node v24.22.1/Linux/x64/CPU and `--expose-gc --max-old-space-size=512` flags; 16384-unit capacity; identical raw/candidate/game anchors; all-input equality including sidecars; 10645147 output UTF-16 units and 11873989 UTF-8 bytes. Every B1 row reports 2329289 emitted pieces aggregated into 652 output/hash chunks, 599 game hash updates, two schema-cache slots, and zero retained diagnostic spans. End-to-end totals include preparation and comparison in one worker, with less than 5ms orchestration overhead beyond their measured substeps. Only improved preparation omits the optional game-reference file.

Recomputed medians and run ranges (milliseconds / MiB, measured worker high-water RSS):

| Mode | Total ms median | Total ms range | RSS median | RSS range |
| --- | ---: | ---: | ---: | ---: |
| A, restored state plus direct equality | 705.79 | 687.40–705.81 | 220.42 | 220.14–220.47 |
| B0, comparison including candidate load | 2530.20 | 2410.66–2562.45 | 162.87 | 162.33–164.09 |
| B1, comparison including candidate load | 683.37 | 651.88–717.59 | 130.66 | 130.48–131.46 |
| Old preparation + B0 | 2836.84 | 2824.90–2853.18 | 341.27 | 341.01–341.27 |
| Old preparation + B1 | 1171.98 | 1094.54–1175.27 | 341.02 | 340.96–341.59 |
| Improved preparation + B1 | 1171.17 | 1128.84–1195.32 | 288.56 | 288.49–289.72 |

Interpretation is limited to this fixed fixture and these three-repeat runs:

- B1 versus B0 reduces median comparison-worker time by about 73.0% and measured peak RSS by about 19.8%.
- B1 alone does not meaningfully reduce old-preparation end-to-end peak RSS; it remains approximately 341MiB. The memory cost of preparation must not be concealed by reporting only comparison workers.
- Improved preparation reduces old-B1 end-to-end median peak RSS by about 15.4%, approximately 52.46MiB. Its time median is effectively unchanged and repeat ranges overlap. The data do not support a preparation-speed improvement claim.
- A and B1 time ranges overlap. B1 has lower measured RSS, but the small latency-median difference is not evidence that it decisively outperforms A on time. A additionally returns a reconstructed whole state and therefore has a different output responsibility.
- These are descriptive medians, not statistical confidence estimates, asymptotic guarantees, formal cold-replay performance, or adoption evidence.

Live supervision appears in all 18 rows: 50ms interval, 14–58 samples per worker, 568 total samples. Maximum sampled worker RSS was 340.20MiB. Maximum worker high-water RSS at measured completion was 341.59MiB. Maximum measured work duration was 2853.18ms. All are below their configured limits. The sampled peak is safety evidence, not the metric used to replace process high-water RSS; sampling can miss short peaks and may also continue after the measured endpoint. The reviewed runner separately rejects a completed measured high-water result above the ceiling. No actual RSS-kill or timeout branch was deliberately triggered during this review.

`independent-review-final-metrics.json` contains exact per-run aggregates, source hash, assertions outcome, environment, and supervision totals.

The final `final-baseline155.tap` and `final-b1-138.tap` artifacts report 155/155 and 138/138 PASS respectively, with zero failures and zero skipped tests: 293 tests in that final run. These include the independently authored boundary tests, rather than being 293 additional independent tests. This audit inspected their final logs; it did not rerun them.

`identity-final.json` and `final-v8-protection.json` both preserve the previously recorded 24-month original wire SHA `48751764f194f0e9909abd1186db79fa9d50b832ecbb14a776b5b8eb94198693`. The final protection result reuses that wire, has null simulation/writer timings, and records ten rejection/fallback cases with unchanged-original and no-original SAFE_STOP checks. The earlier limitation on rediscovering a different old wire remains. There is no claim of a new simulation, actual interrupted disk write, browser durability, or formal-save rollout.

No new technical blocker was found in these final artifacts. Remote exact-head checks, final scope/risk/impact decisions, and PR status remain the parent's responsibility and are not inferred from local evidence.
