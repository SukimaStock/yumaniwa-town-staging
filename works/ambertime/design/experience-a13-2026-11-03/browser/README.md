# A1-3 browser verification

Final run: `node works/ambertime/tests/a1-browser-completion.mjs`, exit0,40 natural-time cases plus2 independent fixed-stage proof pages, pageerrors0. The established entrypoint imports the new `a1-3-browser-completion.mjs`; previous A1-2 runners/artifacts remain unchanged historical references. Product3 source hashes match at start/end.

## Natural operation

Chromium140 / WebKit26.5 ×360×568,375×620,390×680,430×740,DPR1/2/3,normal/reduced:16cases. Twelve boundaries eachengine: hidden,pagehide,room,modal,reload,reset,mid-reduce,saveconflict,repeatedclicks,fontloss,contextlosspredicate,stoppedRAF:24cases. Hidden/pagehide/storage/context/RAF conditions are synthetic, not OS/device observations.

No fake clock/performance override. Real pointer ends lawful collection, formal result and saved bytes match D.stopDistillation in every case except intentionally resetting to a newgame. Normal runs submitted all11stages at distinct draws before one finish/callback/modal, each stage held for its independent expected duration; the last faintcell disappears before the20ms tail. Original rim remains first3stages. After modal, draw count stayed constant across a further150ms probe. Reduced never starts the animation (accepted=false,0activeframes/finish/callback).

Natural measurement is lightweight draw/RAF/timestamp/state observation only. Pixel loops, PNG serialization and fixed-stage drawing are separated into dedicated proof pages, so they do not inflate the natural measured stage times. `performance.now()` at wrapper draw entry can differ slightly from internal compositing time; temporal hold checks allow2ms only for this sampling offset. Pixel comparison tolerance is exactly0.

|Engine|Width|Finish ms|Canvas submissions|Glint RAF opportunities|Modal open ms|First modal RAF opportunity ms|
|---|---:|---:|---:|---:|---:|---:|
|chromium|360|853.4|11|40|865.7|870.1|
|chromium|375|853.8|11|40|868.2|871.3|
|chromium|390|839.6|11|41|855.3|860.5|
|chromium|430|856.4|11|40|871.8|874.9|
|webkit|360|865.0|11|43|880.0|909.0|
|webkit|375|867.0|11|43|884.0|929.0|
|webkit|390|884.0|11|44|903.0|990.0|
|webkit|430|884.0|11|43|900.0|954.0|

These timings include shared-host scheduling and synchronous render, and therefore exceed nominal740ms. Each first stage draw changed the world cache and every destination composition preceded the modal. RAF opportunities and Canvas submissions do not prove physical screen presentation.

## Independent fixed-stage pixels

For each engine, a separate375px page finishes a real operation, then paints each stage onto a copy of the unchanged world. Stages1–3 are compared byte-for-byte against the actual original paint method extracted from immutable Git7662134c. Stages4–11 are compared against an independently specified manual orthogonal-cell/alpha reference (not the product stage table). Full120×214 pixel difference is0 for every stage. Counts are4/4/4/1/5/9/9/5/1/1/1, with outside-region difference0. The cross uses only Manhattan-axis cells around glass-relative(+8,-3), radius≤2, no diagonalcells. Reference center alpha is1/1/1/1/.88/.65/.36/.14; arms1→.9→.65; outertips1→.35→removed.

`*-fixed-stage-1..11.png` and`*-fixed-off.png` are exact fixed-stage world images, not natural presentation-time captures. `*-fixed-contact.png` crops/nearest-neighbor enlarges those exact images to show the local transition. `*-fixed-modal.png` is the actual page after the operation. Actual natural frame timestamps/glassposition/cacheupdate/modalstate/callback are in results.json and perwidth traces. DOM/hit/focus/ARIA consistency is additionally covered by main's208 settled non-glint before/after comparisons.

## Diagnostics retained

1. `initial-harness-fixed-proof-*`: the first fixedproof spread a fake scene into a plainobject and dropped inheritedtoolPaintX, so the old-rim reference receivedNaN and mismatched4pixels. The reference now calls the same fake scene directly; no product correction or pixel tolerance change.
2. `initial-normal-deadline-*`: an instrumented matrix passed6cases then its430px normal run failed the all11stages assertion, consistent with boundedwatchdog fallback. That failingcase's fulltrace was not retained, so its exact cause is unverified. Priorcases and source hashes are retained. An instrumented430pilot subsequently passed14cases, including fixedproof. The final matrix separates expensive pixel/PNG work from natural observation and passesall40; it does not increase the product deadline or relax the allstage assertions.
3. `instrumented-pilot430-*` and`light-pilot430-*` keep the selected-width checks separate from the complete finalmatrix. Diagnostic old naturalPNG captures are in diagnostics/instrumented-frame-captures and are not final timingproof.

Physical iPhone Safari visibility/feel, physical display presentation, VoiceOver, real OS background and real BFCache remain unverified.
