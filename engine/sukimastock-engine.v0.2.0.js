// SukimaStock Engine v0.2.0
// A small creative-game framework built on top of Codea Lite for Web.
//
// Codea Lite handles the canvas runtime.
// SukimaStock Engine handles the reusable experience layer:
// scenes, logical viewport, input routing, motion, theme, type, audio,
// i18n, sharing, analytics, error display, and host-page bridges.

(function (root) {
  "use strict";

  const VERSION = "0.2.0";

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
    if (root.performance && typeof root.performance.now === "function") {
      return root.performance.now();
    }
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
    performance: {
      enabled: true,
      targetFps: null,
      sampleWindow: 120,
      slowFrameMs: null,
      slowFrameFactor: 1.75,
      maxDeltaSeconds: null,
    },
    initialScene: null,
    initialPayload: null,
    pointerMode: "primary",
    outerBackground: "nightDeep",
    sceneBackground: "night",
    debug: true,
    theme: {},
    fonts: null,
    audio: null,
    assets: null,
    lifecycle: {
      autoAudio: true,
      pauseOnBlur: false,
    },
    keyboard: {
      enabled: true,
      preventDefault: true,
      bindings: {},
    },
    devtools: {
      enabled: "auto",
      queryParam: "dev",
      panel: true,
      refreshMs: 500,
      maxEvents: 80,
    },
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
    activePointerRaw: null,
    drawGuardActive: false,
    lastDrawTimeMs: 0,
  };

  // ------------------------------------------------------------
  // App-scoped storage v2
  // ------------------------------------------------------------

  const storage = {
    prefix: "sse",
    definitions: new Map(),
    memory: new Map(),
    memoryPreferred: new Set(),
    checkpoints: new Map(),
    lastError: null,
    lastBackend: "none",

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

    clone(value) {
      return deepClone(value);
    },

    normalizeDefinition(options) {
      const source = options || {};
      const version = Math.max(1, Math.floor(Number(source.version) || 1));

      return {
        version,
        fallback: this.clone(source.fallback),
        validate: typeof source.validate === "function" ? source.validate : null,
        migrate: typeof source.migrate === "function" ? source.migrate : null,
        migrations: isObject(source.migrations) ? source.migrations : null,
      };
    },

    define(name, options) {
      const id = String(name || "");
      if (!id) throw new TypeError("SSE.storage.define requires a non-empty key.");

      const definition = this.normalizeDefinition(options);
      this.definitions.set(id, definition);

      const store = this;
      return Object.freeze({
        name: id,
        version: definition.version,
        get(fallback) {
          return arguments.length > 0
            ? store.get(id, fallback)
            : store.get(id);
        },
        set(value) {
          return store.set(id, value);
        },
        has() {
          return store.has(id);
        },
        remove() {
          return store.remove(id);
        },
        checkpoint(value) {
          return arguments.length > 0
            ? store.checkpoint(id, value)
            : store.checkpoint(id);
        },
        getCheckpoint(fallback) {
          return arguments.length > 0
            ? store.getCheckpoint(id, fallback)
            : store.getCheckpoint(id);
        },
        clearCheckpoint() {
          return store.clearCheckpoint(id);
        },
        info() {
          return store.info(id);
        },
      });
    },

    definition(name) {
      return this.definitions.get(String(name)) || null;
    },

    fallbackFor(name, fallback, hasExplicitFallback) {
      if (hasExplicitFallback) return this.clone(fallback);
      const definition = this.definition(name);
      return definition ? this.clone(definition.fallback) : fallback;
    },

    makeRecord(name, value) {
      const definition = this.definition(name);
      return {
        version: definition ? definition.version : 1,
        value: this.clone(value),
      };
    },

    decodeRecord(raw) {
      const decoded = JSON.parse(raw);

      if (
        decoded &&
        typeof decoded === "object" &&
        Object.prototype.hasOwnProperty.call(decoded, "version") &&
        Object.prototype.hasOwnProperty.call(decoded, "value")
      ) {
        return {
          version: Math.max(0, Math.floor(Number(decoded.version) || 0)),
          value: decoded.value,
          wrapped: true,
        };
      }

      // Pre-SSE or manually-written JSON is treated as schema version 0.
      return {
        version: 0,
        value: decoded,
        wrapped: false,
      };
    },

    readRecord(name) {
      const key = this.key(name);
      this.lastError = null;

      // A failed persistent write may leave an older localStorage record behind.
      // While this page is alive, the newer in-memory record must win.
      if (this.memoryPreferred.has(key) && this.memory.has(key)) {
        this.lastBackend = "memory";
        return this.clone(this.memory.get(key));
      }

      try {
        const local = root.localStorage;
        if (local) {
          const raw = local.getItem(key);
          if (raw !== null && raw !== undefined) {
            const record = this.decodeRecord(raw);
            this.memory.set(key, this.clone(record));
            this.lastBackend = "localStorage";
            return record;
          }
        }
      } catch (error) {
        this.lastError = error;
      }

      if (this.memory.has(key)) {
        this.lastBackend = "memory";
        return this.clone(this.memory.get(key));
      }

      this.lastBackend = "none";
      return null;
    },

    writeRecord(name, record) {
      const key = this.key(name);
      const safeRecord = this.clone(record);
      this.memory.set(key, safeRecord);
      this.lastError = null;
      this.lastBackend = "memory";

      try {
        const local = root.localStorage;
        if (!local) {
          this.memoryPreferred.add(key);
          return { ok: true, persistent: false, backend: "memory" };
        }

        local.setItem(key, JSON.stringify(record));
        this.memoryPreferred.delete(key);
        this.lastBackend = "localStorage";
        return { ok: true, persistent: true, backend: "localStorage" };
      } catch (error) {
        this.memoryPreferred.add(key);
        this.lastError = error;
        diagnostics.warn(
          "storage-memory-fallback",
          String(name) + " could not persist; latest state remains in memory.",
          { message: String(error?.message || error) }
        );
        return { ok: true, persistent: false, backend: "memory", error };
      }
    },

    validateValue(definition, value) {
      if (!definition || !definition.validate) return true;

      try {
        return definition.validate(value) !== false;
      } catch (error) {
        this.lastError = error;
        return false;
      }
    },

    migrateValue(name, record) {
      const definition = this.definition(name);
      if (!definition) {
        return { ok: true, value: record.value, version: record.version, migrated: false };
      }

      const targetVersion = definition.version;
      let currentVersion = Math.max(0, Math.floor(Number(record.version) || 0));
      let value = this.clone(record.value);

      if (currentVersion === targetVersion) {
        return {
          ok: this.validateValue(definition, value),
          value,
          version: currentVersion,
          migrated: false,
        };
      }

      // Never overwrite data written by a newer Engine/app version.
      if (currentVersion > targetVersion) {
        return {
          ok: false,
          futureVersion: true,
          value: undefined,
          version: currentVersion,
          migrated: false,
        };
      }

      try {
        if (definition.migrations) {
          while (currentVersion < targetVersion) {
            const step =
              definition.migrations[currentVersion] ||
              definition.migrations[String(currentVersion)];

            if (typeof step !== "function") {
              return {
                ok: false,
                missingMigration: currentVersion,
                value: undefined,
                version: currentVersion,
                migrated: false,
              };
            }

            value = step(
              this.clone(value),
              currentVersion,
              currentVersion + 1
            );
            currentVersion += 1;
          }
        } else if (definition.migrate) {
          value = definition.migrate(
            this.clone(value),
            currentVersion,
            targetVersion
          );
          currentVersion = targetVersion;
        } else {
          return {
            ok: false,
            missingMigration: currentVersion,
            value: undefined,
            version: currentVersion,
            migrated: false,
          };
        }
      } catch (error) {
        this.lastError = error;
        return {
          ok: false,
          migrationError: error,
          value: undefined,
          version: currentVersion,
          migrated: false,
        };
      }

      if (!this.validateValue(definition, value)) {
        return {
          ok: false,
          validationFailed: true,
          value: undefined,
          version: currentVersion,
          migrated: false,
        };
      }

      const write = this.writeRecord(name, {
        version: targetVersion,
        value: this.clone(value),
      });

      return {
        ok: true,
        value,
        version: targetVersion,
        migrated: true,
        persistent: !!write.persistent,
      };
    },

    set(name, value) {
      if (value === undefined) return this.remove(name);

      const definition = this.definition(name);
      if (definition && !this.validateValue(definition, value)) return false;

      try {
        const result = this.writeRecord(name, this.makeRecord(name, value));
        // Legacy boolean API means "available for the current session".
        // Use info() when the caller needs to know whether it was persisted.
        return !!result.ok;
      } catch (error) {
        this.lastError = error;
        return false;
      }
    },

    get(name, fallback) {
      const hasExplicitFallback = arguments.length >= 2;
      const defaultValue = this.fallbackFor(
        name,
        fallback,
        hasExplicitFallback
      );

      let record;
      try {
        record = this.readRecord(name);
      } catch (error) {
        this.lastError = error;
        return defaultValue;
      }

      if (!record) return defaultValue;

      const result = this.migrateValue(name, record);
      if (!result.ok) return defaultValue;

      return this.clone(result.value);
    },

    has(name) {
      const key = this.key(name);
      if (this.memory.has(key)) return true;

      try {
        const local = root.localStorage;
        if (!local) return false;
        return local.getItem(key) !== null;
      } catch (error) {
        this.lastError = error;
        return this.memory.has(key);
      }
    },

    remove(name) {
      const key = this.key(name);
      this.memory.delete(key);
      this.memoryPreferred.delete(key);
      this.checkpoints.delete(key);
      this.lastError = null;

      try {
        const local = root.localStorage;
        if (local) local.removeItem(key);
        this.lastBackend = local ? "localStorage" : "memory";
        return true;
      } catch (error) {
        this.lastError = error;
        this.lastBackend = "memory";
        return true;
      }
    },

    clear() {
      const prefix = this.namespace();
      const localKeys = [];

      for (const key of Array.from(this.memory.keys())) {
        if (key.startsWith(prefix)) this.memory.delete(key);
      }

      for (const key of Array.from(this.memoryPreferred.values())) {
        if (key.startsWith(prefix)) this.memoryPreferred.delete(key);
      }

      for (const key of Array.from(this.checkpoints.keys())) {
        if (key.startsWith(prefix)) this.checkpoints.delete(key);
      }

      this.lastError = null;

      try {
        const local = root.localStorage;
        if (!local) {
          this.lastBackend = "memory";
          return true;
        }

        for (let i = 0; i < local.length; i += 1) {
          const key = local.key(i);
          if (key && key.startsWith(prefix)) localKeys.push(key);
        }

        for (const key of localKeys) local.removeItem(key);
        this.lastBackend = "localStorage";
        return true;
      } catch (error) {
        this.lastError = error;
        this.lastBackend = "memory";
        return true;
      }
    },

    checkpoint(name, value) {
      const key = this.key(name);
      let snapshot;

      if (arguments.length >= 2) {
        snapshot = value;
      } else {
        if (!this.has(name)) return false;
        snapshot = this.get(name);
      }

      try {
        this.checkpoints.set(key, this.clone(snapshot));
        return true;
      } catch (error) {
        this.lastError = error;
        return false;
      }
    },

    getCheckpoint(name, fallback) {
      const key = this.key(name);
      if (!this.checkpoints.has(key)) {
        return arguments.length >= 2 ? this.clone(fallback) : undefined;
      }
      return this.clone(this.checkpoints.get(key));
    },

    clearCheckpoint(name) {
      return this.checkpoints.delete(this.key(name));
    },

    info(name) {
      const id = String(name || "");
      const key = id ? this.key(id) : null;
      const definition = id ? this.definition(id) : null;
      let persistent = false;
      let storedVersion = null;

      if (key) {
        if (this.memoryPreferred.has(key) && this.memory.has(key)) {
          // The current session owns a newer value than localStorage.
          persistent = false;
          storedVersion = Number(this.memory.get(key)?.version ?? null);
        } else {
          try {
            const local = root.localStorage;
            const raw = local ? local.getItem(key) : null;
            persistent = raw !== null && raw !== undefined;
            if (raw !== null && raw !== undefined) {
              storedVersion = this.decodeRecord(raw).version;
            }
          } catch (error) {
            this.lastError = error;
          }

          if (storedVersion === null && this.memory.has(key)) {
            storedVersion = Number(this.memory.get(key)?.version ?? null);
          }
        }
      }

      return {
        name: id || null,
        key,
        defined: !!definition,
        version: definition ? definition.version : null,
        storedVersion,
        persistent,
        memory: !!(key && this.memory.has(key)),
        memoryPreferred: !!(key && this.memoryPreferred.has(key)),
        checkpoint: !!(key && this.checkpoints.has(key)),
        backend: this.lastBackend,
        lastError: this.lastError ? String(this.lastError.message || this.lastError) : null,
      };
    },
  };

  // ------------------------------------------------------------
  // Asset Loader
  // ------------------------------------------------------------

  const assets = {
    definitions: new Map(),
    records: new Map(),
    groups: new Map(),
    transparentPixel:
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",

    configure(options) {
      const source = options || {};
      const items = source.items || source.assets || {};
      const groups = source.groups || {};

      this.definitions.clear();
      this.records.clear();
      this.groups.clear();

      for (const [name, definition] of Object.entries(items)) {
        this.register(name, definition);
      }

      for (const [name, members] of Object.entries(groups)) {
        this.group(name, members);
      }

      return this;
    },

    inferType(file) {
      const source = String(file || "").split("?")[0].split("#")[0].toLowerCase();
      if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(source)) return "image";
      if (/\.json$/.test(source)) return "json";
      if (/\.(txt|md|csv|html|css|js)$/.test(source)) return "text";
      return "binary";
    },

    normalizeDefinition(definition) {
      if (typeof definition === "string") {
        return {
          type: this.inferType(definition),
          file: definition,
        };
      }

      const source = definition && typeof definition === "object"
        ? { ...definition }
        : {};

      if (!source.type) {
        if (source.audio || source.audioName) source.type = "audio";
        else source.type = this.inferType(source.file);
      }

      source.type = String(source.type || "binary").toLowerCase();
      return source;
    },

    register(name, definition) {
      const id = String(name || "");
      if (!id) throw new TypeError("SSE.assets.register requires a non-empty name.");

      const normalized = this.normalizeDefinition(definition);
      this.definitions.set(id, normalized);
      this.records.set(id, {
        name: id,
        definition: normalized,
        status: "idle",
        value: null,
        error: null,
        promise: null,
        loadedAt: 0,
      });

      return id;
    },

    registerMany(items) {
      for (const [name, definition] of Object.entries(items || {})) {
        this.register(name, definition);
      }
      return this;
    },

    group(name, members) {
      const id = String(name || "");
      if (!id) throw new TypeError("SSE.assets.group requires a non-empty name.");

      const list = Array.isArray(members) ? members.slice() : [members];
      this.groups.set(id, list.filter((item) => item !== undefined && item !== null));
      return id;
    },

    has(name) {
      return this.definitions.has(String(name));
    },

    resolve(target, seenGroups) {
      const seen = seenGroups || new Set();
      const output = [];
      const added = new Set();

      const visit = (item) => {
        if (Array.isArray(item)) {
          for (const nested of item) visit(nested);
          return;
        }

        const id = String(item || "");
        if (!id) return;

        if (this.groups.has(id)) {
          if (seen.has(id)) return;
          seen.add(id);
          for (const nested of this.groups.get(id)) visit(nested);
          seen.delete(id);
          return;
        }

        if (!this.definitions.has(id)) {
          throw new Error('Unknown asset or group: "' + id + '"');
        }

        if (!added.has(id)) {
          added.add(id);
          output.push(id);
        }
      };

      visit(target);
      return output;
    },

    record(name) {
      return this.records.get(String(name)) || null;
    },

    status(name) {
      const record = this.record(name);
      return record ? record.status : "missing";
    },

    get(name, fallback) {
      const record = this.record(name);
      if (!record || record.status !== "ready") {
        return arguments.length >= 2 ? fallback : null;
      }
      return record.value;
    },

    image(name) {
      return this.get(name, null);
    },

    isReady(target) {
      let names;
      try {
        names = this.resolve(target);
      } catch (_error) {
        return false;
      }
      return names.length > 0 && names.every((name) => this.status(name) === "ready");
    },

    progress(target) {
      let names = [];
      try {
        names = this.resolve(target);
      } catch (_error) {
        return {
          total: 0,
          ready: 0,
          loading: 0,
          error: 0,
          idle: 0,
          ratio: 0,
        };
      }

      const result = {
        total: names.length,
        ready: 0,
        loading: 0,
        error: 0,
        idle: 0,
        ratio: names.length === 0 ? 1 : 0,
      };

      for (const name of names) {
        const status = this.status(name);
        if (Object.prototype.hasOwnProperty.call(result, status)) {
          result[status] += 1;
        }
      }

      result.ratio = result.total > 0 ? result.ready / result.total : 1;
      return result;
    },

    setFetchPriority(value, priority) {
      const element = value && value.element ? value.element : value;
      if (!element || !priority) return;
      try {
        if ("fetchPriority" in element) element.fetchPriority = priority;
      } catch (_error) {
        // Best effort only.
      }
    },

    waitForImage(value, definition, options) {
      if (!value) return Promise.reject(new Error("Image loader returned no value."));
      if (value.loaded && !value.error) return Promise.resolve(value);
      if (value.error) return Promise.reject(value.error);

      const element = value.element || value;
      const timeoutMs = Math.max(
        250,
        Number(options?.timeoutMs ?? definition.timeoutMs ?? 15000) || 15000
      );

      return new Promise((resolve, reject) => {
        let settled = false;
        let timeoutId = null;

        const cleanup = () => {
          if (timeoutId !== null && typeof root.clearTimeout === "function") {
            root.clearTimeout(timeoutId);
          }
          if (element && typeof element.removeEventListener === "function") {
            element.removeEventListener("load", onLoad);
            element.removeEventListener("error", onError);
          }
        };

        const finish = (ok, error) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (ok) resolve(value);
          else reject(error || new Error("Image failed to load: " + (definition.file || "")));
        };

        const onLoad = () => {
          if (value && Object.prototype.hasOwnProperty.call(value, "loaded")) {
            value.loaded = true;
          }
          finish(true);
        };

        const onError = () => {
          finish(false, value.error || new Error("Image failed to load: " + (definition.file || "")));
        };

        if (element && typeof element.addEventListener === "function") {
          element.addEventListener("load", onLoad, { once: true });
          element.addEventListener("error", onError, { once: true });
        }

        if (
          element &&
          element.complete &&
          Number(element.naturalWidth || element.width || value.width || 0) > 0
        ) {
          onLoad();
          return;
        }

        if (typeof root.setTimeout === "function") {
          timeoutId = root.setTimeout(() => {
            finish(false, new Error("Image load timed out: " + (definition.file || "")));
          }, timeoutMs);
        }
      });
    },

    loadImage(name, definition, options) {
      const loader =
        (typeof root.loadImage === "function" && root.loadImage) ||
        (typeof root.readImage === "function" && root.readImage);

      if (!loader) {
        return Promise.reject(new Error("No Codea-style image loader is available."));
      }

      let value;
      try {
        value = loader(definition.file);
      } catch (error) {
        return Promise.reject(error);
      }

      this.setFetchPriority(
        value,
        options?.priority || definition.priority || null
      );

      return this.waitForImage(value, definition, options);
    },

    loadFetch(definition, options) {
      if (typeof root.fetch !== "function") {
        return Promise.reject(new Error("Fetch API is unavailable."));
      }

      const controller = typeof root.AbortController === "function"
        ? new root.AbortController()
        : null;

      const timeoutMs = Math.max(
        0,
        Number(options?.timeoutMs ?? definition.timeoutMs ?? 15000) || 0
      );

      let timeoutId = null;
      if (controller && timeoutMs > 0 && typeof root.setTimeout === "function") {
        timeoutId = root.setTimeout(() => controller.abort(), timeoutMs);
      }

      return root.fetch(definition.file, {
        method: "GET",
        cache: definition.cache || options?.cache || "force-cache",
        signal: controller?.signal,
      }).then((response) => {
        if (!response || !response.ok) {
          throw new Error(
            "Asset fetch failed: " +
            String(definition.file || "") +
            " (" +
            String(response?.status || "network") +
            ")"
          );
        }

        if (definition.type === "json") return response.json();
        if (definition.type === "text") return response.text();
        if (definition.type === "blob") return response.blob();
        return response.arrayBuffer();
      }).finally(() => {
        if (timeoutId !== null && typeof root.clearTimeout === "function") {
          root.clearTimeout(timeoutId);
        }
      });
    },

    loadAudio(definition) {
      const audioName = String(definition.audioName || definition.audio || "");
      if (!audioName) {
        return Promise.reject(
          new Error("Audio assets must reference an SSE.audio name.")
        );
      }

      return Promise.resolve(audio.preload(audioName)).then(() => {
        if (audio.buffers[audioName]) return audio.buffers[audioName];
        if (audio.musicPlayers[audioName]) return audio.musicPlayers[audioName];
        return true;
      });
    },

    load(name, options) {
      const id = String(name || "");
      const record = this.record(id);
      if (!record) return Promise.reject(new Error('Unknown asset: "' + id + '"'));

      if (record.status === "ready") return Promise.resolve(record.value);
      if (record.status === "loading" && record.promise) return record.promise;
      if (record.status === "error" && !options?.retry) {
        return Promise.resolve(null);
      }

      const definition = record.definition;
      record.status = "loading";
      record.error = null;

      let task;
      if (definition.type === "image") {
        task = this.loadImage(id, definition, options);
      } else if (definition.type === "audio") {
        task = this.loadAudio(definition);
      } else {
        task = this.loadFetch(definition, options);
      }

      record.promise = Promise.resolve(task)
        .then((value) => {
          record.value = value;
          record.status = "ready";
          record.error = null;
          record.loadedAt = Date.now();
          record.promise = null;
          return value;
        })
        .catch((error) => {
          record.value = null;
          record.status = "error";
          record.error = error;
          record.promise = null;
          diagnostics.warn(
            "asset-load-failed",
            id + " failed to load.",
            { file: definition.file || null, message: String(error?.message || error) }
          );
          debug.log("[SSE.assets] load failed", id, error);
          if (options?.strict) throw error;
          return null;
        });

      return record.promise;
    },

    preload(target, options) {
      let names;
      try {
        names = this.resolve(target);
      } catch (error) {
        if (options?.strict) return Promise.reject(error);
        return Promise.resolve({
          ok: false,
          total: 0,
          ready: 0,
          error: 1,
          results: [],
          reason: String(error.message || error),
        });
      }

      return Promise.all(
        names.map((name) => this.load(name, options))
      ).then((values) => {
        const progress = this.progress(names);
        return {
          ok: progress.error === 0,
          ...progress,
          results: names.map((name, index) => ({
            name,
            status: this.status(name),
            value: values[index],
            error: this.record(name)?.error || null,
          })),
        };
      });
    },

    schedule(target, options) {
      const opts = options || {};
      const when = opts.when || "idle";
      const delay = Math.max(0, Number(opts.delay) || 0);

      const run = () => new Promise((resolve) => {
        const start = () => {
          Promise.resolve(this.preload(target, opts)).then(resolve);
        };

        if (delay > 0 && typeof root.setTimeout === "function") {
          root.setTimeout(start, delay);
        } else {
          start();
        }
      });

      if (when === "load" && typeof document !== "undefined") {
        if (document.readyState === "complete") return run();

        return new Promise((resolve) => {
          const onLoad = () => {
            Promise.resolve(run()).then(resolve);
          };
          root.addEventListener("load", onLoad, { once: true });
        });
      }

      if (when === "idle") {
        return new Promise((resolve) => {
          if (typeof root.requestIdleCallback === "function") {
            root.requestIdleCallback(() => {
              Promise.resolve(run()).then(resolve);
            });
          } else if (typeof root.setTimeout === "function") {
            root.setTimeout(() => {
              Promise.resolve(run()).then(resolve);
            }, 0);
          } else {
            Promise.resolve(run()).then(resolve);
          }
        });
      }

      return run();
    },

    fileStillReferenced(file, exceptName) {
      const source = String(file || "");
      if (!source) return false;

      for (const [name, record] of this.records.entries()) {
        if (name === exceptName) continue;
        if (record.status !== "ready" && record.status !== "loading") continue;
        if (String(record.definition?.file || "") === source) return true;
      }

      return false;
    },

    releaseOne(name, options) {
      const record = this.record(name);
      if (!record) return false;

      const definition = record.definition;
      const value = record.value;

      if (
        definition.type === "image" &&
        value &&
        !this.fileStillReferenced(definition.file, name)
      ) {
        const cache = root.CodeaLite?.state?.imageCache;
        const element = value.element || null;

        if (element && options?.hard !== false) {
          try {
            element.onload = null;
            element.onerror = null;
            element.src = this.transparentPixel;
          } catch (_error) {
            // Best effort only.
          }
        }

        if (cache && typeof cache.delete === "function") {
          try {
            cache.delete(String(definition.file));
          } catch (_error) {
            // Best effort only.
          }
        }

        if (options?.hard !== false) {
          try {
            if (Object.prototype.hasOwnProperty.call(value, "element")) {
              value.element = null;
            }
            if (Object.prototype.hasOwnProperty.call(value, "loaded")) {
              value.loaded = false;
            }
            if (Object.prototype.hasOwnProperty.call(value, "width")) value.width = 0;
            if (Object.prototype.hasOwnProperty.call(value, "height")) value.height = 0;
          } catch (_error) {
            // Best effort only.
          }
        }
      }

      record.status = "idle";
      record.value = null;
      record.error = null;
      record.promise = null;
      record.loadedAt = 0;
      return true;
    },

    release(target, options) {
      let names;
      try {
        names = this.resolve(target);
      } catch (_error) {
        return 0;
      }

      let count = 0;
      for (const name of names) {
        if (this.releaseOne(name, options)) count += 1;
      }
      return count;
    },

    report(target) {
      let names;
      try {
        names = target === undefined || target === null
          ? Array.from(this.definitions.keys())
          : this.resolve(target);
      } catch (_error) {
        names = [];
      }

      return names.map((name) => {
        const record = this.record(name);
        return {
          name,
          type: record?.definition?.type || "missing",
          file: record?.definition?.file || null,
          status: record?.status || "missing",
          loadedAt: record?.loadedAt || 0,
          error: record?.error
            ? String(record.error.message || record.error)
            : null,
        };
      });
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
  // Audio v2
  // ------------------------------------------------------------

  const audio = {
    enabled: true,
    unlocked: false,
    ctx: null,
    masterGain: null,
    musicGain: null,
    seGain: null,

    masterVolume: 0.7,
    musicVolume: 1,
    seVolume: 1,
    poolSize: 4,

    definitions: {},
    pools: {},
    bufferDefinitions: {},
    buffers: {},
    loadingBuffers: {},
    lastPlayed: {},

    musicDefinitions: {},
    musicPlayers: {},
    currentMusic: null,
    lifecyclePausedMusic: new Set(),
    lifecycleContextWasRunning: false,

    storageKey: "sse-sound",

    definition(value) {
      if (typeof value === "string") return { file: value };
      return value && typeof value === "object" ? value : {};
    },

    configure(options) {
      const source = options || {};

      this.masterVolume = clamp(Number(source.masterVolume ?? 0.7), 0, 1);
      this.musicVolume = clamp(Number(source.musicVolume ?? 1), 0, 1);
      this.seVolume = clamp(Number(source.seVolume ?? 1), 0, 1);
      this.poolSize = Math.max(1, Math.floor(Number(source.poolSize) || 4));
      this.storageKey = source.storageKey || ("sse:" + state.config.id + ":sound");

      this.definitions = source.sounds || {};
      this.musicDefinitions = source.music || {};
      this.pools = {};
      this.bufferDefinitions = {};
      this.lastPlayed = {};

      try {
        this.enabled = root.localStorage?.getItem(this.storageKey) !== "false";
      } catch (_error) {
        this.enabled = true;
      }

      for (const [name, definitionValue] of Object.entries(this.definitions)) {
        const definition = this.definition(definitionValue);
        if (!definition.file) continue;

        if (definition.mode === "buffer" || definition.buffer === true) {
          this.bufferDefinitions[name] = definition;
          continue;
        }

        if (typeof root.Audio !== "function") continue;
        const pool = [];

        const definitionPoolSize = Math.max(
          1,
          Math.floor(Number(definition.poolSize) || this.poolSize)
        );

        for (let i = 0; i < definitionPoolSize; i += 1) {
          const item = new root.Audio(definition.file);
          item.preload = definition.preload || "auto";
          item.volume = clamp(Number(definition.volume ?? 0.25), 0, 1);
          item.playsInline = true;
          pool.push(item);
        }

        this.pools[name] = pool;
      }

      if (typeof root.Audio === "function") {
        for (const [name, definitionValue] of Object.entries(this.musicDefinitions)) {
          const definition = this.definition(definitionValue);
          if (!definition.file) continue;
          this.createMusicPlayer(name, definition);
        }
      }

      if (this.ctx) {
        this.ensureBuses();
        this.syncBusVolumes(0);
      }
    },

    ensureContext() {
      const AudioContextClass = root.AudioContext || root.webkitAudioContext;
      if (!AudioContextClass) return null;

      if (!this.ctx) {
        this.ctx = new AudioContextClass();
        this.ensureBuses();
      }

      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }

      return this.ctx;
    },

    ensureBuses() {
      if (!this.ctx) return false;

      if (!this.masterGain) {
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
      }

      if (!this.musicGain) {
        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.masterGain);
      }

      if (!this.seGain) {
        this.seGain = this.ctx.createGain();
        this.seGain.connect(this.masterGain);
      }

      this.syncBusVolumes(0);

      for (const player of Object.values(this.musicPlayers)) {
        this.wireMusicPlayer(player);
      }

      return true;
    },

    rampGain(node, value, duration) {
      if (!node || !node.gain || !this.ctx) return;
      const target = clamp(Number(value) || 0, 0, 1);
      const seconds = Math.max(0, Number(duration) || 0);
      const now = this.ctx.currentTime;

      try {
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(node.gain.value, now);
        if (seconds > 0) {
          node.gain.linearRampToValueAtTime(target, now + seconds);
        } else {
          node.gain.setValueAtTime(target, now);
        }
      } catch (_error) {
        node.gain.value = target;
      }
    },

    syncBusVolumes(duration) {
      const seconds = Math.max(0, Number(duration) || 0);
      this.rampGain(this.masterGain, this.enabled ? this.masterVolume : 0, seconds);
      this.rampGain(this.musicGain, this.musicVolume, seconds);
      this.rampGain(this.seGain, this.seVolume, seconds);
    },

    setBusVolume(bus, value, options) {
      const level = clamp(Number(value) || 0, 0, 1);
      const fade = Math.max(0, Number(options?.fade ?? options?.duration ?? 0) || 0);

      if (bus === "master") this.masterVolume = level;
      else if (bus === "music") this.musicVolume = level;
      else if (bus === "se" || bus === "sfx") this.seVolume = level;
      else return false;

      if (this.ctx) this.syncBusVolumes(fade);

      if (!this.ctx && bus !== "se") {
        for (const player of Object.values(this.musicPlayers)) {
          this.applyFallbackMusicVolume(player);
        }
      }

      return true;
    },

    unlock() {
      if (this.unlocked) return;
      this.unlocked = true;

      const needsContext =
        Object.keys(this.bufferDefinitions).length > 0 ||
        Object.keys(this.musicDefinitions).length > 0;

      if (needsContext) this.ensureContext();

      // Legacy HTMLAudio pools still need a gesture unlock on iOS.
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

    async loadBuffer(name) {
      if (this.buffers[name]) return this.buffers[name];
      if (this.loadingBuffers[name]) return this.loadingBuffers[name];

      const definition = this.bufferDefinitions[name];
      if (!definition || !definition.file || typeof root.fetch !== "function") return null;

      const ctx = this.ensureContext();
      if (!ctx) return null;

      const task = root.fetch(definition.file, { cache: definition.cache || "force-cache" })
        .then((response) => {
          if (!response.ok) {
            throw new Error("SSE audio fetch failed: " + name + " (" + response.status + ")");
          }
          return response.arrayBuffer();
        })
        .then((data) => ctx.decodeAudioData(data.slice(0)))
        .then((buffer) => {
          this.buffers[name] = buffer;
          return buffer;
        })
        .catch((error) => {
          diagnostics.warn(
            "audio-buffer-load-failed",
            name + " failed to decode/load.",
            { file: definition.file || null, message: String(error?.message || error) }
          );
          debug.log("[SSE.audio] buffer load failed", name, error);
          return null;
        })
        .finally(() => {
          delete this.loadingBuffers[name];
        });

      this.loadingBuffers[name] = task;
      return task;
    },

    preload(names) {
      const requested = names === undefined || names === null
        ? Object.keys(this.bufferDefinitions)
        : (Array.isArray(names) ? names : [names]);

      const tasks = [];

      for (const name of requested) {
        if (this.bufferDefinitions[name]) tasks.push(this.loadBuffer(name));
        const player = this.musicPlayers[name];
        if (player?.audio && typeof player.audio.load === "function") {
          try { player.audio.load(); } catch (_error) {}
        }
      }

      if (names === undefined || names === null) {
        for (const player of Object.values(this.musicPlayers)) {
          if (!player?.audio || typeof player.audio.load !== "function") continue;
          try { player.audio.load(); } catch (_error) {}
        }
      }

      return Promise.all(tasks);
    },

    cooldownAllows(name, definition, options) {
      const opts = options || {};
      const cooldown = Number(opts.cooldown ?? definition.cooldown ?? 80);
      const now = nowMs();

      if (!opts.force && this.lastPlayed[name] && now - this.lastPlayed[name] < cooldown) {
        return false;
      }

      this.lastPlayed[name] = now;
      return true;
    },

    playBuffer(name, options) {
      if (!this.enabled) return false;

      const definition = this.bufferDefinitions[name];
      if (!definition) return false;

      const opts = options || {};
      if (!this.cooldownAllows(name, definition, opts)) return false;

      const ctx = this.ensureContext();
      if (!ctx || !this.seGain) return false;
      this.unlocked = true;

      const buffer = this.buffers[name];
      if (!buffer) {
        this.loadBuffer(name);
        return false;
      }

      try {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();

        source.buffer = buffer;
        source.playbackRate.value = clamp(
          Number(opts.playbackRate ?? definition.playbackRate ?? 1),
          0.25,
          4
        );

        const volume = clamp(
          Number(opts.volume ?? definition.volume ?? 0.25),
          0,
          1
        );

        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(this.seGain);

        source.start(0);
        source.onended = () => {
          try {
            source.disconnect();
            gain.disconnect();
          } catch (_error) {}
        };

        return true;
      } catch (_error) {
        return false;
      }
    },

    play(name, options) {
      if (!this.enabled) return false;

      const definitionValue = this.definitions[name];
      const definition = this.definition(definitionValue);

      if (definition.mode === "buffer" || definition.buffer === true) {
        return this.playBuffer(name, options);
      }

      const pool = this.pools[name];
      if (!pool || pool.length === 0) return false;

      const opts = options || {};
      if (!this.cooldownAllows(name, definition, opts)) return false;

      this.unlock();

      let item = pool.find((candidate) => candidate.paused || candidate.ended);
      if (!item) item = pool[0];

      try {
        item.pause();
        item.currentTime = 0;
        item.volume = clamp(
          Number(opts.volume ?? definition.volume ?? 0.25),
          0,
          1
        );
        item.playbackRate = clamp(
          Number(opts.playbackRate ?? definition.playbackRate ?? 1),
          0.25,
          4
        );

        const promise = item.play();
        if (promise && promise.catch) promise.catch(() => {});
        return true;
      } catch (_error) {
        return false;
      }
    },

    createMusicPlayer(name, definitionValue) {
      if (this.musicPlayers[name]) return this.musicPlayers[name];
      if (typeof root.Audio !== "function") return null;

      const definition = this.definition(definitionValue || this.musicDefinitions[name]);
      if (!definition.file) return null;

      const element = new root.Audio(definition.file);
      element.preload = definition.preload || "auto";
      element.loop = definition.loop !== false;
      element.playsInline = true;
      element.volume = 1;

      const player = {
        name,
        definition,
        audio: element,
        source: null,
        gain: null,
        level: clamp(Number(definition.volume ?? 1), 0, 1),
        stopToken: 0,
      };

      this.musicPlayers[name] = player;
      if (this.ctx) this.wireMusicPlayer(player);
      else this.applyFallbackMusicVolume(player);

      return player;
    },

    wireMusicPlayer(player) {
      if (!player || !player.audio || !this.ctx || player.source) return !!player?.source;

      try {
        player.source = this.ctx.createMediaElementSource(player.audio);
        player.gain = this.ctx.createGain();
        player.gain.gain.value = player.level;
        player.source.connect(player.gain);
        player.gain.connect(this.musicGain || this.masterGain);
        player.audio.volume = 1;
        return true;
      } catch (error) {
        debug.log("[SSE.audio] music routing fallback", player.name, error);
        player.source = null;
        player.gain = null;
        this.applyFallbackMusicVolume(player);
        return false;
      }
    },

    applyFallbackMusicVolume(player) {
      if (!player?.audio || player.gain) return;
      player.audio.volume = clamp(
        player.level * this.musicVolume * this.masterVolume * (this.enabled ? 1 : 0),
        0,
        1
      );
    },

    playMusic(name, options) {
      if (!this.enabled) return false;

      const definition = this.definition(this.musicDefinitions[name]);
      if (!definition.file) return false;

      const opts = options || {};
      const player = this.createMusicPlayer(name, definition);
      if (!player) return false;

      this.unlock();
      if (this.ctx) this.wireMusicPlayer(player);

      const previous = this.currentMusic && this.currentMusic !== name
        ? this.musicPlayers[this.currentMusic]
        : null;

      if (previous) {
        this.stopMusic({
          name: previous.name,
          fade: Number(opts.crossfade ?? opts.fadeOut ?? 0),
        });
      }

      player.stopToken += 1;
      player.level = clamp(Number(opts.volume ?? definition.volume ?? 1), 0, 1);

      if (opts.restart === true) {
        try { player.audio.currentTime = 0; } catch (_error) {}
      }

      if (player.gain && this.ctx) {
        const fade = Math.max(0, Number(opts.fade ?? opts.fadeIn ?? 0) || 0);
        const now = this.ctx.currentTime;
        try {
          player.gain.gain.cancelScheduledValues(now);
          if (fade > 0) {
            player.gain.gain.setValueAtTime(0.0001, now);
            player.gain.gain.linearRampToValueAtTime(player.level, now + fade);
          } else {
            player.gain.gain.setValueAtTime(player.level, now);
          }
        } catch (_error) {
          player.gain.gain.value = player.level;
        }
      } else {
        this.applyFallbackMusicVolume(player);
      }

      try {
        const promise = player.audio.play();
        if (promise && promise.catch) promise.catch(() => {});
        this.currentMusic = name;
        return true;
      } catch (_error) {
        return false;
      }
    },

    setMusicLevel(value, options) {
      const name = options?.name || this.currentMusic;
      const player = name ? this.musicPlayers[name] : null;
      if (!player) return false;

      player.level = clamp(Number(value) || 0, 0, 1);
      const fade = Math.max(0, Number(options?.fade ?? options?.duration ?? 0) || 0);

      if (player.gain && this.ctx) {
        this.rampGain(player.gain, player.level, fade);
      } else {
        this.applyFallbackMusicVolume(player);
      }

      return true;
    },

    stopMusic(options) {
      const opts = options || {};
      const name = opts.name || this.currentMusic;
      const player = name ? this.musicPlayers[name] : null;
      if (!player) return false;

      const fade = Math.max(0, Number(opts.fade ?? 0) || 0);
      const token = ++player.stopToken;

      const stopNow = () => {
        if (player.stopToken !== token) return;
        try {
          player.audio.pause();
          if (opts.reset !== false) player.audio.currentTime = 0;
        } catch (_error) {}

        if (this.currentMusic === name) this.currentMusic = null;
      };

      if (fade > 0 && player.gain && this.ctx) {
        this.rampGain(player.gain, 0, fade);
        root.setTimeout(stopNow, Math.ceil(fade * 1000) + 20);
      } else {
        stopNow();
      }

      return true;
    },

    pauseMusic(name) {
      const target = name || this.currentMusic;
      const player = target ? this.musicPlayers[target] : null;
      if (!player) return false;
      try {
        player.audio.pause();
        return true;
      } catch (_error) {
        return false;
      }
    },

    resumeMusic(name) {
      if (!this.enabled) return false;
      const target = name || this.currentMusic;
      const player = target ? this.musicPlayers[target] : null;
      if (!player) return false;

      this.unlock();
      if (this.ctx) this.wireMusicPlayer(player);
      else this.applyFallbackMusicVolume(player);

      try {
        const promise = player.audio.play();
        if (promise && promise.catch) promise.catch(() => {});
        this.currentMusic = target;
        return true;
      } catch (_error) {
        return false;
      }
    },

    pauseForLifecycle() {
      this.lifecyclePausedMusic.clear();
      this.lifecycleContextWasRunning = !!(
        this.ctx &&
        this.ctx.state === "running"
      );

      for (const [name, player] of Object.entries(this.musicPlayers)) {
        if (!player?.audio || player.audio.paused) continue;
        this.lifecyclePausedMusic.add(name);
        try { player.audio.pause(); } catch (_error) {}
      }

      if (
        this.ctx &&
        this.ctx.state === "running" &&
        typeof this.ctx.suspend === "function"
      ) {
        try {
          const promise = this.ctx.suspend();
          if (promise?.catch) promise.catch(() => {});
        } catch (_error) {}
      }

      return true;
    },

    resumeFromLifecycle() {
      if (!this.enabled) {
        this.lifecyclePausedMusic.clear();
        return false;
      }

      if (
        this.ctx &&
        this.lifecycleContextWasRunning &&
        this.ctx.state === "suspended" &&
        typeof this.ctx.resume === "function"
      ) {
        try {
          const promise = this.ctx.resume();
          if (promise?.catch) promise.catch(() => {});
        } catch (_error) {}
      }

      const names = Array.from(this.lifecyclePausedMusic);
      this.lifecyclePausedMusic.clear();

      for (const name of names) {
        const player = this.musicPlayers[name];
        if (!player?.audio) continue;
        try {
          const promise = player.audio.play();
          if (promise?.catch) promise.catch(() => {});
        } catch (_error) {}
      }

      return names.length > 0;
    },

    tone(options) {
      if (!this.enabled) return false;

      const ctx = this.ensureContext();
      if (!ctx || !this.seGain) return false;
      this.unlocked = true;

      const opts = options || {};
      const start = ctx.currentTime;
      const duration = Math.max(0.01, Number(opts.duration) || 0.08);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = opts.type || "triangle";
      oscillator.frequency.setValueAtTime(
        Math.max(20, Number(opts.frequency) || 440),
        start
      );

      if (opts.endFrequency !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(20, Number(opts.endFrequency) || 440),
          start + duration
        );
      }

      const volume = clamp(Number(opts.volume ?? 0.06), 0.0001, 1);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(
        volume,
        start + Math.min(0.01, duration * 0.25)
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gain);
      gain.connect(this.seGain);
      oscillator.start(start);
      oscillator.stop(start + duration);
      return true;
    },

    setEnabled(value) {
      this.enabled = !!value;

      try {
        root.localStorage?.setItem(
          this.storageKey,
          this.enabled ? "true" : "false"
        );
      } catch (_error) {
        // Ignore persistence errors.
      }

      if (this.ctx) this.syncBusVolumes(0.08);

      if (!this.enabled) {
        for (const player of Object.values(this.musicPlayers)) {
          try { player.audio.pause(); } catch (_error) {}
        }
      } else {
        for (const player of Object.values(this.musicPlayers)) {
          this.applyFallbackMusicVolume(player);
        }
      }

      return this.enabled;
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

  function isAnalyticsStaging() {
    try {
      return /\/yumaniwa-town-staging(?:\/|$)/.test(root.location?.pathname || "");
    } catch (_) {
      return false;
    }
  }

  function trackViaHost(name, props, options) {
    try {
      if (
        root.parent &&
        root.parent !== root &&
        root.parent.__YUMANIWA_ANALYTICS_READY__ === true &&
        typeof root.parent.trackYumaniwaEvent === "function"
      ) {
        return root.parent.trackYumaniwaEvent(name, props || {}, options || {});
      }
    } catch (_) {
      // Cross-origin parents are intentionally ignored.
    }
    return null;
  }

  const analytics = {
    enabled: false,
    provider: null,

    configure(options) {
      const source = options || {};
      this.enabled = source.enabled !== false;
      this.provider = typeof source.provider === "function"
        ? source.provider
        : function defaultProvider(name, props, eventOptions) {
            const opts = eventOptions || {};
            const hostResult = trackViaHost(name, props, opts);
            if (hostResult !== null) return hostResult;

            if (isAnalyticsStaging()) {
              try {
                root.console?.info?.(
                  "[SukimaStock Analytics]",
                  name,
                  props || {},
                  { interactive: opts.interactive !== false }
                );
              } catch (_) {}
              return false;
            }

            if (typeof root.plausible !== "function") return false;

            const payload = { props: props || {} };
            if (opts.interactive === false) {
              payload.interactive = false;
            }
            root.plausible(name, payload);
            return true;
          };
    },

    track(name, props, options) {
      if (!this.enabled || !this.provider) return false;
      try {
        return this.provider(name, props || {}, options || {}) !== false;
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
  // Diagnostics + DevTools
  // ------------------------------------------------------------

  const diagnostics = {
    events: [],
    maxEvents: 80,
    sequence: 0,

    configure(options) {
      const source = options || {};
      this.maxEvents = Math.max(10, Math.floor(Number(source.maxEvents) || 80));
      if (this.events.length > this.maxEvents) {
        this.events.splice(0, this.events.length - this.maxEvents);
      }
      return this;
    },

    add(level, code, message, detail) {
      const event = {
        id: ++this.sequence,
        at: Date.now(),
        elapsedMs: performanceMonitor?.startedAtMs
          ? Math.max(0, nowMs() - performanceMonitor.startedAtMs)
          : 0,
        level: String(level || "info"),
        code: String(code || "event"),
        message: String(message || ""),
        detail: detail === undefined ? null : this.safeDetail(detail),
      };

      this.events.push(event);
      if (this.events.length > this.maxEvents) {
        this.events.splice(0, this.events.length - this.maxEvents);
      }

      return event;
    },

    safeDetail(value) {
      if (value === null || value === undefined) return value;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
      }

      try {
        return JSON.parse(JSON.stringify(value));
      } catch (_error) {
        return String(value);
      }
    },

    info(code, message, detail) {
      return this.add("info", code, message, detail);
    },

    warn(code, message, detail) {
      return this.add("warn", code, message, detail);
    },

    error(code, message, detail) {
      return this.add("error", code, message, detail);
    },

    recent(limit) {
      const count = Math.max(0, Math.floor(Number(limit) || 10));
      return this.events.slice(Math.max(0, this.events.length - count));
    },

    summary() {
      const counts = { info: 0, warn: 0, error: 0 };
      for (const event of this.events) {
        if (Object.prototype.hasOwnProperty.call(counts, event.level)) {
          counts[event.level] += 1;
        }
      }
      return {
        total: this.events.length,
        ...counts,
      };
    },

    clear() {
      this.events = [];
      return true;
    },
  };

  const devtools = {
    installed: false,
    panelElement: null,
    bodyElement: null,
    timer: null,
    tunings: new Map(),

    config() {
      return state.config.devtools || {};
    },

    queryEnabled(targetRoot) {
      try {
        const param = String(this.config().queryParam || "dev");
        const search = String(targetRoot.location?.search || "").replace(/^\?/, "");
        if (!search) return false;

        for (const pair of search.split("&")) {
          if (!pair) continue;
          const parts = pair.split("=");
          let key = parts.shift() || "";
          let value = parts.join("=");

          try { key = decodeURIComponent(key.replace(/\+/g, " ")); } catch (_error) {}
          try { value = decodeURIComponent(value.replace(/\+/g, " ")); } catch (_error) {}

          if (key !== param) continue;
          return value === "1" || value === "true" || value === "yes";
        }

        return false;
      } catch (_error) {
        return false;
      }
    },

    enabled() {
      const configured = this.config().enabled;
      if (configured === true) return true;
      if (configured === false) return false;
      if (this.queryEnabled(root)) return true;

      try {
        if (root.top && root.top !== root && this.queryEnabled(root.top)) return true;
      } catch (_error) {
        // Cross-origin top window.
      }

      return false;
    },

    round(value, digits = 1) {
      const number = Number(value);
      if (!Number.isFinite(number)) return 0;
      const scale = Math.pow(10, digits);
      return Math.round(number * scale) / scale;
    },

    formatDuration(ms) {
      const value = Math.max(0, Number(ms) || 0);
      if (value < 1000) return Math.round(value) + "ms";
      if (value < 60000) return (value / 1000).toFixed(1) + "s";
      const minutes = Math.floor(value / 60000);
      const seconds = Math.floor((value % 60000) / 1000);
      return minutes + "m " + seconds + "s";
    },

    storageReport() {
      const names = Array.from(storage.definitions.keys());
      return names.map((name) => storage.info(name));
    },

    audioReport() {
      const music = Object.entries(audio.musicPlayers).map(([name, player]) => ({
        name,
        paused: !!player?.audio?.paused,
        level: Number(player?.level ?? 0),
      }));

      return {
        enabled: !!audio.enabled,
        unlocked: !!audio.unlocked,
        contextState: audio.ctx?.state || "none",
        masterVolume: audio.masterVolume,
        musicVolume: audio.musicVolume,
        seVolume: audio.seVolume,
        currentMusic: audio.currentMusic,
        music,
        buffersLoaded: Object.keys(audio.buffers).length,
        buffersConfigured: Object.keys(audio.bufferDefinitions).length,
      };
    },

    assetReport() {
      const items = assets.report();
      const summary = {
        total: items.length,
        ready: 0,
        loading: 0,
        error: 0,
        idle: 0,
      };

      for (const item of items) {
        if (Object.prototype.hasOwnProperty.call(summary, item.status)) {
          summary[item.status] += 1;
        }
      }

      return { summary, items };
    },

    inputReport() {
      const actionsDown = [];
      for (const name of input.bindings.keys()) {
        if (input.action(name)) actionsDown.push(name);
      }

      return {
        pointerActive: state.activePointerId !== null,
        pointerId: state.activePointerId,
        keysDown: Array.from(input.keysDown),
        actionsDown,
      };
    },

    tuningReport() {
      return Array.from(this.tunings.entries()).map(([name, entry]) => ({
        name,
        value: entry.value,
        min: entry.min,
        max: entry.max,
        step: entry.step,
      }));
    },

    health(report) {
      const issues = [];

      if (debug.message) {
        issues.push({
          level: "error",
          code: "runtime-error",
          text: "Runtime error captured: " + debug.message.split("\n")[0],
        });
      }

      const failedAssets = report.assets.items.filter((item) => item.status === "error");
      if (failedAssets.length > 0) {
        issues.push({
          level: "error",
          code: "asset-error",
          text: failedAssets.length + " asset(s) failed to load: " +
            failedAssets.map((item) => item.name).join(", "),
        });
      }

      const storageFallback = report.storage.filter((item) => item.memoryPreferred);
      if (storageFallback.length > 0) {
        issues.push({
          level: "warn",
          code: "storage-memory-fallback",
          text: "Latest state is memory-only for: " +
            storageFallback.map((item) => item.name).join(", "),
        });
      }

      const storageErrors = report.storage.filter((item) => item.lastError);
      if (storageErrors.length > 0) {
        issues.push({
          level: "warn",
          code: "storage-error",
          text: "Storage reported an error for: " +
            storageErrors.map((item) => item.name).join(", "),
        });
      }

      if (
        report.audio.enabled &&
        !report.lifecycle.paused &&
        report.audio.contextState === "suspended" &&
        (report.audio.currentMusic || report.audio.buffersConfigured > 0)
      ) {
        issues.push({
          level: "warn",
          code: "audio-suspended",
          text: "AudioContext is suspended while the work is active.",
        });
      }

      if (report.performance.frames.slow > 0) {
        issues.push({
          level: "warn",
          code: "slow-frames",
          text:
            report.performance.frames.slow +
            " slow frame(s) observed; p95 " +
            this.round(report.performance.frame.p95Ms, 1) +
            "ms.",
        });
      }

      if (report.lifecycle.paused) {
        issues.push({
          level: "info",
          code: "lifecycle-paused",
          text: "Work is currently paused: " +
            (report.lifecycle.reasons.join(", ") || "unknown reason"),
        });
      }

      const diag = report.diagnostics.summary;
      if (diag.error > 0) {
        issues.push({
          level: "error",
          code: "diagnostic-errors",
          text: diag.error + " diagnostic error event(s) recorded.",
        });
      } else if (diag.warn > 0) {
        issues.push({
          level: "warn",
          code: "diagnostic-warnings",
          text: diag.warn + " diagnostic warning event(s) recorded.",
        });
      }

      if (issues.length === 0) {
        issues.push({
          level: "ok",
          code: "healthy",
          text: "No Engine-level problems detected in this session.",
        });
      }

      return issues;
    },

    report() {
      const perf = performanceMonitor.snapshot();
      const assetState = this.assetReport();

      const report = {
        generatedAt: new Date().toISOString(),
        app: {
          id: String(state.config.id || "sukimastock-app"),
          engine: "SukimaStock Engine",
          engineVersion: VERSION,
          scene: app.current(),
          sceneStack: app.stack(),
        },
        environment: {
          path: String(root.location?.pathname || ""),
          search: String(root.location?.search || ""),
          userAgent: String(root.navigator?.userAgent || ""),
          platform: String(root.navigator?.platform || ""),
          language: String(root.navigator?.language || ""),
          viewport: {
            screenWidth: viewport.screenWidth,
            screenHeight: viewport.screenHeight,
            logicalWidth: viewport.logicalWidth,
            logicalHeight: viewport.logicalHeight,
            scale: viewport.scale,
          },
        },
        lifecycle: lifecycle.snapshot(),
        performance: perf,
        audio: this.audioReport(),
        storage: this.storageReport(),
        assets: assetState,
        input: this.inputReport(),
        tuning: this.tuningReport(),
        diagnostics: {
          summary: diagnostics.summary(),
          recent: diagnostics.recent(20),
        },
      };

      report.health = this.health(report);
      return report;
    },

    reportText() {
      const r = this.report();
      const lines = [];
      const push = (value = "") => lines.push(String(value));

      push("SUKIMASTOCK SESSION REPORT");
      push("App: " + r.app.id);
      push("Engine: " + r.app.engineVersion);
      push("Generated: " + r.generatedAt);
      push("Scene: " + (r.app.scene || "none") + " [" + r.app.sceneStack.join(" > ") + "]");
      push("");

      push("ATTENTION");
      for (const issue of r.health) {
        push("- [" + issue.level.toUpperCase() + "] " + issue.text);
      }
      push("");

      push("PERFORMANCE");
      push(
        "FPS current/avg/min: " +
        this.round(r.performance.fps.current, 1) + " / " +
        this.round(r.performance.fps.average, 1) + " / " +
        this.round(r.performance.fps.minimum, 1)
      );
      push(
        "Frame avg/p95/max: " +
        this.round(r.performance.frame.averageMs, 1) + " / " +
        this.round(r.performance.frame.p95Ms, 1) + " / " +
        this.round(r.performance.frame.maxMs, 1) + " ms"
      );
      push(
        "Update avg: " + this.round(r.performance.update.averageMs, 2) +
        " ms | Draw avg: " + this.round(r.performance.draw.averageMs, 2) + " ms"
      );
      push(
        "Frames rendered/skipped/slow: " +
        r.performance.frames.rendered + " / " +
        r.performance.frames.skipped + " / " +
        r.performance.frames.slow
      );
      push(
        "Session active/paused: " +
        this.formatDuration(r.performance.session.activeMs) + " / " +
        this.formatDuration(r.performance.session.pausedMs)
      );
      push("");

      push("LIFECYCLE");
      push(
        r.lifecycle.paused
          ? "Paused: " + (r.lifecycle.reasons.join(", ") || "unknown")
          : "Active"
      );
      push("");

      push("AUDIO");
      push(
        "Enabled: " + r.audio.enabled +
        " | Unlocked: " + r.audio.unlocked +
        " | Context: " + r.audio.contextState
      );
      push(
        "Current music: " + (r.audio.currentMusic || "none") +
        " | Buffers: " + r.audio.buffersLoaded + "/" + r.audio.buffersConfigured
      );
      push("");

      push("STORAGE");
      if (r.storage.length === 0) {
        push("No defined Storage v2 keys.");
      } else {
        for (const item of r.storage) {
          push(
            "- " + item.name +
            " v" + (item.storedVersion ?? "-") +
            " | persistent=" + item.persistent +
            " | memory=" + item.memory +
            " | memoryPreferred=" + item.memoryPreferred +
            (item.lastError ? " | ERROR=" + item.lastError : "")
          );
        }
      }
      push("");

      push("ASSETS");
      push(
        "ready/loading/error/idle: " +
        r.assets.summary.ready + "/" +
        r.assets.summary.loading + "/" +
        r.assets.summary.error + "/" +
        r.assets.summary.idle
      );
      for (const item of r.assets.items.filter((entry) => entry.status === "error")) {
        push("- ERROR " + item.name + ": " + (item.error || "unknown"));
      }
      push("");

      push("INPUT");
      push(
        "Pointer active: " + r.input.pointerActive +
        " | Keys down: " + (r.input.keysDown.join(", ") || "none") +
        " | Actions: " + (r.input.actionsDown.join(", ") || "none")
      );
      push("");

      push("DIAGNOSTICS");
      const ds = r.diagnostics.summary;
      push(
        "Events info/warn/error: " +
        ds.info + "/" + ds.warn + "/" + ds.error
      );
      for (const event of r.diagnostics.recent) {
        push(
          "- +" + Math.round(event.elapsedMs) + "ms [" +
          event.level.toUpperCase() + "] " +
          event.code + ": " + event.message
        );
      }

      if (r.tuning.length > 0) {
        push("");
        push("TUNING");
        for (const item of r.tuning) {
          push("- " + item.name + " = " + item.value);
        }
      }

      return lines.join("\n");
    },

    async copyReport() {
      const text = this.reportText();

      try {
        if (root.navigator?.clipboard?.writeText) {
          await root.navigator.clipboard.writeText(text);
          diagnostics.info("report-copied", "Session report copied to clipboard.");
          return { ok: true, method: "clipboard", text };
        }
      } catch (error) {
        diagnostics.warn(
          "clipboard-failed",
          "Clipboard API failed; using fallback when available.",
          { message: String(error?.message || error) }
        );
      }

      if (typeof document !== "undefined" && document.body) {
        try {
          const area = document.createElement("textarea");
          area.value = text;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.left = "-9999px";
          document.body.appendChild(area);
          area.select();
          const copied = document.execCommand?.("copy") === true;
          area.remove();
          if (copied) {
            diagnostics.info("report-copied", "Session report copied with fallback.");
            return { ok: true, method: "execCommand", text };
          }
        } catch (_error) {
          // Return text below.
        }
      }

      return { ok: false, method: "text", text };
    },

    number(name, initialValue, options) {
      const id = String(name || "");
      if (!id) throw new TypeError("SSE.dev.number requires a non-empty name.");

      const opts = options || {};
      const existing = this.tunings.get(id);
      if (existing) return existing.value;

      const entry = {
        value: Number(initialValue) || 0,
        min: Number.isFinite(Number(opts.min)) ? Number(opts.min) : 0,
        max: Number.isFinite(Number(opts.max)) ? Number(opts.max) : 1,
        step: Number.isFinite(Number(opts.step)) && Number(opts.step) > 0
          ? Number(opts.step)
          : 0.01,
        onChange: typeof opts.onChange === "function" ? opts.onChange : null,
      };

      this.tunings.set(id, entry);
      this.renderPanel();
      return entry.value;
    },

    get(name, fallback) {
      const entry = this.tunings.get(String(name || ""));
      return entry ? entry.value : fallback;
    },

    set(name, value) {
      const id = String(name || "");
      const entry = this.tunings.get(id);
      if (!entry) return false;

      const number = clamp(Number(value) || 0, entry.min, entry.max);
      entry.value = number;

      if (entry.onChange) {
        try {
          entry.onChange(number, id);
        } catch (error) {
          debug.capture(error, "devtools-tuning");
        }
      }

      diagnostics.info("tuning-change", id + " = " + number);
      this.renderPanel();
      return true;
    },

    panelSummaryText() {
      const r = this.report();
      const issue = r.health.find((item) => item.level !== "ok");
      return [
        "FPS " + this.round(r.performance.fps.current, 1) +
          "  AVG " + this.round(r.performance.fps.average, 1),
        "P95 " + this.round(r.performance.frame.p95Ms, 1) +
          "ms  SLOW " + r.performance.frames.slow,
        "UPDATE " + this.round(r.performance.update.averageMs, 2) +
          "ms  DRAW " + this.round(r.performance.draw.averageMs, 2) + "ms",
        "ASSETS " + r.assets.summary.ready + "/" + r.assets.summary.total +
          "  ERR " + r.assets.summary.error,
        "AUDIO " + r.audio.contextState +
          "  STORAGE " + (
            r.storage.some((item) => item.memoryPreferred)
              ? "MEMORY"
              : "OK"
          ),
        issue
          ? "[" + issue.level.toUpperCase() + "] " + issue.text
          : "[OK] No Engine-level problems detected.",
      ].join("\n");
    },

    renderPanel() {
      if (!this.panelElement || !this.bodyElement) return;

      const summary = this.bodyElement.querySelector("[data-sse-dev-summary]");
      if (summary) summary.textContent = this.panelSummaryText();

      const controls = this.bodyElement.querySelector("[data-sse-dev-controls]");
      if (controls) {
        controls.textContent = "";

        for (const [name, entry] of this.tunings.entries()) {
          const row = document.createElement("label");
          row.style.display = "grid";
          row.style.gridTemplateColumns = "1fr 78px 52px";
          row.style.gap = "6px";
          row.style.alignItems = "center";
          row.style.marginTop = "6px";

          const label = document.createElement("span");
          label.textContent = name;

          const slider = document.createElement("input");
          slider.type = "range";
          slider.min = String(entry.min);
          slider.max = String(entry.max);
          slider.step = String(entry.step);
          slider.value = String(entry.value);

          const value = document.createElement("span");
          value.textContent = String(this.round(entry.value, 3));
          value.style.textAlign = "right";

          slider.addEventListener("input", () => {
            this.set(name, Number(slider.value));
            value.textContent = String(this.round(this.get(name), 3));
          });

          row.appendChild(label);
          row.appendChild(slider);
          row.appendChild(value);
          controls.appendChild(row);
        }
      }
    },

    mountPanel() {
      if (
        !this.enabled() ||
        this.config().panel === false ||
        typeof document === "undefined" ||
        !document.body ||
        this.panelElement
      ) {
        return false;
      }

      const panel = document.createElement("section");
      panel.id = "sse-devtools-panel";
      panel.style.position = "fixed";
      panel.style.top = "max(8px, env(safe-area-inset-top))";
      panel.style.right = "8px";
      panel.style.zIndex = "999998";
      panel.style.width = "min(330px, calc(100vw - 16px))";
      panel.style.maxHeight = "70vh";
      panel.style.overflow = "auto";
      panel.style.background = "rgba(8, 10, 14, 0.94)";
      panel.style.color = "#e9edf5";
      panel.style.border = "1px solid rgba(255,255,255,.18)";
      panel.style.borderRadius = "10px";
      panel.style.boxShadow = "0 8px 28px rgba(0,0,0,.35)";
      panel.style.font = "11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace";
      panel.style.textAlign = "left";
      panel.style.touchAction = "auto";
      panel.style.userSelect = "text";
      panel.style.webkitUserSelect = "text";

      const head = document.createElement("div");
      head.style.display = "flex";
      head.style.alignItems = "center";
      head.style.justifyContent = "space-between";
      head.style.padding = "8px 10px";
      head.style.borderBottom = "1px solid rgba(255,255,255,.12)";

      const title = document.createElement("strong");
      title.textContent = "SSE DEV";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.textContent = "−";
      toggle.style.font = "inherit";
      toggle.style.color = "inherit";
      toggle.style.background = "transparent";
      toggle.style.border = "0";
      toggle.style.padding = "2px 6px";

      head.appendChild(title);
      head.appendChild(toggle);

      const body = document.createElement("div");
      body.style.padding = "9px 10px 10px";

      const summary = document.createElement("pre");
      summary.dataset.sseDevSummary = "1";
      summary.style.margin = "0";
      summary.style.whiteSpace = "pre-wrap";
      summary.style.font = "inherit";

      const controls = document.createElement("div");
      controls.dataset.sseDevControls = "1";

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";
      actions.style.marginTop = "9px";

      const copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "COPY SESSION REPORT";
      copy.style.flex = "1";
      copy.style.font = "inherit";
      copy.style.padding = "6px 8px";

      const clear = document.createElement("button");
      clear.type = "button";
      clear.textContent = "CLEAR";
      clear.style.font = "inherit";
      clear.style.padding = "6px 8px";

      copy.addEventListener("click", async () => {
        const result = await this.copyReport();
        copy.textContent = result.ok ? "COPIED" : "REPORT READY";
        root.setTimeout?.(() => {
          copy.textContent = "COPY SESSION REPORT";
        }, 900);
      });

      clear.addEventListener("click", () => {
        diagnostics.clear();
        performanceMonitor.reset();
        this.renderPanel();
      });

      toggle.addEventListener("click", () => {
        const hidden = body.style.display === "none";
        body.style.display = hidden ? "block" : "none";
        toggle.textContent = hidden ? "−" : "+";
      });

      actions.appendChild(copy);
      actions.appendChild(clear);
      body.appendChild(summary);
      body.appendChild(controls);
      body.appendChild(actions);
      panel.appendChild(head);
      panel.appendChild(body);
      document.body.appendChild(panel);

      this.panelElement = panel;
      this.bodyElement = body;
      this.renderPanel();

      const refreshMs = Math.max(200, Number(this.config().refreshMs) || 500);
      if (typeof root.setInterval === "function") {
        this.timer = root.setInterval(() => this.renderPanel(), refreshMs);
      }

      return true;
    },

    install() {
      if (this.installed) return this.enabled();
      this.installed = true;
      diagnostics.configure(this.config());

      if (!this.enabled()) return false;

      diagnostics.info("devtools-enabled", "SSE DevTools enabled.");
      this.mountPanel();
      return true;
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
      diagnostics.error(
        "runtime-error",
        String(where || "unknown") + ": " + String(error?.message || error),
        { stack: raw }
      );
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
  // Performance monitor
  // ------------------------------------------------------------

  const performanceMonitor = {
    configured: false,
    options: {},
    samples: [],
    startedAtMs: 0,
    pauseStartedAtMs: 0,
    pausedMs: 0,
    pauseCount: 0,
    rafCalls: 0,
    renderedFrames: 0,
    updatedFrames: 0,
    skippedFrames: 0,
    pausedDraws: 0,
    slowFrames: 0,
    lastFrameMs: 0,
    lastUpdateMs: 0,
    lastDrawMs: 0,
    lastWorkMs: 0,

    configure(options) {
      const source = options || {};
      this.options = {
        enabled: source.enabled !== false,
        targetFps: source.targetFps,
        sampleWindow: Math.max(10, Math.floor(Number(source.sampleWindow) || 120)),
        slowFrameMs: source.slowFrameMs,
        slowFrameFactor: Math.max(1, Number(source.slowFrameFactor) || 1.75),
        maxDeltaSeconds: source.maxDeltaSeconds,
      };
      this.configured = true;
      this.reset();
      return this;
    },

    enabled() {
      return this.options.enabled !== false;
    },

    targetFps() {
      const configured = Number(this.options.targetFps);
      if (Number.isFinite(configured) && configured > 0) return configured;

      const legacy = Number(state.config.frameRate);
      return Number.isFinite(legacy) && legacy > 0 ? legacy : 0;
    },

    targetFrameMs() {
      const fps = this.targetFps();
      return fps > 0 ? 1000 / fps : 1000 / 60;
    },

    slowFrameThresholdMs() {
      const explicit = Number(this.options.slowFrameMs);
      if (Number.isFinite(explicit) && explicit > 0) return explicit;
      return this.targetFrameMs() * this.options.slowFrameFactor;
    },

    maxDeltaSeconds() {
      const explicit = Number(this.options.maxDeltaSeconds);
      if (Number.isFinite(explicit) && explicit > 0) return explicit;

      const fps = this.targetFps();
      if (fps > 0) return Math.max(0.05, (1 / fps) * 1.5);
      return 0.05;
    },

    reset() {
      this.samples = [];
      this.startedAtMs = nowMs();
      this.pauseStartedAtMs = 0;
      this.pausedMs = 0;
      this.pauseCount = 0;
      this.rafCalls = 0;
      this.renderedFrames = 0;
      this.updatedFrames = 0;
      this.skippedFrames = 0;
      this.pausedDraws = 0;
      this.slowFrames = 0;
      this.lastFrameMs = 0;
      this.lastUpdateMs = 0;
      this.lastDrawMs = 0;
      this.lastWorkMs = 0;
      return this.snapshot();
    },

    noteRaf() {
      if (!this.enabled()) return;
      this.rafCalls += 1;
    },

    noteSkipped() {
      if (!this.enabled()) return;
      this.skippedFrames += 1;
    },

    onPause() {
      if (!this.enabled() || this.pauseStartedAtMs > 0) return;
      this.pauseStartedAtMs = nowMs();
      this.pauseCount += 1;
    },

    onResume() {
      if (!this.enabled() || this.pauseStartedAtMs <= 0) return;
      this.pausedMs += Math.max(0, nowMs() - this.pauseStartedAtMs);
      this.pauseStartedAtMs = 0;
    },

    pushSample(sample) {
      this.samples.push(sample);
      const limit = this.options.sampleWindow;
      if (this.samples.length > limit) {
        this.samples.splice(0, this.samples.length - limit);
      }
    },

    recordFrame(sample) {
      if (!this.enabled()) return;

      this.renderedFrames += 1;

      if (sample.paused) {
        this.pausedDraws += 1;
        return;
      }

      this.updatedFrames += sample.updated ? 1 : 0;
      this.lastFrameMs = Math.max(0, Number(sample.frameMs) || 0);
      this.lastUpdateMs = Math.max(0, Number(sample.updateMs) || 0);
      this.lastDrawMs = Math.max(0, Number(sample.drawMs) || 0);
      this.lastWorkMs = Math.max(0, Number(sample.workMs) || 0);

      const measurableFrame = this.lastFrameMs > 0;
      const slow =
        measurableFrame &&
        this.lastFrameMs > this.slowFrameThresholdMs();

      if (slow) this.slowFrames += 1;

      this.pushSample({
        atMs: nowMs(),
        frameMs: this.lastFrameMs,
        updateMs: this.lastUpdateMs,
        drawMs: this.lastDrawMs,
        workMs: this.lastWorkMs,
        slow,
      });
    },

    average(values) {
      if (!values.length) return 0;
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    },

    percentile(values, p) {
      if (!values.length) return 0;
      const sorted = values.slice().sort((a, b) => a - b);
      const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil((sorted.length - 1) * p))
      );
      return sorted[index];
    },

    snapshot() {
      const now = nowMs();
      const currentPause = this.pauseStartedAtMs > 0
        ? Math.max(0, now - this.pauseStartedAtMs)
        : 0;
      const totalPausedMs = this.pausedMs + currentPause;
      const elapsedMs = Math.max(0, now - this.startedAtMs);
      const activeMs = Math.max(0, elapsedMs - totalPausedMs);

      const frameValues = this.samples
        .map((sample) => sample.frameMs)
        .filter((value) => value > 0);
      const updateValues = this.samples.map((sample) => sample.updateMs);
      const drawValues = this.samples.map((sample) => sample.drawMs);
      const workValues = this.samples.map((sample) => sample.workMs);

      const averageFrameMs = this.average(frameValues);
      const averageFps = averageFrameMs > 0 ? 1000 / averageFrameMs : 0;
      const currentFps = this.lastFrameMs > 0 ? 1000 / this.lastFrameMs : 0;
      const minFps = frameValues.length > 0
        ? 1000 / Math.max(...frameValues)
        : 0;

      return {
        enabled: this.enabled(),
        targetFps: this.targetFps(),
        targetFrameMs: this.targetFrameMs(),
        slowFrameMs: this.slowFrameThresholdMs(),
        sampleWindow: this.options.sampleWindow,
        sampleCount: this.samples.length,

        fps: {
          current: currentFps,
          average: averageFps,
          minimum: minFps,
        },

        frame: {
          currentMs: this.lastFrameMs,
          averageMs: averageFrameMs,
          p95Ms: this.percentile(frameValues, 0.95),
          maxMs: frameValues.length > 0 ? Math.max(...frameValues) : 0,
        },

        update: {
          currentMs: this.lastUpdateMs,
          averageMs: this.average(updateValues),
          maxMs: updateValues.length > 0 ? Math.max(...updateValues) : 0,
        },

        draw: {
          currentMs: this.lastDrawMs,
          averageMs: this.average(drawValues),
          maxMs: drawValues.length > 0 ? Math.max(...drawValues) : 0,
        },

        work: {
          currentMs: this.lastWorkMs,
          averageMs: this.average(workValues),
          maxMs: workValues.length > 0 ? Math.max(...workValues) : 0,
        },

        frames: {
          rafCalls: this.rafCalls,
          rendered: this.renderedFrames,
          updated: this.updatedFrames,
          skipped: this.skippedFrames,
          pausedDraws: this.pausedDraws,
          slow: this.slowFrames,
        },

        session: {
          startedAtMs: this.startedAtMs,
          elapsedMs,
          activeMs,
          pausedMs: totalPausedMs,
          pauseCount: this.pauseCount,
          paused: lifecycle.paused,
        },
      };
    },

    report() {
      return this.snapshot();
    },
  };

  // ------------------------------------------------------------
  // Input normalization + keyboard
  // ------------------------------------------------------------

  const input = {
    keyboardInstalled: false,
    keysDown: new Set(),
    keysPressed: new Set(),
    keysReleased: new Set(),
    bindings: new Map(),

    configureKeyboard(options) {
      const source = options || {};
      this.bindings.clear();

      for (const [action, keys] of Object.entries(source.bindings || {})) {
        this.bind(action, keys);
      }
    },

    resetPointer() {
      state.activePointerId = null;
      state.activePointerRaw = null;
    },

    resetKeyboard() {
      this.keysDown.clear();
      this.keysPressed.clear();
      this.keysReleased.clear();
    },

    reset() {
      this.resetPointer();
      this.resetKeyboard();
    },

    remember(rawTouch) {
      if (!rawTouch) return;
      const x = Number(rawTouch.x) || 0;
      const y = Number(rawTouch.y) || 0;
      state.activePointerRaw = {
        id: rawTouch.id ?? "mouse",
        state: rawTouch.state,
        x,
        y,
        prevX: Number(rawTouch.prevX ?? x),
        prevY: Number(rawTouch.prevY ?? y),
      };
    },

    cancelActive() {
      if (state.activePointerId === null || !state.activePointerRaw) {
        this.resetPointer();
        return null;
      }

      const last = state.activePointerRaw;
      const cancelled = {
        id: state.activePointerId,
        state: root.CANCELLED,
        x: last.x,
        y: last.y,
        prevX: last.x,
        prevY: last.y,
      };
      this.resetPointer();
      return cancelled;
    },

    cancelActiveAndDispatch() {
      const rawTouch = this.cancelActive();
      if (!rawTouch) return false;

      try {
        app.touch(this.normalize(rawTouch));
        return true;
      } catch (error) {
        debug.capture(error, "touch-cancel");
        return false;
      }
    },

    normalize(rawTouch) {
      return viewport.toLogical(rawTouch);
    },

    accept(rawTouch) {
      if (!rawTouch || lifecycle.paused) return false;
      if (state.config.pointerMode !== "primary") return true;
      const id = rawTouch.id ?? "mouse";

      if (rawTouch.state === root.BEGAN) {
        if (!viewport.containsScreen(rawTouch.x, rawTouch.y)) return false;
        if (state.activePointerId !== null && state.activePointerId !== id) return false;
        state.activePointerId = id;
        this.remember(rawTouch);
        return true;
      }

      if (state.activePointerId !== null && state.activePointerId !== id) return false;
      if (state.activePointerId === null) return false;
      this.remember(rawTouch);
      return true;
    },

    finish(rawTouch) {
      if (!rawTouch) return;
      if (rawTouch.state === root.ENDED || rawTouch.state === root.CANCELLED) {
        this.resetPointer();
      }
    },

    normalizeKey(value) {
      return String(value || "").trim();
    },

    eventKeys(event) {
      const keys = [];
      const code = this.normalizeKey(event?.code);
      const key = this.normalizeKey(event?.key);
      if (code) keys.push(code);
      if (key && key !== code) keys.push(key);
      return keys;
    },

    bind(action, keys) {
      const id = String(action || "");
      if (!id) throw new TypeError("SSE.input.bind requires a non-empty action.");

      const list = Array.isArray(keys) ? keys : [keys];
      const normalized = new Set(
        list.map((key) => this.normalizeKey(key)).filter(Boolean)
      );
      this.bindings.set(id, normalized);
      return id;
    },

    unbind(action) {
      return this.bindings.delete(String(action || ""));
    },

    isBoundKey(key) {
      const id = this.normalizeKey(key);
      if (!id) return false;

      for (const keys of this.bindings.values()) {
        if (keys.has(id)) return true;
      }
      return false;
    },

    isDown(key) {
      return this.keysDown.has(this.normalizeKey(key));
    },

    wasPressed(key) {
      return this.keysPressed.has(this.normalizeKey(key));
    },

    wasReleased(key) {
      return this.keysReleased.has(this.normalizeKey(key));
    },

    action(name) {
      const keys = this.bindings.get(String(name || ""));
      if (!keys) return false;
      for (const key of keys) {
        if (this.keysDown.has(key)) return true;
      }
      return false;
    },

    actionPressed(name) {
      const keys = this.bindings.get(String(name || ""));
      if (!keys) return false;
      for (const key of keys) {
        if (this.keysPressed.has(key)) return true;
      }
      return false;
    },

    actionReleased(name) {
      const keys = this.bindings.get(String(name || ""));
      if (!keys) return false;
      for (const key of keys) {
        if (this.keysReleased.has(key)) return true;
      }
      return false;
    },

    shouldPreventKey(event) {
      if (state.config.keyboard?.preventDefault === false) return false;
      return this.eventKeys(event).some((key) => this.isBoundKey(key));
    },

    handleKeyDown(event) {
      if (state.config.keyboard?.enabled === false || lifecycle.paused) return;

      const keys = this.eventKeys(event);
      if (keys.length === 0) return;

      if (this.shouldPreventKey(event) && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      for (const key of keys) {
        if (!this.keysDown.has(key)) this.keysPressed.add(key);
        this.keysDown.add(key);
      }
    },

    handleKeyUp(event) {
      if (state.config.keyboard?.enabled === false) return;

      const keys = this.eventKeys(event);
      if (keys.length === 0) return;

      if (this.shouldPreventKey(event) && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      for (const key of keys) {
        if (this.keysDown.has(key)) this.keysReleased.add(key);
        this.keysDown.delete(key);
      }
    },

    installKeyboard() {
      if (
        this.keyboardInstalled ||
        state.config.keyboard?.enabled === false ||
        typeof root.addEventListener !== "function"
      ) {
        return;
      }

      this.keyboardInstalled = true;
      root.addEventListener("keydown", (event) => this.handleKeyDown(event));
      root.addEventListener("keyup", (event) => this.handleKeyUp(event));
    },

    endFrame() {
      this.keysPressed.clear();
      this.keysReleased.clear();
    },
  };

  // ------------------------------------------------------------
  // Browser lifecycle
  // ------------------------------------------------------------

  const lifecycle = {
    installed: false,
    paused: false,
    reasons: new Set(),
    lastReason: null,
    pauseListeners: new Set(),
    resumeListeners: new Set(),
    changeListeners: new Set(),

    config() {
      return state.config.lifecycle || {};
    },

    snapshot() {
      return {
        paused: this.paused,
        hidden: typeof document !== "undefined" ? !!document.hidden : false,
        reasons: Array.from(this.reasons),
        reason: this.lastReason,
      };
    },

    emit(listeners, payload) {
      for (const listener of Array.from(listeners)) {
        try {
          listener(payload);
        } catch (error) {
          debug.capture(error, "lifecycle-listener");
        }
      }
    },

    notifyChange() {
      this.emit(this.changeListeners, this.snapshot());
    },

    onPause(listener) {
      if (typeof listener !== "function") return () => {};
      this.pauseListeners.add(listener);
      return () => this.pauseListeners.delete(listener);
    },

    onResume(listener) {
      if (typeof listener !== "function") return () => {};
      this.resumeListeners.add(listener);
      return () => this.resumeListeners.delete(listener);
    },

    onChange(listener) {
      if (typeof listener !== "function") return () => {};
      this.changeListeners.add(listener);
      return () => this.changeListeners.delete(listener);
    },

    pause(reason) {
      const id = String(reason || "manual");
      const wasPaused = this.paused;
      this.reasons.add(id);
      this.lastReason = id;
      this.paused = this.reasons.size > 0;

      input.cancelActiveAndDispatch();
      input.resetKeyboard();

      if (!wasPaused && this.paused) {
        state.lastDrawTimeMs = 0;
        performanceMonitor.onPause();

        if (this.config().autoAudio !== false) {
          audio.pauseForLifecycle();
        }

        const payload = this.snapshot();
        diagnostics.info(
          "lifecycle-pause",
          "Work paused: " + (payload.reasons.join(", ") || id),
          payload
        );
        if (typeof this.config().onPause === "function") {
          try { this.config().onPause(payload, SSE); }
          catch (error) { debug.capture(error, "lifecycle-onPause"); }
        }
        this.emit(this.pauseListeners, payload);
      }

      this.notifyChange();
      return this.paused;
    },

    resume(reason) {
      const id = String(reason || "manual");
      const wasPaused = this.paused;
      this.reasons.delete(id);
      this.lastReason = id;
      this.paused = this.reasons.size > 0;

      input.resetPointer();
      input.resetKeyboard();
      state.lastDrawTimeMs = 0;

      if (wasPaused && !this.paused) {
        performanceMonitor.onResume();

        if (this.config().autoAudio !== false) {
          audio.resumeFromLifecycle();
        }

        const payload = this.snapshot();
        diagnostics.info(
          "lifecycle-resume",
          "Work resumed after: " + id,
          payload
        );
        if (typeof this.config().onResume === "function") {
          try { this.config().onResume(payload, SSE); }
          catch (error) { debug.capture(error, "lifecycle-onResume"); }
        }
        this.emit(this.resumeListeners, payload);
      }

      this.notifyChange();
      return !this.paused;
    },

    clear() {
      const wasPaused = this.paused;
      this.reasons.clear();
      this.lastReason = "clear";
      this.paused = false;
      input.reset();
      state.lastDrawTimeMs = 0;

      if (wasPaused) {
        performanceMonitor.onResume();
        if (this.config().autoAudio !== false) {
          audio.resumeFromLifecycle();
        }
      }

      this.notifyChange();
      return true;
    },

    handleVisibility() {
      if (typeof document === "undefined") return;
      if (document.hidden) this.pause("hidden");
      else this.resume("hidden");
    },

    install() {
      if (this.installed || typeof root.addEventListener !== "function") return;
      this.installed = true;

      root.addEventListener("pagehide", () => this.pause("pagehide"));
      root.addEventListener("pageshow", () => {
        this.resume("pagehide");
        // Safari/bfcache event ordering varies. If the page is already visible,
        // clear a stale hidden reason even when visibilitychange has not fired yet.
        if (typeof document !== "undefined" && !document.hidden) {
          this.resume("hidden");
        }
      });

      root.addEventListener("blur", () => {
        input.cancelActiveAndDispatch();
        input.resetKeyboard();
        if (this.config().pauseOnBlur === true) this.pause("blur");
      });

      root.addEventListener("focus", () => {
        input.resetKeyboard();
        if (this.config().pauseOnBlur === true) this.resume("blur");
      });

      if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("visibilitychange", () => this.handleVisibility());
        if (document.hidden) this.pause("hidden");
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

    assets.configure(state.config.assets || {});
    performanceMonitor.configure(state.config.performance || {});
    input.configureKeyboard(state.config.keyboard || {});
    input.installKeyboard();
    lifecycle.install();

    if (state.config.analytics) analytics.configure(state.config.analytics);
    if (state.config.fonts) fonts.install(state.config.fonts);
    else fonts.reveal();

    if (typeof state.config.setup === "function") {
      state.config.setup(SSE);
    }

    devtools.install();

    if (state.config.initialScene) {
      app.start(state.config.initialScene, state.config.initialPayload);
    }

  }

  function drawEngine() {
    const currentTimeMs = nowMs();
    performanceMonitor.noteRaf();

    const frameRate = performanceMonitor.targetFps();

    if (frameRate > 0 && state.lastDrawTimeMs > 0) {
      const minimumFrameMs = 1000 / frameRate;
      if (currentTimeMs - state.lastDrawTimeMs < minimumFrameMs - 0.5) {
        performanceMonitor.noteSkipped();
        return;
      }
    }

    const hasPreviousFrame = state.lastDrawTimeMs > 0;
    const rawDeltaSeconds = hasPreviousFrame
      ? Math.max(0, (currentTimeMs - state.lastDrawTimeMs) / 1000)
      : (Number(root.DeltaTime) || 1 / 60);
    const frameDelta = Math.min(
      performanceMonitor.maxDeltaSeconds(),
      rawDeltaSeconds
    );
    const frameMs = hasPreviousFrame
      ? Math.max(0, currentTimeMs - state.lastDrawTimeMs)
      : 0;

    state.lastDrawTimeMs = currentTimeMs;

    const workStartedAtMs = nowMs();
    let updateMs = 0;
    let drawMs = 0;
    let updated = false;
    let viewportOpen = false;

    try {
      viewport.update(false);
      const outer = theme.color(state.config.outerBackground || "nightDeep");
      root.background(outer);

      if (!lifecycle.paused) {
        const updateStartedAtMs = nowMs();
        app.update(frameDelta);
        updateMs = Math.max(0, nowMs() - updateStartedAtMs);
        updated = true;
      }

      viewport.begin();
      viewportOpen = true;

      const drawStartedAtMs = nowMs();
      if (sceneStack.length === 0) {
        root.noStroke();
        root.fill(theme.color(state.config.sceneBackground || "night"));
        root.rect(0, 0, viewport.logicalWidth, viewport.logicalHeight);
      } else {
        app.draw();
      }
      drawMs = Math.max(0, nowMs() - drawStartedAtMs);

      viewport.end();
      viewportOpen = false;

      if (!state.firstFrameDrawn) {
        state.firstFrameDrawn = true;
        if (state.config.bridge?.workId && fonts.revealed) bridge.ready();
      } else if (state.config.bridge?.workId && fonts.revealed && !bridge.readySent) {
        bridge.ready();
      }

      performanceMonitor.recordFrame({
        frameMs,
        updateMs,
        drawMs,
        workMs: Math.max(0, nowMs() - workStartedAtMs),
        paused: lifecycle.paused,
        updated,
      });

      input.endFrame();
    } catch (error) {
      performanceMonitor.recordFrame({
        frameMs,
        updateMs,
        drawMs,
        workMs: Math.max(0, nowMs() - workStartedAtMs),
        paused: lifecycle.paused,
        updated,
      });

      input.endFrame();

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
    assets,
    ui,
    fonts,
    analytics,
    share,
    bridge,
    debug,
    diagnostics,
    dev: devtools,
    input,
    lifecycle,
    performance: performanceMonitor,
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
