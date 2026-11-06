# L100-4B-1: isolated checkpoint cold restoration

Research only. Product modules never import this directory. No formal reader,
format, model, cap, UI, Canvas, IndexedDB or player data changes. Do not merge.

This is a **game replay accelerator sidecar bound to an intact target v8**.
It is not an alternative save and cannot recover missing endpoint history or
recall collectors. The official `readSession` retains all session assertions;
its research-only `restore` callback returns the exactly bound checkpoint+tail
game instead of independently replaying the prefix on that load.

## Guarantees

- Creation: H1-A2 independent private-apply replay captures operation boundaries;
  the unmodified official v8 reader independently validates the final session.
- B load: envelope, whole-source SHA, model/dependency fingerprint, prefix/tail,
  generation/revision and endpoint collector bindings; final game JSON comparison;
  official session/collector validators. Prefix semantic correctness is trusted
  from creation, not independently proven again.
- C comparison: fresh independent A process and B process full-session digests;
  creation also compares full games and contexts. No warm reader cache is counted
  as independent proof. C would cost A and B, rather than B alone; this study compares independent process results and does not implement a combined C boot.
- D fallback: discard checkpoint candidate; validate original complete v8, then
  explicitly supplied older complete v8 candidates. If none validates, stop.
  No repair, writes, new game, collector mixing or persistence certification.
- Hashes detect accidental damage and mismatched data; they are not signatures
  or protection against an attacker who can consistently rewrite all inputs.

## Reproduction

Use Node 24, copied immutable v8 inputs outside the repository, and a new output
folder. Freeze research .mjs source before generating artifacts: the conservative
H1-A3 dependency fingerprint binds all .mjs under AmberTime.

```sh
node --expose-gc works/ambertime/l100-4b-1/run.mjs create /copy/local100.json /scratch/local100 6,12,24,60
node --expose-gc works/ambertime/l100-4b-1/run.mjs cold /copy/local100.json /scratch/local100 A
node --expose-gc works/ambertime/l100-4b-1/run.mjs cold /copy/local100.json /scratch/local100 12
node --expose-gc works/ambertime/l100-4b-1/run.mjs future /copy/local100.json /scratch/local100
node works/ambertime/l100-4b-1/faults.mjs /copy/local100.json /scratch/local100
node --expose-gc works/ambertime/l100-4b-1/run.mjs create /copy/pre-handover.json /scratch/boundary 12
node --expose-gc works/ambertime/l100-4b-1/run.mjs boundary /copy/pre-handover.json /scratch/boundary
node --test works/ambertime/checkpoint-research/*.test.mjs works/ambertime/checkpoint-persistence/*.test.mjs
```

Intervals use the first operation boundary reaching target month minus 6/12/24/60,
so they compare roughly worst-case tails rather than zero-tail checkpoints on
exact 100-year boundaries. Capture time and initial verification replay costs
are separate. A new OS process gives cold modules, not cold OS disk caches.
JSON file IO/initial parse excluded from internal timing are also disclosed;
outer-process wall timings include them. Repeated cold trials run serially.

### Fault coverage caveat

The original `faults.mjs` row named `rng` mutates **seed**, and leaves the nested
checkpoint hash stale; it tests integrity rejection, not actual RNG semantics.
Independent `audit/semantic-faults.mjs` in the evidence bundle specifically
reseals both hashes and alters actual `core.rngState`/`trade.rng` and context.
See CONTRACT/REVIEW and semantic-faults.json for accepted context limitations.

The separate first-interaction probe intentionally does not call A beforehand:
B's fast path does not prime the official model's private validation checkpoint.
Consequently the first normal save still pays full replay. The main `future`
comparison is an equality regression with a primed baseline cache, not evidence
of cold first-interaction performance.
