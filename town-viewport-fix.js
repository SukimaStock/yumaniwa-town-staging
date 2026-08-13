(function () {
    "use strict";

    // iOSのアプリ内ブラウザでは 100dvh と実際の表示領域が
    // 数pxずれる場合があるため、Visual Viewport の実測値をCSSへ渡す。
    // CSS側ではスマホ表示だけこの値を使う。
    function syncTownViewportHeight() {
        var viewport = window.visualViewport;
        var height = viewport && viewport.height
            ? viewport.height
            : window.innerHeight;

        if (!height || !isFinite(height)) return;

        document.documentElement.style.setProperty(
            "--town-viewport-h",
            Math.round(height) + "px"
        );
    }

    syncTownViewportHeight();

    window.addEventListener("resize", syncTownViewportHeight, { passive: true });
    window.addEventListener("orientationchange", function () {
        window.setTimeout(syncTownViewportHeight, 80);
    }, { passive: true });

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncTownViewportHeight, { passive: true });
        window.visualViewport.addEventListener("scroll", syncTownViewportHeight, { passive: true });
    }
})();
