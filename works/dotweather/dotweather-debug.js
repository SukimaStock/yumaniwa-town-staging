// DotWeather — staging-only developer controls.
// This layer never mutates cached/live weather data. It only overrides the
// city object returned to the renderer, so RESET/LIVE immediately restores
// the real Open-Meteo conditions.

(function (root) {
  "use strict";

  const isStaging = /\/yumaniwa-town-staging(?:\/|$)/.test(root.location?.pathname || "");
  if (!isStaging) return;

  const UI = root.DotWeatherUI;
  if (!UI) return;

  const WEATHER_LABELS = {
    clear: "CLEAR",
    cloudy: "CLOUDY",
    rain: "RAIN",
    thunder: "THUNDER",
    snow: "SNOW",
    fog: "FOG",
    windy: "WINDY",
  };

  const state = {
    weather: null,
    timeOfDay: null,
    windSpeed: null,
    windDirection: null,
  };

  let activeUI = null;
  let panel = null;
  let devButton = null;
  let liveLine = null;
  let effectiveLine = null;

  function hasOverride() {
    return state.weather !== null ||
      state.timeOfDay !== null ||
      state.windSpeed !== null ||
      state.windDirection !== null;
  }

  function resetAll() {
    state.weather = null;
    state.timeOfDay = null;
    state.windSpeed = null;
    state.windDirection = null;
    refreshPanel();
  }

  const originalGetDisplayCity = UI.prototype.getDisplayCity;
  UI.prototype.getDisplayCity = function debugGetDisplayCity() {
    const base = originalGetDisplayCity.call(this);
    if (!base || !hasOverride()) return base;

    const city = { ...base };

    if (state.weather !== null) {
      city.weather = state.weather;
      city.description = "DEBUG " + (WEATHER_LABELS[state.weather] || String(state.weather).toUpperCase());
    }
    if (state.timeOfDay !== null) city.timeOfDay = state.timeOfDay;
    if (state.windSpeed !== null) city.windSpeed = state.windSpeed;
    if (state.windDirection !== null) city.windDirection = state.windDirection;

    return city;
  };

  const originalEnter = UI.prototype.enter;
  UI.prototype.enter = function debugEnter(context) {
    activeUI = this;
    const result = originalEnter.call(this, context);
    mountPanel();
    refreshPanel();
    return result;
  };

  function rounded(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : fallback;
  }

  function describeCity(city) {
    if (!city) return "--";
    const weather = String(city.description || city.weather || "--").toUpperCase();
    const speed = rounded(city.windSpeed, "--");
    const direction = rounded(city.windDirection, "--");
    const time = String(city.timeOfDay || "--").toUpperCase();
    return `${city.name || "CITY"} · ${weather} · ${speed} KM/H @ ${direction}° · ${time}`;
  }

  function setOverride(key, value) {
    state[key] = value;
    refreshPanel();
  }

  function makeButton(label, onClick, options) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = "dw-debug-chip";
    if (options?.key) button.dataset.debugKey = options.key;
    if (options?.value !== undefined && options?.value !== null) button.dataset.debugValue = String(options.value);
    if (options?.live) button.dataset.debugLive = "1";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function addGroup(container, title, buttons) {
    const group = document.createElement("section");
    group.className = "dw-debug-group";

    const heading = document.createElement("div");
    heading.className = "dw-debug-heading";
    heading.textContent = title;
    group.appendChild(heading);

    const row = document.createElement("div");
    row.className = "dw-debug-row";
    buttons.forEach((button) => row.appendChild(button));
    group.appendChild(row);
    container.appendChild(group);
  }

  function mountPanel() {
    if (panel || !document.body) return;

    const style = document.createElement("style");
    style.textContent = `
      #dw-debug-toggle {
        position: fixed;
        z-index: 30000;
        top: calc(env(safe-area-inset-top, 0px) + 8px);
        left: calc(env(safe-area-inset-left, 0px) + 8px);
        min-width: 44px;
        height: 30px;
        padding: 0 10px;
        border: 1px solid rgba(255,255,255,.7);
        border-radius: 5px;
        background: rgba(7,10,23,.88);
        color: #fff4ec;
        font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
        letter-spacing: .08em;
        touch-action: manipulation;
      }
      #dw-debug-panel {
        position: fixed;
        z-index: 29999;
        top: calc(env(safe-area-inset-top, 0px) + 44px);
        left: calc(env(safe-area-inset-left, 0px) + 8px);
        width: min(340px, calc(100vw - 16px));
        max-height: calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 60px);
        overflow: auto;
        box-sizing: border-box;
        padding: 12px;
        border: 1px solid rgba(255,255,255,.55);
        border-radius: 7px;
        background: rgba(7,10,23,.95);
        color: #fff4ec;
        font: 600 10px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
      }
      #dw-debug-panel[hidden] { display: none; }
      .dw-debug-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 12px;
        letter-spacing: .08em;
      }
      .dw-debug-badge {
        padding: 2px 5px;
        border: 1px solid rgba(255,255,255,.45);
        border-radius: 3px;
        font-size: 9px;
        opacity: .85;
      }
      .dw-debug-status {
        margin: 5px 0;
        padding: 6px 7px;
        border: 1px solid rgba(255,255,255,.17);
        border-radius: 4px;
        background: rgba(255,255,255,.05);
        word-break: break-word;
      }
      .dw-debug-status strong { opacity: .62; }
      .dw-debug-group { margin-top: 10px; }
      .dw-debug-heading {
        margin-bottom: 5px;
        opacity: .66;
        font-size: 9px;
        letter-spacing: .09em;
      }
      .dw-debug-row {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .dw-debug-chip {
        min-height: 29px;
        padding: 5px 7px;
        border: 1px solid rgba(255,255,255,.32);
        border-radius: 4px;
        background: rgba(255,255,255,.06);
        color: #fff4ec;
        font: 700 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
        touch-action: manipulation;
      }
      .dw-debug-chip.is-active {
        background: #fff4ec;
        color: #070a17;
        border-color: #fff4ec;
      }
      .dw-debug-reset {
        width: 100%;
        margin-top: 12px;
        min-height: 34px;
      }
      .dw-debug-note {
        margin-top: 8px;
        opacity: .56;
        font-size: 9px;
      }
    `;
    document.head.appendChild(style);

    devButton = document.createElement("button");
    devButton.id = "dw-debug-toggle";
    devButton.type = "button";
    devButton.textContent = "DEV";
    document.body.appendChild(devButton);

    panel = document.createElement("div");
    panel.id = "dw-debug-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="dw-debug-title">
        <span>DOTWEATHER DEBUG</span>
        <span class="dw-debug-badge">STAGING ONLY</span>
      </div>
    `;

    liveLine = document.createElement("div");
    liveLine.className = "dw-debug-status";
    panel.appendChild(liveLine);

    effectiveLine = document.createElement("div");
    effectiveLine.className = "dw-debug-status";
    panel.appendChild(effectiveLine);

    addGroup(panel, "WEATHER", [
      makeButton("LIVE", () => setOverride("weather", null), { key: "weather", live: true }),
      ...["clear", "cloudy", "rain", "thunder", "snow", "fog", "windy"].map((value) =>
        makeButton(value.toUpperCase(), () => setOverride("weather", value), { key: "weather", value }))
    ]);

    addGroup(panel, "TIME OF DAY", [
      makeButton("LIVE", () => setOverride("timeOfDay", null), { key: "timeOfDay", live: true }),
      ...["dawn", "day", "dusk", "night"].map((value) =>
        makeButton(value.toUpperCase(), () => setOverride("timeOfDay", value), { key: "timeOfDay", value }))
    ]);

    addGroup(panel, "WIND SPEED", [
      makeButton("LIVE", () => setOverride("windSpeed", null), { key: "windSpeed", live: true }),
      ...[0, 10, 25, 40, 70].map((value) =>
        makeButton(`${value}K`, () => setOverride("windSpeed", value), { key: "windSpeed", value }))
    ]);

    addGroup(panel, "WIND FROM", [
      makeButton("LIVE", () => setOverride("windDirection", null), { key: "windDirection", live: true }),
      makeButton("W 270° →", () => setOverride("windDirection", 270), { key: "windDirection", value: 270 }),
      makeButton("E 90° ←", () => setOverride("windDirection", 90), { key: "windDirection", value: 90 }),
      makeButton("N 0°", () => setOverride("windDirection", 0), { key: "windDirection", value: 0 }),
      makeButton("S 180°", () => setOverride("windDirection", 180), { key: "windDirection", value: 180 }),
    ]);

    const reset = makeButton("RESET ALL TO LIVE", resetAll);
    reset.classList.add("dw-debug-reset");
    panel.appendChild(reset);

    const note = document.createElement("div");
    note.className = "dw-debug-note";
    note.textContent = "Overrides are visual only. Cached weather and saved city data are untouched.";
    panel.appendChild(note);

    document.body.appendChild(panel);

    const swallow = (event) => event.stopPropagation();
    ["pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "touchend"].forEach((type) => {
      devButton.addEventListener(type, swallow, { passive: true });
      panel.addEventListener(type, swallow, { passive: true });
    });

    devButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      panel.hidden = !panel.hidden;
      refreshPanel();
    });

    root.setInterval(refreshPanel, 500);
  }

  function refreshPanel() {
    if (!panel || !activeUI) return;

    const live = activeUI.getCity?.();
    const effective = activeUI.getDisplayCity?.();
    if (liveLine) liveLine.innerHTML = `<strong>LIVE</strong><br>${describeCity(live)}`;
    if (effectiveLine) {
      effectiveLine.innerHTML = `<strong>${hasOverride() ? "FORCED" : "EFFECTIVE"}</strong><br>${describeCity(effective)}`;
    }

    panel.querySelectorAll(".dw-debug-chip[data-debug-key]").forEach((button) => {
      const key = button.dataset.debugKey;
      const liveButton = button.dataset.debugLive === "1";
      const current = state[key];
      let active = liveButton ? current === null : String(current) === button.dataset.debugValue;
      button.classList.toggle("is-active", active);
    });

    if (devButton) {
      devButton.textContent = hasOverride() ? "DEV*" : "DEV";
    }
  }

  root.DotWeatherDebug = {
    state,
    reset: resetAll,
    setWeather(value) { setOverride("weather", value ?? null); },
    setTimeOfDay(value) { setOverride("timeOfDay", value ?? null); },
    setWindSpeed(value) { setOverride("windSpeed", value === null ? null : Number(value)); },
    setWindDirection(value) { setOverride("windDirection", value === null ? null : Number(value)); },
  };
})(typeof window !== "undefined" ? window : globalThis);
