// DotWeather — Open-Meteo forecast data with local demo fallback.

(function (root) {
  "use strict";

  const HOUR = 60 * 60;
  const DAY = 24 * HOUR;
  const BASE_TS = Math.floor(Date.now() / 1000 / HOUR) * HOUR;
  const MAX_CITIES = 8;
  const CACHE_KEY = "weatherCacheV1";
  const CACHE_VERSION = 1;
  const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
  const MAX_CACHE_AGE_MS = 12 * 60 * 60 * 1000;
  const REQUEST_TIMEOUT_MS = 12000;
  const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
  const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
  const CUSTOM_CITIES_KEY = "customCitiesV1";
  const GEOCODING_TIMEOUT_MS = 10000;

  const WEATHER_LABELS = {
    clear: "CLEAR SKY",
    cloudy: "FEW CLOUDS",
    rain: "DRIZZLE",
    snow: "LIGHT SNOW",
    thunder: "THUNDER",
    fog: "FOG",
    windy: "WINDY",
  };

  const PROFILES = [
    { id: "tokyo", name: "Tokyo", country: "Japan", countryCode: "JP", latitude: 35.6762, longitude: 139.6503, temp: 31, high: 34, low: 27, weather: "clear", timeOfDay: "day", timezone: 9 * HOUR, timezoneName: "Asia/Tokyo", seed: 83177 },
    { id: "london", name: "London", country: "United Kingdom", countryCode: "GB", latitude: 51.5072, longitude: -0.1276, temp: 19, high: 21, low: 15, weather: "cloudy", timeOfDay: "dusk", timezone: HOUR, timezoneName: "Europe/London", seed: 49231 },
    { id: "new-york", name: "New York", country: "United States", countryCode: "US", latitude: 40.7128, longitude: -74.0060, temp: 26, high: 29, low: 22, weather: "thunder", timeOfDay: "dusk", timezone: -4 * HOUR, timezoneName: "America/New_York", seed: 72109 },
    { id: "paris", name: "Paris", country: "France", countryCode: "FR", latitude: 48.8566, longitude: 2.3522, temp: 23, high: 26, low: 17, weather: "clear", timeOfDay: "day", timezone: 2 * HOUR, timezoneName: "Europe/Paris", seed: 29417 },
    { id: "kyoto", name: "Kyoto", country: "Japan", countryCode: "JP", latitude: 35.0116, longitude: 135.7681, temp: 29, high: 33, low: 25, weather: "rain", timeOfDay: "day", timezone: 9 * HOUR, timezoneName: "Asia/Tokyo", seed: 61043 },
    { id: "sydney", name: "Sydney", country: "Australia", countryCode: "AU", latitude: -33.8688, longitude: 151.2093, temp: 14, high: 17, low: 10, weather: "windy", timeOfDay: "dawn", timezone: 10 * HOUR, timezoneName: "Australia/Sydney", seed: 94103 },
  ];

  const WEATHER_CYCLE = ["clear", "cloudy", "rain", "clear", "cloudy", "snow", "clear"];
  const LIVE_FIELDS = [
    "temp", "high", "low", "weather", "description", "timeOfDay", "timezone", "timezoneName",
    "hourly", "daily", "apparentTemp", "windSpeed", "windDirection", "dataSource", "updatedAt",
  ];

  let lastUpdatedAt = 0;
  let liveCityCount = 0;
  let cacheLoaded = false;
  let customCitiesLoaded = false;

  function round(value) {
    return Math.round(value * 10) / 10;
  }

  function finite(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function makeHourly(profile) {
    const items = [];
    for (let i = 0; i < 40; i += 1) {
      const wave = Math.sin((i - 3) * Math.PI / 8) * 2.6;
      const drift = ((profile.seed + i * 13) % 5 - 2) * 0.25;
      let weather = profile.weather;
      if (i >= 5 && i <= 8 && profile.weather === "rain") weather = "cloudy";
      if (i >= 9 && profile.weather === "clear") weather = "cloudy";
      if (i > 7 && profile.weather === "thunder") weather = "rain";
      if (i > 10 && profile.weather === "windy") weather = "clear";
      items.push({ dt: BASE_TS + i * 3 * HOUR, temp: round(profile.temp + wave + drift), weather });
    }
    return items;
  }

  function makeDaily(profile) {
    const items = [];
    for (let i = 0; i < 5; i += 1) {
      const weather = i === 0 ? profile.weather : WEATHER_CYCLE[(i + profile.seed) % WEATHER_CYCLE.length];
      const shift = ((profile.seed >> (i + 1)) % 5) - 2;
      items.push({ dt: BASE_TS + i * DAY, high: profile.high + shift, low: profile.low + Math.min(shift, 1), weather });
    }
    return items;
  }

  const catalog = PROFILES.map((profile) => ({
    ...profile,
    description: WEATHER_LABELS[profile.weather] || profile.weather.toUpperCase(),
    hourly: makeHourly(profile),
    daily: makeDaily(profile),
    dataSource: "demo",
    updatedAt: 0,
  }));

  const byId = new Map(catalog.map((city) => [city.id, city]));

  function hashSeed(value) {
    const text = String(value || "city");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0) || 1;
  }

  function coordinateId(latitude, longitude) {
    return Number(latitude).toFixed(4) + "," + Number(longitude).toFixed(4);
  }

  function normalizeLocation(raw) {
    if (!raw || typeof raw !== "object") return null;
    const latitude = finite(raw.latitude, NaN);
    const longitude = finite(raw.longitude, NaN);
    const name = String(raw.name || "").trim();
    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const geocodingId = raw.geocodingId ?? raw.openMeteoId ?? raw.id;
    const rawId = String(raw.id || "");
    const id = rawId.startsWith("geo-")
      ? rawId
      : (geocodingId !== undefined && geocodingId !== null && String(geocodingId).length > 0
        ? "geo-" + String(geocodingId)
        : "geo-" + coordinateId(latitude, longitude));

    return {
      id,
      geocodingId: geocodingId !== undefined && geocodingId !== null ? String(geocodingId).replace(/^geo-/, "") : null,
      name,
      admin1: String(raw.admin1 || "").trim(),
      country: String(raw.country || "").trim(),
      countryCode: String(raw.countryCode || raw.country_code || "").trim().toUpperCase(),
      latitude,
      longitude,
      timezoneName: String(raw.timezoneName || raw.timezone || "auto").trim() || "auto",
    };
  }

  function createCustomCity(location) {
    const seed = hashSeed(location.id + ":" + location.name);
    const profile = {
      ...location,
      temp: 20,
      high: 23,
      low: 16,
      weather: "clear",
      timeOfDay: "day",
      timezone: 0,
      seed,
      isCustom: true,
    };
    return {
      ...profile,
      description: WEATHER_LABELS[profile.weather],
      hourly: makeHourly(profile),
      daily: makeDaily(profile),
      dataSource: "demo",
      updatedAt: 0,
    };
  }

  function findCityForLocation(location) {
    if (!location) return null;
    const direct = byId.get(location.id);
    if (direct) return direct;
    const coordinate = coordinateId(location.latitude, location.longitude);
    const name = location.name.toLowerCase();
    const countryCode = location.countryCode.toUpperCase();
    return catalog.find((city) => {
      if (coordinateId(city.latitude, city.longitude) === coordinate) return true;
      const dx = finite(city.latitude, 0) - location.latitude;
      const dy = finite(city.longitude, 0) - location.longitude;
      const nearby = dx * dx + dy * dy <= 0.01;
      return nearby && city.name.toLowerCase() === name && String(city.countryCode || "").toUpperCase() === countryCode;
    }) || null;
  }

  function persistCustomCities() {
    const cities = catalog
      .filter((city) => city.isCustom)
      .map((city) => ({
        id: city.id,
        geocodingId: city.geocodingId,
        name: city.name,
        admin1: city.admin1,
        country: city.country,
        countryCode: city.countryCode,
        latitude: city.latitude,
        longitude: city.longitude,
        timezoneName: city.timezoneName,
      }));
    root.SSE?.storage?.set(CUSTOM_CITIES_KEY, { version: 1, cities });
  }

  function registerLocation(raw, persist) {
    const location = normalizeLocation(raw);
    if (!location) return null;
    const existing = findCityForLocation(location);
    if (existing) return existing;

    const city = createCustomCity(location);
    catalog.push(city);
    byId.set(city.id, city);
    if (persist !== false) persistCustomCities();
    return city;
  }

  function ensureCustomCitiesLoaded() {
    if (customCitiesLoaded) return;
    customCitiesLoaded = true;
    const stored = root.SSE?.storage?.get(CUSTOM_CITIES_KEY, null);
    const items = stored && stored.version === 1 && Array.isArray(stored.cities) ? stored.cities : [];
    items.forEach((item) => registerLocation(item, false));
  }

  function weatherFromCode(rawCode, windSpeed) {
    const code = Math.round(finite(rawCode, 0));
    const wind = finite(windSpeed, 0);
    if (code === 0) return wind >= 35 ? { key: "windy", label: "WINDY" } : { key: "clear", label: "CLEAR SKY" };
    if (code === 1) return wind >= 35 ? { key: "windy", label: "WINDY" } : { key: "clear", label: "MAINLY CLEAR" };
    if (code === 2) return { key: "cloudy", label: "PARTLY CLOUDY" };
    if (code === 3) return { key: "cloudy", label: "OVERCAST" };
    if (code === 45 || code === 48) return { key: "fog", label: "FOG" };
    if ([51, 53, 55].includes(code)) return { key: "rain", label: code === 51 ? "LIGHT DRIZZLE" : "DRIZZLE" };
    if (code === 56 || code === 57) return { key: "rain", label: "FREEZING DRIZZLE" };
    if ([61, 63, 65].includes(code)) return { key: "rain", label: code === 61 ? "LIGHT RAIN" : code === 65 ? "HEAVY RAIN" : "RAIN" };
    if (code === 66 || code === 67) return { key: "rain", label: "FREEZING RAIN" };
    if ([71, 73, 75, 77].includes(code)) return { key: "snow", label: code === 71 ? "LIGHT SNOW" : code === 75 ? "HEAVY SNOW" : "SNOW" };
    if ([80, 81, 82].includes(code)) return { key: "rain", label: code === 80 ? "RAIN SHOWERS" : "HEAVY SHOWERS" };
    if (code === 85 || code === 86) return { key: "snow", label: "SNOW SHOWERS" };
    if ([95, 96, 99].includes(code)) return { key: "thunder", label: "THUNDERSTORM" };
    return { key: "cloudy", label: "CLOUDY" };
  }

  function deriveTimeOfDay(currentTime, isDay, sunrise, sunset, timezoneOffset) {
    const now = finite(currentTime, Math.floor(Date.now() / 1000));
    const rise = finite(sunrise, NaN);
    const set = finite(sunset, NaN);
    const twilight = 60 * 60;
    if (Number.isFinite(rise) && now >= rise - twilight && now <= rise + twilight) return "dawn";
    if (Number.isFinite(set) && now >= set - twilight && now <= set + twilight) return "dusk";
    if (Number.isFinite(Number(isDay))) return Number(isDay) === 1 ? "day" : "night";
    const localHour = new Date((now + finite(timezoneOffset, 0)) * 1000).getUTCHours();
    if (localHour >= 5 && localHour < 7) return "dawn";
    if (localHour >= 17 && localHour < 20) return "dusk";
    return localHour >= 7 && localHour < 18 ? "day" : "night";
  }

  function makeLiveHourly(city, payload, currentTime) {
    const hourly = payload && payload.hourly ? payload.hourly : {};
    const times = Array.isArray(hourly.time) ? hourly.time : [];
    const temperatures = Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [];
    const codes = Array.isArray(hourly.weather_code) ? hourly.weather_code : [];
    if (times.length === 0) return city.hourly;

    let start = times.findIndex((time) => finite(time, 0) >= currentTime - 30 * 60);
    if (start < 0) start = 0;
    const result = [];
    for (let i = start; i < times.length && result.length < 14; i += 3) {
      const weather = weatherFromCode(codes[i], 0);
      result.push({
        dt: finite(times[i], currentTime + result.length * 3 * HOUR),
        temp: finite(temperatures[i], city.temp),
        weather: weather.key,
      });
    }
    return result.length >= 4 ? result : city.hourly;
  }

  function makeLiveDaily(city, payload) {
    const daily = payload && payload.daily ? payload.daily : {};
    const times = Array.isArray(daily.time) ? daily.time : [];
    const highs = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
    const lows = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
    const codes = Array.isArray(daily.weather_code) ? daily.weather_code : [];
    const result = [];
    for (let i = 0; i < Math.min(5, times.length); i += 1) {
      result.push({
        dt: finite(times[i], BASE_TS + i * DAY),
        high: finite(highs[i], city.high),
        low: finite(lows[i], city.low),
        weather: weatherFromCode(codes[i], 0).key,
      });
    }
    return result.length > 0 ? result : city.daily;
  }

  function normalizeForecast(city, payload, updatedAt) {
    if (!payload || payload.error) throw new Error(payload?.reason || "Invalid forecast response.");
    const current = payload.current || {};
    const daily = payload.daily || {};
    const currentTime = finite(current.time, Math.floor(updatedAt / 1000));
    const windSpeed = finite(current.wind_speed_10m, 0);
    const weather = weatherFromCode(current.weather_code, windSpeed);
    const dailyForecast = makeLiveDaily(city, payload);
    const sunrise = Array.isArray(daily.sunrise) ? daily.sunrise[0] : null;
    const sunset = Array.isArray(daily.sunset) ? daily.sunset[0] : null;
    const timezone = finite(payload.utc_offset_seconds, city.timezone);

    return {
      temp: finite(current.temperature_2m, city.temp),
      apparentTemp: finite(current.apparent_temperature, city.temp),
      high: dailyForecast[0]?.high ?? city.high,
      low: dailyForecast[0]?.low ?? city.low,
      weather: weather.key,
      description: weather.label,
      timeOfDay: deriveTimeOfDay(currentTime, current.is_day, sunrise, sunset, timezone),
      timezone,
      timezoneName: payload.timezone || city.timezoneName,
      windSpeed,
      windDirection: finite(current.wind_direction_10m, 0),
      hourly: makeLiveHourly(city, payload, currentTime),
      daily: dailyForecast,
      dataSource: "open-meteo",
      updatedAt,
    };
  }

  function applyForecast(city, forecast) {
    if (!city || !forecast) return false;
    for (const field of LIVE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(forecast, field)) city[field] = forecast[field];
    }
    return true;
  }

  function serializeForecast(city) {
    const forecast = {};
    for (const field of LIVE_FIELDS) forecast[field] = city[field];
    return forecast;
  }

  function uniqueValidIds(ids) {
    ensureCustomCitiesLoaded();
    const result = [];
    const seen = new Set();
    for (const rawId of Array.isArray(ids) ? ids : []) {
      const id = String(rawId || "");
      if (!byId.has(id) || seen.has(id)) continue;
      seen.add(id);
      result.push(id);
      if (result.length >= MAX_CITIES) break;
    }
    return result;
  }

  function buildForecastUrl(cities) {
    const params = new URLSearchParams({
      latitude: cities.map((city) => city.latitude).join(","),
      longitude: cities.map((city) => city.longitude).join(","),
      current: "temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,wind_direction_10m",
      hourly: "temperature_2m,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
      forecast_days: "5",
      timeformat: "unixtime",
      timezone: cities.map((city) => city.timezoneName || "auto").join(","),
      wind_speed_unit: "kmh",
    });
    return FORECAST_ENDPOINT + "?" + params.toString();
  }

  function saveCache(cities, updatedAt) {
    const existing = root.SSE?.storage?.get(CACHE_KEY, null);
    const forecasts = existing && existing.version === CACHE_VERSION && existing.forecasts
      ? { ...existing.forecasts }
      : {};
    cities.forEach((city) => { forecasts[city.id] = serializeForecast(city); });
    root.SSE?.storage?.set(CACHE_KEY, { version: CACHE_VERSION, updatedAt, forecasts });
  }

  const defaultCityIds = ["tokyo", "london", "new-york"];

  root.DotWeatherData = {
    baseTimestamp: BASE_TS,
    maxCities: MAX_CITIES,
    defaultCityIds: defaultCityIds.slice(),
    refreshIntervalMs: REFRESH_INTERVAL_MS,
    catalog,
    cities: catalog,

    weatherLabel(key) {
      return WEATHER_LABELS[key] || String(key || "").toUpperCase();
    },

    ensureCustomCitiesLoaded() {
      ensureCustomCitiesLoaded();
      return catalog;
    },

    cityById(id) {
      ensureCustomCitiesLoaded();
      return byId.get(String(id || "")) || null;
    },

    cityIdFromName(name) {
      ensureCustomCitiesLoaded();
      const needle = String(name || "").toLowerCase();
      const city = catalog.find((item) => item.name.toLowerCase() === needle);
      return city ? city.id : null;
    },

    resolveCityIds(ids) {
      const resolved = uniqueValidIds(ids);
      return resolved.length > 0 ? resolved : defaultCityIds.slice();
    },

    citiesForIds(ids) {
      return this.resolveCityIds(ids).map((id) => byId.get(id)).filter(Boolean);
    },

    availableCities(ids) {
      ensureCustomCitiesLoaded();
      const active = new Set(this.resolveCityIds(ids));
      return catalog.filter((city) => !active.has(city.id));
    },

    registerLocation(location) {
      ensureCustomCitiesLoaded();
      return registerLocation(location, true);
    },

    cityForLocation(location) {
      ensureCustomCitiesLoaded();
      return findCityForLocation(normalizeLocation(location));
    },

    isLocationRegistered(location) {
      return !!this.cityForLocation(location);
    },

    async searchLocations(query) {
      const name = String(query || "").trim();
      if (Array.from(name).length < 2) return [];
      if (typeof root.fetch !== "function") throw new Error("Fetch API is unavailable.");

      const params = new URLSearchParams({
        name,
        count: "5",
        language: "en",
        format: "json",
      });
      const controller = typeof root.AbortController === "function" ? new root.AbortController() : null;
      const timeout = root.setTimeout(() => controller?.abort(), GEOCODING_TIMEOUT_MS);
      let response;
      try {
        response = await root.fetch(GEOCODING_ENDPOINT + "?" + params.toString(), {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          signal: controller?.signal,
        });
      } finally {
        root.clearTimeout(timeout);
      }
      if (!response || !response.ok) throw new Error("City search failed: " + (response?.status || "network"));
      const json = await response.json();
      if (json?.error) throw new Error(json.reason || "City search failed.");
      const results = Array.isArray(json?.results) ? json.results : [];
      return results.map((item) => normalizeLocation({
        id: item.id,
        geocodingId: item.id,
        name: item.name,
        admin1: item.admin1,
        country: item.country,
        countryCode: item.country_code,
        latitude: item.latitude,
        longitude: item.longitude,
        timezoneName: item.timezone,
      })).filter(Boolean);
    },

    indexOfCity(name, cities) {
      const list = Array.isArray(cities) ? cities : catalog;
      const needle = String(name || "").toLowerCase();
      const index = list.findIndex((city) => city.name.toLowerCase() === needle);
      return index >= 0 ? index : 0;
    },

    loadCachedForecasts() {
      ensureCustomCitiesLoaded();
      if (cacheLoaded) {
        return { applied: liveCityCount, updatedAt: lastUpdatedAt, stale: Date.now() - lastUpdatedAt >= REFRESH_INTERVAL_MS };
      }
      cacheLoaded = true;
      const cache = root.SSE?.storage?.get(CACHE_KEY, null);
      if (!cache || cache.version !== CACHE_VERSION || !cache.forecasts) {
        return { applied: 0, updatedAt: 0, stale: true };
      }
      const age = Date.now() - finite(cache.updatedAt, 0);
      if (age < 0 || age > MAX_CACHE_AGE_MS) {
        return { applied: 0, updatedAt: 0, stale: true };
      }

      let applied = 0;
      for (const [id, forecast] of Object.entries(cache.forecasts)) {
        if (applyForecast(byId.get(id), forecast)) applied += 1;
      }
      liveCityCount = applied;
      lastUpdatedAt = finite(cache.updatedAt, 0);
      return { applied, updatedAt: lastUpdatedAt, stale: age >= REFRESH_INTERVAL_MS };
    },

    hasLiveData() {
      return liveCityCount > 0;
    },

    getLastUpdatedAt() {
      return lastUpdatedAt;
    },

    needsRefresh(updatedAt) {
      const timestamp = finite(updatedAt, lastUpdatedAt);
      return !timestamp || Date.now() - timestamp >= REFRESH_INTERVAL_MS;
    },

    async refreshForecasts(ids) {
      const startedAt = Date.now();
      const cities = this.citiesForIds(ids);

      function diagnosticError(type, message, details) {
        const error = new Error(message);
        error.dotWeather = {
          type,
          ...(details || {}),
          durationMs: Date.now() - startedAt,
        };
        return error;
      }

      if (cities.length === 0) throw diagnosticError("no_cities", "No cities to update.");
      if (typeof root.fetch !== "function") throw diagnosticError("fetch_unavailable", "Fetch API is unavailable.");

      const controller = typeof root.AbortController === "function" ? new root.AbortController() : null;
      const timeout = root.setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);
      let response;
      try {
        response = await root.fetch(buildForecastUrl(cities), {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          signal: controller?.signal,
        });
      } catch (error) {
        const isAbort = error?.name === "AbortError" || controller?.signal?.aborted;
        throw diagnosticError(
          isAbort ? "timeout" : "network",
          isAbort ? "Forecast request timed out." : "Forecast network request failed.",
          { originalName: String(error?.name || "") }
        );
      } finally {
        root.clearTimeout(timeout);
      }

      if (!response || !response.ok) {
        throw diagnosticError("http", "Forecast request failed: " + (response?.status || "network"), {
          httpStatus: response?.status || 0,
        });
      }

      let json;
      try {
        json = await response.json();
      } catch (_error) {
        throw diagnosticError("parse", "Forecast response could not be parsed.");
      }

      const payloads = cities.length === 1 ? [json] : json;
      if (!Array.isArray(payloads) || payloads.length !== cities.length) {
        throw diagnosticError("response_shape", "Forecast response count did not match the city count.", {
          payloadCount: Array.isArray(payloads) ? payloads.length : -1,
        });
      }

      const updatedAt = Date.now();
      let normalized;
      try {
        normalized = payloads.map((payload, index) => normalizeForecast(cities[index], payload, updatedAt));
      } catch (_error) {
        throw diagnosticError("normalize", "Forecast response could not be normalized.");
      }

      normalized.forEach((forecast, index) => applyForecast(cities[index], forecast));
      liveCityCount = Math.max(liveCityCount, cities.length);
      lastUpdatedAt = updatedAt;
      saveCache(cities, updatedAt);
      return {
        updatedAt,
        count: cities.length,
        cities,
        durationMs: Date.now() - startedAt,
      };
    },

    // Exposed for deterministic validation without making a network request.
    normalizeForecastForTest(city, payload, updatedAt) {
      return normalizeForecast(city, payload, updatedAt || Date.now());
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
