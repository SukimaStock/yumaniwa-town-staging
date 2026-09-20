(() => {
  "use strict";

  const state = { locale: null, data: null };

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const item of Object.values(value)) deepFreeze(item);
    return Object.freeze(value);
  }

  function lookup(path) {
    if (!state.data) throw new Error("OrbitText is not loaded");
    const parts = String(path || "").split(".").filter(Boolean);
    let value = state.data;
    for (const part of parts) {
      if (value == null || !Object.prototype.hasOwnProperty.call(value, part)) {
        throw new Error("Missing ORBIT text key: " + path);
      }
      value = value[part];
    }
    return value;
  }

  function format(value, vars = {}) {
    if (typeof value !== "string") return value;
    return value.replace(/\{([A-Za-z0-9_]+)\}/g, (full, key) =>
      Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : full
    );
  }

  function requestedLocale() {
    const query = new URLSearchParams(window.location.search).get("lang");
    if (query) return query.toLowerCase();
    try {
      const saved = window.localStorage.getItem("sukimastock.orbit.lang");
      if (saved) return saved.toLowerCase();
    } catch (_) {}
    return (document.documentElement.lang || "ja").toLowerCase();
  }

  async function fetchLocale(locale) {
    const url = new URL("text/" + locale + ".json", document.baseURI);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load " + url.pathname + " (" + response.status + ")");
    return response.json();
  }

  async function load(locale = requestedLocale()) {
    const wanted = String(locale || "ja").toLowerCase();
    let actual = wanted;
    let data;
    try {
      data = await fetchLocale(wanted);
    } catch (error) {
      if (wanted === "ja") throw error;
      actual = "ja";
      data = await fetchLocale("ja");
    }
    state.locale = actual;
    state.data = deepFreeze(data);
    document.documentElement.lang = actual;
    if (state.data.meta && state.data.meta.documentTitle) {
      document.title = state.data.meta.documentTitle;
    }
    return state.data;
  }

  window.OrbitText = Object.freeze({
    load,
    get: lookup,
    t(path, vars) {
      const value = lookup(path);
      if (typeof value !== "string") throw new Error("ORBIT text key is not a string: " + path);
      return format(value, vars);
    },
    format,
    isReady() { return !!state.data; },
    get locale() { return state.locale; },
    setLocale(locale) {
      const next = String(locale || "ja").toLowerCase();
      try { window.localStorage.setItem("sukimastock.orbit.lang", next); } catch (_) {}
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.location.href = url.toString();
    }
  });
})();
