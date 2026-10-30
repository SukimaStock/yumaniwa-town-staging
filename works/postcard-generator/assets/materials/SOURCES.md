# Material source

- Author: UrsaFrank
- Primary source: https://ursafrank.itch.io/a4-paper-scans
- Pack: A4 Paper Scans / PaperScans.zip, published 2023-11-01
- Used file: `PaperScans/Watercolour Paper Cold Pressed 1.jpg`, 2464×3480
- License: CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/
- Checked 2026-10-30: the author's page explicitly says they scanned the papers and all scans are CC0; it also displays “No generative AI was used”. No attribution is required; retained here for provenance.
- Source JPEG SHA256: `04f0295346ad7d7848382f0c93847750162d36e7fe662edcbafc8161118cc03a`

Derived material only, never city imagery. Crop [300,400,2100,2200], grayscale, resize 768²; subtract a Gaussian lighting field to remove scanner illumination and paper color. Two alpha maps preserve actual scanned fiber variation: weak black paper grain and sparse white ink loss. 64-color PNG quantization, no invented random marks. `derive.py` documents processing; supply the downloaded original via its first argument. No third-party code is executed.

- paper-grain.png SHA256: `64368265d310854d6568841240b0858e63bb5d5b4cd88e5421dca8217bd11a6e` (16065 bytes)
- ink-break.png SHA256: `19736a3b293ade8cadafdf030b5319ec7f82c131fbab0429d3489d3347d8d49d` (70958 bytes)

The two derived images are also embedded as data URIs in `material-assets.mjs`. That allows synchronous, standalone SVG rendering/export with no runtime network image dependency. Pattern placement uses a dedicated seed stream. The original full scan is not bundled; the source pack remains available at the primary page above. The derived files retain CC0-1.0.

ambientCG Paper001–006 were considered but rejected: their primary pages label their technique “Approximation”, so they do not establish a real scan. No ambientCG assets are included.
