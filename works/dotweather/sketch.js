// DotWeather v1.0 — SukimaStock Engine edition.
// Live weather and city search are provided by Open-Meteo.

(function () {
  "use strict";

  const weatherScene = {
    opaque: true,
    ui: null,

    enter(context) {
      if (!this.ui) this.ui = new DotWeatherUI();
      this.ui.enter(context);
    },

    leave(context) {
      if (this.ui) this.ui.leave(context);
    },

    update(dt) {
      if (this.ui) this.ui.update(dt);
    },

    draw() {
      if (this.ui) this.ui.draw();
    },

    touch(touch, context) {
      if (!this.ui) return true;
      return this.ui.touch(touch, context);
    },
  };

  SSE.createApp({
    id: "dotweather",
    logicalWidth: 360,
    logicalHeight: 640,
    frameRate: 30,
    initialScene: "weather",
    outerBackground: "pixelDeep",
    sceneBackground: "pixelNight",
    debug: false,

    theme: {
      colors: {
        pixelDeep: [7, 10, 23],
        pixelNight: [16, 24, 57],
        pixelNavy: [29, 43, 83],
        pixelIndigo: [116, 105, 145],
        pixelMauve: [151, 128, 158],
        pixelMist: [205, 220, 233],
        pixelGray: [200, 202, 207],
        pixelWhite: [255, 244, 236],
        pixelYellow: [224, 211, 72],
        pixelBlue: [41, 173, 255],
        pixelNightPanel: [26, 34, 70],
        pixelDayPanel: [210, 226, 238],
        pixelText: [255, 241, 232],
        pixelSub: [194, 195, 199],
      },
      motion: {
        quick: 0.14,
        card: 0.22,
        read: 0.82,
        scene: 0.52,
      },
    },

    analytics: {
      enabled: true,
    },

    scenes: {
      weather: weatherScene,
    },
  });
})();
