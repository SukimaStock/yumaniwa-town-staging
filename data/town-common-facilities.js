(function () {
  'use strict';

  var maps = window.TOWN_SCENE_MAPS || {};

  function removePlaceholderDecor(def, x, y, w, h) {
    if (!def || !Array.isArray(def.decor)) return;
    def.decor = def.decor.filter(function (item) {
      return !(item && item.x === x && item.y === y && item.w === w && item.h === h);
    });
  }

  function removeTrigger(def, triggerId) {
    if (!def || !Array.isArray(def.triggers)) return;
    def.triggers = def.triggers.filter(function (trigger) {
      return !trigger || trigger.id !== triggerId;
    });
  }

  function updateTrigger(def, triggerId, values) {
    if (!def || !Array.isArray(def.triggers)) return;

    for (var i = 0; i < def.triggers.length; i++) {
      var trigger = def.triggers[i];
      if (!trigger || trigger.id !== triggerId) continue;

      for (var key in values) {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
          trigger[key] = values[key];
        }
      }
      return;
    }
  }

  function replaceProp(def, prop) {
    if (!def) return;
    def.props = Array.isArray(def.props) ? def.props : [];
    def.props = def.props.filter(function (item) {
      return !item || item.id !== prop.id;
    });
    def.props.push(prop);
  }

  var leisure = maps.leisure_center_map;
  if (leisure) {
    replaceProp(leisure, {
      id: 'leisure_catalog_terminal',
      src: 'assets/maps/props/leisure-center/leisure-catalog-terminal.png?v=20260813-1',
      x: 10.5,
      y: 14.0,
      w: 3.0,
      h: 3.0,
      footY: 17.0,
      enabled: true,
      collision: {
        enabled: true,
        x: 0.06,
        y: 0.08,
        w: 0.88,
        h: 0.90
      },
      interaction: {
        enabled: true,
        triggerId: 'leisure_catalog',
        x: 0.04,
        y: 0.48,
        w: 0.92,
        h: 0.50
      },
      catalogKey: 'bench'
    });

    removePlaceholderDecor(leisure, 9, 16, 6, 2);
  }

  var alley = maps.tomogushi_alley_map;
  if (alley) {
    // 入口に近い、焼鳥ゆまどの向かい側の空き区画を案内所に使う。
    removeTrigger(alley, 'empty_stall');
    updateTrigger(alley, 'game_list_stall', {
      label: 'ゲーム案内所',
      actionLabel: '見る',
      text: '灯串横丁で今夜遊べるゲームをまとめて案内しています。'
    });

    // 開発モードで調整した配置値を正式採用。
    replaceProp(alley, {
      id: 'common_temporary_storefront',
      src: 'assets/maps/props/tomogushi-alley/common-temporary-storefront.png?v=20260813-1',
      x: 12.25,
      y: 12.20,
      w: 4.5,
      h: 6.7173913043,
      footY: 18.9173913043,
      enabled: true,
      collision: {
        enabled: true,
        x: 0.08,
        y: 0.06,
        w: 0.84,
        h: 0.92
      },
      interaction: {
        enabled: true,
        triggerId: 'game_list_stall',
        x: 0.06,
        y: 0.58,
        w: 0.88,
        h: 0.40
      },
      catalogKey: 'bench'
    });

    // 旧「一覧」表示と、新しい配置先の「空き」表示を両方消す。
    removePlaceholderDecor(alley, 4, 16, 4, 3);
    removePlaceholderDecor(alley, 12, 16, 5, 3);
  }

  if (window.DESTINATIONS && window.DESTINATIONS.tomogushi_game_board) {
    window.DESTINATIONS.tomogushi_game_board.title = 'ゲーム案内所';
    window.DESTINATIONS.tomogushi_game_board.description = '灯串横丁で今夜遊べるゲームをまとめた、小さな案内所。';
    window.DESTINATIONS.tomogushi_game_board.flavor = '入口近くの小さな店先に、今夜の案内札が並んでいる。';
  }
})();
