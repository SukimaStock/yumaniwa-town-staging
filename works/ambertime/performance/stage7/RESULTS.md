# Stage7B / 7C — preserved replay, faster restoration

7A is PR #908, merge `a26ee5b7d2d4b9ae0c2b3cf19647da67c5168887`.
Measured model baseline is PR #907 / `001bc6cc712cc300b8f7be65018628199e97e1f0`.
Candidate model Git blob: `d9de655e57349e42e0c90b040d69d0f068e60785`.

## Change and measured result

Private `progress()` still applies every original `E.distillStep` and every
original guard, in the same order. Its temporary stepping object carries only
`core`, `still`, `tastingId`, `decisions`; after successful progress it merges
`core` and `still` onto one detached full-state copy. Zero-step calls return the
original object. Full replay, prefix checks, exact final JSON comparison and
cache validation remain unchanged. No schema, saved facts, IDs, RNG, price,
probability, threshold or persistence writer changed.

The app, active comparison reader and model cache URLs are refreshed together.
The first candidate missed the comparison-reader edge; two existing tests found
it. A fresh branch and preimplementation Plan Lock extended scope before repair.
The initial branch was not merged. No tests or gates were weakened.

Same fixture, Node24.22.1 / V8 13.6.233.17-node.58, Linux x64, EPYC9V74,
9 visible CPUs. Sequential fresh processes, one observation per case, no competing
heavy benchmark/test workload. Imports and independent envelope read/parse are
outside cold timing; restore still does its own parse. Details in baseline/ and
after/. See README for nested-timer, memory and metadata-generation limits.

| Case | Operations | Before cold ms | After cold ms |
| --- | ---: | ---: | ---: |
| Month12 | 49 | 31.075 | 20.220 |
| Month120 | 188 | 883.650 | 350.781 |
| Month360 | 551 | 7418.975 | 2474.952 |
| Month1200 | 1955 | 56529.566 | 16061.597 |
| Month1386 raw | 2266 | 63904.821 | 20792.675 |
| Month1386 formalv8 | 2266 | 61005.065 | 19359.772 |

Raw improvement67.46%; formal improvement68.27%. The post7A target of raw<=25s
was met. Twenty seconds remains a material desktop latency; this is not a claim
of instantaneous startup or acceptable iPhone performance.

| Other reference | Before | After |
| --- | ---: | ---: |
| Raw UTF8 bytes | 1,136,103 | 1,136,103 |
| Formalv8 UTF8 bytes | 1,289,728 | 1,289,728 |
| Warm formal generation + validation ms | 105.555 | 110.175 |
| Raw process peak RSS bytes | 312,381,440 | 222,699,520 |
| Formal process peak RSS bytes | 340,451,328 | 255,451,136 |

Every measured case roundtrips exactly. Warm generation did not materially
improve; it still includes the official reader and equality check. Memory is
process-lifetime maxRSS, not per-phase peak or an iPhone estimate. PR907's65.261s
was a separate raw cold observation; its186.451s metadata/roundtrip measurement
was not startup and is not substituted for this table.

## Correctness and long careers

- Focused differential suite7/7: original full-state loop versus actual private
  implementation, old/flavor/fullrange modes, 0..99, blocked/invalid/decreasing
  progress, identical errors, no-op identity, complete detached output, cold/warm
  and older partial caches, same-seed divergent prefixes, corrupt restore then
  valid restore, and enforceable four-cask limit after restoration.
- Related initial suite192:187pass /5fail. Two new cache-closure failures were
  corrected and the affected26-test set passed. Three unrelated formal-copy
  text/cache-expectation failures reproduce on the unchanged baseline (5/8pass).
  With the added cask test, final adjudicated coverage is193 unique cases,
  190passed /3known baseline failures. Existing assertions remain unchanged.
- Existing native regressions cover production/economy/inventory, all town store
  modes including department reservations, regional allocation/cancellation and
  actual deliveries, national/overseas causality, duplicate receipts, scenery,
  generations, history/recall and quota/CAS/readback failures.
- Fresh lawful public-operation careers, distant policy, seeds27/39, each add1200
  months. Final months1386/1397, generation5 (four handovers), operations2266/2276,
  peak2casks, formalv8 bytes1,289,728 /1,300,339. Seed27 raw and formal bytes exactly
  reproduce the original fixture. Source/cash/events/contracts are never injected.
  This is two seeds under one long policy, not all strategies over100years.
- Both long formalv8 saves pass fresh-process cold restoration. Seed39 is also
  read and rewritten exactly by the baseline reader. These compatibility runs
  had competing correctness work; their times are intentionally not compared.
- `equivalence.json`: baseline/candidate separate-process12-month future equality
  from month120 with10unprocessed packets, including full model, town, generation,
  formalv8, history and recall. A second comparison starts with persisted
  month1386v8 and advances its retained auxiliary records through the real tail;
  full model/town/generation/formal/history/recall/recent-ledger hashes all match
  at month1398. Initial long record has0pending packets; that case is not used to
  claim pending-event coverage.

`long-results.json` retains full metrics/checkpoints. Its inherited `coldRestore`
field is the career helper's cached same-process roundtrip, **not** a cold-start
measurement. Independent fresh-process evidence is in after/ and equivalence.json.
A combined long-running executor job stopped before seed39 completion; seed39
was rerun separately to completion. No partial run is counted as success.

Commands:

```sh
node --test works/ambertime/tests/restore-performance.test.mjs
node works/ambertime/performance/stage7/long-run.mjs /tmp/long27 27
node works/ambertime/performance/stage7/long-run.mjs /tmp/long39 39
node works/ambertime/performance/stage7/future-check.mjs BASE_CHECKOUT SAVE_V8 /tmp/base.json --records
node works/ambertime/performance/stage7/future-check.mjs CANDIDATE_CHECKOUT SAVE_V8 /tmp/after.json --records
cmp /tmp/base.json /tmp/after.json
```

## Browser boundary

Shared Chromium baseline at1363×936: all6map scales, M0half/full/half, zoom,
pointer-pan and distillery selection worked; paused game was unchanged.
Executor-local URL was not accessible from the shared browser. Chromium's managed
policy blocks DevTools and incognito; neither restriction was bypassed.

`browser.html` is a memory-only real-component harness with4iframe dimensions
and the exact long fixture or a lawful operation-prefix trade fixture. Storage
access fails closed; it never loads the native app or writes existing saves.
It measures raw model restoration, **not formalv8 or native-app startup**.
Its transactions require model serialize/restore before publishing in memory.
Store/product detail modals and real storage failure are outside this harness.
Actual browser use after deployment is recorded separately; code existence is
not a browser PASS. Reduced-motion reports the actual media preference, not a
simulated setting. iPhone Safari and physical pinch remain author checks.

## Remaining issues and risks

The explicit extraction-input dependency must stay synchronized with future
E/Dstep changes; keep the differential regression. Remaining whole-state copies,
monthly replay and town work still consume time. New save formats/checkpoints
would require separate future-equivalence proof; none was adopted here.

PR #901 Stage5 source/CAS revision defect remains **unfixed and unused**. Before
reuse it needs its own revision-separation PR and differing-revision regression.
Distant procurement's cash advantage is still a balance issue. Formal premium
pricing remains on hold. Production is unchanged. Formal verificationState stays
UNVERIFIED under the current ChangeOS contract; CI is not human-device evidence.
