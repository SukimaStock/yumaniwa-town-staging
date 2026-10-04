(function () {
  "use strict";
  const M = window.MorningThread,
    WORK = window.SUKIMASTOCK_WORK;
  let state = M.create(),
    screen = "title",
    lastRevision = -1,
    sound = false,
    dragging = null,
    visualTime = 0;
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
        endFrequency: pitch * 1.12,
        duration: 0.055,
        volume: SSE.audio.baseline().reference.se.ui,
      });
    }
  };
  function announce(text) {
    document.getElementById("announce").textContent = text;
  }
  function record() {
    return `<ul class="record">${state.record.map((r) => `<li><time>${M.time(r.at)}</time><span>${escape(r.text)}</span></li>`).join("")}</ul>`;
  }
  function card(id, i) {
    const from = i ? state.route[i - 1] : state.at,
      travel = M.edge(state, from, id);
    return `<div class="connector ${travel === null ? "broken" : ""}">${travel === null ? "通路を調べよう" : travel + "分"}${id === "roof" && from === "lift" ? " · 定時便" : ""}</div><div class="route-card" data-id="${id}"><button class="drag-handle icon" data-action="inspect" data-id="${id}" aria-label="${n(id).name}を調べる・ドラッグで移動">${n(id).icon}</button><div class="name">${n(id).name}<small>${n(id).open ? M.time(n(id).open) + "から" : ""}${n(id).service ? " · 用事 " + n(id).service + "分" : ""}</small></div><div class="arrows">${button("up", "↑", "", 'data-id="' + id + '" aria-label="' + n(id).name + 'を前へ" ' + (i === 0 ? "disabled" : ""))}${button("down", "↓", "", 'data-id="' + id + '" aria-label="' + n(id).name + 'を後ろへ" ' + (i === state.route.length - 1 ? "disabled" : ""))}</div>${button("remove", "×", "remove", 'data-id="' + id + '" aria-label="' + n(id).name + 'を外す"')}</div>`;
  }
  function render() {
    lastRevision = state.revision;
    const focus = document.activeElement?.dataset,
      focusAction = focus?.action,
      focusId = focus?.id;
    const spec = M.stages[state.stage];
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
    page.innerHTML = `<div class="stage-top"><div><span class="eyebrow">${state.stage === "home" ? "PROLOGUE" : "CHAPTER 01"}</span><h2>${spec.title}</h2></div><div class="clock">${M.time(state.now)}<small>${state.phase === "running" ? "朝が動いている" : "考える時間 · 時計は停止中"}</small></div></div><div class="goal"><p>${spec.goalText}</p></div>`;
    if (state.phase === "running") {
      page.innerHTML += `<div class="status" role="status">${escape(state.message)}</div><div class="paper"><h3>線が、道になっていく。</h3>${record()}<p class="hint">このあと：${state.route.map((id) => n(id).name).join(" → ") || "ここまで"}</p></div>`;
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
      page.innerHTML += `<section class="paper"><div class="paper-title"><h3>つなぎめの手帳</h3>${button("clear", "線をほどく", "", 'aria-label="残りのカードをすべて外す"')}</div><p class="hint">↑ ↓ で順番を変える · × で外す<br>左の絵をドラッグしても並べ替えられます。</p><div class="origin">● いま：${n(state.at).name} · ${M.time(state.now)}</div><div id="route">${state.route.map(card).join("") || '<div class="empty">下の場所を調べて、カードをつなごう。</div>'}</div></section><h3>朝の気配を、調べる。</h3><div class="places">${spec.nodes
        .filter((x) => x.id !== spec.start)
        .map(
          (x) =>
            `<button class="place ${state.done.includes(x.id) || state.route.includes(x.id) ? "used" : ""}" data-action="inspect" data-id="${x.id}"><span class="icon">${x.icon}</span><span>${x.name}<small>${state.done.includes(x.id) ? "済んだ用事" : state.route.includes(x.id) ? "手帳につながっている" : state.discovered.includes(x.id) ? "調べたメモ" : "調べる"}</small></span></button>`,
        )
        .join("")}</div>`;
      controls.innerHTML =
        button("reset", "朝をやり直す", "secondary") +
        button(
          "start",
          state.event ? "RESUME →" : "START →",
          "primary",
          state.route.length ? "" : "disabled",
        );
    }
    lastRevision = state.revision;
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
      M.start(state);
      tone(660);
      window.scrollTo(0, 0);
    }
    if (action === "reset") {
      state = M.create(state.stage);
      window.scrollTo(0, 0);
    }
    if (state.phase === "success" && state.stage === "mall") screen = "ending";
    render();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (b && !b.disabled) {
      if (dragging?.moved) return;
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
  document.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest(".drag-handle");
    if (!handle || state.phase === "running") return;
    dragging = {
      id: handle.dataset.id,
      y: e.clientY,
      pointer: e.pointerId,
      handle,
      moved: false,
    };
    handle.setPointerCapture(e.pointerId);
  });
  document.addEventListener(
    "pointermove",
    (e) => {
      if (!dragging || e.pointerId !== dragging.pointer) return;
      if (Math.abs(e.clientY - dragging.y) > 9) dragging.moved = true;
      if (dragging.moved) {
        e.preventDefault();
        document
          .querySelector(`.route-card[data-id="${dragging.id}"]`)
          ?.classList.add("dragging");
      }
    },
    { passive: false },
  );
  document.addEventListener("pointerup", (e) => {
    if (!dragging || e.pointerId !== dragging.pointer) return;
    const drag = dragging;
    if (drag.moved) {
      const cards = [...document.querySelectorAll(".route-card")];
      let index = cards.findIndex(
        (card) => e.clientY < card.getBoundingClientRect().bottom,
      );
      if (index < 0) index = state.route.length - 1;
      const current = state.route.indexOf(drag.id);
      if (current >= 0) {
        state.route.splice(current, 1);
        state.route.splice(index, 0, drag.id);
        state.revision++;
        tone(560);
        render();
      }
      e.preventDefault();
    }
    setTimeout(() => {
      dragging = null;
    }, 0);
  });
  document.addEventListener("pointercancel", () => {
    dragging = null;
    document.querySelector(".dragging")?.classList.remove("dragging");
  });
  function draw() {
    const canvas = document.getElementById("gameCanvas"),
      ctx = canvas.getContext("2d"),
      dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#f3eee3";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    const header = document.querySelector("header"),
      scale = Math.min((Math.min(window.innerWidth, 540) - 24) / 390, 1.07);
    ctx.translate(
      (window.innerWidth - 390 * scale) / 2,
      header.offsetTop + header.offsetHeight + 16,
    );
    ctx.scale(scale, scale);
    const spec = M.stages[state.stage];
    function box(x, y, w, h, color, r = 7) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    }
    box(14, 5, 362, 189, "#e9e7d8", 24);
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
      const aa = n(a),
        bb = n(b);
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
        ctx.moveTo(n(from).x, n(from).y);
        ctx.lineTo(n(id).x, n(id).y);
        ctx.stroke();
      }
      from = id;
    }
    for (const item of spec.nodes) {
      const { x, y } = item;
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
    let x = n(state.at).x,
      y = n(state.at).y;
    if (state.active?.kind === "walk") {
      const a = state.active,
        fraction = Math.min(
          1,
          (a.total - a.remaining + state.accumulator / 0.65) / a.total,
        ),
        dest = n(a.to);
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
    logicalWidth: WORK.logicalWidth,
    logicalHeight: WORK.logicalHeight,
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
          visualTime += dt;
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
