// DotWeather — shower rhythm layer.
// Rain showers are not another fixed strength: their density, opacity, and
// streak length breathe over time. Live Open-Meteo "SHOWERS" descriptions
// trigger this automatically; staging DEV can force the rhythm for testing.

(function (root) {
  "use strict";

  const World = root.DotWeatherWorld;
  const UI = root.DotWeatherUI;
  if (!World) return;

  const P = () => root.DotWeatherPixel;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function isLiveShower(city) {
    return String(city?.description || "").toUpperCase().includes("SHOWERS");
  }

  function isShower(city) {
    return city?.showerMode === true || isLiveShower(city);
  }

  function cityPhase(city) {
    const seed = Number(city?.seed);
    if (!Number.isFinite(seed)) return 0;
    return (Math.abs(seed) % 997) / 997 * Math.PI * 2;
  }

  function showerIntensity(time, city) {
    const phase = cityPhase(city);

    // One broad wave takes ~14 seconds. Squaring the wave keeps the shower
    // quiet for longer and makes the stronger burst feel comparatively brief.
    const broad = 0.5 - 0.5 * Math.cos((time / 14) * Math.PI * 2 + phase);
    const burst = Math.pow(broad, 2.15);

    // A small faster wobble stops every cycle from reading like a metronome.
    const flutter = 0.88 + 0.12 * Math.sin(time * 1.37 + phase * 1.7);
    return clamp(0.10 + 0.90 * burst * flutter, 0.08, 1);
  }

  const previousDrawWeather = World.prototype.drawWeather;

  World.prototype.drawWeather = function drawWeatherWithShowers(style, city, lowPower) {
    if (!city || city.weather !== "rain" || !isShower(city)) {
      return previousDrawWeather.call(this, style, city, lowPower);
    }

    const intensity = showerIntensity(this.time || 0, city);
    const heavy = String(city.description || "").toUpperCase().includes("HEAVY SHOWERS");

    const minCount = lowPower ? (heavy ? 11 : 7) : (heavy ? 17 : 9);
    const maxCount = lowPower ? 25 : 48;
    const rainCount = Math.round(lerp(minCount, maxCount, intensity));

    const mainAlpha = Math.round(lerp(105, heavy ? 196 : 184, intensity));
    const tailAlpha = Math.round(lerp(44, heavy ? 122 : 106, intensity));
    const tailScale = lerp(0.88, 0.76, intensity);
    const baseLength = intensity < 0.30 ? 1 : intensity < 0.68 ? 2 : 4;
    const lengthVariance = intensity < 0.45 ? 2 : intensity < 0.82 ? 3 : 4;

    const wind = typeof this.getWindState === "function"
      ? this.getWindState(city)
      : { hasData: false, speed: 0, screenX: 0 };

    // Sparse shower rain is visibly lighter and can be pushed around more.
    const windFactor = lerp(1.28, 0.84, intensity);
    const tailStepX = wind.hasData
      ? clamp(wind.screenX * wind.speed / 18 * windFactor, -4, 4)
      : 0;

    const tailColor = style.rain.map((value) => Math.round(value * tailScale));

    noStroke();

    for (let i = 0; i < rainCount; i += 1) {
      const particle = this.weatherParticles[i];
      if (!particle) continue;

      const x = P().snap(particle.x, 2);
      const y = P().snap(particle.y, 2);
      const length = baseLength + (i % lengthVariance);

      fill(style.rain[0], style.rain[1], style.rain[2], mainAlpha);
      rect(x, y, 2, 2);

      if (length <= 1) continue;

      fill(tailColor[0], tailColor[1], tailColor[2], tailAlpha);
      for (let segment = 1; segment < length; segment += 1) {
        const tailX = P().snap(x - tailStepX * segment, 2);
        rect(tailX, y + segment * 2, 2, 2);
      }
    }
  };

  root.DotWeatherShowers = {
    isShower,
    intensity(city) {
      return showerIntensity(Number(World.prototype.time) || 0, city);
    },
  };

  // DEV extension. On production DotWeatherDebug is absent, so this is a no-op.
  if (!UI || !root.DotWeatherDebug) return;

  const debug = root.DotWeatherDebug;
  debug.state.showerMode = false;

  const previousGetDisplayCity = UI.prototype.getDisplayCity;
  UI.prototype.getDisplayCity = function getDisplayCityWithShowerDebug() {
    const city = previousGetDisplayCity.call(this);
    if (!city || !debug.state.showerMode) return city;

    return {
      ...city,
      weather: "rain",
      rainLevel: "normal",
      showerMode: true,
      description: "DEBUG SHOWERS",
    };
  };

  function setShowerMode(enabled) {
    debug.state.showerMode = Boolean(enabled);

    if (debug.state.showerMode) {
      // Keep the rain-strength row meaningful: SHOWERS is the rhythm layered
      // on top of the normal rain profile, not a fifth strength.
      debug.state.rainLevel = "normal";
      debug.setWeather("rain");
    }

    refreshButtons();
  }

  debug.setShowers = setShowerMode;

  function makeButton(label, enabled) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = "dw-debug-chip dw-shower-debug-chip";
    button.dataset.showerMode = enabled ? "1" : "0";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setShowerMode(enabled);
    });

    return button;
  }

  function ensureControls() {
    const panel = document.getElementById("dw-debug-panel");
    if (!panel || panel.querySelector(".dw-shower-debug-group")) return;

    const rainGroup = panel.querySelector(".dw-rain-debug-group");

    const group = document.createElement("section");
    group.className = "dw-debug-group dw-shower-debug-group";

    const heading = document.createElement("div");
    heading.className = "dw-debug-heading";
    heading.textContent = "RAIN RHYTHM";
    group.appendChild(heading);

    const row = document.createElement("div");
    row.className = "dw-debug-row";
    row.appendChild(makeButton("AUTO / STEADY", false));
    row.appendChild(makeButton("SHOWERS", true));
    group.appendChild(row);

    if (rainGroup?.nextSibling) panel.insertBefore(group, rainGroup.nextSibling);
    else panel.appendChild(group);

    panel.addEventListener("click", (event) => {
      const target = event.target?.closest?.(".dw-debug-chip");
      if (!target) return;

      if (target.classList.contains("dw-debug-reset")) {
        debug.state.showerMode = false;
        refreshButtons();
        return;
      }

      // Choosing a specific strength means "steady rain" unless SHOWERS is
      // explicitly selected again afterwards.
      if (target.classList.contains("dw-rain-debug-chip")) {
        debug.state.showerMode = false;
        refreshButtons();
        return;
      }

      // Leaving rain in the main weather row also cancels a forced shower.
      if (target.dataset.debugKey === "weather") {
        const value = target.dataset.debugValue || null;
        if (value !== "rain") {
          debug.state.showerMode = false;
          refreshButtons();
        }
      }
    });

    refreshButtons();
  }

  function refreshButtons() {
    const panel = document.getElementById("dw-debug-panel");
    if (!panel) return;

    panel.querySelectorAll(".dw-shower-debug-chip").forEach((button) => {
      const enabled = button.dataset.showerMode === "1";
      button.classList.toggle("is-active", Boolean(debug.state.showerMode) === enabled);
    });
  }

  const previousEnter = UI.prototype.enter;
  UI.prototype.enter = function enterWithShowerDebug(context) {
    const result = previousEnter.call(this, context);
    ensureControls();
    refreshButtons();
    return result;
  };

  root.setInterval(() => {
    ensureControls();
    refreshButtons();
  }, 500);
})(typeof window !== "undefined" ? window : globalThis);
