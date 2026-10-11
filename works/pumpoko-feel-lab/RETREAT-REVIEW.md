# FEEL LAB — player-chosen retreat trial (2026-10-11)

Base staging/main: `415e7549c61be8023e0140de7bf87c95c0fcaa40`.

## Why

Owner observed that an unexpected gap midway through the good B→D long flat is especially fun for ROLL and BOUNCE: a surprise that still obeys intuitive momentum. Next hypothesis is that a gap which *looks unlikely at current speed* can prompt an unforced decision to pause, reverse and build momentum.

## Controlled comparison

- **B / 平面途中** remains untouched: original `bdVariants.long` floor and `{layer:'surface',a:2890,b:3000,stage:true}` gap, entry at x=-410 and prior fall respawn at x=2610.
- **D / そのまま？** uses **exactly the same floor and gap**, but starts both characters at **x=2770 on the plateau, stationary and grounded**, a mere 120 units before the left lip. After a genuine fall and the established 0.48-second fade, D restarts at x=2770, still stationary. Existing left/right input, rebound, gravity, contact, landing, visuals and camera remain unchanged.

The player can retreat through the full preceding valley as desired; the code does not force a reverse, auto-launch, give hidden speed or introduce a new action. The label asks a question rather than telling the player how to solve the gap. The diagnostic `retreated` bit marks that the body traveled at least 80 units back from x2770; it is recorded in optional saved observation under the **existing** localStorage key and is not a goal, bonus or popup.

No other study mode is changed. A versioned `app.js`/`style.css` URL avoids the previously observed stale Safari script problem. Risk choice buttons now fit four columns, or two columns on narrow phones.

## Physics and UI tests

1. Before coding, the exact PUMPOKO 02 `P.integrate` and `W.contact` modules were used in an isolated 240Hz test to explore whether direct/right vs retreat/accelerate produced different outcomes. At the adopted width 110 and start x2770 with same gap a2890: ROLL and BOUNCE direct/right both fell; ROLL after 0.8 seconds of reverse and BOUNCE after approximately 1.5 seconds of reverse crossed. Longer retreat patterns also crossed naturally.
2. Following implementation, a synthetic DOM/Canvas / RAF fixture executed the **exact fetched** work-local `physics.js`, `world.js`, `draw.js`, and candidate FEEL LAB `app.js`. Two kinds × D choice start: both spawned grounded at x2770; 4 seconds' right input caused one physical fall followed by retry at x2770 with no exception.
3. After full RESET, 1.8 seconds' held left led to x2385 (ROLL) or x2543 (BOUNCE). Subsequent 9 seconds' held right reached the end of B→D long (x4279/4283 respectively); both marked `crossed=true` and `retreated=true`; no extra speed or altered P settings.
4. Saving D recorded identical gap metadata, x2770 start, source Hermite array, and retreated/crossed values under the prior saved study key. Regression selections for original B/平面途中, B→D/平面長, A/FLOW, and single bowl succeeded.
5. GitHub's own Plan/Scope/Risk/Static checks are still required before merge.

**Unverified:** actual iPhone Safari rendering, perceived visibility of the gap from x2770, intuitive sense of being offered a decision (rather than a compulsory reverse), satisfaction of crossing, and whether this improves long-term replay. The synthetic canvas does not rasterize actual fruit art. Device observations must remain UNVERIFIED until the user tries the comparison.

Staging-only. No work on PUMPOKO 02 original gameplay, shared runtime, or production. Rollback: revert this PR.
