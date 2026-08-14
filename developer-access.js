// 湯間庭町 / 開発機能の公開環境ゲート
// staging は常時ON、本番は ?dev=1 のときだけONにする。
(function () {
    var params = new URLSearchParams(window.location.search || "");
    var path = window.location.pathname || "";
    var isStaging =
        path === "/yumaniwa-town-staging" ||
        path.indexOf("/yumaniwa-town-staging/") === 0;

    var enabled = isStaging || params.get("dev") === "1";

    if (typeof DEV_MODE_ENABLED !== "undefined") {
        DEV_MODE_ENABLED = enabled;
    }
})();
