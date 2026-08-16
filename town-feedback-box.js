// ==========================================
// 湯間庭町 / ご意見箱
// 駅前の赤いポストから Google フォームへ案内する。
// ==========================================
(function () {
    'use strict';

    var maps = window.TOWN_SCENE_MAPS;
    var station = maps && maps.station_plaza;
    if (!station) return;

    var TRIGGER_ID = 'town_feedback_box_trigger';
    var PROP_ID = 'station_feedback_box_placeholder';
    var DESTINATION_ID = 'town_feedback_box';
    var FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeGM7r27mkUrUPnqAio7bW7mZpF4O1Mf5x_74xZgRwl_LEUtQ/viewform';

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

    if (window.DESTINATIONS) {
        window.DESTINATIONS[DESTINATION_ID] = {
            id: DESTINATION_ID,
            title: '町へのおたより',
            subtitle: 'Feedback Box',
            description: '駅前に置かれた、小さなご意見箱。町や作品へのおたよりを入れられます。',
            flavor: '赤い箱の正面に、白い〒マークが小さく描かれている。',
            menuTitle: 'どうしますか?',
            returnScene: 'station_plaza',
            returnLabel: '駅前広場',
            items: [
                {
                    label: 'おたよりを送る',
                    kind: 'external',
                    url: FORM_URL
                },
                {
                    label: 'この箱について',
                    kind: 'message',
                    text: '町の感想やご要望、不具合の報告などを入れられます。\n\n「おたよりを送る」を選ぶと、外の入力フォームが開きます。'
                },
                {
                    label: '駅前へ戻る',
                    kind: 'back'
                }
            ]
        };
    }

    var trigger = {
        id: TRIGGER_ID,
        label: '町へのおたより',
        actionLabel: '見る',
        type: 'menu',
        target: DESTINATION_ID,
        text: '町へのおたよりを入れられるようです。',
        area: { x: 14, y: 5, w: 3, h: 3 },
        tapPadding: 1
    };

    // 開発モードで決めた場所を基準に、縦長のPNG比率を保って配置する。
    // 透明余白を含む画像の足元が、仮看板の元の接地点に合うようにしている。
    var prop = {
        id: PROP_ID,
        src: 'assets/maps/props/common/town-feedback-postbox.png?v=20260816-1',
        x: 14.79716688856392,
        y: 4.907328921943931,
        w: 1.6829268292682926,
        h: 3.0,
        footY: 7.724402092675638,
        enabled: true,
        catalogKey: 'standingSignboard',
        collision: {
            enabled: true,
            x: 0.30,
            y: 0.82,
            w: 0.40,
            h: 0.14
        },
        interaction: {
            enabled: true,
            triggerId: TRIGGER_ID,
            x: 0.10,
            y: 0.08,
            w: 0.80,
            h: 0.84
        },
        tap: {
            enabled: true,
            x: 0.08,
            y: 0.06,
            w: 0.84,
            h: 0.88
        }
    };

    station.triggers = Array.isArray(station.triggers) ? station.triggers : [];
    station.props = Array.isArray(station.props) ? station.props : [];
    upsertById(station.triggers, trigger);
    upsertById(station.props, prop);

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

    // 既存の external メニュー処理はそのまま使い、
    // このフォームを開いた時だけ計測イベントを足す。
    if (!window.__YUMANIWA_FEEDBACK_OPEN_WRAPPED__ && typeof window.open === 'function') {
        var baseWindowOpen = window.open;
        window.open = function (url, target, features) {
            if (String(url || '') === FORM_URL && typeof window.trackYumaniwaEvent === 'function') {
                window.trackYumaniwaEvent('Feedback Open', {
                    place: 'station_plaza',
                    source: 'town',
                    kind: 'google_form'
                });
            }
            return baseWindowOpen.call(window, url, target, features);
        };
        window.__YUMANIWA_FEEDBACK_OPEN_WRAPPED__ = true;
    }
})();
