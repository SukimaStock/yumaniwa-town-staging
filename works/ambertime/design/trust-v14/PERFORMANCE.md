# v1.4 independent performance evidence audit

Read-only audit of existing evidence; no repeated cold benchmark or runtime modification. These results belong to the previously measured candidate, not a new v1.4 trust design.

## Sources and identity

- [#931 report](https://github.com/SukimaStock/yumaniwa-town-staging/blob/0ef9ba32c72e0fcb87f5ed748c47865db099adb6/works/ambertime/design/restore-perf-v06/REPORT.md)
- [Harness measurement contract](https://github.com/SukimaStock/yumaniwa-town-staging/blob/0ef9ba32c72e0fcb87f5ed748c47865db099adb6/works/ambertime/design/restore-perf-v06/README.md)
- Raw JSON under that exact SHA: `results/node-v06/final-local-exact/local.cold1.result.json`; `results/node-v06/final-five/{regional,bulk,diversified}.cold1.result.json`; `results/node-v06/candidate-small-clean/small.baseline.result.json`.
- Measured runtime commit `aacc112e8f9269f17fd4cefc475837b216acd29c`, tree `5999a11191b670195bf92f7d31b48f20bb57cade`, Node 24.22.1, Linux x64. Prior report establishes 775 runtime/asset blobs equal to implementation `695a70b8e3854624c1877f3e4518e02a74d2ac48`; documentation/plan/tests differ. The report head is `0ef9ba32c72e0fcb87f5ed748c47865db099adb6`.
- Phase/copy timing instrumentation ON; per-copy JSON-size traversal OFF. These are not completely instrumentation-free timings. Logical-volume profiles are a separate, intrusive run and must not be used as ordinary elapsed-time evidence.

## Five-strategy measured phases

Seconds, rounded only for presentation:

| Strategy | Whole cold | Operation replay | Arithmetic difference | Restore peak RSS MiB |
|---|---:|---:|---:|---:|
| local |124.113|120.978|3.136|862.8|
| regional |76.513|74.842|1.671|576.4|
| bulk |73.869|72.108|1.761|606.3|
| small |159.925|157.175|2.751|809.0|
| diversified |73.917|72.337|1.580|559.6|

Replay accounts for approximately 97.5–98.3% of measured total. Phases are inclusive/nested, not independent components to sum. The arithmetic difference is not an independently measured replacement-reader time.

Across these files:
- checkpoint capture: 0.036–0.095 s, two captures;
- final game-state equality: 0.150–0.422 s;
- file read: 0.010–0.019 s;
- session JSON parse: 0.022–0.040 s;
- lossless decode: 0.466–0.846 s;
- game expansion: 0.341–0.727 s.

Local native structuredClone: 125,588 calls / cumulative 117.260 s. cloneReplayState helper: 17,671 calls / 115.573 s. These overlap with each other and replay. Do not add them. Regional intrusive volume profile reports native 8,547,324,474 logical JSON code units, not physical allocations; its 171.9 s elapsed time includes profiling overhead.

After cold restore and next-month continuation, first formal save in cold1 files: local 5.449 s, regional 2.527 s, bulk 2.580 s, diversified 2.578 s. Small's clean baseline file measures canonical reserialization 3.877 s without a next-month operation; do not relabel it as first save after next month. Oracle-inclusive memory after continuation must not replace restore-before-oracle high-water RSS.

## Separate browser evidence

[#931 exact implementation Chromium report](https://github.com/SukimaStock/yumaniwa-town-staging/blob/0ef9ba32c72e0fcb87f5ed748c47865db099adb6/works/ambertime/design/restore-perf-v06/results/native-large-raw-695a70b.json): Ubuntu22.04, Chromium151, sandbox enabled, regional century fixture only: initial verified write/readback 46.519 s; cold 44.077 s; next-month save 1.910 s; previous+head boot 44.838 s (previous43.882 + head0.851). Do not transfer Node phase percentages to Chromium. Browser process-tree RSS sampling is not unique memory; JS heap boundary samples are not peaks.

Real IDB read/write-only cost, checkpoint-read-only cost, and alternate-evidence verification cost are not isolated in these measurements. Physical disk quota exhaustion, iPhone Safari, forced OS termination/power loss are unverified.

## Bound, not a promised result

If replay and its replacement evidence validation were both free, the simple residual would be 1.58–3.14 s. This is a deliberately impossible-to-assume optimistic counterfactual, NOT an achievable lower bound proved for an implementation and NOT a forecast. A new scheme adds evidence validation, checkpoint materialization, tail replay, version/game/generation binding, canonical comparisons and storage checks. No evidence currently proves their combined cost or that full prefix replay can be omitted at equal trust.

For B/C that still replay the full prefix to validate their checkpoint, the dominant cost remains. Reducing only checkpoint creation or equality cannot remove the measured main bottleneck. For D, delaying/chunking verification may improve responsiveness, but formal-ready latency retains the required work and may increase; preview must remain non-authoritative and cannot save or play before full success.

## Previous experiment scope

- #929 `c326834feb33306b7e92c5842d19475c2a95734d`: storage protection/native small-case evidence; mock IDB two-generation boot191.675→92.911 s. Separate Node performance branch is not that native candidate.
- #932 runtime `a287c61ab694ddff16d8025ed9d746c560cf3ee9`, evidence head `ad2ce4eb562c66836e3c961e79895bd2535ef2c6`: five formal protocols passed,105 fewer copies per strategy; instrumented cold improvement/regression mixed. No reliable broad speedup or memory improvement. The report's instrumentation-OFF work is not complete evidence.
- #934 `c79c0c0313877467bec81759c4b061485987c7a4`: partitioned full copies still copy all data plus graph traversal; rejected. Century snapshot next-month Lab, not new century cold proof.
- #937 `a3a28226676bfdc9aef20179815f32f52ce72da0`: town-only36 updates improve medians; not whole-game100y cold.
- #938 `62f04704925ff2e66e7a509947d69cb208120002`: whole next-month Lab slows all five; entry/old-branch/public isolation and Proxy overhead. No candidate formal IDB100y proof.
- #939 `abef91fa419b72ea7e533039070e99f3da88b66c`:25y two-strategy gate,18 child exits/state equality. Local A12.675/B17.790/C14.536s; diversified A11.074/B10.044/C11.759s. Memory worse for all B/C; diversified B timing ranges overlap. C optimized town writes zero. Failed gate, so candidate100y/IDB tests not run.

No v1.4 alternate reader, runtime integration, merge or deployment is supported by these performance observations alone.
