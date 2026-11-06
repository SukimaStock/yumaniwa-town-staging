# L100-4A independent review

Reviewed base `8a145ec4bb810baccbb2dfb353e990db72a3ef21` and new `works/ambertime/l100-4a/{research.mjs,research.test.mjs,run.mjs,future.mjs}`. Read-only review; no product or owned-code edits. The worktree had only new Plan Lock and research-directory paths at review time. This is not final exact-head CI certification.

## Result

No blocking implementation defect found in the bounded, trusted-input research scope. `node --test works/ambertime/l100-4a/research.test.mjs`: **16 passed / 0 failed**, including a separately labelled memory-mode resurfacing at month319 after312months (26years). Node, not browser or iPhone Safari.

## Required interpretation boundaries

1. **B does not solve the current formal cap.** Its `arrivals:null` representation mirrors the existing wire codec. Full hydration reconstructs exactly the original formal game, and the unchanged cap still applies. Its compact object can be a normalized-runtime research candidate, but this Lab does not run a normalized formal runtime.
2. **C is lossless field/schema packing**, preserving every event, trial, shipment and order. It is not semantic aggregation to counts, nor proof that old details may be deleted. It reduces representation repetition, not the unbounded number of historical records.
3. **D is an archive representation prototype.** It preserves all records, uses content-addressed chunks and validates full reconstruction. `lookup` deliberately validates only its selected chunk, not the complete snapshot. A successful lookup does not prove recovery availability. All monthly comparison paths hydrate to the original full model, so current compact size is not evidence of bounded simulation memory or faster normal monthly computation.
4. Encoding/hydration timings exclude official cold replay and browser boot. `future.mjs` cold official read is separately measured and explicitly labelled. No browser performance or old-version migration guarantee follows from JSON equality.
5. Hashes establish consistency with the retained trusted source, not authenticity against an adversary who replaces both content and hashes. This decoder is a research helper, not a hardened production import boundary: full cap validation is after reconstruction, so it must not be represented as safe handling of arbitrary malicious oversized archives.

## Implementation checks

- `encode` JSON-copies the source before modification; fixture and dataset source immutability checks exist.
- Field order is preserved by retaining `arrivals` property position, per-record ordered schema keys, sequential chunk flattening, and final exact JSON hash. Tests include heterogeneous ordered key sets, null, Unicode and nested data.
- `Object.fromEntries` reconstruction avoids assignment-based prototype mutation; inputs remain JSON data.
- Source formal-size guard is used before encoding and after full hydration. Product size limits and serializers are imported unchanged.
- Missing or hash-corrupt archive, reordered chunks, wrong counts, bad record schemas and mismatched source digest reject. Original source remains available in tests. This proves refusal and retained independent source, not reconstruction of a lost or corrupted blob or atomic browser persistence.
- `run.mjs` compares the same town-month operation on source and hydrated games, explicitly not full game progression.
- `future.mjs` uses the official cold reader, full-model tick, cask slots and ledger/history/recall collectors, exact full-session equality, official serialization and reread. This is stronger but still a sampled one-operation continuation, not all future branches.
- Reviewed `results.json` contained23 rows: all12 requested30/60/90/100-year inputs plus continuation copies; maximum original formal size5,998,059 code units, below6,016,384. All rows marked source unchanged. Independent rerun of this entire dataset was not performed by this reviewer.
- At review time three completed full-future outputs (local30/60/100) each reported monthAdvanced=true. Remaining worker output was in progress and not independently certified here.

## Nonblocking robustness request

`future.mjs` initially only recorded `monthAdvanced`; it did not assert it. `tickDistillery` can return unchanged on blocked/review states (`partner-orders.mjs:1218`). Add an assertion that each requested monthly transition advances exactly one month, or explicitly classify no-op results as unexecuted continuation. Existing three observed results advanced correctly; this is a safeguard against misleading aggregation with later inputs. Sent to implementation owner before report.

## No-go claims

Do not call B/C/D adopted formal formats, repaired long-term cap, bounded retention, actual lazy-running gameplay, archival durability, browser recovery, physical Safari verification or complete future-equivalence proof. No formal data deletion or migration is justified by these tests.

Follow-up: actual month advancement assertion added to future.mjs; all previously emitted rows separately checked to have monthAdvanced:true. Full-output summary will enforce12/12 before completion. C-pack renamed in the report as a reversible representation experiment under B, not a proof of semantic aggregation C. Original assertions were not weakened.
