# Reproduction and evidence

Run from repository root with Node v24.22.1. Existing 12 read-only inputs and raw evidence are in the delivery ZIP. No browser or Safari claim.

```sh
node --test works/ambertime/l100-4a-4/*test.mjs
node --test works/ambertime/tests/h1-b2-codec.test.mjs works/ambertime/tests/formal-save.test.mjs works/ambertime/tests/recall-save.test.mjs
node works/ambertime/l100-4a-4/compare.mjs /INPUT/paused /OUTPUT/compare.json
# Run serially with no competing measurements, each policy local/mixed/wide,
# mode A/B/C/D/E and repeat 1/2/3:
node --expose-gc works/ambertime/l100-4a-4/clone-measure.mjs /INPUT/paused/wide-100-year-1200-v8.json C > /OUTPUT/wide-C-1.json
```

Focused25/25; existing formal-save/codec/recall-save23/23. Twelve baseline exact segment-by-segment formal JSON and wire JSON comparisons; 45 independent clone processes /180 copies exact JSON+source independence. All input SHA-256 remain unchanged. Existing #833 monthly/generation evidence is reused, not recounted as new tests.

Independent review found two research hardening points: dotted property path collision fixed to exact key segments; exported inspectFormal options could relax cap, fixed to minimum of caller and formal limit. Both have regressions. No formal code modified. One initial19-test and one24-test run preceded final25-test result; final25 is authoritative.

C timing includes string-segment oracle comparison, hashing and UTF8 accounting; B is only local references; A includes codec parsing/normalization. They are not equal-work speed benchmarks. Clone phases are coarse diagnostics, not an additive cost model. No synchronous phase peak or per-operation GC time is claimed. Unsupported JS domains reject or are explicitly unsafe comparators.

Formal unit limits remain6,016,384 / session6,017,408 strict `<`; no cap increase. Exact readback and replay guarantees stay in existing code. Compression in this v8 path is structural arrivals omission, not a new gzip algorithm. No storage write is performed by the research comparison runner.

The evidence includes source, results, clone samples, input hashes, previous #833 evidence identity, gate and CI results. Scope→Risk→Impact and exact-head CI must be read alongside test results; they are not proof of device experience or Release Complete.
