// DioramaCalendar — Factory runtime
// SukimaStock Engine v0.1.1
(function () {
  "use strict";

  const LOGICAL_W = 360;
  const LOGICAL_H = 640;

  const CONFIG = {
    dioramaSize: 340,
    centerX: 180,
    centerY: 330,
    // Match the original Codea version: S()*0.20 was roughly 72px on a
    // 360-wide logical canvas.  v0.2 used only 18px, which made the
    // diorama feel almost flat.
    parallaxPx: 72,
    // Portrait handheld neutral: a calendar is normally viewed with the phone
    // mostly upright, but slightly reclined rather than perfectly vertical.
    sensorNeutralBetaDeg: 72,
    sensorRangeXDeg: 18,
    sensorRangeYDeg: 18,
    motionRange: 2.4,
    smoothing: 7.5,
    dragGain: 2.0,
    maxTilt: 1.0,
    tapMovePx: 10,
    monthFadeSeconds: 0.50,
    monthLayerStaggerSeconds: 0.060,
  };

  const THEME_CONFIG = window.DIORAMA_THEME_CONFIG || {};
  const THEMES = THEME_CONFIG.themes || {};
  const THEME_ORDER = Array.isArray(THEME_CONFIG.themeOrder)
    ? THEME_CONFIG.themeOrder.filter((key) => THEMES[key])
    : Object.keys(THEMES);

  function themeForMonth(monthIndex) {
    const monthNumber = ((monthIndex % 12) + 12) % 12 + 1;
    const mapped = THEME_CONFIG.monthMap && THEME_CONFIG.monthMap[String(monthNumber)];
    if (mapped && THEMES[mapped]) return mapped;

    for (const [key, theme] of Object.entries(THEMES)) {
      if (Number(theme.month) === monthNumber) return key;
    }

    return THEME_ORDER[monthNumber - 1] || THEME_ORDER[0] || Object.keys(THEMES)[0] || "sunset";
  }

  const START_DATE = new Date();

  const LAYERS = [
    // Depths intentionally mirror the feel of the original Codea build:
    // far back moves opposite to the frame, creating a much wider reveal.
    { key: "back",    depth: -0.30, scale: 1.00 },
    { key: "midback", depth: -0.20, scale: 1.00 },
    { key: "mid",     depth: -0.10, scale: 1.00 },
    { key: "front",   depth:  0.00, scale: 0.94 },
    { key: "matte",   depth:  0.20, scale: 1.00 },
    { key: "frame",   depth:  0.20, scale: 1.00 },
  ];

  const state = {
    images: { common: {}, themes: {} },
    theme: themeForMonth(START_DATE.getMonth()),
    viewYear: START_DATE.getFullYear(),
    viewMonth: START_DATE.getMonth(),
    tilt: { x: 0, y: 0 },
    manual: { x: 0, y: 0 },
    sensor: { x: 0, y: 0 },
    sensorRaw: { x: 0, y: 0 },
    sensorAvailable: false,
    sensorActive: false,
    sensorStatus: "none", // none | insecure | needs-permission | waiting | active | denied | unavailable
    sensorSource: "none", // none | orientation | motion
    sensorTimer: null,
    motionRaw: { x: 0, y: 0 },
    motionBias: { x: 0, y: 0 },
    motionHasBias: false,
    dragging: false,
    lastPointer: null,
    pointerStart: null,
    pointerMode: "none", // none | frame | outside
    pointerMoved: false,
    transition: {
      active: false,
      elapsed: 0,
      duration: 0,
      fromYear: null,
      fromMonth: null,
      fromTheme: null,
    },
    pendingMonth: null,
    reducedMotion: false,
  };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function lerpExp(current, target, speed, dt) {
    const t = 1 - Math.exp(-speed * Math.max(0, dt || 0));
    return current + (target - current) * t;
  }

  function rotateForScreen(x, y) {
    let angle = 0;
    if (screen.orientation && Number.isFinite(screen.orientation.angle)) {
      angle = screen.orientation.angle;
    } else if (Number.isFinite(window.orientation)) {
      angle = Number(window.orientation);
    }
    const r = angle * Math.PI / 180;
    return {
      x: x * Math.cos(r) - y * Math.sin(r),
      y: x * Math.sin(r) + y * Math.cos(r),
    };
  }

  function isTrustedSensorContext() {
    // Device orientation/motion is a secure-context API. Browsers treat
    // localhost as trustworthy, but a LAN IP over plain HTTP is not.
    if (window.isSecureContext) return true;
    const host = String(location.hostname || "");
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  }

  function calibrateMotion() {
    state.motionBias.x = state.motionRaw.x;
    state.motionBias.y = state.motionRaw.y;
    state.motionHasBias = true;
    state.sensor.x = 0;
    state.sensor.y = 0;
  }

  function markSensorActive(source) {
    if (state.sensorTimer) {
      clearTimeout(state.sensorTimer);
      state.sensorTimer = null;
    }
    if (state.sensorSource !== source) {
      state.sensorSource = source;
      state.motionHasBias = false;
    }
    state.sensorAvailable = true;
    state.sensorActive = true;
    state.sensorStatus = "active";
  }

  function handleOrientation(e) {
    if (!Number.isFinite(e.gamma) || !Number.isFinite(e.beta)) return;

    // Do not calibrate against the first sensor sample: on iOS that sample is
    // often captured while the user is reaching to dismiss the permission
    // dialog. Instead use a stable portrait viewing posture as neutral.
    //
    // gamma 0deg  = no left/right roll
    // beta 72deg  = mostly upright, slightly reclined natural handheld posture
    const oriented = rotateForScreen(
      e.gamma,
      e.beta - CONFIG.sensorNeutralBetaDeg
    );
    state.sensorRaw.x = oriented.x;
    state.sensorRaw.y = oriented.y;
    markSensorActive("orientation");

    const dx = state.sensorRaw.x / CONFIG.sensorRangeXDeg;
    // Screen y is up in Codea Lite, so invert beta delta for a natural feel.
    const dy = -state.sensorRaw.y / CONFIG.sensorRangeYDeg;
    state.sensor.x = clamp(dx, -CONFIG.maxTilt, CONFIG.maxTilt);
    state.sensor.y = clamp(dy, -CONFIG.maxTilt, CONFIG.maxTilt);
  }

  function handleMotion(e) {
    // DeviceOrientation is more stable when available. Motion is a fallback for
    // browsers that expose only accelerationIncludingGravity.
    if (state.sensorSource === "orientation" && state.sensorActive) return;
    const a = e.accelerationIncludingGravity;
    if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y)) return;

    const oriented = rotateForScreen(a.x, a.y);
    state.motionRaw.x = oriented.x;
    state.motionRaw.y = oriented.y;
    markSensorActive("motion");

    if (!state.motionHasBias) calibrateMotion();

    const dx = (state.motionRaw.x - state.motionBias.x) / CONFIG.motionRange;
    const dy = -(state.motionRaw.y - state.motionBias.y) / CONFIG.motionRange;
    state.sensor.x = clamp(dx, -CONFIG.maxTilt, CONFIG.maxTilt);
    state.sensor.y = clamp(dy, -CONFIG.maxTilt, CONFIG.maxTilt);
  }

  function addSensorListeners({ orientation = true, motion = true } = {}) {
    if (orientation && "DeviceOrientationEvent" in window) {
      window.removeEventListener("deviceorientation", handleOrientation, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
    if (motion && "DeviceMotionEvent" in window) {
      window.removeEventListener("devicemotion", handleMotion, true);
      window.addEventListener("devicemotion", handleMotion, true);
    }
    state.sensorStatus = "waiting";
    if (state.sensorTimer) clearTimeout(state.sensorTimer);
    state.sensorTimer = setTimeout(() => {
      if (!state.sensorActive && state.sensorStatus === "waiting") {
        state.sensorStatus = "unavailable";
      }
    }, 1800);
  }

  function installSensor() {
    if (!isTrustedSensorContext()) {
      state.sensorStatus = "insecure";
      return;
    }

    const hasOrientation = "DeviceOrientationEvent" in window;
    const hasMotion = "DeviceMotionEvent" in window;
    if (!hasOrientation && !hasMotion) {
      state.sensorStatus = "none";
      return;
    }

    const orientationNeedsPermission =
      hasOrientation && typeof DeviceOrientationEvent.requestPermission === "function";
    const motionNeedsPermission =
      hasMotion && typeof DeviceMotionEvent.requestPermission === "function";

    if (orientationNeedsPermission || motionNeedsPermission) {
      state.sensorStatus = "needs-permission";
    } else {
      addSensorListeners({ orientation: hasOrientation, motion: hasMotion });
    }

    const resetBias = () => {
      state.motionHasBias = false;
    };
    window.addEventListener("orientationchange", resetBias, { passive: true });
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener("change", resetBias);
    }
  }

  function requestSensorPermission() {
    if (!isTrustedSensorContext()) {
      state.sensorStatus = "insecure";
      return;
    }

    const hasOrientation = "DeviceOrientationEvent" in window;
    const hasMotion = "DeviceMotionEvent" in window;
    const requests = [];

    // Invoke both permission calls immediately inside the same user gesture.
    // This follows the current MDN guidance for iOS/WebKit-style browsers.
    if (hasOrientation && typeof DeviceOrientationEvent.requestPermission === "function") {
      requests.push(
        DeviceOrientationEvent.requestPermission()
          .then((result) => ({ kind: "orientation", result }))
          .catch(() => ({ kind: "orientation", result: "denied" }))
      );
    }
    if (hasMotion && typeof DeviceMotionEvent.requestPermission === "function") {
      requests.push(
        DeviceMotionEvent.requestPermission()
          .then((result) => ({ kind: "motion", result }))
          .catch(() => ({ kind: "motion", result: "denied" }))
      );
    }

    state.sensorStatus = "waiting";

    if (requests.length === 0) {
      addSensorListeners({ orientation: hasOrientation, motion: hasMotion });
      return;
    }

    Promise.all(requests).then((results) => {
      const orientationGranted = results.some(
        (item) => item.kind === "orientation" && item.result === "granted"
      );
      const motionGranted = results.some(
        (item) => item.kind === "motion" && item.result === "granted"
      );

      if (!orientationGranted && !motionGranted) {
        state.sensorStatus = "denied";
        return;
      }

      state.motionHasBias = false;
      addSensorListeners({
        orientation: orientationGranted || (
          hasOrientation && typeof DeviceOrientationEvent.requestPermission !== "function"
        ),
        motion: motionGranted || (
          hasMotion && typeof DeviceMotionEvent.requestPermission !== "function"
        ),
      });
    });
  }

  function themeAssetFiles(themeKey) {
    const theme = THEMES[themeKey];
    return theme && theme.assets ? Object.values(theme.assets) : [];
  }

  function loadTheme(themeKey) {
    const theme = THEMES[themeKey];
    if (!theme) return null;
    if (state.images.themes[themeKey]) return state.images.themes[themeKey];

    const set = {};
    for (const [key, file] of Object.entries(theme.assets || {})) {
      set[key] = loadImage(file);
    }
    state.images.themes[themeKey] = set;
    return set;
  }

  function themeReady(themeKey) {
    const theme = THEMES[themeKey];
    const set = state.images.themes[themeKey];
    if (!theme || !set) return false;
    return Object.keys(theme.assets || {}).every((key) => {
      const image = set[key];
      return Boolean(image && image.loaded && !image.error);
    });
  }

  function themeFailed(themeKey) {
    const theme = THEMES[themeKey];
    const set = state.images.themes[themeKey];
    if (!theme || !set) return false;
    return Object.keys(theme.assets || {}).some((key) => Boolean(set[key] && set[key].error));
  }

  function releaseTheme(themeKey) {
    const theme = THEMES[themeKey];
    if (!theme || !state.images.themes[themeKey]) return;

    // Codea Lite keeps loaded images in its own Map. Remove themes that are no
    // longer adjacent so Safari can release their decoded pixel buffers.
    const codeaState = window.CodeaLite && window.CodeaLite.state;
    const cache = codeaState && codeaState.imageCache;

    for (const file of themeAssetFiles(themeKey)) {
      if (!cache || typeof cache.get !== "function") continue;
      const image = cache.get(String(file));
      if (image) {
        const element = image.element;
        if (element) {
          element.onload = null;
          element.onerror = null;
          try {
            element.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
          } catch (_) {
            // Best effort only; deleting the JS references is still useful.
          }
        }
        image.element = null;
        image.loaded = false;
        image.width = 0;
        image.height = 0;
        if (typeof cache.delete === "function") cache.delete(String(file));
      }
    }

    delete state.images.themes[themeKey];
  }

  function themeWindow(year, monthIndex) {
    const keys = new Set();
    for (const delta of [-1, 0, 1]) {
      const date = new Date(year, monthIndex + delta, 1);
      keys.add(themeForMonth(date.getMonth()));
    }
    return keys;
  }

  function syncThemeWindow(year = state.viewYear, monthIndex = state.viewMonth) {
    const keep = themeWindow(year, monthIndex);

    // Initiate the three required themes in current-first order so first paint
    // is not competing with the whole year. Neighbours are ready for the fade.
    loadTheme(themeForMonth(monthIndex));
    loadTheme(themeForMonth(new Date(year, monthIndex - 1, 1).getMonth()));
    loadTheme(themeForMonth(new Date(year, monthIndex + 1, 1).getMonth()));

    for (const themeKey of Object.keys(state.images.themes)) {
      if (!keep.has(themeKey)) releaseTheme(themeKey);
    }
  }

  function loadAssets() {
    state.images.common.matte = loadImage("assets/matte.png");
    state.images.common.frame = loadImage("assets/frame.png");
    syncThemeWindow(state.viewYear, state.viewMonth);
  }

  function setViewDate(year, monthIndex) {
    const date = new Date(year, monthIndex, 1);
    state.viewYear = date.getFullYear();
    state.viewMonth = date.getMonth();
    state.theme = themeForMonth(state.viewMonth);
  }

  function beginMonthChange(targetYear, targetMonth) {
    const fromYear = state.viewYear;
    const fromMonth = state.viewMonth;
    const fromTheme = state.theme;

    setViewDate(targetYear, targetMonth);
    syncThemeWindow(state.viewYear, state.viewMonth);

    // Respect reduced-motion preferences by switching immediately.
    if (state.reducedMotion || CONFIG.monthFadeSeconds <= 0) return true;

    state.transition.active = true;
    state.transition.elapsed = 0;
    state.transition.duration = CONFIG.monthFadeSeconds;
    state.transition.fromYear = fromYear;
    state.transition.fromMonth = fromMonth;
    state.transition.fromTheme = fromTheme;
    return true;
  }

  function cycleMonth(delta) {
    // Ignore repeated taps while a fade or a not-yet-decoded neighbour is pending.
    if (state.transition.active || state.pendingMonth) return false;

    const targetDate = new Date(state.viewYear, state.viewMonth + delta, 1);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetTheme = themeForMonth(targetMonth);

    // The neighbour should normally already be decoded. If a very fast first
    // tap beats image decoding, wait silently and start the same fade as soon
    // as the four target layers are ready rather than showing blank layers.
    loadTheme(targetTheme);
    if (!themeReady(targetTheme)) {
      state.pendingMonth = { year: targetYear, month: targetMonth, theme: targetTheme };
      return true;
    }

    return beginMonthChange(targetYear, targetMonth);
  }

  function updatePendingMonth() {
    const pending = state.pendingMonth;
    if (!pending || state.transition.active) return;

    if (themeFailed(pending.theme)) {
      state.pendingMonth = null;
      return;
    }

    if (themeReady(pending.theme)) {
      state.pendingMonth = null;
      beginMonthChange(pending.year, pending.month);
    }
  }

  function imageForLayer(key, themeKey = state.theme) {
    if (key === "matte" || key === "frame") return state.images.common[key];
    const themeSet = state.images.themes[themeKey] || {};
    return themeSet[key];
  }

  function layerOffset(depth, themeKey = state.theme) {
    const theme = THEMES[themeKey] || {};
    const px = CONFIG.parallaxPx * (Number(theme.parallaxMultiplier) || 1);
    return {
      x: state.tilt.x * px * depth,
      y: state.tilt.y * px * depth,
    };
  }

  function drawLayer(key, themeKey = state.theme) {
    const layer = LAYERS.find((item) => item.key === key);
    if (!layer) return;
    const image = imageForLayer(key, themeKey);
    if (!image) return;

    const offset = layerOffset(layer.depth, themeKey);
    const theme = THEMES[themeKey] || {};
    const themeScale = theme.layerScale && Number(theme.layerScale[key]);
    const size = CONFIG.dioramaSize * layer.scale * (Number.isFinite(themeScale) ? themeScale : 1);
    sprite(
      image,
      CONFIG.centerX + offset.x,
      CONFIG.centerY + offset.y,
      size,
      size
    );
  }

  function calendarGeometry(themeKey = state.theme) {
    // Tuned to sit inside the central window of the generated BACK layer.
    return {
      cx: CONFIG.centerX,
      cy: CONFIG.centerY + (Number((THEMES[themeKey] || {}).calendarOffsetY) || 35),
      w: 190,
      h: 170,
      depth: 0.15,
    };
  }

  function drawCalendar(
    year = state.viewYear,
    month = state.viewMonth,
    themeKey = state.theme,
    alpha = 1
  ) {
    const ctx = window.CodeaLite && window.CodeaLite.state && window.CodeaLite.state.ctx;
    const opacity = clamp(Number(alpha), 0, 1);
    if (opacity <= 0) return;

    if (ctx) {
      ctx.save();
      ctx.globalAlpha *= opacity;
    }

    try {
      const now = new Date();
      const today = now.getDate();
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

      const g = calendarGeometry(themeKey);
      const offset = layerOffset(g.depth, themeKey);
      const cx = g.cx + offset.x;
      const cy = g.cy + offset.y;

      pushStyle();
      rectMode(CENTER);
      textMode(CENTER);
      noStroke();

      // Translucent paper: enough contrast to read, while preserving the window.
      fill(247, 244, 235, 118);
      rect(cx, cy, g.w, g.h, 5);

      fill(54, 51, 48, 238);
      font("Georgia");
      fontSize(17);
      text(monthNames[month] + " " + year, cx, cy + 63);

      const contentW = g.w - 24;
      const cellW = contentW / 7;
      const startX = cx - contentW / 2 + cellW / 2;
      const dayY = cy + 39;

      fontSize(9.5);
      fill(92, 87, 82, 220);
      for (let i = 0; i < 7; i += 1) {
        text(dayLabels[i], startX + i * cellW, dayY);
      }

      const firstWeekday = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const cellH = 19.5;
      let col = firstWeekday;
      let row = 0;

      fontSize(10.5);
      for (let day = 1; day <= daysInMonth; day += 1) {
        const x = startX + col * cellW;
        const y = dayY - 20 - row * cellH;

        if (isCurrentMonth && day === today) {
          fill(204, 94, 87, 218);
          ellipse(x, y, 17, 17);
          fill(255, 252, 245, 255);
        } else {
          fill(70, 67, 63, 230);
        }
        text(String(day), x, y + 0.3);

        col += 1;
        if (col >= 7) {
          col = 0;
          row += 1;
        }
      }

      popStyle();
    } finally {
      if (ctx) ctx.restore();
    }
  }

  function drawThemedLayer(layerKey, themeKey, alpha = 1) {
    const ctx = window.CodeaLite && window.CodeaLite.state && window.CodeaLite.state.ctx;
    const opacity = clamp(Number(alpha), 0, 1);
    if (opacity <= 0) return;

    if (ctx) {
      ctx.save();
      ctx.globalAlpha *= opacity;
    }
    try {
      drawLayer(layerKey, themeKey);
    } finally {
      if (ctx) ctx.restore();
    }
  }

  function drawMonthContent(themeKey, year, month, alpha = 1) {
    drawThemedLayer("back", themeKey, alpha);
    drawThemedLayer("midback", themeKey, alpha);
    drawThemedLayer("mid", themeKey, alpha);
    drawThemedLayer("front", themeKey, alpha);
    drawCalendar(year, month, themeKey, alpha);
  }

  function smoothstep01(t) {
    const clamped = clamp(t, 0, 1);
    return clamped * clamped * (3 - 2 * clamped);
  }

  function transitionProgress() {
    if (!state.transition.active || state.transition.duration <= 0) return 1;
    const t = clamp(state.transition.elapsed / state.transition.duration, 0, 1);
    return smoothstep01(t);
  }

  function staggeredTransitionProgress(delaySeconds = 0) {
    if (!state.transition.active || state.transition.duration <= 0) return 1;
    const delay = Math.max(0, Number(delaySeconds) || 0);
    const remaining = Math.max(0.0001, state.transition.duration - delay);
    const t = clamp((state.transition.elapsed - delay) / remaining, 0, 1);
    return smoothstep01(t);
  }

  function drawLayeredTransition() {
    const fromTheme = state.transition.fromTheme;
    if (!state.transition.active || !fromTheme) {
      drawMonthContent(state.theme, state.viewYear, state.viewMonth, 1);
      return;
    }

    const fromYear = state.transition.fromYear;
    const fromMonth = state.transition.fromMonth;
    const stagger = CONFIG.monthLayerStaggerSeconds;

    // True layer-by-layer crossfade: each old layer fades out while the
    // corresponding new layer fades in. This avoids the brief doubled-room
    // look that can feel like a rendering glitch.
    const layerSpecs = [
      ["back", 0 * stagger],
      ["midback", 1 * stagger],
      ["mid", 2 * stagger],
      ["front", 3 * stagger],
    ];

    for (const [layerKey, delay] of layerSpecs) {
      const p = staggeredTransitionProgress(delay);
      drawThemedLayer(layerKey, fromTheme, 1 - p);
      drawThemedLayer(layerKey, state.theme, p);
    }

    const calendarP = staggeredTransitionProgress(2.2 * stagger);
    drawCalendar(fromYear, fromMonth, fromTheme, 1 - calendarP);
    drawCalendar(state.viewYear, state.viewMonth, state.theme, calendarP);
  }

  function frameHitGeometry() {
    // Interaction follows the visible blue wooden frame, not the paper calendar.
    // frame.png contains transparent padding, so use the measured visible-frame
    // footprint rather than the full 340px sprite square.
    const frame = LAYERS.find((item) => item.key === "frame");
    const offset = layerOffset(frame ? frame.depth : 0.20);
    return {
      cx: CONFIG.centerX + offset.x,
      cy: CONFIG.centerY + offset.y,
      w: CONFIG.dioramaSize * 0.88,
      h: CONFIG.dioramaSize * 0.85,
      radius: 38,
    };
  }

  function isInsideFrame(x, y) {
    const g = frameHitGeometry();
    const dx = Math.abs(x - g.cx);
    const dy = Math.abs(y - g.cy);
    const hw = g.w / 2;
    const hh = g.h / 2;
    const r = Math.min(g.radius, hw, hh);

    if (dx > hw || dy > hh) return false;
    if (dx <= hw - r || dy <= hh - r) return true;

    const cornerX = dx - (hw - r);
    const cornerY = dy - (hh - r);
    return cornerX * cornerX + cornerY * cornerY <= r * r;
  }

  function drawOuterCover() {
    // The generated matte is only as large as the frame sprite. With the wider
    // original-style parallax, inner layers can move beyond that square. Cover
    // everything outside the moving frame square so no image strip leaks out.
    //
    // Desktop browsers often scale the 360x640 logical canvas by a fractional
    // amount. If these cover rectangles meet the moving square on the exact
    // same subpixel boundary, canvas antialiasing can leave a 1px seam where
    // the BACK layer peeks through. Slightly overlap the cover into the frame
    // square; frame.png is drawn afterwards, so this overlap stays invisible.
    const frame = LAYERS.find((item) => item.key === "frame");
    const offset = layerOffset(frame ? frame.depth : 0.20);
    const half = CONFIG.dioramaSize / 2;
    const left = CONFIG.centerX + offset.x - half;
    const right = CONFIG.centerX + offset.x + half;
    const bottom = CONFIG.centerY + offset.y - half;
    const top = CONFIG.centerY + offset.y + half;
    const bleed = 1.25;

    pushStyle();
    rectMode(CORNER);
    noStroke();
    fill(247, 245, 239, 255);
    rect(0, 0, Math.max(0, left + bleed), LOGICAL_H);
    rect(right - bleed, 0, Math.max(0, LOGICAL_W - right + bleed), LOGICAL_H);
    rect(
      left - bleed,
      0,
      Math.max(0, right - left + bleed * 2),
      Math.max(0, bottom + bleed)
    );
    rect(
      left - bleed,
      top - bleed,
      Math.max(0, right - left + bleed * 2),
      Math.max(0, LOGICAL_H - top + bleed)
    );
    popStyle();
  }

  function updateTilt(dt) {
    const useSensor = state.sensorActive && !state.reducedMotion;
    const baseX = useSensor ? state.sensor.x : 0;
    const baseY = useSensor ? state.sensor.y : 0;

    let goalX = baseX + state.manual.x;
    let goalY = baseY + state.manual.y;

    if (state.reducedMotion) {
      goalX *= 0.22;
      goalY *= 0.22;
    }

    goalX = clamp(goalX, -CONFIG.maxTilt, CONFIG.maxTilt);
    goalY = clamp(goalY, -CONFIG.maxTilt, CONFIG.maxTilt);

    state.tilt.x = lerpExp(state.tilt.x, goalX, CONFIG.smoothing, dt);
    state.tilt.y = lerpExp(state.tilt.y, goalY, CONFIG.smoothing, dt);

    if (!state.dragging) {
      state.manual.x = lerpExp(state.manual.x, 0, 2.6, dt);
      state.manual.y = lerpExp(state.manual.y, 0, 2.6, dt);
    }
  }

  function updateTransition(dt) {
    if (!state.transition.active) return;
    state.transition.elapsed += Math.max(0, Number(dt) || 0);
    if (state.transition.elapsed >= state.transition.duration) {
      state.transition.active = false;
      state.transition.elapsed = state.transition.duration;
      state.transition.fromYear = null;
      state.transition.fromMonth = null;
      state.transition.fromTheme = null;
    }
  }

  const calendarScene = {
    opaque: true,

    enter() {
      const now = new Date();
      setViewDate(now.getFullYear(), now.getMonth());
      loadAssets();
      state.reducedMotion = Boolean(
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
      installSensor();
    },

    update(dt) {
      updateTilt(dt);
      updatePendingMonth();
      updateTransition(dt);
    },

    draw() {
      background(247, 245, 239, 255);

      // Keep the blue wooden frame fixed while the room + calendar transition.
      // The new month appears from the back layer toward the front so the
      // seasonal change feels tied to the diorama depth rather than to a flat UI fade.
      drawLayeredTransition();

      drawLayer("matte");
      drawOuterCover();
      drawLayer("frame");

    },

    touch(touch) {
      // Keep the transition visually clean: new gestures start only after the
      // current crossfade has finished.
      if ((state.transition.active || state.pendingMonth) && touch.state === BEGAN) {
        return true;
      }

      if (touch.state === BEGAN) {
        const insideFrame = isInsideFrame(touch.x, touch.y);
        state.pointerStart = { x: touch.x, y: touch.y };
        state.lastPointer = { x: touch.x, y: touch.y };
        state.pointerMoved = false;
        state.pointerMode = insideFrame ? "frame" : "outside";
        state.dragging = insideFrame;

        // On touch devices, pointerdown does not create transient user activation.
        // Sensor permission is therefore requested on ENDED (pointerup) instead.
        return true;
      }

      if (touch.state === MOVING) {
        if (state.pointerStart) {
          const totalDx = touch.x - state.pointerStart.x;
          const totalDy = touch.y - state.pointerStart.y;
          if (Math.hypot(totalDx, totalDy) > CONFIG.tapMovePx) {
            state.pointerMoved = true;
          }
        }

        // Manual parallax is restricted to gestures that START inside the
        // framed diorama. Moving into the frame from outside does not change
        // modes mid-gesture.
        if (state.pointerMode === "frame" && state.dragging && state.lastPointer) {
          const dx = (touch.x - state.lastPointer.x) / (LOGICAL_W * 0.5);
          const dy = (touch.y - state.lastPointer.y) / (LOGICAL_H * 0.5);
          state.manual.x = clamp(
            state.manual.x + dx * CONFIG.dragGain,
            -CONFIG.maxTilt,
            CONFIG.maxTilt
          );
          state.manual.y = clamp(
            state.manual.y + dy * CONFIG.dragGain,
            -CONFIG.maxTilt,
            CONFIG.maxTilt
          );
          state.lastPointer = { x: touch.x, y: touch.y };
        }
        return true;
      }

      if (touch.state === ENDED) {
        const stationaryFrameTap =
          state.pointerMode === "frame" &&
          state.pointerStart &&
          !state.pointerMoved;

        // Touchscreen transient activation is created by pointerup/touchend,
        // not pointerdown. Request motion/orientation permission here so
        // iOS Safari sees a valid user activation and can show its native prompt.
        // The first permission tap is consumed by permission setup rather than
        // also changing the displayed month.
        if (stationaryFrameTap && state.sensorStatus === "needs-permission") {
          requestSensorPermission();

          state.dragging = false;
          state.lastPointer = null;
          state.pointerStart = null;
          state.pointerMode = "none";
          state.pointerMoved = false;
          return true;
        }

        // A short, stationary tap anywhere inside the framed diorama changes
        // month. Left half = previous month, right half = next month.
        // A drag uses the exact same area for parallax instead.
        if (stationaryFrameTap) {
          cycleMonth(state.pointerStart.x < CONFIG.centerX ? -1 : 1);
        }

        state.dragging = false;
        state.lastPointer = null;
        state.pointerStart = null;
        state.pointerMode = "none";
        state.pointerMoved = false;
        return true;
      }

      if (touch.state === CANCELLED) {
        state.dragging = false;
        state.lastPointer = null;
        state.pointerStart = null;
        state.pointerMode = "none";
        state.pointerMoved = false;
        return true;
      }

      return true;
    },
  };

  SSE.createApp({
    id: "diorama-calendar",
    logicalWidth: LOGICAL_W,
    logicalHeight: LOGICAL_H,
    initialScene: "calendar",
    debug: false,

    theme: {
      colors: {
        paper: [247, 245, 239],
        accent: [86, 100, 108],
      },
    },

    analytics: {
      enabled: true,
    },

    scenes: {
      calendar: calendarScene,
    },
  });
})();
