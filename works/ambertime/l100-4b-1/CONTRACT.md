# Checkpoint and persistence trust contracts

## v8 and cap

The unmodified v8 session contains compact game, elapsed/userPaused, slots,
recent ledger, history record and recall record. The model stores operations,
origin and all current town events. `expandFormalGame` reconstitutes arrivals;
formal model validation replays the operations and compares the final JSON.
The game ceiling remains **strictly below 6,016,384 UTF-16 code units**.
Session ceiling is separately 6,017,408. UTF-8 wire bytes, runtime heap and
browser storage quota are different measurements.

No checkpoint solves the unbounded growth of town events/arrivals/attempts.
All original v8 checks still apply. The checkpoint representation may itself
be larger than v8; keeping it alongside v8 increases storage. Crossing the
formal limit remains a hard rejection, not a reason to drop history or raise it.

## A–D

|Method|Replay|Trust|Failure|Cost|
|---|---|---|---|---|
|A formal reader|All operations from origin|Formal model and original input|Reject inconsistent state|Baseline independent cold|
|B sidecar|Only bound tail|Validated creation plus unchanged code; hashes are not authentication|Reject sidecar, D permitted|Faster load; creation paid separately|
|C B plus A|Tail and independent full replay|A confirms B candidate in fresh process|Reject mismatch|A+B, not a fast guaranteed boot|
|D fallback|All operations in original or older complete v8|Formal reader|Stop if every source fails|A-like delay, intact source required|

A model fingerprint covers the replay dependency graph. The more conservative
code fingerprint additionally covers session validators, recall rules, collector
sources and research implementation. Version/fingerprint mismatch invalidates
the accelerator; it never silently upgrades it.

Generation ID is the game's current generation at checkpoint. The research
revision is the checkpoint prefix length, not a persistent storage CAS counter.
A future storage generation ID and monotone storage revision must be independent
and cannot be replaced by this operation index.

## Endpoint collectors

Current bounded collectors come from the **target v8**, not prefix reconstruction.
Their digest is bound to the same source and official assertions are executed
against the restored game. This study does not prove a self-contained checkpoint
can reconstruct missing v8 collectors. H1-A3 prefix-neutral online collectors
are useful historical research but are not silently substituted for current
v8 history/recall. A final-target-dependent H1-A2 projection is not valid evidence
for a checkpoint created without future knowledge.

## 4C conditions

1. Retain byte-identical v8 original and independently validated previous complete
   generation before preparing checkpoint/tail. Never delete the only fallback
   to make room for a candidate.
2. Bind storage generation ID, monotone revision, v8 SHA, code/model fingerprint,
   prefix length/digest, checkpoint hash and tail hash in one commit contract.
3. Validate full replay at creation, validate saved candidate by readback, then
   compare-and-swap head/revision atomically. A hash or transaction completion
   alone does not prove game correctness or physical power-loss durability.
4. All constituent data must belong to one save generation. A good checkpoint
   with another generation's collector/tail is not a good save.
5. Corrupt checkpoint with normal v8: discard it and use full formal restore.
   Corrupt current v8: use an independently validated previous whole v8, never
   current collectors with previous state. No valid source: preserve bytes, stop.
6. events is authoritative; a derived arrivals index can be regenerated only
   from complete validated events. Missing events is not repaired by an index.
7. GC must protect current head, at least one independent normal predecessor,
   and active readers. Incomplete candidates are distinct from recovery sources.
8. Loss of every same-origin storage area cannot be distinguished reliably from
   first launch using only records in that area. No synthetic new save on an
   ambiguous state. External backups and IDB implementation are outside scope.

## Formal-adoption prerequisites

Specify creator trust/provenance across app upgrades and imports; decide whether
B's reduced per-load guarantee is acceptable. Define stable reviewed dependency
closure, storage generations/atomicity/readback/GC, and fallback UX separately.
Avoid promoting conservative research fingerprints into permanent product IDs.
Prove prefix-sidecar continuation only if removing the original complete v8 is
proposed later. Run native browser/Safari memory, responsiveness and interruption
acceptance after a safe environment exists. No browser or persistent durability
claim follows from these Node results.

## Adversarial context finding

Independent tests resealed both nested checkpoint and outer envelope, so they
went beyond accidental bit damage. Changed actual core/trade RNG, missing
required context map, generation and month were rejected. Changed manualFills,
manualBottles and an unused nearbyProducts entry could be accepted with the same
endpoint session but a different replay context. This is a concrete limit:
**full-session digest equality alone does not prove replay-context provenance**.
Creation compares complete context against independent replay; B does not repeat
that oracle on every load. A C context guarantee requires independent context
comparison in addition to the formal-session reader. Do not call these accepted
cases semantic validation success. No source data was repaired or overwritten.
