// ==========================================
// 湯間庭町 / 更新履歴の立て看板
// 既存の TOWN_UPDATES を駅前の小さな看板から読めるようにする。
// ==========================================
(function () {
    'use strict';

    var maps = window.TOWN_SCENE_MAPS;
    var station = maps && maps.station_plaza;
    if (!station) return;

    var TRIGGER_ID = 'town_update_history_sign';
    var PROP_ID = 'station_update_history_signboard';

    function hasId(items, id) {
        if (!Array.isArray(items)) return false;
        for (var i = 0; i < items.length; i++) {
            if (items[i] && items[i].id === id) return true;
        }
        return false;
    }

    function addOnce(items, item) {
        if (!Array.isArray(items) || !item || !item.id || hasId(items, item.id)) return;
        items.push(item);
    }

    var historyText = (typeof window.buildTownUpdateHistoryText === 'function')
        ? window.buildTownUpdateHistoryText(6)
        : '町の更新記録は、いま整理中です。';

    var trigger = {
        id: TRIGGER_ID,
        label: '町の更新記録',
        actionLabel: '読む',
        type: 'inspect',
        text: historyText,
        area: { x: 17, y: 11, w: 3, h: 3 },
        tapPadding: 1
    };

    // 駅前右側の端へ仮配置。中央の歩行ルートは塞がない。
    var prop = {
        id: PROP_ID,
        src: 'assets/maps/props/common/standing-signboard.png?v=20260816-1',
        x: 17.6,
        y: 11.4,
        w: 2.4,
        h: 3.2,
        footY: 14.6,
        enabled: true,
        catalogKey: 'standingSignboard',
        collision: {
            enabled: true,
            x: 0.18,
            y: 0.72,
            w: 0.64,
            h: 0.28
        },
        interaction: {
            enabled: true,
            triggerId: TRIGGER_ID,
            x: 0.05,
            y: 0.20,
            w: 0.90,
            h: 0.80
        },
        tap: {
            enabled: true,
            x: 0.05,
            y: 0.12,
            w: 0.90,
            h: 0.88
        }
    };

    station.triggers = Array.isArray(station.triggers) ? station.triggers : [];
    station.props = Array.isArray(station.props) ? station.props : [];
    addOnce(station.triggers, trigger);
    addOnce(station.props, prop);

    // 初回表示中の駅前にも即時反映する。
    if (Array.isArray(window.triggers)) addOnce(window.triggers, trigger);
    if (Array.isArray(window.stationPlazaProps)) addOnce(window.stationPlazaProps, prop);

    if (window.activeTownSceneDef && window.currentScene === 'station_plaza') {
        window.activeTownSceneDef.triggers = Array.isArray(window.activeTownSceneDef.triggers)
            ? window.activeTownSceneDef.triggers
            : [];
        window.activeTownSceneDef.props = Array.isArray(window.activeTownSceneDef.props)
            ? window.activeTownSceneDef.props
            : [];
        addOnce(window.activeTownSceneDef.triggers, trigger);
        addOnce(window.activeTownSceneDef.props, prop);
    }
})();
