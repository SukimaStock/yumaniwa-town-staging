# v0.6 formal restoration measurements

The Node harness is adapted from the preserved v0.5 protocol and phase loader in
`recovery/ambertime-perf-v05-20261112`, `works/ambertime/design/restore-perf-v05/REPORT.md`.
It uses the immutable `AmberTime-v03-five-strategy-proof.zip` fixture package.
It checks every entry in its `SHA256SUMS.json` before starting.

```sh
python3 works/ambertime/design/restore-perf-v06/run.py \
  /absolute/candidate/repo /absolute/ambertime-v03-capacity /absolute/new-results
```

Each strategy starts three **sequential, separate processes**: original session
formal serialization; cold formal restore, whole-session comparison, next month,
comparison to independent frozen next-month oracle and formal resave; second cold
restore, whole-session comparison and canonical resave. The launcher retains no
parsed oracle. All session keys, not just selected fields, are compared exactly.
The original 1200-month career is reused, not generated again. Initial and next
wire strings must also match the original canonical v9 wire strings.

Use `--mode baseline` on an independent old checkout for comparable fresh cold
restores and canonical resaves. Use `--strategies regional` for one strategy.
Use `--mode profile` in a distinct run to collect logical copy volume. Profiling
stringifies each clone input and adds substantial overhead; its elapsed time and
memory must not be used as the ordinary performance comparison.

`restoreBeforeOracle` captures memory **before reading the expected state**.
`peakRSSKiB` is the OS process high-water mark, so it covers Node, loaded code,
wire data, replay and validation. It is not iPhone memory, not JS live heap, and
not a pure allocation count. Current `heapUsed`, `heapTotal`, `external` and
`arrayBuffers` are also recorded. The later snapshot includes oracle comparison
and continuation costs and must not be substituted for the restore-only value.

Phase timings are nested and must not be summed. The helper and native clone
counters can overlap (a helper delegates to native), so their volume/times must
not be summed either. `logicalJSONCodeUnits` is a serialized logical-volume metric,
not allocation bytes; cyclic/non-JSON inputs are counted separately. Loader
source anchors fail closed if the runtime changes incompatibly.

Every subprocess emits a final result JSON and records command, Node version,
commit/tree, dirty status, fixture hashes, script/loader hashes, timing, memory,
copy counts and operation count. `process-results.json` records every exit code;
only `complete: true` with `allProcessesNormalExit: true` is successful. Existing
results and generated wire files are never overwritten. Native IndexedDB,
Chromium and iPhone results belong to separate tests.

For previous+head startup, run `node two-generation.mjs REPO FIXTURES regional`.
This invokes real `bootMainIdb` and both formal readers with mock readonly IDB
request scheduling. It records both formal reader calls and compares both full
session SHA-256 values to independent original sessions after the timing/memory
snapshot. It is not a native browser result. Its output JSON must be captured
alongside the command, candidate SHA and process exit code.
