# ORBIT Web v2.7.7 — HUD TEXT TONE

Tiny HUD-only correction on top of v2.7.6.

## Changes

- ORE and DATA icons keep their individual resource colors.
- ORE and DATA numeric values now use the same pale cockpit text color as the FUEL readout (`225, 235, 244, 215`).
- The explicit `noStroke()` remains before both values, so the ORE icon outline cannot bleed into the text.
- ORE/DATA pickup feedback remains resource-colored `[icon] +integer`; that treatment was accepted and is unchanged.
- ORE glyph hairline and DATA memory-window delay from v2.7.6 remain unchanged.

## Intentionally unchanged

- RESTORE / Ritual architecture
- HOME terminal
- MiniMap
- planet rendering
- mining particle FX
- landing rules
- save / rescue progression
