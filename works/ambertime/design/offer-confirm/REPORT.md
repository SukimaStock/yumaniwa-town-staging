# AmberTime offer confirmation

Base: `db51aa502551d0e40a9c838ea92d4d7461363c3f` (PR #517). Lock: `.change-plans/ambertime-offer-confirm/r0.lock.json`.

## Change

Normal shop offers now keep an initially empty quantity selection in the open modal only. Selecting/reselecting does not call save or a model mutation. Release changes and reopening reset selection. Existing pressed colors mark the selected row, and keyboard focus returns to that row after render. The footer remains disabled until the current offer/product/quote/count are valid.

The normal footer calls the existing `acceptShopDelivery` once, with fresh selection and offer-token guards. It no longer exposes normal `acceptShop` without delivery. The model method and existing save/operation history are untouched. Department consultation and its five-bottle direct adoption remain exceptions; established additional delivery, later and decline retain their existing handlers.

Normal offer copy is reduced to shop, brand, release/stock, purchase price, and aligned `本数 / 残り / 入金` columns. No long instructions. User brand names are escaped unchanged.

An 11×11 storefront glyph reuses the work-local icon renderer at the existing3px density (33px, like the book). It sits beside the book in the management group, with a54×54 tap region and name `申し出`. Existing visibility/disabled conditions remain. Trade-info moves beside it to avoid overlap. HUD/tabs and other object art remain.

## Lightweight evidence

- PASS: existing layout/input five tests once; two selected existing shop-flow tests (atomic invalid quantity/product and selected release). No complete model suite replay.
- PASS: `tests/offer-confirm.mjs` at390×844 touch and minimal1280×900. Complete saved bytes stay identical during selection/reselection, release changes, disabled confirmation and deferral. Selection reset/reopen and keyboard focus checked. Pointer selection adds no focus-visible outline.
- PASS: confirmation equals the entire serialized result of public `acceptShopDelivery` (stock, cash, relation, delivery/revenue/operation history). Double click commits once; completed offer replay rejects without mutation. Additional delivery equals public `deliverShop`; ledger shows the combined delivered count. Decline equals public `declineShop`.
- PASS: department `相談を残す` equals public `acceptShop` with no delivery; existing direct five-bottle adoption equals public `acceptShopDelivery`. No conditions/prices were patched.
- PASS: numeric rows fit at both widths;54px offer tap is left beside book with6px gap, above tabs and apart from trade-info. Exact accessible name and open/hide behavior checked. Only two mobile target images reviewed. Page errors: none.
- The final extra release-switch check verified actual product9→6, selection reset and saved-byte equality without repeating completed confirmation/department checks; it is recorded in `results.json`. The default replay script selects the other release. An initial strict-selector assertion in the harness was corrected before the full pass; no runtime workaround.
- PASS: syntax, diff whitespace, Scope→Risk→Impact. No model, schema, math, staff, time, brand-growth or CI file changes. Small runtime diff self-reviewed; no independent review claimed.

## Scope / prior Plan / limits

PR #517's staff and unrelated display checks are not replayed. This Plan replaces only normal offer timing/copy and the sales offer entry. The model still reads historic zero-delivery accept operations, and the department exception is preserved; this is removal of the normal UI entrance, not deletion of a replay operation.

No full-screen collection, full E2E, long play, game-wide simulation, physical Safari/VoiceOver or owner-adoption verification. Public-operation helpers construct only the few target states. Expression audit uses short column labels and removes duplicated prose. Production untouched.

Required CI/current head-base/reviews, exact-tree merge, Pages and six public runtime-file byte checks are recorded in the PR. PR #514 CI operations and all protection remain unchanged; no successful job replay or bypass.
