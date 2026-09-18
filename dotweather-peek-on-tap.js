/* ==========================================
   Immersive phone works / peek-on-tap

   - Keep the existing phone-layout.js auto-collapse behavior.
   - DotWeather / SteamClock: after the town header collapses, keep the top-left
     peek tab hidden while the scene is idle.
   - A tap anywhere inside the work reveals the peek tab briefly.
   - Pressing the peek tab is still handled by phone-layout.js and restores
     the town header as before.
   - Other phone-layout works are untouched.
   ========================================== */
(function () {
    "use strict";

    var REVEAL_MS = 2500;
    var IMMERSIVE_WORK_IDS = {
        dotweather: true,
        steamclock: true
    };

    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");
    var peekTab = document.getElementById("work-player-peek-tab");

    if (!playerLayer || !frame || !peekTab) return;

    var boundCanvas = null;
    var hideTimer = null;

    function frameLooksLikeImmersiveWork() {
        var src = String(frame.getAttribute("src") || frame.src || "");
        return /\/works\/(?:dotweather|steamclock)\//i.test(src);
    }

    function isImmersiveWorkActive() {
        if (!playerLayer.classList.contains("visible")) return false;
        return !!IMMERSIVE_WORK_IDS[window.currentWorkId] || frameLooksLikeImmersiveWork();
    }

    function isHeaderCollapsed() {
        return playerLayer.classList.contains("phone-controls-hidden");
    }

    function clearHideTimer() {
        if (hideTimer !== null) {
            window.clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    function hidePeek() {
        clearHideTimer();
        if (!isImmersiveWorkActive()) return;
        peekTab.hidden = true;
    }

    function revealPeekBriefly() {
        if (!isImmersiveWorkActive() || !isHeaderCollapsed()) return;

        clearHideTimer();
        peekTab.hidden = false;
        hideTimer = window.setTimeout(function () {
            hideTimer = null;
            if (isImmersiveWorkActive() && isHeaderCollapsed()) {
                peekTab.hidden = true;
            }
        }, REVEAL_MS);
    }

    function onCanvasPointerUp() {
        revealPeekBriefly();
    }

    function unbindCanvas() {
        if (!boundCanvas) return;
        boundCanvas.removeEventListener("pointerup", onCanvasPointerUp, false);
        boundCanvas = null;
    }

    function bindCanvas() {
        unbindCanvas();
        if (!isImmersiveWorkActive()) return;

        try {
            var doc = frame.contentDocument;
            var canvas = doc && doc.getElementById("gameCanvas");
            if (!canvas) return;

            boundCanvas = canvas;
            boundCanvas.addEventListener("pointerup", onCanvasPointerUp, false);
        } catch (error) {
            boundCanvas = null;
        }
    }

    function sync() {
        if (!isImmersiveWorkActive()) {
            clearHideTimer();
            unbindCanvas();
            return;
        }

        if (isHeaderCollapsed()) {
            // phone-layout.js shows the peek tab automatically when it collapses.
            // Immersive works override that idle state: keep it hidden until a tap.
            hidePeek();
        } else {
            clearHideTimer();
            peekTab.hidden = true;
        }

        if (!boundCanvas) {
            bindCanvas();
        }
    }

    var playerObserver = new MutationObserver(function () {
        window.requestAnimationFrame(sync);
    });
    playerObserver.observe(playerLayer, {
        attributes: true,
        attributeFilter: ["class", "data-frame-mode", "data-player-layout"]
    });

    frame.addEventListener("load", function () {
        window.requestAnimationFrame(function () {
            bindCanvas();
            sync();
        });
    });

    peekTab.addEventListener("pointerdown", function () {
        if (isImmersiveWorkActive()) clearHideTimer();
    }, { passive: true });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            clearHideTimer();
        } else {
            window.requestAnimationFrame(sync);
        }
    });

    window.requestAnimationFrame(sync);
})();
