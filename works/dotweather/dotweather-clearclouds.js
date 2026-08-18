// DotWeather — staging-only clear-sky cloud detail experiment.
// MAINLY CLEAR keeps the broad "clear" weather state but allows just a couple
// of quiet clouds so AMBIENT view does not become visually empty.

(function (root) {
  "use strict";

  const isStaging = /\/yumaniwa-town-staging(?:\/|$)/.test(root.location?.pathname || "");
  if (!isStaging) return;

  const World = root.DotWeatherWorld;
  if (!World) return;

  const previousDrawClouds = World.prototype.drawClouds;

  World.prototype.drawClouds = function drawCloudsWithMainlyClear(style, city) {
    const description = String(city?.description || "").toUpperCase();
    const mainlyClear = city?.weather === "clear" && description.includes("MAINLY CLEAR");

    if (!mainlyClear) {
      return previousDrawClouds.call(this, style, city);
    }

    // The original renderer returns immediately for clear weather. Feed it a
    // neutral non-clear key so it uses the light default cloud layout, while
    // temporarily limiting the generated cloud pools to one far + one near.
    const farClouds = this.cloudsFar;
    const nearClouds = this.cloudsNear;

    this.cloudsFar = farClouds.slice(0, 1);
    this.cloudsNear = nearClouds.slice(0, 1);

    try {
      return previousDrawClouds.call(this, style, {
        ...city,
        weather: "mainly-clear",
      });
    } finally {
      this.cloudsFar = farClouds;
      this.cloudsNear = nearClouds;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
