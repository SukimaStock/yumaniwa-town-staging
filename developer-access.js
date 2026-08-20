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

    // 開発モードで新規トリガーを作るときは、
    // new_trigger を使わずシーンごとの一意なIDを自動採番する。
    if (enabled && !document.getElementById('yumaniwa-auto-trigger-id-script')) {
        var script = document.createElement('script');
        script.id = 'yumaniwa-auto-trigger-id-script';
        script.src = './town-editor-auto-trigger-id.js?v=20260820-1';
        script.async = false;
        document.head.appendChild(script);
    }
})();
