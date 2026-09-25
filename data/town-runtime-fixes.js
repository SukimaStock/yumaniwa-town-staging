(function () {
  'use strict';

  var PHONE_CAMERA_ZOOM = 2.25;
  var DEFAULT_CAMERA_ZOOM = 2.5;

  function isPhoneViewport() {
    var width = window.innerWidth || 0;
    var coarse = false;

    if (window.matchMedia) {
      coarse = window.matchMedia('(pointer: coarse)').matches;
    }

    return (coarse || (navigator.maxTouchPoints || 0) > 0) && width > 0 && width <= 768;
  }

  function applyCameraZoom() {
    if (typeof window.GAME_CAMERA_ZOOM === 'undefined') return;
    window.GAME_CAMERA_ZOOM = isPhoneViewport() ? PHONE_CAMERA_ZOOM : DEFAULT_CAMERA_ZOOM;
  }

  function bindDeveloperButton() {
    var button = document.getElementById('btn-debug-toggle');
    if (!button || button.dataset.yumaniwaDevBound === '1') return;

    button.dataset.yumaniwaDevBound = '1';
    button.style.touchAction = 'manipulation';

    var lastActivation = 0;

    function activate(e) {
      var now = Date.now();

      if (now - lastActivation < 800) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      lastActivation = now;

      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (typeof window.toggleDebugMode === 'function') {
        window.toggleDebugMode();
      }
    }

    button.addEventListener('touchstart', activate, { passive: false });
    button.addEventListener('click', activate);
  }

  // マップ編集で明示された trigger.area を正本にする。
  // パーツ側 interaction は、対応する明示triggerが無い場合だけ範囲生成に使う。
  function preserveExplicitTriggerAreas() {
    var original = window.getTownPartTriggerArea;
    if (typeof original !== 'function' || original.__yumaniwaExplicitAreaPatched) return;

    function patched(part) {
      var interaction = part && part.interaction;
      var triggerId = interaction && interaction.triggerId ? String(interaction.triggerId) : '';
      var templates = window.townPartTriggerTemplates || {};
      var template = triggerId ? templates[triggerId] : null;

      if (template && template.area) {
        return {
          x: Number(template.area.x) || 0,
          y: Number(template.area.y) || 0,
          w: Math.max(1, Number(template.area.w) || 1),
          h: Math.max(1, Number(template.area.h) || 1)
        };
      }

      return original(part);
    }

    patched.__yumaniwaExplicitAreaPatched = true;
    window.getTownPartTriggerArea = patched;
  }


  function registerLeisureCenterEditorAssets() {
    var catalog = window.TOWN_PART_CATALOG;
    if (!Array.isArray(catalog)) return;

    function add(entry) {
      for (var i = 0; i < catalog.length; i++) {
        if (catalog[i] && catalog[i].key === entry.key) return;
      }
      catalog.push(entry);
    }

    add({
      key: 'leisureDirectionSign',
      label: '簡易案内サイン（レジャーセンター）',
      file: '../leisure-center/leisure-direction-sign.png',
      w: 3.5, h: 3.5,
      collision: { enabled: true, x: 0.35, y: 0.82, w: 0.30, h: 0.16 }
    });

    add({
      key: 'leisurePamphletRack',
      label: 'パンフレットラック（レジャーセンター）',
      file: '../leisure-center/leisure-pamphlet-rack.png',
      w: 3.75, h: 3.75,
      collision: { enabled: true, x: 0.15, y: 0.84, w: 0.70, h: 0.14 }
    });

    add({
      key: 'leisureBulletinBoard',
      label: '掲示スタンド（レジャーセンター）',
      file: '../leisure-center/leisure-bulletin-board.png',
      w: 3.25, h: 3.25,
      collision: { enabled: true, x: 0.08, y: 0.82, w: 0.84, h: 0.14 }
    });

    add({
      key: 'leisureGuideTerminal',
      label: '展示ガイド端末（レジャーセンター）',
      file: '../leisure-center/leisure-guide-terminal.png',
      w: 3.0, h: 3.0,
      collision: { enabled: true, x: 0.05, y: 0.76, w: 0.90, h: 0.18 }
    });
  }

  registerLeisureCenterEditorAssets();
  applyCameraZoom();
  preserveExplicitTriggerAreas();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      bindDeveloperButton();
      preserveExplicitTriggerAreas();
    });
  } else {
    bindDeveloperButton();
    preserveExplicitTriggerAreas();
  }

  window.addEventListener('load', function () {
    applyCameraZoom();
    bindDeveloperButton();
    preserveExplicitTriggerAreas();
  });

  window.addEventListener('resize', applyCameraZoom);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyCameraZoom);
  }
})();