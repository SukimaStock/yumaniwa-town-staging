# Stage4/5 safety audit — 2026-11-11

Read-only runtime audit of main ebc507df0ece98dadab0673e9d27e39a69424467. No formal model, save or runtime file changed. Simulation is a pure scratch comparison, not implementation.

## Current transaction

- `regional-deliveries.mjs:82–99 deliverRegionalInto`: chosen allocations are removed; core product stock decreases, sold/revenue/cash/core totals increase immediately. Receipt explicitly records customerSales:null and customerRevenue:null. Recent receipt list is capped8 but full receipts remain recorded in operations.
- `placement-mode.mjs`: unsold core product stock is the physical owner total; hand stock subtracts retail/store/regional assignments. An entrusted stock table must also be subtracted from hand while remaining inside core stock until actual sale.
- `partner-orders.mjs:178–199`: confirmed delivery transaction validates exact receipt on replay, syncs release and record facts, and sends newly committed receipts to world network `receiveActual`.
- `regional-partners.mjs`: national progression traces causal links to paid historical regional receipts. Reinterpreting old receipts as new unsold stock would duplicate physical bottles, undo cash and invalidate replay/causal evidence.
- `development-save.mjs`: current formal envelopev8 requires native gamev20, canonical exact JSON. `validateDistillery` reproduces operation stream and compares exact facts. Changing old opcode behavior unconditionally breaks old cold restore.

## Safe candidate boundary (proposal; not runtime-tested)

1. Add explicit new opcode/mode activation with version/rules/month/operation boundary; preserve old `regional-deliver` opcode semantics forever. Gate all new monthly sale work behind new mode.
2. Initialize new consignment stock empty. Do not use historical deliveries/totals/old receipts to create inventory. Do not reverse settled cash or revenue.
3. Preserve old pending allocations as still-owned reservations. A new explicit consign action can transfer those selected reservations to consignment stock, with zero cash/sold/revenue change. Previously settled deliveries stay settled.
4. New actual monthly sale is atomic: decrement consignment quantity and core stock together, increment sold/cash/revenue once using existing price framework. Never count entrusted quantity as a consumer sale. Only successful save announces it.
5. New mode uses no pullback action for already entrusted stock. Old pre-consignment reservations may retain their existing cancel action because they have not been entrusted.
6. Separate lifetime settled wholesale totals from new actual consumer sales totals, preserving old displays honestly; new progression must use new actual-sale evidence, not fabricate it from old wholesale receipts.
7. Aggregate active quantities by contract+product; do not duplicate bottle/profile/label per unit. Preserve references to existing release/product. Remove zero rows and orphan fractional sales credits only. Retain per-window aggregate sales/trade-month counters and bounded recent summaries.
8. Current native model caps active unsold products at8. Retaining entrusted units inside core product stock preserves that rule, so contract+product stock rows are bounded by3 existing windows ×8 active products =24 under the current partner set. This does not cap entrusted unit count per window. Do not remove entrusted units from core stock, relax maxProducts, cap units silently, or prune unsold bottles. Validate safe integer additions and existing save-size failures atomically. Historical operation size still grows with recorded actions; bounded active rows do not prove bounded full save size.
9. Protect old data on write failure, quota failure, readback failure and concurrent conflict using existing writer. Native and formal v8 cold equality before boundary; exact replay after it; mutated facts/operation/receipt rejection; both monthly replay and retry idempotence are required.

## Measured comparison

Executed actual unchanged `market-sales.mjs planSales` for1200 months, synthetic age24 item, price20/reference20, seed42, carry method. Profile data in results.json. This measures actual town rules; combining lanes is a provisional candidate, not formal gameplay.

| Profile | Single town monthly | Three-town-lane monthly | 54 bottles town clearance | 54 bottles3 lanes |
|---|---:|---:|---:|---:|
| Smoke/body |7.600|10.830|8mo|6mo|
| Balanced |1.355|4.6675|49mo|14mo|
| Grain/fruit |0.2033|12.2108|333mo|5mo|

Three lanes are existing town-liquor8 + supermarket12 + bar4 opportunities, not guaranteed sales. Two lanes town+super yield7.900/3.3875/11.6033 bottles per month. Existing taste and price acceptance remain decisive. Single54 clearance includes the lower opportunity tail when inventory is nearly empty.

Proposed adjustable initial scale:2–3 existing-town-equivalent lanes (20–24 opportunities total); use the same taste/price acceptance rather than a guaranteed sales rate. Proposed exploratory growth range1x→2x opportunity scale, driven by actual consumer sales and active trading months; requires economic simulation, variance/price/production comparison and author observation before adoption. No level/XP/gauge is needed. No growth rule was implemented or accepted by this audit.

At1200 months the pure three-lane current ledger JSON was~1.8KB for one active product/profile; this is NOT full save capacity evidence, and distinct releases/profile credits can grow.

