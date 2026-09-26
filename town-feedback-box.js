// ==========================================
// 湯間庭町 / ご意見箱
// 駅前の赤いポストから Google フォームへ案内する。
// prop / trigger の存在・配置は data/station-plaza.js だけを正本とする。
// この補助scriptは destination / external action だけを提供する。
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
                { label: 'おたよりを送る', kind: 'external', url: FORM_URL },
                {
                    label: 'この箱について',
                    kind: 'message',
                    text: '町の感想やご要望、不具合の報告などを入れられます。\n\n「おたよりを送る」を選ぶと、外の入力フォームが開きます。'
                },
                { label: '駅前へ戻る', kind: 'back' }
            ]
        };
    }

    // Placement is intentionally not created or repaired here.
    // If the canonical prop/trigger is removed from station-plaza.js,
    // it must remain removed after reload.

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