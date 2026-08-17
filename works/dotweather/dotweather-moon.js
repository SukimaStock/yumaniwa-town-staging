// DotWeather — date-linked moon phase layer.
// Uses a recent NASA new-moon reference and the mean synodic month to map
// the current UTC instant to one of eight familiar moon silhouettes.
// This is intentionally a lightweight visual approximation, not an ephemeris.

(function (root) {
  "use strict";

  const World = root.DotWeatherWorld;
  const UI = root.DotWeatherUI;
  if (!World || !UI) return;

  const P = () => root.DotWeatherPixel;

  const SYNODIC_MONTH_DAYS = 29.53059;
  const NEW_MOON_REFERENCE_UTC = Date.UTC(2026, 7, 12, 17, 37, 0); // 2026-08-12 17:37 UTC
  const DAY_MS = 86400000;

  const PHASES = [
    { key: "new", label: "NEW", center: 0.000, amount: 0.00, side: 0, coreKey: "new" },
    { key: "waxing-crescent", label: "WAX C", center: 0.125, amount: 0.22, side: 1, coreKey: "waxing-crescent" },
    { key: "first-quarter", label: "1Q", center: 0.250, amount: 0.50, side: 1, coreKey: "first-quarter" },
    { key: "waxing-gibbous", label: "WAX G", center: 0.375, amount: 0.78, side: 1, coreKey: "waxing-gibbous" },
    { key: "full", label: "FULL", center: 0.500, amount: 1.00, side: 0, coreKey: "full" },
    // The original renderer has no waning-gibbous entry. We draw it here,
    // while feeding FULL to the legacy star-brightness logic as a close proxy.
    { key: "waning-gibbous", label: "WAN G", center: 0.625, amount: 0.78, side: -1, coreKey: "full" },
    { key: "last-quarter", label: "3Q", center: 0.750, amount: 0.50, side: -1, coreKey: "last-quarter" },
    { key: "waning-crescent", label: "WAN C", center: 0.875, amount: 0.22, side: -1, coreKey: "waning-crescent" },
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }

  function positiveModulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function circularDistance(a, b) {
    const d = Math.abs(a - b);
    return Math.min(d, 1 - d);
  }

  function phaseFromFraction(fraction) {
    let best = PHASES[0];
    let bestDistance = Infinity;

    PHASES.forEach((phase) => {
      const distance = circularDistance(fraction, phase.center);
      if (distance < bestDistance) {
        best = phase;
        bestDistance = distance;
      }
    });

    return best;
  }

  function calculateMoon(nowMs) {
    const ms = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
    const daysSinceReference = (ms - NEW_MOON_REFERENCE_UTC) / DAY_MS;
    const ageDays = positiveModulo(daysSinceReference, SYNODIC_MONTH_DAYS);
    const fraction = ageDays / SYNODIC_MONTH_DAYS;
    const phase = phaseFromFraction(fraction);

    return {
      ...phase,
      ageDays,
      fraction,
    };
  }

  function phaseByKey(key) {
    return PHASES.find((phase) => phase.key === key) || null;
  }

  // Always inject a date-linked moon phase into the renderer. Existing explicit
  // data can still be forced by the staging debug control below.
  const previousGetDisplayCity = UI.prototype.getDisplayCity;
  UI.prototype.getDisplayCity = function getDisplayCityWithMoon() {
    const city = previousGetDisplayCity.call(this);
    if (!city) return city;

    const debugKey = root.DotWeatherDebug?.state?.moonPhase || null;
    const phase = phaseByKey(debugKey) || calculateMoon(Date.now());

    return {
      ...city,
      moonPhase: phase.coreKey,
      moonPhaseVisual: phase.key,
      moonAgeDays: phase.ageDays,
    };
  };

  // Replace only moon drawing. Stars continue using the legacy phase resolver;
  // moonPhase above supplies it with the nearest compatible phase key.
  const previousDrawMoon = World.prototype.drawMoon;
  World.prototype.drawMoon = function drawDateLinkedMoon(style, city, position) {
    const visualKey = city?.moonPhaseVisual;
    const phase = phaseByKey(visualKey);
    if (!phase) return previousDrawMoon.call(this, style, city, position);
    if (style.moonAlpha <= 0 || phase.key === "new") return;

    const pixel = 2;
    const radius = 18;
    const radiusSquared = radius * radius;
    const cx = P().snap(position.x, pixel);
    const cy = P().snap(position.y, pixel);

    const skyT = clamp(cy / this.height, 0, 1);
    const skyColor = mix(style.bottom, style.top, skyT);
    const themeWhite = root.SSE.theme.color("pixelWhite", 255);
    const white = [themeWhite.r, themeWhite.g, themeWhite.b];
    const moonStrength = clamp((style.moonAlpha * 0.88) / 255, 0, 1);
    const moonColor = mix(skyColor, white, moonStrength);

    for (let y = -radius; y <= radius; y += pixel) {
      const rowSpan = Math.sqrt(Math.max(0, radiusSquared - y * y));
      let runStart = null;
      let runEnd = null;

      for (let x = -radius; x <= radius; x += pixel) {
        if (x * x + y * y > radiusSquared) continue;

        let isLit = phase.key === "full";
        if (!isLit) {
          const threshold = rowSpan * (1 - phase.amount * 2);
          isLit = phase.side > 0 ? x >= threshold : x <= -threshold;
        }

        if (isLit) {
          if (runStart === null) runStart = x;
          runEnd = x;
        }
      }

      if (runStart !== null && runEnd !== null) {
        P().drawBlock(
          cx + runStart,
          cy + y,
          runEnd - runStart + pixel,
          pixel,
          moonColor,
          255,
          0.12
        );
      }
    }
  };

  root.DotWeatherMoon = {
    phases: PHASES,
    calculate: calculateMoon,
  };

  // Staging developer controls.
  const debug = root.DotWeatherDebug;
  if (!debug) return;

  debug.state.moonPhase = null;
  debug.setMoonPhase = function setMoonPhase(value) {
    debug.state.moonPhase = phaseByKey(value)?.key || null;
    refreshMoonControls();
  };

  function makeButton(label, key, live) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = "dw-debug-chip dw-moon-debug-chip";
    button.dataset.moonPhase = key || "";
    if (live) button.dataset.moonLive = "1";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      debug.setMoonPhase(live ? null : key);
    });
    return button;
  }

  function ensureMoonControls() {
    const panel = document.getElementById("dw-debug-panel");
    if (!panel || panel.querySelector(".dw-moon-debug-group")) return;

    const group = document.createElement("section");
    group.className = "dw-debug-group dw-moon-debug-group";

    const heading = document.createElement("div");
    heading.className = "dw-debug-heading";
    heading.textContent = "MOON PHASE";
    group.appendChild(heading);

    const row = document.createElement("div");
    row.className = "dw-debug-row";
    row.appendChild(makeButton("LIVE", null, true));
    PHASES.forEach((phase) => row.appendChild(makeButton(phase.label, phase.key, false)));
    group.appendChild(row);

    const status = document.createElement("div");
    status.className = "dw-debug-note dw-moon-debug-status";
    group.appendChild(status);

    const groups = Array.from(panel.querySelectorAll(".dw-debug-group"));
    const timeGroup = groups.find((item) => item.querySelector(".dw-debug-heading")?.textContent === "TIME OF DAY");
    if (timeGroup?.nextSibling) panel.insertBefore(group, timeGroup.nextSibling);
    else panel.appendChild(group);

    panel.addEventListener("click", (event) => {
      if (event.target?.closest?.(".dw-debug-reset")) {
        debug.state.moonPhase = null;
        refreshMoonControls();
      }
    });

    refreshMoonControls();
  }

  function refreshMoonControls() {
    const panel = document.getElementById("dw-debug-panel");
    if (!panel) return;

    const forced = phaseByKey(debug.state.moonPhase);
    const live = calculateMoon(Date.now());
    const active = forced || live;

    panel.querySelectorAll(".dw-moon-debug-chip").forEach((button) => {
      const isLive = button.dataset.moonLive === "1";
      const isActive = isLive ? !forced : button.dataset.moonPhase === forced?.key;
      button.classList.toggle("is-active", isActive);
    });

    const status = panel.querySelector(".dw-moon-debug-status");
    if (status) {
      const age = live.ageDays.toFixed(1);
      status.textContent = forced
        ? `FORCED ${forced.key.toUpperCase()} · LIVE ${live.key.toUpperCase()} · AGE ${age}D`
        : `LIVE ${active.key.toUpperCase()} · AGE ${age}D`;
    }
  }

  const previousEnter = UI.prototype.enter;
  UI.prototype.enter = function enterWithMoonDebug(context) {
    const result = previousEnter.call(this, context);
    ensureMoonControls();
    refreshMoonControls();
    return result;
  };

  root.setInterval(() => {
    ensureMoonControls();
    refreshMoonControls();
  }, 1000);
})(typeof window !== "undefined" ? window : globalThis);
