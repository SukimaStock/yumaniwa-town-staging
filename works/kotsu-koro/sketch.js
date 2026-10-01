(function (root) {
  "use strict";
  const W = root.SUKIMASTOCK_WORK, D = root.PumpkinDynamics;
  const J = root.PumpkinJourney;
  let model = D.createPrologue(), mode = "prologue", openAt = null, reveal = 0, again, debugStatus, debugAt = 0;
  if (new URLSearchParams(location.search).get("dev") === "1" && new URLSearchParams(location.search).get("stage") === "1") {
    model = J.create(model); mode = "journey";
  }
  const CX = 195, CY = 365, TAU = Math.PI * 2;
  let lastSound = -1, touchedOnce = false, hint = 1, paper;
  const grain = Array.from({ length: 760 }, (_, i) => {
    const f = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    return { x: f(i) * 390, y: f(i + 99) * 740, r: 0.2 + f(i + 33) * 0.6 };
  });
  function oval(c, x, y, rx, ry, color) {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
  }
  function outline(c, r, sy, lobes = 0) {
    c.beginPath();
    for (let i = 0; i <= 180; i++) {
      const a = i / 180 * TAU;
      const rr = r + Math.cos(a * 9 + 0.35) * lobes + Math.sin(a * 3) * lobes * 0.3;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * sy;
      if (!i) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.closePath();
  }
  function seed(c, p, i, sy = .80) {
    const x = p.x, y = p.y * sy;
    c.save(); c.translate(x, y); c.rotate(p.angle); c.scale(1, p.roll || 1);
    oval(c, 2.2, 3, 8.2, 3.8, "rgba(66,33,17,.22)");
    c.beginPath(); c.moveTo(-10.5, 0);
    c.bezierCurveTo(-5, -7.7, 7.5, -6.7, 11.5, 0);
    c.bezierCurveTo(7, 6.5, -5.8, 6.5, -10.5, 0);
    const fill = c.createLinearGradient(0, -6, 1, 6);
    fill.addColorStop(0, "#fff2ca"); fill.addColorStop(0.55, "#e6d4a3"); fill.addColorStop(1, "#b7a46f");
    c.fillStyle = fill; c.fill(); c.strokeStyle = "#d7bf87"; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.moveTo(-7, -1); c.quadraticCurveTo(0, -3.5, 8, 0);
    c.strokeStyle = "rgba(255,250,221,.74)"; c.stroke();
    c.beginPath(); c.moveTo(-5, 2); c.quadraticCurveTo(1, 3.8, 7, 1.2);
    c.strokeStyle = "rgba(145,116,62,.25)"; c.lineWidth = 0.65; c.stroke();
    c.restore();
  }
  function vessel(c) {
    c.save();
    c.translate(CX + model.x * 34, CY + model.y * 23);
    c.rotate(model.x * 0.22);
    c.scale(1 + model.ring * 0.22, 1 - model.y * 0.15 - model.ring * 0.18);
    // Lower skin: the visible thickness gives the drag somewhere to land.
    c.save(); c.translate(0, 15);
    outline(c, 143, 0.80, 5);
    const skin = c.createLinearGradient(-100, -110, 80, 100);
    skin.addColorStop(0, "#62745b"); skin.addColorStop(0.46, "#3b5341"); skin.addColorStop(1, "#25392e");
    c.fillStyle = skin; c.fill();
    c.clip();
    for (let i = 0; i < 18; i++) {
      const a = i * TAU / 18;
      c.beginPath(); c.moveTo(Math.cos(a) * 40, Math.sin(a) * 35);
      c.quadraticCurveTo(Math.cos(a) * 116, Math.sin(a) * 110, Math.cos(a + 0.06) * 157, Math.sin(a + 0.06) * 130);
      c.strokeStyle = i % 2 ? "rgba(134,145,95,.22)" : "rgba(20,40,26,.4)";
      c.lineWidth = i % 2 ? 6 : 4; c.stroke();
    }
    c.restore();
    outline(c, 141, 0.80, 4.5);
    const flesh = c.createLinearGradient(-90, -100, 110, 130);
    flesh.addColorStop(0, "#f2bc59"); flesh.addColorStop(.44, "#df9640"); flesh.addColorStop(1, "#be762e");
    c.fillStyle = flesh; c.fill();
    c.strokeStyle = "#506346"; c.lineWidth = 3.2; c.stroke();
    outline(c, 131, .80, 3);
    c.strokeStyle = "rgba(255,217,139,.55)"; c.lineWidth = 1.2; c.stroke();
    // Sparse cut fibres, stable between frames. They belong to the material.
    for (let i = 0; i < 105; i++) {
      const a = i * 2.399, r = 106 + (i * 17 % 27);
      c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r * .8);
      c.lineTo(Math.cos(a + .01) * (r + 4 + i % 5), Math.sin(a + .01) * (r + 4 + i % 5) * .8);
      c.strokeStyle = i % 3 ? "rgba(151,84,29,.14)" : "rgba(255,224,139,.35)";
      c.lineWidth = .6; c.stroke();
    }
    outline(c, 105, .80, 2.5);
    const interior = c.createRadialGradient(-19 - model.x * 20, -17 - model.y * 20, 7, 0, 0, 118);
    interior.addColorStop(0, "#ca8b44"); interior.addColorStop(.62, "#bf7b36"); interior.addColorStop(.88, "#9a5829"); interior.addColorStop(1, "#75441f");
    c.fillStyle = interior; c.fill();
    c.save(); c.clip();
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * TAU;
      c.beginPath(); c.moveTo(Math.cos(a) * 103, Math.sin(a) * 103 * .8);
      c.bezierCurveTo(Math.cos(a + .08) * 89, Math.sin(a + .08) * 89 * .8, Math.cos(a - .12) * 75, Math.sin(a - .12) * 75 * .8, Math.cos(a) * 71, Math.sin(a) * 71 * .8);
      c.strokeStyle = "rgba(240,174,78,.24)"; c.lineWidth = 1.5; c.stroke();
    }
    for (const m of model.marks) {
      c.beginPath(); c.moveTo(m.ox, m.oy * .8); c.lineTo(m.x, m.y * .8);
      c.strokeStyle = `rgba(246,200,124,${.13 * Math.pow(1 - m.age / 18, 2)})`;
      c.lineWidth = 1.2; c.stroke();
    }
    for (const p of model.seeds) {
      if (!p.tether) continue;
      const t = p.tether, tail = p.attached ? 1 : Math.exp(-(model.time - t.detachedAt) * 2.4);
      const dx = p.x - t.ax, dy = p.y - t.ay;
      c.beginPath(); c.moveTo(t.ax, t.ay * .8);
      c.quadraticCurveTo(t.ax + dx * .4 - 6 * tail, (t.ay + dy * .4) * .8 + 6 * tail, t.ax + dx * tail, (t.ay + dy * tail) * .8);
      c.strokeStyle = "rgba(119,72,28,.20)"; c.lineWidth = 4; c.stroke();
      c.strokeStyle = "#f5d295"; c.lineWidth = p.attached ? 2.2 - Math.min(1, t.damage / t.strength) * 1.2 : 1;
      c.stroke();
      c.beginPath(); c.moveTo(-1, -6); c.quadraticCurveTo(t.ax - 6, t.ay * .8 - 4, t.ax, t.ay * .8);
      c.strokeStyle = "rgba(246,202,128,.62)"; c.lineWidth = 1.1; c.stroke();
    }
    for (const [i, p] of model.seeds.entries()) seed(c, p, i);
    c.restore();
    // A knife nick remains on the rim; no "completed" state clears the object.
    c.beginPath(); c.moveTo(107, 65); c.lineTo(114, 69);
    c.strokeStyle = "#ffd089"; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }
  function draw() {
    withCanvasContext(c => {
      c.translate(0, W.logicalHeight); c.scale(1, -1);
      c.drawImage(paper, 0, 0);
      if (mode === "journey") {
        root.PumpkinStageDraw.draw(c, model, seed, reveal);
        if (reveal < 1) {
          c.globalAlpha = 1 - reveal; c.textAlign = "center"; c.fillStyle = "#665d4a";
          c.font = "22px 'Hiragino Mincho ProN', 'Yu Mincho', serif"; c.fillText(W.title, 195, 130);
        }
        return;
      }
      // The shadow moves after the hand, at the body's speed.
      c.save(); c.translate(CX + 9 + model.x * 9, CY + 29 + model.y * 5);
      c.scale(1, .65);
      const sh = c.createRadialGradient(0, 0, 30, 0, 0, 164);
      sh.addColorStop(0, "rgba(64,53,34,.26)"); sh.addColorStop(.7, "rgba(64,53,34,.13)"); sh.addColorStop(1, "rgba(64,53,34,0)");
      oval(c, 0, 0, 166, 166, sh); c.restore();
      vessel(c);
      c.textAlign = "center"; c.fillStyle = "#665d4a";
      c.font = "22px 'Hiragino Mincho ProN', 'Yu Mincho', serif";
      c.fillText(W.title, 195, 130);
      c.fillStyle = "rgba(104,95,76,.62)"; c.font = "9px Georgia, serif";
      c.fillText("P U M P K I N", 195, 153);
      c.fillStyle = `rgba(91,82,66,${.64 * hint})`;
      c.font = "12px 'Hiragino Kaku Gothic ProN', sans-serif";
      c.fillText("つかんで、ゆらす", 195, 583);
      c.fillStyle = "rgba(108,98,79,.42)"; c.font = "9px Georgia, serif";
      c.fillText("SukimaStock", 195, 684);
    });
  }
  function knockAt(x, y) {
    if (mode === "journey") { const p = J.point(model, x, y); J.knock(model, p.x, p.y); }
    else D.knock(model, x - CX, (y - CY) / .8);
    SSE.audio.play("shell");
  }
  const scene = {
    opaque: true,
    update(dt) {
      // Keyboard is an equal way of holding the vessel, without extra HUD.
      const kx = (SSE.input.action("right") ? 1 : 0) - (SSE.input.action("left") ? 1 : 0);
      const ky = (SSE.input.action("down") ? 1 : 0) - (SSE.input.action("up") ? 1 : 0);
      if (model.activeId === null) {
        model.held = !!(kx || ky);
        model.targetX = kx * .28; model.targetY = ky * .28;
      }
      if (kx || ky) touchedOnce = true;
      if (SSE.input.actionPressed("knock")) { knockAt(CX + 70, CY - 35); touchedOnce = true; }
      if (mode === "journey") {
        J.update(model, dt); reveal = Math.min(1, reveal + dt / 2.8);
        if (again) again.hidden = !model.finished;
      } else {
        D.update(model, dt);
        if (model.detachments.length) SSE.audio.play("fiber");
        if (D.allLoose(model)) {
          if (openAt === null) openAt = model.time;
          if (model.time - openAt >= 4.2) { model = J.create(model); mode = "journey"; reveal = 0; debugAt = -1; }
        }
      }
      if (debugStatus && model.time - debugAt > .35) {
        debugAt = model.time;
        debugStatus.textContent = mode + " | loose " + model.seeds.filter(p => !p.attached).length + "/9 | y " + Math.round(Math.min(...model.seeds.map(p => p.y))) + "…" + Math.round(Math.max(...model.seeds.map(p => p.y))) + " | held " + model.held + " | exit " + !!model.finished;
      }
      if (touchedOnce) hint *= Math.exp(-dt * .8);
      if (model.contacts.length && model.time - lastSound > .065) {
        const hit = model.contacts.reduce((a, b) => a.speed > b.speed ? a : b);
        const gain = Math.min(1, .40 + hit.speed / 240);
        SSE.audio.play(({ rim: "rim", fiber: "fiber", wet: "slide" })[hit.material] || "seed", { volume: SSE.audio.baseline().reference.se.soft * gain, playbackRate: .9 + hit.speed / 900 });
        lastSound = model.time;
      }
    },
    draw,
    touch(t) {
      const y = W.logicalHeight - t.y;
      if (t.state === BEGAN) {
        if (mode === "prologue" && Math.hypot((t.x - CX) / 1.1, (y - CY) / .86) > 163) return true;
        model.activeId = t.id; model.held = true;
        model.anchorX = t.x; model.anchorY = y;
        touchedOnce = true; knockAt(t.x, y);
      } else if (t.id === model.activeId && t.state === MOVING) {
        model.targetX = Math.max(-.38, Math.min(.38, (t.x - model.anchorX) / 210));
        model.targetY = Math.max(-.38, Math.min(.38, (y - model.anchorY) / 210));
      } else if (t.id === model.activeId && (t.state === ENDED || t.state === CANCELLED)) {
        (mode === "journey" ? J : D).release(model);
      }
      return true;
    },
    exit() { (mode === "journey" ? J : D).release(model); },
  };
  SSE.createApp({
    id: W.id, logicalWidth: W.logicalWidth, logicalHeight: W.logicalHeight,
    frameRate: W.frameRate, initialScene: "main", pointerMode: "primary", debug: false,
    outerBackground: "#e6ddc7",
    keyboard: { bindings: { left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"],
      up: ["ArrowUp", "KeyW"], down: ["ArrowDown", "KeyS"], knock: ["Space"] } },
    audio: SSE.audio.withBaseline({ storageKey: W.id + ".sound", sounds: {
      shell: { file: "./audio/shell.wav", mode: "buffer", volume: SSE.audio.baseline().reference.se.action },
      rim: { file: "./audio/rim.wav", mode: "buffer", volume: SSE.audio.baseline().reference.se.soft },
      seed: { file: "./audio/seed.wav", mode: "buffer", volume: SSE.audio.baseline().reference.se.soft },
      fiber: { file: "./audio/fiber.wav", mode: "buffer", volume: SSE.audio.baseline().reference.se.soft },
      slide: { file: "./audio/slide.wav", mode: "buffer", volume: SSE.audio.baseline().reference.se.soft },
    } }),
    analytics: { enabled: false }, scenes: { main: scene },
    setup() {
      SSE.audio.preload();
      again = document.getElementById("again");
      again.addEventListener("click", () => {
        model = D.createPrologue(); mode = "prologue"; openAt = null; reveal = 0;
        hint = 1; touchedOnce = false; lastSound = -1; debugAt = -1; again.hidden = true;
        SSE.audio.unlock();
      });
      if (new URLSearchParams(location.search).get("dev") === "1") {
        debugStatus = document.createElement("output"); debugStatus.id = "work-observation";
        debugStatus.setAttribute("aria-label", "work runtime observation"); document.body.appendChild(debugStatus);
      }
      paper = document.createElement("canvas"); paper.width = 390; paper.height = 740;
      const c = paper.getContext("2d");
      c.fillStyle = "#e6ddc7"; c.fillRect(0, 0, 390, 740);
      const light = c.createLinearGradient(0, 0, 390, 740);
      light.addColorStop(0, "rgba(255,250,225,.45)"); light.addColorStop(1, "rgba(161,147,118,.13)");
      c.fillStyle = light; c.fillRect(0, 0, 390, 740);
      for (const g of grain) oval(c, g.x, g.y, g.r, g.r, "rgba(99,86,65,.08)");
      const button = document.getElementById("sound-toggle");
      const sync = () => {
        button.setAttribute("aria-pressed", String(SSE.audio.enabled));
        button.setAttribute("aria-label", SSE.audio.enabled ? "音を切る" : "音を入れる");
      };
      sync();
      button.addEventListener("click", () => { SSE.audio.setEnabled(!SSE.audio.enabled); SSE.audio.unlock(); sync(); });
    },
  });
  // Read-only diagnostics. No gameplay state is included in Session Report.
  if (new URLSearchParams(location.search).get("dev") === "1") {
    root.PumpkinProbe = () => ({ mode, loose: model.seeds.filter(p => !p.attached).length, seedCount: model.seeds.length, finished: !!model.finished, held: model.held, tilt: [model.x, model.y],
      speed: model.seeds.map(p => Math.hypot(p.vx, p.vy)), impacts: model.impactCount,
      marks: model.marks.length });
  }
})(window);
