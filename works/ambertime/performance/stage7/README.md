# Stage7A — restore profiling

Baseline: `001bc6cc712cc300b8f7be65018628199e97e1f0` (PR #907).
This directory is research tooling; the application imports none of it. Runtime,
formal v8, operation order, RNG, IDs and validation are unchanged.

The original PR907 1386-month fixture is retained byte-for-byte. SHA256:
`fe6a66973f57ad7ed9758ddfab12cd88e87e8461885ce8f91c8cb7e13feb7d24`.
It has 2266 operations, 104 releases, 100 regional deliveries and generation5.
It contains no pending packets/events at its final boundary, so this fixture alone
cannot establish pending-rumor equivalence; separate cases are required in7B/7C.

## Reproduce

Run from repository root, with no competing CPU-heavy tests:

```sh
node works/ambertime/performance/stage7/derive-fixtures.mjs \
  works/ambertime/performance/stage7/fixtures/pr907-1386.json /tmp/amber-stage7-fixtures
node works/ambertime/performance/stage7/profile.mjs --root "$PWD" \
  --fixture works/ambertime/performance/stage7/fixtures/pr907-1386.json \
  --output /tmp/amber-stage7-raw.json
node works/ambertime/performance/stage7/profile.mjs --root "$PWD" \
  --fixture /tmp/amber-stage7-fixtures/formal-v8.json \
  --output /tmp/amber-stage7-v8.json
```

Use `--mode control` for each derived `prefix-12.json`, `prefix-120.json`,
`prefix-360.json`, `prefix-1200.json`. They are absolute game months from the same
career, not independent strategies or extra months after the186-month opening.
The derivation uses full existing replay and canonical top-level property order.
Every prefix must pass the profiler's exact fresh-process restore roundtrip.

The default profiler runs control then instrumentation sequentially in separate
fresh Node processes. Module imports and an independent envelope parse precede
the measured cold restore. The actual restore still parses its own input. Warm
restore follows cold; save generation follows warm and therefore uses that cache.
The formal generation measurement includes the official reader and exact return
comparison. Metadata construction via `sessionFor` is measured separately by the
derivation script and is **not ordinary startup**.

Nested instrumentation scopes overlap. Inclusive columns must not be added.
Exclusive time subtracts instrumented child scopes; it is not pure CPU time.
Instrumentation changes only a temporary source copy, guards exact replacement
anchors, and preserves the original function bodies and thrown errors. The
uninstrumented control is the performance comparison authority. CPU samples are
secondary attribution evidence and include profiler overhead.

Memory reports are before/after RSS and heap snapshots and process-lifetime
`maxRSS`; they are neither per-phase peaks nor iPhone estimates. The saved results
identify Node/V8, CPU, platform, fixture hash, bytes, operation count and time.
Each result is a single observation, not a statistical latency guarantee.

## Safety boundary and next steps

The proposed next change must preserve complete operation replay and final
exact JSON equality. The measured candidate is extraction replay's repeated
whole-game cloning; use the unchanged extraction step with a smaller transient
input and merge its result into one detached full copy. Do not replace the replay
with unverified checkpoint facts. Set and evaluate the target after final7A
measurements; retain baseline/candidate comparisons on these exact fixtures.

Stage5 persistence is not used. PR #901's source-revision/CAS-revision issue
remains unresolved and must be fixed independently before that code is reused.
Distant procurement's measured cash advantage remains a balance issue. Premium
pricing adoption is on hold; this work does not alter prices or probabilities.
Production is excluded.

## Confirmed7A result

Node24.22.1 / V8 13.6.233.17-node.58, Linux x64, AMD EPYC9V74,
9 visible logical CPUs, ~10.45GB host memory. Sequential fresh child processes;
one observation per case. Light source inspection/housekeeping may occur outside
the measured process; no concurrent simulation/test workload. No forced GC.

| Absolute month / envelope | Operations | UTF8 bytes | Cold ms | Same-process ms |
| --- | ---: | ---: | ---: | ---: |
| 12 | 49 | 13874 | 31.075 | 0.689 |
| 120 | 188 | 355782 | 883.650 | 9.409 |
| 360 | 551 | 600846 | 7418.975 | 14.291 |
| 1200 | 1955 | 1040630 | 56529.566 | 27.576 |
| 1386 | 2266 | 1136103 | 63904.821 | 31.429 |
| v8 | 2266 | 1289728 | 61005.065 | 56.301 |

Raw cold restore63.905s reproduces PR907's65.261s class of latency. The formal
v8 cold reader measured61.005s independently; different single observations
must not be subtracted to estimate codec overhead. Exact raw/v8 roundtrips and
all four prefixes passed. Warm formal save generation including validation and
its official reader roundtrip measured105.555ms; process peak RSS340,451,328bytes.
Raw process peak RSS312,381,440bytes. See JSON boundary memory snapshots.

Instrumented raw cold restore64.989s: structuredClone116,661calls /62.154s
inclusive; extraction progress210calls /48.836s inclusive. These **overlap**.
Town sync1718calls /2.629s inclusive. Actual restore parse11.140ms, core validation
9.101ms, prefix matching0.017ms, final state comparison9.537ms. Two validation
calls include the initial empty-game boundary; no validation was removed.
CPU sampling independently attributes48.3s to extraction progress and its two
whole-state clone paths. The bottleneck is repeated copies while replaying
extraction, not parsing or final integrity comparison.

Instrumented formal cold reader: envelope parse6.900ms, codec expansion10.882ms,
slots0.130ms, ledger1.695ms, history2.948ms, recall6.491ms. Town/pending data are
reconstructed by operation replay, then checked by full equality; there is no
independent town-deserializer phase. Exact constituent timers are in baseline/.

Separate metadata derivation measured168.418s, followed by cold-cache formal
generation61.080s (the scratch measurement includes its final file write).
This is reconstruction tooling, not normal startup or warm-save latency; it is
not the same workload as PR907's186.451s combined measurement. The committed
reproduction script isolates disk write from formalGenerationMilliseconds.

7B target selected **after** this investigation: raw cold restore <=25seconds
on this fixture/environment (at least60% reduction), exact unchanged v8 bytes,
full replay/assertions/equality retained. Scope: private extraction progress
copies only, plus cache-entry URLs and focused tests. Other copying/town work
is deliberately left for later measurement. New risk is dependency drift in the
small extraction input; compare it against unchanged full-state stepping and
keep complete replay validation. No new save format or Stage5 dependency.

Independent source review: separate reviewer found no P1/P2; prefix guard and
file-write measurement wording were corrected. Runtime diff is empty. Formal
verificationState remains UNVERIFIED under the current ChangeOS contract.
