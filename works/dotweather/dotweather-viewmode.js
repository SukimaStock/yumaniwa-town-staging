// DotWeather — staging-only view mode experiment.
// FORECAST keeps the current UI. AMBIENT leaves only city, condition, and
// current temperature so the weather scene can work as a quiet background.

(function (root) {
  "use strict";

  const isStaging = /\/yumaniwa-town-staging(?:\/|$)/.test(root.location?.pathname || "");
  if (!isStaging) return;

  const UI = root.DotWeatherUI;
  if (!UI || !root.SSE || !root.DotWeatherPixel) return;

  const STORAGE_KEY = "viewMode";
  const FORECAST = "forecast";
  const AMBIENT = "ambient";

  function normalizeMode(value) {
    return value === AMBIENT ? AMBIENT : FORECAST;
  }

  function ensureMode(ui) {
    if (ui.viewMode !== FORECAST && ui.viewMode !== AMBIENT) {
      ui.viewMode = normalizeMode(root.SSE.storage.get(STORAGE_KEY, FORECAST));
    }
    return ui.viewMode;
  }

  function setMode(ui, value) {
    const next = normalizeMode(value);
    const previous = ensureMode(ui);
    if (previous === next) return;

    ui.viewMode = next;
    ui.scrollX = 0;
    ui.scrollVelocity = 0;
    root.SSE.storage.set(STORAGE_KEY, next);
    root.SSE.analytics?.track?.("View Mode Change", { mode: next });
    root.SSE.audio?.tone?.({
      frequency: next === AMBIENT ? 390 : 470,
      endFrequency: next === AMBIENT ? 330 : 540,
      duration: 0.06,
      volume: 0.018,
    });
  }

  function toggleMode(ui) {
    setMode(ui, ensureMode(ui) === AMBIENT ? FORECAST : AMBIENT);
  }

  const originalEnter = UI.prototype.enter;
  UI.prototype.enter = function enterWithViewMode(context) {
    ensureMode(this);
    return originalEnter.call(this, context);
  };

  const originalDrawCurrent = UI.prototype.drawCurrent;
  UI.prototype.drawCurrent = function drawCurrentWithViewMode(city, colors) {
    if (ensureMode(this) !== AMBIENT) {
      return originalDrawCurrent.call(this, city, colors);
    }

    const tempText = this.formatTemperature(city.temp);
    root.DotWeatherPixel.drawText(tempText, 180, 458, {
      scale: 8,
      spacing: 5,
      color: colors.main,
      alpha: 248,
      align: "center",
    });
  };

  const originalDrawHourly = UI.prototype.drawHourly;
  UI.prototype.drawHourly = function drawHourlyWithViewMode(city, colors) {
    if (ensureMode(this) === AMBIENT) return;
    return originalDrawHourly.call(this, city, colors);
  };

  const originalDrawDaily = UI.prototype.drawDaily;
  UI.prototype.drawDaily = function drawDailyWithViewMode(city, colors) {
    if (ensureMode(this) === AMBIENT) return;
    return originalDrawDaily.call(this, city, colors);
  };

  const originalDrawFooter = UI.prototype.drawFooter;
  UI.prototype.drawFooter = function drawFooterWithViewMode(city, colors) {
    if (ensureMode(this) === AMBIENT) return;
    return originalDrawFooter.call(this, city, colors);
  };

  UI.prototype.getViewModeRow = function getViewModeRow() {
    const frame = this.bounds.menuPanel;
    const top = frame.y + frame.h - 96;
    const y = top - 176;
    return {
      y,
      bounds: { x: frame.x + 12, y: y - 9, w: frame.w - 24, h: 30 },
    };
  };

  const originalDrawMenu = UI.prototype.drawMenu;
  UI.prototype.drawMenu = function drawMenuWithViewMode(city, colors) {
    originalDrawMenu.call(this, city, colors);

    const row = this.getViewModeRow();
    root.DotWeatherPixel.drawText("VIEW MODE", this.bounds.menuPanel.x + 18, row.y, {
      scale: 2,
      color: colors.main,
    });
    root.DotWeatherPixel.drawText(ensureMode(this).toUpperCase(), this.bounds.menuPanel.x + this.bounds.menuPanel.w - 18, row.y, {
      scale: 2,
      color: ensureMode(this) === AMBIENT ? colors.accent : colors.main,
      align: "right",
    });
  };

  const originalTouch = UI.prototype.touch;
  UI.prototype.touch = function touchWithViewMode(touch, context) {
    ensureMode(this);

    if (
      this.menuOpen &&
      this.panelMode === "menu" &&
      touch.state === ENDED &&
      root.SSE.ui.hit(touch, this.getViewModeRow().bounds)
    ) {
      toggleMode(this);
      return true;
    }

    return originalTouch.call(this, touch, context);
  };

  root.DotWeatherViewMode = {
    FORECAST,
    AMBIENT,
    get(ui) { return ensureMode(ui); },
    set(ui, value) { setMode(ui, value); },
    toggle(ui) { toggleMode(ui); },
  };
})(typeof window !== "undefined" ? window : globalThis);
