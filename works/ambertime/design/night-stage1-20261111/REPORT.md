# AmberTime night stage 1 — 2026-11-11

Status: implementation present; Draft pending browser verification and exact-head CI. No Staging merge or Pages deployment. Physical iPhone Safari UNVERIFIED.

Base: ebc507df0ece98dadab0673e9d27e39a69424467. Locked before implementation: `.change-plans/ambertime-night-stage1-20261111/r0.lock.json` (remote plan-only commit 9962d8609d44f36546f7d7e20fc4da3e092ad922).

## Changes

- Long fermentation is selectable from initial play. The user's `長め` corresponds to the existing fermentation card; aging/flavor calculations and recorded choices are unchanged. Existing model default long is now shown rather than forced to short by a presentation lock.
- Refill left, bourbon right in the actual fill dialog.
- Positive/negative quantity deltas to the right; remove reserved upper delta row. Quantity operation buttons unchanged.
- Horizontal notice entry6/exit5 discrete steps; existing 240/180ms durations. Fixed scene viewport clips travel in desktop letterboxing.
- Targeted cask/store notices show › and open the existing inspector/store on its actual layer. Other notices dismiss without moving. Escape always dismisses. Pointer sequence consumed to prevent click-through.
- Displayed notices follow room changes where space permits; occlusion preserves remaining time without hidden expiry. Completed notices never replay in the session. No inbox/persistent notification history.
- Removed independent body-mounted `important-top-notice` presentation. Existing last-generation scene notification keeps original text/deadline; generation acknowledgement and recall unchanged.

## Verification

- Scope -> Risk -> Impact PASS, WORK / Standard, runtime/regression declared.
- Targeted UI/notice/card/layout tests: 56/56 PASS.
- Routing and dialogue tests:17/17 PASS (stale/untargeted dismissal, actual store layer, surviving cask, pointer capture).
- Independent review found and corrected heading chevron geometry, invisible shop lifetime consumption and Escape navigation. Reviewer found no remaining concrete core blocker. Geometry+scheduler proof preserves 4500ms after a 90000ms obstruction, displayed count remains1.
- Required formal-copy/market-rules-ui tests have four existing failures also reproduced on exact base ebc507df (three formal-copy, one market-rules-ui stale source assertions). Expectations not weakened.
- Actual Chromium attempts for notice lane and compact/rules failed before navigation: process_singleton_posix.cc socket() EPERM; ptrace EPERM. Shared browser fallback could not reach local test server: ERR_CONNECTION_REFUSED. No rendering/phone-layout pass claimed.
- Entire regression suite was started; result will be recorded on PR when available. No past long-career results substituted.

## Preservation and remaining work

No change to partner-orders, formal reader/writer/codec, inventory/cash/sales, reservation semantics, RNG or replay operations. Existing Draft PR894 IDB work untouched. Production untouched.

Before merge: inspect exact-head CI and remaining regression failures, execute browser UI tests on a usable browser host, check desktop clipping and mobile count spacing/scrolling/notice routes/last-generation scene display. iPhone Safari remains author's check. This PR must remain Draft until those checks establish the UI contract. Later stages are isolated from main while this is blocked; reconcile their patches and fresh locks after predecessor merges.

Expression audit: no decorative copy or new permanent controls; necessary route chevron and keyboard interactions retained.
