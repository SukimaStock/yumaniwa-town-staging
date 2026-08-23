// ==========================================
// 湯間庭町 / staging trigger layout 2026-08-23
// 開発モードで確定した「調べる場所」を、パーツ本体から独立して保持する。
// ==========================================
(function () {
    'use strict';

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function findById(items, id) {
        var list = Array.isArray(items) ? items : [];
        for (var i = 0; i < list.length; i++) {
            if (list[i] && String(list[i].id) === String(id)) return list[i];
        }
        return null;
    }

    function removeById(items, id) {
        if (!Array.isArray(items)) return;
        for (var i = items.length - 1; i >= 0; i--) {
            if (items[i] && String(items[i].id) === String(id)) items.splice(i, 1);
        }
    }

    function upsertById(items, item) {
        if (!Array.isArray(items) || !item || !item.id) return;
        for (var i = 0; i < items.length; i++) {
            if (items[i] && String(items[i].id) === String(item.id)) {
                items[i] = clone(item);
                return;
            }
        }
        items.push(clone(item));
    }

    function disableLinkedInteraction(part, fallback) {
        if (!part) return;
        var current = part.interaction || fallback || {};
        part.interaction = {
            enabled: false,
            triggerId: '',
            x: Number(current.x) || 0,
            y: Number(current.y) || 0,
            w: Math.max(0.001, Number(current.w) || 0.001),
            h: Math.max(0.001, Number(current.h) || 0.001)
        };
        // 旧 linked-trigger 方式の絶対範囲が残っている場合も消す。
        delete part.triggerArea;
    }

    function applyLatestTriggerLayout() {
        var maps = window.TOWN_SCENE_MAPS;
        var station = maps && maps.station_plaza;
        if (!station) return;

        station.props = Array.isArray(station.props)
            ? station.props
            : (Array.isArray(window.stationPlazaProps) ? window.stationPlazaProps : []);
        station.triggers = Array.isArray(station.triggers) ? station.triggers : [];

        var props = station.props;
        var touristMap = findById(props, 'station_tourist_map');
        var updateSign = findById(props, 'station_update_history_signboard');
        var feedbackBox = findById(props, 'station_feedback_box_placeholder');

        disableLinkedInteraction(touristMap, {
            x: 0.47111111111111115,
            y: 0.9,
            w: 0.5288888888888889,
            h: 0.1
        });
        disableLinkedInteraction(updateSign, {
            x: 0.05,
            y: 0.2,
            w: 0.9,
            h: 0.8
        });
        disableLinkedInteraction(feedbackBox, {
            x: 0.1,
            y: 0.08,
            w: 0.8,
            h: 0.84
        });

        // 開発モードが採番した一時IDは正本には持ち込まず、
        // 既存の意味のあるIDを保ったまま新しい範囲だけ反映する。
        var finalTriggers = [
            {
                id: 'tourist_map',
                label: '観光案内板',
                actionLabel: '調べる',
                area: { x: 13, y: 10, w: 3, h: 1 },
                type: 'inspect',
                target: '',
                text: '駅前広場の観光案内板。'
            },
            {
                id: 'town_update_history_sign',
                label: '町の更新記録',
                actionLabel: '読む',
                area: { x: 7, y: 14, w: 3, h: 2 },
                type: 'menu',
                target: 'town_update_history',
                text: '町の更新記録が、新しい順に並んでいます。'
            },
            {
                id: 'town_feedback_box_trigger',
                label: '町へのおたより',
                actionLabel: '見る',
                area: { x: 10, y: 2, w: 2, h: 4 },
                type: 'menu',
                target: 'town_feedback_box',
                text: '町へのおたよりを入れられるようです。'
            }
        ];

        removeById(station.triggers, 'station_plaza_trigger_1');
        removeById(station.triggers, 'station_plaza_trigger_2');
        removeById(station.triggers, 'station_plaza_trigger_3');
        for (var t = 0; t < finalTriggers.length; t++) upsertById(station.triggers, finalTriggers[t]);

        if (Array.isArray(window.triggers)) {
            removeById(window.triggers, 'station_plaza_trigger_1');
            removeById(window.triggers, 'station_plaza_trigger_2');
            removeById(window.triggers, 'station_plaza_trigger_3');
            for (var w = 0; w < finalTriggers.length; w++) upsertById(window.triggers, finalTriggers[w]);
        }

        if (window.activeTownSceneDef && window.currentScene === 'station_plaza') {
            window.activeTownSceneDef.props = props;
            window.activeTownSceneDef.triggers = clone(station.triggers);
        }

        window.stationPlazaProps = props;
        if (window.YUMANIWA_STATION_PLAZA_PROPS) {
            window.YUMANIWA_STATION_PLAZA_PROPS.props = props;
        }
    }

    applyLatestTriggerLayout();
    window.YUMANIWA_STAGING_TRIGGER_LAYOUT_20260823 = {
        apply: applyLatestTriggerLayout
    };
})();
