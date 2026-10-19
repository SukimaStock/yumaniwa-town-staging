# AmberTime UI polish

Base: `6ba0aaeb7b68e538934ed49aece04552b4d70333` (PR #514). Plan: `.change-plans/ambertime-ui-polish/r0.lock.json`.

## Changes

- Menu and playback controls share 45×45 logical bounds, centered symbols and 6px spacing inside the existing HUD.
- Pointer-opened dialog headings retain announcement focus without an outline. Keyboard opening resets the heading's temporary tabindex and starts at the close button; visible keyboard focus remains.
- Shared 48px close button aligns to the title's first line, including two-line headings. Backdrop handling is unchanged.
- Distill, end and fill actions use centered 132px widths instead of 192px; 45px height remains.
- Ledger keeps its pixel shape and tap region, with brighter colors and an exact 2 logical pixel right shift. No text label added.
- Still readout uses the existing comment fill, 3px border and shadow; timing and content are unchanged.
- Fixed system label `原酒と木の重なりを待つ` displays as `熟成を待つ`; saved/model strings and action are unchanged.
- Shelf displays `販売中` and `保管`; inventory and sales calculations are unchanged.

## Lightweight verification

- PASS: 5 existing canvas-layout/scene-input tests (run once).
- PASS: targeted Playwright check at 390×844 touch and minimal 1280×900 desktop, with one 390px baseline comparison. HUD sizes, compact action width, exact ledger offset, pointer heading focus in menu/ledger/fill, inside/backdrop/keyboard close, keyboard-visible close focus, two-line heading alignment, choice text/action and shelf selling label checked.
- PASS: non-mutating menu/ledger interaction preserved serialized save bytes. Page errors: none. Protected model/time/economy/staff/save files are absent from the diff.
- PASS: syntax checks, diff whitespace, Scope → Risk → Impact.
- Visual review limited to two attached 390px images (modal and still readout); `results.json` records measured geometry. The modal image deliberately uses a temporary long title to check alignment; it is not a product copy change.
- Harness setup corrected before final pass: wait for current canvas controls, test the available empty-fixture controls, and check outline style rather than width (CSS can retain width with style `none`). No runtime workaround was added for these harness issues.
- Self-review of the small runtime diff; no independent review claimed. Required CI and exact-head/review checks are recorded in the PR before merge.

## Scope and limits

Compared with PR #513's broader UI-tidy plan, this locked plan covers only the eight requested adjustments. No unrelated sales/comparison/post-fill replay, full screenshot collection, full E2E, long play or game-wide simulation. No physical iPhone/Safari/VoiceOver or owner adoption verification. Production is untouched.

PR #514 CI configuration is unchanged. Required checks remain mandatory; do not rerun completed jobs or infer runner waiting solely from a summary status. Expression audit: only the requested short label/state changes; no extra explanation, decoration or invented copy.
