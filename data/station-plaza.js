// ==========================================
// 湯間庭町 / 駅前広場 編集データ
// 開発モードの差分を反映した正本です。
// ==========================================

var BG_IMAGE_PATH = "assets/maps/grounds/station-plaza-ground.jpg";
var TILE_SIZE = 16;
var MAP_WIDTH = 24;
var MAP_HEIGHT = 24;
var PLAYER_START = {
    "x": 16,
    "y": 6
};

var passableRects = [
    { "x": 9, "y": 0, "w": 6, "h": 1 },
    { "x": 10, "y": 1, "w": 4, "h": 9 },
    { "x": 7, "y": 7, "w": 3, "h": 9 },
    { "x": 14, "y": 7, "w": 3, "h": 3 },
    { "x": 0, "y": 9, "w": 7, "h": 5 },
    { "x": 17, "y": 9, "w": 7, "h": 5 },
    { "x": 10, "y": 10, "w": 3, "h": 14 },
    { "x": 15, "y": 10, "w": 2, "h": 6 },
    { "x": 13, "y": 11, "w": 2, "h": 5 },
    { "x": 0, "y": 14, "w": 1, "h": 1 },
    { "x": 23, "y": 14, "w": 1, "h": 1 },
    { "x": 13, "y": 16, "w": 1, "h": 8 },
    { "x": 9, "y": 23, "w": 1, "h": 1 },
    { "x": 14, "y": 23, "w": 1, "h": 1 }
];

var blockedRects = [
    { "x": 0, "y": 0, "w": 9, "h": 7 },
    { "x": 15, "y": 0, "w": 9, "h": 7 },
    { "x": 9, "y": 1, "w": 1, "h": 6 },
    { "x": 14, "y": 1, "w": 1, "h": 6 },
    { "x": 0, "y": 7, "w": 7, "h": 2 },
    { "x": 17, "y": 7, "w": 7, "h": 2 },
    { "x": 13, "y": 10, "w": 2, "h": 1 },
    { "x": 1, "y": 14, "w": 6, "h": 10 },
    { "x": 17, "y": 14, "w": 6, "h": 10 },
    { "x": 0, "y": 15, "w": 1, "h": 9 },
    { "x": 23, "y": 15, "w": 1, "h": 9 },
    { "x": 7, "y": 16, "w": 3, "h": 7 },
    { "x": 14, "y": 16, "w": 3, "h": 7 },
    { "x": 7, "y": 23, "w": 2, "h": 1 },
    { "x": 15, "y": 23, "w": 2, "h": 1 }
];

var blockedPoints = [];

var triggers = [
    {
        "id": "tourist_map",
        "label": "観光案内板",
        "actionLabel": "調べる",
        "area": { "x": 13, "y": 10, "w": 3, "h": 1 },
        "type": "inspect",
        "target": "",
        "text": "駅前広場の観光案内板。"
    },
    {
        "id": "shinpo_board_trigger",
        "label": "掲示板を読む",
        "actionLabel": "読む",
        "area": { "x": 0, "y": 6, "w": 8, "h": 3 },
        "type": "menu",
        "target": "shinpo_board",
        "text": "広場の横長掲示板。noteの記事やお知らせを並べていく場所です。"
    },
    {
        "id": "station_notice",
        "label": "駅の案内",
        "actionLabel": "読む",
        "area": { "x": 10, "y": 16, "w": 4, "h": 3 },
        "type": "inspect",
        "target": "",
        "text": "湯間庭駅前広場。左に灯串横丁、右に湯窓通り、上に温泉方面、下に湯間庭レクリエーションロードがあり、その先が湯窓レジャーセンターです。"
    },
    {
        "id": "town_update_history_sign",
        "label": "町の更新記録",
        "actionLabel": "読む",
        "type": "menu",
        "target": "town_update_history",
        "text": "町の更新記録が、新しい順に並んでいます。",
        "area": { "x": 7, "y": 14, "w": 3, "h": 2 }
    },
    {
        "id": "town_feedback_box_trigger",
        "label": "町へのおたより",
        "actionLabel": "見る",
        "type": "menu",
        "target": "town_feedback_box",
        "text": "町へのおたよりを入れられるようです。",
        "area": { "x": 10, "y": 2, "w": 2, "h": 4 }
    }
];

