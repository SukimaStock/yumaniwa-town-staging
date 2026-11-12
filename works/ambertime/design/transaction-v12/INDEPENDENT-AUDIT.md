# v1.2 independent full-transaction audit
Scope: #937 runtime inherited from #932, ambertime-town-journal-v11. No modifications or adoption.

## Actual monthly order and rollback
partner-orders.mjs1385+: assert expected month; blocked/review early returns; empty-funds generationStalled(s); derive retail timing and orders; economicMonthly full-detached result j; retail stock adjustment/reset shipments; promised-change observation; allocate upkeep; syncRecords/syncReleases; settle department deliveries -> automatic shipping -> settle consignment -> sales summary -> automatic bottling; then cash<reserve branch; cleanup/offers; syncReleases; action(month) syncTown and append operation.

Automatic bottling693–740 mutates salary on current owned j, calls brandedBottling and listBottles (which clone and action/syncTown), then pops their temporary operations. Thus candidate town may already include release/receipts/propagation before final cash threshold decides rollback. Monetary rollback alone is insufficient.

Cash failure uses old s: late/last-batch generationStalled(s), otherwise j=clone(s); no casks returns exact s, else requestFunds(j). Final action may still append a month operation without progressing month. Tests must compare exact original API outcome, not assume failed month has no operation.

generationStalled877 clones old s, may fix working generation to last batch, generationReview and action(generation-stalled), or return s untouched. Old-town version must be supplied to this path.

## Non-obvious old-branch reader
Tick's successful path calls maybeShopOffer(j,{...s,core:{...s.core,month:j.core.month}}), so old state is used as eligibility evidence with updated month. shop-model37 shopEvidence for bar directly reads evidence.labConnection.town.events for previous arrival/interest/inquiry/visit. Therefore global shared private town among s and j can change semantics BEFORE rollback even if public original is detached and a root journal eventually rolls back. Old read views must remain versioned. Test a new bar event on j, then read eligibility through s before commit; it must remain baseline old evidence.

## Required ownership contract
Public entry detached; intermediate forward clones may reuse privately owned town only with explicit lineage. Cloning old s after a town mutation must checkout old branch, not attach current journal. Divergent candidates retain separate logical versions. Snapshot/materialization detached and alias-preserving. Cursor deliveryId/receiptMonth and worldNetwork.forwardedSerial belong to matching town version. Rollback invalidates quantization prefix caches because fractional prior inputs may require recertification. Newly appended event and arrivals must preserve alias topology; late eventId writes to newly allocated raw release must normalize safely.

## Formal publication boundary
shop-app rememberCommitted671 holds references to game/history/recall/ledger; restoreCommitted673 reassigns references, NOT deep recovery. Candidate contamination cannot be rescued there. prepareGame72 creates action-local recall context; advanceRecall results kept in candidateRecalls keyed by next game. prepare in saveCandidate711 creates slots, ledger, history, recall and serializes complete session. publishCandidate693 replaces all fields only in apply.

FormalIdbCommitBoundary.commit: synchronous prepare -> async writer(expectedRevision) -> check epoch/ready -> receipt revision==expected+1 -> advance boundary revision -> synchronous apply. Writer contract resolves after native transaction AND exact readback. Reject concurrent action. Any exception halts. Durable writer success followed by apply exception must NOT roll back IDB; state must stop and reload. Mocking a throw before private commit is not a native quota/readback test.

## Seven useful independent fault boundaries
1 economic change before town mutation; 2 release registration after actual appended event; 3 real shop receipt partial node+packet update; 4 real consignment settlement plus town reflection; 5 before private commit/materialization; 6 private candidate ready but durable writer rejects/uncertain; 7 durable success but apply throws (no destructive saved rollback).
At each compare original public state, old branch, private candidate as appropriate, all cursors, full sidecars, histories, RNG, archive aliases; distinguish expected halt from restored game. Also test reattempt same old input and divergent branch after abort, observers throw, cross-state mutable alias rejection and no object escape via callback return.

## Scope cautions
#937 town journal is fixed trusted callbacks, not arbitrary user callbacks or full game branch manager. execute discards raw return and snapshot detaches. Current no nested execute, object-key deletion unsupported; full game deletes batchesById/notesById and reassigns many roots, so applying town proxy to whole game without scope handling fails valid operations. Proxy adoption handles newly created model-local objects under no-external-retention contract. Formal save uses plain materialization, never proxy in structuredClone.
A loader hook must intercept exact intended operations and prove hook counts; broad clone replacement can capture unrelated core projections or callbacks and accidentally trust input as private. No full-game/100year/IndexedDB success claimed until those exact protocol paths run.
