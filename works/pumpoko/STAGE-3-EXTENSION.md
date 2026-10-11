# PUMPOKO 02｜STAGE 3 拡張 — 流れ・余白・予想外の崖

Base staging main: `e26b23940730823c8ee3b96dc13224a69720bfa9`. This is an **additive stage-3-only gameplay extension**, without modifying physics, input, camera runtime, art, sound, opening, goal-seat behavior or production.

## User-approved design

The FEEL LAB experiments established that ROLL and BOUNCE both enjoy B→D, that its **longer flat** sustains interest, that a **surprise gap midway through the flat** adds intrinsic fun, and that **retreating to regain momentum** is a meaningful player choice. The user specifically asked to *retain* the already enjoyable five stages, integrate rather than replace the discoveries, and accept longer stages. The first integrated experiment is therefore a **STAGE 3 ROLL interlude**, not a replacement of existing hazards or a new checkpoint.

Original STAGE 3 obstacles preserved absolutely:

- `stage3-1`: x13040..13200, width160
- `stage3-2`: x13500..13640, width140, existing bank/intermediate countersteering unchanged
- `stage3-3`: x16240..16380, width140, with all prior authored geometry through x16680 **identical**

Inserted after x16680:

1. Downward movement into a rounded small bowl (x16820→17210, minimum y90), then gently rolls upward (x17450→17670).
2. Longer breathing plateau at y250, beginning x17900. It is deliberately not empty filler: the player can coast, slow, stop or reverse without a new action.
3. An unexpected physically unsupported gap x18440..18550 (width110) in that same plateau, with real full-size, sloped-shoulder / circular-contact physics. No jump key, teleport, artificial momentum or forced choice.
4. A continuous solid receiving flat after x18550 (x18580→18720) followed by a gentle transition back to the original mouth approach (old tail translated right +2200).

New gap ID `stage3-feel` is the **17th total gap**, the fourth in STAGE 3. User may naturally stay fast and cross, or stop/rebuild momentum. The entrance and receiving bank use the existing Hermite ground and actual PUMPOKO 02 circular world contact. Body and camera are unchanged.

## Downstream geometry preservation

STAGE 3 length increases **7360 → 9560** units. Downstream STAGE 4 and 5 keep their exact existing lengths **8830** and **10600** units and *identical relative bank curves, existing gap widths and spacings*, translated +2200 in x. STAGE 1 and 2 remain byte-for-byte unchanged.

The STAGE 3→4 mouth moves x18600→20800; STAGE 4→5 mouth x27430→29630; the goal pocket moves x38030→40230. The full array of downstream stage metadata (start/end/spawn coordinates), stage 4 underground floor and **roof / ceiling entryRoof** positions, stage 5 floor, gap descriptors, hole sockets, Stage 3→5 bridge, local-final-shot reference geometry and final goal x are translated coherently. The goal's y, cup depths, seating speed, dwell and original outro motion rules are unchanged. STAGE 3 camera floor240 and fall threshold−525 are expressly protected; checkpoint is still the stage's baton handoff.

STAGE 4 retains its same existing difficulty. It is **not yet** the suggested new 'stop/retreat' design; that is the next phase only after STAGE 3 user testing.

## Evidence / verification boundary

Mechanically exercised on the exact new `courses.js` with unchanged `physics.js`, `world.js`, `prologue.js`, `opening.js`, `story.js` and existing observation-only `five-stage-controls.cjs` through a JavaScript 60-Hz Story loop (original 240-Hz integrator):

| FPS | Four baton handoffs | New gap reached | Goal seated | Title returned | Falls |
|---:|---|---|---|---|---:|
| 30 | yes | yes | yes | yes | 0 |
| 60 | yes | yes | yes | yes | 0 |
| 120 | yes | yes | yes | yes | 0 |

At 60fps handoffs occurred around 22.02, 33.30, 54.38, and 70.65 seconds after entering Story. Goal seated around 102.68 seconds and title returned at 108.92 seconds; the accepted ending time remains about 6.23 seconds. The chosen player-control policy is a recorded test example only, **not** an in-game assist. Full journey had no JS exceptions. Near the new gap, from an otherwise identical stationary physics state, starting at x17900 and holding right crossed; starting at x18200 with 0 speed fell; starting at x18200 with existing vx150 crossed. These are demonstrative states, not forced gameplay modifications.

An additional new regression file `stage3-extension.test.cjs` specifically compares fresh-base geometry byte-for-byte for the three earlier STAGE 3 gaps, unchanged Stage 1/2, +2200 translations, socket and goal invariance, unsupported air and real landings, and full journey at three FPS rates. Historical Stage 3 and phrase snapshot tests are updated only where they assumed the old absolute map or three-gaps count, and the prior accepted phrase reference now *normalizes the single authorized rigid translation before comparison*. GitHub required checks must pass before merging.

**UNVERIFIED:** tactile feel on real iPhone Safari, whether surprise is legible at camera framing, how often natural right-hold crosses, whether falling late in the longer stage makes retries frustrating, and whether the added passage is enjoyable after repeated attempts. Synthetic execution verifies mechanics but not human fun. Formal verificationState remains UNVERIFIED.

If on-device testing finds that 2200 units is too long or retries are frustrating, first tune the new interlude itself and **do not** silently remove accepted prior stages or add an unrequested checkpoint. Rollback is reverting this isolated staging PR. **No production change.**
