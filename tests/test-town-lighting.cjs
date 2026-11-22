'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const plaza = 'station_plaza';
const outside = [plaza, 'tomogushi_alley_map', 'onsen_slope_map', 'recreation_road_map', 'yumado_street_map'];
const periods = ['morning', 'noon', 'evening', 'night'];
const nightExposure = {ground:0.42, alleyGround:0.62, object:0.78, player:0.88};

function load(env, file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), env, {filename: file});
}

// Exercise real render/cache code without a native Canvas dependency. This double only
// models the read/write boundary. Browser tests cover rasterization, camera and input.
function canvas() {
  const result = {spans: []};
  let input;
  const ctx = {
    drawImage(image) { input = image; },
    getImageData(x, y, width, height) {
      if (input.failRead) throw new Error('readback unavailable');
      assert.equal(input.data.length, width * height * 4, 'fixture uses native raster size');
      return {width, height, data: input.data.slice()};
    },
    putImageData(buffer) { result.data = buffer.data.slice(); },
    fillRect(x, y, w, h) { result.spans.push({x, y, w, h, color: this.fillStyle}); }
  };
  result.getContext = () => ctx;
  return result;
}

function runtime(query = '?lighting=noon', {renderer = true, contacts = true} = {}) {
  const env = vm.createContext({
    location: {search: query}, URLSearchParams, Uint8Array, Uint8ClampedArray,
    document: {createElement: () => canvas(), addEventListener() {}}, setTimeout() {}
  });
  env.window = env;
  if (renderer) load(env, 'engine/sukimastock-lighting.v0.1.0.js');
  load(env, 'data/world-objects.js');
  load(env, 'data/town-lighting-materials.js');
  if (!contacts) delete env.YUMANIWA_TOWN_LIGHTING_MATERIALS.noonContacts;
  load(env, 'engine/town-lighting.js');
  return env;
}

function sprite(src, width = 16, height = 16) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data.set([i % 256, (255 - i) & 255, (i * 13) & 255, i % 41 ? (i % 2 ? 255 : 90) : 0], i * 4);
  }
  return {width, height, naturalWidth:width, naturalHeight:height, complete:true, src, currentSrc:src, data};
}

test('optional dependency, period override and outdoor scene boundaries', () => {
  const api = runtime().YUMANIWA_TOWN_LIGHTING;
  assert.equal(api.period, 'noon');
  for (const scene of outside) assert.equal(api.active(scene), true);
  const image = sprite('tiny.png');
  api.setPeriod('night');
  for (const scene of ['leisure_center_map', 'unknown']) {
    assert.equal(api.active(scene), false);
    assert.equal(api.image(scene, image), image);
  }
  assert.equal(api.image(plaza, image, 'station_ghost_npc_01'), image);
  api.setPeriod('off');
  assert.equal(api.image(plaza, image), image);
  assert.equal(runtime('?lighting=evening').YUMANIWA_TOWN_LIGHTING.period, 'evening');
  assert.equal(runtime('?lighting=typo').YUMANIWA_TOWN_LIGHTING.period, 'off');
  const absent = runtime('?lighting=night', {renderer: false}).YUMANIWA_TOWN_LIGHTING;
  assert.equal(absent.image(plaza, image), image);
});

test('ambient rendering matches the shared renderer channel-for-channel across periods', () => {
  const env = runtime(), api = env.YUMANIWA_TOWN_LIGHTING;
  const image = sprite('props.png?rev=A');
  const before = image.data.slice();
  for (const period of periods) {
    api.setPeriod(period);
    const lit = api.image(plaza, image);
    // At noon the math is the identity for all visible pixels and the adapter may bypass rendering.
    if (period === 'noon' && lit === image) continue;
    const phase = period === 'night' ? {...env.SukimaStockLighting.PERIODS.night, ambient:nightExposure.ground} : period;
    const expected = env.SukimaStockLighting.render(image, {}, phase).data;
    assert.deepEqual(lit.data, expected, period);
    assert.equal(api.image('yumado_street_map', image), lit, 'same material and time share cached raster');
  }
  assert.deepEqual(image.data, before);
});

test('logical masks hit the drawn fixtures while keeping adjacent frames and grilles dark', () => {
  const env = runtime();
  const maps = env.YUMANIWA_TOWN_LIGHTING_MATERIALS.objects;
  // Native logical coordinates sampled from the six canonical PNGs (lamp delivery is 3x).
  const probes = {
    station_building_01: [[53,88], [63,88]],
    street_lamp_01: [[14,15], [12,15]],
    craft_cola_shop_01: [[55,62], [55,65]],
    yakitori_shop_01: [[43,54], [40,61]],
    kissaten_shop_01: [[53,62], [53,65]],
    curry_shop_01: [[55,62], [55,58]]
  };
  for (const [id, [light, frame]] of Object.entries(probes)) {
    const def = maps[id];
    const source = env.YUMANIWA_WORLD_OBJECTS.get(id);
    assert.deepEqual([def.width, def.height], [...source.finalization.logicalCanvasPx], id);
    const png = fs.readFileSync(path.join(root, source.src.split('?')[0]));
    const ratio = png.readUInt32BE(16) / def.width;
    assert.ok(Number.isInteger(ratio) && ratio >= 1);
    assert.equal(png.readUInt32BE(20), def.height * ratio);
    const map = env.SukimaStockLighting.paint(def.width, def.height, def.shapes);
    const value = ([x,y]) => map.emission[y * def.width + x];
    assert.ok(value(light) > 0, id + ' light');
    assert.equal(value(frame), 0, id + ' structure');
    const shadow = period => env.SukimaStockLighting.footprints(map, period);
    assert.ok(shadow('night').some(item => item.kind === 'contact'), id + ' contact');
    for (const [period, sign] of [['morning',1], ['evening',-1]]) {
      const cast = shadow(period).find(item => item.kind === 'cast');
      assert.equal(Math.sign(cast.points[2][0] - cast.points[1][0]), sign, id + ' ' + period);
    }
    assert.ok(shadow('night').every(item => item.kind !== 'cast'), id + ' night');
  }
});

