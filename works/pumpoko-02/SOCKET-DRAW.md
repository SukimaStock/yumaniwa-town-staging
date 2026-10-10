# Four handoff openings

Base: `ab66a9a9f05a5ae72b5f6cd9c56cac89d3de9149` (stage material PR #186).

## Cause and drawing change

The supplied device images show a horizontal orange bar around the waiting rutabaga and a rectangular orange cover over the pumpkin. In code, these were a 78-unit brown bridge fill and an 88-unit foreground flesh rectangle. Neither has a physics role. The previous skin mask removed the aperture only from the contour, leaving both fills across the opening.

Removed both rectangles and the flat socket shadow ellipses. Flesh, its soft shoulder, green skin and pale inner band now share the complement of the actual cellar/mouth paths. Connected cutouts remain a union; their overlaps cannot refill each other. The existing 88-unit visible mouth, surface/roof functions, skin depths and palette remain unchanged.

Nearby bodies are clipped to the union of actual air above ground, cellar and mouth, rather than a fixed body rectangle. Only solid lips hide them. Signed depth draws the exit side first and contact side last, reversing for upward exchanges. Departing bodies become fully visible when clear of the lip. Local shadows stay on solid ground. Offscreen art and offscreen portions of cellar paths are culled with a material-width guard; world state is never changed.

## Verification

Automated native Canvas rendering uses the real story/world update, character art and camera. It records all four naturally triggered exchanges, including compression, release and seating. The comparison uses identical snapshots for previous main and corrected drawing.

| Opening | Direction | Recorded contact (world seconds) | Reviewed states |
|---|---|---:|---|
| down | Pumpkin → rutabaga, downward | 3.833 | Approach, compression, exiting, complete |
| up | Rutabaga → pumpkin, upward | 6.700 | Approach, compression, exiting, complete |
| down-2 | Pumpkin → rutabaga, downward | 13.067 | Approach, compression, exiting, complete |
| up-2 | Rutabaga → pumpkin, upward | 17.500 | Approach, compression, exiting, complete |

[Before/after sheet](visual-review/socket-comparison.png) has four columns and paired rows for each opening. [Before/after video](visual-review/socket-handoffs.mp4) contains 844 frames at 60 fps (14.067 seconds), full gameplay framing and real timing. Cuts occur only between distant openings; no audio is included. This is native Canvas evidence, not iPhone footage.

Commands:

- `node --expose-gc --test works/pumpoko-02/tests/socket-draw.test.cjs works/pumpoko-02/tests/terrain-material.test.cjs`
- `node --expose-gc --test works/pumpoko-02/tests/story.test.cjs`
- `node --test works/pumpkin-rutabaga-lab/tests/*.test.cjs works/pumpoko/test-ending.cjs works/pumpoko/test-audio.cjs tests/test-engine-input-boot.cjs tests/test-engine-audio-lifecycle.cjs tests/test-work-lifecycle.cjs tests/world-consistency/integration.test.cjs`
- `node works/pumpoko-02/tests/socket-review.cjs`

Socket/material checks cover empty apertures, both directions of contact ordering, unmodified art poses, continuous outgoing visibility, restored full sprites away from lips, ordinary terrain drawing, read-only rendering and exact preservation of all pre-existing work runtime/assets except world-draw.js. Existing story tests cover opening, four handoffs, input/audio lifecycle, ending and replay. Results are recorded in the PR.

Actual-device readability and the perceived naturalness of the pop remain UNVERIFIED. On iPhone, check all four openings before contact, during compression, while exiting and after seating; confirm the contact part is visible, no bar or rectangular crop remains, and the retained plant reads as lodged in the same material. Gameplay physics, courses, character art, accepted introduction, camera, audio and ending are byte-identical to the base. Production, original work, lab and shared foundations are untouched.
