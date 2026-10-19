# Misaki visual review

Read-only source review and visual inspection of existing Chromium screenshots.

Inspected: font-checks/cold-settings-dpr1.png, cold-settings-dpr3.png,
failed-settings-dpr1.png; after/390-distill.png, 390-tasting.png,
390-cask-window.png, 390-aux-menu.png, 360-sales.png, 360-tasting.png,
1280-tasting.png.

- The inspected 390px room, cask and tasting views have readable controls and
  separated lines, with no visible clipped button labels or overlapping controls.
- Settings test probe includes Japanese terms, voiced/semivoiced kana, £,
  decimals, percent, L, year/month, barrel number, unsupported glyphs and input.
  Native input text and missing characters visibly use the smooth system fallback.
- Long shelf names visibly use a width-based two-line ellipsis. Full names remain
  available from the native button's accessible label and product window; the
  existing model/input limit has not changed.
- Desktop tasting controls form three buttons plus a fourth on the next row.
  This is asymmetric but no controls are clipped.
- Rechecked the final regenerated 360-tasting, 390-aux-menu and 1280-tasting
  images after the heading adjustment to 16px. The 360px barrel/month heading
  now stays on one line. Menu title, close button, tasting text and actions
  remain separated and visible; no clipping or unintended title wrap was seen.
- Final source recheck confirms the unrelated artwork-line width restored to
  12, and shelf age/state placement uses the same computed row spacing as the
  preceding wrapped name. The earlier review findings are resolved.

`header-pixel-review.json` counts the exact RGB colors in a header date crop:
Misaki cold/warm DPR1 and DPR3 (also delayed DPR1) have only ink and background,
with no intermediate edge colors. The failed-font screenshot has antialiased
system fallback, as expected. This checks the sampled header, not all text.

Limitations: no physical iPhone Safari, iPad Safari or user comfort assessment
was observed. HTML positioning and glyphs from fallback fonts may be fractional;
this review does not claim uniformly square dots everywhere. Keyboard operation,
resize, software keyboard and persistence tests are handled by the main browser
regressions, not independently established by these static images.
