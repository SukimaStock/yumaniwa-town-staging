# Targeted native shop offers

Base: 542c923439d3b70867374d30f2cbbb20c8566f20. Staging only. Prior remote lock r0 5476617ebda61851f303678baf017e8d004c3b7a; r1 d6ca93edba9576846697eff917265d31c1ea6b4c adds the live nearby-comparison cache reader before implementation. Existing locks are unchanged.

## Design decisions and authority

The author's 2026-11-11 23:04 UTC night request explicitly requests exact shopId/offerId queue repair, preservation of old operations and records, independent stores and 12-month decline, and permits Staging integration after checks. Eight HQ design points are recorded in the Full Plan: current authoritative model/UI; missing pending selection; old-opcode widening rejected; explicit minimal selection; no other work/scene change; append-only compatibility; test matrix; reader-preserving rollback. Independent technical design review agreed conditionally before implementation, and identified the monthly-only notification gate as unsafe. This review is not external write approval or CI approval.

## Implementation

- New stockist-select operation swaps exact pending invitation with head, retaining complete payloads, notified bits and other pending order. Selecting head is no-op; stale pair rejects. Old notice/accept/decline meanings remain head-only.
- Every native shop and product invitation is selectable. Existing act/saveCandidate commits selection before mounting the dialogue. Existing mounted-dialog acknowledgement remains separate. No unseen invitation is silently noticed.
- Session-only automatic presentation opportunity is consumed on opening. Rendering, closing and responses do not rearm it. Explicit room navigation or time resume and a new/load session rearm it. Manual invitations stay available. Generation obligations can display despite a deferred unnotified native offer; repeat model gating is unchanged.
- Live model cache closure is app plus nearby-comparison only. Recursive relative module/URL traversal covers over 100 modules. Historical comparison/history/placement entrypoints are not reachable from current shop-app. Both live readers now use the exact same new model URL, also correcting the preexisting missing assignment parameter in nearby reader. Entry diagnostics allow only fixed offers=targeted-v01.
- No new UI decoration, economics, release records, formal codec, recall code, or other works changed.

## Verification

76 tests PASS: stockists, shop-flow, department, targeted-offers, targeted-offers-ui. New coverage includes natural multiple queued stores, exact selection and stale pair, unchanged legacy head semantics, decline cooldown, noticed pending reselection, partial extraction replay, modern department selectionId and queued delivery, formal v8 with all sidecars, quota-write failure preserving prior bytes, tampered opcode/state rejection and cold native process replay.

UI tests execute the actual app act/open/show functions and auto-display conditions in Node VM with injected failed save. They verify no modal or budget mutation before successful selection save, manual choice after opportunity consumption, no cascade, generation availability, and continuation without waiting for a new month. These are logic tests, not browser interaction tests.

Required market-ui-main, formal-copy, market-rules-ui and entry-diagnostics: 38/42 pass. The same four source-string expectation failures reproduce unchanged at base542c923: short visible names, staff/ledger source expectations, legacy cache regex and entry URL query order. No expectations weakened or failures relabelled PASS.

Scope, Risk, Impact PASS. Node syntax and git diff --check PASS. Exact committed candidate Trusted Static and remote CI are separate integration gates.

Browser attempt: default Playwright executable absent; installed /usr/bin/chromium exits before opening a page. No browser display/touch or physical iPhone verification achieved. Author handoff remains UNVERIFIED. This queue-only change makes no new 30/100-year consignment claim.

## Rollback and author checks

Do not deploy an old reader after any stockist-select save: retain new opcode support and disable UI selection entry if rollback is needed. Never delete prior save bytes. Existing user's 154-month save is not available here and was not changed.

On iPhone: retain exported backup; open two different stores with pending offers, defer one and accept/decline the other; ensure no cascade on closing; reload and verify relations/invitations; switch room/resume to see another available invitation; verify department consultation and generation notice. Production untouched.

## Integration gate correction

Before opening a PR, workflow inspection found current Change PR Gate accepts exactly one fresh r0, not r1 expansion. No failed CI or write denial was bypassed. Prior branch and locks remain unchanged as superseded evidence. Fresh integration branch starts at unchanged main542c923 with complete-scope r0 committed alone at9e68958d77d630194d76e9fae6f2b6f662d55fc7 before applying the reviewed runtime candidate. Candidate code is byte-identical; only this report adds the gate explanation. Regional-partners and targeted UI cache tests:14/14 PASS, including exact live model URL equality.
