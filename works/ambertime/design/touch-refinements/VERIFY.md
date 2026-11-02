# AmberTime — touch refinements

Image/test comparison base: `bbdd8865d65918602ee16186f5f759363c5c71b1`. Final Plan base: `13dda439afa1a0a7b24095d8a6f5c66934d645b8`; its only intervening change is unrelated one-drop work/LAB registration. AmberTime sources and checks are unchanged between these bases. A fresh branch and r0 lock precede the transferred implementation. Scope is this work on Staging. Production is excluded. The r0 lock was committed before implementation.

## Changes

- Brewing: keep the 54 logical pixel panel and existing hit area. Separate malt and fermentation groups by at least 12 logical pixels while editing, 24 when active. Keep the original 16×16 icons, native pixel colors and text size. Recover room for the cost by using a 3 pixel icon/name gap and 6 pixel left inset.
- Store identity: 16→20 logical pixel icon, centered above the actual centered store-name glyphs. Existing name/detail and shelf/bottle actions remain.
- Distiller: discovery after six completed manual barrel fills, previously eight. Not based on month, generation or funds. Hiring still charges £40, salary remains £12 per paid preparation, with unchanged reserve checks. Bottler remains 150 manually bottled bottles. Keep the old v1 eight-fill replay boundary and derive current eligibility at six. Existing notice/hire operations persist the earned flag. No new save field, version, key or opcode.
- Bottler toggle: no reservation (or completed reservation) and no saved common policy cannot delegate because conditions must be frozen into the reservation. Show **先に共通設定を保存してください** immediately below the pressed cask switch and scroll it into view. “Save” means the common policy, not the game save. Existing paused reservations resume under their own frozen conditions.
- Quantity: bottler count is a native select with ±1 buttons and endpoint disabling; no numeric keyboard for count. Manual bottling keeps its existing staged select/±/remaining-all, adds exact one and half choices, and preserves a prior one/half choice on reopening. All changes before confirmation are UI drafts. Formal bottling still checks actual liquid, funds, fees and salary.

## Verification

- Final targeted Node suite: **86/86 pass**. Includes required market UI/formal-copy/rules, staff experience/progression/economy, partial bottling and roles.
- Existing Chromium browser regressions: **2/2 pass**, native actual inventories, placements/returns, saved monthly sale, old-save adoption, backup failure and exact reload; 360/375/390/430 and DPR1/3.
- Bottling browser: Chromium and Linux WebKit at 360×568, 375×620, 390×680. Local message visible without saved-state writes; select/± lower/upper limits; policy commit exact; delegate/pause/resume exact; small/large volumes, one/half/all choices, formal one-bottle fee/volume, strict reload and reopen preserving1. See each engine’s `bottling-results.json`.
- Brewing/store matrix: **105/105 checks per engine, errors[]**, including all three widths, four combinations, confirmed/active, actual glyph-center checks and native icon pixels. Before/after images: see engine `results.json`/`display-results.json` and the browser reproduction script. Brewing uses actual replayable game saves; dense store combinations use explicitly display-only fixtures with real store SVG. These display fixtures do not claim simulated economic results.
- Whole exploratory suite: **1,130 tests; 1,117 pass, 11 fail, 2 skip**. All eleven failures reproduce on the unchanged base in the two baseline comparison runs. They are not weakened or rewritten here. The old staff threshold assertion was intentionally updated to six while preserving the separate eight-fill saved replay assertion.

Baseline failures (same names on base and candidate):

1. quiet monthly shortages and zero orders stay in ledger while real production and sales notify
2. panel shares existing hit target and versioned cache graph while equipment and tools stay fixed
3. cut entry and changed drawing dependencies use new versioned module identities
4. distill-cut-main-integration.test.mjs module import
5. actual finish handler keeps new results visible and preserves legacy auto-fill
6. cache still one computation across100 extraction clones; simulation/Canvas/clock/store unchanged
7. CSS is attribute-scoped, handles every live text root and leaves sprite/icon geometry untouched
8. entry versions every changed retail display dependency without replacing distillation graph
9. calculation/save sources and clock/animation/progress paths remain identical to616
10. special-order cool choices are not silently converted and explicit final bottling plans remain required
11. actual scene drawing keeps selection blink visible but stops it behind a dialog

## Formal invariants and review

No chemistry, formal collection yield, maturation, store pricing/demand, reputation, map, lever/glass, cut bar or liquid animation source changed. Existing model/save regressions and preimplementation save hashes at manual fills5/6/7/8 match byte-for-byte, including fresh-process strict restoration. Six-fill notice and hire replay through existing opcodes. Earlier optional staff availability is the intended gameplay difference. Low-funds quote choice boundaries remain clamped and the actual reserve/transaction rules are unchanged; no fabricated low-cash save is used as economic evidence.

Independent code review identified and resolved prior-count restoration for the new one/half choices. No further blocking defect remained. Source/runtime cache queries were updated. Expression audit: one necessary local reason only, no new explanatory screen or decorative copy.

Compatibility is old-save→new-reader. A save containing an earned six-fill notice/hire cannot be replayed by the old eight-fill reader. Before reverting a deployed reader, retain a backup/compatible reader; a plain code revert does not establish reverse save compatibility.

## Reproduce

Set `AMBER_BROWSER_MODULE` to an installed Playwright module. `touch-refinements-browser.mjs` and `touch-bottling-browser.mjs` use the environment’s Chromium executable and Linux WebKit wrapper; no browser dependency is shipped with the work. Run each with `AMBER_TOOL_ENGINE=chromium` and `AMBER_TOOL_ENGINE=webkit`. The former serves the before files from base Git objects and the after files from the worktree.

## Remaining author checks

Physical iPhone Safari, native select feel, browser toolbar/safe-area behavior and VoiceOver are **UNVERIFIED**. Check the four brewing combinations, icon/name grouping, the unsaved-policy message on a lower cask, quantity changes and reopening after a one-bottle commit. Browser success does not substitute for physical touch acceptance.
