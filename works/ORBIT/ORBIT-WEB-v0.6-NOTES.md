# ORBIT Web v0.6 — Broad Landing Zone

This build keeps DRIFT v0.3 physics and the v0.5 light landing / long-hold takeoff rhythm.

## Changed
- Removed the narrow `capMin < distance < capMax` requirement for landing lock.
- The single outer ring (`capMax`) is now the landing-zone boundary.
- The ship only needs to be anywhere inside that circle for the 0.5 s lock to progress.
- Landing confirmation can be tapped anywhere inside the same circle once READY.
- Removed the inner landing-ring drawing.

## Intentionally unchanged
- DRIFT flight physics.
- The invisible orbit-snap helper still uses the original narrow orbital band; this avoids changing flight feel while widening only landing eligibility.
- 0.5 s lock delay.
- Landing speed threshold.
- Landing animation timing.
- 1.0 s hold-to-takeoff and takeoff impulse.
