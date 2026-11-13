(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && !root.SukimaStockLighting) root.SukimaStockLighting = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Optional, stateless renderer. This module owns no RAF, input, audio,
  // canvas, storage or DOM lifecycle. All effects require explicit opt-in.
  const VERSION = "0.1.0";
  const CONTRACT = "sukimastock-material-lightmap/0.2";
  const SURFACE = Object.freeze({ BACKGROUND: 0, WALL: 1, ROOF: 2, SIDE: 3, WINDOW: 4, SHADOW: 5 });
  const PERIODS = Object.freeze({
    morning: Object.freeze({ ambient: 0.67, sun: 0.26, altitude: 0.22, azimuth: 1, warm: 0.16, night: 0 }),
    noon: Object.freeze({ ambient: 1, sun: 1, altitude: 1, azimuth: 0, warm: 0, night: 0 }),
    evening: Object.freeze({ ambient: 0.65, sun: 0.30, altitude: 0.25, azimuth: -1, warm: 0.21, night: 0 }),
    night: Object.freeze({ ambient: 0.27, sun: 0, altitude: 0, azimuth: 0, warm: 0, night: 1 })
  });
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  function dimensions(w, h) {
    if (!Number.isSafeInteger(w) || !Number.isSafeInteger(h) || w < 1 || h < 1 || w * h > 1048576)
      throw new RangeError("Lighting requires logical 1..1048576-pixel canvas");
    return w * h;
  }
  function numeric(v, name) {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new TypeError(name + " must be finite");
    return v;
  }
  function stage(name) {
    if (typeof name === "string") {
      if (!Object.hasOwn(PERIODS, name)) throw new RangeError("Unsupported lighting period " + name);
      return PERIODS[name];
    }
    if (!name || typeof name !== "object") throw new TypeError("A period or explicit lighting state is required");
    return {
      ambient: clamp(numeric(name.ambient, "ambient"), 0, 1),
      sun: clamp(numeric(name.sun, "sun"), 0, 1),
      altitude: clamp(numeric(name.altitude, "altitude"), 0, 1),
      azimuth: clamp(numeric(name.azimuth, "azimuth"), -1, 1),
      warm: clamp(numeric(name.warm, "warm"), 0, 1),
      night: clamp(numeric(name.night, "night"), 0, 1)
    };
  }
  function image(image) {
    if (!image || typeof image !== "object") throw new TypeError("ImageData-like input required");
    const n = dimensions(image.width, image.height);
    if (!image.data || image.data.length !== n * 4) throw new RangeError("RGBA length mismatch");
    return { width: image.width, height: image.height, data: image.data };
  }
  function layer(value, n, name) {
    if (value === undefined || value === null) return new Uint8Array(n);
    if (!(value instanceof Uint8Array) && !Array.isArray(value)) throw new TypeError(name + " must be a byte layer");
    if (value.length !== n) throw new RangeError(name + " length mismatch");
    if (Array.isArray(value) && value.some(v => !Number.isInteger(v) || v < 0 || v > 255))
      throw new RangeError(name + " contains invalid bytes");
    return Uint8Array.from(value);
  }
  function shapeBounds(s, w, h) {
    const finite = n => typeof n === "number" && Number.isFinite(n);
    if (!s || typeof s !== "object") throw new TypeError("Invalid shape");
    if (s.shape === "rect" || s.type === "rect") {
      if (![s.x, s.y, s.w, s.h].every(finite) || s.w <= 0 || s.h <= 0) throw new RangeError("Invalid rectangle");
      return [s.x, s.y, s.x + s.w, s.y + s.h];
    }
    if (s.shape === "ellipse" || s.type === "ellipse") {
      if (![s.cx, s.cy, s.rx, s.ry].every(finite) || s.rx <= 0 || s.ry <= 0) throw new RangeError("Invalid ellipse");
      return [s.cx - s.rx, s.cy - s.ry, s.cx + s.rx, s.cy + s.ry];
    }
    if (s.type === "polygon") {
      if (!Array.isArray(s.points) || s.points.length < 3 || s.points.length > 128 ||
          s.points.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(finite)))
        throw new RangeError("Invalid polygon");
      return [Math.min(...s.points.map(p => p[0])), Math.min(...s.points.map(p => p[1])),
              Math.max(...s.points.map(p => p[0])), Math.max(...s.points.map(p => p[1]))];
    }
    if (s.type === "arch") {
      if (![s.x, s.y, s.w, s.h].every(finite) || s.w <= 0 || s.h <= 0)
        throw new RangeError("Invalid arch");
      return [s.x, s.y, s.x + s.w, s.y + s.h];
    }
    throw new RangeError("Unsupported shape geometry");
  }
  function contains(s, x, y) {
    if (s.shape === "rect" || s.type === "rect")
      return x >= s.x && y >= s.y && x < s.x + s.w && y < s.y + s.h;
    if (s.shape === "ellipse" || s.type === "ellipse")
      return ((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2 <= 1;
    if (s.type === "arch") {
      if (x < s.x || x >= s.x + s.w || y < s.y || y >= s.y + s.h) return false;
      const r = s.w * 0.5, cx = s.x + r, cy = s.y + r;
      return y >= cy || (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
    }
    let hit = false;
    for (let i = 0, j = s.points.length - 1; i < s.points.length; j = i++) {
      const a = s.points[i], b = s.points[j];
      if ((a[1] > y) !== (b[1] > y) &&
        x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  }
  function surfaceId(s) {
    if (Number.isInteger(s.surface) && s.surface >= 0 && s.surface <= 5) return s.surface;
    if (s.kind === "window" || s.kind === "lantern") return SURFACE.WINDOW;
    if (typeof s.surface === "string") {
      const v = SURFACE[s.surface.toUpperCase()];
      if (v !== undefined) return v;
    }
    return null;
  }
  function paint(w, h, shapes, base = {}) {
    const n = dimensions(w, h), map = {
      schema: CONTRACT, logicalCanvasPx: { width: w, height: h },
      surface: layer(base.surface, n, "surface"),
      height: layer(base.height, n, "height"),
      emission: layer(base.emission, n, "emission"),
      shapes: []
    };
    if (!Array.isArray(shapes) || shapes.length > 2048) throw new RangeError("Shape count out of bounds");
    for (const s of shapes) {
      const kind = surfaceId(s);
      shapeBounds(s, w, h); // even clipped/offscreen shapes must be valid.
      if (s.kind === "shadow") { map.shapes.push({ ...s }); continue; }
      if (kind === null) throw new RangeError("Unknown shape surface");
      const [x1,y1,x2,y2] = shapeBounds(s, w, h);
      const xmin = clamp(Math.floor(x1), 0, w), xmax = clamp(Math.ceil(x2), 0, w);
      const ymin = clamp(Math.floor(y1), 0, h), ymax = clamp(Math.ceil(y2), 0, h);
      const surfaceHeight = s.heightValue === undefined ? 0 :
        clamp(Math.round(numeric(s.heightValue, "heightValue")), 0, 255);
      const luminous = s.emissionValue === undefined ? (kind === SURFACE.WINDOW ? 255 : 0) :
        clamp(Math.round(numeric(s.emissionValue, "emissionValue")), 0, 255);
      for (let y = ymin; y < ymax; y++) for (let x = xmin; x < xmax; x++) {
        if (!contains(s, x + 0.5, y + 0.5)) continue;
        const index = y * w + x;
        map.surface[index] = kind; map.height[index] = surfaceHeight; map.emission[index] = luminous;
      }
    }
    return map;
  }
  function normalizeMap(map, w, h) {
    const n = dimensions(w, h);
    if (map && map.schema && map.schema !== CONTRACT) throw new RangeError("Material map contract mismatch");
    if (map?.logicalCanvasPx &&
      (map.logicalCanvasPx.width !== w || map.logicalCanvasPx.height !== h))
      throw new RangeError("Material map dimensions mismatch");
    return {
      schema: CONTRACT, logicalCanvasPx: { width: w, height: h },
      surface: layer(map?.surface, n, "surface"),
      height: layer(map?.height, n, "height"),
      emission: layer(map?.emission, n, "emission"),
      shapes: Array.isArray(map?.shapes) ? map.shapes : []
    };
  }
  function material(map, w, h) {
    const normalized = normalizeMap(map, w, h);
    // PNG editor's shapes are drawn as an overlay and may move independently.
    const overlays = normalized.shapes.filter(s => s.kind === "window" || s.kind === "lantern");
    if (!overlays.length) return normalized;
    if (overlays.length > 64) throw new RangeError("Too many editable emission shapes");
    return paint(w, h, overlays, normalized);
  }
  function render(imageData, map, time = "noon") {
    const input = image(imageData);
    const { width, height } = input;
    // An asset without a material map is intentionally rendered unchanged.
    if (!map) return { width, height, data: Uint8ClampedArray.from(input.data) };
    const m = material(map, width, height), e = stage(time);
    const output = new Uint8ClampedArray(input.data.length);
    for (let i = 0; i < width * height; i++) {
      const j = i * 4, alpha = input.data[j + 3], surf = m.surface[i];
      output[j + 3] = alpha;
      if (!alpha) continue;
      let intensity = e.ambient;
      if (surf === SURFACE.WALL) intensity *= .88 + .12 * e.altitude;
      if (surf === SURFACE.ROOF) intensity *= .73 + .27 * e.altitude;
      if (surf === SURFACE.SIDE) intensity *= e.night ? .77 : (e.azimuth < 0 ? 1.04 : .68);
      if (surf === SURFACE.WINDOW) intensity *= e.night ? .70 : .83;
      if (surf === SURFACE.SHADOW) intensity *= .55;
      if (surf) intensity *= .95 + .05 * m.height[i] / 255;
      const glow = (m.emission[i] / 255) * e.night;
      output[j] = clamp(input.data[j] * intensity + e.warm * 22 + glow * 86, 0, 255);
      output[j+1] = clamp(input.data[j+1] * intensity + e.warm * 10 + glow * 51, 0, 255);
      output[j+2] = clamp(input.data[j+2] * intensity + glow * 19, 0, 255);
    }
    return { width, height, data: output };
  }
  function footprints(map, time = "noon") {
    const e = stage(time), shadows = [];
    if (!map?.shapes) return shadows;
    if (!Array.isArray(map.shapes) || map.shapes.length > 2048) throw new RangeError("Invalid shadows");
    for (const s of map.shapes) {
      if (s.kind !== "shadow") continue;
      const bounds = shapeBounds(s);
      const centerX = (bounds[0] + bounds[2]) * .5;
      const centerY = (bounds[1] + bounds[3]) * .5;
      const halfW = (bounds[2] - bounds[0]) * .5, halfH = (bounds[3] - bounds[1]) * .5;
      shadows.push({ id: s.id || null, kind: "contact", shape: { ...s }, opacity: .10 });
      if (!e.sun || e.night) continue;
      const reach = Math.round(e.azimuth * (halfW * .75 + 44 * (1-e.altitude) ** 1.15));
      const drop = Math.round(3 + 17 * (1-e.altitude) ** 1.2);
      if (Math.abs(reach) < 1) continue;
      const y = centerY + Math.min(halfH, 3);
      shadows.push({ id: s.id || null, kind: "cast", opacity: .12 + .24 * e.sun,
        points: [[centerX-halfW,y],[centerX+halfW,y],[centerX+halfW+reach,y+drop],[centerX-halfW+reach,y+drop]] });
    }
    return shadows;
  }
  return Object.freeze({ VERSION, CONTRACT, SURFACE, PERIODS, stage, paint, render, footprints, normalizeMap });
});
