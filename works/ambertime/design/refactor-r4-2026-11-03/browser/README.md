# R4 browser comparison

Immutable base `75843aa2b6a3b9bf1040970602a4fb4364678ddc` versus product source at `57f170c0a56461bd0fa77f9e62e2fbe7725b297f`. No product changes were needed.

Chromium 140.0.7339.186 and WebKit 26.5 each ran 360×568/DPR1, 375×620/DPR2, 390×680/DPR3, and 390×680/DPR3 reduced-motion. Eight configurations × 29 states × before/after = 464 captures / 232 comparisons. All have zero decoded PNG pixel difference, byte-identical PNG, exact full internal Canvas RGBA digest, DOM/real hit target/focus/ARIA, formal state, and stored raw digest. Both engines fetched changed app and new warehouse controller bodies through an old one-hour module cache. Errors zero.

States cover empty/one/multiple casks; second selection and details; cask comparison and return; tasting/reload/end; room return; native ledger cask list/detail/return; prior tasting; quote1/more/all/cancel; partial bottling and retained selection; full bottling and fallback; controlled hidden/visible; quota failure at selection. Expected formal states are produced with immutable native APIs, strict restore roundtrips, and real root UI actions. Full ordered formal/save failure policies are additionally covered by R4 effect tests; browser sampling does not independently replay all denial/readback/conflict policies.

Rendering samples use controlled Canvas `performance.now` and existing render scheduling events. Native CSS animations are paused at explicit 500ms before capture. Screenshots use CSS scale; Canvas digest covers full internal DPR resolution. These are exact phase samples, not a claim of equivalence at every animation time.

The initial diagnostic matched Canvas/DOM/formal data but differed by 54 screenshot pixels at the existing 0.45s tasting glass pour (bounding box113,124–131,127). Explicit CSS phase sampling resolved this capture nondeterminism; product/CSS unchanged.

`results.json` links per-configuration capture JSON and SHA256; PNGs retain six representative375px states per side/engine. Browser runtime recovery evidence is in environment/. Physical iPhone, VoiceOver audio, touch feel, nonzero safe-area, OS background and actual BFCache remain unverified. Synthetic visibility events are labeled.

During Chromium execution only the JSON writer was changed from aggregate to per-configuration capture files with request counts; interactions/assertions were unchanged. `diagnostics/runner-revisions.json` and the reconstructed exact Chromium runner record both executed-source and final-artifact hashes. WebKit started after that writer edit. Evidence was compacted after execution without repeating completed browser interactions.
