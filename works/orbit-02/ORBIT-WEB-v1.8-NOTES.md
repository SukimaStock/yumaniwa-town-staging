# ORBIT Web v1.8 — EXPLORE

## Goal
Move from the fixed calibration pocket to a deterministic expanding space without changing the accepted flight / landing / launch feel.

## Planet generation
- Sector size: 1800
- Two independent spawn rolls per sector
- Spawn chance per roll: 0.48
- Seed: 987654
- Active sectors: current sector plus one sector in each direction (3x3)
- Opening fixed BASE / VOX / SERA / LUMA are retained.
- A 1080-unit origin exclusion prevents generated planets from crowding the opening fixtures.
- Mutable generated planet objects are cached per sector so resource depletion persists when revisiting.

## Implemented generated roles
Only roles that already have complete Web gameplay are generated in this pass:
- LUMA / refuel
- VOX / ore
- SERA / data + Echo

Trader, Noir, and ordinary Astra remain deferred. Their original resource-family probability mass is normalized across LUMA / VOX / SERA rather than introducing incomplete planet types.

## Echo
- A unique SERA still grants at most one Echo.
- Generated planets use stable atlas IDs for Echo uniqueness.
- Echo count stops at 12/12; later SERA do not trigger false rediscovery.

## Locked behavior
No changes to Web DRIFT physics, landing assist, high-speed bounce, launch speed 330, harvesting cadence, BASE repair costs, or E.V.E. language phases.
