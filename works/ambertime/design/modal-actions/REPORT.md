# AmberTime modal actions

Base: `cfb46d1e6a955ddfca4e08b9739a5c81f52a8e69` (PR #515). Lock: `.change-plans/ambertime-modal-actions/r0.lock.json`.

## Requested nine adjustments

1. Shared return actions occupy the last footer row at the right edge. Static tasting return and history return DOM order also follow visual order. Existing handlers and meanings of close/cancel/watch remain.
2. Staff confirmation reads `依頼`, with content-width padding and the same tap height.
3. Fixed UI headings, buttons, form labels and system messages use `ブランド`. Dynamic names and historical record content are not passed through replacements.
4. Ledger revenue and upkeep totals use separate paragraph rows; numeric sources unchanged.
5. Fixed label choices display `ホワイト` / `ブラック`; values `cream` / `dark`, colors and save data unchanged.
6. Trial action buttons read `試す`; tasting descriptions/region labels remain where natural.
7. Paused eligible playback border alternates #606575 / #858995 after 12 idle seconds, every 1.2 seconds (2.4-second full cycle). Only the 3px border changes. Pointer/keyboard input resets the delay; resuming, modal/tasting, hidden document, disabled playback or reduced motion suppress it. Display timer only; no game clock/save change or new copy.
8. Fixed `涼しい棚へ移す` choice and contract care action display `冷暗所へ`.
9. Decision trial action moves from the body into the existing footer action grid, with shared heights/spacing and its original handler.

## Lightweight evidence

- PASS: existing canvas layout/input tests, 5 tests, once.
- PASS: `tests/modal-actions.mjs` at 390×844 touch, plus only quote-footer operation at 1280×900. Return placement/height and actual tasting, quote cancel and staff-back transitions; request label/width, source ID, queued request and unchanged cash; grouped decision trial action; brand/color form labels and unchanged underlying values; ledger separate rows; original brand names (including 銘柄) and saved record data retained.
- PASS: browser-clock idle checks: before/after 12s, both border colors, unchanged inner fill, keyboard reset, modal suppression, fresh delay after close, reduced-motion suppression and reset, immediate stop on resume/restart delay on pause. Paused clock check leaves the complete saved session unchanged. No wall-clock long play.
- PASS: syntax, diff whitespace and Scope → Risk → Impact. Model, time, chemistry, economy, staff, save schema and CI files are absent from the diff. Small runtime diff self-reviewed; no independent review claimed.
- Only two changed-area screenshots reviewed: tasting return footer and decision action group. Measurements are in `results.json`. The decision's initial keyboard focus remains visible.
- Harness corrections before final pass: tasting return expectation matched the existing inspect flow, mock clock installed before timer creation, frame assertion isolated inner fill from shadow, media-change event delivery synchronized. These did not require changing gameplay.

## Plan difference and unverified

This nine-item Plan replaces no previous work: PR #515's eight-item polish remains. Its unrelated HUD/icon/close alignment checks were not replayed. Validation is limited to the current request. No full-screen collection, full-feature E2E, long play, full game simulation, physical iPhone/Safari or VoiceOver test. Owner adoption is not inferred. Expression audit adds only the requested short labels and border cue. Production unchanged.

Required CI, current head/base/review status, Pages deployment and public byte equality are recorded in the PR before/after delivery. PR #514 CI operations/configuration remain unchanged; no completed job replay or gate bypass.
