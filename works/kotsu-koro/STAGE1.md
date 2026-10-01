# One-stage action extension

Start main: `7407ae1dedebd1a0de537d22252894823ea01275` (2026-10-01).
Production main: `53d31cfe98313c87cfc5ffb78e3b4e8cdaed1ca3`, read-only.

## First Stage 1 canary

One connected concave interior, wet connecting lanes and two yielding fibres.
The old world spring/gravity constants are reused, while seed contacts use
elliptical support and small material-dependent drag differences. No leader,
faces, direct movement, jump, score, enemies or collectible system. Camera
responds to the entire party's bounds, including stragglers. The same nine seed
objects and momentum can enter the journey.

Seven journey checks pass: same-grain transfer, flat support, all-grain path
reachability using only world force/knocks (including returning for a straggler),
release tail, whole-party visibility, finite geometry/fibres and 30/60/120fps.
Eleven original input/physics checks also pass. No Engine/Codea changes.

This is a development canary, not task completion. `?dev=1&stage=1` opens the
minimal journey for browser observation. Ordinary URL still uses the original
toy pending physical-fibre prologue and continuous connection. The Cloud
Browser local 127.0.0.1 URL is blocked (`ERR_BLOCKED_BY_CLIENT`); local attempt
is not counted as rendering/playing. Formal verification remains UNVERIFIED.

## Prologue connection and refinement

First deployed journey runtime: `e634abae48ac2bb4069e153924609d2a0642c74c`
(PR #103). Cloud Chrome rendered the hollow and connected route. Diagonal drag
scattered the grains; AudioContext reached running, no new runtime error was
shown. This was a brief gesture canary, not browser proof of the entire route.

Following work-local changes:

- Stage 0 begins with three loose and six attached seeds. Tethers resist
  extension and accumulate physical fatigue; collisions contribute fatigue.
  No hit-testing/collection of seeds. Idle for 40s or one knock releases none.
- Controlled circular input releases the six attached grains one by one, at
  least .7s apart. The six release events in the test are approximately
  1.58/2.30/3.00/3.72/4.42/5.12s; timing is not a task deadline.
- Wait 4.2s after all are loose, then transfer the same grain objects, poses,
  velocities, active hold and short-lived traces. The route unfolds over 2.8s.
  No loading, stage label, clear card or hard scene replacement.
- Original body grab K58/D7.2, return K36/D3.8, gravity920 and rim response
  remain. Entrance hollow radius105 minus seed support is close to the old
  radius94 centre constraint. Seed shape/support and surface-dependent losses
  are work-owned; no Engine physics was changed.
- Whole-party camera uses front AND rear bounds. Seeds are never silently
  collected, deleted, teleported forward, magnetised to a leader or auto-steered.
- Connected concave hollows, wet lanes and two yielding fibres provide the
  three textures. Fibre physics samples the drawn curve with fixed endpoints.
  Setbacks remain recoverable; there is no death or restart penalty.
- The one exit hollow waits for the full party. A small replay control can
  appear after 3.6s together; the world stays touchable. It returns to Stage 0.
- Five short physical sound buffers, no music. Existing three retain their
  original levels. New fibre/sliding PCM sounds start at Baseline soft .24
  with 1/1/1 buses. Contacts are limited to one strongest event per65ms.
- Dev-only plain-text observations report loose count, party extent, held
  state and exit state. Ordinary play has no count/progress HUD.

Checks: 14 original/prologue/input/connection + 7 journey tests PASS. Scene
connection is exercised through actual sketch update, not an isolated timer
mock. Full-party reachability uses only held world forces and occasional
knocks, including returning for a straggler; no test teleports in that path.
Physical 30/60/120fps, long-run finite values, containment and eventual quiet
are covered. Browser canary for this connection follows deployment.

Formal verificationState remains UNVERIFIED. Author iPhone touch/feel and
subjective audible mix, Safari lifecycle and browser play through the full
journey are not established by these executable checks. No Stage 2 created.
