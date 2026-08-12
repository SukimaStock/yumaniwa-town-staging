/* ==========================================
   湯間庭町 / 縦長作品表示器 + スマホ用バー自動収納

   - playerLayout: "phone" の作品は、iPad・PCでは
     iPhone相当の縦長画面として中央に置く。
   - iPhoneなど小さいタッチ画面では、上部バーを読み込み直後だけ表示。
     少しすると上へ収納し、作品のための高さを返す。
   - 収納後は左上の小さなタブを押すと、上部バーを再表示できる。
   - responsive表示の作品は対象外。
   ========================================== */
(function () {
    "use strict";

    var PHONE_LAYOUTS = {
        "phone-cola": { width: 360, height: 660 },
        "phone-yakitori": { width: 360, height: 660 }
    };

    var INITIAL_VISIBLE_MS = 2600;
    var REVEAL_VISIBLE_MS = 4200;

    var playerLayer = document.getElementById("work-player");
    var controls = document.getElementById("work-player-controls");
    var content = document.getElementById("work-player-content");
    var frame = document.getElementById("work-player-frame");
    var loading = document.getElementById("work-player-loading");
    var peekTab = document.getElementById("work-player-peek-tab");

    if (!playerLayer || !controls || !content || !frame || !loading || !peekTab) return;

    // itch.ioのような外部作品をiframe内で開いた場合も、
    // Web Share APIとコピー操作を利用できるようにする。
    var FRAME_ALLOW_POLICY =
        "autoplay; fullscreen; gamepad; web-share; clipboard-write";

    function ensureFramePermissions() {
        if (frame.getAttribute("allow") !== FRAME_ALLOW_POLICY) {
            frame.setAttribute("allow", FRAME_ALLOW_POLICY);
        }
    }

    ensureFramePermissions();

    var hideTimer = null;

    function getLayout() {
        var preset = PHONE_LAYOUTS[playerLayer.dataset.frameMode];
        if (preset) return preset;

        // 作品データの playerLayout: "phone" を共通条件にする。
        // DotWeatherなど、softフレームの縦長作品も同じ収納挙動になる。
        if (playerLayer.dataset.playerLayout !== "phone") {
            return null;
        }

        return {
            width: Number(playerLayer.dataset.playerWidth) || 360,
            height: Number(playerLayer.dataset.playerHeight) || 640
        };
    }

    function isSmallTouchScreen() {
        var shortSide = Math.min(window.innerWidth || 0, window.innerHeight || 0);
        var hasTouch = (
            (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
            (navigator.maxTouchPoints || 0) > 0
        );
        return hasTouch && shortSide > 0 && shortSide <= 700;
    }

    function isCompactPhoneGame() {
        return (
            playerLayer.classList.contains("visible") &&
            playerLayer.dataset.playerLayout === "phone" &&
            !!getLayout() &&
            isSmallTouchScreen()
        );
    }

    function clearHideTimer() {
        if (hideTimer) {
            window.clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    function clearPhoneLayout() {
        content.classList.remove("phone-layout-active");
        frame.style.removeProperty("position");
        frame.style.removeProperty("inset");
        frame.style.removeProperty("width");
        frame.style.removeProperty("height");
        frame.style.removeProperty("max-width");
        frame.style.removeProperty("max-height");
        frame.style.removeProperty("flex");
        frame.style.removeProperty("box-shadow");
        frame.style.removeProperty("background");
    }

    function applyPhoneLayout() {
        var layout = getLayout();

        if (!layout || !playerLayer.classList.contains("visible")) {
            clearPhoneLayout();
            return;
        }

        // 額縁の内側に少し余白を残し、iPhone幅を超える時だけ縮小する。
        // バーが収納されると content の高さが増え、ここで自動的に少し大きくなる。
        var horizontalPadding = playerLayer.classList.contains("phone-controls-hidden") ? 8 : 24;
        var verticalPadding = playerLayer.classList.contains("phone-controls-hidden") ? 6 : 24;
        var availableWidth = Math.max(1, content.clientWidth - horizontalPadding);
        var availableHeight = Math.max(1, content.clientHeight - verticalPadding);
        // iPhoneでは従来どおり等倍まで。
        // iPad・PCでは余白が大きくなりすぎないよう、表示器だけ最大1.35倍まで拡大する。
        // iframe内の論理サイズやゲーム側の倍率には触れない。
        var maxScale = isSmallTouchScreen() ? 1 : 1.35;
        var scale = Math.min(
            maxScale,
            availableWidth / layout.width,
            availableHeight / layout.height
        );

        var width = Math.max(1, Math.floor(layout.width * scale));
        var height = Math.max(1, Math.floor(layout.height * scale));

        content.classList.add("phone-layout-active");
        frame.style.position = "relative";
        frame.style.inset = "auto";
        frame.style.width = width + "px";
        frame.style.height = height + "px";
        frame.style.maxWidth = "none";
        frame.style.maxHeight = "none";
        frame.style.flex = "0 0 auto";
        frame.style.background = "#080a0d";
        frame.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.44)";
    }

    function requestLayoutUpdate() {
        window.requestAnimationFrame(function () {
            // main.js 側のレイアウト計算と、ResizeObserver の両方へ追従させる。
            if (typeof window.updateWorkPlayerLayoutSize === "function") {
                window.updateWorkPlayerLayoutSize();
            }
            applyPhoneLayout();
        });
    }

    function setControlsHidden(hidden) {
        if (hidden && !isCompactPhoneGame()) hidden = false;

        var nextHidden = !!hidden;
        if (playerLayer.classList.contains("phone-controls-hidden") !== nextHidden) {
            playerLayer.classList.toggle("phone-controls-hidden", nextHidden);
        }
        peekTab.hidden = !nextHidden;
        requestLayoutUpdate();
    }

    function scheduleHide(delay) {
        clearHideTimer();

        if (!isCompactPhoneGame() || loading.classList.contains("visible")) {
            return;
        }

        hideTimer = window.setTimeout(function () {
            if (isCompactPhoneGame() && !loading.classList.contains("visible")) {
                setControlsHidden(true);
            }
        }, delay || INITIAL_VISIBLE_MS);
    }

    function showControlsForAWhile(delay) {
        if (!isCompactPhoneGame()) return;
        setControlsHidden(false);
        scheduleHide(delay || REVEAL_VISIBLE_MS);
    }

    // 「作品を開いた」「別の作品に切り替えた」時だけ、バーを最初の表示状態へ戻す。
    // phone-controls-hidden 自身の class 変更では呼び直さない。
    function resetForNewPlayerState() {
        clearHideTimer();

        if (!isCompactPhoneGame()) {
            setControlsHidden(false);
            return;
        }

        // ローディング中にバーが消えると、初めて入った店の名前が読めない。
        if (loading.classList.contains("visible")) {
            setControlsHidden(false);
            return;
        }

        setControlsHidden(false);
        scheduleHide(INITIAL_VISIBLE_MS);
    }

    peekTab.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showControlsForAWhile(REVEAL_VISIBLE_MS);
    });

    controls.addEventListener("pointerdown", function () {
        if (isCompactPhoneGame()) clearHideTimer();
    }, { passive: true });

    controls.addEventListener("pointerup", function () {
        if (isCompactPhoneGame()) scheduleHide(REVEAL_VISIBLE_MS);
    }, { passive: true });

    // 作品が開いた・閉じた、作品種類が変わった時に初期状態をそろえる。
    // class は phone-controls-hidden でも変わるので、visible / レイアウト値が変わった時だけ再初期化する。
    var lastVisible = playerLayer.classList.contains("visible");
    var lastFrameMode = playerLayer.dataset.frameMode || "";
    var lastPlayerLayout = playerLayer.dataset.playerLayout || "";

    var playerObserver = new MutationObserver(function () {
        window.requestAnimationFrame(function () {
            var visible = playerLayer.classList.contains("visible");
            var frameMode = playerLayer.dataset.frameMode || "";
            var playerLayout = playerLayer.dataset.playerLayout || "";
            var playerStateChanged = (
                visible !== lastVisible ||
                frameMode !== lastFrameMode ||
                playerLayout !== lastPlayerLayout
            );

            lastVisible = visible;
            lastFrameMode = frameMode;
            lastPlayerLayout = playerLayout;

            applyPhoneLayout();
            if (playerStateChanged) {
                resetForNewPlayerState();
            }
        });
    });

    playerObserver.observe(playerLayer, {
        attributes: true,
        attributeFilter: ["class", "data-frame-mode", "data-player-layout"]
    });

    // iframeの読み込みが完了してローディングが消えた瞬間から、最初の表示時間を数える。
    var loadingObserver = new MutationObserver(function () {
        window.requestAnimationFrame(function () {
            applyPhoneLayout();
            resetForNewPlayerState();
        });
    });

    loadingObserver.observe(loading, {
        attributes: true,
        attributeFilter: ["class"]
    });

    if (typeof ResizeObserver !== "undefined") {
        var resizeObserver = new ResizeObserver(function () {
            applyPhoneLayout();
        });
        resizeObserver.observe(content);
    }

    window.addEventListener("resize", function () {
        applyPhoneLayout();
    });

    window.addEventListener("orientationchange", function () {
        window.setTimeout(function () {
            applyPhoneLayout();
        }, 120);
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            clearHideTimer();
        } else if (isCompactPhoneGame()) {
            // 戻ってきた時だけ、迷子防止にいったんバーを見せる。
            resetForNewPlayerState();
        }
    });

    window.requestAnimationFrame(function () {
        applyPhoneLayout();
        resetForNewPlayerState();
    });

    /*
     * itch.io埋め込みの連続読み込みを抑える。
     * 作品を閉じてすぐ別のitchゲームを開いた場合だけ、
     * 次の読み込みまで最低1.2秒の間隔を置く。
     * 同じ時間内に複数の起動要求が来た場合は、最後の一件だけを実行する。
     */
    (function installItchLoadGuard() {
        if (
            typeof window.openWorkPlayer !== "function" ||
            typeof window.closeWorkPlayer !== "function"
        ) {
            return;
        }

        var openWorkPlayerBase = window.openWorkPlayer;
        var closeWorkPlayerBase = window.closeWorkPlayer;
        var pendingOpenTimer = null;
        var lastItchOpenAt = 0;
        var ITCH_OPEN_GAP_MS = 1200;

        function clearPendingOpen() {
            if (pendingOpenTimer) {
                window.clearTimeout(pendingOpenTimer);
                pendingOpenTimer = null;
            }
        }

        function getWorkSource(work) {
            if (!work) return "";
            return work.embedUrl || work.entry || work.url || "";
        }

        function isItchWork(work) {
            return /^https:\/\/itch\.io\/embed-upload\//i.test(
                String(getWorkSource(work))
            );
        }

        window.openWorkPlayer = function(work) {
            var context = this;
            var args = arguments;

            clearPendingOpen();

            if (!isItchWork(work)) {
                var result = openWorkPlayerBase.apply(context, args);
                ensureFramePermissions();
                return result;
            }

            var elapsed = Date.now() - lastItchOpenAt;
            var delay = Math.max(0, ITCH_OPEN_GAP_MS - elapsed);

            var runOpen = function() {
                pendingOpenTimer = null;
                lastItchOpenAt = Date.now();
                openWorkPlayerBase.apply(context, args);
                ensureFramePermissions();
            };

            if (delay > 0) {
                pendingOpenTimer = window.setTimeout(runOpen, delay);
                return;
            }

            runOpen();
        };

        window.closeWorkPlayer = function() {
            clearPendingOpen();
            return closeWorkPlayerBase.apply(this, arguments);
        };
    })();
})();
