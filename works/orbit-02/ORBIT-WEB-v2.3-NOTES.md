# ORBIT Web v2.3 — RESTORE RADIUS

## Phase 12: progression structure

Goal: turn the local resource loop into an outward-expanding voyage without adding quest arrows or mandatory speed upgrades.

### Core structure
- BASE / E.V.E. / ship range now share one RESTORE level (1–5).
- RESTORE does **not** change max speed, thrust, turning, gravity, landing, or takeoff feel.
- Each RESTORE expands fuel capacity and ORE cargo capacity.
- SERA gives exactly one DATA + one Echo, once.
- Progression-critical SERA and VOX are authored in distance rings.
- Ambient deterministic planets are now neutral ASTRA plus occasional LUMA relays.

### RESTORE table
| Level | FUEL max | ORE max | 30% reserve round-trip radius | Echo band |
|---|---:|---:|---:|---|
| 1 | 32 | 20 | ~2,650 | 1–2 |
| 2 | 60 | 25 | ~4,960 | 3–4 |
| 3 | 95 | 30 | ~7,860 | 5–7 |
| 4 | 135 | 30 | ~11,170 | 8–10 |
| 5 | 180 | 30 | ~14,890 | 11–12 |

RESTORE costs:
- L1 → L2: ORE 20 + DATA 2
- L2 → L3: ORE 25 + DATA 2
- L3 → L4: ORE 30 + DATA 3
- L4 → L5: ORE 30 + DATA 3

Standard story route therefore aligns naturally:
- Echo 1–2 while E.V.E. is Phase 1
- Echo 3–4 in Phase 2
- Echo 5–7 in Phase 3
- Echo 8–10 in Phase 4
- Echo 11–12 in Phase 5

### Fuel rule
- Fuel is now charged directly by distance: 4.23 FUEL per 1,000 world units.
- Speed is no longer part of progression economics.
- A future optional speed module can reduce travel time without increasing range efficiency.

### Resource geography
- 12 SERA are distributed across five outward rings: 2 / 2 / 3 / 3 / 2.
- SERA signals only hint toward undiscovered SERA in the current RESTORE tier or earlier.
- Story VOX in each pre-Lv5 ring contains exactly the ORE budget needed for the next RESTORE step.
- VOX are placed near the SERA routes so resource gathering and memory exploration reinforce each other.
- LUMA remains the route-breaking exception: finding a relay can let a skilled player stretch beyond the nominal safe radius.

### Save / rescue rule
- Only HOME can save.
- Remote Echo / DATA / ORE discoveries are provisional until the player returns to BASE.
- BASE return, refuel completion, repair, departure, and finale milestones create the current HOME checkpoint.
- Fuel-out no longer preserves a one-way expedition. It rolls back to the last HOME checkpoint.
- Save schema is now v3; old v2.2 test saves are intentionally not reused because the economy changed completely.

### Flight feel intentionally unchanged
- max speed 520
- vector assist 1.6 / sec
- open-space damping 0.9980
- landing assist / high-speed bounce
- 1 sec takeoff hold
- launch speed 330
