# Independent implementation review

Scope: isolated JSON-derived sequential comparison research on branch `feat/ambertime-s3-stream-accepted`, with accepted lock commit `c722a4b892310d5b613a504bbda0a306d08aaa04`. This is technical review evidence, not Owner/HQ approval, formal acceptance, replay provenance, persistence durability, or permission to merge.

## Final result

No unresolved blocking defect found in the reviewed bounded scope. Two independently reproduced defects were corrected by the implementation owner. The reviewer did not edit implementation, baseline codec, or the main test suite, and did not run the 100-year fixture or benchmarks.

Reviewed final comparator SHA256: `f3c994374c6ed5b31587b8f7e053a695d238ae63ba77049dca58cf9da0bf93cb`.

Unchanged D1-R codec SHA256: `f3e0748284b7e6f3e4dbed1bd7df94b37cf1e73934e33ac276800ace0ea124dd`, matching the supplied exact PR856 baseline identity.

Independent final command on Node v24.22.1:

```sh
node --test --test-reporter=tap works/ambertime/design/s3-stream-compare/evidence/reviewer-adversarial.test.mjs
```

Result: 16 tests passed, 0 failed. One test contains 64 deterministic JSON-derived differential cases. Full output: `reviewer-final-small.tap`.

## Findings and fixes

1. **P2, resolved: full-key stringify defeated bounded scalar escaping.** Original `keyPath` called `JSON.stringify(key)` before emitting the key incrementally. A JSON-derived 32,768-unit key with `chunkUnits: 7` returned equality, but instrumentation observed a complete 32,768-unit standalone string passed to `JSON.stringify`. Chunk length alone did not establish the accepted key-escaping boundary. The fix formats at most 80 key units for diagnostics and labels truncation plus the original unit count; actual serialized keys remain complete and incrementally escaped. The independent regression passes, including exact global UTF-16 mismatch offset and the explicit truncated-path marker. A truncated diagnostic path is not necessarily a unique full property identifier.

2. **P2, resolved: an incomplete decoded UTF-8 prefix was mistaken for EOF.** Original `fileReader.next()` returned `StringDecoder.write()` directly. A legal short byte read can provide only the first byte of a multibyte code point and produce no decoded units. Capping `fs.readSync` to one byte made an otherwise equal JSON input containing `😀` fail with `reference ended before candidate`. The fix continues reading until decoded text or actual byte EOF. Independent one-byte fault injection and real 64KiB-boundary cases now pass. This was a deterministic short-read robustness failure, not an observed failure of the default local fixture read.

The original comparator SHA256 was `c6b509a61e678766f0b089af4e61b78f2a82285b411273698407d227b642def3`. Its preserved source is `before-review-fixes-source.txt`; the implementation owner's original 42-pass/2-fail regression output is `before-review-fixes.txt`. The reviewer additionally reran only the two failing probes against the original snapshot and preserved 0-pass/2-fail output in `reviewer-before-repro.tap`. That rerun adapted only the codec import URL for the relocated snapshot and disabled stack traces to avoid embedding a long data URL. It did not change comparator logic or expected results.

## Independently checked behavior

- Native JSON ordering for integer-like schema/town keys, non-index key order, nested arrays, missing versus null, numeric edge representations, and empty histories.
- All control characters, paired/lone surrogate classes, escaped key/value text, chunk sizes 1 through 9, supplementary Unicode in first-difference offsets, and 64KiB reference boundaries.
- Frozen candidate objects compare successfully without mutation. Code inspection confirms row values are read through schema/ordinal views and arrivals reuse event row positions; the emitter has no full history hydration, arrival-object clone array, array-wide key enumeration, or full-output join. A separate guard rejects any `JSON.parse` during comparison. That guard alone does not prove absence of every possible cloning technique; the source review supplies the rest.
- Both EOF directions reject correctly. Reference content changed between prehash and the comparison read is refused. An invalid UTF-8 byte that decodes to U+FFFD cannot pass the raw-output hash check against a literal U+FFFD candidate.
- Source order/time/release faults, duplicate schema keys, duplicate arrival positions, duplicate town keys, wrong row width, and shadow history fields reject before opening a missing reference.
- Full-input output and game hashes are independently checked after unit-for-unit text comparison. Scope is explicit; game-only comparison does not claim sidecar comparison.

Some adversarial cases intentionally reseal integrity and replace `candidateSha` after modifying the candidate. This isolates post-anchor serialization and enumeration behavior. These cases do not show that a modified canonical candidate could pass unchanged independent original anchors. Real callers must keep all independently established anchors fixed.

## Limits and remaining disclosures

