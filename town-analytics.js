/* ==========================================
   湯間庭町 / Plausible 行動計測

   production だけ Plausible へ送信する。
   staging では通信せず、Console にイベント内容だけ表示する。

   Events:
   - Map Open
   - Venue Open
   - Work Open
   - Share
   ========================================== */
(function () {
    "use strict";

    if (window.__YUMANIWA_ANALYTICS_READY__) return;
    window.__YUMANIWA_ANALYTICS_READY__ = true;

    var IS_STAGING = /\/yumaniwa-town-staging(?:\/|$)/.test(window.location.pathname || "");
    var PLAUSIBLE_SCRIPT = "https://plausible.io/js/pa-sYe-y0PqpZapFe6FJVlK2.js";
    var workOpenSource = "";

    window.__YUMANIWA_ANALYTICS_DEBUG__ = IS_STAGING;

    function getWork(workId) {
        if (!workId || typeof window.getWorkById !== "function") return null;
        return window.getWorkById(String(workId));
    }

    function normalizeProps(name, props) {
        var source = props || {};
        var normalized = {};
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                normalized[key] = source[key];
            }
        }

        if (name === "Work Open") {
            var workId = String(normalized.work || normalized.work_id || window.currentWorkId || "unknown");
            var work = getWork(workId);

            return {
                work: workId,
                venue: (work && work.venue) || normalized.venue || "unknown",
                source: workOpenSource || normalized.source || normalized.entry || "town",
                launch: normalized.launch || (work && work.launch) || "unknown"
            };
        }

        if (name === "Share") {
            var shareWorkId = String(normalized.work || normalized.work_id || window.currentWorkId || "unknown");
            var shareWork = getWork(shareWorkId);

            return {
                work: shareWorkId,
                venue: (shareWork && shareWork.venue) || normalized.venue || "unknown",
                method: normalized.method || "native"
            };
        }

        return normalized;
    }

    function logDebug(name, props) {
        if (!window.__YUMANIWA_ANALYTICS_DEBUG__ || !window.console) return;
        window.console.info("[Yumaniwa Analytics]", name, props || {});
    }

    function track(name, props) {
        var normalized = normalizeProps(name, props);

        if (IS_STAGING) {
            logDebug(name, normalized);
            return false;
        }

        try {
            if (typeof window.plausible !== "function") return false;
            window.plausible(name, { props: normalized });
            return true;
        } catch (error) {
            return false;
        }
    }

    // main.js に残っている Work Open フックも、この共通関数へ流す。
    window.trackYumaniwaEvent = track;

    function loadPlausible() {
        if (IS_STAGING) return;
        if (document.getElementById("yumaniwa-plausible-script")) return;

        window.plausible = window.plausible || function () {
            (window.plausible.q = window.plausible.q || []).push(arguments);
        };
        window.plausible.init = window.plausible.init || function (options) {
            window.plausible.o = options || {};
        };
        window.plausible.init();

        var script = document.createElement("script");
        script.id = "yumaniwa-plausible-script";
        script.async = true;
        script.src = PLAUSIBLE_SCRIPT;
        document.head.appendChild(script);
    }

    function wrapStationGuideMap() {
        var baseOpen = window.openStationGuideMap;
        if (typeof baseOpen !== "function" || baseOpen.__yumaniwaAnalyticsWrapped) return;

        function wrappedOpenStationGuideMap() {
            track("Map Open", {
                scene: String(window.currentScene || "unknown")
            });
            return baseOpen.apply(this, arguments);
        }

        wrappedOpenStationGuideMap.__yumaniwaAnalyticsWrapped = true;
        window.openStationGuideMap = wrappedOpenStationGuideMap;
    }

    function wrapTownTriggerActivation() {
        var baseActivate = window.activateTownTrigger;
        if (typeof baseActivate !== "function" || baseActivate.__yumaniwaAnalyticsWrapped) return;

        var venueTargets = {
            tomogushi_game_board: "tomogushi_alley",
            leisure_catalog: "leisure_center"
        };

        function wrappedActivateTownTrigger(trigger) {
            if (
                trigger &&
                trigger.type === "menu" &&
                trigger.target &&
                venueTargets[trigger.target]
            ) {
                track("Venue Open", {
                    venue: venueTargets[trigger.target],
                    guide: String(trigger.target),
                    scene: String(window.currentScene || "unknown")
                });
            }

            return baseActivate.apply(this, arguments);
        }

        wrappedActivateTownTrigger.__yumaniwaAnalyticsWrapped = true;
        window.activateTownTrigger = wrappedActivateTownTrigger;
    }

    function wrapDestinationMenuSelection() {
        var baseHandle = window.handleDestinationMenuItem;
        if (typeof baseHandle !== "function" || baseHandle.__yumaniwaAnalyticsWrapped) return;

        function wrappedHandleDestinationMenuItem(destId, index) {
            var previousSource = workOpenSource;

            if (destId === "tomogushi_game_board" || destId === "leisure_catalog") {
                workOpenSource = "guide";
            } else {
                workOpenSource = "";
            }

            try {
                return baseHandle.apply(this, arguments);
            } finally {
                workOpenSource = previousSource;
            }
        }

        wrappedHandleDestinationMenuItem.__yumaniwaAnalyticsWrapped = true;
        window.handleDestinationMenuItem = wrappedHandleDestinationMenuItem;
    }

    // share-bridge.js は navigator.share() を呼ぶため、成功Promiseだけを後付けで計測する。
    // 共有キャンセルや失敗は Share に数えない。
    function wrapNativeShare() {
        if (!window.navigator || typeof window.navigator.share !== "function") return;
        if (window.navigator.share.__yumaniwaAnalyticsWrapped) return;

        var baseShare = window.navigator.share.bind(window.navigator);

        function wrappedShare(data) {
            var workId = String(window.currentWorkId || "");
            return Promise.resolve(baseShare(data)).then(function (result) {
                if (workId) {
                    track("Share", {
                        work: workId,
                        method: "native"
                    });
                }
                return result;
            });
        }

        wrappedShare.__yumaniwaAnalyticsWrapped = true;

        try {
            window.navigator.share = wrappedShare;
        } catch (error) {
            try {
                Object.defineProperty(window.navigator, "share", {
                    configurable: true,
                    writable: true,
                    value: wrappedShare
                });
            } catch (ignored) {
                // Web Share APIを上書きできない環境では、共有機能自体はそのまま使う。
            }
        }
    }

    loadPlausible();
    wrapStationGuideMap();
    wrapTownTriggerActivation();
    wrapDestinationMenuSelection();
    wrapNativeShare();

    // main.js の初期ルート処理が先に走った環境では、既に開いている直リンク作品を補足する。
    if (window.isWorkPlayerOpen && window.currentWorkId) {
        var currentWork = getWork(window.currentWorkId);
        track("Work Open", {
            work_id: window.currentWorkId,
            launch: currentWork && currentWork.launch,
            entry: window.isDirectWorkVisit ? "direct" : "town"
        });
    }
})();
