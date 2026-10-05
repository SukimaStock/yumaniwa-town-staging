# Observation prototype / 02

Serve the repository root and open `/works/tea-unfold-02/`. The canonical
SSE 0.3.0 / Codea 1.0.0 files are referenced unchanged. Run
`node --test works/tea-unfold-02/tests/model.test.cjs`.

## Geometry and evidence

Both leaves exist throughout playback, with identical topology. Arclength
centerlines straighten at locally different rates; transverse folds lag by
side. Depth-tested, two-sided WebGL shading determines occlusion. There are
no appearing sprites, external assets/dependencies or nondeterministic noise.
The short stem and two leaf sheets are an intentional anatomical hypothesis.
Persistent corrugation, cupping, asymmetric edges and local sheen remain at
the end. The two surfaces are not a collision-constrained cloth simulation;
contact and self-intersection require further real-reference assessment.

Sources used for design:
- https://vimeo.com/200973883 — producer-confirmed Four Seasons Oolong,
  bag-confined footage; not a free single-pellet trajectory.
- https://vimeo.com/174766106 — freely visible leaves, tea type and real
  elapsed time unidentified; supplementary appearance reference only.

The model's normal observation playback is 24 seconds; this is presentation
speed, never a measured brewing/unfurling duration. The screen deliberately
shows no extraction clock. Initial state is paused, including reduced-motion
preferences; explicit playback and manual scrub remain available.

## Browser checks

At progress 0, .2, .4, .65 and 1, inspect the actual drawing: irregular pellet,
unequal opening, overlap and residual folds. Compare repeated scrubs to the
same point. Check native range keyboard/touch, pause, speed, rewind, end and
replay; portrait 390x844, narrow 320x568, desktop and landscape. Controls
must remain usable without overlap or page overflow.

The animation freezes while hidden and resumes from the same shape. Check
WebGL unavailable, context loss/restoration and clear recovery messaging.
Context restore should rebuild GPU resources and redraw the current shape.

`RolledTeaStudy.snapshot()` is read-only observation data. No mutable test
hook or alternate rendering path is exposed. Browser touch emulation is
not a physical iPhone/Safari check. Device graphics, OS suspension and the
owner's visual/feel assessment remain UNVERIFIED until directly observed.

Keep `works/tea-unfold/`, all frozen works and all prior lifecycle entries
byte-identical. Only append the new active/staging-only record. No town,
Search/Share, production registration or promotion is included.
