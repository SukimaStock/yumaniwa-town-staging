# L100-4B-1 independent trust audit (pre-implementation)

Reviewed current main 6a1707c106afb4bf0658a274edf404bbc541de64. No product files edited.

## Compatibility actually checked
- partner-orders.mjs SHA-256 ea8f40410bacebcfb8a1c16ec921af095511de6db3732ee3d6f4cf2e9e32346b matches H1-A2 pinned replay seam.
- All five projectionSourceHashes in checkpoint-persistence/online.mjs match actual current files: generation-summary, distillery-history, cask-ledger, memory-lab/connections, chronicle-lab/facts-generate.
- loadAdapter ran successfully on current main. Model fingerprint 6376ca506af87c597d638369ec4d1ac9957773e4bd2aef767115dbc70663fc02, 38 transitive source files.
- Model-only fingerprint is insufficient for whole-session validation: development-save, save-codec, history-record, recent-ledger, cask-slots, recall collector/observation/selection and research adapter implementation must also be conservatively bound.

## Reuse and trust distinctions
1. H1-A2 projections.mjs uses the final target to construct historical projections. It is not future-neutral prefix production evidence.
2. H1-A3 online.mjs captures prefix-only historical data, then hydrates detached collectors; finish copies Maps/Sets to avoid contaminating continuation. Its historical success does not establish current v8 recallRecord equivalence by itself.
3. Current v8 explicitly holds caskSlots, recentLedger, historyRecord, recallRecord in addition to game, elapsed and userPaused. Whole-game JSON equality alone is not whole-session equality.
4. Minimal safe research route can accelerate only the game replay via H1 checkpoint/context and load untouched endpoint sidecars from original v8. Official readSession can retain all its assertions with a research restore callback that exactly binds input expanded raw to the original and exactly matches cp+tail result. This is explicitly not an independent official full replay on B loads.
5. Such a checkpoint is a replay accelerator dependent on intact target v8, not a standalone backup or a way to recover missing collector data. State this clearly.
6. C must independently replay original operations rather than accepting a warm formal-reader cache primed by B. Separate process/module-state proof is required.
7. Creation receipts and self hashes are local evidence of accidental-corruption detection, not cryptographic authentication of semantic correctness. A consistently resealed malicious bundle can exceed local guarantee. Report this as limitation, not hidden failure.
8. Fallback must discard candidate state and detached observers/collectors on any late failure. H1 restoreOrFallback intentionally forbids live observer callbacks for that reason.
9. Fallback to old v8 must preserve that save's complete session; no mixture of new sidecars and old game. No recovery source means safe stop, never synthetic new game.

## Measurements
- H1-A3 previous results used one separate Node process trial per mode, older full dependency fingerprint, uncontrolled OS page cache and shared-host load. They are historical evidence only, not new repeat measurements.
- H1 readBundle verifies/hydrates a checkpoint once and replayTail repeats verification/hydration. Include duplicate costs when reporting current code, or explicitly document research elimination; do not add overlapping diagnostic timings.
- Node worker internal wall time omits process spawn; cold means new Node/module caches, not flushed OS cache.
- Capture cost excludes shared initial full replay only if reported separately. Retaining target v8 plus checkpoint plus tail increases storage; no solution to the formal UTF-16 ceiling follows.

## Implementation-review checklist
- Strict source hash, prefix length/digest, tail exact list/order, month/generation/RNG/context and session metadata binding.
- Verify dependency closure before measurements; no editing source between generation and consumption.
- Detached rollback, old-save byte preservation, stop on all-invalid candidates.
- Corruption tests distinguish broken hash from coherently resealed semantic mutations.
- Entire v8 session comparison, 9 handovers and 3x12 month continued operation include completed recall identity/text/order.
- No stale measurement reuse, no fake Safari/browser result, no IndexedDB retry.
