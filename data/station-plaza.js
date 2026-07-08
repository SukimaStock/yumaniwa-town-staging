// ==========================================
// 湯間庭町 / 駅前マップ設定
// このファイルは、背景・当たり判定・入口・エリア名だけを持ちます。
// 日々の記事・作品・更新履歴は data/notes.js / works.js / updates.js を更新してください。
// ==========================================

// ==========================================
// 1. 定数・データ定義
// ==========================================
var BG_IMAGE_PATH = 'assets/yumaniwa_station_mock_clean.png';
var TILE_SIZE = 16;
var MAP_WIDTH = 48;
var MAP_HEIGHT = 32;
var PLAYER_START = { x: 24, y: 17 };

var passableRects = [
    { x: 19, y: 7, w: 8, h: 2 },
    { x: 11, y: 8, w: 5, h: 3 },
    { x: 38, y: 8, w: 5, h: 7 },
    { x: 5, y: 9, w: 4, h: 6 },
    { x: 16, y: 9, w: 5, h: 1 },
    { x: 22, y: 9, w: 4, h: 13 },
    { x: 3, y: 10, w: 2, h: 5 },
    { x: 9, y: 10, w: 2, h: 5 },
    { x: 0, y: 11, w: 3, h: 4 },
    { x: 11, y: 11, w: 3, h: 7 },
    { x: 36, y: 13, w: 2, h: 4 },
    { x: 43, y: 13, w: 2, h: 2 },
    { x: 31, y: 14, w: 2, h: 7 },
    { x: 45, y: 14, w: 3, h: 1 },
    { x: 4, y: 15, w: 3, h: 17 },
    { x: 14, y: 15, w: 8, h: 7 },
    { x: 26, y: 15, w: 2, h: 7 },
    { x: 38, y: 15, w: 2, h: 1 },
    { x: 47, y: 15, w: 1, h: 1 },
    { x: 28, y: 16, w: 1, h: 6 },
    { x: 29, y: 17, w: 2, h: 4 },
    { x: 33, y: 17, w: 4, h: 6 },
    { x: 13, y: 18, w: 1, h: 3 },
    { x: 29, y: 21, w: 1, h: 1 },
    { x: 32, y: 21, w: 1, h: 11 },
    { x: 14, y: 22, w: 3, h: 2 },
    { x: 33, y: 23, w: 3, h: 9 },
    { x: 15, y: 24, w: 2, h: 4 },
    { x: 11, y: 26, w: 3, h: 6 },
    { x: 42, y: 26, w: 2, h: 6 },
    { x: 23, y: 28, w: 1, h: 3 },
    { x: 0, y: 29, w: 4, h: 3 },
    { x: 7, y: 29, w: 4, h: 3 },
    { x: 14, y: 29, w: 9, h: 2 },
    { x: 24, y: 29, w: 8, h: 2 },
    { x: 36, y: 29, w: 6, h: 3 },
    { x: 44, y: 29, w: 4, h: 3 },
    { x: 14, y: 31, w: 2, h: 1 }
];


var blockedRects = [
    { x: 0, y: 0, w: 48, h: 7 },
    { x: 0, y: 7, w: 19, h: 1 },
    { x: 27, y: 7, w: 21, h: 1 },
    { x: 0, y: 8, w: 11, h: 1 },
    { x: 16, y: 8, w: 3, h: 1 },
    { x: 27, y: 8, w: 11, h: 5 },
    { x: 43, y: 8, w: 5, h: 5 },
    { x: 0, y: 9, w: 5, h: 1 },
    { x: 9, y: 9, w: 2, h: 1 },
    { x: 21, y: 9, w: 1, h: 6 },
    { x: 26, y: 9, w: 1, h: 6 },
    { x: 0, y: 10, w: 3, h: 1 },
    { x: 16, y: 10, w: 5, h: 5 },
    { x: 14, y: 11, w: 2, h: 4 },
    { x: 27, y: 13, w: 9, h: 1 },
    { x: 45, y: 13, w: 3, h: 1 },
    { x: 27, y: 14, w: 4, h: 1 },
    { x: 33, y: 14, w: 3, h: 3 },
    { x: 0, y: 15, w: 4, h: 14 },
    { x: 7, y: 15, w: 4, h: 14 },
    { x: 28, y: 15, w: 3, h: 1 },
    { x: 40, y: 15, w: 7, h: 11 },
    { x: 29, y: 16, w: 2, h: 1 },
    { x: 38, y: 16, w: 2, h: 13 },
    { x: 47, y: 16, w: 1, h: 13 },
    { x: 37, y: 17, w: 1, h: 12 },
    { x: 11, y: 18, w: 2, h: 8 },
    { x: 13, y: 21, w: 1, h: 5 },
    { x: 30, y: 21, w: 2, h: 8 },
    { x: 17, y: 22, w: 13, h: 6 },
    { x: 36, y: 23, w: 1, h: 6 },
    { x: 14, y: 24, w: 1, h: 5 },
    { x: 40, y: 26, w: 2, h: 3 },
    { x: 44, y: 26, w: 3, h: 3 },
    { x: 15, y: 28, w: 8, h: 1 },
    { x: 24, y: 28, w: 6, h: 1 },
    { x: 16, y: 31, w: 16, h: 1 }
];


var blockedPoints = [];


