// DotWeather procedural sky and skyline renderer.

(function (root) {
  "use strict";

  const P = () => root.DotWeatherPixel;

  const STYLES = {
    dawn: {
      top: [60, 76, 108], bottom: [177, 136, 132], haze: [157, 119, 132],
      starAlpha: 55, moonAlpha: 125, cityFar: "pixelIndigo", cityNear: "pixelNavy",
      cloud: [215, 205, 210], rain: [176, 193, 216], textMode: "dark",
    },
    day: {
      top: [84, 145, 202], bottom: [151, 194, 225], haze: [173, 202, 221],
      starAlpha: 0, moonAlpha: 0, cityFar: "pixelIndigo", cityNear: "pixelNavy",
      cloud: [235, 238, 239], rain: [188, 210, 228], textMode: "light",
    },
    dusk: {
      top: [76, 65, 116], bottom: [178, 119, 139], haze: [143, 99, 126],
      starAlpha: 95, moonAlpha: 175, cityFar: "pixelIndigo", cityNear: "pixelNavy",
      cloud: [202, 188, 206], rain: [156, 173, 205], textMode: "dark",
    },
    night: {
      top: [18, 27, 63], bottom: [14, 20, 47], haze: [34, 42, 76],
      starAlpha: 205, moonAlpha: 255, cityFar: "pixelIndigo", cityNear: "pixelDeep",
      cloud: [153, 161, 183], rain: [126, 153, 185], textMode: "dark",
    },
  };

  // Shared celestial-body positions, matching the original Codea version.
  // Sun and moon use the same smoothly moving anchor so switching cities or
  // time-of-day feels like the sky is shifting rather than the icon snapping.
  const BODY_POSITIONS = {
    day: { x: 0.18, y: 0.86 },
    dusk: { x: 0.28, y: 0.76 },
    night: { x: 0.20, y: 0.84 },
    dawn: { x: 0.15, y: 0.78 },
  };

  // Seven deliberately simplified moon silhouettes.
  // Only the lit portion is drawn. The shadow side stays fully transparent
  // so the moon reads as a quiet shape rather than a decorated object.
  const MOON_PHASES = [
    { key: "new", amount: 0.00, side: 0 },
    { key: "waxing-crescent", amount: 0.22, side: 1 },
    { key: "first-quarter", amount: 0.50, side: 1 },
    { key: "waxing-gibbous", amount: 0.78, side: 1 },
    { key: "full", amount: 1.00, side: 0 },
    { key: "last-quarter", amount: 0.50, side: -1 },
    { key: "waning-crescent", amount: 0.22, side: -1 },
  ];

  function resolveMoonPhase(city) {
    const explicit = city?.moonPhase;

    if (Number.isFinite(explicit)) {
      const index = Math.round(explicit) % MOON_PHASES.length;
      return MOON_PHASES[index < 0 ? index + MOON_PHASES.length : index];
    }

    if (typeof explicit === "string") {
      const normalized = explicit.trim().toLowerCase();
      const found = MOON_PHASES.find((phase) => phase.key === normalized);
      if (found) return found;
    }

    // Stage 1 uses fixed demo data. This gives the cities visibly different
    // silhouettes while keeping the future API path open through moonPhase.
    const seed = Math.abs(Math.floor(Number(city?.seed) || 0));
    return MOON_PHASES[Math.floor(seed / 997) % MOON_PHASES.length];
  }

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

  function hashString(value) {
    let h = 5381;
    const source = String(value || "");
    for (let i = 0; i < source.length; i += 1) {
      h = ((h * 33) ^ source.charCodeAt(i)) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function randomValue() {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class DotWeatherWorld {
    constructor(width, height) {
      this.width = width || 360;
      this.height = height || 640;
      this.cityName = "";
      this.seed = 0;
      this.stars = [];
      this.cloudsFar = [];
      this.cloudsNear = [];
      this.farBuildings = [];
      this.nearBuildings = [];
      this.weatherParticles = [];
      this.time = 0;
      this.currentBodyPos = null;
      this.activeCity = null;
      this.birds = [];
      this.bats = [];
      this.shootingStar = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 };
    }

    setCity(city) {
      if (!city) return;
      this.activeCity = city;
      if (this.cityName === city.name) return;
      this.cityName = city.name;
      this.seed = Number(city.seed) || hashString(city.name);
      const targetBodyPos = BODY_POSITIONS[city.timeOfDay] || BODY_POSITIONS.night;
      if (!this.currentBodyPos) {
        this.currentBodyPos = { x: targetBodyPos.x, y: targetBodyPos.y };
      }
      const randomValue = mulberry32(this.seed);

      this.generateStars(randomValue);
      this.shootingStar.active = false;

      this.cloudsFar = [];
      this.cloudsNear = [];

      for (let i = 0; i < 4; i += 1) {
        this.cloudsFar.push({
          x: randomValue() * this.width,
          y: 350 + randomValue() * 200,
          scale: 0.62 + randomValue() * 0.28,
          speed: 1.0 + randomValue() * 1.2,
          type: randomValue() < 0.60 ? 2 : 1,
        });
      }

      for (let i = 0; i < 3; i += 1) {
        const typeRoll = randomValue();
        this.cloudsNear.push({
          x: randomValue() * this.width,
          y: 260 + randomValue() * 150,
          scale: 0.92 + randomValue() * 0.34,
          speed: 2.0 + randomValue() * 1.8,
          type: typeRoll < 0.40 ? 1 : typeRoll < 0.70 ? 2 : 3,
        });
      }

      this.farBuildings = this.makeBuildings(mulberry32(this.seed ^ 0x91a2), true);
      this.nearBuildings = this.makeBuildings(mulberry32(this.seed ^ 0x31f7), false);

      this.weatherParticles = [];
      for (let i = 0; i < 100; i += 1) {
        this.weatherParticles.push({
          x: randomValue() * this.width,
          y: randomValue() * this.height,
          speed: 55 + randomValue() * 110,
          sway: -12 + randomValue() * 24,
          phase: randomValue() * Math.PI * 2,
        });
      }
    }

    generateStars(randomValue) {
      const pixel = 2;
      const gridWidth = Math.floor(this.width / pixel);
      const gridHeight = Math.floor(this.height / pixel);
      const targetCount = Math.floor(gridWidth * gridHeight * 0.002);
      const stars = [];
      let attempts = 0;

      while (stars.length < targetCount && attempts < targetCount * 3) {
        attempts += 1;

        const x = Math.floor(randomValue() * gridWidth) * pixel;
        const yRandom = randomValue();
        const y = Math.floor(gridHeight * (0.30 + 0.70 * Math.pow(yRandom, 0.80))) * pixel;

        // Keep the original uneven star fields instead of distributing every
        // point uniformly across the sky.
        const densityBias = Math.sin((x / pixel) * 0.08 + (this.seed % 100)) * 0.5 + 0.5;
        if (densityBias < 0.25 && randomValue() < 0.80) continue;

        const layerRoll = randomValue();
        let layer = "far";
        let type = "dot";
        let blinkPeriod = 0;

        if (layerRoll < 0.70) {
          layer = "far";
        } else if (layerRoll < 0.98) {
          layer = "mid";
          blinkPeriod = 3 + randomValue() * 5;
        } else {
          layer = "near";

          // Bright stars remain rare and isolated. Crowded candidates fall
          // back to the quieter middle layer.
          const isolated = stars.every((star) => {
            const dx = star.x - x;
            const dy = star.y - y;
            return dx * dx + dy * dy >= 16 * 16;
          });

          if (!isolated) {
            layer = "mid";
            blinkPeriod = 3 + randomValue() * 5;
          } else if (randomValue() < 0.05) {
            type = "cross";
            blinkPeriod = 2 + randomValue() * 2;
          }
        }

        stars.push({
          x,
          y,
          layer,
          type,
          blinkPeriod,
          blinkOffset: randomValue() * 10,
          visibleBias: randomValue(),
        });
      }

      this.stars = stars;
    }

    makeBuildings(randomValue, far) {
      const pixel = 2;
      const gridWidth = Math.floor(this.width / pixel);
      const gridHeight = Math.floor(this.height / pixel);
      const horizonHeight = Math.floor(gridHeight * 0.20);
      const buildings = [];
      const params = far
        ? { yBase: 1 - Math.floor(horizonHeight * 0.04), hMin: 0.45, hMax: 0.85, dither: 3, winMin: 0.05, winMax: 0.08 }
        : { yBase: 1, hMin: 0.25, hMax: 0.75, dither: 4, winMin: 0.22, winMax: 0.34 };
      let x = 1;

      while (x < gridWidth) {
        const gap = randomValue() < 0.05
          ? 8 + Math.floor(randomValue() * 7)
          : 2 + Math.floor(randomValue() * 4);
        x += gap;
        if (x >= gridWidth) break;

        let width;
        if (far) {
          width = 4 + Math.floor(randomValue() * 7);
        } else {
          const widthRoll = randomValue();
          if (widthRoll < 0.60) width = 10 + Math.floor(randomValue() * 9);
          else if (widthRoll < 0.90) width = 4 + Math.floor(randomValue() * 3);
          else width = 20 + Math.floor(randomValue() * 5);
        }

        width = Math.min(width, gridWidth - x);
        if (width < 3) break;

        const heightRoll = randomValue();
        let heightRatio;
        if (heightRoll < 0.30) heightRatio = params.hMin + randomValue() * 0.20;
        else if (heightRoll < 0.90) heightRatio = params.hMin + 0.15 + randomValue() * Math.max(0.05, params.hMax - params.hMin - 0.20);
        else heightRatio = params.hMax - randomValue() * 0.10;

        const height = Math.max(8, Math.floor(horizonHeight * heightRatio));
        const darkBand = randomValue() < 0.60
          ? (() => {
              const bandHeight = 2 + Math.floor(randomValue() * 4);
              const start = 4 + Math.floor(randomValue() * Math.max(1, height - 9));
              return { y1: start, y2: start + bandHeight };
            })()
          : null;
        const colStep = randomValue() < 0.70 ? 2 : 3;
        const rowStep = randomValue() < 0.70 ? 2 : 3;
        const xOffset = Math.floor(randomValue() * colStep);
        const yOffset = Math.floor(randomValue() * rowStep);
        const lightBands = [];

        if (randomValue() < 0.70) {
          const bandHeight = (2 + Math.floor(randomValue() * 4)) * rowStep;
          if (height - bandHeight - 4 > 2) {
            const start = 2 + Math.floor(randomValue() * Math.max(1, height - bandHeight - 3));
            lightBands.push({ y1: start, y2: start + bandHeight });

            if (randomValue() < 0.30) {
              const secondHeight = (1 + Math.floor(randomValue() * 3)) * rowStep;
              const secondStart = 2 + Math.floor(randomValue() * Math.max(1, height - secondHeight - 3));
              if (Math.abs(secondStart - start) > 5) {
                lightBands.push({ y1: secondStart, y2: secondStart + secondHeight });
              }
            }
          }
        }

        let heroBand = null;
        if (!far && randomValue() < 0.40 && height > 10) {
          const bandHeight = (2 + Math.floor(randomValue() * 2)) * rowStep;
          const start = 4 + Math.floor(randomValue() * Math.max(1, height - bandHeight - 7));
          heroBand = { y1: start, y2: start + bandHeight };
        }

        const baseWindowChance = params.winMin + randomValue() * (params.winMax - params.winMin);
        const windows = [];

        for (let wx = 1 + xOffset; wx < width - 1; wx += colStep) {
          for (let wy = 4 + yOffset; wy < height - 3; wy += rowStep) {
            if (darkBand && wy >= darkBand.y1 && wy <= darkBand.y2) continue;

            const inLightBand = lightBands.some((band) => wy >= band.y1 && wy <= band.y2);
            const inHeroBand = heroBand && wy >= heroBand.y1 && wy <= heroBand.y2;
            let chance = baseWindowChance;
            if (inHeroBand) chance *= 2.2;
            else if (inLightBand) chance *= 1.8;
            else chance *= 0.55;
            if (randomValue() >= chance) continue;

            let kind;
            const colorRoll = randomValue();
            if (inHeroBand) kind = randomValue() < 0.90 ? "soft" : "dim";
            else if (colorRoll < 0.70) kind = "soft";
            else if (colorRoll < 0.95) kind = "dim";
            else kind = "accent";

            let windowWidth = 1;
            let windowHeight = 1;
            if (kind === "accent") {
              windowWidth = 1;
            } else if (inHeroBand) {
              windowWidth = 2;
            } else if (far) {
              windowWidth = randomValue() < 0.75 ? 2 : 1;
            } else {
              const sizeRoll = randomValue();
              if (sizeRoll < 0.60) windowWidth = 2;
              else if (sizeRoll > 0.95) {
                windowWidth = 2;
                windowHeight = 2;
              }
            }

            if (wx + windowWidth > width - 1) windowWidth = 1;
            if (wy + windowHeight > height - 2) windowHeight = 1;
            let threshold = randomValue();
            if (inHeroBand || inLightBand) threshold *= 0.5;

            windows.push({
              x: wx,
              y: wy,
              width: windowWidth,
              height: windowHeight,
              kind,
              blink: randomValue() < 0.10,
              threshold,
            });
          }
        }

        const elevatorX = !far && width > 12 && randomValue() < 0.15
          ? 4 + Math.floor(randomValue() * Math.max(1, width - 8))
          : null;

        buildings.push({
          x,
          width,
          height,
          yBase: params.yBase,
          dither: params.dither,
          ditherPhase: Math.floor(randomValue() * 4),
          windows,
          elevatorX,
        });
        x += width;
      }

      // Close the skyline at both canvas edges. The generated city keeps its
      // seeded shape and window layout; only the body of the first and last
      // buildings is extended into the off-screen boundary so the town feels
      // continuous beyond the viewport.
      if (buildings.length > 0) {
        const first = buildings[0];
        if (first.x > 0) {
          const extension = first.x;
          first.x = 0;
          first.width += extension;
          for (const windowValue of first.windows) {
            windowValue.x += extension;
          }
          if (first.elevatorX !== null) first.elevatorX += extension;
        }

        const last = buildings[buildings.length - 1];
        const lastEdge = last.x + last.width;
        if (lastEdge < gridWidth) {
          last.width += gridWidth - lastEdge;
        }
      }

      return buildings;
    }

    update(dt, options) {
      const opts = options || {};
      const delta = Math.max(0, dt);
      this.time += delta;

      if (opts.lowPower) {
        this.shootingStar.active = false;
        return;
      }

      for (const cloud of this.cloudsFar) {
        cloud.x += cloud.speed * delta;
        if (cloud.x > this.width + 60) cloud.x = -60;
      }

      for (const cloud of this.cloudsNear) {
        cloud.x += cloud.speed * delta;
        if (cloud.x > this.width + 70) cloud.x = -70;
      }

      for (const particle of this.weatherParticles) {
        particle.y -= particle.speed * delta;
        if (particle.y < -12) particle.y = this.height + 12;
      }

      this.updateSkyLife(delta, this.activeCity);
      this.updateShootingStar(delta);
    }

    updateSkyLife(dt, city) {
      if (!city) return;

      const timeOfDay = city.timeOfDay || "night";
      const weather = city.weather || "clear";
      const showBirds = timeOfDay !== "night" && (weather === "clear" || weather === "cloudy");
      const showBats = timeOfDay === "night";

      if (showBirds) {
        const maxBirds = 5;
        // Original probability: roughly 0.015 per frame at 60fps.
        if (this.birds.length < maxBirds && Math.random() < dt * 0.90) {
          this.birds.push({
            x: -10,
            y: this.height * (0.55 + Math.random() * 0.27),
            speed: 24 + Math.random() * 12,
            phase: Math.random() * Math.PI * 2,
            amplitude: Math.random() * 3,
          });
        }

        for (let i = this.birds.length - 1; i >= 0; i -= 1) {
          const bird = this.birds[i];
          bird.x += bird.speed * dt;
          if (bird.x > this.width + 10) this.birds.splice(i, 1);
        }
      } else {
        this.birds.length = 0;
      }

      if (showBats) {
        const maxBats = 3;
        // Original probability: roughly 0.0015 per frame at 60fps.
        if (this.bats.length < maxBats && Math.random() < dt * 0.09) {
          const direction = Math.random() < 0.5 ? 1 : -1;
          this.bats.push({
            x: direction > 0 ? -6 : this.width + 6,
            y: this.height * (0.60 + Math.random() * 0.25),
            vx: direction * (36 + Math.random() * 24),
            phase: Math.random() * Math.PI * 2,
            life: 3.3 + Math.random() * 1.7,
          });
        }

        for (let i = this.bats.length - 1; i >= 0; i -= 1) {
          const bat = this.bats[i];
          bat.phase += dt * 9;
          bat.x += bat.vx * dt;
          bat.life -= dt;
          if (bat.x < -10 || bat.x > this.width + 10 || bat.life <= 0) {
            this.bats.splice(i, 1);
          }
        }
      } else {
        this.bats.length = 0;
      }
    }

    spawnShootingStar() {
      const direction = Math.random() > 0.5 ? 1 : -1;
      this.shootingStar = {
        active: true,
        x: this.width * (0.20 + Math.random() * 0.60),
        y: this.height * (0.60 + Math.random() * 0.36),
        vx: direction * (24 + Math.random() * 24),
        vy: -(24 + Math.random() * 24),
        life: 0.30 + Math.random() * 0.20,
      };
    }

    updateShootingStar(dt) {
      const star = this.shootingStar;

      if (star.active) {
        star.x += star.vx * dt;
        star.y += star.vy * dt;
        star.life -= dt;

        if (star.life <= 0 || star.x < 0 || star.x > this.width || star.y < 0 || star.y > this.height) {
          star.active = false;
        }
        return;
      }

      // The original averages roughly one brief shooting star every 90 sec.
      if (Math.random() < dt / 90) this.spawnShootingStar();
    }

    getStyle(city) {
      return STYLES[city?.timeOfDay] || STYLES.night;
    }

    draw(city, options) {
      if (!city) return;
      this.setCity(city);
      const opts = options || {};
      const style = this.getStyle(city);
      const skyStyle = this.resolveSkyStyle(style, opts.transition);

      this.drawSky(skyStyle);
      this.drawStars(style, opts.lowPower, city);
      const bodyPos = this.updateCelestialPosition(city);
      this.drawCelestialBody(skyStyle, city, bodyPos);
      this.drawClouds(style, city);
      this.drawSkyLife(city, opts.lowPower);
      this.drawWeather(style, city, opts.lowPower);
      this.drawSkyline(style, city);
      this.drawGrain(style, opts.lowPower);
    }

    captureSky(city) {
      const style = this.getStyle(city);
      return {
        top: style.top.slice(),
        bottom: style.bottom.slice(),
        haze: style.haze.slice(),
      };
    }

    resolveSkyStyle(style, transition) {
      if (!transition?.active || !transition.oldSky) {
        return style;
      }

      const amount = clamp(transition.mix ?? 0, 0, 1);
      return {
        ...style,
        top: mix(transition.oldSky.top, style.top, amount),
        bottom: mix(transition.oldSky.bottom, style.bottom, amount),
        haze: mix(transition.oldSky.haze, style.haze, amount),
      };
    }

    getSkyColorAt(city, transition, y) {
      const style = this.resolveSkyStyle(this.getStyle(city), transition);
      const t = clamp(y / this.height, 0, 1);
      const base = mix(style.bottom, style.top, t);

      if (y < 80 || y >= 230) return base;

      const hazeAlpha = clamp((1 - (y - 80) / 150) * 12 / 255, 0, 1);
      return mix(base, style.haze, hazeAlpha);
    }

    drawSky(style) {
      const band = 8;
      noStroke();
      for (let y = 0; y < this.height; y += band) {
        const t = clamp(y / this.height, 0, 1);
        const c = mix(style.bottom, style.top, t);
        fill(c[0], c[1], c[2]);
        rect(0, y, this.width, band + 1);
      }

      for (let y = 80; y < 230; y += 4) {
        const alpha = Math.round((1 - (y - 80) / 150) * 12);
        fill(style.haze[0], style.haze[1], style.haze[2], alpha);
        rect(0, y, this.width, 4);
      }
    }

    drawStars(style, lowPower, city) {
      if (style.starAlpha <= 0) return;

      const timeVisibility = style.starAlpha / 255;
      const phase = resolveMoonPhase(city);
      const moonVisibility = 1 - phase.amount * 0.60;
      const globalVisibility = timeVisibility * moonVisibility;
      const horizon = this.height * 0.20;
      const pollutionHeight = this.height * 0.35;

      for (const star of this.stars) {
        let pollutionCutoff = 0;
        if (star.y < horizon + pollutionHeight) {
          const heightRatio = clamp((star.y - horizon) / pollutionHeight, 0, 1);
          pollutionCutoff = (1 - heightRatio) * 0.90;
        }

        if (star.visibleBias + pollutionCutoff >= globalVisibility) continue;

        let visible = true;
        if (!lowPower && star.blinkPeriod > 0) {
          const blink = Math.sin(this.time / star.blinkPeriod + star.blinkOffset);
          visible = blink >= -0.90;
        }
        if (!visible) continue;

        const color = star.layer === "far"
          ? "pixelIndigo"
          : star.layer === "mid"
            ? "pixelGray"
            : "pixelWhite";

        P().drawCell(star.x, star.y, 2, color, 255);

        if (star.type === "cross" && !lowPower) {
          P().drawCell(star.x - 2, star.y, 2, color, 255);
          P().drawCell(star.x + 2, star.y, 2, color, 255);
          P().drawCell(star.x, star.y - 2, 2, color, 255);
          P().drawCell(star.x, star.y + 2, 2, color, 255);
        }
      }

      const shooting = this.shootingStar;
      if (!lowPower && shooting.active && style.starAlpha > 50 && phase.amount < 0.90) {
        P().drawCell(shooting.x, shooting.y, 2, "pixelWhite", 255);
        P().drawCell(
          shooting.x - shooting.vx * 0.04,
          shooting.y - shooting.vy * 0.04,
          2,
          "pixelGray",
          255
        );
      }
    }

    updateCelestialPosition(city) {
      const target = BODY_POSITIONS[city?.timeOfDay] || BODY_POSITIONS.night;
      if (!this.currentBodyPos) {
        this.currentBodyPos = { x: target.x, y: target.y };
      } else {
        // The original approaches the destination by 5% each frame.
        this.currentBodyPos.x += (target.x - this.currentBodyPos.x) * 0.05;
        this.currentBodyPos.y += (target.y - this.currentBodyPos.y) * 0.05;
      }

      return {
        x: this.width * this.currentBodyPos.x,
        y: this.height * this.currentBodyPos.y,
      };
    }

    drawCelestialBody(style, city, position) {
      const timeOfDay = city?.timeOfDay || "night";
      const weather = city?.weather || "clear";
      const showSun = timeOfDay === "day" || timeOfDay === "dusk";

      if (showSun) {
        if (weather !== "rain" && weather !== "thunder" && weather !== "snow") {
          this.drawSun(style, position);
        }
        return;
      }

      this.drawMoon(style, city, position);
    }

    drawSun(style, position) {
      const pixel = 2;
      const radius = 18;
      const coreRadius = radius * 0.60;
      const haloRadius = radius + 4;
      const cx = P().snap(position.x, pixel);
      const cy = P().snap(position.y, pixel);
      const skyT = clamp(cy / this.height, 0, 1);
      const skyColor = mix(style.bottom, style.top, skyT);

      const themeWhite = SSE.theme.color("pixelWhite", 255);
      const themeYellow = SSE.theme.color("pixelYellow", 255);
      const white = [themeWhite.r, themeWhite.g, themeWhite.b];
      const yellow = [themeYellow.r, themeYellow.g, themeYellow.b];

      // Keep the sun close to white so it matches DotWeather's quiet mood.
      // A faint warm edge is enough; strong yellow breaks the world tone.
      const coreColor = mix(skyColor, white, 0.96);
      const bodyBase = mix(white, yellow, 0.16);
      const bodyColor = mix(skyColor, bodyBase, 0.88);
      const haloColor = mix(skyColor, bodyBase, 0.54);

      for (let y = -haloRadius; y <= haloRadius; y += pixel) {
        for (let x = -haloRadius; x <= haloRadius; x += pixel) {
          const distance = Math.sqrt(x * x + y * y);
          let colorValue = null;
          const gx = Math.round(x / pixel);
          const gy = Math.round(y / pixel);

          if (distance <= coreRadius) {
            colorValue = coreColor;
          } else if (distance <= radius) {
            colorValue = bodyColor;
          } else if (distance <= radius + 2) {
            // A clean, even outer ring fits DotWeather better than random halo noise.
            if ((gx + gy) % 2 === 0) {
              colorValue = haloColor;
            }
          }

          if (colorValue) {
            P().drawBlock(cx + x, cy + y, pixel, pixel, colorValue, 255, 0.12);
          }
        }
      }
    }

    drawMoon(style, city, position) {
      if (style.moonAlpha <= 0) return;

      const phase = resolveMoonPhase(city);
      if (phase.key === "new") return;

      const pixel = 2;
      const radius = 18;
      const radiusSquared = radius * radius;
      const cx = P().snap(position.x, pixel);
      const cy = P().snap(position.y, pixel);

      // Blend the moon colour with the sky first, then draw it fully opaque.
      // This preserves the quiet daytime/dusk tone without translucent cell
      // edges producing a visible grid on non-integer display scales.
      const skyT = clamp(cy / this.height, 0, 1);
      const skyColor = mix(style.bottom, style.top, skyT);
      const themeWhite = SSE.theme.color("pixelWhite", 255);
      const white = [themeWhite.r, themeWhite.g, themeWhite.b];
      const moonStrength = clamp((style.moonAlpha * 0.88) / 255, 0, 1);
      const moonColor = mix(skyColor, white, moonStrength);

      for (let y = -radius; y <= radius; y += pixel) {
        const rowSpan = Math.sqrt(Math.max(0, radiusSquared - y * y));
        let runStart = null;
        let runEnd = null;

        for (let x = -radius; x <= radius; x += pixel) {
          const distanceSquared = x * x + y * y;
          if (distanceSquared > radiusSquared) continue;

          let isLit = phase.key === "full";

          if (!isLit) {
            const threshold = rowSpan * (1 - phase.amount * 2);
            if (phase.side > 0) {
              isLit = x >= threshold;
            } else {
              isLit = x <= -threshold;
            }
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
    }

    drawClouds(style, city) {
      if (city.weather === "clear") return;

      const nearMix = city.timeOfDay === "day" ? 0.25 : city.timeOfDay === "night" ? 0.10 : 0.15;
      const cloudNear = mix(style.cloud, style.top, nearMix);
      const shadowNear = cloudNear.map((value) => Math.round(value * 0.70));
      const cloudFar = mix(style.cloud, style.top, 0.70);
      const shadowFar = cloudFar.map((value) => Math.round(value * 0.92));

      let farCount = 2;
      let nearCount = 1;

      if (city.weather === "cloudy") {
        farCount = 4;
        nearCount = 3;
      } else if (city.weather === "rain" || city.weather === "thunder") {
        farCount = 3;
        nearCount = 2;
      } else if (city.weather === "fog") {
        farCount = 4;
        nearCount = 2;
      } else if (city.weather === "snow") {
        farCount = 3;
        nearCount = 2;
      }

      const drawCloudShape = (cloud, mainColor, shadowColor) => {
        const pixel = 2;
        const scale = cloud.scale;
        let baseWidth = 16;
        let middleWidth = 10;
        let topWidth = 6;
        let middleHeight = 2;
        let topHeight = 1;

        if (cloud.type === 2) {
          baseWidth = 22;
          middleWidth = 14;
          topWidth = 5;
        } else if (cloud.type === 3) {
          baseWidth = 14;
          middleWidth = 12;
          topWidth = 9;
          middleHeight = 3;
          topHeight = 2;
        }

        const bx = P().snap(cloud.x, pixel);
        const by = P().snap(cloud.y, pixel);
        const baseW = Math.max(8, Math.round(baseWidth * scale) * pixel);
        const middleW = Math.max(6, Math.round(middleWidth * scale) * pixel);
        const topW = Math.max(4, Math.round(topWidth * scale) * pixel);
        const baseX = P().snap(bx - baseW * 0.5, pixel);
        const middleX = P().snap(bx - middleW * 0.5, pixel);
        const topX = P().snap(bx - topW * 0.5, pixel);

        noStroke();
        fill(shadowColor[0], shadowColor[1], shadowColor[2]);
        rect(baseX, by, baseW, pixel);

        fill(mainColor[0], mainColor[1], mainColor[2]);
        rect(baseX, by + pixel, baseW, pixel * 2);
        rect(middleX, by + pixel * 3, middleW, pixel * middleHeight);
        rect(topX, by + pixel * (3 + middleHeight), topW, pixel * topHeight);
      };

      for (let i = 0; i < Math.min(farCount, this.cloudsFar.length); i += 1) {
        drawCloudShape(this.cloudsFar[i], cloudFar, shadowFar);
      }

      for (let i = 0; i < Math.min(nearCount, this.cloudsNear.length); i += 1) {
        drawCloudShape(this.cloudsNear[i], cloudNear, shadowNear);
      }
    }

    drawSkyLife(city, lowPower) {
      const timeOfDay = city?.timeOfDay || "night";
      const weather = city?.weather || "clear";
      const showBirds = timeOfDay !== "night" && (weather === "clear" || weather === "cloudy");
      const showBats = timeOfDay === "night";
      const pixel = 2;

      if (showBirds) {
        for (const bird of this.birds) {
          const x = P().snap(bird.x, pixel);
          const y = P().snap(bird.y + Math.sin(this.time * 2 + bird.phase) * bird.amplitude, pixel);
          const wingOffset = lowPower || Math.sin(this.time * 12 + bird.phase) <= 0 ? 0 : pixel;

          P().drawCell(x, y, pixel, "pixelWhite", 225);
          P().drawCell(x - pixel, y + wingOffset, pixel, "pixelWhite", 210);
          P().drawCell(x + pixel, y + wingOffset, pixel, "pixelWhite", 210);
        }
      }

      if (showBats) {
        for (const bat of this.bats) {
          const direction = bat.vx > 0 ? 1 : -1;
          const x = P().snap(bat.x, pixel);
          const y = P().snap(bat.y + Math.sin(bat.phase) * pixel, pixel);
          const wingOffset = lowPower || Math.sin(bat.phase * 2) <= 0 ? 0 : pixel;

          // The original bat is intentionally tiny: a body and one directional wing.
          P().drawCell(x, y, pixel, "pixelMauve", 205);
          P().drawCell(x - direction * pixel, y + wingOffset, pixel, "pixelMauve", 185);
        }
      }
    }

    drawWeather(style, city, lowPower) {
      const count = lowPower ? 24 : 48;
      if (city.weather === "rain" || city.weather === "thunder") {
        const rainCount = city.weather === "thunder"
          ? (lowPower ? 24 : 44)
          : (lowPower ? 16 : 30);
        const mainAlpha = city.weather === "thunder" ? 180 : 145;
        const tailAlpha = city.weather === "thunder" ? 100 : 78;
        const tailColor = style.rain.map((value) => Math.round(value * 0.80));

        noStroke();
        for (let i = 0; i < rainCount; i += 1) {
          const p = this.weatherParticles[i];
          const x = P().snap(p.x, 2);
          const y = P().snap(p.y, 2);
          const length = city.weather === "thunder"
            ? 4 + (i % 5)
            : 3 + (i % 3);

          fill(style.rain[0], style.rain[1], style.rain[2], mainAlpha);
          rect(x, y, 2, 2);

          fill(tailColor[0], tailColor[1], tailColor[2], tailAlpha);
          for (let segment = 1; segment < length; segment += 1) {
            rect(x, y + segment * 2, 2, 2);
          }
        }

        if (city.weather === "thunder" && !lowPower && Math.sin(this.time * 2.7) > 0.989) {
          fill(255, 245, 210, 38);
          rect(0, 0, this.width, this.height);
        }
      } else if (city.weather === "snow") {
        for (let i = 0; i < count; i += 1) {
          const p = this.weatherParticles[i];
          P().drawCell(p.x + Math.sin(this.time + p.phase) * 4, p.y, i % 7 === 0 ? 4 : 2, "pixelWhite", 150);
        }
      } else if (city.weather === "windy") {
        stroke(230, 236, 238, 75);
        strokeWidth(2);
        for (let i = 0; i < 10; i += 1) {
          const y = 210 + i * 34 + Math.sin(this.time + i) * 8;
          const x = ((this.time * 28 + i * 47) % (this.width + 90)) - 45;
          line(x, y, x + 34, y);
        }
        noStroke();
      } else if (city.weather === "fog") {
        for (let i = 0; i < 7; i += 1) {
          fill(style.cloud[0], style.cloud[1], style.cloud[2], 24);
          rect(0, 170 + i * 42 + Math.sin(this.time * 0.25 + i) * 5, this.width, 18);
        }
      }
    }

    drawSkyline(style, city) {
      let lightChance = city.timeOfDay === "night"
        ? 0.85
        : city.timeOfDay === "dusk" || city.timeOfDay === "dawn"
          ? 0.40
          : 0.05;

      if (city.weather === "rain" || city.weather === "thunder") {
        lightChance = Math.min(1, lightChance + 0.30);
      }
      if (city.weather === "cloudy" || city.weather === "fog") {
        lightChance = Math.min(1, lightChance + 0.15);
      }

      this.drawBuildingLayer(this.farBuildings, style.cityFar, lightChance, true);
      this.drawBuildingLayer(this.nearBuildings, style.cityNear, lightChance, false);
    }

    drawBuildingLayer(buildings, colorValue, lightChance, far) {
      const pixel = 2;
      const topFade = 9;
      const frame = Math.floor(this.time * 2);
      const bodyAlpha = far ? 225 : 255;
      const elevatorColor = far ? "pixelIndigo" : "pixelIndigo";

      noStroke();

      for (const building of buildings) {
        const roof = building.yBase + building.height;

        // Codea's matrix uses a 1-based bottom row. Canvas is 0-based, so
        // always begin at row 0 to keep every skyline layer grounded.
        for (let gy = 0; gy < roof; gy += 1) {
          for (let gx = building.x; gx < building.x + building.width; gx += 1) {
            const inFade = gy >= roof - topFade;
            if (inFade && (gx + gy + building.ditherPhase) % building.dither === 0) continue;

            const isElevator = building.elevatorX !== null && gx === building.x + building.elevatorX;
            const cellColor = isElevator ? elevatorColor : colorValue;
            const alpha = isElevator ? (far ? 170 : 205) : bodyAlpha;
            P().drawCell(gx * pixel, gy * pixel, pixel, cellColor, alpha);
          }
        }

        if (far) {
          const hazeY = roof + 1;
          for (let gx = building.x; gx < building.x + building.width; gx += 1) {
            if ((gx + hazeY) % 5 === 0) {
              P().drawCell(gx * pixel, hazeY * pixel, pixel, "pixelIndigo", 110);
            }
          }
        }

        for (const windowValue of building.windows) {
          if (windowValue.threshold >= lightChance) continue;
          const absoluteY = building.yBase + windowValue.y;
          const distanceToTop = roof - absoluteY;
          if (absoluteY < 1 || distanceToTop <= 2) continue;
          if (windowValue.blink && ((frame + building.x * 3 + absoluteY * 7) % 13) === 0) continue;
          if (distanceToTop < topFade && (building.x + windowValue.x + absoluteY + building.ditherPhase) % building.dither === 0) continue;

          const colorName = windowValue.kind === "accent"
            ? "pixelYellow"
            : windowValue.kind === "dim"
              ? "pixelIndigo"
              : "pixelWhite";
          const alpha = far
            ? (windowValue.kind === "soft" ? 135 : 110)
            : (windowValue.kind === "soft" ? 230 : 190);

          for (let dx = 0; dx < windowValue.width; dx += 1) {
            for (let dy = 0; dy < windowValue.height; dy += 1) {
              P().drawCell(
                (building.x + windowValue.x + dx) * pixel,
                (absoluteY + dy) * pixel,
                pixel,
                colorName,
                alpha
              );
            }
          }
        }
      }
    }

    drawGrain(style, lowPower) {
      if (lowPower) return;
      const offset = Math.floor(this.time * 8) % 4;
      for (let y = 0; y < this.height; y += 10) {
        for (let x = (y + offset) % 8; x < this.width; x += 16) {
          P().drawCell(x, y, 2, "pixelWhite", style.textMode === "light" ? 4 : 8);
        }
      }
    }
  }

  root.DotWeatherWorld = DotWeatherWorld;
  root.DotWeatherWorldStyles = STYLES;
})(typeof window !== "undefined" ? window : globalThis);
