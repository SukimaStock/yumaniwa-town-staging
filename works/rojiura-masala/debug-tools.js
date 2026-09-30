// ROJIURA MASALA — local playtest export tools
// Detailed playtest records stay in browser storage and are never sent over
// the network. Debug can be enabled with ?debug=1 / #debug or by tapping the
// title logo seven times. The enabled state is persisted when storage allows.
(function (root) {
  "use strict";

  const DEBUG_KEY = "rojiura-debug-enabled-v1";
  const DEBUG_SESSION_KEY = "rojiura-debug-session";
  const STORAGE_PROBE_KEY = "rojiura-storage-probe-v1";
  const query = new URLSearchParams(root.location ? root.location.search : "");
  const urlEnabled = query.get("debug") === "1" || (root.location && root.location.hash === "#debug");

  function readFlag() {
    try { return root.localStorage && root.localStorage.getItem(DEBUG_KEY) === "1"; } catch (_error) { return false; }
  }

  function writeFlag(enabled) {
    try {
      if (!root.localStorage) return false;
      if (enabled) root.localStorage.setItem(DEBUG_KEY, "1");
      else root.localStorage.removeItem(DEBUG_KEY);
      return true;
    } catch (_error) { return false; }
  }

  function readSessionFlag() {
    try { return root.sessionStorage && root.sessionStorage.getItem(DEBUG_SESSION_KEY) === "1"; } catch (_error) { return false; }
  }

  function writeSessionFlag(enabled) {
    try {
      if (!root.sessionStorage) return false;
      if (enabled) root.sessionStorage.setItem(DEBUG_SESSION_KEY, "1");
      else root.sessionStorage.removeItem(DEBUG_SESSION_KEY);
      return true;
    } catch (_error) { return false; }
  }

  function storageProbe() {
    try {
      if (!root.localStorage) return { available: false, retained: false };
      const previous = root.localStorage.getItem(STORAGE_PROBE_KEY);
      const token = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
      root.localStorage.setItem(STORAGE_PROBE_KEY, token);
      return { available: root.localStorage.getItem(STORAGE_PROBE_KEY) === token, retained: !!previous };
    } catch (_error) {
      return { available: false, retained: false };
    }
  }

  const persistentEnabled = readFlag();
  const sessionEnabled = readSessionFlag();
  if (urlEnabled) {
    writeFlag(true);
    writeSessionFlag(true);
  }

  function titleLogoHit(event) {
    const canvas = document.getElementById("gameCanvas");
    const viewport = root.SSE && root.SSE.viewport;
    if (!canvas || !viewport || typeof viewport.toLogical !== "function") return false;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    if (typeof viewport.update === "function") viewport.update(false);
    const raw = {
      x: event.clientX - rect.left,
      y: rect.height - (event.clientY - rect.top),
    };
    if (typeof viewport.containsScreen === "function" && !viewport.containsScreen(raw.x, raw.y)) return false;
    const logical = viewport.toLogical(raw);
    // The title itself sits around y=535 in the 360×640 logical canvas.
    // Keep the secret hit region on the logo, not the whole title band.
    return logical.x >= 28 && logical.x <= 332 && logical.y >= 500 && logical.y <= 565;
  }

  if (!urlEnabled && !persistentEnabled && !sessionEnabled && typeof document !== "undefined") {
    let taps = [];
    root.addEventListener("pointerup", (event) => {
      if (!titleLogoHit(event)) { taps = []; return; }
      // Capture these logo taps before CodeaLite sees them, otherwise the first
      // tap would leave the title screen and the seven-tap shortcut could never finish.
      event.preventDefault();
      event.stopPropagation();
      const now = Date.now();
      taps = taps.filter((time) => now - time < 4000);
      taps.push(now);
      if (taps.length < 7) return;
      writeFlag(true);
      writeSessionFlag(true);
      root.location.reload();
    }, { passive: false, capture: true });
    return;
  }

  if ((!urlEnabled && !persistentEnabled && !sessionEnabled) || typeof document === "undefined") return;

  const api = root.ROJIURA_PLAYTEST;
  if (!api || typeof api.getRuns !== "function") return;

  const probe = storageProbe();
  const isIOS = /iPad|iPhone|iPod/.test(root.navigator && root.navigator.userAgent || "")
    || ((root.navigator && root.navigator.platform) === "MacIntel" && (root.navigator && root.navigator.maxTouchPoints) > 1);
  let isEmbedded = false;
  try { isEmbedded = root.self !== root.top; } catch (_error) { isEmbedded = true; }
  const storageWarning = isIOS && isEmbedded
    ? "iOS埋込: ブラウザ終了前にCSV保存推奨"
    : "";
  const MILESTONES = [30, 60, 90, 100, 120, 150, 200, 250, 300];
  const columns = [
    "recordedAt", "build", "nightSeed", "deliveries", "sales", "seconds",
    "averageFps", "lowFps10", "frameDropRate", "devicePixelRatio", "renderDpr", "frameRateCap",
    "hotDeliveries", "warmDeliveries", "coolDeliveries", "coldDeliveries", "hotRatio", "averageHeat",
    "masalaRushCount", "masalaSoftStreakMax", "pepperCollected", "pepperSpent", "pepperHeld",
    "bikeHits", "backdoorUses", "reheatCount", "bestCombo",
    "deliveryOrderMistakes", "deliveryOrderPenaltyTotal", "deliveryOrderMistakeRate",
    "nightGauge", "endReason", "ambientFadeSeconds", "finishElapsedSeconds",
    "makanaiBase", "makanaiPrefix", "makanaiTopping", "makanaiEggCount", "makanaiLarge", "makanaiLargeChance",
    "makanaiPepperSpent", "makanaiPepperLeft", "makanaiPepperRoastedLevel", "makanaiPepperFreshStyle",
    "makanaiMetrics", "makanaiWeights", "makanaiUnlockedRecipes", "makanaiRecipeRoll",
    "makanaiSpecialEligible", "makanaiSpecialChance", "makanaiSpecialRoll", "makanaiBiryaniStage",
    "rushRule", "coolingPerSecond", "masalaRushTriggers", "bulkOrderHistory",
    ...MILESTONES.flatMap((n) => [
      `m${n}_nightGauge`, `m${n}_rush`, `m${n}_hotRatio`, `m${n}_masala`, `m${n}_required`,
      `m${n}_bulkCount`, `m${n}_orderMode`, `m${n}_orderMistakes`,
    ]),
  ];

  function valueFor(run, key) {
    const milestone = key.match(/^m(\d+)_(.+)$/);
    if (milestone) {
      const m = run.milestones && run.milestones[milestone[1]];
      if (!m) return "";
      const map = {
        nightGauge: "nightGauge",
        rush: "masalaRushCount",
        hotRatio: "hotRatio",
        masala: "masalaCharge",
        required: "masalaChargeRequired",
        bulkCount: "bulkOrderCount",
        orderMode: "deliveryOrderMode",
        orderMistakes: "deliveryOrderMistakes",
      };
      const v = m[map[milestone[2]]];
      if (milestone[2] === "orderMode") return v ? 1 : 0;
      return v ?? "";
    }
    const v = run[key];
    if (v && typeof v === "object") return JSON.stringify(v);
    if (typeof v === "boolean") return v ? 1 : 0;
    return v ?? "";
  }

  function escapeCsv(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function csvText() {
    const runs = api.getRuns();
    const rows = [columns, ...runs.map((run) => columns.map((key) => valueFor(run, key)))];
    return "\uFEFF" + rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  }

  function fileName() {
    const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const build = root.ROJIURA_BUILD || "build";
    return `rojiura-playtest-${build}-${day}.csv`;
  }

  function downloadCsv() {
    const blob = new Blob([csvText()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function copyCsv() {
    try {
      await navigator.clipboard.writeText(csvText());
      return true;
    } catch (_error) {
      return false;
    }
  }

  const style = document.createElement("style");
  style.textContent = `
    #rojiuraDebugPanel{position:fixed;left:max(8px,env(safe-area-inset-left));bottom:max(8px,env(safe-area-inset-bottom));z-index:2147483647;display:grid;grid-template-columns:repeat(4,max-content);align-items:center;gap:5px;padding:7px;background:rgba(15,10,5,.94);border:1px solid #765640;color:#f2dfb6;font:11px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;touch-action:manipulation;-webkit-user-select:none;user-select:none;max-width:calc(100vw - 16px);box-sizing:border-box}
    #rojiuraDebugPanel button{appearance:none;border:1px solid #765640;background:#32221a;color:#f2dfb6;font:inherit;padding:7px 8px;min-height:32px;touch-action:manipulation}
    #rojiuraDebugPanel button:active{transform:translateY(1px)}
    #rojiuraDebugPanel .meta{grid-column:1/-1;display:flex;gap:9px;align-items:center;min-width:0;white-space:normal}
    #rojiuraDebugPanel .meta b{font-size:12px;color:#efd8ab;flex:none}
    #rojiuraDebugPanel .storage{color:#c7b38e}
    #rojiuraDebugPanel .warning{grid-column:1/-1;color:#e8c27a;white-space:normal}
    @media(max-width:430px){#rojiuraDebugPanel{grid-template-columns:repeat(2,minmax(0,1fr));width:calc(100vw - 16px)}#rojiuraDebugPanel button{width:100%}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.id = "rojiuraDebugPanel";
  panel.innerHTML = `
    <div class="meta"><b>DEBUG</b><span id="rojiuraDebugCount">保存済み 0夜</span><span class="storage" id="rojiuraDebugStorage"></span></div>
    <div class="warning" id="rojiuraDebugWarning" hidden></div>
    <button type="button" data-action="csv">CSV保存</button>
    <button type="button" data-action="copy">コピー</button>
    <button type="button" data-action="clear">履歴消去</button>
    <button type="button" data-action="close">DEBUG OFF</button>
  `;
  document.body.appendChild(panel);

  function refresh() {
    const runs = api.getRuns();
    const countEl = panel.querySelector("#rojiuraDebugCount");
    const storageEl = panel.querySelector("#rojiuraDebugStorage");
    const warningEl = panel.querySelector("#rojiuraDebugWarning");
    if (!runs.length) countEl.textContent = "保存済み 0夜";
    else {
      const last = runs[runs.length - 1] || {};
      countEl.textContent = `保存済み ${runs.length}夜 / 最終 ${last.deliveries ?? "-"}件 / ${last.makanaiBase || "-"}`;
    }
    storageEl.textContent = !probe.available ? "保存: 利用不可" : (probe.retained ? "保存: 再読込OK" : "保存: 初回確認");
    if (storageWarning) {
      warningEl.hidden = false;
      warningEl.textContent = storageWarning;
    } else {
      warningEl.hidden = true;
      warningEl.textContent = "";
    }
  }

  panel.addEventListener("pointerdown", (event) => event.stopPropagation());
  panel.addEventListener("click", async (event) => {
    event.stopPropagation();
    const action = event.target && event.target.dataset ? event.target.dataset.action : null;
    if (!action) return;
    if (action === "csv") {
      downloadCsv();
    } else if (action === "copy") {
      const ok = await copyCsv();
      const button = event.target;
      const prior = button.textContent;
      button.textContent = ok ? "コピー済" : "失敗";
      setTimeout(() => { button.textContent = prior; }, 1200);
    } else if (action === "clear") {
      if (root.confirm("このブラウザのプレイ履歴をすべて消去しますか？")) {
        api.clear();
        refresh();
      }
    } else if (action === "close") {
      writeFlag(false);
      writeSessionFlag(false);
      panel.remove();
    }
  });

  root.ROJIURA_PLAYTEST_EXPORT = Object.freeze({ csvText, downloadCsv, copyCsv, refresh });
  refresh();
  root.setInterval(() => { if (document.body.contains(panel)) refresh(); }, 2500);
})(window);
