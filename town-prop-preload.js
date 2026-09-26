(function () {
  'use strict';

  var IDLE_TIMEOUT_MS = 2200;
  var FIRST_DELAY_MS = 900;
  var BETWEEN_DELAY_MS = 140;
  var scheduled = false;
  var running = false;
  var queue = [];
  var total = 0;
  var completed = 0;
  var errors = 0;

  function traceMark(name, meta, once) {
    var trace = window.YUMANIWA_LOAD_TRACE;
    if (!trace || !trace.enabled) return;

    if (once && typeof trace.markOnce === 'function') {
      trace.markOnce(name, meta);
      return;
    }

    if (typeof trace.mark === 'function') {
      trace.mark(name, meta);
    }
  }

  function getPropApi() {
    return window.YUMANIWA_STATION_PLAZA_PROPS || null;
  }

  function collectOtherTownSceneProps() {
    var maps = window.TOWN_SCENE_MAPS || {};
    var currentScene = window.currentScene || 'station_plaza';
    var seen = {};
    var result = [];
    var api = getPropApi();

    for (var sceneId in maps) {
      if (!Object.prototype.hasOwnProperty.call(maps, sceneId)) continue;
      if (sceneId === currentScene) continue;

      var def = maps[sceneId];
      var props = def && Array.isArray(def.props) ? def.props : [];

      for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        if (!prop || prop.enabled === false) continue;

        if (!api || typeof api.resolvePropSrc !== 'function') continue;

        var src = api.resolvePropSrc(prop);
        if (!src || seen[src]) continue;
        seen[src] = true;
        result.push(src);
      }
    }

    return result;
  }

  function scheduleIdle(callback, delayMs) {
    window.setTimeout(function () {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(function () {
          callback();
        }, { timeout: IDLE_TIMEOUT_MS });
      } else {
        callback();
      }
    }, Math.max(0, Number(delayMs) || 0));
  }

  function preloadPropImage(src, done) {
    var api = getPropApi();

    if (!api || typeof api.preloadPropImage !== 'function' || !src) {
      done('skipped');
      return;
    }

    // The shared loader owns Image creation, cache state and retry behavior.
    // Existing loading entries wait for their actual onload/onerror instead
    // of being counted as ready immediately.
    api.preloadPropImage(
      src,
      {
        priority: 'low',
        retryOnError: true,
        forceRetry: true
      },
      function (entry, status) {
        done(status || (entry && entry.error ? 'error' : 'loaded'));
      }
    );
  }

  function finishAll() {
    running = false;
    traceMark('town_props_deferred_ready', {
      total: total,
      completed: completed,
      errors: errors
    }, true);
  }

  function runNext() {
    if (running) return;

    if (!queue.length) {
      finishAll();
      return;
    }

    var src = queue.shift();
    running = true;

    traceMark('town_prop_deferred_item_start', {
      src: src,
      index: completed + 1,
      total: total
    });

    preloadPropImage(src, function (status) {
      completed += 1;
      if (status === 'error') errors += 1;
      running = false;

      traceMark('town_prop_deferred_item_done', {
        src: src,
        status: status,
        completed: completed,
        total: total,
        errors: errors
      });

      scheduleIdle(runNext, BETWEEN_DELAY_MS);
    });
  }

  function scheduleTownPropPreload() {
    if (scheduled) return;
    scheduled = true;

    queue = collectOtherTownSceneProps();
    total = queue.length;
    completed = 0;
    errors = 0;

    traceMark('town_props_deferred_start', {
      count: total
    }, true);

    if (!queue.length) {
      finishAll();
      return;
    }

    scheduleIdle(runNext, FIRST_DELAY_MS);
  }

  if (window.YUMANIWA_ARRIVAL_READY) {
    scheduleTownPropPreload();
  } else {
    window.addEventListener(
      'yumaniwa:arrival-ready',
      scheduleTownPropPreload,
      { once: true }
    );
  }
})();
