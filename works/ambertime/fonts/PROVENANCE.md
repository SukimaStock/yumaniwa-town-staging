# 美咲ゴシック / MisakiGothic

- Author: Num Kadoma / 門真 なむ
- Copyright: Copyright(C) 2002-2021 Num Kadoma
- Retrieved: 2026-10-19
- Official project: https://littlelimit.net/misaki.htm
- Official license: https://littlelimit.net/font.htm#license
- Official archive: https://littlelimit.net/arc/misaki/misaki_ttf_2021-05-05.zip
- Archive SHA-256: `c1851af85a0a010dd84f40803159c2d8a23feecb6c7e800cfeb5c6edc50da46e`
- Bundled font: `misaki_gothic.ttf` (standard 美咲ゴシック; version 2021.0505)
- Font SHA-256: `0963e11e89d5fa409a7a048a52e8ea2d623d764a7998488f8a4291111611c4e1`

The TTF and the original archive documents `misaki.txt` and `readme.txt` are
unmodified. No conversion or subsetting was performed. The TTF contains both
outlines and embedded bitmaps. The author’s license page at retrieval is
preserved as `official-license-2026-10-19.html` in its original Shift-JIS encoding.
The original archive documents contain the copyright and license text.

The license permits use, copying, redistribution and modification, commercially
or noncommercially, without warranty. This local distribution uses the original
standard Gothic face, not Gothic 2nd or Mincho.

`../font-coverage.mjs` is metadata generated from the TTF’s best Unicode cmap
using Python fontTools. It describes 7,171 covered code points; it does not
transform the font or replace browser text rendering. Uncovered characters
(including 𠮷, 髙, 﨑, emoji and é) must use the normal CSS/Canvas fallback stack.
The requested Japanese game terms, £, ASCII digits, decimal point, ％ and L are
present. No cmap entries mapping to the missing-glyph shape were found.

## 2026-10-19 — Gothic2nd selected after three-face comparison

The official archive was fetched again and its SHA-256 matched the archive above.
`misaki_gothic_2nd.ttf` (2021.0505), SHA-256 `5f0cbb8850e910ffa749d467bc41c89271388a0cbe0fe48741cf2bf0dfe3ac43`, is now the game face. The original standard face remains unchanged for comparison.
Gothic2nd has natural7-dot numerals, so the standard-face numeric enlargement and baseline shift were removed after actual Canvas/HTML comparison. No conversion/subsetting/glyph modification.
The original archive documents and license above apply to all3faces. Comparison-only Mincho is at `../design/type-ui/comparison/fonts/misaki_mincho.ttf`. See `../design/type-ui/comparison/REPORT.md` for source and measured rendering.
Gothic2nd cmap covers7,170codepoints; U+2423 visible-space is absent relative to standard Gothic and falls back. Coverage metadata now follows this exact face.
