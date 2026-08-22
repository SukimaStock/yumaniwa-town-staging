(function () {
  'use strict';

  var IDLE_TIMEOUT_MS = 1500;
  var FALLBACK_DELAY_MS = 350;
  var scheduled = false;

  function getSharedPropCache() {
    var api = window.YUMANIWA_STATION_PLAZA_PROPS;
    return api && api.imageCache ? api.imageCache : null;
  }

  function preloadPropImage(src) {
    var cache = getSharedPropCache();
    if (!cache || !src || cache[src]) return;

    var image = new Image();
    var entry = {
      image: image,
      loaded: false,
      error: false
    };

    image.onload = function () {
      entry.loaded = true;
      entry.error = false;
    };

    image.onerror = function () {
      entry.loaded = false;
      entry.error = true;
    };

    try {
      image.decoding = 'async';
      image.fetchPriority = 'low';
    } catch (error) {
      // 古いブラウザでは未対応でも問題ない。
    }

    cache[src] = entry;
    image.src = src;
  }

  function preloadOtherTownSceneProps() {
    var maps = window.TOWN_SCENE_MAPS || {};

    for (var sceneId in maps) {
      if (!Object.prototype.hasOwnProperty.call(maps, sceneId)) continue;
      if (sceneId === 'station_plaza') continue;

      var def = maps[sceneId];
      var props = def && Array.isArray(def.props) ? def.props : [];

      for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        if (!prop || prop.enabled === false || !prop.src) continue;
        preloadPropImage(prop.src);
      }
    }
  }

  function scheduleTownPropPreload() {
    if (scheduled) return;
    scheduled = true;

    var run = function () {
      preloadOtherTownSceneProps();
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
    } else {
      window.setTimeout(run, FALLBACK_DELAY_MS);
    }
  }

  if (document.readyState === 'complete') {
    scheduleTownPropPreload();
  } else {
    window.addEventListener('load', scheduleTownPropPreload, { once: true });
  }
})();
