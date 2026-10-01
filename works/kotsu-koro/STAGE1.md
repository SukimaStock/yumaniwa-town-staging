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
