# Reproduction and evidence

Node v24.22.1, Linux cloud workspace, --expose-gc for heap samples. No browser or physical Safari certification. Test inputs are copies, never the current browser save or original player storage.

Base main: 28f00c81cb1b374758da34dc79cf7f63dfe657c2. Plan Lock committed before implementation. Official runtime files remain identical to base. Source hashes and input SHA-256 are in inputs.json; complete data and final test output accompany the evidence attachment.

From repository root:

```sh
node --test works/ambertime/l100-4a-3/adapter.test.mjs works/ambertime/tests/formal-save.test.mjs works/ambertime/tests/recall-save.test.mjs
# For each local/mixed/wide, run a one-month gate before extending any:
node --expose-gc works/ambertime/l100-4a-3/run.mjs /INPUT/paused/local-100-year-1200-v8.json /OUTPUT/local-gate.json 1
# Repeat gate for mixed and wide; require all successful, then run each with 12:
node --expose-gc works/ambertime/l100-4a-3/run.mjs /INPUT/paused/local-100-year-1200-v8.json /OUTPUT/local-12.json 12
# Fresh processes, serially, A/B/C, each three times. Do not run other CPU-heavy work concurrently:
node --expose-gc works/ambertime/l100-4a-3/measure.mjs /INPUT/paused/wide-100-year-1200-v8.json C > /OUTPUT/wide-C.json
node works/ambertime/l100-4a-3/handover.mjs /INPUT/saves /OUTPUT/handovers.json
node works/ambertime/l100-4a-3/reconnections.mjs /INPUT/paused /OUTPUT/reconnections.json
```

The final 12-month runs were sequential after all three one-month gates passed. Gate cold timings were concurrent and must not be compared as controlled performance results. A preliminary local pilot was excluded from the retained evidence. Formal cold timings in *-12 results are sequential. Supplemental handover/reconnection trials decode existing fixture bytes via official codec but do not repeat the authoritative cold replay validation; their scope is equal subsequent formal transitions.

A/B/C performance: three fresh wide100 processes each, each process three same-input clone/month samples, with post-phase GC samples. First sample and subsequent warm samples are separated. Local/mixed have one additional process per method, three samples per process. GC checkpoints are retained heap, not exact synchronous allocation peaks. process.resourceUsage().maxRSS is a process lifetime high-water including prior phases. No precise phase peak is claimed. Inputs' cold codec timings exclude full formal replay; official readSession time is reported separately.

Inside compact formal execution: no call to hydrate, full view map/filter/slice, or nativeClone of the view. Source audit confirms actual monthly path has arrival append/quantization, not hidden export/serialization. Every measured monthly result remains ArrivalView, validates its canonical index and passes complete session comparison after explicit hydrate. Equality-only arrays never feed the next compact tick. The runner explicitly reconstructs three times per method/month outside execution (prior-source hash, unchanged-source hash, result comparison), each over that state's full arrival count. Those are verification costs, not claimed runtime savings. Formal save testing on the equivalent expanded baseline also invokes existing codec arrays and replay; not a compact persistence proof.

Handover supplement: nine existing before-handover fixtures across three policies. Each method performs actual handoverGeneration then tickDistillery with collectors. All 36 resulting sessions and completed recall readbacks match the conventional baseline. These fixtures cover three specific generation boundaries per policy, not nine generations in each policy and not a new 100-year replay.

Direct native structuredClone compatibility and direct original map guard are intentionally NOT fixed in production. Unsupported arbitrary JS object types reject the research clone. No tests are relabeled as real-browser or physical-device tests. No capacity cap, save schema, calculation, RNG/history, UI/Canvas, main or Production changes.
