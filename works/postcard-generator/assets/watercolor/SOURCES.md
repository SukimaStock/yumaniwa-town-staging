# Watercolor material source

- Author: Jonas Voland; publisher: Voxel Core Lab GmbH
- Primary author/publisher page: https://voxelcorelab.itch.io/watercolor-terrain-textures
- Author release notes: https://voxelcorelab.itch.io/watercolor-terrain-textures/devlog/986400/releasing-16-hand-painted-watercolor-terrain-textures-free-cc0
- Pack: VoxelCoreLab_Watercolor_Terrain_Textures_1024px.zip, 2025-07-14
- Used file: `VoxelCoreLab_Watercolor_Terrain_Textures_1024px/Water_02.png`, 1024²
- Source PNG SHA256: `bdd02639c460b360ee78cf45d4d486b981be5e9ef50eb5b314be77144841ddca`
- License: CC0-1.0, https://creativecommons.org/publicdomain/zero/1.0/
- Checked 2026-10-30: publisher explicitly identifies the creator, describes the pack as hand-painted, permits modification and redistribution, and displays “No generative AI was used”. The included LICENSE.txt is retained here verbatim. It does not establish a physical pigment scan, so we do not claim that.

Only luminance variation is used, never the source blue or a depicted terrain. `derive.py <source Water_02.png>` converts to grayscale, resizes to512², Gaussian blur5px, normalizes2nd–98thpercentiles, and produces two complementary white alpha masks. Full8-bit alpha avoids posterized rings. This preserves broad hand-painted variation while suppressing terrain-like detail. No source executable is run. No image generation AI is used.

- wash-light.png: 24286bytes, SHA256 `d307ec4c3bedb9b276080e82c9c957a214adfad37135e62dd05a64b806c35506`
- wash-density.png: 24153bytes, SHA256 `cb09f3ec0e86232d07fb91ece62f1f98ae1f492915d6f6e0cfbed8816138b16b`

Both are embedded in watercolor-assets.mjs for self-contained SVG. Existing real coldpressed paper from UrsaFrank is reused; see ../materials/SOURCES.md. The result is an explicitly hybrid medium: real scanned paper, the licensed hand-painted material's tonal variation, and code-defined restrained edge pooling/bleed. It is not a new handmade painting or a simulation of fluid dynamics.

Other candidates not used: David Revoy's texture page has CC0 wording but also a CC-BY/custom-rules footer; OpenGameArt's watercolor pack is a redistribution with disputed third-party provenance. We used the unambiguous named creator/publisher source instead.
