/* ==========================================
   DotWeather / staging-only fullscreen experiment

   Goal:
   - DotWeather only: remove the phone-frame presentation and let the iframe
     fill the available work-player area.
   - Keep the town header visible briefly on entry, then hide it automatically
     so the weather scene can become the screen itself.
   - The small top-left peek tab restores the header for a few seconds.
   - Other works keep their existing player layouts unchanged.
   ========================================== */
(function () {
    "use strict";

    var isStaging = /\/yumaniwa-town-staging(?:\/|$)/.test(window.location.pathname || "");
    if (!isStaging) return;

    var FRAME_MODE = "dotweather-fullscreen";
    var INITIAL_VISIBLE_MS = 2600;
    var REVEAL_VISIBLE_MS = 4200;

    var playerLayer = document.getElementById("work-player");
    var controls = document.getElementById("work-player-controls");
    var content = document.getElementById("work-player-content");
    var frame = document.getElementById("work-player-frame");
    var loading = document.getElementById("work-player-loading");
    var peekTab = document.getElementById("work-player-peek-tab");

    if (!playerLayer || !controls || !content || !frame || !loading || !peekTab) return;

    // Future opens use the experiment mode immediately.
    if (Array.isArray(window.WORKS)) {
        var dotweather = window.WORKS.find(function (work) {
            return work && work.id === "dotweather";
        });
        if (dotweather) {
            dotweather.frameMode = FRAME_MODE;
        }
    }

    var style = document.createElement("style");
    style.id = "dotweather-fullscreen-experiment-style";
    style.textContent = [
        '#work-player[data-frame-mode="' + FRAME_MODE + '"] #work-player-content {',
        '  padding: 0 !important;',
        '  display: block !important;',
        '  background: #070a17 !important;',
        '}',
        '#work-player[data-frame-mode="' + FRAME_MODE + '"] #work-player-frame {',
        '  position: absolute !important;',
        '  inset: 0 !important;',
        '  width: 100% !important;',
        '  height: 100% !important;',
        '  max-width: none !important;',
        '  max-height: none !important;',
        '  flex: none !important;',
        '  border-radius: 0 !important;',
        '  box-shadow: none !important;',
        '  background: #070a17 !important;',
        '}',
        '#work-player[data-frame-mode="' + FRAME_MODE + '"].dotweather-immersive #work-player-controls {',
        '  display: none !important;',
        '}',
        '#work-player[data-frame-mode="' + FRAME_MODE + '"].dotweather-immersive #work-player-content {',
        '  position: absolute !important;',
        '  inset: 0 !important;',
        '  width: 100% !important;',
        '  height: 100% !important;',
        '}',
        '#work-player[data-frame-mode="' + FRAME_MODE + '"] #work-player-peek-tab {',
        '  border-radius: 999px !important;',
        '  width: 34px !important;',
        '  height: 34px !important;',
        '  padding: 0 !important;',
        '  background: rgba(7, 10, 23, 0.48) !important;',
        '  border-color: rgba(255,255,255,0.18) !important;',
        '  backdrop-filter: blur(4px);',
        '  -webkit-backdrop-filter: blur(4px);',
        '}',
        '#work-player[data-frame-mode="' + FRAME_MODE + '"] #work-player-peek-tab span {',
        '  transform: rotate(180deg);',
        '  display: inline-block;',
        '  opacity: 0.72;',
        '}'
    ].join("\n");
    document.head.appendChild(style);

    var hideTimer = null;
    var wasActive = false;

    function clearTimer() {
        if (hideTimer) {
            window.clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    function frameLooksLikeDotWeather() {
        var src = String(frame.getAttribute("src") || frame.src || "");
        return /\/works\/dotweather\//i.test(src);
    }

    function isDotWeatherActive() {
        if (!playerLayer.classList.contains("visible")) return false;
        return window.currentWorkId === "dotweather" || frameLooksLikeDotWeather();
    }

    function applyFrameModeIfNeeded() {
        if (!isDotWeatherActive()) return false;
        if (playerLayer.dataset.frameMode !== FRAME_MODE) {
            playerLayer.dataset.frameMode = FRAME_MODE;
        }
        return true;
    }

    function clearLegacyPhoneHiddenState() {
        // phone-layout.js also controls the same town header for phone works.
        // When this experiment reveals the header, clear that older collapsed
        // state too; otherwise the peek button appears to do nothing.
        playerLayer.classList.remove("phone-controls-hidden");
    }

    function hideHeader() {
        if (!isDotWeatherActive() || loading.classList.contains("visible")) return;
        applyFrameModeIfNeeded();
        playerLayer.classList.add("dotweather-immersive");
        peekTab.hidden = false;
    }

    function showHeaderForAWhile(delay) {
        if (!isDotWeatherActive()) return;
        applyFrameModeIfNeeded();
        clearTimer();
        clearLegacyPhoneHiddenState();
        playerLayer.classList.remove("dotweather-immersive");
        peekTab.hidden = true;
        hideTimer = window.setTimeout(hideHeader, delay || REVEAL_VISIBLE_MS);
    }

    function beginExperimentForOpen() {
        clearTimer();
        applyFrameModeIfNeeded();
        clearLegacyPhoneHiddenState();
        playerLayer.classList.remove("dotweather-immersive");
        peekTab.hidden = true;

        if (!loading.classList.contains("visible")) {
            hideTimer = window.setTimeout(hideHeader, INITIAL_VISIBLE_MS);
        }
    }

    function cleanup() {
        clearTimer();
        playerLayer.classList.remove("dotweather-immersive");
    }

    function sync() {
        var active = isDotWeatherActive();

        if (active) {
            applyFrameModeIfNeeded();
            if (!wasActive) {
                beginExperimentForOpen();
            } else if (!loading.classList.contains("visible") && !hideTimer && !playerLayer.classList.contains("dotweather-immersive")) {
                hideTimer = window.setTimeout(hideHeader, INITIAL_VISIBLE_MS);
            }
        } else if (wasActive) {
            cleanup();
        }

        wasActive = active;
    }

    // Capture first so this staging experiment can restore the header even on
    // desktop, where the existing phone-only handler intentionally does nothing.
    peekTab.addEventListener("click", function (event) {
        if (!isDotWeatherActive()) return;
        event.preventDefault();
        event.stopPropagation();
        showHeaderForAWhile(REVEAL_VISIBLE_MS);
    }, true);

    var playerObserver = new MutationObserver(function () {
        window.requestAnimationFrame(sync);
    });
    playerObserver.observe(playerLayer, {
        attributes: true,
        attributeFilter: ["class", "data-frame-mode", "data-player-layout"]
    });

    var loadingObserver = new MutationObserver(function () {
        window.requestAnimationFrame(function () {
            if (!isDotWeatherActive()) return;
            if (loading.classList.contains("visible")) {
                clearTimer();
                playerLayer.classList.remove("dotweather-immersive");
                peekTab.hidden = true;
            } else {
                showHeaderForAWhile(INITIAL_VISIBLE_MS);
            }
        });
    });
    loadingObserver.observe(loading, {
        attributes: true,
        attributeFilter: ["class"]
    });

    frame.addEventListener("load", function () {
        window.requestAnimationFrame(sync);
    });

    window.addEventListener("resize", function () {
        if (isDotWeatherActive()) applyFrameModeIfNeeded();
    });

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden && isDotWeatherActive()) {
            showHeaderForAWhile(REVEAL_VISIBLE_MS);
        }
    });

    window.requestAnimationFrame(sync);
})();