var areaZones = [
    {
        "id": "station_plaza",
        "title": "駅前広場",
        "subtitle": "駅と広場がひとつになった中心地",
        "area": { "x": 0, "y": 0, "w": 24, "h": 24 }
    }
];

// マップパーツ。collision と interaction は画像内の相対比率（0〜1）です。
var stationPlazaProps = [
    {
        "id": "station_notice_board",
        "objectId": "notice_board_01",
        "src": "assets/maps/props/station-plaza/station-notice-board.png?rev=20260822-clean",
        "x": 1.5625,
        "y": 3.625,
        "w": 5.25,
        "h": 5.25,
        "footY": 8.875,
        "enabled": true,
        "catalogKey": "noticeBoard",
        "collision": { "enabled": true, "x": 0.041666666666666664, "y": 0.8363636363636365, "w": 0.9166666666666666, "h": 0.15 },
        "interaction": { "enabled": true, "triggerId": "shinpo_board_trigger", "x": 0.03125, "y": 0.625, "w": 0.9895833333333334, "h": 0.375 },
        "tap": { "enabled": true, "x": 0.18, "y": 0.68, "w": 0.64, "h": 0.18 }
    },
    {
        "id": "station_tourist_map",
        "objectId": "tourist_map_01",
        "src": "assets/maps/props/station-plaza/station-tourist-map.png?rev=20260712-square",
        "x": 12.574074074074076,
        "y": 7.125,
        "w": 4.0,
        "h": 4.0,
        "footY": 11.125,
        "enabled": true,
        "catalogKey": "touristMap",
        "collision": { "enabled": true, "x": 0.2520833333333332, "y": 0.90625, "w": 0.4958333333333333, "h": 0.1125 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.4729166666666669, "y": 0.90625, "w": 0.4958333333333333, "h": 0.09375 }
    },
    {
        "id": "station_bench_left",
        "objectId": "bench_wood_01",
        "src": "assets/maps/props/station-plaza/station-bench.png?rev=20260822-clean",
        "x": 18,
        "y": 12,
        "w": 3,
        "h": 3,
        "footY": 15,
        "enabled": true,
        "catalogKey": "bench",
        "collision": { "enabled": true, "x": 0.14, "y": 0.8133333333333334, "w": 0.72, "h": 0.2 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0, "y": 0.7333333333333333, "w": 1, "h": 0.26666666666666666 }
    },
    {
        "id": "station_bench_right",
        "objectId": "bench_wood_01",
        "src": "assets/maps/props/station-plaza/station-bench.png?rev=20260822-clean",
        "x": 16.9375,
        "y": 5.9375,
        "w": 3,
        "h": 3,
        "footY": 8.9375,
        "enabled": true,
        "catalogKey": "bench",
        "collision": { "enabled": true, "x": 0.14, "y": 0.8133333333333334, "w": 0.72, "h": 0.2 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0, "y": 0.7333333333333333, "w": 1, "h": 0.26666666666666666 }
    },
    {
        "id": "station_lamp_left",
        "objectId": "street_lamp_01",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 8.333333333333334,
        "y": 3.008333333333333,
        "w": 2.0,
        "h": 3.5,
        "footY": 6.508333333333333,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": { "enabled": true, "x": 0.405125, "y": 0.9342857142857142, "w": 0.18975, "h": 0.1807142857142857 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.284375, "y": 0.6714285714285714, "w": 0.43125, "h": 0.3285714285714286 }
    },
    {
        "id": "station_lamp_right",
        "objectId": "street_lamp_01",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 13.583333333333334,
        "y": 3.0625,
        "w": 2.0,
        "h": 3.5,
        "footY": 6.5625,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": { "enabled": true, "x": 0.405125, "y": 0.9342857142857142, "w": 0.18975, "h": 0.1807142857142857 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.284375, "y": 0.6714285714285714, "w": 0.43125, "h": 0.3285714285714286 }
    },
    {
        "id": "station_planter_left",
        "objectId": "planter_01",
        "src": "assets/maps/props/station-plaza/station-planter.png?rev=20260822-clean",
        "x": 5.5625,
        "y": 12.9375,
        "w": 2,
        "h": 2,
        "footY": 14.9375,
        "enabled": true,
        "catalogKey": "planter",
        "collision": { "enabled": true, "x": 0.302, "y": 0.66925, "w": 0.396, "h": 0.33075 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.225, "y": 0.685, "w": 0.55, "h": 0.315 }
    },
    {
        "id": "station_planter_right",
        "objectId": "planter_01",
        "src": "assets/maps/props/station-plaza/station-planter.png?rev=20260822-clean",
        "x": 16.274115826090167,
        "y": 12.97586571998007,
        "w": 2,
        "h": 2,
        "footY": 14.97586571998007,
        "enabled": true,
        "catalogKey": "planter",
        "collision": { "enabled": true, "x": 0.302, "y": 0.66925, "w": 0.396, "h": 0.33075 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.225, "y": 0.685, "w": 0.55, "h": 0.315 }
    },
    {
        "id": "station_direction_sign_candidate",
        "objectId": "station_direction_sign_01",
        "src": "assets/maps/props/station-plaza/station-direction-sign.png?rev=20260712-square",
        "x": 13.7,
        "y": 6.6,
        "w": 2.4,
        "h": 2.4,
        "footY": 9,
        "enabled": false,
        "catalogKey": "directionSign",
        "collision": { "enabled": true, "x": 0.4066666666666667, "y": 0.84, "w": 0.18666666666666668, "h": 0.2 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.20833333333333334, "y": 0.6, "w": 0.5833333333333334, "h": 0.4 }
    },
    {
        "id": "station_stationBuilding_10",
        "objectId": "station_building_01",
        "src": "assets/maps/props/station-plaza/station-building.png?rev=20260822-clean",
        "x": 1.75,
        "y": 16,
        "w": 8,
        "h": 8,
        "footY": 24,
        "enabled": true,
        "catalogKey": "stationBuilding",
        "collision": { "enabled": false, "x": 0.06086956521739131, "y": 0.7825292397660817, "w": 0.8869565217391304, "h": 0.21747076023391812 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0, "y": 0.6033333333333334, "w": 1, "h": 0.39666666666666667 }
    },
    {
        "id": "station_streetLamp_11",
        "objectId": "street_lamp_01",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 0,
        "y": 5.29749303254982,
        "w": 2.0,
        "h": 3.5,
        "footY": 8.79749303254982,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": { "enabled": true, "x": 0.401, "y": 0.9314285714285714, "w": 0.198, "h": 0.18857142857142858 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.275, "y": 0.6571428571428571, "w": 0.45, "h": 0.34285714285714286 }
    },
    {
        "id": "station_streetLamp_12",
        "objectId": "street_lamp_01",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 21.5,
        "y": 5.242885313140873,
        "w": 2.0,
        "h": 3.5,
        "footY": 8.742885313140873,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": { "enabled": true, "x": 0.401, "y": 0.9314285714285714, "w": 0.198, "h": 0.18857142857142858 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.275, "y": 0.6571428571428571, "w": 0.45, "h": 0.34285714285714286 }
    },
    {
        "id": "station_update_history_signboard",
        "objectId": "standing_sign_01",
        "src": "assets/maps/objects/signs/standing_sign_01.png?rev=20260925-standing32x32",
        "x": 7.099537037037036,
        "y": 14.26394147341852,
        "w": 2,
        "h": 2,
        "footY": 16.26394147341852,
        "enabled": true,
        "catalogKey": "standingSignboard",
        "collision": { "enabled": true, "x": 0.14, "y": 0.7375, "w": 0.72, "h": 0.2625 },
        "interaction": { "enabled": false, "triggerId": "", "x": -0.00625, "y": 0.25, "w": 1.0125, "h": 0.75 },
        "tap": { "enabled": true, "x": -0.00625, "y": 0.175, "w": 1.0125, "h": 0.825 }
    },
    {
        "id": "station_feedback_box_placeholder",
        "objectId": "post_box_01",
        "src": "assets/maps/props/common/town-feedback-postbox.png?v=20260822-clean",
        "x": 9.922174011330714,
        "y": 1.125,
        "w": 2,
        "h": 2,
        "footY": 3.125,
        "enabled": true,
        "catalogKey": "standingSignboard",
        "collision": { "enabled": true, "x": 0.3, "y": 0.82, "w": 0.4, "h": 0.14 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.1, "y": 0.08, "w": 0.8, "h": 0.84 },
        "tap": { "enabled": true, "x": 0.08, "y": 0.06, "w": 0.84, "h": 0.88 }
    }
];