## Stage5 relationship boundary

Direct stores need a hard small cap per layer and a bounded set of persistent direct IDs; behind-network shop names should be deterministic ephemeral letter content chosen from finite pools. A name alone must not create a store, simulation node, contract or new permanent record.

Exclude contracted direct stores from future network customer opportunities. Keep already entrusted inventory at its existing window; do not retroactively transfer or duplicate it. If exact per-customer attribution would require unbounded history, use bounded network-wide demand counters and distinguish the logical exclusion from actual inventory ownership. Existing receiveActual/causal inquiry flow must explicitly distinguish entrusted supply from paid consumer sales.

## Fresh tests

`node --test --test-reporter=spec works/ambertime/tests/regional-deliveries.test.mjs works/ambertime/tests/world-network.test.mjs works/ambertime/tests/restore-performance.test.mjs`

29/29 passed, no skips, ~61.99s. Includes current-code30-year handover, formalv8 exact roundtrip, receipt idempotence, atomic errors, replay cold/warm/tamper protections. Does not validate a new consignment implementation.

Existing long-run tooling: performance/stage7/derive-fixtures.mjs (derive actual360/1200 prefixes and formalv8); profile.mjs --mode control (fresh process cold/warm/save exact validation); long-run.mjs (fresh lawful1200-month careers, expensive). Historical stored reports are not fresh evidence.

## Reproduce the inert source

From repository root:

```sh
node --input-type=module < works/ambertime/design/night-stage4-20261111/comparison-source.txt > /tmp/amber-consignment-comparison.json
```

The source is stored as text and is never imported by runtime, build or CI. Output is a pure numerical comparison, not a runnable game Lab and not adopted economic rules. `comparison-results.json` contains the exact original output. No fresh native100-year consignment test exists because no consignment runtime was implemented.

## Fresh current-main30/100-year-equivalent restore evidence

Measured from unmodified main ebc507df runtime in separate fresh Node processes, sequential control-only profile calls. Prefixes were freshly derived by full replay from the public native PR907 fixture, exact source SHA256 `fe6a66973f57ad7ed9758ddfab12cd88e87e8461885ce8f91c8cb7e13feb7d24`. These are fresh observations of existing native saves, not tests of a new consignment mode or an independent new100-year career. Other task activity may run outside these profiler processes, so timings are observations rather than isolated benchmark guarantees or iPhone estimates.

| Input | Month | UTF8 bytes | Cold restore | Warm restore | Save+validation | Exact roundtrip | Process peak RSS |
|---|---:|---:|---:|---:|---:|---|---:|
| Raw prefix |360|600,846|2,473.828ms|26.151ms|20.525ms|PASS|137,228,288B|
| Raw prefix |1200|1,040,630|18,594.021ms|27.434ms|28.629ms|PASS|223,064,064B|
| Formalv8 envelope |1386|1,289,728|21,443.217ms|84.107ms|168.008ms|PASS|255,102,976B|

Fresh derivation metadata reconstruction took107,428.583ms and formal envelope generation20,298.101ms, separately from cold restoration. These heavy replay-sidecar reconstruction costs are not ordinary startup, and must not be substituted for first-save latency. Save generation above follows warm restore and uses its cache. Browser localStorage quota, browser startup/first-save latency, OS termination durability, native WebKit, and iPhone Safari remain unverified. No new consignment save-size delta exists because formal code was not changed.

Reproduce control profile after deriving fixtures into a scratch output directory:

```sh
node works/ambertime/performance/stage7/derive-fixtures.mjs works/ambertime/performance/stage7/fixtures/pr907-1386.json /tmp/amber-consignment-fixtures
node works/ambertime/performance/stage7/profile.mjs --root . --fixture /tmp/amber-consignment-fixtures/prefix-360.json --mode control --output /tmp/profile-360.json
node works/ambertime/performance/stage7/profile.mjs --root . --fixture /tmp/amber-consignment-fixtures/prefix-1200.json --mode control --output /tmp/profile-1200.json
node works/ambertime/performance/stage7/profile.mjs --root . --fixture /tmp/amber-consignment-fixtures/formal-v8.json --mode control --output /tmp/profile-v8.json
```

## Change OS record

The first unpushed docs plan omitted work.runtime/work.regression impacts that the policy derives from JSON/log evidence. Scope passed; Risk/Impact stopped. That branch was abandoned without publishing or changing formal code. This record uses a new main-based r0 with both required impacts, committed before adding artifacts. Locked Plan digest is in `.change-plans/ambertime-night-stage4-audit-20261111/r0.lock.json`. Scope→Risk→Impact pass on the documentation diff. `work.runtime` is checked by exact diff confirming no runtime imports or source modifications; `work.regression` is checked by29 existing-model tests and byte-identical pure simulation reproduction. Required GitHub CI and independent review remain separate checks before any integration. This research is not claimed VERIFIED.
