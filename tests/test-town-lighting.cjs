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
    fillRect(x, y, w, h) { result.spans.push({x, y, w, h}); }
  };
  result.getContext = () => ctx;
  return result;
}

function runtime(query = '', {renderer = true} = {}) {
  const env = vm.createContext({
    location: {search: query}, URLSearchParams, Uint8Array, Uint8ClampedArray,
    document: {createElement: () => canvas()}
  });
  env.window = env;
  if (renderer) load(env, 'engine/sukimastock-lighting.v0.1.0.js');
  load(env, 'data/world-objects.js');
  load(env, 'data/town-lighting-materials.js');
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
    const expected = env.SukimaStockLighting.render(image, {}, period).data;
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
    assert.ok(y > 96 + 115 && y < 96 + 127, 'under the base, above the canvas bottom');
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
