/* ==========================================
   DotWeather / staging-only expand experiment

   - Default: keep the existing framed phone presentation.
   - The town header may auto-collapse as before, but DotWeather's framed size
     stays fixed so header collapse does not become a second enlargement step.
   - Double-tap the middle sky area to expand to the whole town player area.
   - Double-tap the sky again to return to the same framed size.
   - No hint text, no fullscreen button, no automatic expansion.
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
        '#work-player.dotweather-expand-ready:not(.dotweather-expanded) #work-player-frame {',
        '  width: var(--dotweather-framed-width) !important;',
        '  height: var(--dotweather-framed-height) !important;',
        '  flex: 0 0 auto !important;',
        '}',
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
    var framedWidth = 0;
    var framedHeight = 0;

    function frameLooksLikeDotWeather() {
        var src = String(frame.getAttribute("src") || frame.src || "");
        return /\/works\/dotweather\//i.test(src);
    }

    function isDotWeatherActive() {
        if (!playerLayer.classList.contains("visible")) return false;
        return window.currentWorkId === "dotweather" || frameLooksLikeDotWeather();
    }

    function hasStoredFramedSize() {
        return framedWidth > 0 && framedHeight > 0;
    }

    function applyStoredFramedSize() {
        if (!hasStoredFramedSize()) return;
        playerLayer.style.setProperty("--dotweather-framed-width", framedWidth + "px");
        playerLayer.style.setProperty("--dotweather-framed-height", framedHeight + "px");
        playerLayer.classList.add("dotweather-expand-ready");
    }

    function captureFramedSize() {
        if (!isDotWeatherActive()) return false;
        if (playerLayer.classList.contains("dotweather-expanded")) return false;
        if (playerLayer.classList.contains("phone-controls-hidden")) return false;

        var rect = frame.getBoundingClientRect();
        if (!rect || rect.width < 40 || rect.height < 80) return false;

        framedWidth = Math.round(rect.width * 100) / 100;
        framedHeight = Math.round(rect.height * 100) / 100;
        applyStoredFramedSize();
        return true;
    }

    function scheduleInitialFrameCapture() {
        window.requestAnimationFrame(function () {
            if (captureFramedSize()) return;
            window.setTimeout(captureFramedSize, 80);
        });
    }

    function notifyDotWeatherResize() {
        function dispatchResize() {
            if (!isDotWeatherActive()) return;
            try {
                var win = frame.contentWindow;
                if (win) win.dispatchEvent(new Event("resize"));
            } catch (error) {
                // DotWeather is same-origin in normal use.
            }
        }

        window.requestAnimationFrame(dispatchResize);
        window.setTimeout(dispatchResize, 80);
        window.setTimeout(dispatchResize, 220);
    }

    function setExpanded(expanded) {
        if (!isDotWeatherActive()) return;

        if (!expanded && !hasStoredFramedSize()) {
            captureFramedSize();
        }

        playerLayer.classList.toggle("dotweather-expanded", !!expanded);

        if (!expanded) {
            applyStoredFramedSize();
        }

        notifyDotWeatherResize();

        if (!expanded && typeof window.updateWorkPlayerLayoutSize === "function") {
            window.requestAnimationFrame(function () {
                window.updateWorkPlayerLayoutSize();
                applyStoredFramedSize();
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
        framedWidth = 0;
        framedHeight = 0;
        playerLayer.classList.remove("dotweather-expanded");
        playerLayer.classList.remove("dotweather-expand-ready");
        playerLayer.style.removeProperty("--dotweather-framed-width");
        playerLayer.style.removeProperty("--dotweather-framed-height");
        scheduleInitialFrameCapture();
        window.requestAnimationFrame(bindDotWeatherCanvas);
    }

    function deactivateExperiment() {
        unbindCanvas();
        framedWidth = 0;
        framedHeight = 0;
        playerLayer.classList.remove("dotweather-expanded");
        playerLayer.classList.remove("dotweather-expand-ready");
        playerLayer.style.removeProperty("--dotweather-framed-width");
        playerLayer.style.removeProperty("--dotweather-framed-height");
    }

    function sync() {
        var active = isDotWeatherActive();

        if (active && !wasActive) {
            activateExperiment();
        } else if (!active && wasActive) {
            deactivateExperiment();
        }

        // If phone-layout auto-collapses the town header, keep the already
        // captured DotWeather window size instead of letting it grow.
        if (active && hasStoredFramedSize() && !playerLayer.classList.contains("dotweather-expanded")) {
            applyStoredFramedSize();
        }

        wasActive = active;
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
            sync();
            scheduleInitialFrameCapture();
            bindDotWeatherCanvas();
        });
    });

    window.addEventListener("resize", function () {
        if (!isDotWeatherActive()) return;

        // Re-measure on a genuinely new viewport when the town header is
        // visible. Otherwise preserve the current framed size until next open.
        if (!playerLayer.classList.contains("phone-controls-hidden") &&
            !playerLayer.classList.contains("dotweather-expanded")) {
            framedWidth = 0;
            framedHeight = 0;
            playerLayer.classList.remove("dotweather-expand-ready");
            playerLayer.style.removeProperty("--dotweather-framed-width");
            playerLayer.style.removeProperty("--dotweather-framed-height");
            scheduleInitialFrameCapture();
        }
    });

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden && isDotWeatherActive()) {
            window.requestAnimationFrame(function () {
                if (!hasStoredFramedSize()) scheduleInitialFrameCapture();
                bindDotWeatherCanvas();
            });
        }
    });

    window.requestAnimationFrame(sync);
})();
