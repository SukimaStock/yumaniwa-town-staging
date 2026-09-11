// SteamClock — Step 12.1: release build + opt-in debug tools
// Normal visitors see the finished clock only. Add ?debug=1 to enable the
// developer panel for fixed-time checks, geometry overlays, and effect tests.

(function () {
  "use strict";

  const DESIGN_W = 390;
  const DESIGN_H = 844;

  const images = {};

  function locationHasDebug(targetWindow) {
    try {
      const value = new URLSearchParams(targetWindow.location.search).get("debug");
      return value === "1" || value === "true";
    } catch (_error) {
      return false;
    }
  }

  // The work can be opened directly or inside the same-origin Yumaniwa frame.
  // In the latter case, allow ?debug=1 on the parent town URL as well.
  const DEBUG_ENABLED = typeof window !== "undefined" && (
    locationHasDebug(window) ||
    (window.top && window.top !== window && locationHasDebug(window.top))
  );

  const debugState = {
    fixedTime: null,
    overlay: false,
    panel: null,
    status: null,
    overlayButton: null,
  };

  const mech = {
    gears: null,
    pendulumTime: 0,
    barometerAngle: null,
    targetBarometerAngle: null,
    barometerUpdateTimer: 0,
  };

  const fx = {
    dustParticles: [],
    steamParticles: [],
    steamEmitters: [],
    sparkParticles: [],
    sparkEmitters: [],
    flickerAlpha: 0,
    flickerTimer: 0,
    nextSteamTime: 0,
    lastSecond: null,
  };

  const HandDir = -1;
  const HandZero = { second: 0, minute: 0, hour: 0 };
  const HandHole = {
    second: { x: 0.50, y: 0.85 },
    minute: { x: 0.50, y: 0.50 },
    hour:   { x: 0.50, y: 0.50 },
  };
  const HandNudge = {
    second: { x: 0.00, y: 0.00 },
    minute: { x: 0.00, y: 0.00 },
    hour:   { x: 0.00, y: 0.00 },
  };

  function clampInt(value, min, max) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function format2(value) {
    return String(value).padStart(2, "0");
  }

  // One shared time source keeps analog and nixie displays synchronized.
  // Normal visitors always see real time; debug mode can temporarily freeze it.
  function getClockDate() {
    if (DEBUG_ENABLED && debugState.fixedTime) {
      const now = new Date();
      now.setHours(
        debugState.fixedTime.h,
        debugState.fixedTime.m,
        debugState.fixedTime.s,
        0
      );
      return now;
    }
    return new Date();
  }

  function getClockHMS() {
    const now = getClockDate();
    return {
      h: now.getHours(),
      m: now.getMinutes(),
      s: now.getSeconds(),
    };
  }

  function syncDebugPanel() {
    if (!DEBUG_ENABLED) return;

    if (debugState.status) {
      if (debugState.fixedTime) {
        const t = debugState.fixedTime;
        debugState.status.textContent =
          "FIXED  " + format2(t.h) + ":" + format2(t.m) + ":" + format2(t.s);
      } else {
        debugState.status.textContent = "REAL TIME";
      }
    }

    if (debugState.overlayButton) {
      debugState.overlayButton.textContent = debugState.overlay
        ? "OVERLAY  ON"
        : "OVERLAY  OFF";
      debugState.overlayButton.setAttribute("aria-pressed", debugState.overlay ? "true" : "false");
    }
  }

  function setDebugTime(h, m, s) {
    if (!DEBUG_ENABLED) return false;

    debugState.fixedTime = {
      h: clampInt(h, 0, 23),
      m: clampInt(m, 0, 59),
      s: clampInt(s, 0, 59),
    };
    fx.lastSecond = debugState.fixedTime.s;
    syncDebugPanel();
    return true;
  }

  function useRealTime() {
    if (!DEBUG_ENABLED) return false;

    debugState.fixedTime = null;
    fx.lastSecond = new Date().getSeconds();
    syncDebugPanel();
    return true;
  }

  function toggleDebugOverlay() {
    if (!DEBUG_ENABLED) return false;
    debugState.overlay = !debugState.overlay;
    syncDebugPanel();
    return debugState.overlay;
  }

  function triggerDebugFlicker() {
    if (!DEBUG_ENABLED) return false;
    fx.flickerAlpha = 62;
    fx.flickerTimer = -0.24;
    return true;
  }

  function triggerAllDebugEffects() {
    if (!DEBUG_ENABLED) return false;
    createSteamPuff();
    createSparkEffect();
    triggerDebugFlicker();
    return true;
  }

  function installDebugPanel() {
    if (!DEBUG_ENABLED || typeof document === "undefined" || debugState.panel) return;

    const panel = document.createElement("details");
    panel.id = "steamclock-debug-panel";
    panel.open = true;
    panel.innerHTML = `
      <summary>STEAMCLOCK DEBUG</summary>
      <div class="sc-debug-body">
        <div class="sc-debug-status" data-role="status">REAL TIME</div>
        <div class="sc-debug-time">
          <input data-role="hour" type="number" min="0" max="23" value="10" inputmode="numeric" aria-label="hour">
          <span>:</span>
          <input data-role="minute" type="number" min="0" max="59" value="08" inputmode="numeric" aria-label="minute">
          <span>:</span>
          <input data-role="second" type="number" min="0" max="59" value="42" inputmode="numeric" aria-label="second">
        </div>
        <div class="sc-debug-row">
          <button data-action="set-time">SET TIME</button>
          <button data-action="real-time">REAL TIME</button>
        </div>
        <button class="sc-debug-wide" data-action="overlay">OVERLAY  OFF</button>
        <div class="sc-debug-label">EFFECT</div>
        <div class="sc-debug-grid">
          <button data-action="steam">STEAM</button>
          <button data-action="spark">SPARK</button>
          <button data-action="flicker">FLICKER</button>
          <button data-action="all">ALL</button>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.id = "steamclock-debug-style";
    style.textContent = `
      #steamclock-debug-panel {
        position: fixed;
        top: max(8px, env(safe-area-inset-top));
        left: max(8px, env(safe-area-inset-left));
        z-index: 2147483647;
        width: min(224px, calc(100vw - 16px));
        box-sizing: border-box;
        color: #f1dfbd;
        background: rgba(20, 14, 12, 0.92);
        border: 1px solid rgba(239, 206, 151, 0.55);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.38);
        font: 11px/1.25 ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
        letter-spacing: 0.03em;
        -webkit-user-select: none;
        user-select: none;
        touch-action: manipulation;
      }
      #steamclock-debug-panel summary {
        padding: 9px 10px;
        cursor: pointer;
        color: #f5c777;
        font-weight: 700;
        list-style-position: inside;
      }
      #steamclock-debug-panel .sc-debug-body {
        padding: 0 10px 10px;
      }
      #steamclock-debug-panel .sc-debug-status {
        margin: 0 0 8px;
        padding: 5px 7px;
        color: #9ee7ef;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 4px;
      }
      #steamclock-debug-panel .sc-debug-time {
        display: grid;
        grid-template-columns: 1fr auto 1fr auto 1fr;
        align-items: center;
        gap: 4px;
        margin-bottom: 7px;
      }
      #steamclock-debug-panel input,
      #steamclock-debug-panel button {
        box-sizing: border-box;
        min-height: 30px;
        border: 1px solid rgba(239, 216, 171, 0.42);
        border-radius: 5px;
        color: #f4e7cd;
        background: rgba(255, 255, 255, 0.08);
        font: inherit;
      }
      #steamclock-debug-panel input {
        width: 100%;
        padding: 4px;
        text-align: center;
        -webkit-user-select: text;
        user-select: text;
      }
      #steamclock-debug-panel button {
        padding: 5px 7px;
      }
      #steamclock-debug-panel button:active {
        transform: translateY(1px);
        background: rgba(245, 199, 119, 0.20);
      }
      #steamclock-debug-panel .sc-debug-row,
      #steamclock-debug-panel .sc-debug-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      #steamclock-debug-panel .sc-debug-wide {
        width: 100%;
        margin-top: 6px;
      }
      #steamclock-debug-panel .sc-debug-label {
        margin: 9px 0 5px;
        color: rgba(241, 223, 189, 0.62);
        font-size: 9px;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(panel);

    const hour = panel.querySelector('[data-role="hour"]');
    const minute = panel.querySelector('[data-role="minute"]');
    const second = panel.querySelector('[data-role="second"]');
    debugState.panel = panel;
    debugState.status = panel.querySelector('[data-role="status"]');
    debugState.overlayButton = panel.querySelector('[data-action="overlay"]');

    for (const eventName of ["pointerdown", "pointerup", "touchstart", "touchend", "click"]) {
      panel.addEventListener(eventName, (event) => event.stopPropagation());
    }

    panel.querySelector('[data-action="set-time"]').addEventListener("click", () => {
      const h = clampInt(hour.value, 0, 23);
      const m = clampInt(minute.value, 0, 59);
      const s = clampInt(second.value, 0, 59);
      hour.value = format2(h);
      minute.value = format2(m);
      second.value = format2(s);
      setDebugTime(h, m, s);
    });

    panel.querySelector('[data-action="real-time"]').addEventListener("click", useRealTime);
    debugState.overlayButton.addEventListener("click", toggleDebugOverlay);
    panel.querySelector('[data-action="steam"]').addEventListener("click", createSteamPuff);
    panel.querySelector('[data-action="spark"]').addEventListener("click", createSparkEffect);
    panel.querySelector('[data-action="flicker"]').addEventListener("click", triggerDebugFlicker);
    panel.querySelector('[data-action="all"]').addEventListener("click", triggerAllDebugEffects);

    window.SteamClockDebug = {
      enabled: true,
      setTime: setDebugTime,
      realTime: useRealTime,
      toggleOverlay: toggleDebugOverlay,
      steam: createSteamPuff,
      spark: createSparkEffect,
      flicker: triggerDebugFlicker,
      all: triggerAllDebugEffects,
      getState() {
        return {
          fixedTime: debugState.fixedTime ? { ...debugState.fixedTime } : null,
          overlay: debugState.overlay,
        };
      },
    };

    syncDebugPanel();
  }

  function imageReady(img) {
    return !!(img && img.loaded && img.width > 0 && img.height > 0);
  }

  function mapRange(v, a1, b1, a2, b2) {
    return a2 + ((v - a1) * (b2 - a2)) / (b1 - a1);
  }

  function mapPressureToAngle(p) {
    return mapRange(p, 0, 100, -120, 120);
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
  }

  function drawCoverBackground(W, H) {
    const img = images.background;
    if (!imageReady(img)) return;

    const screenRatio = W / H;
    const imageRatio = img.width / img.height;
    let w;
    let h;

    if (screenRatio > imageRatio) {
      w = W;
      h = W / imageRatio;
    } else {
      h = H;
      w = H * imageRatio;
    }

    sprite(img, W / 2, H / 2, w, h);
    sprite(img, W / 2, H / 2, W);
  }

  function drawRotatedSprite(img, x, y, angle, w, h) {
    if (!imageReady(img)) return;
    pushMatrix();
    translate(x, y);
    rotate(angle);
    sprite(img, 0, 0, w, h === undefined ? w : h);
    popMatrix();
  }

  function buildGears(W, H) {
    const gears = [
      { type: "linked", img: images.gear2, x: W * 0.455, y: H * 0.77, size: 160, z: 11, speed: -23, angle: 10, parent: null },
      { type: "linked", img: images.gear1, size: 110, z: 10, parent: 0, phase: 18, parentAngle: 210, parentDistanceFactor: 0.8 },
      { type: "decorative", img: images.gear1, x: W * 0.73, y: H * 0.795, size: 100, speed: 25, angle: 20 },
      { type: "decorative", img: images.gear2, x: W * 0.75, y: H * 0.42, size: 80, speed: 40, angle: 0 },
    ];

    const parent = gears[0];
    const child = gears[1];
    const aR = child.parentAngle * Math.PI / 180;
    const d = (parent.size / 2 + child.size / 2) * child.parentDistanceFactor;
    child.x = parent.x + Math.cos(aR) * d;
    child.y = parent.y + Math.sin(aR) * d;
    child.angle = -parent.angle * (parent.z / child.z) + child.phase;
    return gears;
  }

  function ensureGears(W, H) {
    if (!mech.gears) mech.gears = buildGears(W, H);
    return mech.gears;
  }

  function drawGearsAnimated(W, H) {
    const gears = ensureGears(W, H);
    for (const g of gears) {
      if (g.type === "linked") {
        if (g.parent !== null && g.parent !== undefined) {
          const p = gears[g.parent];
          if (p) g.angle = -p.angle * (p.z / g.z) + g.phase;
        } else {
          g.angle += g.speed * DeltaTime;
        }
      } else {
        g.angle += g.speed * DeltaTime;
      }
    }
    for (const g of gears) drawRotatedSprite(g.img, g.x, g.y, g.angle, g.size, g.size);
  }

  function drawDummyElements(W, H) {
    if (imageReady(images.valve)) sprite(images.valve, W * 0.81, H * 0.08, 120, 120);
    if (imageReady(images.gaugeDummy)) sprite(images.gaugeDummy, W * 0.20, H * 0.845, 100, 100);
  }

  function drawPendulumAnimated(clockX, clockY, clockSize) {
    const img = images.pendulum;
    if (!imageReady(img)) return;

    const pivotX = clockX;
    const pivotY = clockY + clockSize * -0.55;
    const pivotOffset = 140;
    const maxAngle = 15;
    const speed = 2.0;
    const angle = maxAngle * Math.sin(mech.pendulumTime * speed);
    const pendulumHeight = clockSize;
    const w = pendulumHeight * (img.width / img.height);

    pushMatrix();
    translate(pivotX, pivotY);
    rotate(angle);
    sprite(img, 0, pendulumHeight / 2 - pivotOffset, w, pendulumHeight);
    popMatrix();
  }

  function initEffects(W, H) {
    fx.dustParticles = [];
    for (let i = 0; i < 100; i += 1) {
      const size = randomRange(0.8, 6.5);
      fx.dustParticles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size,
        alpha: size * 16 + randomRange(1, 8),
        xSpeed: randomRange(-20, 20) * size * 2.4,
        ySpeed: randomRange(-20, 20) * size * 2.4,
      });
    }

    fx.steamEmitters = [
      { x: W * 0.88, y: H * 0.87, angle: 225, strength: 1.0 },
      { x: W * 0.12, y: H * 0.55, angle: 180, strength: 0.8 },
      { x: W * 0.80, y: H * 0.30, angle: -90, strength: 1.2 },
    ];
    fx.nextSteamTime = randomRange(3, 8);

    fx.sparkEmitters = [
      { x: W * 0.65, y: H * 0.60 },
      { x: W * 0.25, y: H * 0.80 },
      { x: W * 0.50, y: H * 0.25 },
    ];

    fx.steamParticles = [];
    fx.sparkParticles = [];
    fx.flickerAlpha = 0;
    fx.flickerTimer = 0;
    fx.lastSecond = getClockDate().getSeconds();
  }

  function createSteamPuff() {
    if (!fx.steamEmitters.length) return;
    mech.targetBarometerAngle = mapPressureToAngle(randomRange(85, 100));
    const emitter = fx.steamEmitters[randomInt(0, fx.steamEmitters.length - 1)];
    for (let i = 0; i < 80; i += 1) {
      const angle = emitter.angle + randomInt(-70, 45);
      const speed = randomInt(100, 250) * emitter.strength;
      const angleRad = angle * Math.PI / 180;
      const life = randomInt(80, 150) / 100;
      fx.steamParticles.push({
        x: emitter.x,
        y: emitter.y,
        size: randomInt(10, 30),
        xSpeed: Math.cos(angleRad) * speed,
        ySpeed: Math.sin(angleRad) * speed,
        life,
        initialLife: life,
        alpha: 0,
      });
    }
  }

  function drawSteamEffect() {
    noStroke();
    const turbulenceStrength = 200;
    const buoyancy = -80;
    for (let i = fx.steamParticles.length - 1; i >= 0; i -= 1) {
      const p = fx.steamParticles[i];
      p.life -= DeltaTime;
      if (p.life <= 0) {
        fx.steamParticles.splice(i, 1);
        continue;
      }
      p.xSpeed += randomRange(-turbulenceStrength, turbulenceStrength) * DeltaTime;
      p.ySpeed += randomRange(-turbulenceStrength, turbulenceStrength) * DeltaTime;
      p.ySpeed -= buoyancy * DeltaTime;
      p.xSpeed *= 0.95;
      p.ySpeed *= 0.95;
      p.x += p.xSpeed * DeltaTime;
      p.y += p.ySpeed * DeltaTime;
      p.size += 10 * DeltaTime;
      const lifeRatio = p.life / p.initialLife;
      p.alpha = Math.sin(lifeRatio * Math.PI) * 80;
      fill(255, 255, 255, p.alpha);
      ellipse(p.x, p.y, p.size);
    }
  }

  function createSparkEffect() {
    if (!fx.sparkEmitters.length) return;
    const emitter = fx.sparkEmitters[randomInt(0, fx.sparkEmitters.length - 1)];
    for (let i = 0; i < 10; i += 1) {
      const angle = randomRange(0, 360);
      const speed = randomRange(300, 600);
      const rad = angle * Math.PI / 180;
      fx.sparkParticles.push({
        x: emitter.x,
        y: emitter.y,
        xSpeed: Math.cos(rad) * speed,
        ySpeed: Math.sin(rad) * speed,
        life: randomRange(0.20, 0.50),
        brightness: 255,
      });
    }
  }

  function drawSparkEffect() {
    blendMode(ADDITIVE);
    strokeWidth(3);
    const gravity = 400;
    for (let i = fx.sparkParticles.length - 1; i >= 0; i -= 1) {
      const p = fx.sparkParticles[i];
      p.life -= DeltaTime;
      if (p.life <= 0) {
        fx.sparkParticles.splice(i, 1);
        continue;
      }
      p.ySpeed += gravity * DeltaTime;
      const px = p.x;
      const py = p.y;
      p.x += p.xSpeed * DeltaTime;
      p.y += p.ySpeed * DeltaTime;
      p.brightness *= 0.95;
      stroke(255, 230, 200, p.brightness);
      line(p.x, p.y, px, py);
    }
    blendMode(NORMAL);
  }

  function drawFlicker(W, H) {
    fx.flickerTimer += DeltaTime;
    if (fx.flickerTimer > 0.09) {
      fx.flickerAlpha = randomRange(0, 7);
      fx.flickerTimer = 0;
    }
    noStroke();
    fill(80, 60, 40, fx.flickerAlpha);
    rect(W / 2, H / 2, W, H);
  }

  function drawDustEffect(W, H) {
    noStroke();
    for (const p of fx.dustParticles) {
      p.xSpeed += randomRange(-50, 50) * DeltaTime;
      p.ySpeed += randomRange(-50, 50) * DeltaTime;
      p.xSpeed *= 0.97;
      p.ySpeed *= 0.97;
      p.x += p.xSpeed * DeltaTime;
      p.y += p.ySpeed * DeltaTime;
      if (p.y > H + 10) p.y = -10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.x < -10) p.x = W + 10;
      fill(255, 1);
      ellipse(p.x, p.y, p.size * 1.9);
      fill(255, 4);
      ellipse(p.x, p.y, p.size * 0.85);
      fill(255, 36);
      ellipse(p.x, p.y, p.size * 0.72);
    }
  }

  function updateEffectTimers() {
    fx.nextSteamTime -= DeltaTime;
    if (fx.nextSteamTime <= 0) {
      createSteamPuff();
      fx.nextSteamTime = randomRange(4, 30);
    }
    const currentSecond = getClockDate().getSeconds();
    if (currentSecond === 0 && fx.lastSecond === 59) createSparkEffect();
    fx.lastSecond = currentSecond;
  }

  function drawBarometerAnimated(W, H) {
    if (!imageReady(images.barometerDial) || !imageReady(images.barometerNeedle)) return;
    const barometerSize = 100;
    const barometerX = W * 0.9;
    const barometerY = H * 0.48;
    const needleHeight = barometerSize * 0.8;
    const needlePivotOffsetY = 25;
    if (mech.barometerAngle === null) {
      mech.targetBarometerAngle = mapPressureToAngle(20);
      mech.barometerAngle = mech.targetBarometerAngle;
    }
    mech.barometerAngle += (mech.targetBarometerAngle - mech.barometerAngle) * 0.05;
    sprite(images.barometerDial, barometerX, barometerY, barometerSize, barometerSize);
    const aspectRatio = images.barometerNeedle.width / images.barometerNeedle.height;
    const needleWidth = needleHeight * aspectRatio;
    pushMatrix();
    translate(barometerX, barometerY);
    rotate(mech.barometerAngle);
    sprite(images.barometerNeedle, 0, needleHeight * 0.5 - needlePivotOffsetY, needleWidth * 0.5, needleHeight * 0.8);
    popMatrix();
  }

  function drawHand(img, angleDeg, length, hole, which, clockX, clockY) {
    if (!imageReady(img)) return;
    const h = length;
    const w = h * (img.width / img.height);
    const dx = (hole.x - 0.5) * w;
    const dy = (hole.y - 0.5) * h;
    const n = HandNudge[which] || { x: 0, y: 0 };
    const nx = n.x * h;
    const ny = n.y * h;
    pushMatrix();
    translate(clockX, clockY);
    rotate(HandDir * angleDeg + HandZero[which]);
    translate(dx + nx, dy + ny);
    sprite(img, 0, 0, w, h);
    popMatrix();
  }

  function drawDebugRay(clockX, clockY, angleDeg, length) {
    const rad = (90 - angleDeg) * Math.PI / 180;
    line(clockX, clockY, clockX + Math.cos(rad) * length, clockY + Math.sin(rad) * length);
  }

  function drawDebugOverlay(clockX, clockY, clockSize) {
    if (!DEBUG_ENABLED || !debugState.overlay) return;
    const radius = clockSize * 0.5;
    fill(0, 0, 0, 0);
    strokeWidth(1);
    stroke(70, 220, 255, 125);
    rect(clockX, clockY, clockSize, clockSize);
    ellipse(clockX, clockY, clockSize);
    for (let i = 0; i < 60; i += 1) {
      const angle = i * 6;
      const rad = (90 - angle) * Math.PI / 180;
      const major = i % 5 === 0;
      const inner = radius * (major ? 0.82 : 0.89);
      const outer = radius * 0.98;
      stroke(70, 220, 255, major ? 180 : 90);
      strokeWidth(major ? 1.5 : 1);
      line(clockX + Math.cos(rad) * inner, clockY + Math.sin(rad) * inner, clockX + Math.cos(rad) * outer, clockY + Math.sin(rad) * outer);
    }
    stroke(70, 220, 255, 62);
    strokeWidth(1);
    for (let i = 0; i < 12; i += 1) drawDebugRay(clockX, clockY, i * 30, radius * 0.97);
    stroke(255, 255, 255, 145);
    line(clockX - radius, clockY, clockX + radius, clockY);
    line(clockX, clockY - radius, clockX, clockY + radius);
    const { h, m, s } = getClockHMS();
    strokeWidth(2);
    stroke(255, 92, 92, 205);
    drawDebugRay(clockX, clockY, s * 6, radius * 0.92);
    stroke(103, 213, 255, 205);
    drawDebugRay(clockX, clockY, (m + s / 60) * 6, radius * 0.76);
    stroke(142, 255, 157, 205);
    drawDebugRay(clockX, clockY, ((h % 12) + m / 60) * 30, radius * 0.59);
    noStroke();
    fill(255, 255, 255, 230);
    ellipse(clockX, clockY, 6);
    fill(255, 70, 70, 240);
    ellipse(clockX, clockY, 2.5);
    noStroke();
  }

  function drawAnalogClock(W, H) {
    const clockX = W / 2;
    const clockY = H / 1.83;
    const clockSize = W * 0.63;
    if (imageReady(images.dial)) sprite(images.dial, clockX, clockY, clockSize, clockSize);
    const { h, m, s } = getClockHMS();
    const secL = clockSize * 0.50;
    const minL = clockSize * 0.68;
    const hourL = clockSize * 0.53;
    drawHand(images.secondHand, s * 6, secL, HandHole.second, "second", clockX, clockY);
    drawHand(images.minuteHand, (m + s / 60) * 6, minL, HandHole.minute, "minute", clockX, clockY);
    drawHand(images.hourHand, ((h % 12) + m / 60) * 30, hourL, HandHole.hour, "hour", clockX, clockY);
    if (imageReady(images.centerPiece)) sprite(images.centerPiece, clockX, clockY, clockSize * 0.20, clockSize * 0.20);
    return { clockX, clockY, clockSize };
  }

  function drawDigitalClock(W, H) {
    if (!imageReady(images.nixieTube)) return;
    const n = 4;
    const tubeH = H * 0.18;
    const tubeW = tubeH * 0.6;
    const y = H * 0.2;
    const spacing = tubeW * 1.2;
    const { h, m } = getClockHMS();
    const digits = String(h).padStart(2, "0") + String(m).padStart(2, "0");
    const total = spacing * (n - 1);
    const startX = W / 2 - total / 2;
    const fs = tubeH * 0.72;
    textAlign(CENTER);
    font('"AvenirNext-UltraLight", "Avenir Next", Avenir, system-ui, sans-serif');
    for (let i = 0; i < n; i += 1) {
      const x = startX + i * spacing;
      sprite(images.nixieTube, x, y, tubeW, tubeH);
      const d = digits[i];
      const coreAlpha = randomInt(180, 300);
      const glowAlpha = coreAlpha * 0.4;
      blendMode(ADDITIVE);
      fontSize(fs * 0.85);
      fill(255, 120, 0, glowAlpha);
      text(d, x, y * 0.955);
      fontSize(fs * 0.8);
      fill(255, 180, 100, coreAlpha);
      text(d, x, y * 0.95);
      blendMode(NORMAL);
    }
  }

  function drawForegroundElements(W, H) {
    if (imageReady(images.pipeElbow)) {
      pushMatrix();
      translate(W * 0.85, H * 0.15);
      rotate(90);
      sprite(images.pipeElbow, 330, -11, 75, 75);
      popMatrix();
    }
    if (imageReady(images.pipeStraight)) {
      pushMatrix();
      translate(W * 0.4, H * 0.1);
      sprite(images.pipeStraight, -70, 30, 80, 80);
      popMatrix();
      pushMatrix();
      translate(W * 0.4, H * 0.1);
      sprite(images.pipeStraight, 40, 30, 80, 80);
      popMatrix();
      pushMatrix();
      translate(W * 0.5, H * 0.1);
      sprite(images.pipeStraight, 110, 30, 80, 80);
      popMatrix();
    }
  }

  const clockScene = {
    opaque: true,
    draw() {
      const W = DESIGN_W;
      const H = DESIGN_H;
      background(0);
      drawCoverBackground(W, H);
      drawGearsAnimated(W, H);
      drawDummyElements(W, H);
      const clock = { clockX: W / 2, clockY: H / 1.83, clockSize: W * 0.69 };
      drawPendulumAnimated(clock.clockX, clock.clockY, clock.clockSize);
      drawSteamEffect();
      drawBarometerAnimated(W, H);
      const analogClock = drawAnalogClock(W, H);
      if (analogClock) drawDebugOverlay(analogClock.clockX, analogClock.clockY, analogClock.clockSize);
      drawDigitalClock(W, H);
      drawForegroundElements(W, H);
      drawSparkEffect();
      drawFlicker(W, H);
      drawDustEffect(W, H);
      updateEffectTimers();
      mech.pendulumTime += DeltaTime;
      mech.barometerUpdateTimer -= DeltaTime;
      if (mech.barometerUpdateTimer <= 0) {
        mech.targetBarometerAngle = mapPressureToAngle(randomRange(10, 40));
        mech.barometerUpdateTimer = randomRange(2, 5);
      }
    },
    touch() {
      return true;
    },
  };

  SSE.createApp({
    id: "steamclock",
    logicalWidth: DESIGN_W,
    logicalHeight: DESIGN_H,
    initialScene: "clock",
    outerBackground: [0, 0, 0],
    sceneBackground: [0, 0, 0],
    debug: DEBUG_ENABLED,
    analytics: { enabled: true },
    setup() {
      spriteMode(CENTER);
      ellipseMode(CENTER);
      rectMode(CENTER);
      noStroke();
      initEffects(DESIGN_W, DESIGN_H);
      installDebugPanel();
      images.background = readImage("assets/background.png");
      images.dial = readImage("assets/dial.png");
      images.centerPiece = readImage("assets/center_piece.png");
      images.hourHand = readImage("assets/hour_hand.png");
      images.minuteHand = readImage("assets/minute_hand.png");
      images.secondHand = readImage("assets/second_hand.png");
      images.nixieTube = readImage("assets/nixie_tube.png");
      images.gear1 = readImage("assets/gear1.png");
      images.gear2 = readImage("assets/gear2.png");
      images.pendulum = readImage("assets/pendulum.png");
      images.barometerDial = readImage("assets/barometer_dial.png");
      images.barometerNeedle = readImage("assets/barometer_needle.png");
      images.pipeElbow = readImage("assets/pipe_elbow.png");
      images.pipeStraight = readImage("assets/pipe_straight.png");
      images.valve = readImage("assets/valve.png");
      images.gaugeDummy = readImage("assets/gauge_dummy.png");
      images.spring = readImage("assets/spring.png");
    },
    scenes: { clock: clockScene },
  });
})();