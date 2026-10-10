# FEEL LAB viewport fit review

The previous renderer positioned the ground at a fixed 175px without accounting for its full vertical shape. The screenshot proved the bowl and body were below the screen.

The work now samples each selected Hermite terrain every five units to calculate min/max height. The view fits -520..520 horizontally and [minimum - 90, maximum + 120 for rolling or + 270 for bouncing] vertically with a 65 logical-pixel margin. Rendering and physics both use the same curve; only the view transform changes. Codea Lite is already Y-up, so there is no second inversion.

Expected viewport bounds under this fit: all four curves' sampled extrema are inside the visible logical 1000x760 canvas, with space for the fruit and higher rutabaga arcs. Fixed transforms are not used to guess positions.

Source inspection and numerical fit design are complete. A browser/iPhone rendered screenshot, touch-controlled motion, save/reset and subjective feel are **UNVERIFIED**. CI syntax and plan checks are not visual proof.
