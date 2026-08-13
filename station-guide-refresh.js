(function() {
    // 湯間庭町 / 駅前案内図の表示専用調整。
    // 町本体のマップ・当たり判定・interactionには触れず、
    // 案内図画像、案内ラベル、地図内タップ領域だけをここで管理する。

    var GUIDE_IMAGE = "assets/station-guide-map-20260813.jpg?v=20260813-1";

    STATION_GUIDE_MAP_IMAGE = GUIDE_IMAGE;

    STATION_GUIDE_MAP_HOTSPOTS = [
        {
            id: "shinpo",
            label: "掲示板",
            subLabel: "読みもの",
            kind: "place",
            target: "shinpo_board",
            rect: { left: 24.0, top: 18.0, width: 16.0, height: 20.0 },
            badge: { left: 27.0, top: 31.0 }
        },
        {
            id: "tomogushi",
            label: "灯串横丁",
            subLabel: "ゲーム",
            kind: "place",
            target: "tomogushi_alley_map",
            rect: { left: 3.0, top: 29.0, width: 28.0, height: 43.0 },
            badge: { left: 14.0, top: 57.0 }
        },
        {
            id: "yumado",
            label: "大通り",
            subLabel: "通り",
            kind: "place",
            target: "yumado_street_map",
            rect: { left: 62.0, top: 18.0, width: 32.0, height: 38.0 },
            badge: { left: 82.0, top: 42.0 }
        },
        {
            id: "leisure_center",
            label: "レジャーセンター",
            subLabel: "展示",
            kind: "place",
            target: "leisure_center_map",
            rect: { left: 63.0, top: 56.0, width: 28.0, height: 32.0 },
            badge: { left: 78.0, top: 76.0 }
        },
        {
            id: "station",
            label: "湯間庭駅",
            kind: "message",
            text: "湯間庭駅。\n\nのんびりしたローカル線の小さな駅だ。\nここから、湯気と看板の町歩きが始まる。",
            rect: { left: 30.0, top: 74.0, width: 31.0, height: 26.0 }
        },
        {
            id: "current",
            label: "現在地",
            kind: "close",
            rect: { left: 42.0, top: 43.0, width: 16.0, height: 17.0 },
            badge: { left: 50.0, top: 55.5 },
            current: true
        },
        {
            id: "onsen",
            label: "温泉方面",
            subLabel: "町の奥へ",
            kind: "place",
            target: "onsen_slope_map",
            rect: { left: 40.0, top: 0.0, width: 21.0, height: 25.0 },
            badge: { left: 50.0, top: 11.0 }
        }
    ];

    function ensureGuideRefreshStyles() {
        if (document.getElementById("station-guide-refresh-style")) return;

        var style = document.createElement("style");
        style.id = "station-guide-refresh-style";
        style.textContent =
            ".station-guide-map-toolbar{" +
                "display:flex;align-items:center;justify-content:space-between;gap:12px;" +
                "width:100%;box-sizing:border-box;padding:8px 10px;" +
                "background:rgba(37,27,20,.92);" +
            "}" +
            ".station-guide-map-labels{" +
                "position:absolute;inset:0;z-index:2;pointer-events:none;" +
            "}" +
            ".station-guide-map-label{" +
                "position:absolute;transform:translate(-50%,-50%);" +
                "min-width:54px;max-width:150px;box-sizing:border-box;" +
                "padding:5px 8px 4px;border-radius:8px;" +
                "border:1px solid rgba(255,239,202,.78);" +
                "background:rgba(49,34,24,.84);color:#fff7e8;" +
                "box-shadow:0 2px 8px rgba(0,0,0,.38);" +
                "text-align:center;white-space:nowrap;line-height:1.12;" +
                "text-shadow:0 1px 2px rgba(0,0,0,.42);" +
                "backdrop-filter:blur(1px);-webkit-backdrop-filter:blur(1px);" +
            "}" +
            ".station-guide-map-label-main{" +
                "display:block;font-size:12px;font-weight:850;letter-spacing:.02em;" +
            "}" +
            ".station-guide-map-label-sub{" +
                "display:block;margin-top:2px;font-size:9px;font-weight:650;" +
                "letter-spacing:.05em;color:rgba(255,244,221,.72);" +
            "}" +
            ".station-guide-current-marker{" +
                "position:absolute;transform:translate(-50%,-50%);" +
                "width:16px;height:16px;box-sizing:border-box;border-radius:50%;" +
                "border:2px solid rgba(48,34,24,.96);background:#fff0c2;" +
                "box-shadow:0 2px 7px rgba(0,0,0,.48),0 0 0 2px rgba(255,246,205,.38);" +
            "}" +
            ".station-guide-current-marker:after{" +
                "content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);" +
                "width:4px;height:4px;border-radius:50%;background:rgba(49,34,24,.95);" +
            "}" +
            ".station-guide-map-close{" +
                "position:static!important;top:auto!important;right:auto!important;left:auto!important;bottom:auto!important;" +
                "flex:0 0 auto;margin:0!important;transform:none!important;" +
                "padding:7px 11px!important;font-size:12px!important;" +
                "border-width:1px!important;border-radius:999px!important;" +
                "background:rgba(255,244,223,.10)!important;" +
                "box-shadow:none!important;" +
            "}" +
            ".station-guide-map-hint{" +
                "position:static!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;" +
                "transform:none!important;width:auto!important;margin:0!important;" +
                "padding:0!important;border:0!important;border-radius:0!important;" +
                "font-size:11px!important;font-weight:700!important;letter-spacing:.05em!important;" +
                "background:transparent!important;color:rgba(255,247,230,.90)!important;" +
                "box-shadow:none!important;pointer-events:none!important;white-space:nowrap!important;" +
                "text-align:left!important;" +
            "}" +
            "@media (max-width:720px){" +
                ".station-guide-map-toolbar{padding:7px 9px;}" +
                ".station-guide-map-label{padding:4px 7px 3px;border-radius:7px;}" +
                ".station-guide-map-label-main{font-size:11px;}" +
                ".station-guide-map-label-sub{font-size:8px;}" +
                ".station-guide-current-marker{width:15px;height:15px;}" +
                ".station-guide-map-close{padding:6px 9px!important;font-size:11px!important;}" +
                ".station-guide-map-hint{font-size:10px!important;}" +
            "}";

        document.head.appendChild(style);
    }

    function moveGuideChromeOutsideImage(layer) {
        if (!layer) return;

        var windowEl = layer.querySelector(".station-guide-map-window");
        var wrap = layer.querySelector(".station-guide-map-image-wrap");
        var hint = layer.querySelector(".station-guide-map-hint");
        var closeButton = layer.querySelector(".station-guide-map-close");

        if (!windowEl || !wrap || !hint || !closeButton) return;

        var toolbar = windowEl.querySelector(".station-guide-map-toolbar");
        if (!toolbar) {
            toolbar = document.createElement("div");
            toolbar.className = "station-guide-map-toolbar";
            windowEl.insertBefore(toolbar, wrap);
        }

        if (hint.parentNode !== toolbar) {
            toolbar.appendChild(hint);
        }

        if (closeButton.parentNode !== toolbar) {
            toolbar.appendChild(closeButton);
        }
    }

    function addGuideLabels(layer) {
        if (!layer) return;

        var wrap = layer.querySelector(".station-guide-map-image-wrap");
        if (!wrap) return;

        var oldLabels = wrap.querySelector(".station-guide-map-labels");
        if (oldLabels && oldLabels.parentNode) {
            oldLabels.parentNode.removeChild(oldLabels);
        }

        var root = document.createElement("div");
        root.className = "station-guide-map-labels";
        root.setAttribute("aria-hidden", "true");

        for (var i = 0; i < STATION_GUIDE_MAP_HOTSPOTS.length; i++) {
            var spot = STATION_GUIDE_MAP_HOTSPOTS[i];
            if (!spot || !spot.badge) continue;

            if (spot.current) {
                var marker = document.createElement("div");
                marker.className = "station-guide-current-marker";
                marker.style.left = spot.badge.left + "%";
                marker.style.top = spot.badge.top + "%";
                root.appendChild(marker);
                continue;
            }

            var badge = document.createElement("div");
            badge.className = "station-guide-map-label";
            badge.style.left = spot.badge.left + "%";
            badge.style.top = spot.badge.top + "%";

            var main = document.createElement("span");
            main.className = "station-guide-map-label-main";
            main.textContent = spot.label || "";
            badge.appendChild(main);

            if (spot.subLabel) {
                var sub = document.createElement("span");
                sub.className = "station-guide-map-label-sub";
                sub.textContent = spot.subLabel;
                badge.appendChild(sub);
            }

            root.appendChild(badge);
        }

        wrap.appendChild(root);
    }

    var baseGetOrCreateStationGuideMapLayer = window.getOrCreateStationGuideMapLayer;

    if (typeof baseGetOrCreateStationGuideMapLayer === "function") {
        window.getOrCreateStationGuideMapLayer = function() {
            ensureGuideRefreshStyles();

            var layer = baseGetOrCreateStationGuideMapLayer.apply(this, arguments);
            if (!layer) return layer;

            var image = layer.querySelector(".station-guide-map-image");
            if (image && image.getAttribute("src") !== GUIDE_IMAGE) {
                stationGuideMapImageReady = false;
                image.setAttribute("src", GUIDE_IMAGE);
            }

            moveGuideChromeOutsideImage(layer);
            addGuideLabels(layer);
            return layer;
        };
    }
})();
