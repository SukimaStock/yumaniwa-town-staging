// DotWeather — Phenomenon #01: Rainbow.
// Rare, but huntable: real weather/time conditions create a candidate window,
// then a deterministic city + local-hour roll decides whether the rainbow exists.

(function (root) {
  "use strict";

  const World = root.DotWeatherWorld;
  const UI = root.DotWeatherUI;
  if (!World) return;

  const P = () => root.DotWeatherPixel;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function rainKind(city) {
    if (city?.showerMode === true) return "showers";
    const text = String(city?.description || "").toUpperCase();
    if (text.includes("SHOWERS")) return "showers";
    if (text.includes("DRIZZLE")) return "drizzle";
    if (text.includes("LIGHT RAIN")) return "light";
    if (text.includes("HEAVY RAIN")) return "heavy";
    return "rain";
  }

  function localParts(city, nowMs) {
    const timezone = Number(city?.timezone);
    const offsetMs = Number.isFinite(timezone) ? timezone * 1000 : 0;
    const local = new Date(nowMs + offsetMs);
    return {
      hourKey: local.toISOString().slice(0, 13),
      minute: local.getUTCMinutes() + local.getUTCSeconds() / 60,
    };
  }

  function futureRecovery(city, nowMs) {
    const hourly = Array.isArray(city?.hourly) ? city.hourly : [];
    const nowSeconds = nowMs / 1000;
    const future = hourly
      .filter((item) => Number(item?.dt) > nowSeconds + 20 * 60)
      .slice(0, 2);

    return future.some((item) => item?.weather === "clear" || item?.weather === "cloudy");
  }

  function chanceFor(city, recovery) {
    const kind = rainKind(city);
    let chance = kind === "showers"
      ? 35
      : (kind === "drizzle" || kind === "light")
        ? 25
        : 20;

    if (recovery) chance = Math.min(50, chance + 15);
    return chance;
  }

  function evaluate(city, nowMs) {
    const currentMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
    const weatherOkay = city?.weather === "rain";
    const time = String(city?.timeOfDay || "").toLowerCase();
    const timeOkay = time === "day" || time === "dusk";
    const recovery = futureRecovery(city, currentMs);
    const eligible = Boolean(city && weatherOkay && timeOkay);
    const chance = eligible ? chanceFor(city, recovery) : 0;
    const local = localParts(city, currentMs);
    const cityKey = city?.id || city?.name || "city";
    const roll = (hashString(`${cityKey}|${local.hourKey}|rainbow-v1`) % 100) + 1;
    const hit = eligible && roll <= chance;

    return {
      eligible,
      hit,
      weatherOkay,
      timeOkay,
      recovery,
      chance,
      roll,
      kind: rainKind(city),
      hourKey: local.hourKey,
      minute: local.minute,
    };
  }

  function visibilityFor(result, forced) {
    if (forced) return 1;
    if (!result.hit) return 0;

    // The result is fixed for the local hour, but the image softly arrives and
    // leaves so crossing an hour boundary never feels like a hard game-state cut.
    const fadeIn = clamp(result.minute / 6, 0, 1);
    const fadeOut = clamp((60 - result.minute) / 8, 0, 1);
    return Math.min(fadeIn, fadeOut);
  }

  function drawRainbow(world, city, forced) {
    const result = evaluate(city, Date.now());
    const visibility = visibilityFor(result, forced);
    if (visibility <= 0) return result;

    const dusk = String(city?.timeOfDay || "").toLowerCase() === "dusk";
    const baseAlpha = Math.round((dusk ? 58 : 46) * visibility);
    const colors = [
      [205, 142, 154],
      [218, 173, 132],
      [203, 202, 142],
      [139, 190, 192],
      [157, 157, 203],
    ];

    const pixel = 2;
    const cx = world.width * 0.57;
    const baseY = 122;
    const outerRadius = Math.min(124, world.width * 0.35);
    const steps = 92;

    noStroke();

    colors.forEach((color, band) => {
      const radius = outerRadius - band * 4;
      const alpha = Math.max(8, baseAlpha - band * 3);
      fill(color[0], color[1], color[2], alpha);

      let lastX = null;
      let lastY = null;
      for (let i = 2; i <= steps - 2; i += 1) {
        const angle = Math.PI * (i / steps);
        const x = P().snap(cx + Math.cos(angle) * radius, pixel);
        const y = P().snap(baseY + Math.sin(angle) * radius, pixel);
        if (x === lastX && y === lastY) continue;
        rect(x, y, pixel, pixel);
        lastX = x;
        lastY = y;
      }
    });

    return result;
  }

  // Rainbow sits behind the clouds but in front of the sky/celestial layer.
  // Skyline and rain are drawn later, naturally hiding the low ends of the arc.
  const previousDrawClouds = World.prototype.drawClouds;
  World.prototype.drawClouds = function drawCloudsWithRainbow(style, city) {
    const forced = root.DotWeatherDebug?.state?.rainbowMode === "force";
    drawRainbow(this, city, forced);
    return previousDrawClouds.call(this, style, city);
  };

  root.DotWeatherRainbow = {
    evaluate,
    rainKind,
  };

  // Staging DEV controls.
  const debug = root.DotWeatherDebug;
  if (!UI || !debug) return;

  debug.state.rainbowMode = "auto";
  debug.setRainbowMode = function setRainbowMode(value) {
    debug.state.rainbowMode = ["auto", "rules", "force"].includes(value) ? value : "auto";
    refreshControls();
  };

  function makeButton(label, mode) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = "dw-debug-chip dw-rainbow-debug-chip";
    button.dataset.rainbowMode = mode;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      debug.setRainbowMode(mode);
    });
    return button;
  }

  function ensureControls() {
    const panel = document.getElementById("dw-debug-panel");
    if (!panel || panel.querySelector(".dw-rainbow-debug-group")) return;

    const group = document.createElement("section");
    group.className = "dw-debug-group dw-rainbow-debug-group";

    const heading = document.createElement("div");
    heading.className = "dw-debug-heading";
    heading.textContent = "PHENOMENON #01 · RAINBOW";
    group.appendChild(heading);

    const row = document.createElement("div");
    row.className = "dw-debug-row";
    row.appendChild(makeButton("AUTO", "auto"));
    row.appendChild(makeButton("RULES", "rules"));
    row.appendChild(makeButton("FORCE", "force"));
    group.appendChild(row);

    const status = document.createElement("div");
    status.className = "dw-debug-note dw-rainbow-debug-status";
    group.appendChild(status);

    const reset = panel.querySelector(".dw-debug-reset");
    if (reset) panel.insertBefore(group, reset);
    else panel.appendChild(group);

    panel.addEventListener("click", (event) => {
      if (event.target?.closest?.(".dw-debug-reset")) {
        debug.state.rainbowMode = "auto";
        refreshControls();
      }
    });

    refreshControls();
  }

  function mark(value) {
    return value ? "✓" : "×";
  }

  function refreshControls() {
    const panel = document.getElementById("dw-debug-panel");
    if (!panel) return;

    const mode = debug.state.rainbowMode || "auto";
    panel.querySelectorAll(".dw-rainbow-debug-chip").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.rainbowMode === mode);
    });

    const status = panel.querySelector(".dw-rainbow-debug-status");
    if (!status) return;

    const ui = root.__dotWeatherRainbowUI;
    const city = ui?.getDisplayCity?.() || ui?.getCity?.();
    if (!city) {
      status.textContent = "No city data.";
      return;
    }

    const result = evaluate(city, Date.now());
    const prefix = mode === "force" ? "FORCE ON · " : mode === "rules" ? "RULES · " : "AUTO · ";
    status.textContent =
      `${prefix}ELIGIBLE ${result.eligible ? "YES" : "NO"} · ` +
      `WEATHER ${result.kind.toUpperCase()} ${mark(result.weatherOkay)} · ` +
      `TIME ${String(city.timeOfDay || "--").toUpperCase()} ${mark(result.timeOkay)} · ` +
      `RECOVERY ${result.recovery ? "YES" : "NO"} · ` +
      `ROLL ${result.roll}/${result.chance || "--"} ${result.hit ? "✓" : "×"}`;
  }

  const previousEnter = UI.prototype.enter;
  UI.prototype.enter = function enterWithRainbowDebug(context) {
    root.__dotWeatherRainbowUI = this;
    const result = previousEnter.call(this, context);
    ensureControls();
    refreshControls();
    return result;
  };

  root.setInterval(() => {
    ensureControls();
    refreshControls();
  }, 500);
})(typeof window !== "undefined" ? window : globalThis);
