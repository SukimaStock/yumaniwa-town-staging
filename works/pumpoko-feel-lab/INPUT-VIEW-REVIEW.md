# FEEL LAB | Embedded canvas and input repair

## Root cause

The former FEEL LAB mounted a fullscreen Codea Lite canvas in a limited-height HTML `main` panel. Codea Lite's `resize()` sets the native canvas's CSS/bitmap dimensions to `window.innerWidth/innerHeight`, overriding the panel sizing. The viewport and terrain were consequently clipped by the panel. Moving its world camera repeatedly did not address the rendering contract.

## Change

- FEEL LAB only: remove the fullscreen Engine/Codea boot; retain immutable `../pumpoko-02/{physics,world,draw}.js`.
- Own an HTML canvas sized to its panel `getBoundingClientRect()`, set its pixel backing using devicePixelRatio.
- Render explicitly in Y-up with one and only one screen/world transform.
- Fit Hermite floor extrema with safe physical headroom for each character.
- Add visible touch-hold left/right buttons in addition to tapping left/right halves of the canvas, with pointer capture and keyboard operation.
- Start at x=-420 on each terrain's actual downhill, because the prior x=-275 on the waves course could run backwards under right input.
- Keep the four terrain choices and local note/point preservation.

## Verification evidence and limits

1. **Chromium local panel test (test doubles for physics and fruit drawing)**: three viewport configurations 390×844, 375×667 and 844×390; both characters and all four terrains in each = 24 initial viewport combinations. Every sampled floor min/max and initial body position falls inside the actual panel. No page exceptions.
2. The same browser test confirmed both the visible right-hold button and canvas right-half pointer generated positive moving model x on the test model. Reset, kind switching, and local notes were checked; localStorage was replaced with a memory implementation in the about:blank test (no claim of actual website persistence).
3. **Real PUMPOKO 02 physics and world JS**: executed in a limited standalone V8 fixture with synthetic canvas/DOM to drive the exact new FEEL LAB app. Both active bodies × all 4 terrain choices = 8 trials moved positively after a right-hold (42 frames). All eight computed terrain ranges were inside logical panel bounds. Previous x=-275 produced negative movement on waves despite a right hold; revised x=-420 resolved that case.
4. Screenshot reviewed for Chromium synthetic visual geometry; no incorrect y-axis inversion or out-of-panel hill in the synthetic renderer.
5. Required PR static/impact/scope checks must pass before staging merge.

**Not yet verified:** native iPhone Safari touch feel, device audio, the real PUMPOKO art display in an actual browser, and the user's aesthetic preference. The Chromium fixture substituted simplified fruit drawing and simplified physics for its *visual* checks; the separate V8 exact-physics test above validates model movement without real browser integration. Formal verificationState remains UNVERIFIED.

Production, PUMPOKO 02, shared Engine and Codea are untouched. Rollback is revert of this isolated PR.
