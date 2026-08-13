(function() {
    // 湯間庭町 / 到着画面の表示専用調整。
    // ローディング処理そのものには触れず、文言と灯りの見た目だけを変更する。

    var ARRIVAL_TEXT = "まもなく、湯間庭町です。";

    function ensureTownArrivalRefreshStyles() {
        if (document.getElementById("town-arrival-refresh-style")) return;

        var style = document.createElement("style");
        style.id = "town-arrival-refresh-style";
        style.textContent =
            ".town-loading-mark{" +
                "width:9px!important;height:9px!important;" +
                "margin:0 auto 18px!important;" +
                "border-radius:50%!important;" +
                "background:#ffe9ad!important;" +
                "box-shadow:" +
                    "0 0 0 5px rgba(207,158,84,.08)," +
                    "0 0 16px rgba(255,218,143,.34)!important;" +
                "animation:townArrivalLight 2.4s ease-in-out infinite!important;" +
            "}" +
            "@keyframes townArrivalLight{" +
                "0%,100%{opacity:.58;transform:scale(.92);}" +
                "50%{opacity:1;transform:scale(1.08);}" +
            "}";

        document.head.appendChild(style);
    }

    function refreshExistingArrivalLayer() {
        ensureTownArrivalRefreshStyles();

        var label = document.getElementById("town-loading-label");
        if (label) {
            label.textContent = ARRIVAL_TEXT;
        }
    }

    var baseShowTownArrivalLoading = window.showTownArrivalLoading;

    window.showTownArrivalLoading = function() {
        ensureTownArrivalRefreshStyles();

        if (typeof window.showTownLoading === "function") {
            window.showTownLoading(ARRIVAL_TEXT);
        } else if (typeof baseShowTownArrivalLoading === "function") {
            baseShowTownArrivalLoading.apply(this, arguments);
            refreshExistingArrivalLayer();
        }
    };

    refreshExistingArrivalLayer();
})();
