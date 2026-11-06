# Clone cost experiment

## Boundary

A = ordinary arrays + native structuredClone. B/C = the exact prior #833 adapter copied from commit 2b3dcc99b10cce336e1b39d4af451c5d867b2200 (B projected JavaScript graph + native clone + recursive marker rebuild; C descriptor-aware JavaScript graph copy + index rebuild). D removes descriptor/prototype validation from that graph-copy class, retaining a seen map and handling own `__proto__` as data. D is an ablation, not a safe general clone. E projects only the game/labConnection/town path, sets arrivals to null, native-clones that projected graph and reconstructs the ordered index.

E deliberately has a narrower precondition: no parent aliases involving the shallow-projected ancestors. The unit test demonstrates that a game self-cycle breaks that contract (copy.self is not copy). This is a known counterexample, not a passed general compatibility claim. E has not been connected to the production monthly pipeline; doing so without a boundary contract would be unsafe. D likewise does not support arbitrary native structuredClone values: Maps become empty plain objects, accessors execute, and custom prototypes are not validated. C rejects unsupported prototypes/accessors. Native supports a wider domain.

## Measurement protocol

`bash /workspace/scratch/de42cc6691b2/l100-4a-4/run-clone.sh` runs 3 policies × 5 modes × 3 independent Node processes serially. Each process uses the existing copied 100-year v8 save, loads through the formal codec only, constructs compact arrivals for B–E, then measures four clone calls (first and 3 warm). It validates exact full JSON string equality independently of the hashes and changes a copied event ID to confirm source independence. Equality materialization is outside clone timing and never becomes a next-month input. No original save is written.

Each output includes Node version, input SHA-256, first/warm timings, before/after/GC-retained heap/ArrayBuffer/RSS samples, and process lifetime maxRSS. These are NOT synchronous phase peak measurements. There is no browser/Safari measurement. Codec-only loading is NOT authoritative operation replay and is not used as evidence of replay correctness.

Separately timed native event-array copy, index reconstruction and graph inventory are diagnostic workloads, not additive subdivisions of the actual clone. Inventory records objects, properties, seen lookups, aliases, descriptor/prototype-check opportunities, special keys and index record counts. Comparing C/D isolates the combined effect of descriptor/prototype/unsupported-key checks plus their temporary descriptors; it does not isolate seen-map milliseconds or GC milliseconds. Those cannot be reliably attributed by the current coarse instrumentation. Adding a performance timer around every property would materially distort this workload.

## Interpretation constraints

All compact copies allocate a new canonical events graph and new arrival index. B additionally traverses and allocates a full projected JavaScript graph before native clone and then traverses again to rebuild markers; those passes explain its extra work and temporaries. C removes the redundant native pass but performs JavaScript seen-map lookup, Reflect.ownKeys, prototype and descriptor checks for each object/property. D ablation quantifies the cost of a restricted shortcut, not permission to remove safety checks. E avoids almost all JavaScript graph traversal, but cannot safely replace a generic clone without a stronger game-root alias contract.

The events copy and index reconstruction are necessary for independent compact state. A compact retained-state reduction does not establish a smaller transient peak, faster formal save or faster cold replay. Formal comparisons temporarily hydrate arrivals and allocate JSON by design; those allocations remain explicitly outside the compact clone path.

## Focused tests

`node --test works/ambertime/l100-4a-4/clone-research.test.mjs`: 4/4 pass. Covers plain alias/cycle and own `__proto__`, C/D event-reference independence, unsupported D domain, and E parent-alias counterexample. E is exploratory only and not a formal-adoption recommendation.

## Results

45 fresh processes completed, all 180 cloned outputs matched exact JSON and retained source independence. Three processes per cell, four copies/process. Table values are medians: first copy over 3 samples; warm over 9 samples.

|Policy|Mode|First ms|Warm ms|Source retained MiB|
|---|---|---:|---:|---:|

|local|A|29.84|30.61|13.47|
|local|B|93.84|77.34|11.81|
|local|C|46.42|34.25|11.80|
|local|D|15.05|12.00|11.81|
|local|E|27.67|25.20|11.81|
|mixed|A|47.88|41.63|15.33|
|mixed|B|111.48|100.91|13.11|
|mixed|C|52.45|43.99|13.11|
|mixed|D|27.30|16.80|13.11|
|mixed|E|35.40|33.47|13.11|
|wide|A|43.77|42.11|16.81|
|wide|B|133.53|125.37|14.14|
|wide|C|63.15|53.64|14.14|
|wide|D|31.67|19.67|14.14|
|wide|E|39.90|37.71|14.14|

Wide100 C remains slower than A (warm 53.64 vs 42.11 ms, +27.4%) while retaining about 2.67 MiB less source heap (14.14 vs16.81 MiB, -15.9%). These are this run's codec-only loading snapshots, not directly interchangeable with #833's different process snapshot (18.74/16.14). ArrayBuffer backing for the compact index is reported separately in raw outputs.

Wide100 D warm 19.67ms vs C53.64ms suggests descriptor/prototype/key validation and descriptor allocation account for a substantial part of dedicated clone cost. This ablation combines several changes and does not prove one check alone accounts for the delta. Its unsupported-value behavior makes it unsuitable as a general replacement. E warm37.71ms vs A42.11ms shows a possible narrow-boundary direction, but the known alias counterexample prevents adoption of the prototype as-is. Neither method is wired into monthly game execution.

Wide100 C structural workload: 33,224 graph objects, 251,552 property/descriptor checks, 33,226 seen lookups (one repeated events alias), 6,138 events and 4,801 arrival records. Separate median events native-copy 11.36ms, index construction2.05ms, versus full C clone53.64ms. Index rebuilding is not the dominant observed cost. B warm125.37ms is markedly worse than C and A, consistent with redundant graph construction and native-copy/rebuild passes.

Full first/warm ranges, input hashes, per-iteration validation time, all memory samples, diagnostic subworkload timings and counts are in `clone-results/*.json` in the evidence bundle. Timings are Node v24.22.1 on Linux x86_64, serial independent processes with competing research measurements paused. Runtime noise remains possible; these are not device benchmarks or universal performance constants.

Decision: C retains a measurable memory benefit but copying remains slower; D provides causal evidence only; E offers a limited future boundary-contract hypothesis, not a ready safe optimization. Do not replace native clone or alter formal state based on these measurements. Seen-map lookup, alias/cycle maintenance, GC and temporary-allocation costs are not individually timed; report them as unisolated rather than fabricate additive values. There is no new month regression because none of D/E is connected to the formal monthly adapter.
