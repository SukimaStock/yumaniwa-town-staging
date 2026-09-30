// ROJIURA MASALA — local playtest export tools
// Normal play keeps telemetry in localStorage. This UI is visible only with
// ?debug=1 (or #debug) and never sends playtest records over the network.
(function (root) {
  "use strict";

  const query = new URLSearchParams(root.location ? root.location.search : "");
  const urlEnabled = query.get("debug") === "1" || (root.location && root.location.hash === "#debug");
  let sessionEnabled = false;
  try { sessionEnabled = root.sessionStorage && root.sessionStorage.getItem("rojiura-debug-session") === "1"; } catch (_error) {}

  if (!urlEnabled && !sessionEnabled && typeof document !== "undefined") {
    // Mobile fallback for hosted iframes where the outer page does not forward
    // query strings: tap the top-left corner seven times within four seconds.
    let taps = [];
    root.addEventListener("pointerup", (event) => {
      if (event.clientX > 72 || event.clientY > 72) { taps = []; return; }
      const now = Date.now();
      taps = taps.filter((time) => now - time < 4000);
      taps.push(now);
      if (taps.length < 7) return;
      try { root.sessionStorage.setItem("rojiura-debug-session", "1"); } catch (_error) {}
      root.location.reload();
    }, { passive: true });
    return;
  }

  if ((!urlEnabled && !sessionEnabled) || typeof document === "undefined") return;

  const api = root.ROJIURA_PLAYTEST;
  if (!api || typeof api.getRuns !== "function") return;

  const MILESTONES = [30, 60, 90, 100, 120, 150];
  const columns = [
    "recordedAt", "build", "nightSeed", "deliveries", "sales", "seconds",
    "averageFps", "lowFps10", "frameDropRate", "devicePixelRatio", "renderDpr", "frameRateCap",
    "hotDeliveries", "warmDeliveries", "coolDeliveries", "coldDeliveries", "hotRatio", "averageHeat",
    "masalaRushCount", "masalaSoftStreakMax", "pepperCollected", "pepperSpent", "pepperHeld",
    "bikeHits", "backdoorUses", "reheatCount", "bestCombo",
    "deliveryOrderMistakes", "deliveryOrderPenaltyTotal", "deliveryOrderMistakeRate",
    "nightGauge", "endReason", "shiftDurationSeconds", "closingTimeReached",
    "closingTimeReachedAtDeliveries", "closingFinalBatchSize", "closingFinalBatchRemaining", "finishElapsedSeconds",
    "makanaiBase", "makanaiPrefix", "makanaiTopping",
    "makanaiPepperSpent", "makanaiPepperLeft", "makanaiPepperRoastedLevel", "makanaiPepperFreshStyle",
    "makanaiMetrics", "makanaiScores", "rushRule", "coolingPerSecond", "masalaRushTriggers", "bulkOrderHistory",
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
    #rojiuraDebugPanel{position:fixed;left:max(8px,env(safe-area-inset-left));bottom:max(8px,env(safe-area-inset-bottom));z-index:2147483647;display:flex;align-items:center;gap:5px;padding:6px;background:rgba(15,10,5,.92);border:1px solid #765640;color:#f2dfb6;font:11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;touch-action:manipulation;-webkit-user-select:none;user-select:none}
    #rojiuraDebugPanel button{appearance:none;border:1px solid #765640;background:#32221a;color:#f2dfb6;font:inherit;padding:7px 8px;min-height:30px;touch-action:manipulation}
    #rojiuraDebugPanel button:active{transform:translateY(1px)}
    #rojiuraDebugPanel .meta{min-width:72px;padding:0 3px}
    #rojiuraDebugPanel .meta b{display:block;font-size:12px;color:#efd8ab}
  `;
  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.id = "rojiuraDebugPanel";
  panel.innerHTML = `
    <div class="meta"><b>DEBUG</b><span id="rojiuraDebugCount">0 night</span></div>
    <button type="button" data-action="csv">CSV保存</button>
    <button type="button" data-action="copy">コピー</button>
    <button type="button" data-action="clear">消去</button>
    <button type="button" data-action="close">閉じる</button>
  `;
  document.body.appendChild(panel);

  function refresh() {
    const runs = api.getRuns();
    const el = panel.querySelector("#rojiuraDebugCount");
    if (!runs.length) {
      el.textContent = "0 night";
      return;
    }
    const last = runs[runs.length - 1] || {};
    el.textContent = `${runs.length} night / ${last.deliveries ?? "-"}件 / ${last.makanaiBase || "-"}`;
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
      try { root.sessionStorage.removeItem("rojiura-debug-session"); } catch (_error) {}
      panel.remove();
    }
  });

  root.ROJIURA_PLAYTEST_EXPORT = Object.freeze({ csvText, downloadCsv, copyCsv, refresh });
  refresh();
  root.setInterval(refresh, 2500);
})(window);
