# Time and notification traffic — implementation checkpoint

Status: **DRAFT / UNVERIFIED**. Do not merge until browser integration and long-duration validation are complete.
Base: `a870e0affcea2d124c44622652e50eaf6a827637` (#879). #878/#879 and effective M0 PRs #869/#871/#872/#873/#875/#877 were confirmed merged; #870/#874/#876 were not adopted as separate changes.

## Audit and implemented behavior

- Results previously cleared the active notification; new shop letters also replaced active text. One ordinary presentation lane now finishes its active item before selecting result → world → shop → daily.
- World/shop each retain one latest pending item. Results retain one latest saved transition per room (at most three), without joining unrelated months. Daily lines never wait. IDs are bounded to 256 UI-only dedup entries.
- Unsafe visibility removes the active display timer. Non-daily items interrupted before 3.5 seconds return to their slot, unless a newer item is already pending. Later interruption consumes the display; daily lines are disposable. Reload/session reset drops ephemeral slots.
- Existing Motion v0.2 remains: result 3.5s, daily 6s, shop 6.5s, world 6.5–10s by text length. Passive cards are status regions, not dismiss buttons, and do not capture pointer input. Existing feedback detail buttons remain.
- Ordinary notices are suppressed while M0 is open, including half mode because its existing drawer occupies the notification area. M0 observation still progresses time. No map news panel, badges, or new map design was introduced.
- Existing `userPaused`, `blocked()`, RuntimeClock and manual distillation/tasting safeguards are retained. Modals, errors and hidden documents suppress ordinary display. Feedback previews defer while the ordinary lane is active.
- Shop/generation notification acknowledgement now follows mounted, visible dialog state, using the existing formal notice operation and save transaction. Failure preserves the underlying offer/decision. Generation recall preparation follows successful acknowledgement, retaining its operation-index boundary. Existing M0 suspension/restoration remains.
- Dialogue commit uses the existing successful-save hook. A microtask orders results first; an ephemeral reset epoch prevents an old session callback from leaking into a new session without dropping a valid letter after another save in the same month.

## Verification

- Scope → Risk → Impact: PASS against locked r0. `node --check` and `git diff --check`: PASS.
- Focused notification/clock/ack suite: 28 tests PASS; ack matrix includes 24 combinations of notice kind, document visibility, mounted dialog and save success/failure.
- Simulated 1,200-month notification pressure: latest slots remain bounded; no active overwrite, concatenation or daily backlog. This is presentation stress, not a 100-year economic playthrough.
- Broader requested acceptance selection: 73 PASS / 4 FAIL. The four are existing source/cache assertions in formal-copy and market-rules-ui; base comparison is recorded below rather than silently changing them.
- Browser test added with HTTP-response-only instrumentation (no test hooks ship in the product). Execution attempted: Chromium startup fails with `socket() failed: Operation not permitted`; shared browser cannot reach the test server (`ERR_CONNECTION_REFUSED`). No browser, geometry, touch, focus or visual result is claimed PASS.
- Existing passive-dismiss and immediate-consumption expectations were changed only where the user's new specification explicitly replaces them. Existing unrelated tests and protected calculation/save checks were not weakened or deleted.

Full-suite comparison with complete Git history (same environment): base 1,586 tests = 1,481 PASS / 95 FAIL / 10 SKIP; candidate 1,595 = 1,489 PASS / 95 FAIL / 11 SKIP. There are 94 shared failing test names. The old recall-preparation integration test now passes with its post-mount boundary coverage; the single new failure is the deliberately unrelaxed 32-year fixture described below. The extra browser suite skips by default without explicit browser variables; the separate explicitly enabled launch was attempted and failed at environment startup. These totals do not claim the repository-wide suite is green.

## Preservation and unresolved checks

Formal save format/keys, model, economic parameters, RNG, event eligibility/text (170 adopted lines), recall collector/selection/history, Engine and other works are byte-unchanged in the diff. Important notice operation ordering changed in the UI and is tested explicitly; this is not a new saved field.

The new two-series 32-year preservation scenario has **not passed**. Its latest run halts at month 171 instead of advancing to 172; the test retains the failing assertion. Independent model-only diagnosis: the fixture lists bottles but never assigns them to retail, leaving 94 bottles in hand and zero sales. Cash £2 cannot cover £4 monthly maintenance, so the existing funds safeguard correctly returns the prior state. This is a fixture setup failure, not evidence of a notification-caused economic change. Earlier fixture attempts exposed (1) recall initialization on a non-new legacy fixture and (2) an unfunded idle scenario stopping at month 290. After three attempts, fixture changes stopped under repository rules. No completed multi-decade or generation-crossing comparison is claimed. Existing formal-save and recall-save regressions ran in the broader test selection, but do not substitute for the missing long-run proof.

Independent audit found the original overwrite/occlusion bugs and a same-month follow-up-save dialogue loss in the first implementation; the epoch fix was independently reviewed. The reviewer implemented the small acknowledgement change, so that part was reviewed separately by the main agent and covered by the mounted-dialog/rollback tests; it is not described as an independent review of their own code.

## Remaining before merge

1. Run the new browser suite and existing market compact/rules and dialogue browser suites in a browser-capable environment. Inspect all specified phone widths, long text, map gestures, focus and ARIA behavior; test actual saved failure/recovery and manual distillation exit.
2. Diagnose the long-run scenario's stop, establish a funded valid public-operation path, then complete formal game/RNG/economic/history/recall equality across a generation boundary. Do not relax the assertions to obtain a pass.
3. Resolve or classify full-suite differences against exact base, then confirm required CI at the final candidate SHA.
4. Author iPhone Safari: readability and motion at normal/reduced motion; map half/full gestures and return from a decision; manual pause → ledger open/close; quick room switch after a notice. Browser success is not physical-device evidence.

Staging deployment and Production are unchanged. This is a reviewable implementation checkpoint, not completion of S3 or authorization to proceed to the separate map design task.
