# ORBIT — DRIFT-A Preservation Build

This build intentionally contains only the first reconstruction layer:

- fixed-step 60 Hz calibration physics
- original world-target touch steering
- inertia and source-lock damping baseline
- Hub-like calibration planets
- gravity, radial damping, invisible orbit assistance, collision repulsion
- hard-follow camera
- deterministic parallax starfield
- Lv1 orb pod, thrust halo, short trail

Not included yet: landing, takeoff, fuel, boost, slingshot, resources, base, E.V.E., story, repair, missions, save, ending.

## Comparison switches

- `?debug=1` shows calibration values.
- `?swirl=approach&debug=1` changes only the ambiguous swirl condition for A/B comparison.
- Default behavior is `swirl=source`, reproducing the executable Lua condition (`dot < 0`) rather than the adjacent comment.

The calibration planet positions are temporary test fixtures and are not treated as preserved ORBIT content.


## v0.2 author correction

- Default control is now **touch-as-thruster**: the exhaust appears on the finger side and the pod accelerates away from the finger.
- Camera remains hard-locked to the pod, so the world scrolls toward the finger / backward relative to travel.
- `?control=target` preserves the first reconstruction for A/B comparison only.


## v0.3 — Web feel pass
- v0.2 thruster-side control is now the official Web ORBIT control.
- Default physics is no longer literal source preservation.
- Open-space momentum retention increased (`0.9980` per fixed 60 Hz step).
- Max speed increased to `520`.
- Planet influence is made more legible while avoiding heavy slowdown near a planet.
- Orbit-assist coefficients are reduced so the player still feels in control.
- `?physics=source&debug=1` keeps the previous source-like physics for A/B comparison.
- `?control=target` still keeps the discarded first reconstruction for reference.
