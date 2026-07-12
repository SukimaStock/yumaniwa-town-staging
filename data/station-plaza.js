// ==========================================
// 湯間庭町 / 駅前広場 編集データ
// 開発モードの「書き出す」で生成した完全版です。
// この内容で data/station-plaza.js を丸ごと置き換えてください。
// ==========================================

var BG_IMAGE_PATH = "assets/maps/grounds/station-plaza-ground.png";
var TILE_SIZE = 16;
var MAP_WIDTH = 24;
var MAP_HEIGHT = 24;
var PLAYER_START = {
    "x": 8,
    "y": 10
};

var passableRects = [
    {
        "x": 9,
        "y": 0,
        "w": 6,
        "h": 1
    },
    {
        "x": 10,
        "y": 1,
        "w": 4,
        "h": 8
    },
    {
        "x": 14,
        "y": 7,
        "w": 2,
        "h": 9
    },
    {
        "x": 7,
        "y": 8,
        "w": 3,
        "h": 8
    },
    {
        "x": 0,
        "y": 9,
        "w": 7,
        "h": 5
    },
    {
        "x": 10,
        "y": 9,
        "w": 1,
        "h": 2
    },
    {
        "x": 13,
        "y": 9,
        "w": 1,
        "h": 15
    },
    {
        "x": 16,
        "y": 9,
        "w": 1,
        "h": 5
    },
    {
        "x": 20,
        "y": 9,
        "w": 4,
        "h": 5
    },
    {
        "x": 11,
        "y": 10,
        "w": 2,
        "h": 1
    },
    {
        "x": 17,
        "y": 10,
        "w": 3,
        "h": 4
    },
    {
        "x": 10,
        "y": 12,
        "w": 3,
        "h": 12
    },
    {
        "x": 0,
        "y": 14,
        "w": 1,
        "h": 1
    },
    {
        "x": 23,
        "y": 14,
        "w": 1,
        "h": 1
    },
    {
        "x": 9,
        "y": 23,
        "w": 1,
        "h": 1
    },
    {
        "x": 14,
        "y": 23,
        "w": 1,
        "h": 1
    }
];

var blockedRects = [
    {
        "x": 0,
        "y": 0,
        "w": 9,
        "h": 8
    },
    {
        "x": 15,
        "y": 0,
        "w": 9,
        "h": 7
    },
    {
        "x": 9,
        "y": 1,
        "w": 1,
        "h": 7
    },
    {
        "x": 14,
        "y": 1,
        "w": 1,
        "h": 6
    },
    {
        "x": 16,
        "y": 7,
        "w": 8,
        "h": 2
    },
    {
        "x": 0,
        "y": 8,
        "w": 7,
        "h": 1
    },
    {
        "x": 17,
        "y": 9,
        "w": 3,
        "h": 1
    },
    {
        "x": 10,
        "y": 11,
        "w": 3,
        "h": 1
    },
    {
        "x": 1,
        "y": 14,
        "w": 6,
        "h": 10
    },
    {
        "x": 16,
        "y": 14,
        "w": 7,
        "h": 10
    },
    {
        "x": 0,
        "y": 15,
        "w": 1,
        "h": 9
    },
    {
        "x": 23,
        "y": 15,
        "w": 1,
        "h": 9
    },
    {
        "x": 7,
        "y": 16,
        "w": 3,
        "h": 7
    },
    {
        "x": 14,
        "y": 16,
        "w": 2,
        "h": 7
    },
    {
        "x": 7,
        "y": 23,
        "w": 2,
        "h": 1
    }
];

var blockedPoints = [
    {
        "x": 15,
        "y": 23
    }
];

