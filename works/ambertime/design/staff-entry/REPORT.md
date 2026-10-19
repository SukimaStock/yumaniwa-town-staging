# AmberTime staff entry and display

Base: `e7cef048ecd789e55689e5e0c7bc3a27bf83eef2` (PR #516). Lock: `.change-plans/ambertime-staff-entry/r0.lock.json`.

## Seven requested adjustments

- Direct staff-request buttons and their dead entry listeners are removed from cask/trial, release/brand record, recipe-source and recipe lists. The only caller of `openStaffRequest` is the distill staff panel's existing request button. Recipe saving/selection, hire, request confirmation, cancel and all model handlers remain.
- Ledger/person belong to one accessible management group. Tap bounds are neighboring with a 6 logical px gap. The existing person glyph is enlarged to 28px and optically centered alongside the unchanged 30×33px book (including its prior brightness and 2px offset). Both tap heights remain 54px.
- Shop acceptance reads `取扱開始`.
- Release comparison reads `前と比べる` across its shared entry points.
- Brand-specific comparison/record contexts use `記録`; mixed history links retain `ブランドの記録` beside `取扱店の記録`.
- Field separators become explicit rows in current comparison, recipe-source, brand/release/shop information and staff status/delivery notice rendering. Short composite information such as `今回 第2回` stays together without a dot. Canvas respects explicit newlines within its existing two-line limit. Names and stored prose are never split/replaced; saved event/sample/record text and screen-reader separators remain. No global DOM replacement or extra explanatory copy.
- The complete `蒸留 £120` label is centered using actual glyph bounds at the existing font/size and 132×45 button bounds. Other HUD/tab geometry and handlers are unchanged.

## Lightweight verification

- PASS: existing layout/input tests, five tests, run once.
- PASS: `tests/staff-entry.mjs` at 390×844 touch; minimal 1280×900 management-button operation. No external request entry in cask/trial/cask comparison/product/release comparison/brand record/recipes. Old bottled source (recipe-2, stopAt35/refill) selected and requested from distill; exact source/recipe retained, cancellation works without cash change. An unsaved manual source remains available for saving. Actual hire button charges its existing £40 once. Names containing `・` and ` · `, brands and saved record arrays stay unchanged.
- PASS: icon group/tap gap/alignment, measured full-label horizontal/vertical center (within1px), revised shop/comparison/record labels, structural line breaks and basic navigation. No page errors. Only two changed-area screenshots reviewed (management icons/button, old-source request).
- PASS: syntax, diff whitespace, Scope → Risk → Impact. Model/save/time/staff/economy/ID/CI files are absent from the diff. Small runtime diff self-reviewed; no independent review claimed.
- Test setup corrections matched numeric text runs, scoped visible dialog selectors, and used the current offer ID and sales-room entry. No model/runtime workaround was introduced for the harness.

## Existing Plan difference and limits

PR #516 remains intact except the newly requested entry removals and display changes. Its direct-cask request path is intentionally replaced by the distill recipe-selection check here; pause-cue timing and unrelated prior checks were not replayed. No full screenshot collection, full E2E, long play, game-wide simulation, physical Safari/VoiceOver or owner-adoption check. Public-operation fixtures only build the few target states; no production data is used.

Required CI/current head-base/reviews, merge, exact-merge Pages and changed-file public byte match are recorded in the PR. CI configuration and PR #514 operations remain unchanged; no completed job replay or gate bypass. Production untouched. Expression audit: remove confusing duplicate entrances and redundant words, no added prose/decoration.