function luma(rgb) {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function readRGB(image, x, y) {
  const offset = (image.width * y + x) * 4;
  return [...image.data.subarray(offset, offset + 3)];
}

test('night fixture cores stand out from adjacent wood and preserve the lantern hue', () => {
  const env = runtime(), api = env.YUMANIWA_TOWN_LIGHTING;
  // [light x/y/RGB, adjacent opaque wood or grille x/y/RGB]. Samples from the
  // canonical PNGs at logical 1x, nearest-neighbour from the 3x lamp delivery.
  const probes = [
    ['station_building_01', [53,88,93,103,101], [63,88,80,69,59], [50,85,144,127,108]],
    ['street_lamp_01', [14,15,255,255,255], [12,15,20,20,20], [14,15,255,255,255]],
    ['craft_cola_shop_01', [55,62,239,178,97], [55,65,50,43,40], [60,58,245,196,107]],
    ['kissaten_shop_01', [53,62,235,174,94], [53,65,50,44,41], [62,63,250,189,113]],
    ['yakitori_shop_01', [43,54,244,78,34], [40,61,75,52,45], [44,52,249,83,37]],
    ['curry_shop_01', [55,62,235,172,90], [55,58,41,29,28], [60,61,248,201,114]]
  ];
  for (const [id, light, wood, brightest] of probes) {
    const def = env.YUMANIWA_TOWN_LIGHTING_MATERIALS.objects[id];
    const source = sprite(env.YUMANIWA_WORLD_OBJECTS.get(id).src, def.width, def.height);
    const map = env.SukimaStockLighting.paint(def.width, def.height, def.shapes);
    // Emission is normalized to a fixture's own brightest painted pixel. Use
    // the measured peak, so the synthetic background cannot introduce a white
    // highlight that does not exist in, for example, the red paper lantern.
    for (let i = 0; i < map.emission.length; i++) {
      if (map.emission[i]) source.data.fill(0, i * 4, i * 4 + 4);
    }
    for (const [x, y, ...rgb] of [light, wood, brightest]) {
      source.data.set([...rgb,255], 4 * (y * def.width + x));
    }
    const original = source.data.slice();
    api.setPeriod('night');
    const lit = api.image(plaza, source, id);
    const core = readRGB(lit, light[0], light[1]), frame = readRGB(lit, wood[0], wood[1]);
    assert.ok(luma(core) >= 120, id + ' dim core ' + core);
    assert.ok(luma(core) - luma(frame) >= 85, id + ' insufficient light vs frame ' + [core, frame]);
    assert.ok(core[0] > core[2] + 35, id + ' warmth');
    if (id === 'yakitori_shop_01') assert.ok(core[0] - core[1] >= 50, 'red paper lantern distinct from glass');
    for (let a = 3; a < source.data.length; a += 4) assert.equal(lit.data[a], source.data[a]);
    const base = env.SukimaStockLighting.render(source, map, {...env.SukimaStockLighting.PERIODS.night, ambient:nightExposure.object});
    assert.ok(luma(frame) > luma(readRGB(base, wood[0], wood[1])) + 4, id + ' missing local reflected light');
    const distant = id === 'street_lamp_01' ? [15,36] : [60,33];
    assert.deepEqual(readRGB(lit, ...distant), readRGB(base, ...distant), id + ' spill leaked away from fixture');
    for (const daytime of ['morning', 'noon', 'evening']) {
      api.setPeriod(daytime);
      const expected = env.SukimaStockLighting.render(source, map, daytime);
      assert.deepEqual(api.image(plaza, source, id).data, expected.data, id + ' ' + daytime);
    }
    api.setPeriod('off');
    assert.equal(api.image(plaza, source, id), source);
    assert.deepEqual(source.data, original);
  }
});

test('source-free routes keep the player silhouette distinguishable from pavement', () => {
  const api = runtime('?lighting=night').YUMANIWA_TOWN_LIGHTING;
  // Path pixels at world (192,192); the face and outline are (250,250) and
  // (235,290) in the stand-1.png delivery. No emitting material is present.
  const paths = [
    ['recreation_road_map', [145,137,124]],
    ['onsen_slope_map', [198,165,120]],
    ['yumado_street_map', [188,166,117]]
  ];
  const actor = sprite('assets/stand-1.png', 2, 1);
  actor.data.set([239,209,165,255, 10,10,7,255]);
  for (const [scene, pavement] of paths) {
    const path = sprite(scene + '.jpg', 1, 1);
    path.data.set([...pavement,255]);
    const litPath = luma(readRGB(api.image(scene, path), 0, 0));
    const litActor = api.image(scene, actor, '@player');
    const litFace = luma(readRGB(litActor, 0, 0));
    const litOutline = luma(readRGB(litActor, 1, 0));
    assert.ok(litPath >= 52 && litPath < luma(pavement) * 0.56, scene + ' path ' + litPath);
    assert.ok(litFace >= 160 && litFace > litPath + 12, scene + ' face ' + litFace);
    assert.ok(litPath - litOutline > 45, scene + ' outline ' + litOutline);
  }
});

test('only the pre-shaded alley JPEG receives the alternate night exposure in either cache order', () => {
  const alley = 'tomogushi_alley_map';
  const file = 'assets/maps/grounds/tomogushi-alley-ground.jpg';
  for (const alleyFirst of [true, false]) {
    const env = runtime('?lighting=night'), api = env.YUMANIWA_TOWN_LIGHTING;
    const alleyAssets = [
      [alley, sprite(file), '', nightExposure.alleyGround],
      [alley, sprite('./' + file + '?rev=new#source'), '', nightExposure.alleyGround],
      [plaza, sprite('https://example.test/staging/' + file + '?rev=absolute'), '', nightExposure.alleyGround]
    ];
    const normalAssets = [
      [alley, sprite('assets/stand-1.png'), '', nightExposure.ground],
      [plaza, sprite('assets/maps/grounds/station-plaza-ground.jpg'), '', nightExposure.ground],
      ['recreation_road_map', sprite('assets/maps/grounds/recreation-road.jpg'), '', nightExposure.ground],
      ['onsen_slope_map', sprite('assets/maps/grounds/onsen-slope-ground.jpg'), '', nightExposure.ground],
      ['yumado_street_map', sprite('assets/maps/grounds/yumado-street-ground.jpg'), '', nightExposure.ground],
      [alley, sprite('assets/elsewhere/tomogushi-alley-ground.jpg'), '', nightExposure.ground],
      [alley, sprite('assets/other.jpg?ref=/' + file), '', nightExposure.ground],
      [alley, alleyAssets[0][1], 'bench_wood_01', nightExposure.object],
      [alley, alleyAssets[0][1], '@player', nightExposure.player]
    ];
    const order = alleyFirst ? [...alleyAssets, ...normalAssets] : [...normalAssets, ...alleyAssets];
    for (const [scene, image, id, ambient] of order) {
      const phase = {...env.SukimaStockLighting.PERIODS.night, ambient};
      assert.deepEqual(api.image(scene, image, id).data, env.SukimaStockLighting.render(image, {}, phase).data,
        scene + ' ' + image.src + ' ' + id);
    }
    const sharedSource = alleyAssets[0][1];
    const roles = ['', '@player', 'bench_wood_01'];
    const renders = api.stats().renders;
    const held = roles.map(role => api.image(alley, sharedSource, role));
    assert.equal(new Set(held).size, roles.length, 'one source has three cached night treatments');
    assert.equal(api.stats().renders, renders, 'revisiting the cached roles did not recompute pixels');
    for (const phase of ['morning', 'noon', 'evening', 'off']) {
      api.setPeriod(phase);
      const image = alleyAssets[0][1];
      const actual = api.image(alley, image);
      if (phase === 'noon' || phase === 'off') assert.equal(actual, image);
      else assert.deepEqual(actual.data, env.SukimaStockLighting.render(image, {}, phase).data);
    }
  }
});

test('every pose uses the player exposure at the same snapped placement without filename matching', () => {
  const env = runtime('?lighting=night');
  load(env, 'main.js');
  const api = env.YUMANIWA_TOWN_LIGHTING;
  let source, count = 0, fallback = 0;
  env.ctx = {
    save() {}, restore() {}, fillRect() { fallback++; },
    drawImage(actual, ...rect) {
      assert.equal(actual, api.image(plaza, source, '@player'));
      assert.deepEqual(rect, [11,11,32,32]);
      count++;
    }
  };
  for (const pose of ['stand', 'walk']) {
    for (const dir of ['up', 'down', 'left', 'right']) {
      source = sprite('art-' + count + '.png', 2, 2);
      env.playerSprites[pose][dir] = source;
      env.player.dir = dir;
      env.player.isMoving = pose === 'walk';
      env.player.walkFrame = env.player.isMoving ? 1 : 0;
      env.drawPlayerSprite(19, 27);
    }
  }
  assert.equal(count, 8);
  env.playerSprites.walk.right = null;
  env.drawPlayerSprite(19, 27);
  assert.ok(fallback > 0);
  assert.equal(count, 8, 'missing sprite uses the original vector fallback');
});

test('recognizable night palette for the back of the player, a bench and a sign', () => {
  const api = runtime('?lighting=night').YUMANIWA_TOWN_LIGHTING;
  // Back-facing stand-3.png and walk-3.png at (250,320) and (250,200).
  // The bench samples are slat (55,84) and brace (74,80) in the 3x delivery;
  // standing_sign_01 uses the paper (16,16) and dark frame (6,16).
  const cases = [
    ['@player', [54,76,98], [62,55,49], [225,199,148], 12],
    ['bench_wood_01', [120,89,54], [20,20,20], [183,172,154], 40],
    ['standing_sign_01', [233,212,184], [28,18,18], [196,168,120], 80]
  ];
  for (const [id, feature, edge, ground, minInternalRange] of cases) {
    const source = sprite('source.png', 2, 1);
    source.data.set([...feature,255, ...edge,255]);
    const floor = sprite('assets/maps/grounds/station-plaza-ground.jpg', 1, 1);
    floor.data.set([...ground,255]);
    const lit = api.image(plaza, source, id);
    const [body, outline] = [readRGB(lit, 0, 0), readRGB(lit, 1, 0)];
    const floorY = luma(readRGB(api.image(plaza, floor), 0, 0));
    assert.ok(luma(body) >= luma(feature) * 0.73, id + ' material lost');
    assert.ok(luma(body) - luma(outline) >= minInternalRange, id + ' internal tones lost');
    assert.ok(Math.max(Math.abs(floorY - luma(body)), Math.abs(floorY - luma(outline))) >= 24,
      id + ' neither visible detail separates from pavement');
    if (id === '@player') {
      assert.ok(body[2] - body[0] >= 30, 'back-facing blue shirt');
      assert.ok(outline[0] - outline[2] >= 7 && luma(outline) >= 40, 'brown hair');
    }
    for (const daytime of ['morning', 'noon', 'evening', 'off']) {
      api.setPeriod(daytime);
      assert.deepEqual(api.image(plaza, source, id).data, api.image(plaza, source).data, id + ' ' + daytime);
    }
    api.setPeriod('night');
  }
});

test('unlit facade details remain visible against actual authored paving at their placement', () => {
  const env = runtime('?lighting=night'), api = env.YUMANIWA_TOWN_LIGHTING;
  // Logical PNG sample (non-emitting) and JPEG directly underneath the same point.
  const cases = [
    ['station_building_01',47,105,[75,56,40],[196,168,128]],
    ['street_lamp_01',15,35,[50,55,60],[197,169,129]],
    ['craft_cola_shop_01',30,63,[111,49,43],[46,29,19]],
    ['yakitori_shop_01',30,63,[243,197,151],[90,59,38]],
    ['kissaten_shop_01',30,63,[200,171,135],[89,59,35]],
    ['curry_shop_01',30,63,[134,94,35],[48,37,31]]
  ];
  for (const [id, x, y, wood, paving] of cases) {
    const alley = id.includes('shop_');
    const scene = alley ? 'tomogushi_alley_map' : plaza;
    const floor = sprite('assets/maps/grounds/' + (alley ? 'tomogushi-alley-ground.jpg' : 'station-plaza-ground.jpg'), 1, 1);
    floor.data.set([...paving,255]);
    const def = env.YUMANIWA_TOWN_LIGHTING_MATERIALS.objects[id];
    const source = sprite(env.YUMANIWA_WORLD_OBJECTS.get(id).src, def.width, def.height);
    source.data.set([...wood,255], (y * def.width + x) * 4);
    const lit = readRGB(api.image(scene, source, id), x, y);
    const ground = readRGB(api.image(scene, floor), 0, 0);
    assert.ok(luma(lit) > 0.62 * luma(wood), id + ' facade ' + lit);
    assert.ok(Math.abs(luma(lit) - luma(ground)) > 15, id + ' lost against ground ' + [lit, ground]);
  }
});

test('exposed pavement receives warm light with falloff and retains surface contrast', () => {
  const env = runtime('?lighting=night'), api = env.YUMANIWA_TOWN_LIGHTING;
  // Points on exposed pavement in the sprite's world pixel grid, including
  // one in front of each shop and on the small visible station step.
  const cases = [
    // Last three samples are the underlying JPEG at near, mid and outside
    // positions, before placing sprites (left plaza lamp for street_lamp_01).
    ['street_lamp_01', 18,55,22,44, [[198,171,128], [192,163,121], [225,197,147]]],
    ['station_building_01', 63,124,-14,-37, [[198,170,130], [196,171,130], [197,169,129]]],
    ['craft_cola_shop_01', 61,96,19,39, [[27,20,14], [25,20,14], [30,22,19]]],
    ['yakitori_shop_01', 61,96,18,39, [[42,37,34], [42,37,33], [48,41,33]]],
    ['kissaten_shop_01', 58,96,17,37, [[36,25,19], [25,20,17], [22,17,13]]],
    ['curry_shop_01', 61,96,19,39, [[26,18,15], [22,17,13], [26,21,17]]]
  ];
  for (const [id, x, y, middle, outside, samples] of cases) {
    const isAlley = id.includes('_shop_');
    const scene = isAlley ? 'tomogushi_alley_map' : plaza;
    const name = isAlley ? 'tomogushi-alley-ground' : 'station-plaza-ground';
    const ground = sprite('assets/maps/grounds/' + name + '.jpg', 3, 1);
    samples.forEach((rgb, i) => ground.data.set([...rgb,255], 4 * i));
    const ambient = api.image(scene, ground);
    const stones = samples.map((_, i) => readRGB(ambient, i, 0));
    const def = env.YUMANIWA_TOWN_LIGHTING_MATERIALS.objects[id];
    const source = sprite(env.YUMANIWA_WORLD_OBJECTS.get(id).src, def.width, def.height);
    let bitmap, left, top;
    const ctx = {save() {}, restore() {}, drawImage(image, dx, dy) { bitmap = image; left = dx; top = dy; }};
    api.drawGround(ctx, scene, source, id, 0, 0, def.width, def.height);
    function composite(x, pavement) {
      let rgb = pavement;
      for (const row of bitmap.spans) {
        if (row.y + top !== y || x < row.x + left || x >= row.x + left + row.w) continue;
        const [r, g, b, alpha] = row.color.slice(5, -1).split(',').map(Number);
        rgb = [r, g, b].map((channel, i) => channel * alpha + rgb[i] * (1 - alpha));
      }
      return rgb;
    }
    const near = composite(x, stones[0]), mid = composite(x + middle, stones[1]);
    const nearGain = luma(near) - luma(stones[0]), midGain = luma(mid) - luma(stones[1]);
    assert.deepEqual(composite(x + outside, stones[2]), stones[2], id + ' bounded pool');
    assert.ok(nearGain > 20, id + ' dim pool ' + near);
    assert.ok(nearGain > midGain + 4 && midGain > 2, id + ' falloff ' + [nearGain,midGain]);
    assert.ok(near[0] - near[2] > 18, id + ' warm pool');
    const brighterStone = stones[0].map(channel => channel + 20);
    assert.ok(luma(composite(x, brighterStone)) - luma(near) > 6, id + ' preserve ground texture');
  }
});

test('projected ground is a separate snapped bitmap and follows the sprite world position', () => {
  const env = runtime();
  const api = env.YUMANIWA_TOWN_LIGHTING;
  const id = 'station_building_01';
  const source = sprite(env.YUMANIWA_WORLD_OBJECTS.get(id).src, 128, 128);
  const calls = [];
  const ctx = {save() {}, restore() {}, drawImage: (...args) => calls.push(args)};
  const extents = {};
  for (const period of periods) {
    api.setPeriod(period);
    const image = api.image(plaza, source, id);
    assert.notEqual(image, source);
    api.drawGround(ctx, plaza, source, id, 64, 96, 128, 128);
    const [ground, x, y, w, h] = calls.pop();
    assert.notEqual(ground, image);
    assert.ok(ground.spans.length > 0 && ground.spans.every(s => s.h === 1));
    // At night the wider light pool begins above the contact shadow.
    const shadowRows = period === 'noon' ? ground.spans : ground.spans.filter(s => s.color.startsWith('rgba(26,20,21,'));
    const shadowTop = y + Math.min(...shadowRows.map(s => s.y));
    assert.ok(shadowTop > 96 + 115 && shadowTop < 96 + 127, 'under the base, above the canvas bottom');
    extents[period] = [x, x + w];
    api.drawGround(ctx, plaza, source, id, 75, 104, 128, 128);
    assert.deepEqual(calls.pop(), [ground, x + 11, y + 8, w, h]);
  }
  assert.ok(extents.morning[1] > extents.noon[1]);
  assert.ok(extents.evening[0] < extents.noon[0]);
  source.src = source.currentSrc = 'broken-version.png';
  source.failRead = true;
  api.drawGround(ctx, plaza, source, id, 64, 96, 128, 128);
  assert.equal(calls.length, 0, 'failed image cannot leave a phantom shadow');
});

test('failures are bounded and an image that reloads can recover', () => {
  const api = runtime('?lighting=night').YUMANIWA_TOWN_LIGHTING;
  const broken = sprite('asset.png?rev=one');
  broken.failRead = true;
  assert.equal(api.image(plaza, broken), broken);
  const failures = api.stats().failures;
  assert.ok(failures > 0);
  for (let i = 0; i < 8; i++) assert.equal(api.image(plaza, broken), broken);
  assert.equal(api.stats().failures, failures);
  const replacement = sprite(broken.src);
  const lit = api.image(plaza, replacement);
  assert.notEqual(lit, replacement);
  assert.equal(api.image(plaza, replacement), lit);
  const newRev = sprite('asset.png?rev=two');
  assert.notEqual(api.image(plaza, newRev), lit);
  const budget = api.stats();
  for (let i = 0; i < budget.maxEntries + 2; i++) api.image(plaza, sprite('asset-' + i + '.png', 4, 4));
  const after = api.stats();
  assert.ok(after.entries <= budget.maxEntries);
  assert.ok(after.evictions > 0);
  for (let i = 0; i <= Math.ceil(budget.maxPixels / (768 * 768)); i++) {
    api.image(plaza, sprite('ground-' + i + '.jpg', 768, 768));
  }
  assert.ok(api.stats().pixels <= budget.maxPixels);
});

test('canvas blit errors restore drawing state and recover the original sprite', () => {
  const env = runtime('?lighting=night');
  const api = env.YUMANIWA_TOWN_LIGHTING;
  const id = 'station_building_01';
  const source = sprite(env.YUMANIWA_WORLD_OBJECTS.get(id).src, 128, 128);
  const originalRect = [24, 90, 128, 128];
  const drawn = [];
  const ctx = {
    imageSmoothingEnabled: true,
    stack: [],
    save() { this.stack.push(this.imageSmoothingEnabled); },
    restore() { this.imageSmoothingEnabled = this.stack.pop(); },
    drawImage(image, ...rect) {
      if (image !== source) throw new Error('unavailable derived canvas');
      drawn.push(rect);
    }
  };
  api.drawGround(ctx, plaza, source, id, ...originalRect);
  assert.deepEqual(ctx.stack, []);
  assert.equal(ctx.imageSmoothingEnabled, true);
  assert.equal(api.image(plaza, source, id), source);
  api.drawImage(ctx, plaza, source, id, ...originalRect);
  assert.deepEqual(drawn, [originalRect]);

  api.setPeriod('evening');
  assert.notEqual(api.image(plaza, source, id), source);
  api.drawImage(ctx, plaza, source, id, ...originalRect);
  assert.deepEqual(drawn, [originalRect, originalRect]);
  assert.equal(api.period, 'off');
});

test('town draw paints all four lamp footprints before markers and footY-sorted sprites', () => {
  const env = runtime('?lighting=night');
  load(env, 'data/station-plaza.js');
  load(env, 'data/town-maps.js');
  load(env, 'main.js');
  env.Image = class {};
  load(env, 'data/station-plaza-props.js');
  const api = env.YUMANIWA_STATION_PLAZA_PROPS;
  const lighting = env.YUMANIWA_TOWN_LIGHTING;
  const scene = env.TOWN_SCENE_MAPS.station_plaza;
  env.activeTownSceneDef = scene;
  const traces = [];
  env.canvas = {width:390, height:780};
  env.ctx = {
    clipBounds: null, stack: [],
    clearRect() {}, scale() {}, translate() {}, arc() {},
    beginPath() { this.pathRect = null; },
    rect(...bounds) { this.pathRect = bounds; },
    clip() { this.clipBounds = this.pathRect; },
    save() { this.stack.push(this.clipBounds); },
    restore() { this.clipBounds = this.stack.pop(); },
    fill() { assert.equal(this.clipBounds, null); traces.push('marker'); },
    drawImage(source, ...rect) {
      assert.equal(this.clipBounds, null, 'ground and actors retain their original clip');
      traces.push({name:source.name, rect});
    }
  };
  env.getCamera = () => ({zoom:1, cameraX:0, cameraY:0, mapPixelW:384, mapPixelH:384});
  env.preloadTownSceneBackgroundAsset = () => ({loaded:true, image:{name:'ground'}});
  const props = Array.from(scene.props).filter(p => p.enabled !== false);
  for (const prop of props) {
    const entry = api.imageCache[api.resolvePropSrc(prop)];
    entry.loaded = true;
    entry.image.name = prop.objectId;
  }
  const draft = {name:'draft'};
  env.YUMANIWA_CREATION_DRAFT = {
    renderItems: () => [{image:draft, prop:{x:5, y:6, w:2, h:2, footY:8}}]
  };
  env.playerSprites.stand.down = {...sprite('actor.png'), name:'player'};
  env.player.y = 8 * 16;
  env.tapMarkerPos = {x:3, y:4};
  env.tapMarkerTimer = 12;
  // Record calls at the adapter boundary; separate tests exercise the actual bitmaps.
  env.YUMANIWA_TOWN_LIGHTING = {
    active: sceneId => lighting.active(sceneId),
    drawImage(ctx, sceneId, source, id, ...rect) {
      const image = lighting.active(sceneId) ? {name:'lit ' + source.name} : source;
      ctx.drawImage(image, ...rect);
    },
    drawGround(ctx, sceneId, image, id, ...rect) {
      assert.deepEqual(ctx.clipBounds, [0, 0, 384, 384], 'ground effects clipped to the world rectangle');
      traces.push({name:'foot ' + id, rect});
    }
  };
  env.draw();
  assert.equal(traces[0].name, 'lit ground');
  const marker = traces.indexOf('marker');
  const underlay = traces.slice(1, marker);
  assert.equal(underlay.length, 5);
  const lamps = underlay.filter(item => item.name === 'foot street_lamp_01');
  assert.equal(lamps.length, 4);
  assert.equal(new Set(lamps.map(item => item.rect.join(','))).size, 4);
  const sprites = traces.slice(marker + 1);
  for (const item of underlay) {
    const name = item.name.replace('foot ', 'lit ');
    assert.ok(sprites.some(sprite => sprite.name === name && sprite.rect.join(',') === item.rect.join(',')));
  }
  const expected = props.map(p => ({y:p.footY, name:'lit ' + p.objectId}));
  expected.push({y:8, name:'draft'}, {y:9, name:'lit player'});
  expected.sort((a, b) => a.y - b.y);
  assert.deepEqual(sprites.map(item => item.name), expected.map(item => item.name));
  traces.length = 0;
  lighting.setPeriod('off');
  env.draw();
  assert.deepEqual(traces.map(item => item.name || item), [
    'ground', 'marker', ...expected.map(item => item.name.replace(/^lit /, ''))
  ]);
});

const leisure = 'leisure_center_map';
const softQuery = '?lighting=noon&shadows=soft';

function groundDraw(api, scene, source, id, w, h) {
  let draw;
  api.drawGround({
    save() {}, restore() {},
    drawImage(bitmap, x, y, width, height) { draw = {bitmap, x, y, width, height}; }
  }, scene, source, id, 0, 0, w, h);
  return draw;
}

test('regular noon matches the accepted soft preview; missing definitions keep the original fallback', () => {
  const regular = runtime().YUMANIWA_TOWN_LIGHTING;
  const preview = runtime(softQuery).YUMANIWA_TOWN_LIGHTING;
  const fallback = runtime('', {contacts:false}).YUMANIWA_TOWN_LIGHTING;
  assert.equal(regular.softNoon, true);
  assert.equal(preview.softNoon, true);
  assert.equal(fallback.softNoon, false);
  const id = 'station_building_01', src = sprite('station.png', 128, 128);
  for (const phase of [...periods, 'off']) {
    for (const api of [regular, preview, fallback]) api.setPeriod(phase);
    assert.equal(regular.softNoon, phase === 'noon');
    assert.equal(regular.active(leisure), phase === 'noon');
    assert.equal(regular.active('other_room'), false);
    assert.deepEqual(regular.image(plaza, src, id).data, preview.image(plaza, src, id).data, phase);
    assert.equal(regular.image(leisure, src, id), src, 'room always uses original sprite');
    assert.equal(regular.image(leisure, src), src, 'room ground stays original');
    const result = groundDraw(regular, plaza, src, id, 128, 128);
    const legacyLink = groundDraw(preview, plaza, src, id, 128, 128);
    const oldContact = groundDraw(fallback, plaza, src, id, 128, 128);
    if (phase === 'off') {
      assert.equal(result, undefined);
      assert.equal(legacyLink, undefined);
      assert.equal(oldContact, undefined);
      assert.equal(regular.image(plaza, src, id), src);
    } else {
      const raster = draw => [draw.x, draw.y, draw.width, draw.height, draw.bitmap.spans];
      assert.deepEqual(raster(result), raster(legacyLink), phase);
      if (phase === 'noon') assert.notDeepEqual(raster(result), raster(oldContact));
      else assert.deepEqual(raster(result), raster(oldContact), phase);
    }
  }
  fallback.setPeriod('noon');
  const bench = sprite('bench.png', 56, 56);
  for (const scene of [plaza, leisure]) {
    assert.equal(groundDraw(fallback, scene, bench, 'bench_wood_01', 56, 56), undefined);
    assert.equal(fallback.image(scene, bench, 'bench_wood_01'), bench);
  }
});

test('noon contact follows each support, leaving the original artwork and nearby pavement intact', () => {
  const env = runtime(), api = env.YUMANIWA_TOWN_LIGHTING;
  const materials = env.YUMANIWA_TOWN_LIGHTING_MATERIALS;
  load(env, 'data/station-plaza.js');
  load(env, 'data/town-maps.js');
  const indoorIds = new Set(env.TOWN_SCENE_MAPS[leisure].props.map(prop => prop.objectId));
  for (const id of indoorIds) assert.ok(materials.noonContacts[id], id);
  for (const [id, contact] of Object.entries(materials.noonContacts)) {
    const {width, height, shapes} = contact;
    const source = sprite(env.YUMANIWA_WORLD_OBJECTS.get(id).src, width, height);
    const indoor = indoorIds.has(id);
    const scene = indoor ? leisure : plaza;
    if (!materials.objects[id]) {
      source.failRead = true; // Any RGBA readback would throw and suppress the shadow.
      assert.equal(api.image(scene, source, id), source);
    }
    const draw = groundDraw(api, scene, source, id, width, height);
    assert.ok(draw, id + ' missing contact');
    const {bitmap, x, y} = draw;
    const left = Math.min(...shapes.map(s => s.cx - s.rx));
    const right = Math.max(...shapes.map(s => s.cx + s.rx));
    const top = Math.min(...shapes.map(s => s.cy - s.ry));
    const bottom = Math.max(...shapes.map(s => s.cy + s.ry));
    assert.ok(x >= Math.floor(left) && y >= Math.floor(top), id + ' displaced toward top/left');
    assert.ok(x + draw.width <= Math.ceil(right) + (indoor ? 0 : 10), id + ' horizontal reach');
    assert.ok(y + draw.height <= Math.ceil(bottom) + (indoor ? 0 : 6), id + ' vertical reach');

    const coverage = new Map();
    for (const span of bitmap.spans) {
      const [r,g,b,alpha] = span.color.slice(5,-1).split(',').map(Number);
      assert.ok(r === g && g === b && r <= 26, id + ' contact should be neutral');
      assert.equal(span.h, 1);
      for (let dx = 0; dx < span.w; dx++) {
        const key = (x + span.x + dx) + ',' + (y + span.y);
        const previous = coverage.get(key) || 0;
        coverage.set(key, previous + alpha * (1 - previous));
      }
    }
    const peak = Math.max(...coverage.values());
    assert.ok(peak > 0.06 && peak <= 0.27, id + ' unexpected composite opacity ' + peak);
    for (const foot of shapes) {
      const atFoot = coverage.get(Math.floor(foot.cx) + ',' + Math.floor(foot.cy)) || 0;
      assert.ok(atFoot >= 0.06, id + ' no contact at support');
    }
    // Source-art probes independent of the shape list: the platform has a gap
    // between piers, and the counter plinth meets the floor above the PNG edge.
    if (id === 'station_building_01') {
      assert.ok(coverage.get('45,124') > 0.06);
      assert.ok(!coverage.has('63,124'));
    }
    if (id === 'leisure_counter_01') {
      assert.ok(coverage.get('50,94') > 0.05);
      assert.ok(!coverage.has('50,100'));
    }
    if (id === 'yakitori_shop_01') {
      const tip = bitmap.spans.reduce((lowest, row) => row.y > lowest.y ? row : lowest);
      const dx = draw.x + tip.x + tip.w / 2 - 48;
      assert.ok(dx > 0 && dx < 10, 'short noon cast to the right of the actual shop sill');
    }
    assert.equal(groundDraw(api, scene, source, id, width, height).bitmap, bitmap);
  }
  assert.equal(api.stats().failures, 0);
});

test('indoor contact-only and outdoor short projections never share the wrong cache entry', () => {
  for (const firstScene of [plaza, leisure]) {
    const env = runtime(), api = env.YUMANIWA_TOWN_LIGHTING;
    const id = 'bench_wood_01', src = sprite('bench.png?rev=1', 56, 56);
    src.failRead = true;
    const nextScene = firstScene === plaza ? leisure : plaza;
    const first = groundDraw(api, firstScene, src, id, 56, 56);
    const next = groundDraw(api, nextScene, src, id, 56, 56);
    const indoor = firstScene === leisure ? first : next, outdoor = firstScene === plaza ? first : next;
    assert.notEqual(indoor.bitmap, outdoor.bitmap);
    assert.ok(outdoor.y + outdoor.height > indoor.y + indoor.height, 'short exterior cast below contact');
    assert.ok(outdoor.height - indoor.height <= 6);
    assert.equal(api.stats().renders, 2);
    assert.equal(groundDraw(api, firstScene, src, id, 56, 56).bitmap, first.bitmap);
    assert.equal(api.image(firstScene, src, id), src);
    assert.equal(api.stats().renders, 2);
    api.setPeriod('night');
    assert.equal(groundDraw(api, leisure, src, id, 56, 56), undefined);
    api.setPeriod('noon');
    assert.equal(groundDraw(api, leisure, src, id, 56, 56).bitmap, indoor.bitmap);
    const replacement = sprite(src.src, 56, 56);
    assert.notEqual(groundDraw(api, firstScene, replacement, id, 56, 56).bitmap, first.bitmap);
    replacement.currentSrc = 'bench.png?rev=2';
    const ctx = {save() {}, restore() {}, drawImage() { throw new Error('lost ground surface'); }};
    api.drawGround(ctx, firstScene, replacement, id, 0, 0, 56, 56);
    assert.equal(groundDraw(api, firstScene, replacement, id, 56, 56), undefined);
    assert.equal(api.image(firstScene, replacement, id), replacement);
    assert.equal(api.stats().failures, 1);
    assert.equal(groundDraw(api, leisure, {naturalWidth:0, naturalHeight:0}, id, 56, 56), undefined);
  }
});

test('leisure center draws only loaded exhibit contacts before the original footY-sorted sprites', () => {
  const env = runtime();
  load(env, 'data/station-plaza.js');
  load(env, 'data/town-maps.js');
  load(env, 'main.js');
  env.Image = class {};
  load(env, 'data/station-plaza-props.js');
  const lib = env.YUMANIWA_STATION_PLAZA_PROPS;
  const scene = env.TOWN_SCENE_MAPS[leisure];
  env.currentScene = leisure;
  env.activeTownSceneDef = scene;
  env.canvas = {width:390, height:780};
  env.getCamera = () => ({zoom:1, cameraX:0, cameraY:0, mapPixelW:384, mapPixelH:384});
  env.player.y = 11 * 16;
  env.playerSprites.stand.down = {...sprite('player.png'), name:'player'};
  env.preloadTownSceneBackgroundAsset = () => ({loaded:true, image:{name:'ground'}});
  lib.preloadSceneProps(scene);
  const ordered = Array.from(scene.props, p => ({name:p.objectId, foot:p.footY}));
  for (const prop of scene.props) {
    const id = prop.objectId, def = env.YUMANIWA_TOWN_LIGHTING_MATERIALS.noonContacts[id];
    const entry = lib.imageCache[lib.resolvePropSrc(prop)];
    entry.loaded = true;
    Object.assign(entry.image, {
      name:id, naturalWidth:def.width, naturalHeight:def.height, failRead:true
    });
  }
  const observations = [];
  env.ctx = {
    save() {}, restore() {}, clearRect() {}, scale() {}, translate() {}, beginPath() {}, rect() {}, clip() {},
    drawImage(img) { observations.push(img.spans ? 'contact' : img.name); }
  };
  ordered.push({name:'player', foot:12});
  ordered.sort((a, b) => a.foot - b.foot);
  env.draw();
  assert.deepEqual(observations, ['ground', ...scene.props.map(() => 'contact'), ...ordered.map(o => o.name)]);
  observations.length = 0;
  const missing = scene.props[2];
  lib.imageCache[lib.resolvePropSrc(missing)].loaded = false;
  env.draw();
  assert.equal(observations.filter(name => name === 'contact').length, scene.props.length - 1);
  assert.ok(!observations.includes(missing.objectId));
  env.YUMANIWA_TOWN_LIGHTING.setPeriod('off');
  observations.length = 0;
  env.draw();
  assert.deepEqual(observations, ['ground', ...ordered.filter(o => o.name !== missing.objectId).map(o => o.name)]);
});

function recreationRoad(query) {
  const env = runtime(query);
  for (const file of ['data/station-plaza.js','data/town-maps.js','town-editor-session.js','main.js']) load(env,file);
  env.currentScene = 'recreation_road_map';
  env.activeTownSceneDef = env.TOWN_SCENE_MAPS[env.currentScene];
  env.triggers = env.activeTownSceneDef.triggers;
  return env;
}

test('four road lamps stand at six-tile intervals outside the walkable corridor and preserve both exits', () => {
  const env = recreationRoad('');
  const scene = env.activeTownSceneDef, id = 'street_lamp_01';
  load(env, 'town-interaction-flow.js');
  const lamps = Array.from(scene.props).filter(p => p.enabled !== false && p.objectId === id).sort((a,b) => a.y - b.y);
  assert.equal(lamps.length, 4);
  assert.equal(new Set(lamps.map(p => p.id)).size, 4);
  env.activeTownSceneDef = {...scene, props:scene.props.filter(p => !lamps.includes(p))};
  env.initGrid();
  const beforeLamps = env.collisionGrid;
  env.activeTownSceneDef = scene;
  env.initGrid();
  assert.deepEqual(env.collisionGrid, beforeLamps, 'the four lamps add no collision tiles');
  const foot = env.YUMANIWA_TOWN_LIGHTING_MATERIALS.objects[id].shapes.find(s => s.kind === 'shadow');
  lamps.forEach((prop, i) => {
    assert.equal(prop.w, 2);
    assert.equal(prop.h, 3.5);
    assert.equal(prop.footY, prop.y + prop.h);
    assert.equal(prop.x, lamps[0].x);
    if (i) assert.equal(prop.footY - lamps[i-1].footY, 6);
    const x = Math.floor(prop.x + foot.cx / env.TILE_SIZE), y = Math.floor(prop.y + foot.cy / env.TILE_SIZE);
    assert.equal(env.isWalkableTile(x, y), false, prop.id + ' post outside the walking surface');
    assert.equal(env.getTownPartCollisionRectPixels(prop), null);
    assert.equal(env.getTownPartInteractionRectPixels(prop), null);
    assert.equal(prop.tap.enabled, false);
  });
  env.updateInteractionHint = () => {};
  const input = env.YUMANIWA_TOWN_INTERACTION;
  for (const spawn of ['fromPlaza','fromLeisure']) {
    env.placePlayerAtTownSpawn(scene, spawn);
    for (const warp of scene.edgeWarps) {
      const y = warp.side === 'up' ? 0 : scene.mapHeight - 1;
      for (let x = warp.min; x <= warp.max; x++) {
        assert.equal(env.isWalkableTile(x, y), true);
        assert.ok(env.findPath(scene.spawnPoints[spawn].x, scene.spawnPoints[spawn].y, x, y));
      }
      assert.ok(input.requestTap(12, y));
      assert.equal(input.getRequest().arrival.side, warp.side);
    }
    assert.ok(input.requestTap(12, 12));
    assert.equal(input.getRequest().arrival.type, 'none', 'central pavement still receives ground movement');
  }
  assert.deepEqual(Array.from(scene.edgeWarps, w => w.target), ['station_plaza', 'leisure_center_map']);
});

test('all four road placements draw the same lit lamp and its pool; OFF draws the physical original', () => {
  const env = recreationRoad('?lighting=night'), scene = env.activeTownSceneDef;
  env.Image = class {};
  load(env, 'data/station-plaza-props.js');
  const lib = env.YUMANIWA_STATION_PLAZA_PROPS, api = env.YUMANIWA_TOWN_LIGHTING;
  lib.preloadSceneProps(scene);
  const lampId = 'street_lamp_01', lamp = env.YUMANIWA_WORLD_OBJECTS.get(lampId);
  const lamps = Array.from(scene.props).filter(p => p.enabled !== false && p.objectId === lampId).sort((a,b) => a.footY - b.footY);
  const sources = new Set(lamps.map(prop => lib.resolvePropSrc(prop)));
  assert.deepEqual([...sources], [lamp.src]);
  const png = fs.readFileSync(path.join(root, lamp.src.split('?')[0]));
  const raw = lib.imageCache[lamp.src].image;
  // The Canvas double accepts the logical readback of a physical 3x delivery.
  Object.assign(raw, sprite(lamp.src, 32, 56), {naturalWidth:png.readUInt32BE(16), naturalHeight:png.readUInt32BE(20)});
  assert.deepEqual([raw.naturalWidth, raw.naturalHeight], [96,168]);
  raw.data.set([255,255,255,255], 4 * (15*32 + 14));
  raw.data.set([20,20,20,255], 4 * (15*32 + 12));
  lib.imageCache[lamp.src].loaded = true;
  env.drawPlayerSprite = () => {};
  const draws = [];
  env.ctx = {save() {}, restore() {}, drawImage(image, ...rect) { draws.push({image, rect}); }};
  function frame() {
    draws.length = 0;
    if (api.active(scene.id)) lib.drawGroundLighting(api, scene.id);
    lib.drawTownActorsAndProps();
    return draws.slice();
  }
  const lit = frame();
  assert.equal(lit.length, 8);
  const pool = lit[0].image, bulb = lit[4].image;
  assert.notEqual(pool, bulb);
  assert.notEqual(bulb, raw);
  assert.ok(luma(readRGB(bulb, 14,15)) - luma(readRGB(bulb, 12,15)) > 85);
  assert.ok(pool.spans.some(s => !s.color.startsWith('rgba(26,20,21,')), 'night light reaches pavement');
  for (let i = 0; i < 4; i++) {
    assert.equal(lit[i].image, pool);
    assert.equal(lit[4+i].image, bulb);
    assert.deepEqual(lit[4+i].rect, [lamps[i].x * 16, lamps[i].y * 16, 32, 56]);
    assert.equal(lit[i].rect[1] - lit[0].rect[1], i * 96);
  }
  frame();
  assert.equal(api.stats().renders, 1, 'shared sprite and pool prepared only once');
  api.setPeriod('off');
  const off = frame();
  assert.equal(off.length, 4);
  assert.ok(off.every(d => d.image === raw));
  assert.deepEqual(off.map(d => d.rect), lit.slice(4).map(d => d.rect));
});


test('Device local clock period boundaries are stable, including midnight', () => {
  const lighting = runtime('?lighting=auto').YUMANIWA_TOWN_LIGHTING;
  for (const [hour, minute, expected] of [
    [4, 59, 'night'], [5, 0, 'morning'], [7, 59, 'morning'],
    [8, 0, 'noon'], [16, 59, 'noon'], [17, 0, 'evening'],
    [19, 59, 'evening'], [20, 0, 'night'], [23, 59, 'night'], [0, 0, 'night']
  ]) assert.equal(lighting.periodForLocalTime(hour, minute), expected, String(hour)+':'+String(minute));
  assert.equal(lighting.periodForLocalTime(24, 0), 'noon');
});
