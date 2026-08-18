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
    var DESTINATION_ID = 'town_update_history';

    function upsertById(items, item) {
        if (!Array.isArray(items) || !item || !item.id) return;
        for (var i = 0; i < items.length; i++) {
            if (items[i] && items[i].id === item.id) {
                items[i] = item;
                return;
            }
        }
        items.push(item);
    }

    function formatDate(date) {
        return String(date || '').replace(/-/g, '.');
    }

    function buildUpdateMenuItems(limit) {
        var maxCount = typeof limit === 'number' ? limit : 6;
        var source = Array.isArray(window.TOWN_UPDATES) ? window.TOWN_UPDATES : [];
        var items = [];

        for (var i = 0; i < source.length && items.length < maxCount; i++) {
            var entry = source[i] || {};
            items.push({
                label: formatDate(entry.date) + '　' + (entry.title || '更新'),
                kind: 'message',
                text: entry.body || '記録だけが残っています。'
            });
        }

        if (items.length === 0) {
            items.push({
                label: 'まだ記録はありません',
                kind: 'message',
                text: '町は、静かに次の準備をしています。'
            });
        }

        items.push({ label: '駅前へ戻る', kind: 'back' });
        return items;
    }

    if (window.DESTINATIONS) {
        window.DESTINATIONS[DESTINATION_ID] = {
            id: DESTINATION_ID,
            title: '町の更新記録',
            subtitle: 'Town Updates',
            description: '駅前の小さな立て看板。町で起きたことが、新しい順に書き足されている。',
            flavor: '紙の端に、少しだけ雨染みが残っている。',
            menuTitle: 'どの記録を読みますか?',
            returnScene: 'station_plaza',
            returnLabel: '駅前広場',
            items: buildUpdateMenuItems(6)
        };
    }

    var trigger = {
        id: TRIGGER_ID,
        label: '町の更新記録',
        actionLabel: '読む',
        type: 'menu',
        target: DESTINATION_ID,
        text: '町の更新記録が、新しい順に並んでいます。',
        area: { x: 14, y: 14, w: 3, h: 3 },
        tapPadding: 1
    };

    // 開発モードで調整した位置・大きさをそのまま反映する。
    var prop = {
        id: PROP_ID,
        src: 'assets/maps/props/common/standing-signboard.png?v=20260816-1',
        x: 14.375,
        y: 13.9375,
        w: 2.625,
        h: 2.625,
        footY: 16.5625,
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
    upsertById(station.triggers, trigger);
    upsertById(station.props, prop);

    // 初回表示中の駅前にも即時反映する。
    if (Array.isArray(window.triggers)) upsertById(window.triggers, trigger);
    if (Array.isArray(window.stationPlazaProps)) upsertById(window.stationPlazaProps, prop);

    if (window.activeTownSceneDef && window.currentScene === 'station_plaza') {
        window.activeTownSceneDef.triggers = Array.isArray(window.activeTownSceneDef.triggers)
            ? window.activeTownSceneDef.triggers
            : [];
        window.activeTownSceneDef.props = Array.isArray(window.activeTownSceneDef.props)
            ? window.activeTownSceneDef.props
            : [];
        upsertById(window.activeTownSceneDef.triggers, trigger);
        upsertById(window.activeTownSceneDef.props, prop);
    }
})();