- The unchanged validator still traverses the candidate, uses whole body/candidate stringify allocations, an ID Map, and an arrival-position array. This review does not claim bounded total process memory or O(1) memory.
- Source inspection plus frozen-input tests support synchronous, non-mutating traversal for the stated JSON-derived domain. Generic JavaScript proxies, getters, and hostile monkeypatches that mutate candidate objects are not the input contract.
- Auxiliary emitter state depends on nesting depth and object/schema width. Bounded key diagnostics do not remove recursive depth limits inherited from the baseline validator and traversal.
- Review did not rerun historical large-file results, three-pair memory measurements, repository gates, exact-commit CI, formal reader checks, browser/Safari tests, or deployment. Those remain the parent task's evidence and limitations.
- A final diagnostic marker spelling change affects only long-key error presentation. Large-file equality evidence must still be described with its actual tested implementation identity rather than silently relabeled as a different exact SHA.

## Follow-up: bounded v8 protection runner

Reviewed only the narrow `protect-v8.mjs` change against `v8-runner-before-label-correction.txt`, plus initial/final result records. Reviewed runner SHA256: `b8c21a472b41b4340f1e6c00f8edf18470d981507c1471a89b30a58e34123d99`. No simulation, runner execution, or heavy comparison was performed by this follow-up reviewer. The comparator remains at the previously reviewed `f3c99437…` identity.

- **No original-overwrite defect found in this change.** Creation still requires absence and uses exclusive `wx`; reuse reads the original and skips simulation/writing. The derived reference is reused only after exact content equality, otherwise newly created with `wx`. Reuse is read-only for the preserved original, not a guarantee that a missing derived reference file will never be created.
- Independently read the preserved wire as raw bytes: SHA256 `48751764f194f0e9909abd1186db79fa9d50b832ecbb14a776b5b8eb94198693`, 209,412 bytes. Those values match both the initial and final records. Its `recallRecord.generation` exists and equals 1; the added `generation++` therefore changes a real generation field. The old misleading case name is corrected to `elapsed` without discarding the initial source/log.
- The supplied final record contains 10 refusal/fallback cases, all with original-preservation and no-original safe-stop results. These are reviewed recorded results, not independently rerun results. Integrity is resealed where specified, while independent candidate anchors remain unchanged. Generation and elapsed changes are rejected at the independent candidate anchor, not demonstrated as separate semantic generation validation.
- Source inspection confirms fallback checks the preserved original SHA and requires the existing formal reader's complete returned input to match the original. This is isolated recovery research, not a production save-path integration or proof of browser persistence.

Two reporting qualifications were sent to the implementation owner:

1. The reviewed reuse result still says `readerTiming: "same process after writer, not cold"`. No writer runs in reuse mode. The measured read instead follows an earlier reader call in the same process. It is not cold, and `simulationMs`/`writerMs` correctly remain null. The timing description should distinguish creation from reuse.
2. `candidate-write-interruption` and `truncated` both inject the same first-100-units truncated JSON string. This is an interrupted-output simulation, not an actual filesystem write interruption, power loss, atomicity, or durability test. The report must preserve that distinction when counting the two labeled cases.

No further code defect or unsafe original write was found in this narrow review. The historical-wire search claim was not independently repeated; the new wire must continue to be described as this task's newly generated input, not a recovered historical artifact.

## Finalization review: exact source and content-layer refusals

Final comparator review target is commit `0fe93830045c98e4d9adf46deba8fe1b7f0420c1`, comparator SHA256 `f3c994374c6ed5b31587b8f7e053a695d238ae63ba77049dca58cf9da0bf93cb`. The working comparator and `git show` of that exact commit have the same hash. The unchanged codec remains `f3e0748284b7e6f3e4dbed1bd7df94b37cf1e73934e33ac276800ace0ea124dd`. The matching measurement runner at that commit is SHA256 `71bc9714dc5f54d0f566c5e8663089815e5744ddf86ec2f6014498069d2dd9ee`. New review evidence/tests and v8 reporting corrections are subsequent working-tree changes; this section does not label an unknown future PR head or its CI as verified.

The existing 16 reviewer cases covered a late value mismatch, general EOF behavior, and malformed candidates, but did not separately certify all requested first/middle/last positions and six individual sidecars at the content layer. Added 15 isolated reviewer tests, with no comparator/codec edits:

