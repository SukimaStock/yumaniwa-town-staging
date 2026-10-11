# Stage material — drawing-only revision (2026-10-10)

Base: staging/main `fe586873233f80272a96d84f85fd3c8eb6a38ea3` (#185).
Current related open PR #140 is an original-only draft; it is not applied.
Owner reports the current opening is ideal on an actual device. Its code,
camera, seed motion, growth and handover are preserved byte-for-byte.

## Reference and material

Original `works/pumpoko/stage-draw.js::drawTerrain` uses green width 7,
cream width 3 at an inward offset 5, rounded joins, the flesh gradient's
0/.55/1 stops and overlapping soft shoulders. `journey.js` uses 1.85 zoom.
The existing 02 palette already matches that original exactly and is retained:
skin `#536c4d`, cream `#fff4d9`, flesh `#ffda96 → #efb666 → #cf924e`.
No texture or ornament is added.

02 keeps its .8 gameplay camera. Material-unit ratio is 1.85/.8 = 2.3125:

| Material | World thickness | Logical-screen thickness at .8 |
| --- | ---: | ---: |
| Green skin | 16.1875 | 12.95 |
| Inner cream | 6.9375 | 5.55 |

The complete original green strip is moved to the solid side, with cream
behind it. Centered strokes clipped against the real terrain create these
one-sided strips; they do not move a collision sample or cover playable air.
The same compound contour covers surface, cellar floor/ceiling, vertical
cellar ends and socket walls. Intersecting each cutout's complement handles
cellar/socket overlap without even-odd cancellation, double-dark alpha
strokes, or a new wall at the viewport edge. Joins remain rounded.

In the existing roof, the solid can be only 25 world units thick. Opposing
skins share a pale inner seam there so they do not merge into one solid green
mass. This visual accommodation remains inside the existing thin section.
Socket collar width remains 88; skin goes away from its opening. Existing
body occlusion, positions and sizes remain unchanged.

## Comparison and verification

[Original reference and before/after surface, cellar and all four mouths](visual-review/stage-material-comparison.png).
Original reference invokes unchanged original drawTerrain at 1.85. Before
uses exact #185 source; before/after use identical actual 02 geometry,
entity fixtures and .8 camera. Native offscreen Canvas, not device screenshots.

Commands:

```sh
node --test works/pumpoko-02/tests/terrain-material.test.cjs
node --expose-gc --test works/pumpoko-02/tests/story.test.cjs
node --expose-gc works/pumpoko-02/tests/terrain-review.cjs
```

Material tests inspect rendered pixels for screen widths and ordered layers,
solid-side floor/ceiling/wall bands, thin-roof seams, aperture preservation,
Hermite-slope contact normals, read-only state and transform restoration.
A byte comparison protects every pre-existing non-test/runtime/asset file
except world-draw.js. Existing full journey tests cover intro continuity,
growth into the same hero, four handoffs, recovery, ending, replay, input,
three viewport layouts, and single-player audio lifecycle.

The changed runtime file is only `world-draw.js`. Supporting files are the two
terrain test/review scripts, this report and the comparison PNG. The already
authorized mandatory Plan-only exception adds the immutable root lock at
`.change-plans/pumpoko-02-stage-rind-20261010/r0.lock.json`.

New material appearance on actual iPhone/iPad remains UNVERIFIED. Owner
should check presence of the skin, touchdown without apparent burial, all
four socket lips and vertical cellar joins, thin ceilings, and the accepted
opening flowing into the same material world. Automated Canvas/DOM/media
checks do not establish subjective appearance, Safari or actual sound.
Formal verificationState remains UNVERIFIED. No production changes.
Rollback: revert this isolated staging PR.
