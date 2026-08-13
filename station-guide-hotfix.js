(function() {
    // 駅前案内図のQA補正だけをここで行う。
    // 町本体・マップ定義・案内図画像には触れない。

    if (Array.isArray(window.STATION_GUIDE_MAP_HOTSPOTS)) {
        for (var i = 0; i < window.STATION_GUIDE_MAP_HOTSPOTS.length; i++) {
            var spot = window.STATION_GUIDE_MAP_HOTSPOTS[i];
            if (spot && spot.id === "tomogushi") {
                spot.rect = { left: 3.0, top: 38.0, width: 28.0, height: 34.0 };
                break;
            }
        }
    }

    var baseConfirmStationGuideMapMove = window.confirmStationGuideMapMove;

    if (typeof baseConfirmStationGuideMapMove === "function") {
        window.confirmStationGuideMapMove = function() {
            var spot = window.pendingStationGuideMapSpot;

            if (spot && spot.kind === "place" && spot.target === "onsen_slope_map") {
                hideStationGuideMapConfirm();
                playStationGuideMapDarkTransition(function() {
                    closeStationGuideMap();
                    changeScene(spot.target);
                });
                return;
            }

            return baseConfirmStationGuideMapMove.apply(this, arguments);
        };
    }

    // staging QA用: Xなどのアプリ内ブラウザで100dvhと実表示高がずれる場合、
    // Visual Viewportの実測値をスマホ用CSSへ渡す。
    function syncTownViewportHeight() {
        var viewport = window.visualViewport;
        var height = viewport && viewport.height ? viewport.height : window.innerHeight;
        if (!height || !isFinite(height)) return;

        document.documentElement.style.setProperty(
            "--town-viewport-h",
            Math.round(height) + "px"
        );
    }

    syncTownViewportHeight();
    window.addEventListener("resize", syncTownViewportHeight, { passive: true });

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncTownViewportHeight, { passive: true });
    }
})();
