# Independent town audit v1.1 (read-only, 2026-11-12)

Scope: runtime in ambertime-owned-v10 inherited from #932 a287/ad2ce (no town/runtime edits). Five immutable synthetic expected/*-1200.json parsed, not replayed. All-field counts and approximate JSON UTF-8 sizes: /tmp/town-v11-sizes.json. Python JSON reserialization is an approximation, not actual heap or native clone volume; aliases in live objects are not encoded by these JSON files. No source edits, save changes, merges, deployment or user data accessed.

## Writers and synchronization

partner-orders.mjs action (line52) invokes generation bookkeeping and syncTown before pushing action. syncTown (322–334) updates town.generation, recordBottle for EVERY existing game release, forwards shop deliveries with id>labConnection.deliveryId, then advances that cursor. New retail/consignment receipts are gated by core.month>receiptMonth; after processing, receiptMonth advances. Town clock finally advances to core.month. Therefore cursor changes and payload changes must be committed/rolled back together. Advancing a cursor on failed/skipped write loses receipts; retaining cursor but partially committing receipts risks duplicates unless identical-id validation survives.

regionalDeliveryTransaction (214–240) independently forwards fresh regional receipts to receiveActual and advances worldNetwork.forwardedSerial only after return. Do not restrict audit to syncTown alone. world activation stores eventStart and delivery serial boundaries (150,173); historical event index/serial remains semantic.

town-connection.mjs recordBottle advances clock to bottledMonth when needed, builds exact productFor profile, calls registerExternalRelease. Existing release cannot silently change count/profile. registerExternalRelease (model252) finds externalId, checks exact count/product JSON, returns existing; new release gets sequential local ID and eventId. No sold/revenue/stock mutation in this external release path (different from autonomous Lab release/send). Product conversion may clone flavor every sync; reducing repeated scans needs maintainable identity cache, not skipping profile verification on mutable public inputs.

receiveActual (adapter18+) first resolves release externalId, normalizes node and checks receiptId against shipments. Existing receipt validates month, destination, count and local release ID, returns false BEFORE clock advancement, allowing harmless repeat of old receipts. Conflicting receipt throws. receiveExternal (model260+) repeats destination/count/release checks, validates aggregate historical shipped quantity <= bottled count, adds shipment event, shipment, packet, pending encounter, updates node counters/root and quantizes. Duplicate checking is not merely membership: conflicts must continue to throw.

advanceExternal (294) rejects backward clock and calls step. step (179+) increments month, decays nodes, processes/removes due pending and packets; sorts detached due-packet array by due/strength/to/sourceId; appends reaction events/attempts/new queues; external mode quantizes at end. It does not sort/delete historical events, arrivals, attempts, releases or shipments.

## Fields / finalization

- metadata external/version/seed/mode: fixed in main constructor; month mutable, generation assigned by syncTown. Main mode responses, so memory/resurface and autonomous generation/trade rules do not activate.
- releases: append; newly constructed release gets eventId immediately. Existing profile/count validated; frozen provenance candidate only after this initialization. No general mutation-proof public type.
- shipments: append; each contains parts linking release/event. Used for duplicate validation, conservation and relationship() scanning. Cannot remove merely because old.
- events: append via event(); reason/mainReleaseId/productId populated BEFORE push. IDs e(index+1), source IDs identify earlier causal records. Later quantizeReaction writes fractional numeric fields recursively, even old events on public calls.
- arrivals: append SAME event object returned by event(), not an independent copy in live state. event.path can initially reuse incoming packet.path. Prefix archival must retain event/arrival identity or prove materialized native alias graph equivalence.
- attempts: append encounter/reaction/trade/resurface trials. Probability/fit/etc rounded by quantizeReaction after push. roll deliberately NOT rounded. No historical deletion/sort in main path.
- memories: mutable retired/resurfaced flags in memory mode; main constructor uses responses so current fixtures empty. Do not declare immutable for all supported model modes.
- trades: appended event aliases in autonomous trade branch, which external main inhibits; fixtures empty.
- pending/packets: working queues filtered to remove due entries, appended during propagation. Newly appended packets are consumed future steps. Order/sort tie breaking and RNG keyed inputs are semantic.
- seen: growing map keyed cohort+':'+node. Prevents re-arrival and feedback loops. Must not prune without proving no future delayed packet can reuse key.
- lastEncounter: per-node mutable latest successful rumor month. Six-month cooldown depends on it; annual cap additionally scans last12month rumor events.
- nodes: fixed node keys, mutable awareness/interest/root/received/periods/fitSum/first* flags/contact/visits/inquiries. Rounded each public step.

