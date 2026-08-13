(function() {
    // 湯間庭町 / 初回来訪ガイド
    // 地図は自動で開かず、駅前広場に初めて来た時だけ短い案内を表示する。

    var repoPath = (window.location.pathname.split("/")[1] || "root");
    var FIRST_VISIT_KEY = "yumaniwa:first-station-guide-v1:" + repoPath;
    var shownThisPage = false;
    var changeSceneHookInstalled = false;

    function hasSeenFirstVisitGuide() {
        if (shownThisPage) return true;

        try {
            return window.localStorage.getItem(FIRST_VISIT_KEY) === "1";
        } catch (err) {
            return false;
        }
    }

    function markFirstVisitGuideSeen() {
        shownThisPage = true;

        try {
            window.localStorage.setItem(FIRST_VISIT_KEY, "1");
        } catch (err) {
            // localStorage が使えない環境でも、このページ内では一度だけ表示する。
        }
    }

    function showFirstVisitGuideIfReady() {
        if (hasSeenFirstVisitGuide()) return false;
        if (typeof currentScene === "undefined" || currentScene !== "station_plaza") return false;
        if (typeof isWorkPlayerOpen !== "undefined" && isWorkPlayerOpen) return false;
        if (typeof isMessageOpen !== "undefined" && isMessageOpen) return false;
        if (typeof isStationGuideMapOpen !== "undefined" && isStationGuideMapOpen) return false;
        if (typeof showMessage !== "function") return false;

        markFirstVisitGuideSeen();
        showMessage(
            "ここは駅前広場だ。\n" +
            "町は上下左右につながっている。\n" +
            "中央の案内板で地図を見られるようだ。"
        );
        return true;
    }

    function installChangeSceneHook() {
        if (changeSceneHookInstalled || typeof window.changeScene !== "function") return;

        var baseChangeScene = window.changeScene;
        changeSceneHookInstalled = true;

        window.changeScene = function(sceneId, spawnKey) {
            var result = baseChangeScene.apply(this, arguments);

            if (sceneId === "station_plaza") {
                window.setTimeout(showFirstVisitGuideIfReady, 120);
            }

            return result;
        };
    }

    function bootFirstVisitGuide() {
        installChangeSceneHook();
        window.setTimeout(showFirstVisitGuideIfReady, 900);
    }

    // main.js より前後どちらで読み込まれても成立するようにする。
    if (document.readyState === "complete") {
        bootFirstVisitGuide();
    } else {
        window.addEventListener("load", bootFirstVisitGuide);
    }
})();
