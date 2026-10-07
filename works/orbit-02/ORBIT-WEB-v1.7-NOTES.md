# ORBIT Web v1.7 — Echo minimal loop

## Goal
Add the first narrative discovery without adding a new button or a second collection minigame.

## Echo behavior
- Echo total remains 12, matching the Lua source.
- A unique DATA planet can reveal one Echo only once.
- Echo discovery happens automatically on the first successful DATA harvest from that planet.
- The current calibration map has only one SERA, so v1.7 intentionally exposes only 1/12. Remaining Echoes are deferred until the planet-generation pass.
- Echoes are not consumed by BASE repair.

## Feedback
- On discovery: a restrained ring pulse and `ECHO n/12` appear around the ship.
- E.V.E. reacts immediately using the current BASE language phase.
- The top HUD now shows Echo progress on a quiet second line.
- Returning to BASE with a newly discovered Echo replaces that trip's generic docking line with an Echo-specific return line, then clears the trip marker.

## Preserved
- v1.4 launch speed and launch phase.
- v1.3 landing assist / high-speed bounce split.
- v1.6 BASE Lv1–5 repair costs, visuals, and E.V.E. language phases.
- No Corrupted Logs, save system, shops, missions, or procedural planet expansion yet.
