// DotWeather — rain detail layer for staging.
// Keeps the existing broad "rain" weather category, but uses the precise
// Open-Meteo description to give drizzle, light rain, rain, and heavy rain
// visibly different density and drop length. Also extends the staging DEV
// panel with instant rain-strength switches.

(function (root) {
  "use strict";

  const World = root.DotWeatherWorld;
  const UI = root.DotWeatherUI;
  if (!World) return;

  const P = () => root.DotWeatherPixel;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const RAIN_PROFILES = {
    drizzle: {
      label: "DRIZZLE",
      lowCount: 6,
      count: 11,
      mainAlpha: 102,
      tailAlpha: 42,
      tailScale: 0.88,
      baseLength: 1,
      lengthVariance: 2,
      windFactor: 1.35,
    },
    light: {
      label: "LIGHT RAIN",
      lowCount: 10,
      count: 19,
      mainAlpha: 124,
      tailAlpha: 60,
      tailScale: 0.84,
      baseLength: 2,
      lengthVariance: 2,
      windFactor: 1.18,
    },
    normal: {
      label: "RAIN",
      lowCount: 16,
      count: 30,
      mainAlpha: 145,
      tailAlpha: 78,
      tailScale: 0.80,
      baseLength: 3,
      lengthVariance: 3,
      windFactor: 1.00,
    },
    heavy: {
      label: "HEAVY RAIN",
      lowCount: 24,
      count: 48,
      mainAlpha: 188,
      tailAlpha: 112,
      tailScale: 0.76,
      baseLength: 4,
      lengthVariance: 4,
      windFactor: 0.82,
    },
  };

  function normalizeRainLevel(value) {
    const key = String(value || "").toLowerCase();
    return Object.prototype.hasOwnProperty.call(RAIN_PROFILES, key) ? key : null;
  }

  function rainLevelFromDescription(description) {
    const text = String(description || "").toUpperCase();

    if (text.includes("DRIZZLE")) return "drizzle";
    if (text.includes("LIGHT RAIN")) return "light";
    if (text.includes("HEAVY RAIN") || text.includes("HEAVY SHOWERS")) return "heavy";

    // Showers remain intentionally folded into the normal/heavy buckets for
    // this pass. Their changing rhythm will be handled as a separate update.
    return "normal";
  }

  function resolveRainLevel(city) {
    const explicit = normalizeRainLevel(city?.rainLevel);
    if (explicit) return explicit;
    return rainLevelFromDescription(city?.description);
  }

  const previousDrawWeather = World.prototype.drawWeather;

  World.prototype.drawWeather = function drawWeatherWithRainDetail(style, city, lowPower) {
    if (!city || city.weather !== "rain") {
      return previousDrawWeather.call(this, style, city, lowPower);
    }

    const level = resolveRainLevel(city);
    const profile = RAIN_PROFILES[level] || RAIN_PROFILES.normal;
    const rainCount = lowPower ? profile.lowCount : profile.count;
    const wind = typeof this.getWindState === "function"
      ? this.getWindState(city)
      : { hasData: false, speed: 0, screenX: 0 };

    const tailColor = style.rain.map((value) => Math.round(value * profile.tailScale));
    const tailStepX = wind.hasData
      ? clamp(wind.screenX * wind.speed / 18 * profile.windFactor, -4, 4)
      : 0;

    noStroke();

    for (let i = 0; i < rainCount; i += 1) {
      const particle = this.weatherParticles[i];
      if (!particle) continue;

      const x = P().snap(particle.x, 2);
      const y = P().snap(particle.y, 2);
      const length = profile.baseLength + (i % profile.lengthVariance);

      fill(style.rain[0], style.rain[1], style.rain[2], profile.mainAlpha);
      rect(x, y, 2, 2);

      if (length <= 1) continue;

      fill(tailColor[0], tailColor[1], tailColor[2], profile.tailAlpha);
      for (let segment = 1; segment < length; segment += 1) {
        const tailX = P().snap(x - tailStepX * segment, 2);
        rect(tailX, y + segment * 2, 2, 2);
      }
    }
  };

  root.DotWeatherRain = {
    profiles: RAIN_PROFILES,
    resolveRainLevel,
  };

  // Staging DEV panel extension. Production has no DotWeatherDebug object, so
  // everything below becomes a no-op there.
  if (!UI || !root.DotWeatherDebug) return;

  const debug = root.DotWeatherDebug;
  debug.state.rainLevel = null;

  const previousGetDisplayCity = UI.prototype.getDisplayCity;
  UI.prototype.getDisplayCity = function getDisplayCityWithRainDebug() {
    const city = previousGetDisplayCity.call(this);
    const level = normalizeRainLevel(debug.state.rainLevel);

    if (!city || city.weather !== "rain" || !level) return city;

    return {
      ...city,
      weather: "rain",
      rainLevel: level,
      description: "DEBUG " + RAIN_PROFILES[level].label,
    };
  };

  function setRainLevel(level) {
    const normalized = normalizeRainLevel(level);
    debug.state.rainLevel = normalized;

    if (normalized) {
      debug.setWeather("rain");
    } else {
      // "LIVE" in the rain-detail row means return the weather itself to live
      // as well, while leaving time/wind overrides untouched.
      debug.setWeather(null);
    }

    refreshRainButtons();
  }

  debug.setRainLevel = setRainLevel;

  function makeRainButton(label, level, live) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = "dw-debug-chip dw-rain-debug-chip";
    button.dataset.rainLevel = level || "";
    if (live) button.dataset.rainLive = "1";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setRainLevel(live ? null : level);
    });

    return button;
  }

  function ensureRainControls() {
    const panel = document.getElementById("dw-debug-panel");
    if (!panel || panel.querySelector(".dw-rain-debug-group")) return;

    const groups = panel.querySelectorAll(".dw-debug-group");
    const weatherGroup = groups[0] || null;

    const group = document.createElement("section");
    group.className = "dw-debug-group dw-rain-debug-group";

    const heading = document.createElement("div");
    heading.className = "dw-debug-heading";
    heading.textContent = "RAIN STRENGTH";
    group.appendChild(heading);

    const row = document.createElement("div");
    row.className = "dw-debug-row";
    row.appendChild(makeRainButton("LIVE", null, true));
    row.appendChild(makeRainButton("DRIZZLE", "drizzle", false));
    row.appendChild(makeRainButton("LIGHT", "light", false));
    row.appendChild(makeRainButton("RAIN", "normal", false));
    row.appendChild(makeRainButton("HEAVY", "heavy", false));
    group.appendChild(row);

    if (weatherGroup?.nextSibling) panel.insertBefore(group, weatherGroup.nextSibling);
    else panel.appendChild(group);

    // Existing weather buttons remain the source of truth. Selecting another
    // weather clears a stale rain-detail override.
    panel.addEventListener("click", (event) => {
      const target = event.target?.closest?.(".dw-debug-chip");
      if (!target) return;

      if (target.classList.contains("dw-debug-reset")) {
        debug.state.rainLevel = null;
        refreshRainButtons();
        return;
      }

      if (target.dataset.debugKey === "weather" && !target.classList.contains("dw-rain-debug-chip")) {
        const value = target.dataset.debugValue || null;
        if (value !== "rain") debug.state.rainLevel = null;
        if (value === "rain" && debug.state.rainLevel === null) {
          // Plain RAIN keeps the live description when available, otherwise
          // resolves to the normal profile.
        }
        refreshRainButtons();
      }
    });

    refreshRainButtons();
  }

  function refreshRainButtons() {
    const panel = document.getElementById("dw-debug-panel");
    if (!panel) return;

    const current = normalizeRainLevel(debug.state.rainLevel);
    panel.querySelectorAll(".dw-rain-debug-chip").forEach((button) => {
      const live = button.dataset.rainLive === "1";
      const active = live ? current === null : button.dataset.rainLevel === current;
      button.classList.toggle("is-active", active);
    });
  }

  const previousEnter = UI.prototype.enter;
  UI.prototype.enter = function enterWithRainDebug(context) {
    const result = previousEnter.call(this, context);
    ensureRainControls();
    refreshRainButtons();
    return result;
  };

  root.setInterval(() => {
    ensureRainControls();
    refreshRainButtons();
  }, 500);
})(typeof window !== "undefined" ? window : globalThis);
