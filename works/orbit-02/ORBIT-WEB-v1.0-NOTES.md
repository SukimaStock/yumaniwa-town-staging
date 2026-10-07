# ORBIT Web v1.0 — Landing Intent Pass

## Purpose
Resolve three feel problems reported after v0.9:
1. accidental landing when only passing near a planet
2. difficulty intentionally landing because landing competed with thrust input
3. takeoff feeling weak / unclear

## Landing — new Web implementation
- Removed the broad capture-ring stay requirement.
- Removed tap-to-land from flight controls; taps in flight are always thrust.
- A thin arc marker appears close to the ship-facing side of a nearby planet.
- The marker is a visual threshold, not a button.
- Flying deeper past the marker toward the planet crosses a close trigger radius and automatically starts landing.
- No landing speed gate: the landing sequence handles braking.

Current calibration:
- marker reveal radius: 205
- marker radius: 104
- landing trigger radius: 88

These are Web implementation values, not preserved Lua constants.

## Takeoff — source-faithful
Keep the original ORBIT takeoff behavior:
- hold: 1.0 sec
- direction: normalized vector from planet center to ship
- impulse: 120
- re-land lock: 2.0 sec
- switch to normal flight after speed > 40

The only Web-side housekeeping is restoring normal flight damping when the impulse fires.

## Locked / unchanged
- accepted Web drift physics
- thruster-side control mode
- landing spring/settle presentation
- automatic harvest
- fuel loop / BASE / minimal E.V.E.
