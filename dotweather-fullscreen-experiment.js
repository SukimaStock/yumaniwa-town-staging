/* ==========================================
   DotWeather / staging-only expand experiment

   - Default: keep the existing framed phone presentation.
   - DotWeather only: double-tap the middle sky area to expand the work to the
     whole town player area.
   - Double-tap the sky again to return to the framed presentation.
   - No hint text, no fullscreen button, no auto expansion.
   - While DotWeather is framed, keep the town header visible and suppress the
     phone-layout peek tab so there is no floating control over the scene.
   ========================================== */
(function () {
    "use strict";

    var isStaging = /\/yumaniwa-town-staging(?:\/|$)/.test(window.location.pathname || "");
    if (!isStaging) return;

    var playerLayer = document.getElementById("work-player");
    var controls = document.getElementById("work-player-controls");
    var content = document.getElementById("work-player-content");
    var frame = document.getElementById("work-player-frame");
    var peekTab = document.getElementById("work-player-peek-tab");

    if (!playerLayer || !controls || !content || !frame || !peekTab) return;

    var style = document.createElement("style");
    style.id = "dotweather-expand-experiment-style";
    style.textContent = [
        '#work-player.dotweather-expanded #work-player-controls {',
        '  display: none !important;',
        '}',
        '#work-player.dotweather-expanded #work-player-content {',
        '  position: absolute !important;',
        '  inset: 0 !important;',
        '  width: 100% !important;',
        '  height: 100% !important;',
        '  padding: 0 !important;',
        '  display: block !important;',
        '  background: #070a17 !important;',
        '}',
        '#work-player.dotweather-expanded #work-player-frame {',
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
        '#work-player.dotweather-experiment-active #work-player-peek-tab {',
        '  display: none !important;',
        '}'
    ].join("\n");
    document.head.appendChild(style);

    var wasActive = false;
    var boundCanvas = null;
    var lastTapAt = 0;
    var lastTapX = 0;
    var lastTapY = 0;

    function frameLooksLikeDotWeather() {
        var src = String(frame.getAttribute("src") || frame.src || "");
        return /\/works\/dotweather\//i.test(src);
    }

    function isDotWeatherActive() {
        if (!playerLayer.classList.contains("visible")) return false;
        return window.currentWorkId === "dotweather" || frameLooksLikeDotWeather();
    }

    function clearPhoneCollapseState() {
        playerLayer.classList.remove("phone-controls-hidden");
        peekTab.hidden = true;
    }

    function setExpanded(expanded) {
        if (!isDotWeatherActive()) return;

        clearPhoneCollapseState();
        playerLayer.classList.toggle("dotweather-expanded", !!expanded);

        // Let the existing phone-layout code recalculate the framed size after
        // leaving expanded mode.
        window.requestAnimationFrame(function () {
            clearPhoneCollapseState();
            if (!expanded && typeof window.updateWorkPlayerLayoutSize === "function") {
                window.updateWorkPlayerLayoutSize();
            }
        });
    }

    function toggleExpanded() {
        setExpanded(!playerLayer.classList.contains("dotweather-expanded"));
    }

    function resetTapState() {
        lastTapAt = 0;
        lastTapX = 0;
        lastTapY = 0;
    }

    function isSkyTap(canvas, event) {
        var rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;

        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        var nx = x / rect.width;
        var ny = y / rect.height;

        // Keep the hidden gesture away from the city/menu controls at the top
        // and from the skyline / forecast rows near the bottom. The broad
        // middle band is the visual sky in both framed and expanded layouts.
        return nx >= 0.08 && nx <= 0.92 && ny >= 0.30 && ny <= 0.72;
    }

    function onCanvasPointerUp(event) {
        if (!isDotWeatherActive()) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        if (!isSkyTap(boundCanvas, event)) {
            resetTapState();
            return;
        }

        var now = Date.now();
        var rect = boundCanvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        var dt = now - lastTapAt;
        var dx = x - lastTapX;
        var dy = y - lastTapY;
        var closeEnough = (dx * dx + dy * dy) <= (42 * 42);

        if (lastTapAt && dt > 0 && dt <= 360 && closeEnough) {
            event.preventDefault();
            resetTapState();
            toggleExpanded();
            return;
        }

        lastTapAt = now;
        lastTapX = x;
        lastTapY = y;
    }

    function unbindCanvas() {
        if (!boundCanvas) return;
        boundCanvas.removeEventListener("pointerup", onCanvasPointerUp, false);
        boundCanvas = null;
        resetTapState();
    }

    function bindDotWeatherCanvas() {
        unbindCanvas();
        if (!isDotWeatherActive()) return;

        try {
            var doc = frame.contentDocument;
            var canvas = doc && doc.getElementById("gameCanvas");
            if (!canvas) return;

            boundCanvas = canvas;
            boundCanvas.addEventListener("pointerup", onCanvasPointerUp, {
                passive: false
            });
        } catch (error) {
            // DotWeather is same-origin in normal use. If that ever changes,
            // leave the experiment inactive rather than affecting the player.
            boundCanvas = null;
        }
    }

    function activateExperiment() {
        playerLayer.classList.add("dotweather-experiment-active");
        setExpanded(false);
        clearPhoneCollapseState();
        window.requestAnimationFrame(bindDotWeatherCanvas);
    }

    function deactivateExperiment() {
        unbindCanvas();
        playerLayer.classList.remove("dotweather-experiment-active");
        playerLayer.classList.remove("dotweather-expanded");
        playerLayer.classList.remove("phone-controls-hidden");
        peekTab.hidden = true;
    }

    function sync() {
        var active = isDotWeatherActive();

        if (active) {
            playerLayer.classList.add("dotweather-experiment-active");
            clearPhoneCollapseState();

            if (!wasActive) {
                activateExperiment();
            }
        } else if (wasActive) {
            deactivateExperiment();
        }

        wasActive = active;
    }

    // phone-layout.js may try to collapse the header after its normal delay.
    // For this DotWeather experiment, immediately undo that state so the only
    // transition is the deliberate sky double-tap.
    var playerObserver = new MutationObserver(function () {
        window.requestAnimationFrame(function () {
            if (isDotWeatherActive()) {
                playerLayer.classList.add("dotweather-experiment-active");
                clearPhoneCollapseState();
            }
            sync();
        });
    });
    playerObserver.observe(playerLayer, {
        attributes: true,
        attributeFilter: ["class", "data-frame-mode", "data-player-layout"]
    });

    frame.addEventListener("load", function () {
        window.requestAnimationFrame(function () {
            sync();
            bindDotWeatherCanvas();
        });
    });

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden && isDotWeatherActive()) {
            clearPhoneCollapseState();
            bindDotWeatherCanvas();
        }
    });

    window.requestAnimationFrame(sync);
})();