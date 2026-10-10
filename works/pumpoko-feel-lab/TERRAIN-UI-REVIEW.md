# Terrain selector repair

Observed on iPhone: eight labels squeezed into one row, newer four buttons tapped but courses did not change.

The preexisting stylesheet declaration `nav,.terrains,.actions,.steering{display:flex}` competed with the intended grid. This change explicitly sets a 4-column/2-row terrain grid and touch-friendly height. The index adds versioned URLs for both CSS and app.js to avoid old Safari cache using only four terrain definitions. Missing terrain data now produces visible feedback instead of an error during reset.

Test status: GitHub CI pending; iPhone Safari course switching and actual visual response UNVERIFIED. Staging only; physics unchanged.
