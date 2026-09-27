# ORBIT Web v2.3.2 — MINIMAP INTEGRATION

Builds on v2.3.1 foundation fixes. Progression, fuel economy, resource placement, RESTORE costs, landing/takeoff tuning, Echo order, and LUMA generation remain unchanged.

## Source-style MiniMap integrated
- Added the accepted, intentionally simple spacecraft MiniMap to normal play.
- Ship remains fixed at the map center.
- Nearby planets are plotted using their existing world colors.
- BASE is a green marker with `B` while inside map range.
- When BASE is outside map range, only its edge direction is shown — no distance number, route line, or waypoint arrow.
- Crosshair, dark panel, thin border, and restrained scale preserve the original ORBIT instrument feel.
- Web sizing is responsive: approximately 40% of screen width, capped at the source 180 px size.
- Placement stays lower-right but is lifted above the existing resource / RESTORE HUD.

## Scan pulse
- The original sensor pulse visual is retained as a quiet effect.
- Because the current RESTORE design no longer has a separate Sensor upgrade track, RESTORE completion triggers the pulse instead.
- Map range itself does not increase with RESTORE. No new progression stat was added.

## Faint Signal relationship
- The existing Faint SERA Signal remains unchanged.
- MiniMap shows nearby observable worlds.
- Faint Signal continues to suggest an undiscovered SERA outside immediate local awareness.
- No SERA name, range number, or permanent objective marker was added.

## Deliberately unchanged
- FUEL max: 32 / 60 / 95 / 135 / 180
- distance fuel cost: 4.23 per 1,000 world units
- max speed 520 / vector assist 1.6 sec⁻¹
- landing / takeoff behavior
- SERA / VOX / LUMA positions and procedural generation
- RESTORE costs and Echo story order
- 30% low-fuel warning

This build is for human testing of whether the minimal MiniMap is enough to support HOME return and nearby VOX discovery before adding any further navigation UI.
