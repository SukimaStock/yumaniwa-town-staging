(function () {
  "use strict";
  const M = window.MorningThread,
    WORK = window.SUKIMASTOCK_WORK;
  let state = M.create(),
    screen = "title",
    sound = false,
    lastRevision = -1,
    departures = [],
    mapLayout = null,
    visualTime = 0,
    mapJoins = new Map();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const page = document.getElementById("page"),
    controls = document.getElementById("controls");
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const button = (action, label, extra = "") =>
    `<button data-action="${action}" ${extra}>${label}</button>`;
  const n = (id) => M.node(state, id);
  const tone = (frequency = 440) => {
    if (sound) {
      SSE.audio.unlock();
      SSE.audio.tone({
        frequency,
        endFrequency: frequency * 0.72,
        duration: 0.045,
        volume: SSE.audio.baseline().reference.se.ui * 0.5,
      });
    }
  };
  const announce = (text) =>
    (document.getElementById("announce").textContent = text);
  const plot = (id) =>
    id === "roof"
      ? { x: 337, y: 24 }
      : id === "florist"
        ? { x: 262, y: 62 }
        : n(id);
  function layoutMap() {
    const map = document.querySelector(".map-space").getBoundingClientRect();
    const scale = Math.min(
      (map.width - 12) / 390,
      Math.max(0.79, (map.height - 105) / 205),
      1.65,
    );
    mapLayout = {
      map,
      scale,
      left: (map.width - 390 * scale) / 2,
      top: Math.max(94, (map.height - 205 * scale + 84) / 2),
    };
    const places = document.getElementById("map-places");
    places.style.transform = `translate(${mapLayout.left}px,${mapLayout.top}px) scale(${scale})`;
  }
  function place(id) {
    const p = plot(id),
      l = mapLayout;
    return {
      x: l.map.left + l.left + p.x * l.scale,
      y: l.map.top + l.top + p.y * l.scale,
    };
  }
  function note(id) {
    const el = document.getElementById("slip-text");
    if (!id) {
      el.textContent = "";
      el.hidden = true;
      return;
    }
    const item = n(id),
      edges = M.stages[state.stage].nodes
        .filter((x) => M.edge(state, id, x.id) !== null)
        .map((x) => `${x.name} ${M.edge(state, id, x.id)}分`)
        .join(" · ");
    const extra =
      id === "lift" && state.event
        ? " 8:44便は休止。次は8:52。"
        : id === "florist" && state.event
          ? " 裏の通路から屋上へ2分。"
          : "";
    el.hidden = false;
    el.innerHTML = `<strong>${escape(item.name)}</strong><p>${escape(item.note + extra)}</p><small>${escape(edges)}</small>`;
    const sp = board.slipPoint();
    el.style.top =
      (sp
        ? Math.max(138, Math.min(sp.y + 38, board.top - 100))
        : Math.max(144, board.top - 94)) + "px";
  }
  function inspect(id) {
    M.discover(state, id);
    note(id);
    announce(n(id).name + "の札を拾った");
    tone(380);
    render();
  }
  function connect(id, after) {
    // Ask the existing model about the held card first. An inadmissible
    // current-place slip must not add a loose target as a partial connection.
    const wasConnected = state.route.includes(id);
    if (!wasConnected && !M.add(state, id)) return false;
    if (
      after !== state.at &&
      !state.route.includes(after) &&
      !M.add(state, after)
    ) {
      if (!wasConnected) M.remove(state, id);
      return false;
    }
    const order = state.route.filter((x) => x !== id);
    const target = after === state.at ? 0 : order.indexOf(after) + 1;
    const delta = target - state.route.indexOf(id);
    for (let i = 0; i < Math.abs(delta); i++)
      M.move(state, id, Math.sign(delta));
    render();
    return true;
  }
  function record() {
    return `<ol class="record">${[...state.record, ...departures]
      .sort((a, b) => a.at - b.at)
      .map((r) => `<li><time>${M.time(r.at)}</time> ${escape(r.text)}</li>`)
      .join("")}</ol>`;
  }
  function fallback() {
    const el = document.getElementById("fallback");
    if (el.hidden) return;
    const focus = document.activeElement?.dataset;
    el.innerHTML = `<h2>操作のメモ</h2><p>札をタップして選び、手帳の「いま」か次につなぎたいカードをタップ。選んだカードの結び目で糸をほどけます。糸の端はタップでも出発できます。</p><div class="fallback-actions">${button("paper", "紙の端をめくる")}${button("reset", "朝をやり直す")}${button("start", state.event ? "つづきへ" : "出発する", !state.route.length || state.phase === "running" ? "disabled" : "")}</div><h3>場所の札</h3>${M.stages[
      state.stage
    ].nodes
      .filter((x) => x.id !== M.stages[state.stage].start)
      .map(
        (x) =>
          `<section class="fallback-card">${button("inspect", escape(x.name), `data-id="${x.id}" ${state.phase === "running" ? "disabled" : ""}`)}${button("add", "糸へ入れる", `data-id="${x.id}" ${state.route.includes(x.id) || !state.discovered.includes(x.id) || (state.at === x.id && !(x.id === M.stages[state.stage].goal && state.route.length)) || state.phase === "running" ? "disabled" : ""}`)}${state.discovered.includes(x.id) ? `<p>${escape(x.note)}${state.event && x.id === "lift" ? " 8:44便は休止。" : state.event && x.id === "florist" ? " 屋上へ2分の裏通路が開いた。" : ""}</p>` : ""}</section>`,
      )
      .join(
        "",
      )}<h3>糸の順番</h3><ol>${state.route.map((id) => `<li data-route-id="${id}">${escape(n(id).name)} ${button("up", "前へ", `data-id="${id}" aria-label="${n(id).name}を前へ"`)}${button("down", "後ろへ", `data-id="${id}" aria-label="${n(id).name}を後ろへ"`)}${button("remove", "ほどく", `data-id="${id}" aria-label="${n(id).name}の糸をほどく"`)}</li>`).join("")}</ol>${button("access-close", "盤面へ戻る")}`;
    if (focus?.action)
      el.querySelector(
        `[data-action="${focus.action}"]${focus.id ? `[data-id="${focus.id}"]` : ""}`,
      )?.focus({ preventScroll: true });
  }
  const board = new MorningPaperBoard({
    state: () => state,
    screen: () => screen,
    node: n,
    time: M.time,
    place,
    edge: (a, b) => M.edge(state, a, b),
    hitPlace: (p) =>
      M.stages[state.stage].nodes
        .filter((x) => x.id !== M.stages[state.stage].start)
        .find(
          (x) =>
            Math.abs(p.x - place(x.id).x) < 34 * mapLayout.scale &&
            Math.abs(p.y - place(x.id).y) < 30 * mapLayout.scale,
        )?.id,
    inspect,
    note,
    connect,
    disconnect: (id) => {
      M.remove(state, id);
      render();
    },
    tone,
    announce,
    refreshFallback: fallback,
    depart: () => {
      const at = state.now,
        label = state.event ? "RESUME" : "START";
      if (M.start(state)) departures.push({ at, text: label });
      render();
    },
  });
  function render() {
    lastRevision = state.revision;
    const spec = M.stages[state.stage];
    document.getElementById("app").dataset.phase =
      screen === "play" ? state.phase : screen;
    document.getElementById("map-caption").innerHTML =
      `<div class="stage-top"><div><span class="eyebrow">${state.stage === "home" ? "PROLOGUE" : "CHAPTER 01"}</span><h2>${spec.title}</h2></div><div class="clock">${M.time(state.now)}<small>${state.phase === "running" ? "朝が動いている" : "考える時間 · 時計は停止中"}</small></div></div><p class="goal">${spec.goalText}</p>`;
    document.getElementById("map-places").innerHTML = spec.nodes
      .filter((x) => x.id !== spec.start)
      .map((x) => {
        const p = plot(x.id);
        return `<button class="place" style="left:${p.x - 34}px;top:${p.y - 28}px" data-action="inspect" data-id="${x.id}" aria-label="${x.name}を調べる" ${screen !== "play" || state.phase === "running" ? "disabled" : ""}><span class="sr-only">${x.name}</span></button>`;
      })
      .join("");
    layoutMap();
    const joins = new Map();
    let from = state.at;
    for (const id of state.route) {
      const key = `${state.stage}:${from}:${id}`;
      joins.set(key, mapJoins.get(key) ?? visualTime);
      from = id;
    }
    mapJoins = joins;
    document.getElementById("status-note").innerHTML = "";
    page.innerHTML = "";
    controls.innerHTML = "";
    if (screen === "title") {
      page.innerHTML =
        '<span class="eyebrow">線をつなぐと、朝が動く。</span><h2>小さな予定を、一本の旅に。</h2><p>洗濯もの。焼きたてのパン。<br>別々だった予定を、紙の上でつないでみる。</p><p class="hint">考える時間は、時計が止まる。<br>札を拾う。近づける。糸の端を引く。</p>';
      controls.innerHTML = button("begin", "朝をはじめる");
    } else if (screen === "ending") {
      page.innerHTML = `<span class="eyebrow">A LITTLE JOURNEY · 01</span><h2>朝を、届けた。</h2><p>紙袋を開くと、パンの香り。${state.done.includes("florist") ? "窓辺には、寄り道の一輪。" : "カフェには、まだ誰もいない。"}<br>自分でつないだ糸が、今日の道になった。</p><h3>あなたの旅の記録</h3>${record()}<p class="hint">家の中から、街へ。街から、遠くへ。<br>次のページは、まだ白い。</p>`;
      controls.innerHTML =
        button("mall-again", "別の朝をつなぐ") + button("title", "表紙へ");
    } else if (state.phase === "success") {
      page.innerHTML = `<h2>いってきます。</h2><p>ほんの数分でも、自分でつなぐと道になる。</p>${record()}`;
      controls.innerHTML = button("mall", "モールへ");
    } else if (["running", "event", "failed"].includes(state.phase)) {
      document.getElementById("status-note").innerHTML =
        `<section class="notice" role="status"><strong>${state.phase === "event" ? "♪ 朝の館内放送" : state.phase === "failed" ? "ここで、ひと休み。" : "線が、道になっていく。"}</strong><p>${escape(state.message)}</p>${state.phase === "running" ? record() : "<small>時計は停止中。糸を結び直して、つづきへ。</small>"}</section>`;
    }
    board.sync();
    fallback();
  }
  function act(action, id) {
    if (action === "inspect") {
      board.inspect(id);
      return;
    }
    if (["begin", "mall", "mall-again", "title", "reset"].includes(action)) {
      screen = action === "title" ? "title" : "play";
      state = M.create(
        ["mall", "mall-again"].includes(action)
          ? "mall"
          : action === "reset"
            ? state.stage
            : "home",
      );
      departures = [];
      board.reset();
      note(null);
      mapJoins.clear();
    }
    if (action.startsWith("object-")) board.tapObject(action.slice(7), id);
    if (action === "paper") board.cycle();
    if (action === "add") {
      board.acquire(id, board.slot(state.route.length + 1));
      board.connect(id, state.route.at(-1) || state.at);
    }
    if (action === "up" || action === "down") {
      if (board.editable && M.move(state, id, action === "up" ? -1 : 1))
        board.normalize();
    }
    if (action === "remove") board.disconnect(id);
    if (action === "start") board.depart();
    if (action === "access-close") {
      document.getElementById("fallback").hidden = true;
      document.getElementById("access").setAttribute("aria-expanded", "false");
      document.getElementById("access").focus();
    }
    render();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (b && !b.disabled) act(b.dataset.action, b.dataset.id);
  });
  document.getElementById("access").addEventListener("click", () => {
    const el = document.getElementById("fallback");
    el.hidden = !el.hidden;
    document
      .getElementById("access")
      .setAttribute("aria-expanded", String(!el.hidden));
    fallback();
  });
  document.getElementById("sound").addEventListener("click", () => {
    sound = !sound;
    SSE.audio.setEnabled(sound);
    document.getElementById("sound").textContent =
      "音 " + (sound ? "ON" : "OFF");
    tone(350);
  });
  new ResizeObserver(() => {
    layoutMap();
    board.refreshGeometry();
    if (board.slip) note(board.slip);
  }).observe(document.querySelector(".map-space"));
  function draw() {
    const canvas = document.getElementById("gameCanvas"),
      ctx = canvas.getContext("2d"),
      dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#f3eee3";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    const { map, scale, left, top } = mapLayout;
    ctx.translate(map.left + left, map.top + top);
    ctx.scale(scale, scale);
    const spec = M.stages[state.stage];
    function box(x, y, w, h, color, r = 7) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    }
    box(
      -window.innerWidth / scale,
      5,
      (window.innerWidth * 3) / scale,
      210,
      "#e9e7d8",
      0,
    );
    ctx.fillStyle = "#ffffff70";
    ctx.beginPath();
    ctx.moveTo(14, 5);
    ctx.lineTo(260, 5);
    ctx.lineTo(80, 194);
    ctx.lineTo(14, 194);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = "#faf7ec";
    ctx.lineCap = "round";
    const edges = [...spec.edges];
    if (state.event) edges.push(["florist", "roof", 2]);
    for (const [a, b] of edges) {
      const aa = plot(a),
        bb = plot(b);
      ctx.beginPath();
      ctx.moveTo(aa.x, aa.y);
      ctx.lineTo(bb.x, bb.y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#779c82";
    ctx.lineWidth = 2;
    let from = state.at;
    for (const id of state.route) {
      if (M.edge(state, from, id) !== null) {
        ctx.beginPath();
        ctx.moveTo(plot(from).x, plot(from).y);
        const a = plot(from),
          b = plot(id),
          started = mapJoins.get(`${state.stage}:${from}:${id}`) ?? visualTime;
        const progress = reducedMotion.matches
          ? 1
          : Math.min(1, (visualTime - started) / 0.2);
        ctx.lineTo(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress);
        ctx.stroke();
      }
      from = id;
    }
    for (const item of spec.nodes) {
      let { x, y } = plot(item.id);
      if (board.hand?.kind === "place" && board.hand.id === item.id) y += 1.5;
      const reply =
        board.reply?.id === item.id && !reducedMotion.matches
          ? Math.max(0, 1 - (board.clock - board.reply.at) / 0.6)
          : 0;
      if (item.id === "bakery")
        y +=
          Math.sin((board.clock - (board.reply?.at || 0)) * 18) * reply * 1.5;
      box(x - 24, y - 14, 48, 31, "#d6d5c4");
      box(
        x - 24,
        y - 19,
        48,
        29,
        state.done.includes(item.id) ? "#cbdcc4" : "#fffaf0",
      );
      box(
        x - 24,
        y - 21,
        48,
        7,
        item.id === "bakery"
          ? "#d89b77"
          : item.id === "florist"
            ? "#87a67c"
            : item.id === "roof"
              ? "#7b9b9b"
              : "#b3bdab",
        3,
      );
      ctx.font = "17px system-ui";
      ctx.textAlign = "center";
      ctx.fillStyle = "#536854";
      ctx.fillText(item.icon, x, y + 2);
      ctx.font = "9px system-ui";
      ctx.fillStyle = "#697365";
      ctx.fillText(item.name, x, y + 25);
      if (["lift", "escalator"].includes(item.id)) {
        ctx.fillStyle = reply > 0.1 ? "#d4b379" : "#a6b79c";
        ctx.beginPath();
        ctx.arc(x + 18, y - 5, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (item.id === "bakery") {
        for (let i = 0; i < 3; i++)
          box(x - 14 + i * 10, y + 4, 7, 3, "#d7a263", 2);
      }
      if (item.id === "florist") {
        ctx.fillStyle = "#d99c87";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(
            x - 15 + i * 14,
            y - 17 + reply * Math.sin(board.clock * 14 + i) * 2,
            3,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }
    let x = plot(state.at).x,
      y = plot(state.at).y;
    if (state.active?.kind === "walk") {
      const a = state.active,
        fraction = Math.min(
          1,
          (a.total - a.remaining + state.accumulator / 0.65) / a.total,
        ),
        dest = plot(a.to);
      x += (dest.x - x) * fraction;
      y += (dest.y - y) * fraction;
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d5825b";
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    if (state.active?.kind === "wait") {
      ctx.strokeStyle = "#d5a66d";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(
        x,
        y,
        11,
        0,
        Math.PI * 2 * (0.5 + 0.15 * Math.sin(visualTime * 2)),
      );
      ctx.stroke();
    }
    // Tiny staff / cleaning cart: quiet background motion, unrelated to game time.
    if (state.stage === "mall") {
      const cartX =
        205 +
        Math.sin(visualTime * 0.4) * 9 +
        (board.reply?.id === "central"
          ? Math.max(0, 1 - (board.clock - board.reply.at) / 0.6) * 3
          : 0);
      box(cartX, 103, 7, 5, "#aab5a2", 2);
      ctx.fillStyle = "#829383";
      ctx.beginPath();
      ctx.arc(cartX + 2, 98, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    board.draw(ctx);
    ctx.restore();
  }

  SSE.createApp({
    id: WORK.id,
    logicalWidth: innerWidth,
    logicalHeight: innerHeight,
    outerBackground: [243, 238, 227],
    frameRate: WORK.frameRate,
    initialScene: "main",
    pointerMode: "primary",
    debug: false,
    audio: SSE.audio.withBaseline({
      storageKey: WORK.id + ".sound",
      enabled: false,
    }),
    analytics: { enabled: false },
    scenes: {
      main: {
        opaque: true,
        update(dt) {
          if (
            SSE.viewport.logicalWidth !== innerWidth ||
            SSE.viewport.logicalHeight !== innerHeight
          )
            SSE.viewport.configure(innerWidth, innerHeight);
          if (!reducedMotion.matches) visualTime += dt;
          const prior = state.phase;
          // Game clock consumes exactly the elapsed time from the unchanged model.
          // Departure punctuation is visual; no model time is spent until it commits.
          const starting = board.startAt !== null;
          if (!starting) M.update(state, dt);
          board.update(dt);
          if (state.phase === "success" && state.stage === "mall")
            screen = "ending";
          if (state.revision !== lastRevision && screen !== "title") {
            if (
              prior !== state.phase &&
              ["event", "failed"].includes(state.phase)
            ) {
              board.cancel();
              board.sheet(2);
            }
            render();
            if (prior !== state.phase) {
              announce(state.message);
              tone(state.phase === "event" ? 520 : 410);
            }
          }
        },
        draw,
      },
    },
  });
  SSE.audio.setEnabled(false);
  render();
})();
