# PUMPOKO audio gate audit — 2026-10-15

## Target and cause

Audit base: `96df238d86cbb01e4d888eb32c64ea9a5ed5b1f9` (Staging).
Canonical current game: `works/pumpoko/`; `works/pumpoko-02/` redirects here. Original game lives at `works/pumpoko-01/` and is unchanged.

The public jam page https://sukimastock.itch.io/pumpoko identifies submission https://itch.io/jam/ultimate-ai-powered-game-jam-5/rate/5136928 and currently embeds https://html-classic.itch.zone/html/19688448/index.html?v=1791705097. Chrome DOM confirmed the iframe and title controls. Direct HTTP downloads of that build's app.js and sukimastock-engine.js yielded Git blobs `eb1e021f792ff35339220ad1988c60f888a57107` and `4fc03b96205ab2fb6213e95f88a2880e9cd5b235`. App blob matches historical canonical code (including `68252f5`); Engine blob matches `12ac5e4`. This is a self-contained uploaded build: Staging merge cannot update it.

Engine already bounds HTMLAudio readiness at 15,000 ms. Its preload resolves with a null failed entry, while resourceState records failure. PUMPOKO copies that failure into local musicStatus. Its media readiness escape only applies while status is loading. Therefore a retained player becoming playable after timeout (including trusted title interaction) cannot release the gate. Waiting longer cannot fix that local status. This code path was introduced in `49d0b109` on 2026-10-10, under the former pumpoko-02 path.

The fallback deliberately calls setEnabled(false): all music/SE stop and pumpoko-02.sound=false is persisted. It neither closes nor suspends the context. The existing sound button can re-enable audio. No special title-to-game music stop exists; the intended soundtrack uses the same retained player.

#168 / Engine 0.3.0 context-resume ordering and later #381/#385 fix lifecycle/activation recovery. #203/#382 correct the fallback button label; #386 adds native Start unlock. These do not repair this work-local sticky failure. No shared Engine modification is needed.

## Minimal repair

Only app.js changes at runtime:

- Accept error-free retained media readiness after failed preload too. HAVE_FUTURE_DATA is sufficient; HAVE_CURRENT_DATA is sufficient only when playback is already active.
- Hide the stale fallback once the gate is ready.
- Recheck the actual media on fallback click before muting it, covering recovery between rendering and click.

Actual failure still allows explicit silent continuation and later sound toggle. No new autoplay bypass, retry/player replacement, timer, music/SE asset, gain, physics, artwork, input, phase timing, saved key or distribution changes. The existing 15-second failure timeout remains; sound-effect promises cannot block the dedicated BGM gate.

## Evidence

`NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node --test tests/test-engine-audio-assets.cjs tests/test-engine-audio-lifecycle.cjs works/pumpoko/tests/music-gate.test.cjs works/pumpoko/tests/start-audio.test.cjs works/pumpoko/tests/review-runtime.test.cjs`

106/106 pass. New 8 checks cover ordinary readiness with unresolved SE, timeout then playable BGM, streaming current-data distinction, stale fallback click, real error/silent/re-enable, late failed callback/title return, actual Engine timeout with retained media, and exact inverse patch equality to current audit base. Existing Engine/Start/render/silent-button regressions remain green. Old exact-source tests normalize only the three exact authorized edits; the new guard pins all remaining app bytes to audit base.

Before repair, 5 behavioral cases plus the expected inverse-patch guard fail against the audit-base app (2 pass/6 fail). The actual downloaded itch app and Engine also fail the reported timeout/late-media integration case; its old fallback-label issue additionally fails the modern label regression (1 pass/7 fail overall, including the expected patch guard). These are controlled native-API models, not a claim of audible playback in a real device. Full historical story/title byte guards with existing failures are outside this repair and are not reported green.

Chrome loaded the public itch embed, displayed the title, and accepted canvas/keyboard/button interactions. That session did not establish the player's network-dependent timeout or audible output. iPhone/iPad Safari, Edge, Firefox, actual speaker output, cold/cache-controlled device runs and real throttled network remain UNVERIFIED. Code uses existing same-origin relative audio paths; no CORS or path rewrite is introduced. The initial reason a particular player hit the readiness timeout (network/autoplay/browser) is unknown; the permanent gate after recovery is deterministically reproduced.

Scope → Risk → Impact pass. Independent review, exact-head CI and Pages results are recorded in the PR. Formal verificationState remains UNVERIFIED.

## Publication and rollback

Staging only. Production and itch upload are unchanged and require separate owner publication approval. The itch builder remains unchanged; any future upload must include the reviewed app and verified Engine dependencies. Revert this isolated PR to roll back; no storage migration.
