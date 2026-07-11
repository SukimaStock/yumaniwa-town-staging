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
    "x": 15,
    "y": 8
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
            "h": 2
        },
        "type": "inspect",
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
            "x": 1,
            "y": 7,
            "w": 6,
            "h": 2
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
        "src": "assets/maps/props/station-plaza/station-notice-board.png?rev=20260710-2",
        "x": 0.75,
        "y": 5.4,
        "w": 5.5,
        "h": 3.6,
        "footY": 9,
        "enabled": true,
        "catalogKey": "noticeBoard",
        "collision": {
            "enabled": true,
            "x": 0.06,
            "y": 0.76,
            "w": 0.88,
            "h": 0.22
        },
        "interaction": {
            "enabled": true,
            "triggerId": "shinpo_board_trigger",
            "x": 0.05,
            "y": 0.45,
            "w": 0.95,
            "h": 0.55
        }
    },
    {
        "id": "station_tourist_map",
        "src": "assets/maps/props/station-plaza/station-tourist-map.png?rev=20260710-2",
        "x": 10.445459641255606,
        "y": 8.039125560538118,
        "w": 3.4,
        "h": 3.6,
        "footY": 11.639125560538117,
        "enabled": true,
        "catalogKey": "touristMap",
        "collision": {
            "enabled": true,
            "x": 0.22,
            "y": 0.9,
            "w": 0.56,
            "h": 0.12
        },
        "interaction": {
            "enabled": true,
            "triggerId": "tourist_map",
            "x": 0.22,
            "y": 0.92,
            "w": 0.56,
            "h": 0.1
        }
    },
    {
        "id": "station_bench_left",
        "src": "assets/maps/props/station-plaza/station-bench.png?rev=20260710-2",
        "x": 7.367096412556053,
        "y": 6.224103139013454,
        "w": 3,
        "h": 2,
        "footY": 8.224103139013454,
        "enabled": true,
        "catalogKey": "bench",
        "collision": {
            "enabled": true,
            "x": 0.14,
            "y": 0.72,
            "w": 0.72,
            "h": 0.3
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0,
            "y": 0.6,
            "w": 1,
            "h": 0.4
        }
    },
    {
        "id": "station_bench_right",
        "src": "assets/maps/props/station-plaza/station-bench.png?rev=20260710-2",
        "x": 16.95913677130045,
        "y": 8.092488789237665,
        "w": 3,
        "h": 2,
        "footY": 10.092488789237665,
        "enabled": true,
        "catalogKey": "bench",
        "collision": {
            "enabled": true,
            "x": 0.14,
            "y": 0.72,
            "w": 0.72,
            "h": 0.3
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0,
            "y": 0.6,
            "w": 1,
            "h": 0.4
        }
    },
    {
        "id": "station_lamp_left",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260710-2",
        "x": 8.878452914798206,
        "y": 3.3695627802690575,
        "w": 1.02,
        "h": 3.4,
        "footY": 6.769562780269057,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": {
            "enabled": true,
            "x": 0.28,
            "y": 0.92,
            "w": 0.44,
            "h": 0.22
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0,
            "y": 0.6,
            "w": 1,
            "h": 0.4
        }
    },
    {
        "id": "station_lamp_right",
        "src": "assets/maps/props/station-plaza/station-street-lamp.png?rev=20260710-2",
        "x": 14.05165919282511,
        "y": 3.3760089686098658,
        "w": 1.02,
        "h": 3.4,
        "footY": 6.776008968609865,
        "enabled": true,
        "catalogKey": "streetLamp",
        "collision": {
            "enabled": true,
            "x": 0.28,
            "y": 0.92,
            "w": 0.44,
            "h": 0.22
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0,
            "y": 0.6,
            "w": 1,
            "h": 0.4
        }
    },
    {
        "id": "station_planter_left",
        "src": "assets/maps/props/station-plaza/station-planter.png?rev=20260710-2",
        "x": 5.962107623318384,
        "y": 13.384417040358747,
        "w": 1.1,
        "h": 1.8,
        "footY": 15.184417040358747,
        "enabled": true,
        "catalogKey": "planter",
        "collision": {
            "enabled": true,
            "x": 0.14,
            "y": 0.58,
            "w": 0.72,
            "h": 0.42
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0,
            "y": 0.6,
            "w": 1,
            "h": 0.4
        }
    },
    {
        "id": "station_planter_right",
        "src": "assets/maps/props/station-plaza/station-planter.png?rev=20260710-2",
        "x": 16.75767937219731,
        "y": 13.3734865470852,
        "w": 1.1,
        "h": 1.8,
        "footY": 15.1734865470852,
        "enabled": true,
        "catalogKey": "planter",
        "collision": {
            "enabled": true,
            "x": 0.14,
            "y": 0.58,
            "w": 0.72,
            "h": 0.42
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0,
            "y": 0.6,
            "w": 1,
            "h": 0.4
        }
    },
    {
        "id": "station_direction_sign_candidate",
        "src": "assets/maps/props/station-plaza/station-direction-sign.png?rev=20260710-2",
        "x": 14.2,
        "y": 6.6,
        "w": 1.4,
        "h": 2.4,
        "footY": 9,
        "enabled": false,
        "catalogKey": "directionSign",
        "collision": {
            "enabled": true,
            "x": 0.34,
            "y": 0.84,
            "w": 0.32,
            "h": 0.2
        },
        "interaction": {
            "enabled": false,
            "triggerId": "",
            "x": 0,
            "y": 0.6,
            "w": 1,
            "h": 0.4
        }
    }
];