quantizeReaction (275–292) recursively revisits nodes/events/arrivals/memories/pending/packets/attempts. Private replay alone can skip proven rounded prefixes of events/arrivals/attempts using WeakMap metadata from clone-data.mjs. Public calls start at zero because caller can mutate old records. This existing boundary is promising: after quantization, privately owned prefix can be immutable for controlled replay operations; public mutable caller data must not inherit blind trust. Integer/roll exclusions, numeric fixed-point check and alias metadata transfer must remain equivalent. A safe archive scheme needs copied-on-entry private ownership, append-tail quantization, mutation detection/fallback and fresh public/save materialization. Full tick has syncTown during internal operations before possible cash rollback: a partially updated private archive cannot be shared across rollback versions without append transaction/undo or separately owned branch.

## Readers and preservation obligations

relationship(model94+) scans shipments and referenced products for historical matching-taste periods/span/mean. encounter annual-cap checks recent rumor events. event() ID and reason generation depends on complete release/event counts. newsEvents(model220+) filters events using a newly created Map and returns original event references, does not mutate history; consumers can potentially mutate returned objects because API is not frozen. It suppresses repeat arrivals forever by category and other kinds for12months. Display dedup != removable source records.

history-record.mjs61–63 maps eN directly to events[N-1], processes append suffix relative previous town length, builds causal evidence. recall/observe.mjs44 asserts e(first)/e(last) positional sequence, records cursor.positionBlocks; 60 reads actual receipts,73 builds source chain and townOrdinal,91/94 recover original position/ordinal. Preserve full IDs/order/source chains/release mapping. Removing/reordering prefix breaks recall/history even if screen appears same.

Formal game reader uses deterministic replay and whole-state comparison; these are materialized state, not dispensable cache. Arrays can only change representation behind private boundary with exact reconstruction. Existing serialized fixture JSON has no alias topology; independent live A/B state graph checks remain necessary.

## Size/growth evidence

Endpoint counts, not a new30/100year growth run. local town:104 releases,1034 shipments,8992 arrivals,12576 events,29791 attempts,8992 seen keys. regional:104/795/3859/5935/12467/3859. bulk:104/915/4410/6670/14178/4410. small:104/1223/5879/8859/18861/5879. dispersed:103/1003/3504/5502/11094/3504. Order releases/shipments/arrivals/events/attempts/seen.

Largest local serialized fields approximately events4.606MB, arrivals3.608MB, attempts3.477MB, seen0.376MB; releases0.096MB, shipments0.117MB. These three large logs dominate JSON size, but arrivals duplicates event content in JSON; cannot sum these as independent live heap allocation. Exact current frontier pending/packets and all small fields retained in accompanying sizes JSON. All5 endpoints show same dominant pattern. Historical record month distributions can show accumulation but cannot reconstruct past node/queue state or prove memory growth trend by themselves. No fresh earlier-time fixture/replay was produced in this audit.

## Recommendations

1. Target privately owned quantized events/arrivals/attempts prefixes first, not tiny release archive. Preserve event-arrival alias identities and source ordering at materialization.
2. Treat seen as causal dedup working/history map, not removable log; separate bounded current queues from immutable logs but retain all required keys.
3. Cache per-release/receipt lookup and totals only with private ownership + invalidation/reconstruction and exact conflict semantics. This addresses repeated linear scans, distinct from clone-copy cost; measure separately.
4. Full transaction entry/exit can detach correctly yet internal lowfund rollback still requires archive branch isolation. Test automatic bottling -> action/syncTown -> receipt/reaction append -> cash failure, restoring complete prior town and cursors, not just cash.
5. No claim C fulltick/save/replay proven from six economicMonthly-only phases. Their static-town speedup establishes potential payload leverage, not validity of skipping town updates in real operation.
