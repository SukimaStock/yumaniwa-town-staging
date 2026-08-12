// DotWeather stage 1 UI and interaction layer.

(function (root) {
  "use strict";

  const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatHour(timestamp, timezone) {
    const date = new Date((timestamp + timezone) * 1000);
    return String(date.getUTCHours()).padStart(2, "0") + ":00";
  }

  function formatDay(timestamp, timezone) {
    const date = new Date((timestamp + timezone) * 1000);
    return WEEKDAYS[date.getUTCDay()] + " " + String(date.getUTCDate()).padStart(2, "0");
  }

  class DotWeatherUI {
    constructor() {
      const cacheState = DotWeatherData.loadCachedForecasts();
      const storedState = SSE.storage.get("cityState", null);
      const legacyActiveName = SSE.storage.get("activeCity", "");
      const legacyActiveId = DotWeatherData.cityIdFromName(legacyActiveName);
      let storedIds = storedState && storedState.version === 1 ? storedState.ids : null;

      if (!Array.isArray(storedIds)) {
        storedIds = DotWeatherData.defaultCityIds.slice();
        if (legacyActiveId) {
          storedIds = [legacyActiveId, ...storedIds.filter((id) => id !== legacyActiveId)].slice(0, 3);
        }
      }

      this.cityIds = DotWeatherData.resolveCityIds(storedIds);
      this.cities = DotWeatherData.citiesForIds(this.cityIds);
      const requestedActiveId = storedState && storedState.activeId
        ? storedState.activeId
        : (legacyActiveId || this.cityIds[0]);
      const requestedIndex = this.cityIds.indexOf(requestedActiveId);
      this.cityIndex = requestedIndex >= 0 ? requestedIndex : 0;

      this.temperatureUnit = SSE.storage.get("temperatureUnit", "C") === "F" ? "F" : "C";
      this.lowPower = !!SSE.storage.get("lowPower", false);
      this.world = new DotWeatherWorld(360, 640);
      this.scrollX = 0;
      this.scrollVelocity = 0;
      this.dragging = false;
      this.dragMoved = false;
      this.lastTouchX = 0;
      this.lastTouchTime = 0;
      this.menuOpen = false;
      this.panelMode = "menu";
      this.selectedCityId = null;
      this.citySelectMode = false;
      this.transition = {
        phase: "idle",
        progress: 1,
        oldSky: null,
      };
      this.transitioning = false;
      this.context = null;
      this.menuIdle = 0;
      this.menuAlpha = 1;
      this.wakeOnlyTouch = false;
      this.weatherStatus = cacheState.applied > 0 ? "cached" : "demo";
      this.weatherUpdatedAt = cacheState.updatedAt || 0;
      this.weatherErrorUntil = 0;
      this.weatherRequest = null;
      this.autoRefreshTimer = 0;
      this.searchQuery = "";
      this.searchResults = [];
      this.searchStatus = "idle";
      this.searchInput = null;
      this.searchDebounceTimer = null;
      this.searchRequestToken = 0;
      this.searchComposing = false;

      this.bounds = {
        city: { x: 80, y: 576, w: 200, h: 42 },
        cityLeft: { x: 40, y: 576, w: 40, h: 42 },
        cityRight: { x: 280, y: 576, w: 40, h: 42 },
        menu: { x: 326, y: 602, w: 24, h: 24 },
        hourly: { x: 0, y: 330, w: 360, h: 84 },
        menuPanel: { x: 56, y: 178, w: 248, h: 344 },
        cityPanel: { x: 24, y: 82, w: 312, h: 486 },
      };
    }

    enter(context) {
      this.context = context;
      this.world.setCity(this.getCity());
      this.transition.phase = "idle";
      this.transition.progress = 1;
      this.transition.oldSky = null;
      this.transitioning = false;
      this.saveCityState();
      this.refreshWeather({ force: false });
    }

    leave() {
      this.context = null;
      this.dragging = false;
      this.closeCitySearch(true);
    }

    getCity() {
      return this.cities[this.cityIndex] || this.cities[0] || DotWeatherData.catalog[0];
    }

    getDisplayCity() {
      return this.getCity();
    }

    formatTemperature(value) {
      const celsius = Number(value) || 0;
      const display = this.temperatureUnit === "F" ? (celsius * 9) / 5 + 32 : celsius;
      return String(Math.round(display)) + "°";
    }

    refreshCities() {
      this.cityIds = DotWeatherData.resolveCityIds(this.cityIds);
      this.cities = DotWeatherData.citiesForIds(this.cityIds);
      this.cityIndex = clamp(this.cityIndex, 0, Math.max(0, this.cities.length - 1));
    }

    saveCityState(activeId) {
      const active = activeId || this.getCity()?.id || this.cityIds[0];
      SSE.storage.set("cityState", {
        version: 1,
        ids: this.cityIds.slice(0, DotWeatherData.maxCities),
        activeId: active,
      });
      if (this.getCity()) SSE.storage.set("activeCity", this.getCity().name);
    }

    formatUpdateTime(timestamp) {
      if (!timestamp) return "--:--";
      const date = new Date(timestamp);
      return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
    }

    getUpdateValue() {
      if (this.weatherStatus === "loading") return "...";
      if (this.weatherStatus === "error" && Date.now() < this.weatherErrorUntil) return "FAILED";
      return this.formatUpdateTime(this.weatherUpdatedAt);
    }

    async refreshWeather(options) {
      const opts = options || {};
      if (this.weatherRequest) return this.weatherRequest;
      if (!opts.force && !DotWeatherData.needsRefresh(this.weatherUpdatedAt)) return null;

      const refreshSource = opts.reason || (opts.force ? "manual" : "auto");
      const requestStartedAt = Date.now();
      const hasCustomCities = this.cities.some((city) => !!city?.isCustom);
      const durationBucket = (durationMs) => {
        const ms = Math.max(0, Number(durationMs) || 0);
        if (ms < 1000) return "under_1s";
        if (ms < 3000) return "1_3s";
        if (ms < 6000) return "3_6s";
        if (ms < 12000) return "6_12s";
        return "12s_plus";
      };

      if (refreshSource === "manual") {
        SSE.analytics.track("Refresh", {
          city_count: this.cityIds.length,
        });
      }

      this.weatherStatus = "loading";
      const activeId = this.getCity()?.id;
      const request = DotWeatherData.refreshForecasts(this.cityIds)
        .then((result) => {
          this.weatherUpdatedAt = result.updatedAt;
          this.weatherStatus = "live";
          this.weatherErrorUntil = 0;
          this.refreshCities();
          const activeIndex = this.cityIds.indexOf(activeId);
          this.cityIndex = activeIndex >= 0 ? activeIndex : 0;
          this.world.setCity(this.getCity());

          SSE.analytics.track("Weather Load Success", {
            source: refreshSource,
            city_count: this.cityIds.length,
            has_custom_cities: hasCustomCities,
            duration: durationBucket(result.durationMs ?? (Date.now() - requestStartedAt)),
          });

          if (opts.force) {
            SSE.audio.tone({ frequency: 390, endFrequency: 520, duration: 0.07, volume: 0.018 });
          }
          return result;
        })
        .catch((error) => {
          this.weatherStatus = "error";
          this.weatherErrorUntil = Date.now() + 3000;
          const diagnostic = error?.dotWeather || {};
          SSE.analytics.track("Weather Load Error", {
            source: refreshSource,
            city_count: this.cityIds.length,
            has_cached_data: DotWeatherData.hasLiveData(),
            has_custom_cities: hasCustomCities,
            error_type: diagnostic.type || "unknown",
            http_status: diagnostic.httpStatus ? String(diagnostic.httpStatus) : "none",
            duration: durationBucket(diagnostic.durationMs ?? (Date.now() - requestStartedAt)),
            online: typeof navigator === "undefined" ? "unknown" : (navigator.onLine ? "yes" : "no"),
          });
          if (opts.force) {
            SSE.audio.tone({ frequency: 260, endFrequency: 190, duration: 0.09, volume: 0.018 });
          }
          return null;
        })
        .finally(() => {
          this.weatherRequest = null;
        });

      this.weatherRequest = request;
      return request;
    }

    getTextColors(city) {
      if (city.timeOfDay === "day") {
        return { main: "pixelNavy", sub: "pixelMauve", accent: "pixelMist", panel: "pixelDayPanel", edge: "pixelMauve" };
      }
      if (city.timeOfDay === "dusk" || city.timeOfDay === "dawn") {
        return { main: "pixelWhite", sub: "pixelMist", accent: "pixelMist", panel: "pixelNightPanel", edge: "pixelMauve" };
      }
      return { main: "pixelWhite", sub: "pixelGray", accent: "pixelMist", panel: "pixelNightPanel", edge: "pixelGray" };
    }

    getHourlyBounds(city) {
      const itemWidth = 58;
      const contentWidth = city.hourly.length * itemWidth + 12;
      return { min: Math.min(0, 360 - contentWidth), max: 0, itemWidth };
    }

    update(dt) {
      const city = this.getDisplayCity();
      this.world.update(dt, { lowPower: this.lowPower });
      if (this.menuOpen && this.panelMode === "addCity") this.positionCitySearchInput();

      this.autoRefreshTimer += dt;
      if (this.autoRefreshTimer >= 60) {
        this.autoRefreshTimer = 0;
        if (!this.weatherRequest && DotWeatherData.needsRefresh(this.weatherUpdatedAt)) {
          this.refreshWeather({ force: false });
        }
      }
      if (this.weatherStatus === "error" && Date.now() >= this.weatherErrorUntil) {
        this.weatherStatus = DotWeatherData.hasLiveData() ? "cached" : "demo";
      }

      if (!this.menuOpen && !this.dragging) {
        const bounds = this.getHourlyBounds(city);
        if (Math.abs(this.scrollVelocity) > 1) {
          this.scrollX += this.scrollVelocity * dt;
          this.scrollVelocity *= Math.pow(0.05, dt);
        } else {
          this.scrollVelocity = 0;
        }

        if (this.scrollX > bounds.max) {
          this.scrollVelocity += (bounds.max - this.scrollX) * 32 * dt;
          this.scrollX += (bounds.max - this.scrollX) * Math.min(1, 9 * dt);
        } else if (this.scrollX < bounds.min) {
          this.scrollVelocity += (bounds.min - this.scrollX) * 32 * dt;
          this.scrollX += (bounds.min - this.scrollX) * Math.min(1, 9 * dt);
        }
      }

      if (!this.menuOpen) {
        this.menuIdle += dt;
        const target = this.menuIdle > 3 ? 0 : 1;
        this.menuAlpha += (target - this.menuAlpha) * Math.min(1, dt * 5);
        if (this.menuAlpha < 0.005) this.menuAlpha = 0;
      } else {
        this.menuIdle = 0;
        this.menuAlpha += (1 - this.menuAlpha) * Math.min(1, dt * 8);
      }
    }

    draw() {
      const city = this.getDisplayCity();
      const colors = this.getTextColors(city);

      this.world.draw(city, {
        lowPower: this.lowPower,
        transition: this.getTransitionView(),
      });
      this.drawHeader(city, colors);
      this.drawCurrent(city, colors);
      this.drawHourly(city, colors);
      this.drawDaily(city, colors);
      this.drawFooter(city, colors);

      if (this.menuOpen) {
        if (this.panelMode === "cities") this.drawCitiesPanel(city, colors);
        else if (this.panelMode === "cityActions") this.drawCityActionsPanel(city, colors);
        else if (this.panelMode === "addCity") this.drawAddCityPanel(city, colors);
        else this.drawMenu(city, colors);
      }
      this.drawDitherTransition();
    }

    drawHeader(city, colors) {
      DotWeatherPixel.drawText(this.fitCityName(city.name, 20), 180, 592, {
        scale: 2,
        spacing: 4,
        color: colors.main,
        alpha: 242,
        align: "center",
      });

      DotWeatherPixel.drawText(city.description, 180, 558, {
        scale: 2,
        spacing: 4,
        color: colors.accent,
        alpha: 222,
        align: "center",
      });

      const controlBaseAlpha = this.citySelectMode ? 235 : 175;
      const controlAlpha = Math.round(this.menuAlpha * controlBaseAlpha);
      const controlColor = colors.main;
      DotWeatherPixel.drawText("<", 58, 590, { scale: 2, color: controlColor, alpha: controlAlpha, align: "center" });
      DotWeatherPixel.drawText(">", 302, 590, { scale: 2, color: controlColor, alpha: controlAlpha, align: "center" });

      for (let i = 0; i < 3; i += 1) {
        noStroke();
        fill(SSE.theme.color(controlColor, controlAlpha));
        rect(326, 614 - i * 5, 10, 2);
      }
    }

    drawCurrent(city, colors) {
      const tempText = this.formatTemperature(city.temp);
      DotWeatherPixel.drawText(tempText, 180, 458, {
        scale: 8,
        spacing: 5,
        color: colors.main,
        alpha: 248,
        align: "center",
      });

      const lowText = this.formatTemperature(city.low);
      const highText = this.formatTemperature(city.high);
      const temperatureGap = 14;

      DotWeatherPixel.drawText(lowText, 180 - temperatureGap * 0.5, 416, {
        scale: 2,
        spacing: 3,
        color: colors.accent,
        alpha: 190,
        align: "right",
      });
      DotWeatherPixel.drawText(highText, 180 + temperatureGap * 0.5, 416, {
        scale: 2,
        spacing: 3,
        color: colors.main,
        alpha: 225,
        align: "left",
      });
    }

    drawHourly(city, colors) {
      const frame = this.bounds.hourly;

      withClip(frame.x, frame.y, frame.w, frame.h, () => {
        const bounds = this.getHourlyBounds(city);
        const startX = 10 + this.scrollX;

        city.hourly.forEach((item, index) => {
          const x = startX + index * bounds.itemWidth;
          if (x < -bounds.itemWidth || x > 360) return;
          DotWeatherPixel.drawText(this.formatTemperature(item.temp), x + 24, 378, {
            scale: 2,
            color: colors.main,
            alpha: 222,
            align: "center",
          });
          DotWeatherPixel.drawIcon(item.weather, x + 24, 356, {
            scale: 1.5,
            color: index === 0 ? colors.accent : colors.sub,
            alpha: index === 0 ? 215 : 150,
          });
          DotWeatherPixel.drawText(formatHour(item.dt, city.timezone), x + 24, 338, {
            scale: 1,
            color: colors.main,
            alpha: 205,
            align: "center",
          });
        });
      });
    }

    drawDaily(city, colors) {
      city.daily.slice(0, 5).forEach((item, index) => {
        const y = 286 - index * 36;
        const first = index === 0;

        DotWeatherPixel.drawText(formatDay(item.dt, city.timezone), 32, y, {
          scale: 2,
          spacing: 3,
          color: colors.accent,
          alpha: 218,
        });
        DotWeatherPixel.drawIcon(item.weather, 146, y + 7, {
          scale: 1.5,
          color: first ? colors.accent : colors.main,
          alpha: first ? 225 : 205,
        });
        DotWeatherPixel.drawText(this.formatTemperature(item.low), 252, y, {
          scale: 2,
          color: colors.accent,
          alpha: 202,
          align: "right",
        });
        DotWeatherPixel.drawText(this.formatTemperature(item.high), 326, y, {
          scale: 2,
          color: colors.main,
          alpha: 225,
          align: "right",
        });
      });
    }

    drawFooter(city, colors) {
      if (this.lowPower) {
        DotWeatherPixel.drawText("LOW POWER", 180, 112, {
          scale: 1,
          color: colors.sub,
          alpha: 100,
          align: "center",
        });
      }
    }

    getMenuRows() {
      const frame = this.bounds.menuPanel;
      const top = frame.y + frame.h - 96;
      return [
        { id: "cities", y: top, bounds: { x: frame.x + 12, y: top - 9, w: frame.w - 24, h: 30 } },
        { id: "update", y: top - 44, bounds: { x: frame.x + 12, y: top - 53, w: frame.w - 24, h: 30 } },
        { id: "temperature", y: top - 88, bounds: { x: frame.x + 12, y: top - 97, w: frame.w - 24, h: 30 } },
        { id: "power", y: top - 132, bounds: { x: frame.x + 12, y: top - 141, w: frame.w - 24, h: 30 } },
      ];
    }

    drawPanelBackdrop(city, frame) {
      fill(0, 0, 0, 96);
      noStroke();
      rect(0, 0, 360, 640);
      DotWeatherPixel.panel(frame, {
        fill: city.timeOfDay === "day" ? "pixelWhite" : "pixelIndigo",
        edge: city.timeOfDay === "day" ? "pixelNavy" : "pixelWhite",
        alpha: 248,
        edgeAlpha: 255,
        density: 2,
      });
    }

    drawMenu(city, colors) {
      const frame = this.bounds.menuPanel;
      this.drawPanelBackdrop(city, frame);

      DotWeatherPixel.drawText("DOTWEATHER", 180, frame.y + frame.h - 42, {
        scale: 2,
        color: colors.main,
        align: "center",
      });
      DotWeatherPixel.drawText("LIVE FORECAST", 180, frame.y + frame.h - 64, {
        scale: 1,
        color: colors.sub,
        alpha: 190,
        align: "center",
      });

      const rows = this.getMenuRows();
      const values = {
        cities: String(this.cities.length),
        update: this.getUpdateValue(),
        temperature: "°" + this.temperatureUnit,
        power: this.lowPower ? "ON" : "OFF",
      };
      const labels = {
        cities: "CITIES",
        update: "UPDATE NOW",
        temperature: "TEMPERATURE",
        power: "LOW POWER",
      };

      rows.forEach((row) => {
        DotWeatherPixel.drawText(labels[row.id], frame.x + 18, row.y, {
          scale: 2,
          color: colors.main,
        });
        DotWeatherPixel.drawText(values[row.id], frame.x + frame.w - 18, row.y, {
          scale: 2,
          color: (row.id === "power" && this.lowPower) || (row.id === "update" && this.weatherStatus !== "live" && this.weatherStatus !== "cached")
            ? colors.accent
            : colors.main,
          align: "right",
        });
      });

      const sourceLabel = DotWeatherData.hasLiveData()
        ? "WEATHER DATA: OPEN-METEO"
        : (this.weatherStatus === "loading" ? "CONNECTING TO OPEN-METEO" : "WEATHER DATA: DEMO");
      DotWeatherPixel.drawText(sourceLabel, 180, frame.y + 34, {
        scale: 1,
        color: colors.sub,
        alpha: 175,
        align: "center",
      });
      DotWeatherPixel.drawText("DOTWEATHER V1.0", 180, frame.y + 18, {
        scale: 1,
        color: colors.sub,
        alpha: 140,
        align: "center",
      });
    }

    pixelLabel(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9 .,+\-\/:<>?=_°]/g, "?");
    }

    fitCityName(value, maxLength) {
      const text = this.pixelLabel(value);
      return text.length <= maxLength ? text : text.slice(0, Math.max(1, maxLength - 2)) + "..";
    }

    getCityRows() {
      const frame = this.bounds.cityPanel;
      const top = frame.y + frame.h - 94;
      return this.cities.map((city, index) => {
        const y = top - index * 38;
        return {
          city,
          index,
          y,
          bounds: { x: frame.x + 16, y: y - 9, w: frame.w - 32, h: 30 },
          editBounds: { x: frame.x + frame.w - 68, y: y - 9, w: 50, h: 30 },
        };
      });
    }

    getCitiesPanelControls() {
      const frame = this.bounds.cityPanel;
      return {
        add: { x: frame.x + 16, y: frame.y + 74, w: frame.w - 32, h: 32 },
        done: { x: frame.x + 16, y: frame.y + 24, w: frame.w - 32, h: 32 },
      };
    }

    drawCitiesPanel(city, colors) {
      const frame = this.bounds.cityPanel;
      this.drawPanelBackdrop(city, frame);

      DotWeatherPixel.drawText("CITIES", frame.x + 18, frame.y + frame.h - 42, {
        scale: 2,
        color: colors.main,
      });
      DotWeatherPixel.drawText(this.cities.length + "/" + DotWeatherData.maxCities, frame.x + frame.w - 18, frame.y + frame.h - 42, {
        scale: 2,
        color: colors.main,
        align: "right",
      });

      this.getCityRows().forEach((row) => {
        const isCurrent = row.index === this.cityIndex;
        if (isCurrent) {
          DotWeatherPixel.drawText(">", frame.x + 18, row.y, {
            scale: 1,
            color: colors.accent,
          });
        }
        DotWeatherPixel.drawText(this.fitCityName(row.city.name, 17), frame.x + 34, row.y, {
          scale: 2,
          color: isCurrent ? colors.accent : colors.main,
        });
        DotWeatherPixel.drawText("EDIT", frame.x + frame.w - 18, row.y, {
          scale: 1,
          color: colors.sub,
          alpha: 190,
          align: "right",
        });
      });

      const controls = this.getCitiesPanelControls();
      const canAdd = this.cities.length < DotWeatherData.maxCities;
      DotWeatherPixel.drawText(canAdd ? "+ ADD CITY" : "CITY LIMIT", 180, controls.add.y + 9, {
        scale: 2,
        color: canAdd ? colors.main : colors.sub,
        alpha: canAdd ? 255 : 115,
        align: "center",
      });
      DotWeatherPixel.drawText("DONE", 180, controls.done.y + 9, {
        scale: 2,
        color: colors.main,
        align: "center",
      });
    }

    getActionRows() {
      const frame = this.bounds.cityPanel;
      const top = frame.y + frame.h - 150;
      return [
        { id: "up", y: top, bounds: { x: frame.x + 28, y: top - 10, w: frame.w - 56, h: 32 } },
        { id: "down", y: top - 54, bounds: { x: frame.x + 28, y: top - 64, w: frame.w - 56, h: 32 } },
        { id: "remove", y: top - 108, bounds: { x: frame.x + 28, y: top - 118, w: frame.w - 56, h: 32 } },
        { id: "back", y: frame.y + 42, bounds: { x: frame.x + 28, y: frame.y + 32, w: frame.w - 56, h: 32 } },
      ];
    }

    drawCityActionsPanel(city, colors) {
      const frame = this.bounds.cityPanel;
      this.drawPanelBackdrop(city, frame);
      const selectedIndex = this.cityIds.indexOf(this.selectedCityId);
      const selected = selectedIndex >= 0 ? this.cities[selectedIndex] : null;

      DotWeatherPixel.drawText("EDIT CITY", 180, frame.y + frame.h - 42, {
        scale: 2,
        color: colors.main,
        align: "center",
      });
      DotWeatherPixel.drawText(this.fitCityName(selected?.name || "CITY", 20), 180, frame.y + frame.h - 76, {
        scale: 2,
        color: colors.accent,
        align: "center",
      });

      const disabled = {
        up: selectedIndex <= 0,
        down: selectedIndex < 0 || selectedIndex >= this.cities.length - 1,
        remove: this.cities.length <= 1,
        back: false,
      };
      const labels = { up: "MOVE UP", down: "MOVE DOWN", remove: "REMOVE", back: "BACK" };

      this.getActionRows().forEach((row) => {
        DotWeatherPixel.drawText(labels[row.id], 180, row.y, {
          scale: 2,
          color: disabled[row.id] ? colors.sub : colors.main,
          alpha: disabled[row.id] ? 100 : 255,
          align: "center",
        });
      });
    }

    getSearchFieldBounds() {
      const frame = this.bounds.cityPanel;
      return { x: frame.x + 20, y: frame.y + frame.h - 132, w: frame.w - 40, h: 36 };
    }

    getAddCityRows() {
      const frame = this.bounds.cityPanel;
      const top = frame.y + frame.h - 180;
      return this.searchResults.slice(0, 5).map((location, index) => ({
        location,
        y: top - index * 58,
        bounds: { x: frame.x + 18, y: top - index * 58 - 28, w: frame.w - 36, h: 52 },
      }));
    }

    getAddCityBackBounds() {
      const frame = this.bounds.cityPanel;
      return { x: frame.x + 24, y: frame.y + 22, w: frame.w - 48, h: 34 };
    }

    getLocationDetail(location) {
      const parts = [];
      if (location.admin1 && location.admin1.toLowerCase() !== location.name.toLowerCase()) parts.push(location.admin1);
      if (location.country) parts.push(location.country);
      return this.fitCityName(parts.join(", ") || location.countryCode || "LOCATION", 32);
    }

    ensureCitySearchInput() {
      if (this.searchInput || typeof document === "undefined") return this.searchInput;
      const input = document.createElement("input");
      input.type = "search";
      input.id = "dotweather-city-search";
      input.placeholder = "CITY NAME";
      input.autocomplete = "off";
      input.autocapitalize = "words";
      input.spellcheck = false;
      input.setAttribute("aria-label", "Search city");
      Object.assign(input.style, {
        position: "fixed",
        display: "none",
        zIndex: "10000",
        boxSizing: "border-box",
        margin: "0",
        padding: "0 10px",
        border: "2px solid rgba(205,220,233,0.72)",
        borderRadius: "0",
        outline: "none",
        background: "rgba(16,24,57,0.94)",
        color: "#fff4ec",
        caretColor: "#fff4ec",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontWeight: "700",
        letterSpacing: "0.04em",
        WebkitAppearance: "none",
        touchAction: "auto",
      });

      input.addEventListener("compositionstart", () => { this.searchComposing = true; });
      input.addEventListener("compositionend", () => {
        this.searchComposing = false;
        this.searchQuery = input.value;
        this.scheduleCitySearch(false);
      });
      input.addEventListener("input", () => {
        this.searchQuery = input.value;
        if (!this.searchComposing) this.scheduleCitySearch(false);
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this.scheduleCitySearch(true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          this.closeCitySearch();
          this.panelMode = "cities";
        }
      });

      document.body.appendChild(input);
      this.searchInput = input;
      return input;
    }

    positionCitySearchInput() {
      const input = this.searchInput;
      if (!input || !this.menuOpen || this.panelMode !== "addCity") return;
      const canvas = SSE.runtime.canvas;
      if (!canvas || typeof canvas.getBoundingClientRect !== "function") return;
      const canvasRect = canvas.getBoundingClientRect();
      const viewport = SSE.viewport;
      const field = this.getSearchFieldBounds();
      const left = canvasRect.left + viewport.offsetX + field.x * viewport.scale;
      const bottom = viewport.offsetY + (field.y + field.h) * viewport.scale;
      const top = canvasRect.top + viewport.screenHeight - bottom;
      input.style.left = Math.round(left) + "px";
      input.style.top = Math.round(top) + "px";
      input.style.width = Math.max(1, Math.round(field.w * viewport.scale)) + "px";
      input.style.height = Math.max(1, Math.round(field.h * viewport.scale)) + "px";
      input.style.fontSize = Math.max(16, Math.round(12 * viewport.scale)) + "px";
    }

    openCitySearch() {
      this.searchQuery = "";
      this.searchResults = [];
      this.searchStatus = "idle";
      this.searchRequestToken += 1;
      const input = this.ensureCitySearchInput();
      if (!input) return;
      input.value = "";
      input.style.display = "block";
      this.positionCitySearchInput();
      try { input.focus({ preventScroll: true }); }
      catch (_error) { input.focus(); }
    }

    closeCitySearch(removeNode) {
      if (this.searchDebounceTimer !== null) {
        root.clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = null;
      }
      this.searchRequestToken += 1;
      if (!this.searchInput) return;
      this.searchInput.blur();
      this.searchInput.style.display = "none";
      if (removeNode) {
        this.searchInput.remove();
        this.searchInput = null;
      }
    }

    scheduleCitySearch(immediate) {
      if (this.searchDebounceTimer !== null) root.clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
      const query = String(this.searchQuery || "").trim();
      if (Array.from(query).length < 2) {
        this.searchResults = [];
        this.searchStatus = query ? "short" : "idle";
        return;
      }
      this.searchStatus = "loading";
      const run = () => {
        this.searchDebounceTimer = null;
        this.performCitySearch(query);
      };
      if (immediate) run();
      else this.searchDebounceTimer = root.setTimeout(run, 400);
    }

    async performCitySearch(query) {
      const token = ++this.searchRequestToken;
      try {
        const results = await DotWeatherData.searchLocations(query);
        if (token !== this.searchRequestToken || this.panelMode !== "addCity") return;
        this.searchResults = results;
        this.searchStatus = results.length > 0 ? "ready" : "empty";
      } catch (_error) {
        if (token !== this.searchRequestToken || this.panelMode !== "addCity") return;
        this.searchResults = [];
        this.searchStatus = "error";
      }
    }

    drawAddCityPanel(city, colors) {
      const frame = this.bounds.cityPanel;
      this.drawPanelBackdrop(city, frame);

      DotWeatherPixel.drawText("ADD CITY", 180, frame.y + frame.h - 42, {
        scale: 2,
        color: colors.main,
        align: "center",
      });
      DotWeatherPixel.drawText("SEARCH OPEN-METEO", 180, frame.y + frame.h - 70, {
        scale: 1,
        color: colors.sub,
        alpha: 185,
        align: "center",
      });

      const field = this.getSearchFieldBounds();
      noStroke();
      fill(SSE.theme.color(colors.panel, 235));
      rect(field.x, field.y, field.w, field.h);

      this.getAddCityRows().forEach((row) => {
        const existing = DotWeatherData.cityForLocation(row.location);
        const added = !!existing && this.cityIds.includes(existing.id);
        DotWeatherPixel.drawText(this.fitCityName(row.location.name, 19), frame.x + 24, row.y, {
          scale: 2,
          color: added ? colors.sub : colors.main,
          alpha: added ? 125 : 255,
        });
        DotWeatherPixel.drawText(this.getLocationDetail(row.location), frame.x + 24, row.y - 18, {
          scale: 1,
          color: colors.sub,
          alpha: added ? 100 : 175,
        });
        if (added) {
          DotWeatherPixel.drawText("ADDED", frame.x + frame.w - 24, row.y, {
            scale: 1,
            color: colors.accent,
            alpha: 180,
            align: "right",
          });
        }
      });

      const statusLabels = {
        idle: "TYPE A CITY NAME",
        short: "TYPE 2+ CHARACTERS",
        loading: "SEARCHING...",
        empty: "NO CITIES FOUND",
        error: "SEARCH FAILED",
      };
      if (this.searchStatus !== "ready") {
        DotWeatherPixel.drawText(statusLabels[this.searchStatus] || "", 180, frame.y + 286, {
          scale: 1,
          color: this.searchStatus === "error" ? colors.accent : colors.sub,
          alpha: 170,
          align: "center",
        });
      }

      DotWeatherPixel.drawText("BACK", 180, frame.y + 34, {
        scale: 2,
        color: colors.main,
        align: "center",
      });
      this.positionCitySearchInput();
    }

    getTransitionView() {
      const phase = this.transition.phase;
      if (phase === "idle") {
        return {
          active: false,
          phase,
          level: 0,
          mix: 1,
          oldSky: null,
        };
      }

      const progress = clamp(this.transition.progress, 0, 1);
      const level = phase === "out"
        ? Math.floor(progress * 4)
        : Math.floor((1 - progress) * 4);

      return {
        active: true,
        phase,
        level: clamp(level, 0, 4),
        mix: phase === "in" ? progress : 0,
        oldSky: this.transition.oldSky,
      };
    }

    isTransitionPixelAllowed(gridX, gridY, level) {
      if (level <= 0) return true;
      if (level === 1) return (gridX + gridY) % 2 === 0;
      if (level === 2) return gridX % 2 === 0 && gridY % 2 === 0;
      return gridX % 4 === 0 && gridY % 4 === 0;
    }

    drawDitherTransition() {
      const transition = this.getTransitionView();
      if (!transition.active || transition.level <= 0) return;

      const city = this.getDisplayCity();
      const cell = 2;
      const columns = Math.ceil(360 / cell);
      const rows = Math.ceil(640 / cell);
      const bandHeight = 8;

      withCanvasContext((ctx) => {
        for (let bandY = 0; bandY < 640; bandY += bandHeight) {
          const sky = this.world.getSkyColorAt(city, transition, bandY + bandHeight * 0.5);
          ctx.fillStyle = `rgb(${sky[0]}, ${sky[1]}, ${sky[2]})`;
          ctx.beginPath();

          const firstRow = Math.floor(bandY / cell);
          const lastRow = Math.min(rows, Math.ceil((bandY + bandHeight) / cell));

          for (let row = firstRow; row < lastRow; row += 1) {
            const gridY = row + 1;
            let runStart = -1;

            for (let column = 0; column <= columns; column += 1) {
              const allowed = column < columns
                ? this.isTransitionPixelAllowed(column + 1, gridY, transition.level)
                : true;

              if (!allowed && runStart < 0) {
                runStart = column;
              } else if (allowed && runStart >= 0) {
                ctx.rect(runStart * cell, row * cell, (column - runStart) * cell, cell);
                runStart = -1;
              }
            }
          }

          ctx.fill();
        }
      });
    }

    transitionToCity(nextIndex, context) {
      if (this.transitioning || this.cities.length <= 0) return;
      this.closeCitySearch();
      const normalizedIndex = (nextIndex + this.cities.length) % this.cities.length;
      if (normalizedIndex === this.cityIndex) {
        this.menuOpen = false;
        this.panelMode = "menu";
        return;
      }

      this.transitioning = true;
      this.citySelectMode = false;
      this.menuOpen = false;
      this.panelMode = "menu";

      const currentCity = this.getDisplayCity();
      const duration = this.lowPower ? 0.15 : 0.20;

      this.transition.phase = "out";
      this.transition.progress = 0;
      this.transition.oldSky = this.world.captureSky(currentCity);

      context.motion.sequence()
        .to(this.transition, { progress: 1 }, duration, "linear")
        .call(() => {
          this.cityIndex = normalizedIndex;
          this.scrollX = 0;
          this.scrollVelocity = 0;

          const city = this.getCity();
          this.world.setCity(city);
          this.saveCityState(city.id);

          this.transition.phase = "in";
          this.transition.progress = 0;
          SSE.audio.tone({ frequency: 360, endFrequency: 520, duration: 0.08, volume: 0.025 });
        })
        .to(this.transition, { progress: 1 }, duration, "linear")
        .done(() => {
          this.transition.phase = "idle";
          this.transition.progress = 1;
          this.transition.oldSky = null;
          this.transitioning = false;
        })
        .start();
    }

    switchCity(direction, context) {
      this.transitionToCity(this.cityIndex + direction, context);
    }

    toggleTemperatureUnit() {
      this.temperatureUnit = this.temperatureUnit === "C" ? "F" : "C";
      SSE.storage.set("temperatureUnit", this.temperatureUnit);
      SSE.analytics.track("Unit Change", {
        unit: this.temperatureUnit,
      });
      SSE.audio.tone({ frequency: 340, endFrequency: 410, duration: 0.05, volume: 0.018 });
    }

    moveSelectedCity(direction) {
      const index = this.cityIds.indexOf(this.selectedCityId);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= this.cityIds.length) return;
      const activeId = this.getCity().id;
      [this.cityIds[index], this.cityIds[next]] = [this.cityIds[next], this.cityIds[index]];
      this.refreshCities();
      this.cityIndex = Math.max(0, this.cityIds.indexOf(activeId));
      this.saveCityState(activeId);
    }

    removeSelectedCity() {
      if (this.cityIds.length <= 1) return;
      const index = this.cityIds.indexOf(this.selectedCityId);
      if (index < 0) return;

      const activeId = this.getCity().id;
      const removedActive = activeId === this.selectedCityId;
      this.cityIds.splice(index, 1);
      this.refreshCities();

      if (removedActive) {
        this.cityIndex = Math.min(index, this.cities.length - 1);
        this.world.setCity(this.getCity());
      } else {
        this.cityIndex = Math.max(0, this.cityIds.indexOf(activeId));
      }

      this.saveCityState(this.getCity().id);
      SSE.analytics.track("City Remove", {
        city_count: this.cityIds.length,
        removed_active: removedActive,
      });
      this.selectedCityId = null;
      this.panelMode = "cities";
    }

    addCity(cityId, context) {
      if (this.cityIds.length >= DotWeatherData.maxCities || this.cityIds.includes(cityId)) return;
      this.closeCitySearch();
      const city = DotWeatherData.cityById(cityId);
      if (!city) return;

      this.cityIds.push(cityId);
      this.refreshCities();
      const nextIndex = this.cityIds.indexOf(cityId);
      this.saveCityState(this.getCity().id);
      SSE.analytics.track("City Add", {
        city_count: this.cityIds.length,
        source: "search",
      });
      this.transitionToCity(nextIndex, context);
      this.refreshWeather({ force: true, reason: "city_add" });
    }

    touch(touch, context) {
      const controlsWereHidden = this.menuAlpha < 0.08;
      this.menuIdle = 0;
      this.menuAlpha = 1;

      if (this.transitioning) return true;

      if (touch.state === BEGAN && controlsWereHidden && !SSE.ui.hit(touch, this.bounds.hourly)) {
        this.wakeOnlyTouch = true;
        return true;
      }

      if ((touch.state === ENDED || touch.state === CANCELLED) && this.wakeOnlyTouch) {
        this.wakeOnlyTouch = false;
        return true;
      }

      if (this.menuOpen) {
        if (touch.state !== ENDED) return true;

        if (this.panelMode === "menu") {
          const frame = this.bounds.menuPanel;
          if (!SSE.ui.hit(touch, frame)) {
            this.menuOpen = false;
            return true;
          }
          for (const row of this.getMenuRows()) {
            if (!SSE.ui.hit(touch, row.bounds)) continue;
            if (row.id === "cities") this.panelMode = "cities";
            if (row.id === "update") this.refreshWeather({ force: true, reason: "manual" });
            if (row.id === "temperature") this.toggleTemperatureUnit();
            if (row.id === "power") {
              this.lowPower = !this.lowPower;
              SSE.storage.set("lowPower", this.lowPower);
            }
            return true;
          }
          return true;
        }

        if (this.panelMode === "cities") {
          const frame = this.bounds.cityPanel;
          if (!SSE.ui.hit(touch, frame)) {
            this.panelMode = "menu";
            return true;
          }

          for (const row of this.getCityRows()) {
            if (!SSE.ui.hit(touch, row.bounds)) continue;
            if (SSE.ui.hit(touch, row.editBounds)) {
              this.selectedCityId = row.city.id;
              this.panelMode = "cityActions";
            } else {
              this.transitionToCity(row.index, context);
            }
            return true;
          }

          const controls = this.getCitiesPanelControls();
          if (SSE.ui.hit(touch, controls.add)) {
            const canAdd = this.cities.length < DotWeatherData.maxCities;
            if (canAdd) {
              this.panelMode = "addCity";
              this.openCitySearch();
            }
            return true;
          }
          if (SSE.ui.hit(touch, controls.done)) {
            this.menuOpen = false;
            this.panelMode = "menu";
            return true;
          }
          return true;
        }

        if (this.panelMode === "cityActions") {
          const frame = this.bounds.cityPanel;
          if (!SSE.ui.hit(touch, frame)) {
            this.panelMode = "cities";
            return true;
          }

          const selectedIndex = this.cityIds.indexOf(this.selectedCityId);
          for (const row of this.getActionRows()) {
            if (!SSE.ui.hit(touch, row.bounds)) continue;
            if (row.id === "up" && selectedIndex > 0) this.moveSelectedCity(-1);
            if (row.id === "down" && selectedIndex >= 0 && selectedIndex < this.cityIds.length - 1) this.moveSelectedCity(1);
            if (row.id === "remove" && this.cityIds.length > 1) this.removeSelectedCity();
            if (row.id === "back") this.panelMode = "cities";
            return true;
          }
          return true;
        }

        if (this.panelMode === "addCity") {
          const frame = this.bounds.cityPanel;
          if (!SSE.ui.hit(touch, frame)) {
            this.closeCitySearch();
            this.panelMode = "cities";
            return true;
          }
          for (const row of this.getAddCityRows()) {
            if (!SSE.ui.hit(touch, row.bounds)) continue;
            const existing = DotWeatherData.cityForLocation(row.location);
            if (existing && this.cityIds.includes(existing.id)) return true;
            const addedCity = DotWeatherData.registerLocation(row.location);
            if (addedCity) this.addCity(addedCity.id, context);
            return true;
          }
          if (SSE.ui.hit(touch, this.getAddCityBackBounds())) {
            this.closeCitySearch();
            this.panelMode = "cities";
            return true;
          }
          return true;
        }
      }

      if (touch.state === BEGAN) {
        this.wakeOnlyTouch = false;
        if (SSE.ui.hit(touch, this.bounds.hourly)) {
          this.dragging = true;
          this.dragMoved = false;
          this.lastTouchX = touch.x;
          this.lastTouchTime = performance.now() / 1000;
          this.scrollVelocity = 0;
          return true;
        }
        return true;
      }

      if (touch.state === MOVING && this.dragging) {
        const dx = touch.x - this.lastTouchX;
        if (Math.abs(dx) > 1) this.dragMoved = true;
        const now = performance.now() / 1000;
        const dt = Math.max(0.001, now - this.lastTouchTime);
        const bounds = this.getHourlyBounds(this.getDisplayCity());
        this.scrollX += dx;

        if (this.scrollX > bounds.max) this.scrollX = bounds.max + (this.scrollX - bounds.max) * 0.32;
        if (this.scrollX < bounds.min) this.scrollX = bounds.min + (this.scrollX - bounds.min) * 0.32;

        const velocity = clamp(dx / dt, -1800, 1800);
        this.scrollVelocity = this.scrollVelocity * 0.68 + velocity * 0.32;
        this.lastTouchX = touch.x;
        this.lastTouchTime = now;
        return true;
      }

      if (touch.state === ENDED || touch.state === CANCELLED) {
        if (this.dragging) {
          this.dragging = false;
          return true;
        }

        if (SSE.ui.hit(touch, this.bounds.menu)) {
          this.closeCitySearch();
          this.menuOpen = true;
          this.panelMode = "menu";
          this.citySelectMode = false;
          SSE.audio.tone({ frequency: 420, duration: 0.045, volume: 0.018 });
          return true;
        }

        if (SSE.ui.hit(touch, this.bounds.cityLeft)) {
          this.switchCity(-1, context);
          return true;
        }

        if (SSE.ui.hit(touch, this.bounds.cityRight)) {
          this.switchCity(1, context);
          return true;
        }

        if (SSE.ui.hit(touch, this.bounds.city)) {
          this.citySelectMode = !this.citySelectMode;
          SSE.audio.tone({ frequency: this.citySelectMode ? 460 : 350, duration: 0.04, volume: 0.018 });
          return true;
        }
      }

      return true;
    }
  }

  root.DotWeatherUI = DotWeatherUI;
})(typeof window !== "undefined" ? window : globalThis);