var triggers = [
    {
        "id": "station_notice",
        "label": "駅の案内",
        "actionLabel": "読む",
        "area": {
            "x": 9,
            "y": 18,
            "w": 5,
            "h": 5
        },
        "type": "inspect",
        "target": "",
        "text": "湯間庭駅前広場。左に灯串横丁、右に湯窓通り、上に温泉方面、下にレジャーセンターがあります。"
    },
    {
        "id": "tourist_map",
        "label": "観光案内板",
        "actionLabel": "調べる",
        "area": {
            "x": 11,
            "y": 11,
            "w": 3,
            "h": 1
        },
        "type": "inspect",
        "text": "駅前広場の観光案内板。町の中心なので、ここから各マップへ散歩していけます。"
    },
    {
        "id": "shinpo_board_trigger",
        "label": "掲示板を読む",
        "actionLabel": "読む",
        "area": {
            "x": 0,
            "y": 6,
            "w": 8,
            "h": 3
        },
        "type": "menu",
        "target": "shinpo_board",
        "text": "広場の横長掲示板。noteの記事やお知らせを並べていく場所です。"
    }
];

var areaZones = [
    {
        "id": "station_plaza",
        "title": "駅前広場",
        "subtitle": "駅と広場がひとつになった中心地",
        "area": {
            "x": 0,
            "y": 0,
            "w": 24,
            "h": 24
        }
    }
];

