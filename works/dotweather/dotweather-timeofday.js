// DotWeather — keep the sky's time of day moving while the app stays open.
// Weather data still refreshes on its normal schedule; this module uses only
// the current clock + city coordinates, so it does not add API requests.

(function (root) {
  "use strict";

  const UI = root.DotWeatherUI;
  if (!UI) return;

  const CHECK_INTERVAL_MS = 60 * 1000;
  const TWILIGHT_SECONDS = 60 * 60;
  const RAD = Math.PI / 180;
  const DAY_MS = 86400000;
  const J1970 = 2440588;
  const J2000 = 2451545;
  const J0 = 0.0009;
  const OBLIQUITY = 23.4397 * RAD;
  const SUNRISE_ANGLE = -0.833 * RAD;

  function finite(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function toJulian(date) {
    return date.valueOf() / DAY_MS - 0.5 + J1970;
  }

  function fromJulian(julian) {
    return new Date((julian + 0.5 - J1970) * DAY_MS);
  }

  function toDays(date) {
    return toJulian(date) - J2000;
  }

  function solarMeanAnomaly(days) {
    return RAD * (357.5291 + 0.98560028 * days);
  }

  function eclipticLongitude(meanAnomaly) {
    const equation = RAD * (
      1.9148 * Math.sin(meanAnomaly) +
      0.0200 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly)
    );
    const perihelion = RAD * 102.9372;
    return meanAnomaly + equation + perihelion + Math.PI;
  }

  function declination(longitude) {
    return Math.asin(Math.sin(OBLIQUITY) * Math.sin(longitude));
  }

  function julianCycle(days, longitudeWest) {
    return Math.round(days - J0 - longitudeWest / (2 * Math.PI));
  }

  function approxTransit(hourAngle, longitudeWest, cycle) {
    return J0 + (hourAngle + longitudeWest) / (2 * Math.PI) + cycle;
  }

  function solarTransitJ(approx, meanAnomaly, longitude) {
    return J2000 + approx +
      0.0053 * Math.sin(meanAnomaly) -
      0.0069 * Math.sin(2 * longitude);
  }

  function hourAngle(altitude, latitude, declinationValue) {
    const denominator = Math.cos(latitude) * Math.cos(declinationValue);
    if (Math.abs(denominator) < 1e-9) return NaN;

    const value = (
      Math.sin(altitude) -
      Math.sin(latitude) * Math.sin(declinationValue)
    ) / denominator;

    if (value < -1 || value > 1) return NaN;
    return Math.acos(value);
  }

  function solarTimes(nowMs, latitudeDegrees, longitudeDegrees) {
    const latitude = finite(latitudeDegrees, NaN);
    const longitude = finite(longitudeDegrees, NaN);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const date = new Date(nowMs);
    const longitudeWest = -longitude * RAD;
    const latitudeRad = latitude * RAD;
    const days = toDays(date);
    const cycle = julianCycle(days, longitudeWest);
    const approxNoon = approxTransit(0, longitudeWest, cycle);
    const meanAnomaly = solarMeanAnomaly(approxNoon);
    const ecliptic = eclipticLongitude(meanAnomaly);
    const declinationValue = declination(ecliptic);
    const solarNoon = solarTransitJ(approxNoon, meanAnomaly, ecliptic);
    const angle = hourAngle(SUNRISE_ANGLE, latitudeRad, declinationValue);

    if (!Number.isFinite(angle)) return null;

    const approxSet = approxTransit(angle, longitudeWest, cycle);
    const sunsetJ = solarTransitJ(approxSet, meanAnomaly, ecliptic);
    const sunriseJ = solarNoon - (sunsetJ - solarNoon);

    return {
      sunrise: Math.floor(fromJulian(sunriseJ).getTime() / 1000),
      sunset: Math.floor(fromJulian(sunsetJ).getTime() / 1000),
    };
  }

  function fallbackTimeOfDay(city, nowSeconds) {
    const timezone = finite(city?.timezone, 0);
    const local = new Date((nowSeconds + timezone) * 1000);
    const hour = local.getUTCHours() + local.getUTCMinutes() / 60;

    if (hour >= 5 && hour < 7) return "dawn";
    if (hour >= 17 && hour < 20) return "dusk";
    return hour >= 7 && hour < 18 ? "day" : "night";
  }

  function currentTimeOfDay(city, nowMs) {
    const nowSeconds = Math.floor(nowMs / 1000);
    const times = solarTimes(nowMs, city?.latitude, city?.longitude);
    if (!times) return fallbackTimeOfDay(city, nowSeconds);

    if (
      nowSeconds >= times.sunrise - TWILIGHT_SECONDS &&
      nowSeconds <= times.sunrise + TWILIGHT_SECONDS
    ) {
      return "dawn";
    }

    if (
      nowSeconds >= times.sunset - TWILIGHT_SECONDS &&
      nowSeconds <= times.sunset + TWILIGHT_SECONDS
    ) {
      return "dusk";
    }

    if (nowSeconds > times.sunrise && nowSeconds < times.sunset) {
      return "day";
    }

    return "night";
  }

  function syncTimeOfDay(ui, nowMs) {
    const cities = Array.isArray(ui?.cities) ? ui.cities : [];
    cities.forEach((city) => {
      if (!city) return;
      city.timeOfDay = currentTimeOfDay(city, nowMs);
    });
  }

  const originalEnter = UI.prototype.enter;
  UI.prototype.enter = function enterWithLiveTimeOfDay(context) {
    const result = originalEnter.call(this, context);
    this._timeOfDayLastCheckAt = Date.now();
    syncTimeOfDay(this, this._timeOfDayLastCheckAt);
    return result;
  };

  const originalUpdate = UI.prototype.update;
  UI.prototype.update = function updateWithLiveTimeOfDay(dt) {
    const result = originalUpdate.call(this, dt);
    const now = Date.now();
    const last = finite(this._timeOfDayLastCheckAt, 0);

    if (!last || now - last >= CHECK_INTERVAL_MS) {
      this._timeOfDayLastCheckAt = now;
      syncTimeOfDay(this, now);
    }

    return result;
  };
})(window);
