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

  function traceImageStart(src) {
    var trace = window.YUMANIWA_LOAD_TRACE;
    if (trace && trace.enabled && typeof trace.imageStart === 'function') {
      trace.imageStart('deferred_prop', src);
    }
  }

  function traceImageDone(src, status) {
    var trace = window.YUMANIWA_LOAD_TRACE;
    if (trace && trace.enabled && typeof trace.imageDone === 'function') {
      trace.imageDone('deferred_prop', src, status);
    }
  }

  function getSharedPropCache() {
    var api = window.YUMANIWA_STATION_PLAZA_PROPS;
    return api && api.imageCache ? api.imageCache : null;
  }

  function collectOtherTownSceneProps() {
    var maps = window.TOWN_SCENE_MAPS || {};
    var currentScene = window.currentScene || 'station_plaza';
    var seen = {};
    var result = [];

    for (var sceneId in maps) {
      if (!Object.prototype.hasOwnProperty.call(maps, sceneId)) continue;
      if (sceneId === currentScene) continue;

      var def = maps[sceneId];
      var props = def && Array.isArray(def.props) ? def.props : [];

      for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        if (!prop || prop.enabled === false) continue;

        var src = prop.src || '';
        var library = window.YUMANIWA_WORLD_OBJECTS;

        if (
          prop.objectId &&
          library &&
          typeof library.resolveSrc === 'function'
        ) {
          src = library.resolveSrc(prop.objectId, src);
        }

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
    var cache = getSharedPropCache();

    if (!cache || !src) {
      done('skipped');
      return;
    }

    if (cache[src]) {
      done(cache[src].error ? 'error' : (cache[src].loaded ? 'cached' : 'existing'));
      return;
    }

    var image = new Image();
    var entry = {
      image: image,
      loaded: false,
      error: false
    };

    image.onload = function () {
      entry.loaded = true;
      entry.error = false;
      traceImageDone(src, 'loaded');
      done('loaded');
    };

    image.onerror = function () {
      entry.loaded = false;
      entry.error = true;
      traceImageDone(src, 'error');
      done('error');
    };

    try {
      image.decoding = 'async';
      image.fetchPriority = 'low';
    } catch (error) {
      // 古いブラウザでは未対応でも問題ない。
    }

    cache[src] = entry;
    traceImageStart(src);
    image.src = src;
  }

  function runNext() {
    if (running) return;

    if (!queue.length) {
      traceMark('other_props_deferred_ready', {
        count: completed
      }, true);
      return;
    }

    var src = queue.shift();
    running = true;

    traceMark('other_props_deferred_item_start', {
      src: src,
      index: completed + 1,
      total: total
    });

    preloadPropImage(src, function (status) {
      completed += 1;
      running = false;

      traceMark('other_props_deferred_item_done', {
        src: src,
        status: status,
        completed: completed,
        total: total
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

    traceMark('other_props_deferred_queued', {
      count: total
    }, true);

    traceMark('other_props_deferred_start', {
      count: total
    }, true);

    if (!queue.length) {
      traceMark('other_props_deferred_ready', { count: 0 }, true);
      return;
    }

    scheduleIdle(runNext, FIRST_DELAY_MS);
  }

  if (window.YUMANIWA_ARRIVAL_READY) {
    scheduleTownPropPreload();
  } else {
    window.addEventListener('yumaniwa:arrival-ready', scheduleTownPropPreload, { once: true });
  }
})();
