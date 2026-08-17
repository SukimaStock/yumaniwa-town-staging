// DotWeather — live wind motion layer for staging.
//
// Uses the wind speed and direction already returned by Open-Meteo to make
// clouds, rain, snow, and WINDY streaks move with the actual conditions.
// Kept separate while tuning in staging; it can be folded into world.js later.

(function (root) {
  "use strict";

  const World = root.DotWeatherWorld;
  if (!World) return;

  const P = () => root.DotWeatherPixel;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  World.prototype.getWindState = function getWindState(city) {
    const rawSpeed = Number(city?.windSpeed);
    const rawDirection = Number(city?.windDirection);
    const hasLiveWind = Number.isFinite(rawSpeed);

    // Demo/fallback data has no wind fields. Preserve the original motion until
    // live Open-Meteo data is available.
    if (!hasLiveWind) {
      return {
        hasData: false,
        speed: 0,
        direction: 270,
        screenX: 1,
        cloudScale: 1,
        particleDrift: 0,
      };
    }

    const speed = Math.max(0, rawSpeed);
    const direction = Number.isFinite(rawDirection)
      ? ((rawDirection % 360) + 360) % 360
      : 270;

    // Almost calm: keep a very slow ambient drift so the sky never looks frozen.
    if (speed < 2) {
      return {
        hasData: true,
        speed,
        direction,
        screenX: 1,
        cloudScale: 0.35,
        particleDrift: 0,
      };
    }

    // Open-Meteo reports the direction the wind comes FROM. DotWeather is a
    // side-view scene, so east/west winds read strongly and north/south winds
    // become a gentler horizontal drift.
    const radians = direction * Math.PI / 180;
    let screenX = -Math.sin(radians);
    if (Math.abs(screenX) < 0.20) {
      screenX = -Math.cos(radians) * 0.20;
    }

    return {
      hasData: true,
      speed,
      direction,
      screenX,
      cloudScale: clamp(0.35 + speed / 18, 0.35, 3.60),
      particleDrift: screenX * clamp(speed * 0.55, 0, 34),
    };
  };

  World.prototype.wrapWindHorizontal = function wrapWindHorizontal(value, margin) {
    if (value > this.width + margin) return -margin;
    if (value < -margin) return this.width + margin;
    return value;
  };

  const originalUpdate = World.prototype.update;

  World.prototype.update = function updateWithLiveWind(dt, options) {
    const opts = options || {};
    const delta = Math.max(0, dt);

    if (opts.lowPower) {
      return originalUpdate.call(this, dt, options);
    }

    // Let the original update handle time, falling particles, sky life, and the
    // shooting star, but temporarily disable its fixed rightward cloud drift.
    const farSpeeds = this.cloudsFar.map((cloud) => cloud.speed);
    const nearSpeeds = this.cloudsNear.map((cloud) => cloud.speed);

    this.cloudsFar.forEach((cloud) => { cloud.speed = 0; });
    this.cloudsNear.forEach((cloud) => { cloud.speed = 0; });

    try {
      originalUpdate.call(this, dt, options);
    } finally {
      this.cloudsFar.forEach((cloud, index) => { cloud.speed = farSpeeds[index] || 0; });
      this.cloudsNear.forEach((cloud, index) => { cloud.speed = nearSpeeds[index] || 0; });
    }

    const wind = this.getWindState(this.activeCity);

    this.cloudsFar.forEach((cloud) => {
      cloud.x += cloud.speed * wind.cloudScale * wind.screenX * delta;
      cloud.x = this.wrapWindHorizontal(cloud.x, 60);
    });

    this.cloudsNear.forEach((cloud) => {
      cloud.x += cloud.speed * wind.cloudScale * wind.screenX * delta;
      cloud.x = this.wrapWindHorizontal(cloud.x, 70);
    });

    const weather = this.activeCity?.weather || "clear";
    const driftWeather = weather === "rain" || weather === "thunder" || weather === "snow";

    if (driftWeather && wind.hasData) {
      const driftScale = weather === "snow" ? 0.72 : 1;
      this.weatherParticles.forEach((particle) => {
        particle.x += wind.particleDrift * driftScale * delta;
        particle.x = this.wrapWindHorizontal(particle.x, 12);
      });
    }

    // Birds disappear before the weather is severe enough to feel stormy.
    if (wind.hasData && wind.speed >= 28) {
      this.birds.length = 0;
    }
  };

  World.prototype.drawWeather = function drawWeatherWithLiveWind(style, city, lowPower) {
    const count = lowPower ? 24 : 48;
    const wind = this.getWindState(city);

    if (city.weather === "rain" || city.weather === "thunder") {
      const rainCount = city.weather === "thunder"
        ? (lowPower ? 24 : 44)
        : (lowPower ? 16 : 30);
      const mainAlpha = city.weather === "thunder" ? 180 : 145;
      const tailAlpha = city.weather === "thunder" ? 100 : 78;
      const tailColor = style.rain.map((value) => Math.round(value * 0.80));
      const tailStepX = wind.hasData
        ? clamp(wind.screenX * wind.speed / 18, -3, 3)
        : 0;

      noStroke();
      for (let i = 0; i < rainCount; i += 1) {
        const particle = this.weatherParticles[i];
        const x = P().snap(particle.x, 2);
        const y = P().snap(particle.y, 2);
        const length = city.weather === "thunder"
          ? 4 + (i % 5)
          : 3 + (i % 3);

        fill(style.rain[0], style.rain[1], style.rain[2], mainAlpha);
        rect(x, y, 2, 2);

        fill(tailColor[0], tailColor[1], tailColor[2], tailAlpha);
        for (let segment = 1; segment < length; segment += 1) {
          const tailX = P().snap(x - tailStepX * segment, 2);
          rect(tailX, y + segment * 2, 2, 2);
        }
      }

      if (city.weather === "thunder" && !lowPower && Math.sin(this.time * 2.7) > 0.989) {
        fill(255, 245, 210, 38);
        rect(0, 0, this.width, this.height);
      }
      return;
    }

    if (city.weather === "snow") {
      const snowSway = wind.hasData
        ? clamp(wind.screenX * wind.speed / 12, -6, 6)
        : 0;

      for (let i = 0; i < count; i += 1) {
        const particle = this.weatherParticles[i];
        const x = particle.x + Math.sin(this.time + particle.phase) * 4 + snowSway;
        P().drawCell(x, particle.y, i % 7 === 0 ? 4 : 2, "pixelWhite", 150);
      }
      return;
    }

    if (city.weather === "windy") {
      const direction = wind.screenX < 0 ? -1 : 1;
      const lineSpeed = 18 + clamp(wind.speed, 0, 70) * 0.45;

      stroke(230, 236, 238, 75);
      strokeWidth(2);
      for (let i = 0; i < 10; i += 1) {
        const y = 210 + i * 34 + Math.sin(this.time + i) * 8;
        const travel = (this.time * lineSpeed + i * 47) % (this.width + 90);
        const x = direction > 0
          ? travel - 45
          : this.width + 45 - travel;
        line(x, y, x + 34 * direction, y);
      }
      noStroke();
      return;
    }

    if (city.weather === "fog") {
      for (let i = 0; i < 7; i += 1) {
        fill(style.cloud[0], style.cloud[1], style.cloud[2], 24);
        rect(0, 170 + i * 42 + Math.sin(this.time * 0.25 + i) * 5, this.width, 18);
      }
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
