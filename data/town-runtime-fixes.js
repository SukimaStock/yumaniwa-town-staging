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

  // 共通看板アセットは、既存の当たり判定・triggerとは分離して見た目だけ差し替える。
  // 完成PNGを同じパスへ置けば、町側の判定を触らず更新できる。
  function applyCommonSignAssets() {
    var maps = window.TOWN_SCENE_MAPS;
    if (!maps) return;

    function removeDecor(scene, matcher) {
      if (!scene || !Array.isArray(scene.decor)) return;
      scene.decor = scene.decor.filter(function (item) {
        return !matcher(item || {});
      });
    }

    function upsertProp(scene, prop) {
      if (!scene) return;
      if (!Array.isArray(scene.props)) scene.props = [];

      for (var i = 0; i < scene.props.length; i++) {
        if (scene.props[i] && scene.props[i].id === prop.id) {
          scene.props[i] = prop;
          return;
        }
      }

      scene.props.push(prop);
    }

    var street = maps.yumado_street_map;
    if (street) {
      removeDecor(street, function (item) {
        return item.x === 11 && item.y === 10 && item.w === 2 && item.h === 2 && item.label === '札';
      });

      upsertProp(street, {
        id: 'standing_signboard',
        src: 'assets/maps/props/common/standing-signboard.png',
        x: 11, y: 10, w: 2, h: 2, footY: 12, enabled: true,
        collision: { enabled: false, x: 0, y: 0, w: 0, h: 0 },
        interaction: { enabled: false, triggerId: '', x: 0, y: 0, w: 0, h: 0 },
        catalogKey: 'bench'
      });
    }

    var onsen = maps.onsen_slope_map;
    if (onsen) {
      removeDecor(onsen, function (item) {
        return item.x === 6 && item.y === 3 && item.w === 12 && item.h === 3 && item.label === '工事中';
      });

      upsertProp(onsen, {
        id: 'no_entry_sign',
        src: 'assets/maps/props/common/no-entry-sign.png',
        x: 10, y: 2, w: 4, h: 4, footY: 6, enabled: true,
        collision: { enabled: false, x: 0, y: 0, w: 0, h: 0 },
        interaction: { enabled: false, triggerId: '', x: 0, y: 0, w: 0, h: 0 },
        catalogKey: 'bench'
      });
    }
  }

  // ゲーム案内所は、駅前広場の主人公を基準にした小型案内所サイズへ揃える。
  // trigger.area は既存の広い範囲をそのまま使う。
  function applyGuidePropScale() {
    var maps = window.TOWN_SCENE_MAPS;
    var alley = maps && maps.tomogushi_alley_map;
    if (!alley || !Array.isArray(alley.props)) return;

    for (var i = 0; i < alley.props.length; i++) {
      var prop = alley.props[i];
      if (!prop || prop.id !== 'common_temporary_storefront') continue;

      prop.x = 13.0;
      prop.y = 14.7;
      prop.w = 3.0;
      prop.h = 4.2;
      prop.footY = 18.9;
      break;
    }
  }

  applyCommonSignAssets();
  applyGuidePropScale();
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
