/* ==========================================
   湯間庭町 / 作品別ホーム画面メタデータ

   ?work=<id> で開かれたとき、作品ごとの
   apple-touch-icon と Web App Manifest を head に追加する。

   画像は後から以下へ置くだけでよい:
   ./assets/works/<id>/icon.png
   ========================================== */
(function () {
    "use strict";

    var params = new URLSearchParams(window.location.search);
    var workId = String(params.get("work") || "").trim();

    if (!/^[a-z0-9-]+$/.test(workId)) return;

    function addLink(rel, href) {
        var link = document.createElement("link");
        link.rel = rel;
        link.href = href;
        document.head.appendChild(link);
    }

    addLink(
        "apple-touch-icon",
        "./assets/works/" + workId + "/icon.png"
    );

    addLink(
        "manifest",
        "./w/" + workId + "/manifest.webmanifest"
    );
})();
