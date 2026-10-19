# AmberTime type/UI recovery — 2026-10-19

## Recovery checkpoint

Remote main was `0efa6afacc07dd9965f9a899f0914d992963b5ff`; remote `ambertime-type-ui` was plan-only `731ea25d936825c2ed7be622defd8fe3faaa23f2`. PR510 was already merged. Old local worktree `/workspace/scratch/a95109a9c610/repo` retained nine modified source/provenance files, Gothic2nd TTF, comparison images, five verification scripts and historical reports. No running process using that old path was observed. Old worktree was left untouched; files copied and byte checked. No remote implementation was recovered because none was present at that branch tip.

Recovery commit: `2de3c84`. Its copied JSON/screenshots/review are historical, not newly verified results. Current runs replace result JSON/images only after completion. During recovery tracked files unexpectedly returned to baseline between tool calls; cause unknown. Restored from recovery commit; no guessed root cause is asserted. Initial browser failures ran against mixed/baseline files and are not success evidence.

## Remaining work

Finish atomic price/unit wrapping, rerun current-source tests, review current source, exact-head gates, draft PR/CI, merge, Pages and public byte/operation check. Keep all protected model/time/save files unchanged.

## Presentation decisions

Use original official Gothic2nd at the same size for Japanese and numbers; remove old Gothic-only enlarged digits and baseline offset. See comparison/REPORT.md and equal-size/compensation-separated images. White unfilled outline selected for both cask/bottle; see selection/REPORT.md. Existing yellow focus remains separate.

Yellow line: old close-button keyboard focus outline (3px + 2px offset) clipped by scrollable heading. Horizontal scrollbar was a separate 8px width overflow, still present when outline was removed. Grid title/48px close, min-width:0 and 6px heading padding preserve all focus edges; body retains vertical scroll. Historical before-windows captures retain separate measurements.

Current fix: nonwrapping `.ui-quantity` and descendants; price action columns wrap to fit. Display-only change, no global font shrinking.

Unverified: physical Safari, OS keyboard, VoiceOver, owner design adoption. Production untouched.

## Fresh recovery-session verification

Source revision: `8717c388bf7925a9491e92a8658a2d377a885247`; runtime sources stayed unchanged through all successful checks below.

- Independent current-source unit run: 577 passed, zero failed/skipped/cancelled, exit 0, 124.48s. Initial mixed-source run is not used as exact-source evidence.
- Full `pixel-space-browser.mjs`: all 5 sizes 360×740,390×844,360×640,1024×768,1280×900; 10 checks,198 geometries,108 trusted touch gestures,16 screenshots. Successful session21692 exit0; 11 source SHA256 and 16 screenshot hashes match files. Three rooms, close/focus/scroll, 2×pinch, input/old-save/generation reload, broken-save recovery, one existing clock and economic operations pass. Earlier mixed-source scroll assertion failed; clean recovered-source rerun passed without product/test weakening.
- `type-ui-windows.mjs`:390px and PC no header overflow; keyboard focus visible; long titles; 3 prices stay one line; footer close right; money up to £1,188,888,888,888 does not overlap date/generation. Initial capture failed to observe scene when clicking the already active room; test now switches room before observing actual renderer.
- `type-ui-contracts.mjs`:5 cases (360,390 DPR3,768,1280,font fallback), real pause/start/progress/blocked modal, play/pause pixel masks, staff/recipe facts/costs, cask names/price rows, original user name and saved record payload exact after reload.
- `type-ui-fonts.mjs`:cold,warm,failed,delayed at DPR1/3 all8 pass.
- `type-ui-font-comparison.mjs`:three official faces, equal24px DPR1/3 plus separate old-digit-compensation condition, all7 strings, regenerated actual Canvas/HTML metrics/images.
- Independent read-only browser review:360×740,390×844 DPR3,1280×900,360×430,blocked-font fallback. Nonoverlapping title/close, nowrap £16.00/本, visible yellow focus, body scrolling/Escape, no errors. Previous price finding resolved. Runtime SHA256 unchanged before/after.

The generic pixel-space runner is copied to `tests/type-ui-browser.mjs` for this scope, with strict TLS for future public verification; no existing shared/old test has been weakened.

## Before and after

| Area | Before | After |
| --- | --- | --- |
| Numbers | Gothic24px with numbers32px and baseline drop | Gothic2nd24px uniformly;7-dot height and original proportions |
| Header | generation inline/month not visibly represented | date/generation left,cash right,framedmenu,existing month-progress lower bar and dot playback |
| Native header | scrollable flex heading;8px overflow and clipped focus | title minmax+fixed48px close;6px focus space;0px overflow |
| Barrel choice | art/name/price inline | art,short name,price on separate lines |
| Sales price | amount and unit could split | atomic quantity;columns reflow |
| Selection | yellow outline+blue fill | same unfilled offwhite pixel outline for cask/bottle;yellow keyboard focus distinct |
| Staff/recipe | long joined explanations | cost/salary/source/extraction/cask rows;conditions retained |

