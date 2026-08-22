// ==========================================
// 湯間庭町 / 駅前広場 編集データ
// 開発モードの差分を反映した正本です。
// ==========================================

var BG_IMAGE_PATH = "assets/maps/grounds/station-plaza-ground.png";
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
    { "x": 14, "y": 7, "w": 3, "h": 3 },
    { "x": 8, "y": 8, "w": 1, "h": 8 },
    { "x": 0, "y": 9, "w": 8, "h": 5 },
    { "x": 9, "y": 9, "w": 1, "h": 7 },
    { "x": 20, "y": 9, "w": 4, "h": 5 },
    { "x": 10, "y": 10, "w": 2, "h": 14 },
    { "x": 15, "y": 10, "w": 2, "h": 6 },
    { "x": 12, "y": 11, "w": 3, "h": 5 },
    { "x": 17, "y": 11, "w": 3, "h": 3 },
    { "x": 0, "y": 14, "w": 1, "h": 1 },
    { "x": 7, "y": 14, "w": 1, "h": 2 },
    { "x": 23, "y": 14, "w": 1, "h": 1 },
    { "x": 12, "y": 16, "w": 2, "h": 8 },
    { "x": 9, "y": 23, "w": 1, "h": 1 },
    { "x": 14, "y": 23, "w": 1, "h": 1 }
];

