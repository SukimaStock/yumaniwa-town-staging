(function () {
  "use strict";
  const M = window.MorningThread,
    WORK = window.SUKIMASTOCK_WORK;
  let state = M.create(),
    screen = "title",
    lastRevision = -1,
    sound = false,
    dragging = null,
    visualTime = 0,
    pressedPlace = null,
    mapLayout = null,
    threadKeys = new Set(),
    suppressClickUntil = 0,
    departures = [],
    followFrame = null,
    mapJoins = new Map(),
    suppressedId = null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const page = document.getElementById("page"),
    controls = document.getElementById("controls"),
    dialog = document.getElementById("notebook");
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
  const button = (action, label, cls = "", extra = "") =>
    `<button data-action="${action}" class="${cls}" ${extra}>${label}</button>`;
  const n = (id) => M.node(state, id);
  const tone = (pitch = 440) => {
    if (sound) {
      SSE.audio.unlock();
      SSE.audio.tone({
        frequency: pitch,
        endFrequency: pitch * 0.82,
        duration: 0.045,
        volume: SSE.audio.baseline().reference.se.ui * 0.65,
      });
    }
  };
  function announce(text) {
    document.getElementById("announce").textContent = text;
  }
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
    const left = (map.width - 390 * scale) / 2;
    const top = Math.max(94, (map.height - 205 * scale + 84) / 2);
    mapLayout = { map, scale, left, top };
    const places = document.getElementById("map-places");
    places.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  }
  function mapPlaces() {
    document.getElementById("map-places").innerHTML = M.stages[
      state.stage
    ].nodes
      .filter((item) => item.id !== M.stages[state.stage].start)
      .map((item) => {
        const pos = plot(item.id);
        return `<button class="place ${state.discovered.includes(item.id) ? "known" : ""}" style="left:${pos.x - 34}px;top:${pos.y - 28}px" data-action="inspect" data-id="${item.id}" aria-label="${item.name}を調べる" ${screen !== "play" || state.phase === "running" || state.phase === "success" ? "disabled" : ""}><span class="sr-only">${item.name}</span></button>`;
      })
      .join("");
    layoutMap();
  }
  new ResizeObserver(layoutMap).observe(document.querySelector(".map-space"));
  function record() {
    const entries = [...state.record, ...departures].sort(
      (a, b) => a.at - b.at,
    );
    return `<ul class="record">${entries.map((r) => `<li><time>${M.time(r.at)}</time><span>${escape(r.text)}</span></li>`).join("")}</ul>`;
  }
  function card(id, i) {
    const from = i ? state.route[i - 1] : state.at,
      travel = M.edge(state, from, id);
    return `<div class="connector">${travel === null ? "通路を調べよう" : travel + "分"}${id === "roof" && from === "lift" ? (state.event ? " · 8:44便は休止" : " · 定時便") : ""}</div><div class="route-card" data-id="${id}" style="--offset:${i % 2 ? 7 : 0}px"><button class="drag-handle icon" data-action="inspect" data-id="${id}" aria-label="${n(id).name}を調べる・ドラッグで移動">${n(id).icon}</button><div class="name">${n(id).name}<small>${n(id).open ? M.time(n(id).open) + "から" : ""}${n(id).service ? " · 用事 " + n(id).service + "分" : ""}</small></div><div class="arrows">${button("up", "↑", "", 'data-id="' + id + '" aria-label="' + n(id).name + 'を前へ" ' + (i === 0 ? "disabled" : ""))}${button("down", "↓", "", 'data-id="' + id + '" aria-label="' + n(id).name + 'を後ろへ" ' + (i === state.route.length - 1 ? "disabled" : ""))}</div>${button("remove", "×", "remove", 'data-id="' + id + '" aria-label="' + n(id).name + 'を外す"')}</div>`;
  }
  function cardRects() {
    return new Map(
      [...document.querySelectorAll(".route-card")].map((el) => [
        el.dataset.id,
        el.getBoundingClientRect(),
      ]),
    );
  }
  function drawThread(animate = false) {
    const route = document.getElementById("route");
    if (!route) {
      threadKeys.clear();
      return;
    }
    let svg = route.querySelector(".thread");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("thread");
      svg.setAttribute("aria-hidden", "true");
      route.prepend(svg);
    }
    const bounds = route.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${bounds.width} ${route.scrollHeight}`);
    svg.style.height = route.scrollHeight + "px";
    let point = { x: 27, y: 0 },
      from = state.at;
    const keys = new Set(),
      paths = [],
      existing = [...svg.children];
    // Preview order belongs to the hand, not to the time/route model.
    const order = state.route.slice();
    if (dragging?.moved) {
      order.splice(dragging.index, 1);
      order.splice(dragging.target, 0, dragging.id);
    }
    for (const id of order) {
      const el = document.querySelector(
        `.route-card[data-id="${id}"] .drag-handle`,
      );
      if (!el) continue;
      const rect = (
        dragging?.moved && dragging.id === id
          ? dragging.ghost.querySelector(".drag-handle")
          : el
      ).getBoundingClientRect();
      const to = {
        x: rect.left + rect.width / 2 - bounds.left,
        y: rect.top + rect.height / 2 - bounds.top,
      };
      const travel = M.edge(state, from, id),
        cancelled = from === "lift" && id === "roof" && state.event;
      const key = `${from}:${id}:${travel}:${cancelled}`;
      keys.add(key);
      const loose = travel === null || cancelled;
      const bend = loose ? 25 : 0;
      const middle = (point.y + to.y) / 2;
      const path =
        existing[paths.length] ||
        document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute(
        "d",
        `M ${point.x} ${point.y} C ${point.x + bend} ${middle}, ${to.x + bend} ${middle}, ${to.x} ${to.y}`,
      );
      path.classList.toggle("slack", loose && !cancelled);
      path.classList.toggle("unravelled", cancelled);
      paths.push([path, key]);
      point = to;
      from = id;
    }
    svg.replaceChildren(...paths.map(([path]) => path));
    if (animate && !reducedMotion.matches)
      for (const [path, key] of paths)
        if (!threadKeys.has(key)) {
          const length = path.getTotalLength();
          path.animate(
            [
              {
                strokeDasharray: `${length} ${length}`,
                strokeDashoffset: length,
              },
              { strokeDasharray: `${length} ${length}`, strokeDashoffset: 0 },
            ],
            { duration: 200, easing: "ease-out" },
          );
        }
    threadKeys = keys;
  }
  function followThread(ms = 220) {
    cancelAnimationFrame(followFrame);
    if (reducedMotion.matches) return;
    const until = performance.now() + ms;
    function step() {
      drawThread();
      if (performance.now() < until) followFrame = requestAnimationFrame(step);
    }
    followFrame = requestAnimationFrame(step);
  }
  function settleCards(before) {
    if (!reducedMotion.matches)
      for (const el of document.querySelectorAll(".route-card")) {
        const old = before.get(el.dataset.id),
          rect = el.getBoundingClientRect();
        if (old && Math.abs(old.top - rect.top) > 1)
          el.animate(
            [
              { transform: `translateY(${old.top - rect.top}px)` },
              { transform: "translateY(0)" },
            ],
            { duration: 200, easing: "cubic-bezier(.2,.65,.3,1)" },
          );
      }
    drawThread(true);
    followThread();
  }
  function render() {
    const before = cardRects(),
      scroll = page.scrollTop;
    lastRevision = state.revision;
    const focus = document.activeElement?.dataset,
      focusAction = focus?.action,
      focusId = focus?.id;
    const spec = M.stages[state.stage];
    document.getElementById("app").dataset.phase =
      screen === "play" ? state.phase : screen;
    document.getElementById("map-caption").innerHTML =
      `<div class="stage-top"><div><span class="eyebrow">${state.stage === "home" ? "PROLOGUE" : "CHAPTER 01"}</span><h2>${spec.title}</h2></div><div class="clock">${M.time(state.now)}<small>${state.phase === "running" ? "朝が動いている" : "考える時間 · 時計は停止中"}</small></div></div><div class="goal"><p>${spec.goalText}</p></div>`;
    const joins = new Map();
    let from = state.at;
    for (const id of state.route) {
      const key = `${state.stage}:${from}:${id}`;
      joins.set(key, mapJoins.get(key) ?? visualTime);
      from = id;
    }
    mapJoins = joins;
    mapPlaces();
    if (screen === "title") {
      page.innerHTML = `<span class="eyebrow">線をつなぐと、朝が動く。</span><h2>小さな予定を、一本の旅に。</h2><p>洗濯もの。焼きたてのパン。<br>別々だった予定を、手帳からつないでみる。</p><div class="paper"><p>調べる → カードをつなぐ → START</p><p class="hint">急がなくて大丈夫。考えている間、時計は止まっています。</p></div>`;
      controls.innerHTML = button("begin", "朝をはじめる", "primary");
      return;
    }
    if (screen === "ending") {
      page.innerHTML = `<span class="eyebrow">A LITTLE JOURNEY · 01</span><div class="stamp">届いた</div><h2>朝を、届けた。</h2><p>紙袋を開くと、パンの香り。${state.done.includes("florist") ? "窓辺には、寄り道の一輪。" : "カフェには、まだ誰もいない。"}<br>自分でつないだ線が、今日の道になった。</p><div class="paper"><h3>あなたの旅の記録</h3>${record()}</div><div class="teaser"><small>NEXT, SOMEWHERE</small><div class="world-line">⌂ · ◉ · ◎</div><p>家の中から、街へ。街から、遠くへ。<br>次のページは、まだ白い。</p></div>`;
      controls.innerHTML =
        button("mall-again", "別の朝をつなぐ", "primary") +
        button("title", "表紙へ", "secondary");
      return;
    }
    if (state.phase === "success") {
      page.innerHTML = `<span class="eyebrow">PROLOGUE · ひとつめの旅</span><h2>いってきます。</h2><p>ほんの数分でも、自分でつなぐと道になる。</p><div class="paper">${record()}</div>`;
      controls.innerHTML = button("mall", "モールへ", "primary");
      return;
    }
    page.innerHTML = "";
    if (state.phase === "running") {
      page.innerHTML += `<div class="departure-mark">${M.time(departures.at(-1)?.at ?? state.now)} · ${departures.at(-1)?.text || "START"}</div><div class="status" role="status">${escape(state.message)}</div><div class="paper"><h3>線が、道になっていく。</h3>${record()}<p class="hint">このあと：${state.route.map((id) => n(id).name).join(" → ") || "ここまで"}</p></div>`;
      controls.innerHTML = button(
        "watch",
        "朝を、見届けている",
        "secondary",
        "disabled",
      );
    } else {
      if (state.phase === "event")
        page.innerHTML += `<section class="notice"><h3>♪ 朝の館内放送</h3><p>${escape(state.message)}</p><p class="hint">時計は止めてあります。残りのカードを組み替えて、続けよう。</p></section>`;
      if (state.phase === "failed")
        page.innerHTML += `<section class="notice"><h3>ここで、ひと休み。</h3><p>${escape(state.message)}</p><p class="hint">ここから組み直すか、同じ朝をもう一度。</p></section>`;
      page.innerHTML += `<section class="paper"><div class="paper-title"><h3>つなぎめの手帳</h3>${button("clear", "線をほどく", "", 'aria-label="残りのカードをすべて外す"')}</div><p class="hint">絵を持って並べる · ↑ ↓ でもつなぎ直せます</p><div class="origin">● いま：${n(state.at).name} · ${M.time(state.now)}</div><div id="route">${state.route.map(card).join("") || '<div class="empty">館内図の場所を触って、最初の紙片を拾おう。</div>'}</div></section>`;
      controls.innerHTML =
        button("reset", "朝をやり直す", "secondary") +
        button(
          "start",
          `<span>${state.event ? "RESUME" : "START"}</span><small>出発印</small>`,
          "departure-stamp",
          state.route.length ? "" : "disabled",
        );
    }
    lastRevision = state.revision;
    page.scrollTop = scroll;
    settleCards(before);
    if (focusAction) {
      const candidates = [...document.querySelectorAll("[data-action]")];
      candidates
        .find(
          (el) =>
            el.dataset.action === focusAction && el.dataset.id === focusId,
        )
        ?.focus({ preventScroll: true });
    }
  }
  function inspect(id) {
    if (!M.discover(state, id)) return;
    const item = n(id),
      spec = M.stages[state.stage];
    const edges = spec.nodes
      .filter((x) => M.edge(state, id, x.id) !== null)
      .map(
        (x) =>
          `<li>${x.name} <span class="hint">↔ ${M.edge(state, id, x.id)}分</span></li>`,
      )
      .join("");
    const extra =
      id === "lift" && state.event
        ? "<p>今朝の8:44便は休止。次は8:52です。</p>"
        : id === "florist" && state.event
          ? "<p>「準備、早く終わったの。裏の通路を使っていいよ。」<br>屋上への道：2分。</p>"
          : "";
    document.getElementById("note-content").innerHTML =
      `<span class="eyebrow">朝のメモ</span><h2 id="note-title">${item.icon} ${item.name}</h2><p>${item.note}</p>${extra}<h3>つながる場所</h3><ul class="edge-list">${edges}</ul>${button("add", "このカードをつなぐ", "wide primary", 'data-id="' + id + '" ' + (state.route.includes(id) || (state.at === id && !(id === M.stages[state.stage].goal && state.route.length)) ? "disabled" : ""))}`;
    dialog.dataset.place = id;
    dialog.showModal();
    tone(380);
  }
  function act(action, id) {
    if (action === "inspect") {
      inspect(id);
      return;
    }
    if (action === "begin") {
      screen = "play";
      state = M.create();
    }
    if (action === "mall" || action === "mall-again") {
      screen = "play";
      state = M.create("mall");
      window.scrollTo(0, 0);
    }
    if (action === "title") {
      screen = "title";
      state = M.create();
      window.scrollTo(0, 0);
    }
    if (action === "add") {
      if (M.add(state, id)) {
        dialog.close();
        tone(510 + state.route.length * 70);
        announce(n(id).name + "をつないだ");
      }
    }
    if (action === "remove") {
      M.remove(state, id);
      tone(350);
    }
    if (action === "up" || action === "down") {
      M.move(state, id, action === "up" ? -1 : 1);
      tone(540);
    }
    if (action === "clear") {
      state.route = [];
      state.revision++;
      tone(310);
    }
    if (action === "start") {
      const at = state.now,
        label = state.event ? "RESUME" : "START";
      if (M.start(state)) departures.push({ at, text: label });
      page.scrollTop = 0;
      tone(260);
      window.scrollTo(0, 0);
    }
    if (action === "reset") {
      state = M.create(state.stage);
      window.scrollTo(0, 0);
    }
    if (["begin", "mall", "mall-again", "title", "reset"].includes(action)) {
      departures = [];
      page.scrollTop = 0;
      threadKeys.clear();
    }
    if (state.phase === "success" && state.stage === "mall") screen = "ending";
    render();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (b && !b.disabled) {
      if (
        performance.now() < suppressClickUntil &&
        b.dataset.action === "inspect" &&
        b.dataset.id === suppressedId
      )
        return;
      act(b.dataset.action, b.dataset.id);
    }
  });
  document.getElementById("close-note").addEventListener("click", () => {
    dialog.close();
    render();
  });
  dialog.addEventListener("cancel", () => {
    setTimeout(render, 0);
  });
  document.getElementById("sound").addEventListener("click", () => {
    sound = !sound;
    SSE.audio.setEnabled(sound);
    document.getElementById("sound").textContent =
      "音 " + (sound ? "ON" : "OFF");
    tone(510);
  });
  function finishDrag(cancelled) {
    const drag = dragging;
    if (!drag) return;
    dragging = null;
    if (drag.moved) {
      suppressClickUntil = performance.now() + 180;
      suppressedId = drag.id;
      document.querySelectorAll(".route-card").forEach((el) => {
        el.style.transform = "";
        el.classList.remove("held", "yielding");
      });
      if (!cancelled && drag.target !== drag.index) {
        const delta = drag.target - state.route.indexOf(drag.id);
        for (let step = 0; step < Math.abs(delta); step++)
          M.move(state, drag.id, Math.sign(delta));
      }
      render();
      const card = document.querySelector(`.route-card[data-id="${drag.id}"]`);
      if (card && !reducedMotion.matches) {
        const to = card.getBoundingClientRect(),
          from = drag.ghost.getBoundingClientRect();
        card.animate(
          [
            {
              transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(1.015)`,
            },
            { transform: "translate(0,0) scale(1)" },
          ],
          { duration: 140, easing: "cubic-bezier(.18,.7,.3,1)" },
        );
      }
      drag.ghost.remove();
      followThread(150);
      tone(cancelled ? 310 : 470);
      if (!cancelled) announce(n(drag.id).name + "の位置を決めた");
    }
  }
  document.addEventListener("pointerdown", (e) => {
    pressedPlace = e.target.closest(".place")?.dataset.id || null;
    const handle = e.target.closest(".drag-handle");
    if (!handle || state.phase === "running" || e.button !== 0 || dragging)
      return;
    const card = handle.closest(".route-card");
    dragging = {
      id: handle.dataset.id,
      x: e.clientX,
      y: e.clientY,
      pointer: e.pointerId,
      handle,
      card,
      index: state.route.indexOf(handle.dataset.id),
      target: state.route.indexOf(handle.dataset.id),
      slots: [...document.querySelectorAll(".route-card")].map((el) =>
        el.getBoundingClientRect(),
      ),
      moved: false,
    };
    handle.setPointerCapture(e.pointerId);
  });
  document.addEventListener(
    "pointermove",
    (e) => {
      const drag = dragging;
      if (!drag || e.pointerId !== drag.pointer) return;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 8) {
        drag.moved = true;
        drag.ghost = drag.card.cloneNode(true);
        drag.ghost.classList.add("drag-ghost");
        drag.ghost.setAttribute("aria-hidden", "true");
        drag.ghost.removeAttribute("data-id");
        const rect = drag.slots[drag.index];
        Object.assign(drag.ghost.style, {
          position: "fixed",
          left: rect.left + "px",
          top: rect.top + "px",
          width: rect.width + "px",
          margin: "0",
        });
        document.body.append(drag.ghost);
        drag.card.classList.add("held");
        tone(330);
      }
      if (!drag.moved) return;
      e.preventDefault();
      const original = drag.slots[drag.index],
        center = original.top + original.height / 2 + dy;
      let target = drag.index,
        distance = Infinity;
      drag.slots.forEach((rect, i) => {
        const d = Math.abs(center - rect.top - rect.height / 2);
        if (d < distance) {
          distance = d;
          target = i;
        }
      });
      const snapped = distance < 16 && Math.abs(dx) < 34;
      if (target !== drag.target) {
        drag.target = target;
        document
          .querySelectorAll(".route-card:not(.drag-ghost)")
          .forEach((el, i) => {
            let destination = i;
            if (i >= target && i < drag.index) destination++;
            if (i <= target && i > drag.index) destination--;
            el.classList.add("yielding");
            el.style.transform =
              i === drag.index
                ? ""
                : `translateY(${drag.slots[destination].top - drag.slots[i].top}px)`;
          });
      }
      if (snapped && !drag.snapped) tone(470);
      drag.snapped = snapped;
      drag.ghost.classList.toggle("snapped", snapped);
      drag.ghost.style.transform = snapped
        ? `translate(${drag.slots[target].left - original.left}px, ${drag.slots[target].top - original.top}px)`
        : `translate(${dx}px, ${dy - 3}px) scale(1.015)`;
      drawThread();
      if (snapped) followThread(150);
    },
    { passive: false },
  );
  document.addEventListener("pointerup", (e) => {
    pressedPlace = null;
    if (dragging?.pointer === e.pointerId) finishDrag(false);
  });
  document.addEventListener("pointercancel", () => {
    pressedPlace = null;
    finishDrag(true);
  });
  document.addEventListener("lostpointercapture", () => finishDrag(true));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") finishDrag(true);
  });
  window.addEventListener("blur", () => {
    pressedPlace = null;
    finishDrag(true);
  });
  page.addEventListener("scroll", () => {
    if (dragging?.moved) finishDrag(true);
  });
  new ResizeObserver(() => {
    finishDrag(true);
    drawThread();
  }).observe(page);
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
      if (pressedPlace === item.id) y += 1.5;
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
      if (item.id === "bakery") {
        for (let i = 0; i < 3; i++)
          box(x - 14 + i * 10, y + 4, 7, 3, "#d7a263", 2);
      }
      if (item.id === "florist") {
        ctx.fillStyle = "#d99c87";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(x - 15 + i * 14, y - 17, 3, 0, Math.PI * 2);
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
      const cartX = 205 + Math.sin(visualTime * 0.4) * 9;
      box(cartX, 103, 7, 5, "#aab5a2", 2);
      ctx.fillStyle = "#829383";
      ctx.beginPath();
      ctx.arc(cartX + 2, 98, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  SSE.createApp({
    id: WORK.id,
    logicalWidth: window.innerWidth,
    logicalHeight: window.innerHeight,
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
            SSE.viewport.logicalWidth !== window.innerWidth ||
            SSE.viewport.logicalHeight !== window.innerHeight
          )
            SSE.viewport.configure(window.innerWidth, window.innerHeight);
          if (!reducedMotion.matches) visualTime += dt;
          const prior = state.phase;
          M.update(state, dt);
          if (state.phase === "success" && state.stage === "mall")
            screen = "ending";
          if (state.revision !== lastRevision && screen !== "title") {
            render();
            if (prior !== state.phase) {
              announce(state.message);
              tone(state.phase === "event" ? 740 : 620);
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
