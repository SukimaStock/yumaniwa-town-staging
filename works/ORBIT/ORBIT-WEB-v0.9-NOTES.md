# ORBIT Web v0.9 — RETURN

## Goal
Complete the first meaningful ORBIT loop without adding repair/progression yet:

**drift → land → harvest → return to BASE → refuel → leave again**

## Added
- BASE near the opening area.
- Fuel consumption during flight, scaled by speed.
- Low-fuel E.V.E. warning at 30%.
- Automatic BASE refuel while landed.
- Minimal Phase-1 E.V.E. messages for startup and return.
- Return dialogue changes with time away from BASE.
- Fuel-out emergency rescue to BASE.
- Emergency rescue restores 30% fuel and keeps collected resources.
- Small BASE marker so home can be recognized without a minimap.

## Preserved
- v0.3 Web flight feel.
- v0.6 broad landing-zone rule.
- v0.7 iOS copy/selection suppression.
- v0.8 automatic harvesting.
- 1-second hold-to-takeoff interaction.

## Intentionally deferred
- Repair / base levels
- Resource spending
- Engine / sensor / core upgrades
- Echo / Corrupted Logs
- Missions / quests
- Shop / credits
- Save / load
- Full E.V.E. dialogue system
- Ending

## Current test loop
1. Fly and consume fuel.
2. Land on VOX / SERA / LUMA to harvest.
3. Return to BASE.
4. E.V.E. acknowledges return.
5. BASE refuels automatically.
6. Hold for one second to leave again.

Fuel exhaustion triggers emergency rescue rather than a game over.