// マップパーツ。collision と interaction は画像内の相対比率(0〜1)です。
var stationPlazaProps = [
    {
        "id": "station_notice_board",
        "src": "assets/maps/props/station-plaza/station-notice-board.png?rev=20260712-square",
        "x": 0.375,
        "y": 1.4375,
        "w": 7.5,
        "h": 7.5,
        "footY": 8.9375,
        "enabled": true,
        "catalogKey": "noticeBoard",
        "collision": {
            "enabled": true,
            "x": 0.06,
            "y": 0.842909090909091,
            "w": 0.88,
            "h": 0.144
        },
        "interaction": {
            "enabled": true,
            "triggerId": "shinpo_board_trigger",
            "x": 0.05,
            "y": 0.64,
            "w": 0.95,
            "h": 0.36
        }
    },
    {
        "id": "station_tourist_map",
        "src": "assets/maps/props/station-plaza/station-tourist-map.png?rev=20260712-square",
        "x": 10.345459641255607,
        "y": 8.039125560538118,
        "w": 3.6,
        "h": 3.6,
        "footY": 11.639125560538117,
        "enabled": true,
        "catalogKey": "touristMap",
        "collision": {
            "enabled": true,
            "x": 0.23555555555555555,
            "y": 0.9,
            "w": 0.5288888888888889,
            "h": 0.12
        },
        "interaction": {
            "enabled": true,
            "triggerId": "tourist_map",
            "x": 0.23555555555555555,
            "y": 0.92,
            "w": 0.5288888888888889,
            "h": 0.1
        }
    },
    {
        "id": "station_bench_left",
        "src": "assets/maps/props/station-plaza/station-bench.png?rev=20260712-square",
        "x": 7.533333333333333,
        "y": 5.958333333333334,
        "w": 2.25,
        "h": 2.25,
        "footY": 8.208333333333334,
        "enabled": true,
        "catalogKey": "bench",
        "collision": {
            "enabled": true,
            "x": 0.14,
            "y": 0.8133333333333334,
            "w": 0.72,
            "h": 0.2
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0,
            "y": 0.7333333333333333,
            "w": 1,
            "h": 0.26666666666666666
        }
    },
    {
        "id": "station_bench_right",
        "src": "assets/maps/props/station-plaza/station-bench.png?rev=20260712-square",
        "x": 17.34583333333333,
        "y": 7.929166666666667,
        "w": 2.25,
        "h": 2.25,
        "footY": 10.179166666666667,
        "enabled": true,
        "catalogKey": "bench",
        "collision": {
            "enabled": true,
            "x": 0.14,
            "y": 0.8133333333333334,
            "w": 0.72,
            "h": 0.2
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0,
            "y": 0.7333333333333333,
            "w": 1,
            "h": 0.26666666666666666
        }
    },
    {
        "id": "station_lamp_left",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 7.688452914798206,
        "y": 3.3695627802690575,
        "w": 3.4,
        "h": 3.4,
        "footY": 6.769562780269057,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": {
            "enabled": true,
            "x": 0.434,
            "y": 0.92,
            "w": 0.132,
            "h": 0.22
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0.35,
            "y": 0.6,
            "w": 0.3,
            "h": 0.4
        }
    },
    {
        "id": "station_lamp_right",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 12.928325859491775,
        "y": 3.326008968609866,
        "w": 3.4,
        "h": 3.4,
        "footY": 6.726008968609866,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": {
            "enabled": true,
            "x": 0.434,
            "y": 0.92,
            "w": 0.132,
            "h": 0.22
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0.35,
            "y": 0.6,
            "w": 0.3,
            "h": 0.4
        }
    },
    {
        "id": "station_planter_left",
        "src": "assets/maps/props/station-plaza/station-planter.png?rev=20260712-square-32px",
        "x": 5.6875,
        "y": 13.1875,
        "w": 1.75,
        "h": 1.75,
        "footY": 14.9375,
        "enabled": true,
        "catalogKey": "planter",
        "collision": {
            "enabled": true,
            "x": 0.302,
            "y": 0.622,
            "w": 0.396,
            "h": 0.378
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0.225,
            "y": 0.64,
            "w": 0.55,
            "h": 0.36
        }
    },
    {
        "id": "station_planter_right",
        "src": "assets/maps/props/station-plaza/station-planter.png?rev=20260712-square-32px",
        "x": 16.3125,
        "y": 13.1875,
        "w": 1.75,
        "h": 1.75,
        "footY": 14.9375,
        "enabled": true,
        "catalogKey": "planter",
        "collision": {
            "enabled": true,
            "x": 0.302,
            "y": 0.622,
            "w": 0.396,
            "h": 0.378
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0.225,
            "y": 0.64,
            "w": 0.55,
            "h": 0.36
        }
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
        "collision": {
            "enabled": true,
            "x": 0.4066666666666667,
            "y": 0.84,
            "w": 0.18666666666666668,
            "h": 0.2
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0.20833333333333334,
            "y": 0.6,
            "w": 0.5833333333333334,
            "h": 0.4
        }
    },
    {
        "id": "station_stationBuilding_10",
        "src": "assets/maps/props/station-plaza/station-building.png?rev=20260712-square",
        "x": 2.116666666666667,
        "y": 16.5,
        "w": 7.5,
        "h": 7.5,
        "footY": 24,
        "enabled": true,
        "catalogKey": "stationBuilding",
        "collision": {
            "enabled": false,
            "x": 0.06086956521739131,
            "y": 0.7825292397660817,
            "w": 0.8869565217391304,
            "h": 0.21747076023391812
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0,
            "y": 0.6033333333333334,
            "w": 1,
            "h": 0.39666666666666667
        }
    },
    {
        "id": "station_streetLamp_11",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 7.62916666666667,
        "y": 13.999999999999998,
        "w": 3.4,
        "h": 3.4,
        "footY": 17.4,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": {
            "enabled": true,
            "x": 0.434,
            "y": 0.92,
            "w": 0.132,
            "h": 0.22
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0.35,
            "y": 0.6,
            "w": 0.3,
            "h": 0.4
        }
    },
    {
        "id": "station_streetLamp_12",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260712-square",
        "x": 12.920833333333334,
        "y": 13.974999999999994,
        "w": 3.4,
        "h": 3.4,
        "footY": 17.374999999999993,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": {
            "enabled": true,
            "x": 0.434,
            "y": 0.92,
            "w": 0.132,
            "h": 0.22
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0.35,
            "y": 0.6,
            "w": 0.3,
            "h": 0.4
        }
    }
];
