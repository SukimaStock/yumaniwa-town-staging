# S4 — important distillery history (Draft)

Base: `246b8da4daabff1bfe6c2854fa95d00bc5cbcd0b` (S3 #818 merged).
Plan: `.change-plans/ambertime-s4-history/r0.lock.json`, created before implementation; digest `597b56f7d43aeafa416a6cad1729ca08908e268457f7a23dc504aa49c8bd19c5`.

## Player contract

The daily notebook remains S2 (manual8, current4, ended8, independent saved recipes). History is a compact chronological account of important facts. H2 reminiscence remains separate research; this change does not implement its performance or alter selection.

Always retain founding, first actual distillation completion, every formal release, first established relationship per store, and every handover. First bottling is the first release, and a longest-age record is a release attribute, not a duplicate event. Releases capture brand/name, release/product/cask/batch identity, age/count/profile, dates and source generation. Four reusable display slots are never historical identities. A bounded current-cask origin list preserves ordinary predecessor cask provenance across handovers.

Conditional rules:
- Store longevity requires positive deliveries with no gap greater than12months. Add an event at120/240/... months of that observed streak, only on a real delivery. A longer gap resets the streak. Store-level display uses aggregate receipts/count/revenue, not a scan of every delivery.
- First arrival per existing region/node. Inquiry and visit firsts apply outside town; a repeat is retained only after at least120months since the last actual same-kind response in that region. Mere silence creates no event.
- Actual department adoption and fulfilled special orders. Normal deliveries, monthly sales, repeated rumor arrivals and unsuccessful trials are not visible history.

Each event has a stable ID, month, operation index, append order, generation, short facts and formal references. Same-month order stays in append order. Selected reputation events retain scalar source ancestors once in shared evidence. Evidence is not a second list shown to the player. Existing events and completed generation summaries are never reselected or enriched by future events.

## Runtime and save

`history-record.mjs` observes formal before/after results. It contains no game replay or new formal operation. Generation filled/bottled/sold totals, final batch, estate and tenure are retained as summaries. `historyRecordView` produces the old display shape from saved facts and current formal labels.

`shop-app.mjs` no longer imports/creates/posts to the history Worker for normal history or generation review. History years remain expandable; obsolete50-event pagination is removed. Each entry shows month, generation and a short sentence; only release/store links remain. Existing research history/Worker/summary modules remain unchanged for evidence and research. Established old preview fixtures explicitly have no new history; they do not receive fabricated migrated facts.

Session v7 requires historyRecord beside game/clock/slots/notebook. Official game restore/replay validation is unchanged. The same candidate write and readback precedes publication of every sidecar. Rollback/reset/import/cold resume include history. V6 and earlier are rejected without conversion; S3 raw export and confirmed fresh start remain. No independent history key, checkpoint or migration replay.

Distillation completion is saved before a trailing monthly tick so first-completion dates are exact. Outside a month boundary its saved elapsed time includes the completed clock step; at a boundary the valid intermediate completion is saved, followed by the monthly result at elapsed0. A failed completion save prevents the tick. This adds a save boundary, not a game calculation.

## Verification

Final focused tests:105/105 (S1/S2/formal/recipe54, S3/S4 core/save/UI46, H2-5 small5). Syntax and Scope/Risk/Impact pass. Independent core/app reviews completed.

Focused regression covers S1 slots, S2 notebook/recipes, S3 recovery/import/reset, S4 event selection, atomic save, same-month ordering, links, UI cache and the completion/tick boundary. Real formal operations preserve exact JSON and RNG; synthetic cases are identified as such for long continuity, unusual old-cask and response boundaries. Existing formal game/economy/reputation/generation/recipe code is byte-unchanged.

One research-only observation pass over the existing local-policy100-year input collected new facts at30/60/90/100 years. All releases were retained. Existing and new generation summaries matched in all fields, including summary events, totals, final batch, coverage and frozen estate at all four checkpoints. This replay is only in the verification script, never production save migration. Formal restore timing was reused only after input SHA and38 formal dependency hashes matched. H2-5's63-file closure is unchanged and its small tests pass; fixed expected evidence was not rewritten.

See `performance.json` for input hashes, dependencies, Node timings, memory and capacity; `h2-comparison.md` and JSONs for published H2 versus policy and actual local30/100 matching. No H2 selection equivalence is claimed. Specifically local100's21 selected scenes map to11 visible S4 events,2 evidence-only facts and8 not retained facts. Deciding which ordinary sales/distillations/reactions or later store deliveries should become future reminiscence scenes remains the next design stage.

## Remaining gate

Chromium failed before loading a page with process_singleton_posix socket() Operation not permitted (ptrace also denied). No bypass attempted. Node/VM results are not browser rendering evidence. Real browser initial/open/reopen/monthly/history/generation/reset interactions, startup impact and browser memory are unverified. Keep Draft; no Staging merge and no Production change.

iPhone Safari after browser verification: fresh start from previous development save; first distill and two releases; open history, expand year, release/store navigation and return; pause/reload/cold restart; continue across handover and compare predecessor estate; save failure/cancel/fresh reset with no previous events leaking. The major H2 coverage choices remain separate from this UI verification.