- Three tests corrupt exactly the first, middle, and last reference UTF-16 unit. They retain the valid original candidate/game anchors and deliberately set the test reference anchor to that corrupted reference. Each first proves `validateCandidate` succeeds and the reference hash matches, then requires `stage === 'content'`, `independent content mismatch`, the exact offset, and both differing units.
- Three tests change a value in the first, middle, and last of five historical event rows, retaining valid structure and original input/game anchors. They intentionally reseal integrity and candidate SHA only, prove validation succeeds, then require direct content rejection at the exact event row/field path and offset. This demonstrates the row-view comparison rather than a structural or candidate-anchor rejection.
- Six tests truncate the reference inside each sidecar value: `userPaused`, `elapsed`, `caskSlots`, `recentLedger`, `historyRecord`, and `recallRecord`. The candidate remains valid and frozen; only the test input reference hash is aligned with the deliberate truncation. Each case requires `stage === 'content'`, `reference ended before candidate`, the exact cutoff, and that sidecar's path.
- Three tests inject a missing historical row, an extra historical row, and reordered historical rows into the reference JSON only. The original candidate remains valid and frozen. Each test aligns only its reference hash, explicitly passes candidate validation, and requires a direct content mismatch at the independently calculated first different unit and events path. These cases are separate from candidate structural faults.
- All 15 cases run at chunk sizes 1, 7, and 16,384. These controlled test-anchor substitutions are solely to reach and isolate the comparison layer. A corrupted/truncated reference is a fault-injection fixture, not a newly accepted JSON input or permission to substitute production anchors. Real use retains independently established anchors unchanged.

Reran the full reviewer suite, including the original 16 cases and 64-case differential corpus, on the exact comparator above:

```sh
node --test --test-reporter=tap works/ambertime/design/s3-stream-compare/evidence/reviewer-adversarial.test.mjs
```

Result: **31 passed, 0 failed**, recorded in `reviewer-finalization-small.tap`. The earlier 16-case log is preserved. Also reran the existing 44-case main comparator suite, recorded in `reviewer-stream44.tap`: **44 passed, 0 failed**. Its `independent direct content comparison catches altered value even if candidate hash supplied for altered candidate` test changes only the `elapsed` sidecar, reseals the candidate test anchor, and requires `stage === 'content'` with an elapsed path. Thus sidecar-only value change is independently covered without structural/anchor interception, in addition to the six new sidecar-truncation cases. No large fixture, benchmark, simulation, formal save suite, or CI was rerun by this finalization reviewer. No new implementation defect was found.

### A/B assurance and output distinction

Inspected `measure.mjs`, the current report, manifest, and `final-comparison.json`; checked all six recorded results and independently recalculated the medians without executing the measurements again. The evidence contains A/B/A/B/A/B results for repetitions 1 through 3. Every result reports input scope, all sidecars, 10,645,147 UTF-16 units, 11,873,989 bytes, original SHA `ee2849503b2b9113b388a2c8049a1c8b650afc64821719ad7c42703fa9f14cf4`, and game SHA `b5701cdac0a8277abe9be432cc5dd3ea126fcedc8438a62567bfce9a80d50d55`.

- Both paths use the same unmodified candidate validation and independent candidate/input/game anchors, and directly compare complete game plus all six sidecars against the known original. A validates and hashes through `decode`, then compares native full JSON. B compares schema-backed output incrementally and checks both emitted input and game hashes. This is equivalent assurance of equality to that known input, not proof of formal computation provenance or future play behavior.
- A additionally materializes a full legacy input via `decode`, including row and arrival objects, then a complete JSON string. B returns equality/hash/timing statistics and never produces a playable restored game. The benchmark worker's final JSON is a summary in both modes; the materialized restoration is an intermediate result of A's decode. The measurements therefore do not compare interchangeable restoration outputs.
- Independently recalculated final medians are A **734.647399 ms / 218.84765625 MiB maxRSS**, B **2462.318485 ms / 160.015625 MiB maxRSS**. These agree with the updated report/manifest. Lower comparison-process RSS comes with slower execution; preparation still has its separate higher peak. Process maxRSS and heap snapshots are not phase-isolated retained-memory measurements. A's validation/hydration/hash timing is bundled, unlike B's boundaries.
- The final recorded result file SHA256 reviewed is `67677c9e61b9c7f39a25234cca6e410c2b95da00282d3ef4979c250a946a8075`. Recorded source identities and current matching code support this evidence review; this is not an independent rerun of the six processes.

### Closure of v8 reporting qualifications

Reviewed current `protect-v8.mjs` SHA256 `c376597a243fbab7fc6f6e23352d5187f13169af923847167df94b9b0570618f` and `v8-protection-exact.json`. The reporting corrections now explicitly distinguish reuse after an earlier reader call from creation after a writer, and identify the interruption case as truncated in-memory candidate text with no actual interrupted file write. The exact result records 10 cases on the same newly generated original SHA and leaves simulation/writer timings null in reuse mode. Earlier misleading metadata is retained as historical evidence. These two reporting qualifications are resolved; formal save acceptance, browser durability, and historical-wire rediscovery remain outside the claim.
