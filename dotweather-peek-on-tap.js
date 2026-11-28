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
    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");
    var peekTab = document.getElementById("work-player-peek-tab");

    if (!playerLayer || !frame || !peekTab) return;

    var boundDocument = null;
    var hideTimer = null;

    function isImmersiveWorkActive() {
        return playerLayer.classList.contains("visible") &&
            playerLayer.dataset.mobileFrame === "immersive";
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

    function unbindDocument() {
        if (!boundDocument) return;
        boundDocument.removeEventListener("pointerup", revealPeekBriefly, true);
        boundDocument = null;
    }

    function bindDocument() {
        unbindDocument();
        if (!isImmersiveWorkActive()) return;

        try {
            var doc = frame.contentDocument;
            if (!doc) return;

            boundDocument = doc;
            boundDocument.addEventListener("pointerup", revealPeekBriefly, true);
        } catch (error) {
            boundDocument = null;
        }
    }

    function sync() {
        if (!isImmersiveWorkActive()) {
            clearHideTimer();
            unbindDocument();
            return;
        }

        if (!boundDocument) bindDocument();
        if (isHeaderCollapsed()) {
            if (boundDocument) hidePeek();
            else peekTab.hidden = false;
        } else {
            clearHideTimer();
            peekTab.hidden = true;
        }

    }

    var playerObserver = new MutationObserver(function () {
        window.requestAnimationFrame(sync);
    });
    playerObserver.observe(playerLayer, {
        attributes: true,
        attributeFilter: ["class", "data-mobile-frame"]
    });

    frame.addEventListener("load", function () {
        window.requestAnimationFrame(function () {
            bindDocument();
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
