// ROJIURA MASALA — Plausible Events API adapter
(function (root) {
  "use strict";
  const config = root.ROJIURA_ANALYTICS_CONFIG || {};

  function isPrivateHost(hostname) {
    const host = String(hostname || "").toLowerCase();
    if (!host) return true;
    if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local")) return true;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
    const m = host.match(/^172\.(\d+)\./);
    if (m) { const n = Number(m[1]); if (n >= 16 && n <= 31) return true; }
    return false;
  }

  function canSend() {
    if (config.enabled === false || !config.domain || !config.endpoint) return false;
    // Match the town tracker: staging never sends analytics, including direct work visits.
    if (/\/yumaniwa-town-staging(?:\/|$)/.test((root.location && root.location.pathname) || "")) return false;
    try {
      const params = new URLSearchParams(root.location ? root.location.search : "");
      const persistentDebug = root.localStorage && root.localStorage.getItem("rojiura-debug-enabled-v1") === "1";
      const sessionDebug = root.sessionStorage && root.sessionStorage.getItem("rojiura-debug-session") === "1";
      if (params.get("debug") === "1" || (root.location && root.location.hash === "#debug") || persistentDebug || sessionDebug) return false;
    } catch (_error) {}
    if (!config.captureOnLocalhost && isPrivateHost(root.location && root.location.hostname)) return false;
    return typeof root.fetch === "function";
  }

  function cleanProps(props) {
    const out = {};
    let count = 0;
    for (const [key, value] of Object.entries(props || {})) {
      if (count >= 24 || value === null || value === undefined) continue;
      let v = value;
      if (typeof v === "number") { if (!Number.isFinite(v)) continue; v = String(v); }
      else if (typeof v === "boolean") v = v ? "true" : "false";
      else if (typeof v !== "string") continue;
      out[String(key).slice(0, 60)] = String(v).slice(0, 120);
      count += 1;
    }
    const runtimeBuild = root.ROJIURA_BUILD || config.build;
    if (runtimeBuild) out.build = String(runtimeBuild);
    return out;
  }

  function send(name, props, options) {
    if (!canSend()) return false;
    const payload = {
      domain: config.domain,
      name: String(name),
      url: (options && options.url) || (root.location ? root.location.href : ""),
    };
    const cleaned = cleanProps(props);
    if (Object.keys(cleaned).length) payload.props = cleaned;
    try {
      root.fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: "omit",
      }).catch(() => {});
      return true;
    } catch (_error) { return false; }
  }

  function provider(name, props) { return send(name, props || {}); }
  function pageview() { return send("pageview", {}); }

  root.RojiuraAnalytics = Object.freeze({ config, provider, track: provider, pageview, canSend });

  if (config.standalonePageview !== false) {
    pageview();
  }
})(window);