var triggers = [
    {
        id: "station", label: "湯間庭駅", actionLabel: "調べる",
        area: { x: 23, y: 27, w: 2, h: 1 },
        type: "inspect",
        text: "湯間庭駅。\n\nのんびりしたローカル線の小さな駅だ。\nここから、湯気と看板の町歩きが始まる。"
    },
    {
        id: "tourist_info", label: "観光案内所", actionLabel: "入る",
        area: { x: 31, y: 13, w: 2, h: 1 },
        type: "warp",
        target: "tourist_info_interior",
        text: "観光案内所に入りますか?"
    },
    {
        id: "yumado_street", label: "湯窓通り", actionLabel: "進む",
        area: { x: 38, y: 11, w: 6, h: 1 },
        type: "warp",
        target: "yumado_street_map",
        text: "湯窓通りへ進みますか?"
    },
    {
        id: "leisure_center", label: "湯窓レジャーセンター", actionLabel: "入る",
        area: { x: 42, y: 26, w: 3, h: 1 },
        type: "warp",
        target: "leisure_center_map",
        text: "湯窓レジャーセンターに入りますか?"
    },
    {
        id: "tomogushi_alley", label: "灯串横丁", actionLabel: "入る",
        area: { x: 4, y: 28, w: 3, h: 2 },
        type: "warp",
        target: "tomogushi_alley_map",
        text: "灯串横丁へ入りますか?"
    },
    {
        id: "newspaper_board", label: "湯間庭新報", actionLabel: "読む",
        area: { x: 5, y: 8, w: 4, h: 1 },
        type: "menu",
        target: "shinpo_board",
        text: "湯間庭新報の掲示板だ。記事を読んでみますか?"
    },
    {
        id: "tourist_map", label: "観光マップ", actionLabel: "調べる",
        area: { x: 16, y: 14, w: 5, h: 1 },
        type: "inspect",
        text: "湯間庭観光マップだ。町の見どころが載っている。"
    },
    {
        id: "onsen_construction", label: "湯間庭温泉方面", actionLabel: "調べる",
        area: { x: 22, y: 6, w: 4, h: 1 },
        type: "inspect",
        text: "この先、湯間庭温泉。\n\n現在、石段と湯けむりの整備中です。\nもう少し町が広がったら、入れるようになるかもしれません。"
    },
    {
        id: "Kanban1", label: "看板", actionLabel: "調べる",
        area: { x: 10, y: 9, w: 1, h: 1 },
        type: "inspect",
        target: "看板",
        text: "「今日も、急がなくていい。」と書いてある。"
    },
    {
        id: "Kanban2", label: "ポスター", actionLabel: "調べる",
        area: { x: 26, y: 14, w: 1, h: 1 },
        type: "inspect",
        target: "看板",
        text: "「湯けむり注意」と書かれたポスターだ。"
    },
    {
        id: "Kanban3", label: "看板", actionLabel: "調べる",
        area: { x: 29, y: 16, w: 1, h: 1 },
        type: "inspect",
        target: "看板",
        text: "「観光案内所　この先」と書いてある。"
    },
    {
        id: "Kanban4", label: "ポスター", actionLabel: "調べる",
        area: { x: 13, y: 22, w: 1, h: 2 },
        type: "inspect",
        target: "看板",
        text: "「喫茶まどべ　準備中」と書かれた貼り紙だ。"
    },
    {
        id: "Kanban5", label: "ポスター", actionLabel: "調べる",
        area: { x: 38, y: 28, w: 2, h: 1 },
        type: "inspect",
        target: "看板",
        text: "「さわれるらくがき　稼働中」と書いてある。"
    },
    {
        id: "Kanban6", label: "貼り紙", actionLabel: "調べる",
        area: { x: 26, y: 28, w: 1, h: 1 },
        type: "inspect",
        target: "看板",
        text: "電車はめったに来ないらしい。"
    },
    {
        id: "Kanban7", label: "ポスター", actionLabel: "調べる",
        area: { x: 8, y: 28, w: 1, h: 1 },
        type: "inspect",
        target: "看板",
        text: "「灯串横丁　今夜も営業中」と書かれたポスターだ。"
    }
];


var areaZones = [
    {
        id: "station_plaza_center", title: "湯間庭駅前", subtitle: "Station Plaza",
        area: { x: 14, y: 15, w: 18, h: 10 }
    },
    {
        id: "yumado_street_gate", title: "湯窓通り入口", subtitle: "Yumado Street",
        area: { x: 38, y: 8, w: 7, h: 8 }
    },
    {
        id: "leisure_center_front", title: "湯窓レジャーセンター前", subtitle: "Yumado Leisure Center",
        area: { x: 39, y: 24, w: 8, h: 6 }
    },
    {
        id: "tomogushi_alley_gate", title: "灯串横丁", subtitle: "Tomogushi Alley",
        area: { x: 4, y: 24, w: 5, h: 6 }
    },
    {
        id: "shinpo_board_area", title: "湯間庭新報 掲示板前", subtitle: "Yumaniwa Shinpo",
        area: { x: 4, y: 7, w: 8, h: 5 }
    },
    {
        id: "onsen_road_closed", title: "湯間庭温泉方面", subtitle: "Under Construction",
        area: { x: 20, y: 6, w: 8, h: 4 }
    }
];
