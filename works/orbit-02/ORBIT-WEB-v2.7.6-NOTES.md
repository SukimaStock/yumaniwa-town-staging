# ORBIT Web v2.7.6 — HUD / DATA TIMING POLISH

Small presentation-only pass on top of v2.7.5. No RESTORE, flight, planet, MiniMap, or save-logic changes.

## Changes

- ORE HUD value now uses the warm ORE family instead of generic HUD blue, and explicitly clears the icon stroke before drawing the small text so it cannot turn muddy/black.
- DATA HUD value now uses the DATA yellow family, matching the same icon/value rule.
- ORE glyph dark outline reduced from 1.6x to 0.85x stroke weight.
- ORE and DATA pickup feedback now renders as `[resource icon] +integer`.
- DATA/Echo memory presentation is delayed by 0.78 s. DATA/Echo state is committed immediately; only the memory window waits until the pickup feedback has finished.

## Intentionally unchanged

- RESTORE / Ritual architecture
- HOME terminal
- MiniMap
- planet rendering
- mining particle FX
- landing rules
- save / rescue progression
