/* ==========================================
   DotWeather / staging-only expand experiment

   - Default state is owned entirely by the existing phone-layout.js behavior.
     The town header may auto-collapse exactly as before.
   - DotWeather only: double-tap the middle sky area to expand the iframe to
     the whole town player area.
   - Double-tap the sky again to return to the normal framed presentation.
   - No hint text, no fullscreen button, no automatic expansion.
   - While expanded, town chrome and the peek tab are hidden.
   ========================================== */
(function () {
    "use strict";

    var isStaging = /\/yumaniwa-town-staging(?:\/|$)/.test(window.location.pathname || "");
    if (!isStaging) return;

    var playerLayer = document.getElementById("work-player");
    var content = document.getElementById("work-player-content");
    var frame = document.getElementById("work-player-frame");

    if (!playerLayer || !content || !frame) return;

    var style = document.createElement("style");
    style.id = "dotweather-expand-experiment-style";
    style.textContent = [
        '#work-player.dotweather-expanded #work-player-controls {',
        '  display: none !important;',
        '}',
        '#work-player.dotweather-expanded #work-player-peek-tab {',
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
        '  border: 0 !important;',
        '  border-radius: 0 !important;',
        '  box-shadow: none !important;',
        '  background: #070a17 !important;',
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

    function notifyDotWeatherResize() {
        function dispatchResize() {
            if (!isDotWeatherActive()) return;
            try {
                var win = frame.contentWindow;
                if (win) win.dispatchEvent(new Event("resize"));
            } catch (error) {
                // Same-origin in normal use. If that changes, simply skip it.
            }
        }

        window.requestAnimationFrame(dispatchResize);
        window.setTimeout(dispatchResize, 80);
        window.setTimeout(dispatchResize, 220);
    }

    function setExpanded(expanded) {
        if (!isDotWeatherActive()) return;

        playerLayer.classList.toggle("dotweather-expanded", !!expanded);

        // The iframe viewport changes substantially here. Safari can lag a
        // frame before reporting the new innerWidth / innerHeight, so notify
        // DotWeather more than once after layout settles.
        notifyDotWeatherResize();

        if (!expanded && typeof window.updateWorkPlayerLayoutSize === "function") {
            window.requestAnimationFrame(function () {
                window.updateWorkPlayerLayoutSize();
                notifyDotWeatherResize();
            });
        }
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

        // Avoid city/menu controls at the top and the skyline / forecast area
        // at the bottom. This middle band is open sky in both view modes.
        return nx >= 0.08 && nx <= 0.92 && ny >= 0.30 && ny <= 0.72;
    }

    function onCanvasPointerUp(event) {
        if (!isDotWeatherActive() || !boundCanvas) return;
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
            boundCanvas = null;
        }
    }

    function activateExperiment() {
        playerLayer.classList.remove("dotweather-expanded");
        window.requestAnimationFrame(bindDotWeatherCanvas);
    }

    function deactivateExperiment() {
        unbindCanvas();
        playerLayer.classList.remove("dotweather-expanded");
    }

    function sync() {
        var active = isDotWeatherActive();

        if (active && !wasActive) {
            activateExperiment();
        } else if (!active && wasActive) {
            deactivateExperiment();
        }

        wasActive = active;
    }

    // Observe only open/close/layout changes. Do not modify phone-controls-hidden:
    // that class belongs to the existing automatic town-header behavior.
    var playerObserver = new MutationObserver(function () {
        window.requestAnimationFrame(sync);
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
            bindDotWeatherCanvas();
            notifyDotWeatherResize();
        }
    });

    window.requestAnimationFrame(sync);
})();
