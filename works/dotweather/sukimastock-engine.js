// SukimaStock Engine v0.1.1
// A small creative-game framework built on top of Codea Lite for Web.
//
// Codea Lite handles the canvas runtime.
// SukimaStock Engine handles the reusable experience layer:
// scenes, logical viewport, input routing, motion, theme, type, audio,
// i18n, sharing, analytics, error display, and host-page bridges.

(function (root) {
  "use strict";

  const VERSION = "0.1.1";

  // ------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerpValue(a, b, t) {
    return a + (b - a) * t;
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function deepClone(value) {
    if (Array.isArray(value)) return value.map(deepClone);
    if (!isObject(value)) return value;

    const result = {};
    for (const key of Object.keys(value)) {
      result[key] = deepClone(value[key]);
    }
    return result;
  }

  function deepMerge(base, extra) {
    const result = deepClone(base);
    if (!isObject(extra)) return result;

    for (const key of Object.keys(extra)) {
      if (isObject(extra[key]) && isObject(result[key])) {
        result[key] = deepMerge(result[key], extra[key]);
      } else {
        result[key] = deepClone(extra[key]);
      }
    }

    return result;
  }

  function pathValue(source, path) {
    if (!source || !path) return undefined;
    const keys = String(path).split(".");
    let value = source;

    for (const key of keys) {
      if (!value || !Object.prototype.hasOwnProperty.call(value, key)) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  function nowMs() {
    if (typeof performance !== "undefined" && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  function normalizeDuration(value, tokens) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, value);
    }

    if (typeof value === "string" && tokens[value] !== undefined) {
      return Math.max(0, Number(tokens[value]) || 0);
    }

    return Math.max(0, Number(tokens.quick) || 0.16);
  }

  function hexToRgba(hex, alpha) {
    const source = String(hex || "#000000").replace("#", "");
    const normalized = source.length === 3
      ? source.split("").map((part) => part + part).join("")
      : source.padEnd(6, "0").slice(0, 6);

    return {
      r: parseInt(normalized.slice(0, 2), 16) || 0,
      g: parseInt(normalized.slice(2, 4), 16) || 0,
      b: parseInt(normalized.slice(4, 6), 16) || 0,
      a: clamp(alpha === undefined ? 255 : alpha, 0, 255),
    };
  }

  function normalizeColor(value, alpha) {
    if (Array.isArray(value)) {
      return {
        r: clamp(Number(value[0]) || 0, 0, 255),
        g: clamp(Number(value[1]) || 0, 0, 255),
        b: clamp(Number(value[2]) || 0, 0, 255),
        a: clamp(alpha === undefined ? (value[3] ?? 255) : alpha, 0, 255),
      };
    }

    if (typeof value === "string") {
      return hexToRgba(value, alpha);
    }

    if (isObject(value)) {
      return {
        r: clamp(Number(value.r) || 0, 0, 255),
        g: clamp(Number(value.g) || 0, 0, 255),
        b: clamp(Number(value.b) || 0, 0, 255),
        a: clamp(alpha === undefined ? (value.a ?? 255) : alpha, 0, 255),
      };
    }

    return { r: 0, g: 0, b: 0, a: alpha === undefined ? 255 : alpha };
  }

  // ------------------------------------------------------------
  // Default design language
  // ------------------------------------------------------------

  const DEFAULT_THEME = {
    colors: {
      night: [27, 20, 18],
      nightDeep: [16, 12, 11],
      panel: [42, 31, 27],
      panelSoft: [58, 43, 35],
      paper: [242, 225, 190],
      paperShade: [208, 184, 145],
      ink: [55, 38, 30],
      cream: [235, 219, 190],
      dim: [181, 158, 127],
      red: [172, 65, 48],
      redDeep: [119, 43, 35],
      amber: [235, 174, 84],
      wood: [107, 70, 46],
      woodDark: [61, 39, 31],
      shadow: [0, 0, 0],
      highlight: [255, 246, 215],
      success: [132, 163, 111],
      danger: [190, 73, 60],
    },
    fonts: {
      title: '"Kaisei Decol", "Yu Mincho", "Hiragino Mincho ProN", serif',
      ui: '"Zen Kaku Gothic New", "Hiragino Sans", "Noto Sans JP", sans-serif',
      mono: '"Courier Prime", "Courier New", monospace',
    },
    type: {
      hero: { size: 36, font: "title" },
      title: { size: 24, font: "title" },
      result: { size: 25, font: "title" },
      cardMain: { size: 16, font: "ui" },
      cardSub: { size: 10, font: "ui" },
      body: { size: 12, font: "ui" },
      small: { size: 9, font: "ui" },
      mono: { size: 10, font: "mono" },
      button: { size: 13, font: "ui" },
    },
    motion: {
      instant: 0.01,
      quick: 0.16,
      card: 0.24,
      read: 0.96,
      scene: 0.60,
      hold: 1.10,
    },
    ui: {
      radius: 7,
      border: 2,
      shadowX: 3,
      shadowY: -3,
      pressOffset: -2,
    },
  };

  const DEFAULT_CONFIG = {
    id: "sukimastock-app",
    logicalWidth: 360,
    logicalHeight: 640,
    frameRate: null,
    initialScene: null,
    initialPayload: null,
    pointerMode: "primary",
    outerBackground: "nightDeep",
    sceneBackground: "night",
    debug: true,
    theme: {},
    fonts: null,
    audio: null,
    analytics: null,
    bridge: null,
    i18n: null,
    scenes: {},
    setup: null,
  };

  // ------------------------------------------------------------
  // Engine state
  // ------------------------------------------------------------

  const state = {
    configured: false,
    setupDone: false,
    firstFrameDrawn: false,
    config: deepClone(DEFAULT_CONFIG),
    theme: deepClone(DEFAULT_THEME),
    activePointerId: null,
    drawGuardActive: false,
    lastDrawTimeMs: 0,
  };

  // ------------------------------------------------------------
  // App-scoped storage
  // ------------------------------------------------------------

  const storage = {
    prefix: "sse",

    namespace() {
      const appId = String(state.config.id || "sukimastock-app");
      return this.prefix + ":" + appId + ":data:";
    },

    key(name) {
      if (name === undefined || name === null || String(name).length === 0) {
        throw new TypeError("SSE.storage requires a non-empty key.");
      }
      return this.namespace() + String(name);
    },

    set(name, value) {
      if (value === undefined) return this.remove(name);

      try {
        const local = root.localStorage;
        if (!local) return false;
        const payload = JSON.stringify({ version: 1, value });
        local.setItem(this.key(name), payload);
        return true;
      } catch (_error) {
        return false;
      }
    },

    get(name, fallback) {
      try {
        const local = root.localStorage;
        if (!local) return fallback;
        const raw = local.getItem(this.key(name));
        if (raw === null || raw === undefined) return fallback;

        const decoded = JSON.parse(raw);
        if (decoded && decoded.version === 1 && Object.prototype.hasOwnProperty.call(decoded, "value")) {
          return decoded.value;
        }
        return decoded;
      } catch (_error) {
        return fallback;
      }
    },

    has(name) {
      try {
        const local = root.localStorage;
        if (!local) return false;
        return local.getItem(this.key(name)) !== null;
      } catch (_error) {
        return false;
      }
    },

    remove(name) {
      try {
        const local = root.localStorage;
        if (!local) return false;
        local.removeItem(this.key(name));
        return true;
      } catch (_error) {
        return false;
      }
    },

    clear() {
      try {
        const local = root.localStorage;
        if (!local) return false;
        const prefix = this.namespace();
        const keys = [];

        for (let i = 0; i < local.length; i += 1) {
          const key = local.key(i);
          if (key && key.startsWith(prefix)) keys.push(key);
        }

        for (const key of keys) local.removeItem(key);
        return true;
      } catch (_error) {
        return false;
      }
    },
  };

  // ------------------------------------------------------------
  // Viewport
  // ------------------------------------------------------------

  const viewport = {
    logicalWidth: 360,
    logicalHeight: 640,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    screenWidth: 0,
    screenHeight: 0,

    configure(width, height) {
      this.logicalWidth = Math.max(1, Number(width) || 360);
      this.logicalHeight = Math.max(1, Number(height) || 640);
      this.update(true);
    },

    update(force) {
      const screenW = typeof root.WIDTH === "number" ? root.WIDTH : this.screenWidth;
      const screenH = typeof root.HEIGHT === "number" ? root.HEIGHT : this.screenHeight;

      if (
        !force &&
        screenW === this.screenWidth &&
        screenH === this.screenHeight
      ) {
        return false;
      }

      this.screenWidth = Math.max(1, screenW || 1);
      this.screenHeight = Math.max(1, screenH || 1);

      const sx = this.screenWidth / this.logicalWidth;
      const sy = this.screenHeight / this.logicalHeight;
      this.scale = Math.max(0.000001, Math.min(sx, sy));
      this.offsetX = (this.screenWidth - this.logicalWidth * this.scale) * 0.5;
      this.offsetY = (this.screenHeight - this.logicalHeight * this.scale) * 0.5;
      return true;
    },

    containsScreen(x, y) {
      return (
        x >= this.offsetX &&
        x <= this.offsetX + this.logicalWidth * this.scale &&
        y >= this.offsetY &&
        y <= this.offsetY + this.logicalHeight * this.scale
      );
    },

    toLogical(point) {
      const x = (Number(point.x) - this.offsetX) / this.scale;
      const y = (Number(point.y) - this.offsetY) / this.scale;
      const prevX = (Number(point.prevX ?? point.x) - this.offsetX) / this.scale;
      const prevY = (Number(point.prevY ?? point.y) - this.offsetY) / this.scale;

      return {
        id: point.id,
        state: point.state,
        x,
        y,
        prevX,
        prevY,
        deltaX: x - prevX,
        deltaY: y - prevY,
        screenX: Number(point.x),
        screenY: Number(point.y),
        inside: this.containsScreen(Number(point.x), Number(point.y)),
        original: point,
      };
    },

    toScreen(x, y) {
      return {
        x: this.offsetX + x * this.scale,
        y: this.offsetY + y * this.scale,
      };
    },

    begin() {
      if (typeof root.pushClip === "function") {
        root.pushClip(
          this.offsetX,
          this.offsetY,
          this.logicalWidth * this.scale,
          this.logicalHeight * this.scale
        );
      }

      root.pushMatrix();
      root.translate(this.offsetX, this.offsetY);
      root.scale(this.scale);
    },

    end() {
      root.popMatrix();
      if (typeof root.popClip === "function") {
        root.popClip();
      }
    },
  };

  // ------------------------------------------------------------
  // Camera
  // ------------------------------------------------------------

  class Camera2D {
    constructor(options) {
      const source = options || {};
      this.x = Number(source.x) || 0;
      this.y = Number(source.y) || 0;
      this.zoom = Math.max(0.0001, Number(source.zoom) || 1);
      this.targetX = this.x;
      this.targetY = this.y;
      this.targetZoom = this.zoom;
      this.screenX = source.screenX ?? viewport.logicalWidth * 0.5;
      this.screenY = source.screenY ?? viewport.logicalHeight * 0.5;
      this.smoothing = clamp(Number(source.smoothing) || 0, 0, 1);
      this.bounds = source.bounds || null;
    }

    set(x, y, zoom) {
      this.x = Number(x) || 0;
      this.y = Number(y) || 0;
      if (zoom !== undefined) this.zoom = Math.max(0.0001, Number(zoom) || 1);
      this.targetX = this.x;
      this.targetY = this.y;
      this.targetZoom = this.zoom;
      this.constrain();
      return this;
    }

    moveTo(x, y, zoom) {
      this.targetX = Number(x) || 0;
      this.targetY = Number(y) || 0;
      if (zoom !== undefined) this.targetZoom = Math.max(0.0001, Number(zoom) || 1);
      return this;
    }

    update(dt) {
      if (this.smoothing <= 0) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.zoom = this.targetZoom;
      } else {
        const amount = 1 - Math.pow(1 - this.smoothing, Math.max(0, dt) * 60);
        this.x = lerpValue(this.x, this.targetX, amount);
        this.y = lerpValue(this.y, this.targetY, amount);
        this.zoom = lerpValue(this.zoom, this.targetZoom, amount);
      }
      this.constrain();
    }

    constrain() {
      if (!this.bounds) return;
      const bounds = this.bounds;
      const halfW = viewport.logicalWidth / this.zoom * 0.5;
      const halfH = viewport.logicalHeight / this.zoom * 0.5;

      if (bounds.w !== undefined) {
        const minX = Number(bounds.x || 0) + halfW;
        const maxX = Number(bounds.x || 0) + Number(bounds.w) - halfW;
        this.x = minX <= maxX ? clamp(this.x, minX, maxX) : Number(bounds.x || 0) + Number(bounds.w) * 0.5;
      }

      if (bounds.h !== undefined) {
        const minY = Number(bounds.y || 0) + halfH;
        const maxY = Number(bounds.y || 0) + Number(bounds.h) - halfH;
        this.y = minY <= maxY ? clamp(this.y, minY, maxY) : Number(bounds.y || 0) + Number(bounds.h) * 0.5;
      }
    }

    begin() {
      root.pushMatrix();
      root.translate(this.screenX, this.screenY);
      root.scale(this.zoom);
      root.translate(-this.x, -this.y);
    }

    end() {
      root.popMatrix();
    }

    worldToScreen(x, y) {
      return {
        x: (x - this.x) * this.zoom + this.screenX,
        y: (y - this.y) * this.zoom + this.screenY,
      };
    }

    screenToWorld(x, y) {
      return {
        x: (x - this.screenX) / this.zoom + this.x,
        y: (y - this.screenY) / this.zoom + this.y,
      };
    }
  }

  // ------------------------------------------------------------
  // Theme and typography
  // ------------------------------------------------------------

  const theme = {
    use(overrides) {
      state.theme = deepMerge(DEFAULT_THEME, overrides || {});
      return state.theme;
    },

    get() {
      return state.theme;
    },

    value(path, fallback) {
      const value = pathValue(state.theme, path);
      return value === undefined ? fallback : value;
    },

    color(nameOrValue, alpha) {
      const stored = typeof nameOrValue === "string"
        ? pathValue(state.theme.colors, nameOrValue)
        : nameOrValue;
      return normalizeColor(stored === undefined ? nameOrValue : stored, alpha);
    },

    font(name) {
      return state.theme.fonts[name] || name || state.theme.fonts.ui;
    },
  };

  const type = {
    apply(role, options) {
      const opts = options || {};
      const token = state.theme.type[role] || state.theme.type.body;
      const size = opts.size ?? token.size ?? 12;
      const fontKey = opts.font ?? token.font ?? "ui";

      if (typeof root.font === "function") {
        root.font(theme.font(fontKey));
      }
      root.fontSize(size);

      if (opts.align !== undefined) {
        root.textAlign(opts.align);
      }

      return { size, font: theme.font(fontKey) };
    },

    measure(value, role, options) {
      const opts = options || {};
      const token = state.theme.type[role] || state.theme.type.body;
      const size = opts.size ?? token.size ?? 12;
      const fontKey = opts.font ?? token.font ?? "ui";
      let width = String(value).length * size * 0.6;

      if (typeof root.withCanvasContext === "function") {
        root.withCanvasContext((ctx) => {
          ctx.font = String(size) + "px " + theme.font(fontKey);
          width = ctx.measureText(String(value)).width;
        });
      }

      return width;
    },

    fit(value, role, maxWidth, options) {
      const opts = options || {};
      const token = state.theme.type[role] || state.theme.type.body;
      const maxSize = Number(opts.maxSize ?? token.size ?? 12);
      const minSize = Math.max(1, Number(opts.minSize ?? Math.min(maxSize, 7)));
      let size = maxSize;

      while (size > minSize) {
        if (this.measure(value, role, { ...opts, size }) <= maxWidth) break;
        size -= 0.5;
      }

      this.apply(role, { ...opts, size });
      return size;
    },
  };

  // ------------------------------------------------------------
  // Motion and timelines
  // ------------------------------------------------------------

  const EASING = {
    linear: (t) => t,
    smooth: (t) => t * t * (3 - 2 * t),
    quadIn: (t) => t * t,
    quadOut: (t) => 1 - (1 - t) * (1 - t),
    cubicIn: (t) => t * t * t,
    cubicOut: (t) => 1 - Math.pow(1 - t, 3),
    backOut: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
  };

  const motionTasks = new Set();
  const timelines = new Set();

  class TweenTask {
    constructor(subject, target, duration, easing, callback) {
      this.subject = subject;
      this.target = target;
      this.duration = Math.max(0.000001, duration);
      this.easing = typeof easing === "function" ? easing : EASING[easing] || EASING.linear;
      this.callback = typeof callback === "function" ? callback : null;
      this.elapsed = 0;
      this.cancelled = false;
      this.scope = null;
      this.start = {};
      this.end = {};

      for (const [key, value] of Object.entries(target || {})) {
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        this.start[key] = Number(subject[key]) || 0;
        this.end[key] = value;
      }
    }

    update(dt) {
      if (this.cancelled) return true;
      this.elapsed += Math.max(0, dt);
      const raw = clamp(this.elapsed / this.duration, 0, 1);
      const eased = this.easing(raw);

      for (const key of Object.keys(this.end)) {
        this.subject[key] = lerpValue(this.start[key], this.end[key], eased);
      }

      if (raw >= 1) {
        if (this.callback) this.callback(this.subject);
        return true;
      }
      return false;
    }

    cancel() {
      this.cancelled = true;
    }
  }

  class DelayTask {
    constructor(duration, callback) {
      this.duration = Math.max(0, duration);
      this.callback = typeof callback === "function" ? callback : null;
      this.elapsed = 0;
      this.cancelled = false;
      this.scope = null;
    }

    update(dt) {
      if (this.cancelled) return true;
      this.elapsed += Math.max(0, dt);
      if (this.elapsed >= this.duration) {
        if (this.callback) this.callback();
        return true;
      }
      return false;
    }

    cancel() {
      this.cancelled = true;
    }
  }

  class Timeline {
    constructor(scope) {
      this.steps = [];
      this.index = 0;
      this.activeStep = null;
      this.running = false;
      this.cancelled = false;
      this.onComplete = null;
      this.scope = scope || null;
    }

    wait(duration) {
      this.steps.push({ type: "wait", duration });
      return this;
    }

    call(callback) {
      this.steps.push({ type: "call", callback });
      return this;
    }

    to(subject, target, duration, easing) {
      this.steps.push({ type: "tween", subject, target, duration, easing });
      return this;
    }

    done(callback) {
      this.onComplete = callback;
      return this;
    }

    start() {
      if (this.scope && !this.scope.active) {
        this.cancelled = true;
        this.running = false;
        return this;
      }

      this.running = true;
      this.cancelled = false;
      this.index = 0;
      this.activeStep = null;
      timelines.add(this);
      if (this.scope) this.scope.timelines.add(this);
      return this;
    }

    cancel() {
      this.cancelled = true;
      this.running = false;
      if (this.activeStep && this.activeStep.cancel) this.activeStep.cancel();
      timelines.delete(this);
      if (this.scope) this.scope.timelines.delete(this);
    }

    update(dt) {
      if (!this.running || this.cancelled) return true;

      while (!this.activeStep && this.index < this.steps.length) {
        const step = this.steps[this.index++];

        if (step.type === "call") {
          if (typeof step.callback === "function") step.callback();
          continue;
        }

        if (step.type === "wait") {
          this.activeStep = new DelayTask(motion.time(step.duration));
        } else if (step.type === "tween") {
          this.activeStep = new TweenTask(
            step.subject,
            step.target,
            motion.time(step.duration),
            step.easing
          );
        }
      }

      if (!this.activeStep && this.index >= this.steps.length) {
        this.running = false;
        if (typeof this.onComplete === "function") this.onComplete();
        return true;
      }

      if (this.activeStep && this.activeStep.update(dt)) {
        this.activeStep = null;
      }

      return false;
    }
  }

  function detachTask(task) {
    if (task && task.scope) task.scope.tasks.delete(task);
  }

  function detachTimeline(timeline) {
    if (timeline && timeline.scope) timeline.scope.timelines.delete(timeline);
  }

  const motion = {
    easing: EASING,

    time(value) {
      return normalizeDuration(value, state.theme.motion);
    },

    to(subject, target, duration, easing, callback) {
      if (!subject || !target) {
        throw new TypeError("SSE.motion.to requires subject and target objects.");
      }
      const task = new TweenTask(subject, target, this.time(duration), easing, callback);
      motionTasks.add(task);
      return task;
    },

    after(duration, callback) {
      const task = new DelayTask(this.time(duration), callback);
      motionTasks.add(task);
      return task;
    },

    sequence() {
      return new Timeline();
    },

    stop(task) {
      if (!task) return;
      if (task.cancel) task.cancel();
      motionTasks.delete(task);
      timelines.delete(task);
      detachTask(task);
      detachTimeline(task);
    },

    stopAll() {
      for (const task of Array.from(motionTasks)) this.stop(task);
      for (const timeline of Array.from(timelines)) this.stop(timeline);
      motionTasks.clear();
      timelines.clear();
    },

    update(dt) {
      for (const task of Array.from(motionTasks)) {
        if (task.update(dt)) {
          motionTasks.delete(task);
          detachTask(task);
        }
      }
      for (const timeline of Array.from(timelines)) {
        if (timeline.update(dt)) {
          timelines.delete(timeline);
          detachTimeline(timeline);
        }
      }
    },
  };

  class MotionScope {
    constructor(label) {
      this.label = label || "scene";
      this.active = true;
      this.tasks = new Set();
      this.timelines = new Set();
    }

    time(value) {
      return motion.time(value);
    }

    to(subject, target, duration, easing, callback) {
      if (!this.active) return null;
      const task = motion.to(subject, target, duration, easing, callback);
      task.scope = this;
      this.tasks.add(task);
      return task;
    }

    after(duration, callback) {
      if (!this.active) return null;
      const task = motion.after(duration, callback);
      task.scope = this;
      this.tasks.add(task);
      return task;
    }

    sequence() {
      return new Timeline(this);
    }

    stop(task) {
      motion.stop(task);
    }

    stopAll() {
      for (const task of Array.from(this.tasks)) motion.stop(task);
      for (const timeline of Array.from(this.timelines)) motion.stop(timeline);
      this.tasks.clear();
      this.timelines.clear();
    }

    dispose() {
      if (!this.active) return;
      this.stopAll();
      this.active = false;
    }
  }

  // ------------------------------------------------------------
  // i18n
  // ------------------------------------------------------------

  const i18n = {
    language: "jp",
    defaultLanguage: "jp",
    storageKey: "sse-language",
    text: {},

    configure(options) {
      const source = options || {};
      this.defaultLanguage = source.defaultLanguage || source.default || "jp";
      this.storageKey = source.storageKey || ("sse:" + state.config.id + ":language");
      this.text = source.text || {};
      this.language = this.defaultLanguage;

      try {
        const saved = root.localStorage?.getItem(this.storageKey);
        if (saved) this.language = saved;
      } catch (_error) {
        // Storage can be unavailable in private or embedded contexts.
      }
    },

    t(path, fallback) {
      const entry = pathValue(this.text, path);
      if (entry === undefined) return fallback === undefined ? String(path) : fallback;
      if (typeof entry === "string") return entry;
      if (isObject(entry)) {
        return entry[this.language] ?? entry[this.defaultLanguage] ?? fallback ?? String(path);
      }
      return String(entry);
    },

    set(language) {
      this.language = String(language || this.defaultLanguage);
      try {
        root.localStorage?.setItem(this.storageKey, this.language);
      } catch (_error) {
        // Ignore persistence errors.
      }
      return this.language;
    },

    toggle(a, b) {
      const first = a || "jp";
      const second = b || "en";
      return this.set(this.language === first ? second : first);
    },
  };

  // ------------------------------------------------------------
  // Audio
  // ------------------------------------------------------------

  const audio = {
    enabled: true,
    unlocked: false,
    ctx: null,
    masterGain: null,
    masterVolume: 0.7,
    poolSize: 4,
    definitions: {},
    pools: {},
    lastPlayed: {},
    storageKey: "sse-sound",

    configure(options) {
      const source = options || {};
      this.masterVolume = clamp(Number(source.masterVolume ?? 0.7), 0, 1);
      this.poolSize = Math.max(1, Math.floor(Number(source.poolSize) || 4));
      this.storageKey = source.storageKey || ("sse:" + state.config.id + ":sound");
      this.definitions = source.sounds || {};
      this.pools = {};

      try {
        this.enabled = root.localStorage?.getItem(this.storageKey) !== "false";
      } catch (_error) {
        this.enabled = true;
      }

      if (typeof root.Audio !== "function") return;

      for (const [name, definitionValue] of Object.entries(this.definitions)) {
        const definition = typeof definitionValue === "string"
          ? { file: definitionValue }
          : definitionValue;

        if (!definition || !definition.file) continue;
        const pool = [];

        for (let i = 0; i < this.poolSize; i += 1) {
          const item = new root.Audio(definition.file);
          item.preload = "auto";
          item.volume = clamp(Number(definition.volume ?? 0.25), 0, 1);
          pool.push(item);
        }

        this.pools[name] = pool;
      }
    },

    ensureContext() {
      const AudioContextClass = root.AudioContext || root.webkitAudioContext;
      if (!AudioContextClass) return null;

      if (!this.ctx) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.masterVolume;
        this.masterGain.connect(this.ctx.destination);
      }

      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }

      return this.ctx;
    },

    unlock() {
      if (this.unlocked) return;
      this.unlocked = true;
      this.ensureContext();

      for (const pool of Object.values(this.pools)) {
        const item = pool[0];
        if (!item) continue;
        try {
          item.muted = true;
          const promise = item.play();
          if (promise && promise.then) {
            promise.then(() => {
              item.pause();
              item.currentTime = 0;
              item.muted = false;
            }).catch(() => {
              item.muted = false;
            });
          } else {
            item.muted = false;
          }
        } catch (_error) {
          item.muted = false;
        }
      }
    },

    play(name, options) {
      if (!this.enabled) return false;
      const pool = this.pools[name];
      const definitionValue = this.definitions[name];
      const definition = typeof definitionValue === "string"
        ? { file: definitionValue }
        : (definitionValue || {});
      if (!pool || pool.length === 0) return false;

      this.unlock();
      const opts = options || {};
      const cooldown = Number(opts.cooldown ?? definition.cooldown ?? 80);
      const now = nowMs();
      if (!opts.force && this.lastPlayed[name] && now - this.lastPlayed[name] < cooldown) {
        return false;
      }
      this.lastPlayed[name] = now;

      let item = pool.find((candidate) => candidate.paused || candidate.ended);
      if (!item) item = pool[0];

      try {
        item.pause();
        item.currentTime = 0;
        item.volume = clamp(Number(opts.volume ?? definition.volume ?? 0.25), 0, 1);
        item.playbackRate = clamp(Number(opts.playbackRate ?? definition.playbackRate ?? 1), 0.25, 4);
        const promise = item.play();
        if (promise && promise.catch) promise.catch(() => {});
        return true;
      } catch (_error) {
        return false;
      }
    },

    tone(options) {
      if (!this.enabled) return false;
      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) return false;
      this.unlocked = true;

      const opts = options || {};
      const start = ctx.currentTime;
      const duration = Math.max(0.01, Number(opts.duration) || 0.08);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = opts.type || "triangle";
      oscillator.frequency.setValueAtTime(Math.max(20, Number(opts.frequency) || 440), start);
      if (opts.endFrequency !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(20, Number(opts.endFrequency) || 440),
          start + duration
        );
      }

      const volume = clamp(Number(opts.volume ?? 0.06), 0.0001, 1);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.01, duration * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gain);
      gain.connect(this.masterGain);
      oscillator.start(start);
      oscillator.stop(start + duration);
      return true;
    },

    setEnabled(value) {
      this.enabled = !!value;
      try {
        root.localStorage?.setItem(this.storageKey, this.enabled ? "true" : "false");
      } catch (_error) {
        // Ignore persistence errors.
      }
    },
  };

  // ------------------------------------------------------------
  // UI primitives
  // ------------------------------------------------------------

  const ui = {
    hit(point, bounds, padding) {
      const pad = Number(padding) || 0;
      return !!point && !!bounds && (
        point.x >= bounds.x - pad &&
        point.x <= bounds.x + bounds.w + pad &&
        point.y >= bounds.y - pad &&
        point.y <= bounds.y + bounds.h + pad
      );
    },

    paper(bounds, options) {
      const opts = options || {};
      const radius = opts.radius ?? state.theme.ui.radius;
      const shadowX = opts.shadowX ?? state.theme.ui.shadowX;
      const shadowY = opts.shadowY ?? state.theme.ui.shadowY;

      root.rectMode(root.CORNER);
      root.noStroke();
      root.fill(theme.color(opts.shadowColor || "shadow", opts.shadowAlpha ?? 70));
      root.rect(bounds.x + shadowX, bounds.y + shadowY, bounds.w, bounds.h, radius);
      root.fill(theme.color(opts.color || "paper", opts.alpha ?? 255));
      root.rect(bounds.x, bounds.y, bounds.w, bounds.h, radius);

      if (opts.edge !== false) {
        root.noFill();
        root.stroke(theme.color(opts.edgeColor || "paperShade", opts.edgeAlpha ?? 180));
        root.strokeWidth(opts.edgeWidth ?? 1);
        root.rect(bounds.x + 0.5, bounds.y + 0.5, bounds.w - 1, bounds.h - 1, radius);
        root.noStroke();
      }
    },

    panel(bounds, options) {
      const opts = options || {};
      const pressed = !!opts.pressed;
      const offset = pressed ? state.theme.ui.pressOffset : 0;
      const radius = opts.radius ?? state.theme.ui.radius;

      root.rectMode(root.CORNER);
      root.noStroke();
      root.fill(theme.color(opts.shadowColor || "shadow", opts.shadowAlpha ?? 90));
      root.rect(bounds.x + 3, bounds.y - 3, bounds.w, bounds.h, radius);
      root.fill(theme.color(opts.color || "panel"));
      root.rect(bounds.x, bounds.y + offset, bounds.w, bounds.h, radius);

      root.noFill();
      root.stroke(theme.color(opts.edgeColor || "wood", opts.edgeAlpha ?? 180));
      root.strokeWidth(opts.edgeWidth ?? 1.5);
      root.rect(bounds.x + 0.75, bounds.y + offset + 0.75, bounds.w - 1.5, bounds.h - 1.5, radius);
      root.noStroke();
    },

    button(bounds, label, options) {
      const opts = options || {};
      this.panel(bounds, {
        color: opts.disabled ? "panelSoft" : (opts.color || "panel"),
        edgeColor: opts.edgeColor || (opts.accent ? "amber" : "wood"),
        pressed: opts.pressed,
        shadowAlpha: opts.disabled ? 35 : 90,
      });

      root.fill(theme.color(opts.disabled ? "dim" : (opts.textColor || "cream"), opts.alpha ?? 255));
      type.fit(label, opts.role || "button", bounds.w - 20, {
        minSize: opts.minSize || 8,
        align: root.CENTER,
      });

      const pressOffset = opts.pressed ? state.theme.ui.pressOffset : 0;
      root.text(label, bounds.x + bounds.w * 0.5, bounds.y + bounds.h * 0.5 + pressOffset);
      return bounds;
    },

    languageToggle(bounds, options) {
      const opts = options || {};
      const label = i18n.language === (opts.first || "jp")
        ? (opts.firstLabel || "JP")
        : (opts.secondLabel || "EN");
      this.button(bounds, label, {
        role: "small",
        color: opts.color || "panelSoft",
        edgeColor: opts.edgeColor || "wood",
        textColor: opts.textColor || "cream",
        pressed: opts.pressed,
      });
      return bounds;
    },

    progress(value, bounds, options) {
      const opts = options || {};
      const ratio = clamp(Number(value) || 0, 0, 1);
      root.noStroke();
      root.fill(theme.color(opts.track || "woodDark"));
      root.rect(bounds.x, bounds.y, bounds.w, bounds.h, bounds.radius || bounds.h * 0.5);
      root.fill(theme.color(opts.fill || "amber"));
      root.rect(bounds.x, bounds.y, bounds.w * ratio, bounds.h, bounds.radius || bounds.h * 0.5);
    },
  };

  // ------------------------------------------------------------
  // Scene manager
  // ------------------------------------------------------------

  const scenes = new Map();
  const sceneStack = [];

  const transition = {
    active: false,
    phase: null,
    elapsed: 0,
    duration: 0,
    color: "nightDeep",
    target: null,
    payload: null,
  };

  function sceneContext(record, extra) {
    return Object.assign({
      SSE,
      motion: record ? record.motion : motion,
    }, extra || {});
  }

  function createSceneRecord(name) {
    return {
      name,
      scene: resolveScene(name),
      motion: new MotionScope("scene:" + name),
    };
  }

  function resolveScene(name) {
    const scene = scenes.get(name);
    if (!scene) throw new Error('Unknown scene: "' + name + '"');
    return scene;
  }

  function enterScene(record, payload, from) {
    if (typeof record.scene.enter === "function") {
      record.scene.enter(sceneContext(record, {
        name: record.name,
        payload,
        from,
      }));
    }
  }

  function leaveScene(record, to) {
    if (!record) return;

    try {
      if (typeof record.scene.leave === "function") {
        record.scene.leave(sceneContext(record, { name: record.name, to }));
      }
    } finally {
      record.motion.dispose();
    }
  }

  function replaceSceneImmediate(name, payload) {
    const previous = sceneStack[sceneStack.length - 1] || null;
    while (sceneStack.length > 0) {
      leaveScene(sceneStack.pop(), name);
    }

    const record = createSceneRecord(name);
    sceneStack.push(record);
    enterScene(record, payload, previous ? previous.name : null);
  }

  const app = {
    register(name, scene) {
      if (!name || !scene) throw new TypeError("SSE.app.register requires a name and scene.");
      scenes.set(String(name), scene);
      return scene;
    },

    has(name) {
      return scenes.has(String(name));
    },

    start(name, payload) {
      if (sceneStack.length > 0) return false;
      replaceSceneImmediate(name, payload);
      return true;
    },

    replace(name, payload, options) {
      const opts = options || {};
      const duration = motion.time(opts.duration ?? 0);

      if (duration <= 0) {
        replaceSceneImmediate(name, payload);
        return;
      }

      transition.active = true;
      transition.phase = "out";
      transition.elapsed = 0;
      // duration is the total fade time: half out, half in.
      transition.duration = Math.max(0.000001, duration * 0.5);
      transition.color = opts.color || "nightDeep";
      transition.target = name;
      transition.payload = payload;
    },

    push(name, payload) {
      const current = sceneStack[sceneStack.length - 1];
      if (current && typeof current.scene.pause === "function") {
        current.scene.pause(sceneContext(current, { name: current.name, overlay: name }));
      }

      const record = createSceneRecord(name);
      sceneStack.push(record);
      enterScene(record, payload, current ? current.name : null);
    },

    pop(payload) {
      if (sceneStack.length <= 1) return null;
      const removed = sceneStack.pop();
      leaveScene(removed, sceneStack[sceneStack.length - 1].name);
      const current = sceneStack[sceneStack.length - 1];

      if (typeof current.scene.resume === "function") {
        current.scene.resume(sceneContext(current, { name: current.name, payload, overlay: removed.name }));
      }

      return removed.name;
    },

    current() {
      return sceneStack.length > 0 ? sceneStack[sceneStack.length - 1].name : null;
    },

    stack() {
      return sceneStack.map((record) => record.name);
    },

    inputLocked() {
      return transition.active;
    },

    update(dt) {
      motion.update(dt);

      if (transition.active) {
        transition.elapsed += Math.max(0, dt);
        if (transition.elapsed >= transition.duration) {
          if (transition.phase === "out") {
            replaceSceneImmediate(transition.target, transition.payload);
            transition.phase = "in";
            transition.elapsed = 0;
          } else {
            transition.active = false;
            transition.phase = null;
            transition.target = null;
            transition.payload = null;
          }
        }
      }

      let startIndex = 0;
      for (let i = sceneStack.length - 1; i >= 0; i -= 1) {
        if (sceneStack[i].scene.pauseBelow) {
          startIndex = i;
          break;
        }
      }

      for (let i = startIndex; i < sceneStack.length; i += 1) {
        const record = sceneStack[i];
        if (typeof record.scene.update === "function") {
          record.scene.update(dt, sceneContext(record, { name: record.name }));
        }
      }
    },

    draw() {
      let startIndex = 0;
      for (let i = sceneStack.length - 1; i >= 0; i -= 1) {
        if (sceneStack[i].scene.opaque) {
          startIndex = i;
          break;
        }
      }

      for (let i = startIndex; i < sceneStack.length; i += 1) {
        const record = sceneStack[i];
        if (typeof record.scene.draw === "function") {
          record.scene.draw(sceneContext(record, { name: record.name }));
        }
      }

      if (transition.active) {
        const raw = clamp(transition.elapsed / Math.max(0.000001, transition.duration), 0, 1);
        const alpha = transition.phase === "out" ? raw : 1 - raw;
        root.noStroke();
        root.fill(theme.color(transition.color, alpha * 255));
        root.rect(0, 0, viewport.logicalWidth, viewport.logicalHeight);
      }
    },

    touch(touch) {
      if (transition.active) return true;

      for (let i = sceneStack.length - 1; i >= 0; i -= 1) {
        const record = sceneStack[i];
        let handled = false;

        if (typeof record.scene.touch === "function") {
          handled = record.scene.touch(touch, sceneContext(record, { name: record.name })) === true;
        }

        if (handled || record.scene.blocksInput !== false) return true;
      }

      return false;
    },
  };

  // ------------------------------------------------------------
  // Fonts
  // ------------------------------------------------------------

  const fonts = {
    ready: true,
    revealed: true,

    install(options) {
      const source = options || {};
      if (typeof document === "undefined" || !source.href) {
        this.ready = true;
        this.reveal();
        return Promise.resolve(false);
      }

      this.ready = false;
      this.hide();
      const id = source.id || "sse-web-fonts";
      const timeoutMs = Math.max(250, Number(source.timeoutMs) || 3500);
      let link = document.getElementById(id);

      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }

      const stylesheetReady = new Promise((resolve) => {
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          resolve(true);
        };
        link.addEventListener("load", done, { once: true });
        link.addEventListener("error", done, { once: true });
        if (link.href === source.href) done();
        else link.href = source.href;
      });

      const timeout = new Promise((resolve) => {
        root.setTimeout(() => resolve(false), timeoutMs);
      });

      return Promise.race([stylesheetReady, timeout])
        .then(() => {
          if (!document.fonts || !document.fonts.load || !Array.isArray(source.probes)) {
            return true;
          }

          return Promise.race([
            Promise.all(source.probes.map((probe) => document.fonts.load(probe.css, probe.text || "SukimaStock"))),
            timeout,
          ]);
        })
        .catch(() => false)
        .finally(() => {
          this.ready = true;
          root.setTimeout(() => this.reveal(), 32);
        });
    },

    canvas() {
      return root.CodeaLite?.state?.canvas || root.CodeaLite?.state?.ctx?.canvas || null;
    },

    hide() {
      const canvas = this.canvas();
      if (!canvas) return;
      this.revealed = false;
      canvas.style.opacity = "0";
      canvas.style.pointerEvents = "none";
    },

    reveal() {
      const canvas = this.canvas();
      this.revealed = true;
      if (!canvas) return;
      canvas.style.opacity = "1";
      canvas.style.pointerEvents = "auto";
    },
  };

  // ------------------------------------------------------------
  // Safe analytics
  // ------------------------------------------------------------

  const analytics = {
    enabled: false,
    provider: null,

    configure(options) {
      const source = options || {};
      this.enabled = source.enabled !== false;
      this.provider = typeof source.provider === "function"
        ? source.provider
        : function defaultProvider(name, props) {
            if (typeof root.plausible !== "function") return false;
            root.plausible(name, props ? { props } : undefined);
            return true;
          };
    },

    track(name, props) {
      if (!this.enabled || !this.provider) return false;
      try {
        return this.provider(name, props || {}) !== false;
      } catch (error) {
        debug.log("Analytics error", error);
        return false;
      }
    },
  };

  // ------------------------------------------------------------
  // Capture and share
  // ------------------------------------------------------------

  const share = {
    capture(options) {
      const opts = options || {};
      const sourceCanvas = fonts.canvas();
      if (!sourceCanvas || typeof document === "undefined") return null;

      const pixelRatio = Math.max(1, Number(opts.pixelRatio) || 1);
      const output = document.createElement("canvas");
      output.width = Math.round(viewport.logicalWidth * pixelRatio);
      output.height = Math.round(viewport.logicalHeight * pixelRatio);
      const ctx = output.getContext("2d");
      if (!ctx) return null;

      const dpr = root.CodeaLite?.state?.dpr || 1;
      const sourceX = viewport.offsetX * dpr;
      const sourceTopCss = viewport.screenHeight - (
        viewport.offsetY + viewport.logicalHeight * viewport.scale
      );
      const sourceY = sourceTopCss * dpr;
      const sourceW = viewport.logicalWidth * viewport.scale * dpr;
      const sourceH = viewport.logicalHeight * viewport.scale * dpr;

      ctx.imageSmoothingEnabled = opts.smoothing !== false;
      ctx.drawImage(
        sourceCanvas,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        0,
        0,
        output.width,
        output.height
      );
      return output;
    },

    blob(options) {
      const opts = options || {};
      const canvas = this.capture(opts);
      if (!canvas) return Promise.resolve(null);

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob),
          opts.type || "image/png",
          opts.quality
        );
      });
    },

    async image(options) {
      const opts = options || {};
      const blob = await this.blob(opts);
      if (!blob) return { ok: false, reason: "capture-unavailable" };

      const fileName = opts.fileName || (state.config.id + ".png");
      const file = typeof root.File === "function"
        ? new root.File([blob], fileName, { type: blob.type || "image/png" })
        : null;

      try {
        if (
          file &&
          root.navigator?.share &&
          (!root.navigator.canShare || root.navigator.canShare({ files: [file] }))
        ) {
          await root.navigator.share({
            files: [file],
            title: opts.title || state.config.id,
            text: opts.text || undefined,
          });
          return { ok: true, method: "share" };
        }
      } catch (error) {
        if (error && error.name === "AbortError") {
          return { ok: false, reason: "cancelled" };
        }
      }

      if (typeof document === "undefined" || typeof URL === "undefined") {
        return { ok: false, reason: "download-unavailable" };
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      root.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { ok: true, method: "download" };
    },
  };

  // ------------------------------------------------------------
  // Host bridge
  // ------------------------------------------------------------

  const bridge = {
    readySent: false,

    ready(workId) {
      if (this.readySent) return true;
      const id = workId || state.config.bridge?.workId;
      if (!id) return false;

      try {
        root.top?.postMessage({
          type: state.config.bridge?.readyType || "yumaniwa:work-ready",
          version: 1,
          workId: id,
          engine: "SukimaStock Engine",
          engineVersion: VERSION,
        }, "*");
        this.readySent = true;
        return true;
      } catch (_error) {
        return false;
      }
    },

    send(type, payload) {
      try {
        root.top?.postMessage({
          type,
          version: 1,
          workId: state.config.bridge?.workId || state.config.id,
          payload: payload || {},
        }, "*");
        return true;
      } catch (_error) {
        return false;
      }
    },
  };

  // ------------------------------------------------------------
  // Debug and runtime errors
  // ------------------------------------------------------------

  const debug = {
    installed: false,
    message: null,

    install() {
      if (this.installed || typeof root.addEventListener !== "function") return;
      this.installed = true;

      root.addEventListener("error", (event) => {
        this.capture(event.error || event.message, "window.error");
      });

      root.addEventListener("unhandledrejection", (event) => {
        this.capture(event.reason || "Unhandled Promise rejection", "promise");
      });
    },

    log() {
      try {
        root.console?.log?.apply(root.console, arguments);
      } catch (_error) {
        // No-op.
      }
    },

    capture(error, where) {
      const raw = error && error.stack ? error.stack : String(error);
      this.message = "[" + where + "]\n" + raw;
      try {
        root.console?.error?.(this.message);
      } catch (_error) {
        // No-op.
      }

      if (!state.config.debug || typeof document === "undefined") return;
      let box = document.getElementById("sse-runtime-error");

      if (!box) {
        box = document.createElement("div");
        box.id = "sse-runtime-error";
        box.style.position = "fixed";
        box.style.left = "10px";
        box.style.right = "10px";
        box.style.bottom = "10px";
        box.style.zIndex = "999999";
        box.style.maxHeight = "42vh";
        box.style.overflow = "auto";
        box.style.padding = "10px";
        box.style.borderRadius = "8px";
        box.style.background = "rgba(80, 0, 0, 0.94)";
        box.style.color = "#fff4dc";
        box.style.font = "12px monospace";
        box.style.whiteSpace = "pre-wrap";
        box.style.boxShadow = "0 4px 18px rgba(0,0,0,0.45)";
        document.body.appendChild(box);
      }

      box.textContent = "SUKIMASTOCK ENGINE ERROR\n" + this.message;
    },

    clear() {
      this.message = null;
      if (typeof document === "undefined") return;
      document.getElementById("sse-runtime-error")?.remove();
    },
  };

  // ------------------------------------------------------------
  // Input normalization
  // ------------------------------------------------------------

  const input = {
    reset() {
      state.activePointerId = null;
    },

    normalize(rawTouch) {
      return viewport.toLogical(rawTouch);
    },

    accept(rawTouch) {
      if (!rawTouch) return false;
      if (state.config.pointerMode !== "primary") return true;
      const id = rawTouch.id ?? "mouse";

      if (rawTouch.state === root.BEGAN) {
        if (!viewport.containsScreen(rawTouch.x, rawTouch.y)) return false;
        if (state.activePointerId !== null && state.activePointerId !== id) return false;
        state.activePointerId = id;
        return true;
      }

      if (state.activePointerId !== null && state.activePointerId !== id) return false;
      return state.activePointerId !== null;
    },

    finish(rawTouch) {
      if (!rawTouch) return;
      if (rawTouch.state === root.ENDED || rawTouch.state === root.CANCELLED) {
        state.activePointerId = null;
      }
    },
  };

  // ------------------------------------------------------------
  // App setup and Codea Lite hooks
  // ------------------------------------------------------------

  function createApp(config) {
    if (state.configured) {
      throw new Error("SSE.createApp can only be called once per page.");
    }

    state.config = deepMerge(DEFAULT_CONFIG, config || {});
    state.theme = deepMerge(DEFAULT_THEME, state.config.theme || {});
    viewport.configure(state.config.logicalWidth, state.config.logicalHeight);

    scenes.clear();
    for (const [name, scene] of Object.entries(state.config.scenes || {})) {
      app.register(name, scene);
    }

    i18n.configure(state.config.i18n || {});
    state.configured = true;
    return SSE;
  }

  function setupEngine() {
    if (!state.configured) {
      createApp({
        initialScene: "empty",
        scenes: {
          empty: {
            draw() {
              root.background(27, 20, 18);
            },
          },
        },
      });
    }

    if (state.setupDone) return;
    state.setupDone = true;

    debug.install();
    viewport.update(true);
    root.rectMode(root.CORNER);
    root.ellipseMode(root.CENTER);
    root.textAlign(root.CENTER);
    root.noStroke();

    if (state.config.audio) audio.configure(state.config.audio);
    else audio.configure({});

    if (state.config.analytics) analytics.configure(state.config.analytics);
    if (state.config.fonts) fonts.install(state.config.fonts);
    else fonts.reveal();

    if (typeof state.config.setup === "function") {
      state.config.setup(SSE);
    }

    if (state.config.initialScene) {
      app.start(state.config.initialScene, state.config.initialPayload);
    }

    if (typeof root.addEventListener === "function") {
      root.addEventListener("blur", input.reset);
      root.addEventListener("pagehide", input.reset);
    }
  }

  function drawEngine() {
    const configuredFrameRate = Number(state.config.frameRate);
    const frameRate = Number.isFinite(configuredFrameRate) && configuredFrameRate > 0
      ? configuredFrameRate
      : 0;
    const currentTimeMs = nowMs();

    if (frameRate > 0 && state.lastDrawTimeMs > 0) {
      const minimumFrameMs = 1000 / frameRate;
      if (currentTimeMs - state.lastDrawTimeMs < minimumFrameMs - 0.5) return;
    }

    const frameDelta = state.lastDrawTimeMs > 0
      ? Math.min(0.05, Math.max(0, (currentTimeMs - state.lastDrawTimeMs) / 1000))
      : (Number(root.DeltaTime) || 1 / 60);
    state.lastDrawTimeMs = currentTimeMs;

    let viewportOpen = false;

    try {
      viewport.update(false);
      const outer = theme.color(state.config.outerBackground || "nightDeep");
      root.background(outer);

      app.update(frameDelta);
      viewport.begin();
      viewportOpen = true;

      if (sceneStack.length === 0) {
        root.noStroke();
        root.fill(theme.color(state.config.sceneBackground || "night"));
        root.rect(0, 0, viewport.logicalWidth, viewport.logicalHeight);
      } else {
        app.draw();
      }

      viewport.end();
      viewportOpen = false;

      if (!state.firstFrameDrawn) {
        state.firstFrameDrawn = true;
        if (state.config.bridge?.workId && fonts.revealed) bridge.ready();
      } else if (state.config.bridge?.workId && fonts.revealed && !bridge.readySent) {
        bridge.ready();
      }
    } catch (error) {
      if (viewportOpen) {
        try { viewport.end(); } catch (_endError) {}
      }
      debug.capture(error, "draw");
    }
  }

  function touchEngine(rawTouch) {
    if (!rawTouch || !input.accept(rawTouch)) return;

    try {
      if (rawTouch.state === root.BEGAN || rawTouch.state === root.ENDED) {
        audio.unlock();
      }
      const touch = input.normalize(rawTouch);
      app.touch(touch);
    } catch (error) {
      debug.capture(error, "touch");
    } finally {
      input.finish(rawTouch);
    }
  }

  function resizedEngine() {
    viewport.update(true);
  }

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------

  const SSE = {
    VERSION,
    createApp,
    app,
    viewport,
    Camera2D,
    theme,
    type,
    motion,
    storage,
    i18n,
    audio,
    ui,
    fonts,
    analytics,
    share,
    bridge,
    debug,
    input,
    utils: {
      clamp,
      lerp: lerpValue,
      deepMerge,
      color: normalizeColor,
      nowMs,
    },
    runtime: {
      state,
      get canvas() {
        return fonts.canvas();
      },
      get config() {
        return state.config;
      },
    },
  };

  root.SSE = SSE;
  root.SukimaStockEngine = SSE;

  // New SSE projects should not define these three functions themselves.
  root.setup = setupEngine;
  root.draw = drawEngine;
  root.touched = touchEngine;
  root.resized = resizedEngine;
})(typeof window !== "undefined" ? window : globalThis);
