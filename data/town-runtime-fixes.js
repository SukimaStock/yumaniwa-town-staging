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
          "id": "standing_signboard",
          "src": "assets/maps/props/common/standing-signboard.png",
          "x": 11,
          "y": 10,
          "w": 2.25,
          "h": 1.875,
          "footY": 11.875,
          "enabled": true,
          "collision": {
              "enabled": false,
              "x": 0,
              "y": 0,
              "w": 0.001,
              "h": 0.001
          },
          "interaction": {
              "enabled": false,
              "triggerId": "",
              "x": 0,
              "y": 0,
              "w": 0.001,
              "h": 0.001
          },
          "catalogKey": "bench"
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
        x: 9.6875, y: 1.6875, w: 4.5, h: 4.5, footY: 6.1875, enabled: true,
        collision: { enabled: false, x: 0, y: 0, w: 0.001, h: 0.001 },
        interaction: { enabled: false, triggerId: '', x: 0, y: 0, w: 0.001, h: 0.001 },
        catalogKey: 'bench'
      });
    }
  }

  // 灯串横丁は staging で確定した既存パーツの位置・サイズを実行時に適用する。
  // trigger.area は既存の広い範囲をそのまま使う。
  function applyAlleyPropScale() {
    var maps = window.TOWN_SCENE_MAPS;
    var alley = maps && maps.tomogushi_alley_map;
    if (!alley || !Array.isArray(alley.props)) return;

    if (Array.isArray(alley.blockedRects)) {
      alley.blockedRects = alley.blockedRects.filter(function (item) {
        return !(item && item.x === 13 && item.y === 16 && item.w === 3 && item.h === 2);
      });
    }

    for (var i = 0; i < alley.props.length; i++) {
      var prop = alley.props[i];
      if (!prop) continue;

      if (prop.id === 'yakitori_yumado_shop') {
        prop.x = 14.421723043422098;
        prop.y = 3.218423019431988;
        prop.w = 5;
        prop.h = 5;
        prop.footY = 8.218423019431988;
        continue;
      }

      if (prop.id === 'common_temporary_storefront') {
        prop.x = 12.9375;
        prop.y = 14.625;
        prop.w = 3.125;
        prop.h = 4.375;
        prop.footY = 19;
      }
    }
  }

  // 駅前広場と湯窓レジャーセンターの間に、
  // 湯間庭レクリエーションロードを正式な移動エリアとして追加する。
  // 右側の枝道は将来拡張用。今は画面端まで歩けるだけにしておく。
  function applyRecreationRoad() {
    var maps = window.TOWN_SCENE_MAPS;
    if (!maps) return;

    maps.recreation_road_map = {
      id: 'recreation_road_map',
      title: '湯間庭レクリエーションロード',
      subtitle: '湯窓レジャーセンター前',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'street',
      backgroundImagePath: 'assets/maps/grounds/recreation-road.png?rev=20260826-1',
      spawnPoints: {
        default: { x: 12, y: 3, dir: 'down' },
        fromPlaza: { x: 12, y: 3, dir: 'down' },
        fromLeisure: { x: 12, y: 20, dir: 'up' }
      },
      edgeWarps: [
        { side: 'up', min: 10, max: 14, target: 'station_plaza', targetSpawn: 'fromRecreation' },
        { side: 'down', min: 10, max: 15, target: 'leisure_center_map', targetSpawn: 'fromRecreation' }
      ],
      passableRects: [
        { x: 10, y: 0, w: 5, h: 8 },
        { x: 10, y: 8, w: 6, h: 1 },
        { x: 9, y: 9, w: 7, h: 2 },
        { x: 9, y: 11, w: 15, h: 2 },
        { x: 9, y: 13, w: 8, h: 3 },
        { x: 10, y: 16, w: 6, h: 8 }
      ],
      blockedRects: [
        { x: 0, y: 0, w: 10, h: 9 },
        { x: 15, y: 0, w: 9, h: 8 },
        { x: 16, y: 8, w: 8, h: 3 },
        { x: 0, y: 9, w: 9, h: 7 },
        { x: 17, y: 13, w: 7, h: 3 },
        { x: 0, y: 16, w: 10, h: 8 },
        { x: 16, y: 16, w: 8, h: 8 }
      ],
      blockedPoints: [],
      areaZones: [
        {
          id: 'recreation_road',
          title: '湯間庭レクリエーションロード',
          titleLines: ['湯間庭', 'レクリエーションロード'],
          subtitle: '駅前と湯窓レジャーセンターを結ぶ道',
          area: { x: 0, y: 0, w: 24, h: 24 }
        }
      ],
      triggers: [],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#cbbb9c' },
        { x: 10, y: 0, w: 5, h: 24, color: '#aaa79c' },
        { x: 9, y: 9, w: 8, h: 7, color: '#aaa79c' },
        { x: 16, y: 11, w: 8, h: 2, color: '#aaa79c' }
      ],
      props: [],
      decor: []
    };

    var station = maps.station_plaza;
    if (station) {
      station.spawnPoints = station.spawnPoints || {};
      station.spawnPoints.fromRecreation = { x: 12, y: 20, dir: 'up' };
      station.edgeWarps = Array.isArray(station.edgeWarps) ? station.edgeWarps : [];

      for (var i = 0; i < station.edgeWarps.length; i++) {
        var stationWarp = station.edgeWarps[i];
        if (stationWarp && stationWarp.side === 'down') {
          stationWarp.target = 'recreation_road_map';
          stationWarp.targetSpawn = 'fromPlaza';
          stationWarp.min = 9;
          stationWarp.max = 14;
        }
      }

      if (Array.isArray(station.triggers)) {
        for (var t = 0; t < station.triggers.length; t++) {
          var stationTrigger = station.triggers[t];
          if (stationTrigger && stationTrigger.id === 'station_notice') {
            stationTrigger.text = '湯間庭駅前広場。左に灯串横丁、右に湯窓通り、上に温泉方面、下に湯間庭レクリエーションロードがあり、その先が湯窓レジャーセンターです。';
          }
        }
      }
    }

    if (Array.isArray(window.triggers)) {
      for (var w = 0; w < window.triggers.length; w++) {
        var sourceTrigger = window.triggers[w];
        if (sourceTrigger && sourceTrigger.id === 'station_notice') {
          sourceTrigger.text = '湯間庭駅前広場。左に灯串横丁、右に湯窓通り、上に温泉方面、下に湯間庭レクリエーションロードがあり、その先が湯窓レジャーセンターです。';
        }
      }
    }

    var leisure = maps.leisure_center_map;
    if (leisure) {
      leisure.spawnPoints = leisure.spawnPoints || {};
      leisure.spawnPoints.fromRecreation = { x: 12, y: 3, dir: 'down' };
      leisure.edgeWarps = Array.isArray(leisure.edgeWarps) ? leisure.edgeWarps : [];

      for (var j = 0; j < leisure.edgeWarps.length; j++) {
        var leisureWarp = leisure.edgeWarps[j];
        if (leisureWarp && leisureWarp.side === 'up') {
          leisureWarp.target = 'recreation_road_map';
          leisureWarp.targetSpawn = 'fromLeisure';
          leisureWarp.min = 9;
          leisureWarp.max = 14;
        }
      }
    }

    // main.js は駅前広場を先に active scene として保持しているため、
    // 読み込み済みの実行中データにも南ワープを反映する。
    if (window.activeTownSceneDef && window.activeTownSceneDef.id === 'station_plaza' && station) {
      window.activeTownSceneDef.spawnPoints = station.spawnPoints;
      window.activeTownSceneDef.edgeWarps = station.edgeWarps;
      window.activeTownSceneDef.triggers = station.triggers;
    }
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
  applyCommonSignAssets();
  applyAlleyPropScale();
  applyRecreationRoad();
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