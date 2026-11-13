# SukimaStock Lighting 0.1.0 — opt-in pixel lighting

Status: **Staging-only, opt-in module.** No existing game, town, Codea Lite or Engine 0.3.0 code path is modified. Production, real-device verification and author visual acceptance are separate decisions.

## Purpose and contract

One pure renderer consumes original RGBA and a separate surface/height/emission map. It returns new RGBA; source PNG bytes, SVG geometry, original game calculations, existing save keys and Engine/Core remain untouched.

- Canonical implementation: `engine/sukimastock-lighting.v0.1.0.js`.
- Generic contract: `sukimastock-material-lightmap/0.2`, matching the editor's byte arrays and movable window/lantern/shadow shapes.
- Adaptation of actual Postcard Generator 0.2 building geometry: `works/postcard-generator/lighting-adapter.mjs`.
- Periods: morning / noon / evening / night. Deliberately no hourly schedule or real-time clock.
- Map pixels are **logical 1x**, not Retina delivery pixels. Camera and image smoothing remain work-owned.

## JavaScript API

```js
// In a browser, include the optional script before invoking it.
const L = globalThis.SukimaStockLighting;
const original = originalCtx.getImageData(0, 0, width, height);
const lit = L.render(original, map, 'evening');
previewCtx.putImageData(new ImageData(lit.data, lit.width, lit.height), 0, 0);
```

Module is also require-able in Node. It installs no RAF, input handlers, timers, storage keys or audio. The caller controls all canvas and browser lifecycles, including Codea's y-up coordinate convention.

### From vector or code drawing instructions

```js
const map = L.paint(96, 96, [
  { type:'rect', surface:'wall', x:8, y:18, w:80, h:65, heightValue:160 },
  { type:'polygon', surface:'roof', points:[[4,23],[48,4],[92,23]] },
  { type:'rect', surface:'window', x:24, y:45, w:16, h:15 },
  { kind:'shadow', shape:'ellipse', id:'ground', cx:48, cy:86, rx:36, ry:5 }
]);
const rgba = L.render(original, map, 'night');
const groundShapes = L.footprints(map, 'morning');
```

Rect, ellipse, polygon and arch are supported. Later material shapes overwrite earlier regions. The caller composes the output of footprints() **on the ground**, not into the original PNG; contact shadow remains after nightfall but the directional solar cast disappears.

PNG editor v0.2 maps supply logicalCanvasPx, byte layers, and optional shapes. Movable window/lantern shape locations override the current light mask without mutating the underlying byte layers. Already-painted window pixels remain intentionally unchanged when the shape moves; removing old painted emission is the editor's responsibility. With no map, render returns a byte-identical RGBA copy. Bad map sizes and invalid geometry fail rather than producing false success.

### Postcard Generator 0.2

```js
import { generateScene } from './works/postcard-generator/engine.mjs';
import { makePostcardLightMap } from './works/postcard-generator/lighting-adapter.mjs';
const scene = generateScene('sample', { version:'0.2', scene:'street' });
const map = makePostcardLightMap(scene, { width:192, height:240 });
const result = globalThis.SukimaStockLighting.render(svgImageData, map, 'morning');
```

The adapter preserves source scene geometry and original SVG rendering. It extracts walls, roof type, corner faces, windows and lamp locations. It does **not** yet fully map doors, balconies, awnings, people, trees, special texture finishes, sky or water reflections; baked-in shadows and highlights of those components may disagree with moving light. No raster image recognition or physical depth reconstruction is claimed.

## Safe rollout

1. This PR introduces an optional module plus adapter and tests. Existing works and Codea/Engine/Core remain byte-identical. No town scene imports it by default.
2. Perform visual A/B checks against the previously accepted PNG v0.3 and SVG study. Map geometry and brightness are subject to author review.
3. Adopt only through work-local explicit integration once output and performance are validated. Reuse the same module; do not create separate per-work renderers or a new RAF.
4. iPhone Safari, frame times, device memory, heat and user tactile response remain **UNVERIFIED** until physically observed.

## Tests

```sh
node --check engine/sukimastock-lighting.v0.1.0.js
node --check works/postcard-generator/lighting-adapter.mjs
node --test tests/test-lighting.cjs
```

Change Plan Lock and required Scope/Risk/Impact gates apply. Rollback reverts these additive files only: no storage, source PNG, source SVG, existing engine or game migration is required.