Screenshots: before/390-warehouse.png → after/390-warehouse.png; before/390-distill.png → after/390-distill.png; before/390-cask-window.png → windows/390-keyboard-close.png. Comparison and selection variants are in their named subdirectories.

Expression audit completed: no decorative copy, no duplicate instructions, preserved action discovery/costs/conditions/flavor data/accessibility. No model,time scheduling,economy,save format/key,user names or historical prose rewriting. Production/sharedEngine/other works unchanged.

## PR511 oversized-quantity follow-up

The automatic review completed after merge and identified valid up-to-1e12 totals overflowing at200% text. This was reproduced and repaired within the original UI scope. Follow-up plan `.change-plans/ambertime-quantity-fit/r0.lock.json` anchors merged3d8e14c; final patch applied after locked plan commit. Earlier design probes are not successful evidence.

Default quantities and nested numerals now reflow. Only bounded price controls preserve nowrap. A viewport-constrained300px minimum allows atomic prices in height-fitted short scenes. Long title alone scrolls vertically at25vh; close stays outside title scroll with visible focus padding, body scroll remains.

Probes: global reflow resolved large totals; enlarged short-screen price needed216px while old body had190px, solved by viewport-constrained minimum.30vh title cap left60px body; final25vh cap yields82px, keeping a complete enlarged line. No text shrink/hidden focus/hidden scrollbar used.

Current window regression:360×740,390×844 DPR3,360×430,1280×900,200% text with long title and simulated£1,000,000,000,000. No horizontal overflow, each£16.00/本 stays one line, body at least64px, scroll/focus/close checks pass. This is layout stress without fabricating a high-wealth saved model state. Existing contracts5cases also pass. Full5viewport regression and independent review completed successfully (details below). RuntimeJS/model/time/economy/save unchanged; only CSS and regression test change. Fresh outputs live underquantity-fit/; original windows results remain historical.

### Follow-up final verification

- CSS SHA256 `6a122982fe1a775d8f61a93d90e6e8a5d5ed19b1650921fb111e8f70f61da32d`; all runtimeJS unchanged from deployed3d8e14c.
- Full5viewports:10checks/198geometry/108trustedgestures/16screens pass, exit0;11source and16image hashes match current files. Evidence quantity-fit/after/browser-results.json.
- One earlier full attempt stopped at390px modal swipe; isolated same390condition passes27gestures, then unchanged full suite passes. Cause remains unknown; no assertion or gesture checks were relaxed. Evidence quantity-fit/isolated-390/. This is not reported as a diagnosed product defect.
- Independent4viewport2×longtitle/gianttotal probe: body82px(short430),310px(360×740),452px(390×844),523px(PC); title/body scroll, visible focus and atomicprice pass; save bytes unchanged.
- Window test rerun4cases after review found screenshot names omitted height. Names now include width+height for every capture; tall and short360px evidence both retained. Distinct12PNG captures in quantity-fit/windows/. No source-runtime change required for this artifact correction.
- Existing contracts5cases pass. Prior577unit run remains valid for unchanged runtimeJS/model; CSS follow-up verified by the fresh full browser suite.
- Scope/Risk/Impact and CI will be confirmed at final exact remote head before merge. Physical Safari/OS keyboard/VoiceOver remain unverified.

### Final close-only guard

Final CSS SHA256 `6c6d685581b3123761fc65328f0e92a6e3aac5b641bfe5e7a2ba859058267688`. Visual QA found enlarged閉じる wrapping in the fixed half-column. Only a sole close action now spans the footer grid, remains right aligned and uses intrinsic width; paired actions are unchanged. Independent probe confirmed90px close at390normal and160px one-line close at360×430/200%, with unchanged saves.

Final-source window checks now cover6viewports:360×740,390×844 DPR3,360×640,360×430,1024×768,1280×900, including200% text, giant-total wrap, atomicprice, single-line close, body capacity, focus, overflow and actual normal close placement.18distinct images use width+height names. All6 pass; existing contracts5cases rerun pass with current CSS and original names/history exact. Results inquantity-fit/windows/ andquantity-fit/contracts/.

The full5viewport/108gesture result above used6a122982CSS. The subsequent sole-close selector was verified by the final6window cases and5contracts; all runtimeJS and model/save bytes remain unchanged. A supplementary full run started before the width correction was not used as final-source evidence; it stopped at the same intermittent swipe assertion. No mixed-source run is claimed as success and no gesture assertion was weakened.
