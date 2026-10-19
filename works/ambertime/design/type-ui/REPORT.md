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

## Completion — public Staging

PR #511: https://github.com/SukimaStock/yumaniwa-town-staging/pull/511

Reviewed candidate: `45e29299b2ad422ca5410d24029d5d1e1d5c5a5e`; tree `7dd7ac363fcf30e84d74f715eea9d6be5ab10e86`. Exact-head Scope→Risk→Impact PASS; trusted-mechanical-evidence, plan-risk-gate, scope-guard and validate CI all success before merge.

Merged Staging SHA: `3d8e14c7562ebc497e643904a906f76952486d38`; merge tree exactly matches candidate. Pages run39268303144 completed success for that SHA: https://github.com/SukimaStock/yumaniwa-town-staging/actions/runs/39268303144 . Postmerge Release Validator Tests39268303603 and Change Operations Tests39268303552 also success.

Public URL: https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/

Normal TLS curl downloaded94 files (all top-level mjs/css, HTML and adopted TTF), every byte matches the merge Git blob. Raw per-file SHA256/Git blob hashes: `public-results.json`, SHA256 `8cafb75ae009f692670a36f90d46fdd786b5da990add2c7e3ef37fb1592eff61`. No insecure curl flag, certificate bypass or request-block workaround used.

Cloud browser opened normally and reloaded the public URL. DOM confirms shop-app v0.24-type-ui-1, fontState ready, AmberMisaki body font, バーボン and シゲキ. Visible public tasting window opened/closed; header471px scrollWidth equals471px clientWidth, body overflow auto. Actual screenshot: `public-confirmation.jpg`. Existing game was not reset. This is a public PC smoke test; the full5-viewport/108gesture suite was local against byte-identical sources, not falsely claimed as repeated live.

Local headless Chromium through existing proxy failed ordinary TLS with `net::ERR_CERT_AUTHORITY_INVALID`; no ignoreHTTPSErrors bypass was used for public confirmation. The cloud browser and curl normal TLS succeeded. Physical Safari, OS keyboard, VoiceOver and owner visual adoption remain unverified.

All implementation/delivery work complete. Public verification evidence is saved to the existing work branch after merge; runtime remains identical to the deployed merge. Production unchanged. No remaining implementation work.
