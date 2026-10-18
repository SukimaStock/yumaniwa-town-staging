# Flavor display browser verification

`node works/ambertime/tests/flavor-types-browser.mjs` passes with actual native Chromium at 390×844, 360×740 and 1280×900. See `browser-results.json` for browser version, source hashes, screenshot hashes and measured bounds.

Fixtures use public `newStaffDistillery`, extraction/fill, month advancement, sampling and bottling operations, followed by strict serialize/restore. No arbitrary flavor values, balances or ledger entries are injected. The save envelope is paused and the browser clock frozen.

Verified:

- Current tasting type equals the pure interpretation of the current sampled profile, with three meters and three separate previous-sample tick marks.
- Cask comparison shows the corresponding deterministic type for each actual cask, plus six meters. The two demonstrated profiles differ: dry wood versus an intermediate state.
- Bottle details show the interpretation of the actual immutable release profile and three meters. The displayed type and meter text remain identical after two public month ticks.
- Opening/closing comparison and bottle detail leaves the serialized game unchanged; paused strict reload is exact.
- No page errors or horizontal document/dialog overflow. Type text precedes meter sections without overlap. Comparison/back and tasting controls are reachable by normal scrolling.

All eleven screenshots were opened with `view_image` and visually inspected. At 390px the tasting art, type, meters and all four actions fit together. At 360×740 a small vertical scroll reveals the bottom action row (shown in `360-tasting-actions.png`). Comparison and bottle dialogs retain normal vertical scrolling; bottle controls below the initial viewport are accessible. Existing PC cask remaining-volume text is partly masked behind the tasting panel; this is outside the newly added flavor text.

The optional Irish association is also exercised in a reachable public-operation fixture: seed 1, extraction position 30, refill cask, 13 months. `390-tasting-irish.png` shows the light type and the limited mouthfeel association on a separate line. Physical iPhone Safari, screen readers and author adoption are unverified.
