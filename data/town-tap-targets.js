// ==========================================
// 湯間庭町 / 直接タップ専用範囲
// interaction（近づいて調べる範囲）とは独立した、タッチUI用の狭い範囲です。
// x / y / w / h は各prop画像内の相対比率（0〜1）。
// ==========================================

window.TOWN_TAP_TARGETS = {
    station_plaza: {
        station_notice_board: {
            enabled: true,
            x: 0.18,
            y: 0.68,
            w: 0.64,
            h: 0.18
        },
        station_tourist_map: {
            enabled: true,
            x: 0.12,
            y: 0.70,
            w: 0.76,
            h: 0.28
        }
    },

    tomogushi_alley_map: {
        common_temporary_storefront: {
            enabled: true,
            x: 0.18,
            y: 0.62,
            w: 0.64,
            h: 0.22
        }
    },

    leisure_center_map: {
        leisure_catalog_terminal: {
            enabled: true,
            x: 0.18,
            y: 0.10,
            w: 0.64,
            h: 0.56
        }
    }
};
