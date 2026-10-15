const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const NOW = Date.UTC(2026, 9, 15, 18);
const HOUR = 3600000;
const clone = (value) => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let i = 0; i < 24; i += 1) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
function payload(temp = 16, now = NOW) {
  const time = Math.floor(now / 1000);
  return {
    current: { time, temperature_2m: temp, apparent_temperature: temp - 1, weather_code: 61, is_day: 1, wind_speed_10m: 12, wind_direction_10m: 80 },
    utc_offset_seconds: 0, timezone: 'Europe/London',
    hourly: {
      time: Array.from({ length: 120 }, (_, i) => time + i * 3600),
      temperature_2m: Array.from({ length: 120 }, (_, i) => temp + i / 10),
      weather_code: Array(120).fill(61),
    },
    daily: {
      time: Array.from({ length: 5 }, (_, i) => time + i * 86400),
      temperature_2m_max: Array(5).fill(temp + 3), temperature_2m_min: Array(5).fill(temp - 3),
      weather_code: Array(5).fill(61), sunrise: Array(5).fill(time - 3600), sunset: Array(5).fill(time + 3600),
    },
  };
}
function harness({ stored = {}, abortController = true } = {}) {
  let now = NOW, nextTimer = 0;
  const timers = new Map(), events = [], calls = [], listeners = new Map(), documentListeners = new Map();
  const values = new Map(Object.entries(clone(stored)));
  const add = (map, name, fn) => { if (!map.has(name)) map.set(name, new Set()); map.get(name).add(fn); };
  const remove = (map, name, fn) => map.get(name)?.delete(fn);
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const ctx = {
    console: { warn() {}, info() {}, log() {} }, Date: ClockDate, URLSearchParams,
    AbortController: abortController ? AbortController : undefined,
    navigator: { onLine: true },
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(name, fn) { add(listeners, name, fn); },
    removeEventListener(name, fn) { remove(listeners, name, fn); },
    document: { visibilityState: 'visible', addEventListener(name, fn) { add(documentListeners, name, fn); }, removeEventListener(name, fn) { remove(documentListeners, name, fn); } },
    SSE: {
      storage: { get(key, fallback) { return values.has(key) ? values.get(key) : fallback; }, set(key, value) { values.set(key, clone(value)); } },
      analytics: { track(name, props, options) { events.push({ name, props: clone(props), options }); } },
      audio: { tone() {} },
    },
    DotWeatherWorld: class { setCity() {} update() {} },
  };
  ctx.fetch = async (url, options) => {
    calls.push({ url, options });
    const count = new URL(url).searchParams.get('latitude').split(',').length;
    return { ok: true, json: async () => count === 1 ? payload(16, now) : Array.from({ length: count }, () => payload(16, now)) };
  };
  vm.createContext(ctx);
  for (const file of ['dotweather-data.js', 'dotweather-ui.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), ctx, { filename: file });
  return {
    ctx, data: ctx.DotWeatherData, events, calls, values, timers, listeners, documentListeners,
    ui() { return new ctx.DotWeatherUI(); },
    async advance(ms) {
      now += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
      await flush();
    },
    emit(name) { for (const fn of listeners.get(name) || []) fn(); },
    visible(value) { ctx.document.visibilityState = value; for (const fn of documentListeners.get('visibilitychange') || []) fn(); },
  };
}
function cacheForecast(updatedAt = NOW) {
  const h = harness();
  return clone(h.data.normalizeForecastForTest(h.data.cityById('tokyo'), payload(), updatedAt));
}

test('normal forecast renders measured values, supports negative temperatures and zero weather code', async () => {
  const h = harness();
  const p = payload(-4); p.current.weather_code = 0;
  h.ctx.fetch = async () => ({ ok: true, json: async () => p });
  const result = await h.data.refreshForecasts(['tokyo']);
  assert.equal(result.count, 1);
  assert.equal(h.data.cityById('tokyo').temp, -4);
  assert.equal(h.data.cityById('tokyo').weather, 'clear');
  assert.equal(h.data.cityDataState(h.data.cityById('tokyo')), 'live');
  assert.equal(h.timers.size, 0);
});

test('all requested current measurements must be present rather than falling back to demo values', async (t) => {
  for (const field of ['temperature_2m', 'apparent_temperature', 'wind_speed_10m', 'wind_direction_10m', 'weather_code', 'is_day']) {
    for (const value of [null, undefined]) await t.test(`${field} ${value === null ? 'null' : 'missing'}`, async () => {
      const h = harness(), p = payload();
      if (value === undefined) delete p.current[field]; else p.current[field] = value;
      h.ctx.fetch = async () => ({ ok: true, json: async () => p });
      await assert.rejects(h.data.refreshForecasts(['tokyo']), e => e.dotWeather?.type === 'normalize');
      assert.equal(h.data.cityById('tokyo').dataSource, 'demo');
    });
  }
  for (const value of [null, undefined]) await t.test(`utc_offset_seconds ${value === null ? 'null' : 'missing'}`, async () => {
    const h = harness(), p = payload();
    if (value === undefined) delete p.utc_offset_seconds; else p.utc_offset_seconds = value;
    h.ctx.fetch = async () => ({ ok: true, json: async () => p });
    await assert.rejects(h.data.refreshForecasts(['tokyo']), e => e.dotWeather?.type === 'normalize');
  });
});

test('documented heavy thunderstorm weather code 97 stays valid', async () => {
  const h = harness(), p = payload(); p.current.weather_code = 97;
  h.ctx.fetch = async () => ({ ok: true, json: async () => p });
  await h.data.refreshForecasts(['tokyo']);
  assert.equal(h.data.cityById('tokyo').weather, 'thunder');
});

test('missing, null and malformed API data cannot become live data', async (t) => {
  const cases = [
    ['empty object', () => ({})], ['null current', p => ({ ...p, current: null })],
    ['missing current', p => { delete p.current; return p; }],
    ['null temperature', p => { p.current.temperature_2m = null; return p; }],
    ['missing current code', p => { delete p.current.weather_code; return p; }],
    ['unknown current code', p => { p.current.weather_code = 1000; return p; }],
    ['missing daily', p => { delete p.daily; return p; }],
    ['null daily low', p => { p.daily.temperature_2m_min[0] = null; return p; }],
    ['missing hourly', p => { delete p.hourly; return p; }],
    ['null hourly temperature', p => { p.hourly.temperature_2m[2] = null; return p; }],
    ['mismatched arrays', p => { p.hourly.weather_code.pop(); return p; }],
    ['insufficient future forecast', p => { p.hourly.time = p.hourly.time.map(x => x - 864000); return p; }],
  ];
  for (const [name, mutate] of cases) await t.test(name, async () => {
    const h = harness(); h.ctx.fetch = async () => ({ ok: true, json: async () => mutate(payload()) });
    await assert.rejects(h.data.refreshForecasts(['tokyo']), e => e.dotWeather?.type === 'normalize');
    assert.equal(h.data.cityById('tokyo').dataSource, 'demo');
    assert.equal(h.values.has('weatherCacheV1'), false);
  });
});

test('polar forecast with null sunrise and sunset still accepts valid weather observations', async () => {
  const h = harness(), p = payload();
  p.daily.sunrise = Array(5).fill(null); p.daily.sunset = Array(5).fill(null);
  p.current.is_day = 0;
  h.ctx.fetch = async () => ({ ok: true, json: async () => p });
  await h.data.refreshForecasts(['tokyo']);
  assert.equal(h.data.cityById('tokyo').temp, 16);
  assert.equal(h.data.cityById('tokyo').timeOfDay, 'night');
  assert.equal(h.data.cityDataState(h.data.cityById('tokyo')), 'live');
});

test('one invalid city rejects the whole batch without partially overwriting old weather', async () => {
  const h = harness(); await h.data.refreshForecasts(['tokyo', 'london']);
  const original = clone(h.data.cityById('tokyo'));
  const saved = clone(h.values.get('weatherCacheV1'));
  h.ctx.fetch = async () => ({ ok: true, json: async () => [payload(30), {}] });
  await assert.rejects(h.data.refreshForecasts(['tokyo', 'london']), e => e.dotWeather.type === 'normalize');
  assert.deepEqual(clone(h.data.cityById('tokyo')), original);
  assert.deepEqual(h.values.get('weatherCacheV1'), saved);
});

test('cache expiry and validity belong to individual cities, not fresh outer metadata', () => {
  const valid = cacheForecast(NOW - HOUR), expired = cacheForecast(NOW - 13 * HOUR), corrupt = cacheForecast();
  corrupt.hourly[0].temp = null;
  const h = harness({ stored: { weatherCacheV1: { version: 1, updatedAt: NOW, forecasts: { tokyo: valid, london: expired, paris: corrupt } } } });
  const loaded = h.data.loadCachedForecasts();
  assert.equal(loaded.applied, 1); assert.equal(loaded.updatedAt, NOW - HOUR); assert.equal(loaded.stale, true);
  assert.equal(h.data.cityDataState(h.data.cityById('tokyo')), 'cached');
  for (const id of ['london', 'paris']) assert.equal(h.data.cityDataState(h.data.cityById(id)), 'unavailable');
});

test('fresh cache for another city does not suppress selected missing city fetch', async () => {
  const h = harness({ stored: {
    cityState: { version: 1, ids: ['tokyo', 'london'], activeId: 'london' },
    weatherCacheV1: { version: 1, updatedAt: NOW, forecasts: { tokyo: cacheForecast() } },
  } });
  const ui = h.ui(); ui.enter({}); await flush();
  assert.equal(h.calls.length, 1); assert.equal(ui.getCity().id, 'london');
  assert.equal(h.events.find(e => e.name === 'Weather Cache Display').props.display_state, 'unavailable');
  assert.equal(ui.getDisplayCity().temp, 16);
});

test('fully fresh selected cache displays without inventing an API success', async () => {
  const h = harness({ stored: {
    cityState: { version: 1, ids: ['tokyo'], activeId: 'tokyo' },
    weatherCacheV1: { version: 1, updatedAt: NOW, forecasts: { tokyo: cacheForecast() } },
  } });
  const ui = h.ui(); ui.enter({}); await flush();
  assert.equal(h.calls.length, 0); assert.equal(ui.getDisplayCity().temp, 16);
  assert.equal(h.events.filter(e => e.name === 'Weather Cache Display').length, 1);
  assert.equal(h.events.filter(e => e.name === 'Weather Load Success').length, 0);
});

for (const abortController of [true, false]) test(`deadline covers stalled body with AbortController=${abortController}`, async () => {
  const h = harness({ abortController });
  h.ctx.fetch = async () => ({ ok: true, json: () => new Promise(() => {}) });
  const result = h.data.refreshForecasts(['tokyo']);
  const rejected = assert.rejects(result, e => e.dotWeather?.type === 'timeout');
  await flush(); assert.equal(h.timers.size, 1);
  await h.advance(12000); await rejected; assert.equal(h.timers.size, 0);
});

test('timed out request cannot overwrite newer weather when its body finally arrives', async () => {
  const h = harness({ abortController: false }), body = deferred();
  const original = h.ctx.fetch;
  h.ctx.fetch = async () => ({ ok: true, json: () => body.promise });
  const first = h.data.refreshForecasts(['tokyo']);
  const rejected = assert.rejects(first, e => e.dotWeather.type === 'timeout');
  await flush(); await h.advance(12000); await rejected;
  h.ctx.fetch = original; await h.data.refreshForecasts(['tokyo']);
  body.resolve(payload(99)); await flush();
  assert.equal(h.data.cityById('tokyo').temp, 16);
});

test('slow successful response below deadline keeps one pending request and displays actual data', async () => {
  const h = harness({ stored: { cityState: { version: 1, ids: ['tokyo'], activeId: 'tokyo' } } }), headers = deferred(); let fetches = 0;
  h.ctx.fetch = () => { fetches += 1; return headers.promise; };
  const ui = h.ui(), first = ui.refreshWeather();
  await h.advance(11000);
  assert.ok(ui.weatherRequest); assert.equal(ui.weatherStatus, 'loading');
  const overlap = ui.refreshWeather({ force: true }); assert.equal(fetches, 1);
  headers.resolve({ ok: true, json: async () => payload(8, NOW + 11000) });
  await Promise.all([first, overlap]);
  assert.equal(ui.getDisplayCity().temp, 8); assert.equal(ui.weatherRequest, null);
  assert.equal(h.events.filter(e => e.name === 'Weather Load Success').length, 1);
  assert.equal(h.events.filter(e => e.name === 'Weather Load Error').length, 0);
  assert.equal(h.timers.size, 0);
});

test('header hang reaches deadline and releases UI request lock for a later retry', async () => {
  const h = harness(); h.ctx.fetch = () => new Promise(() => {});
  const ui = h.ui(), first = ui.refreshWeather();
  await h.advance(12000); await first;
  assert.equal(ui.weatherRequest, null); assert.equal(ui.weatherStatus, 'error');
  assert.equal(h.events.find(e => e.name === 'Weather Load Error').props.error_type, 'timeout');
  assert.equal(h.timers.size, 0);
});

test('HTTP status, Retry-After, malformed JSON and network failures retain honest diagnostics', async () => {
  for (const [kind, response] of [
    ['http', async () => ({ ok: false, status: 429, headers: { get: () => '120' } })],
    ['parse', async () => ({ ok: true, json: async () => { throw new SyntaxError('invalid'); } })],
    ['network', async () => { throw new TypeError('offline'); }],
  ]) {
    const h = harness(); h.ctx.fetch = response;
    await assert.rejects(h.data.refreshForecasts(['tokyo']), error => {
      assert.equal(error.dotWeather.type, kind);
      if (kind === 'http') { assert.equal(error.dotWeather.httpStatus, 429); assert.equal(error.dotWeather.retryAfterMs, 120000); }
      return true;
    });
    assert.equal(h.timers.size, 0);
  }
});

test('overlapping refreshes use one fetch; added city receives followup and user selection survives', async () => {
  const h = harness({ stored: { cityState: { version: 1, ids: ['tokyo'], activeId: 'tokyo' } } });
  const first = deferred(); let count = 0;
  const original = h.ctx.fetch;
  h.ctx.fetch = (...args) => ++count === 1 ? first.promise : original(...args);
  const ui = h.ui(); ui.context = {};
  const pending = ui.refreshWeather();
  const overlap = ui.refreshWeather({ force: true });
  ui.cityIds.push('london'); ui.refreshCities(); ui.cityIndex = 1;
  const added = ui.refreshWeather({ force: true, reason: 'city_add' });
  assert.equal(count, 1);
  first.resolve({ ok: true, json: async () => payload() });
  await Promise.all([pending, overlap, added]); await flush();
  assert.equal(count, 2); assert.equal(ui.getCity().id, 'london');
  assert.equal(h.data.cityDataState(ui.getCity()), 'live');
  assert.equal(h.events.filter(e => e.name === 'Weather Load Success').length, 2);
});

test('audio exception after manual success never produces a weather failure', async () => {
  const h = harness(); h.ctx.SSE.audio.tone = () => { throw new Error('blocked audio'); };
  const ui = h.ui(); await ui.refreshWeather({ force: true });
  assert.equal(ui.weatherStatus, 'live');
  assert.equal(h.events.filter(e => e.name === 'Weather Load Success').length, 1);
  assert.equal(h.events.filter(e => e.name === 'Weather Load Error').length, 0);
});

test('display failure is distinct, retries despite fresh fetched data, and success reports recovery', async () => {
  const h = harness(); const ui = h.ui();
  ui.world.setCity = () => { throw new Error('renderer initialization'); };
  await ui.refreshWeather();
  assert.equal(h.events.filter(e => e.name === 'Weather Load Success').length, 0);
  const error = h.events.find(e => e.name === 'Weather Load Error');
  assert.equal(error.props.stage, 'display'); assert.equal(error.props.error_type, 'display');
  assert.equal(h.data.needsRefreshForIds(ui.cityIds), false);
  ui.world.setCity = () => {};
  await ui.refreshWeather(); assert.equal(h.calls.length, 1, 'backoff prevents an immediate retry');
  await h.advance(60000); await ui.refreshWeather();
  const recovered = h.events.find(e => e.name === 'Weather Load Success');
  assert.equal(recovered.props.outcome, 'recovered'); assert.equal(recovered.props.failed_attempts, 1);
  assert.equal(ui.weatherFailures, 0);
});

test('unavailable and stale weather cannot masquerade as current measurements', async () => {
  const h = harness(); const ui = h.ui();
  let display = ui.getDisplayCity();
  assert.equal(display.description, 'UNAVAILABLE'); assert.equal(ui.formatTemperature(display.temp), '--');
  assert.equal(display.hourly.length, 0); assert.equal(display.daily.length, 0);
  await ui.refreshWeather(); await h.advance(31 * 60000);
  display = ui.getDisplayCity(); assert.match(display.description, /^CACHED /); assert.equal(display.temp, 16);
  await h.advance(12 * HOUR); assert.equal(ui.getDisplayCity().description, 'UNAVAILABLE');
});

test('online and visible restore stale data; leave removes listeners and stops event recovery', async () => {
  const h = harness(); const ui = h.ui(); ui.enter({}); await flush();
  assert.equal(h.listeners.get('online').size, 1); assert.equal(h.documentListeners.get('visibilitychange').size, 1);
  await h.advance(31 * 60000);
  h.visible('hidden'); await flush(); assert.equal(h.calls.length, 1);
  h.visible('visible'); await flush(); assert.equal(h.calls.length, 2);
  await h.advance(31 * 60000); h.emit('online'); await flush(); assert.equal(h.calls.length, 3);
  ui.leave(); assert.equal(h.listeners.get('online').size, 0); assert.equal(h.documentListeners.get('visibilitychange').size, 0);
  await h.advance(31 * 60000); h.emit('online'); h.visible('visible'); await flush(); assert.equal(h.calls.length, 3);
});

test('ordinary update loop retries after 60 seconds and preserves earlier failed attempts', async () => {
  const h = harness(), ui = h.ui(); let attempts = 0;
  const original = h.ctx.fetch;
  h.ctx.fetch = (...args) => { attempts += 1; return attempts < 3 ? Promise.reject(new TypeError('unstable network')) : original(...args); };
  ui.enter({}); await flush();
  assert.equal(attempts, 1);
  await h.advance(59999); ui.update(59.999); await flush(); assert.equal(attempts, 1);
  await h.advance(1); ui.update(0.001); await flush(); assert.equal(attempts, 2);
  await h.advance(60000); ui.update(60); await flush(); assert.equal(attempts, 3);
  assert.equal(h.events.filter(e => e.name === 'Weather Load Error').length, 2);
  const success = h.events.find(e => e.name === 'Weather Load Success');
  assert.equal(success.props.outcome, 'recovered'); assert.equal(success.props.failed_attempts, 2);
  assert.equal(ui.getDisplayCity().temp, 16);
});

test('offline initial failure recovers on online event after retry deadline, without reopening', async () => {
  const h = harness(), ui = h.ui(), original = h.ctx.fetch;
  h.ctx.navigator.onLine = false;
  h.ctx.fetch = async () => { throw new TypeError('offline'); };
  ui.enter({}); await flush();
  const error = h.events.find(e => e.name === 'Weather Load Error');
  assert.equal(error.props.online, 'no'); assert.equal(ui.getDisplayCity().description, 'UNAVAILABLE');
  await h.advance(60000);
  h.ctx.navigator.onLine = true; h.ctx.fetch = original; h.emit('online'); await flush();
  const success = h.events.find(e => e.name === 'Weather Load Success');
  assert.equal(success.props.source, 'resume'); assert.equal(success.props.outcome, 'recovered');
  assert.equal(ui.getDisplayCity().temp, 16);
  assert.equal(h.events.filter(e => e.name === 'Weather Load Error').length, 1);
});

test('fetch failure remains counted after recovery and analytics contain no location or raw exception', async () => {
  const h = harness(); const ui = h.ui(); const original = h.ctx.fetch;
  h.ctx.fetch = async () => { throw new TypeError('secret location 12.3456'); };
  await ui.refreshWeather(); assert.equal(ui.getDisplayCity().description, 'UNAVAILABLE');
  await h.advance(60000); h.ctx.fetch = original; await ui.refreshWeather();
  const error = h.events.find(e => e.name === 'Weather Load Error'), success = h.events.find(e => e.name === 'Weather Load Success');
  assert.equal(error.props.error_type, 'network'); assert.equal(success.props.outcome, 'recovered');
  assert.equal(success.props.failed_attempts, 1);
  const serialized = JSON.stringify(h.events);
  assert.doesNotMatch(serialized, /secret location|latitude|longitude|api_key|12\.3456/);
  for (const e of [error, success]) assert.equal(e.options.interactive, false);
});