var blockedRects = [
    { "x": 0, "y": 0, "w": 9, "h": 8 },
    { "x": 15, "y": 0, "w": 9, "h": 7 },
    { "x": 9, "y": 1, "w": 1, "h": 8 },
    { "x": 14, "y": 1, "w": 1, "h": 6 },
    { "x": 17, "y": 7, "w": 7, "h": 2 },
    { "x": 0, "y": 8, "w": 8, "h": 1 },
    { "x": 17, "y": 9, "w": 3, "h": 2 },
    { "x": 12, "y": 10, "w": 3, "h": 1 },
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
        "actionLabel": "調べる",
        "area": { "x": 12, "y": 10, "w": 3, "h": 1 },
        "type": "inspect",
        "text": "駅前広場の観光案内板。町の中心なので、ここから各マップへ散歩していけます。"
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
        "text": "湯間庭駅前広場。左に灯串横丁、右に湯窓通り、上に温泉方面、下にレジャーセンターがあります。"
    },
    {
        "id": "town_update_history_sign",
        "label": "町の更新記録",
        "actionLabel": "読む",
        "type": "menu",
        "target": "town_update_history",
        "text": "町の更新記録が、新しい順に並んでいます。",
        "area": { "x": 14, "y": 14, "w": 3, "h": 3 },
        "tapPadding": 1
    },
    {
        "id": "town_feedback_box_trigger",
        "label": "町へのおたより",
        "actionLabel": "見る",
        "type": "menu",
        "target": "town_feedback_box",
        "text": "町へのおたよりを入れられるようです。",
        "area": { "x": 14, "y": 5, "w": 3, "h": 3 },
        "tapPadding": 1
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
        "src": "assets/maps/props/station-plaza/station-notice-board.png?rev=20260822-clean",
        "x": 1.229047869493809,
        "y": 2.885805929247633,
        "w": 6.25,
        "h": 6.25,
        "footY": 9.135805929247633,
        "enabled": true,
        "catalogKey": "noticeBoard",
        "collision": { "enabled": true, "x": 0.06, "y": 0.842909090909091, "w": 0.88, "h": 0.144 },
        "interaction": { "enabled": true, "triggerId": "shinpo_board_trigger", "x": 0.05, "y": 0.64, "w": 0.95, "h": 0.36 }
    },
    {
        "id": "station_tourist_map",
        "src": "assets/maps/props/station-plaza/station-tourist-map.png?rev=20260712-square",
        "x": 11.875,
        "y": 7.375,
        "w": 3.75,
        "h": 3.75,
        "footY": 11.125,
        "enabled": true,
        "catalogKey": "touristMap",
        "collision": { "enabled": true, "x": 0.23555555555555555, "y": 0.9, "w": 0.5288888888888889, "h": 0.12 },
        "interaction": { "enabled": true, "triggerId": "tourist_map", "x": 0.23555555555555555, "y": 0.92, "w": 0.5288888888888889, "h": 0.1 }
    },
    {
        "id": "station_bench_left",
        "src": "assets/maps/props/station-plaza/station-bench.png?rev=20260822-clean",
        "x": 7.4375,
        "y": 4.8125,
        "w": 3.4375,
        "h": 3.4375,
        "footY": 8.25,
        "enabled": true,
        "catalogKey": "bench",
        "collision": { "enabled": true, "x": 0.14, "y": 0.8133333333333334, "w": 0.72, "h": 0.2 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0, "y": 0.7333333333333333, "w": 1, "h": 0.26666666666666666 }
    },
    {
        "id": "station_bench_right",
        "src": "assets/maps/props/station-plaza/station-bench.png?rev=20260822-clean",
        "x": 16.693178043514365,
        "y": 7.122228450423517,
        "w": 3.4375,
        "h": 3.4375,
        "footY": 10.559728450423517,
        "enabled": true,
        "catalogKey": "bench",
        "collision": { "enabled": true, "x": 0.14, "y": 0.8133333333333334, "w": 0.72, "h": 0.2 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0, "y": 0.7333333333333333, "w": 1, "h": 0.26666666666666666 }
    },
    {
        "id": "station_lamp_left",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 7.895833333333334,
        "y": 3.633333333333333,
        "w": 2.875,
        "h": 2.875,
        "footY": 6.508333333333333,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": { "enabled": true, "x": 0.434, "y": 0.92, "w": 0.132, "h": 0.22 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.35, "y": 0.6, "w": 0.3, "h": 0.4 }
    },
    {
        "id": "station_lamp_right",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 13.145833333333334,
        "y": 3.6875,
        "w": 2.875,
        "h": 2.875,
        "footY": 6.5625,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": { "enabled": true, "x": 0.434, "y": 0.92, "w": 0.132, "h": 0.22 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.35, "y": 0.6, "w": 0.3, "h": 0.4 }
    },
    {
        "id": "station_planter_left",
        "src": "assets/maps/props/station-plaza/station-planter.png?rev=20260822-clean",
        "x": 5.5625,
        "y": 13.1875,
        "w": 2,
        "h": 1.75,
        "footY": 14.9375,
        "enabled": true,
        "catalogKey": "planter",
        "collision": { "enabled": true, "x": 0.302, "y": 0.622, "w": 0.396, "h": 0.378 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.225, "y": 0.64, "w": 0.55, "h": 0.36 }
    },
    {
        "id": "station_planter_right",
        "src": "assets/maps/props/station-plaza/station-planter.png?rev=20260822-clean",
        "x": 16.274115826090167,
        "y": 13.22586571998007,
        "w": 2,
        "h": 1.75,
        "footY": 14.97586571998007,
        "enabled": true,
        "catalogKey": "planter",
        "collision": { "enabled": true, "x": 0.302, "y": 0.622, "w": 0.396, "h": 0.378 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.225, "y": 0.64, "w": 0.55, "h": 0.36 }
    },
    {
        "id": "station_direction_sign_candidate",
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
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 7.9375,
        "y": 14.191666666666666,
        "w": 3,
        "h": 3,
        "footY": 17.191666666666666,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": { "enabled": true, "x": 0.434, "y": 0.92, "w": 0.132, "h": 0.22 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.35, "y": 0.6, "w": 0.3, "h": 0.4 }
    },
    {
        "id": "station_streetLamp_12",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 13.0875,
        "y": 14.183333333333334,
        "w": 3,
        "h": 3,
        "footY": 17.183333333333334,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": { "enabled": true, "x": 0.434, "y": 0.92, "w": 0.132, "h": 0.22 },
        "interaction": { "enabled": false, "triggerId": "", "x": 0.35, "y": 0.6, "w": 0.3, "h": 0.4 }
    },
    {
        "id": "station_update_history_signboard",
        "src": "assets/maps/props/common/standing-signboard.png?v=20260822-clean",
        "x": 14.6875,
        "y": 14.5,
        "w": 2.25,
        "h": 1.875,
        "footY": 16.375,
        "enabled": true,
        "catalogKey": "standingSignboard",
        "collision": { "enabled": true, "x": 0.18, "y": 0.72, "w": 0.64, "h": 0.28 },
        "interaction": { "enabled": true, "triggerId": "town_update_history_sign", "x": 0.05, "y": 0.2, "w": 0.9, "h": 0.8 },
        "tap": { "enabled": true, "x": 0.05, "y": 0.12, "w": 0.9, "h": 0.88 }
    },
    {
        "id": "station_feedback_box_placeholder",
        "src": "assets/maps/props/common/town-feedback-postbox.png?v=20260822-clean",
        "x": 14.424488826145527,
        "y": 4.364474339810663,
        "w": 3.125,
        "h": 3.125,
        "footY": 7.489474339810663,
        "enabled": true,
        "catalogKey": "standingSignboard",
        "collision": { "enabled": true, "x": 0.3, "y": 0.82, "w": 0.4, "h": 0.14 },
        "interaction": { "enabled": true, "triggerId": "town_feedback_box_trigger", "x": 0.1, "y": 0.08, "w": 0.8, "h": 0.84 },
        "tap": { "enabled": true, "x": 0.08, "y": 0.06, "w": 0.84, "h": 0.88 }
    }
];
