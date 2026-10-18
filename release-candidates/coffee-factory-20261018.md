# CoffeeFactory — release candidate (2026-10-18)

State: candidate preparation only / UNVERIFIED. Production PR is to remain unmerged. No production release instruction has been given.

## Decision and baselines

Owner 2026-10-18T13:19+02:00 reported that the current app worked, then accepted preparation of an unmerged Production PR. This is the candidate decision, not publication permission. It does not attest to every recovery scenario or a new exact-SHA test.

- App source: staging `a57db6242c08a242a0228c5e93539ad7d426a886`.
- Production baseline: `18ba9016822a9545af8c503d6f931889e68670b5`.
- Exactly one addition: `coffee-factory`, existing soft 360×640 embedded frame in the Leisure Center. Existing authored physical exhibit/trigger/registry/64×64 asset is selected unchanged. No new placement design or common player change.
- Proposed publication order: orbit,diorama-calendar,rojiura-masala,steamclock,dotweather,junkissa-dive,midnight-cola,yakitori-wars,rainy-window,pumpoko,coffee-factory. Preserve twelve existing Shinpo articles and standalone tourist desk.

## Selected files and environment

17 runtime files: index.html, codea-lite.js, sketch.js, coffee-sound-config.js; coffee-cup-icon.png, beans-icon.png, kettle-icon.png, factory-exterior-line.png; CoffeeFactory.mp3; ui_select.wav, ui_step.wav, factory_start.wav, grinder_lever.wav, steam_soft.wav, brew_ready.wav, brew_change.wav, brew_finish.wav.

Shared `engine/sukimastock-engine.v0.2.0.js` already exists byte-identically in Production and stays unchanged. App HTML changes only staging `noindex,nofollow` to production runtime `noindex,follow`. No work Service Worker. Google Fonts remains the existing optional external font. Preserve identity `coffeefactory` and setup/language/sound storage keys. In-progress brew intentionally resets on reload; no new persistence promise.

Exclude sound-lab.html, migration documentation, unused OGGs/sound icons, all other prototypes, LAB and its registry, other work runtime/engine versions and staging-only UI. Copy only CoffeeFactory entries into Production-owned works/search/guide/ghost/update/lifecycle data. Preserve existing artwork and authored metadata. The historical 2026-09-18 installation record describes Staging; do not treat it as a Production deployment date.

## Owner supplied images (2026-10-18)

Owner supplied the final image files and corrected the intended destination to match the other work folders. Save original bytes as assets/works/coffee-factory/icon.png (PNG1024×1024) and ogp.jpg (JPEG1200×630). Search/Share uses ogp.jpg with accurate image alt. The earlier separate Library folder was a routing error and is not the canonical project asset location. No crop, resizing or image generation is applied. Existing iconless home-screen contract remains unchanged; this change does not add installation/offline support.

Checks must run on the repository diff and generated image references; an unrelated save receipt does not satisfy that check. App UI and original Japanese/English prose remain unchanged.

## Checks and limits

- Dependency and exact-source review: existing Engine plus all referenced local runtime assets found. Recipe clock smoke checks recipe totals, foreground/hidden elapsed time, pause/resume, seek and completion.
- Staging guide/asset regressions: 63/63 PASS. Production developer/player history and eleven-work publication regressions: 39/39 PASS.
- Staging CoffeeFactory Release Validator: 263 PASS, 0 FAIL, 0 HQ_REQUIRED, 1 WARNING, 8 external checks. Production candidate CoffeeFactory: 299 PASS, 0 FAIL, 0 HQ_REQUIRED, 2 WARNING, 8 external checks. These are static candidate results, not Release Ready or Release Complete.
- Existing v0.3 audio lifecycle suite is not compatible wholesale with the selected v0.2 Engine. Against v0.2 it reports 2/39 PASS; do not present this as passing or upgrade the Engine only to satisfy that suite. The real CoffeeFactory deferred-resume test also exposes early media play before AudioContext recovery resolves. Treat this as a pre-existing recovery boundary to assess, not a demonstrated ordinary-play failure or a newly introduced regression. Engine migration is outside this preparation change.
- Browser QA unavailable in this managed session (`control-browser` absent); no new browser/device screenshot or physical arrival/return claim. User's successful device report is preserved separately.
- Still UNVERIFIED: Brew → background → return (including suspended/rejected recovery), sound off/on, paused background behavior, no duplicate/restarted BGM, physical exhibit approach/collision/return, production setup persistence/re-entry, actual social card crop, external Plausible Goals/ingestion and live Production URLs.

LAB remains Prototype Bench while candidate: release has not occurred. Update it only after an authorized deployment and evidence.

## Next step and rollback

Review the unmerged Production diff and audio recovery boundary before requesting publication. Production generation uses an explicit preparation-only instruction reference; its CLI acceptance does not authorize deployment. If this candidate changes, recheck affected contracts and regressions. Revert only this preparation PR; preserve all other works and storage. After separate release authorization: merge exact reviewed Production head, verify Safety/Pages/live routes, then update candidate → released with actual evidence. External announcement is an author handoff, not an automatic SNS post.
