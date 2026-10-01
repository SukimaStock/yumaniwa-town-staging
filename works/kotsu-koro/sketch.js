(function (root) {
  "use strict";
  const W = root.SUKIMASTOCK_WORK, D = root.PumpkinDynamics;
  const J = root.PumpkinJourney;
  let model = D.createPrologue(), mode = "prologue", openAt = null, again, debugStatus, debugAt = 0;
  if (new URLSearchParams(location.search).get("dev") === "1" && new URLSearchParams(location.search).get("stage") === "1") {
    model = J.create(model); mode = "journey";
  }
  const CX = 195, CY = 365, TAU = Math.PI * 2;
  let lastSound = -1, touchedOnce = false, hint = 1, paper, titleArt, gesture = null;
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
    oval(c, 2.2, 3, 8.2, 3.8, "rgba(101,64,31,.14)");
    c.beginPath(); c.moveTo(-10.5, 0);
    c.bezierCurveTo(-5, -7.7, 7.5, -6.7, 11.5, 0);
    c.bezierCurveTo(7, 6.5, -5.8, 6.5, -10.5, 0);
    const fill = c.createLinearGradient(0, -6, 1, 6);
    fill.addColorStop(0, "#fff8df"); fill.addColorStop(0.55, "#f5e7bc"); fill.addColorStop(1, "#d9c18a");
    c.fillStyle = fill; c.fill(); c.strokeStyle = "#d9bf88"; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.moveTo(-7, -1); c.quadraticCurveTo(0, -3.5, 8, 0);
    c.strokeStyle = "rgba(255,250,221,.74)"; c.stroke();
    c.beginPath(); c.moveTo(-5, 2); c.quadraticCurveTo(1, 3.8, 7, 1.2);
    c.strokeStyle = "rgba(155,121,68,.18)"; c.lineWidth = 0.65; c.stroke();
    c.restore();
  }
  function vessel(c, showSeeds = true, local = false) {
    c.save();
    if (!local) {
      c.translate(CX + model.x * 34, CY + model.y * 23);
      c.rotate(model.x * 0.22);
      c.scale(1 + model.ring * 0.22, 1 - model.y * 0.15 - model.ring * 0.18);
    }
    // A few local pixels of depth only. Fade before the shell expands so
    // the local transition renderer starts with the identical layered pose.
    const depth = model.transition ? 1 - J.smooth(model.transition.progress / .36) : 1;
    const px = model.x * depth, py = model.y * depth;
    // Lower skin: the visible thickness gives the drag somewhere to land.
    c.save(); c.translate(-px * 5, 15 - py * 3);
    outline(c, 143, 0.80, 3.5);
    const skin = c.createLinearGradient(-100, -110, 80, 100);
    skin.addColorStop(0, "#789063"); skin.addColorStop(0.46, "#526e4b"); skin.addColorStop(1, "#39573e");
    c.fillStyle = skin; c.fill();
    c.clip();
    for (let i = 0; i < 18; i++) {
      const a = i * TAU / 18;
      c.beginPath(); c.moveTo(Math.cos(a) * 40, Math.sin(a) * 35);
      c.quadraticCurveTo(Math.cos(a) * 116, Math.sin(a) * 110, Math.cos(a + 0.06) * 157, Math.sin(a + 0.06) * 130);
      c.strokeStyle = i % 2 ? "rgba(134,145,95,.22)" : "rgba(29,57,34,.24)";
      c.lineWidth = i % 2 ? 6 : 4; c.stroke();
    }
    c.restore();
    c.save(); c.translate(-px * .7, -py * .5);
    outline(c, 141, 0.80, 3);
    const flesh = c.createLinearGradient(-90, -100, 110, 130);
    flesh.addColorStop(0, "#ffd384"); flesh.addColorStop(.44, "#f5ac53"); flesh.addColorStop(1, "#df9248");
    c.fillStyle = flesh; c.fill();
    c.strokeStyle = "#516b4a"; c.lineWidth = 3.2; c.stroke();
    outline(c, 131, .80, 2);
    c.strokeStyle = "rgba(255,232,172,.65)"; c.lineWidth = 1.2; c.stroke();
    // Sparse cut fibres, stable between frames. They belong to the material.
    for (let i = 0; i < 105; i++) {
      const a = i * 2.399, r = 106 + (i * 17 % 27);
      c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r * .8);
      c.lineTo(Math.cos(a + .01) * (r + 4 + i % 5), Math.sin(a + .01) * (r + 4 + i % 5) * .8);
      c.strokeStyle = i % 3 ? "rgba(168,99,44,.09)" : "rgba(255,224,139,.35)";
      c.lineWidth = .6; c.stroke();
    }
    c.restore();
    c.save(); c.translate(px * 7, py * 4);
    outline(c, 105, .80, 2.5);
    const interior = c.createRadialGradient(-19 - model.x * 20, -17 - model.y * 20, 7, 0, 0, 118);
    interior.addColorStop(0, "#edb66d"); interior.addColorStop(.62, "#e4a45b"); interior.addColorStop(.88, "#ca8344"); interior.addColorStop(1, "#ad703d");
    c.fillStyle = interior; c.fill();
    c.save(); c.clip();
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * TAU;
      c.beginPath(); c.moveTo(Math.cos(a) * 103, Math.sin(a) * 103 * .8);
      c.bezierCurveTo(Math.cos(a + .08) * 89, Math.sin(a + .08) * 89 * .8, Math.cos(a - .12) * 75, Math.sin(a - .12) * 75 * .8, Math.cos(a) * 71, Math.sin(a) * 71 * .8);
      c.strokeStyle = "rgba(255,211,139,.30)"; c.lineWidth = 1.5; c.stroke();
    }
    c.restore(); c.restore();
    // Physical seeds/tethers and their clip retain the original transform.
    outline(c, 105, .80, 2.5); c.save(); c.clip();
    for (const m of showSeeds ? model.marks : []) {
      c.beginPath(); c.moveTo(m.ox, m.oy * .8); c.lineTo(m.x, m.y * .8);
      c.strokeStyle = `rgba(246,200,124,${.13 * Math.pow(1 - m.age / 18, 2)})`;
      c.lineWidth = 1.2; c.stroke();
    }
    for (const p of showSeeds ? model.seeds : []) {
      if (!p.tether) continue;
      const t = p.tether, tail = p.attached ? 1 : Math.exp(-(model.time - t.detachedAt) * 2.4);
      const dx = p.x - t.ax, dy = p.y - t.ay;
      c.beginPath(); c.moveTo(t.ax, t.ay * .8);
      c.quadraticCurveTo(t.ax + dx * .4 - 6 * tail, (t.ay + dy * .4) * .8 + 6 * tail, t.ax + dx * tail, (t.ay + dy * tail) * .8);
      c.strokeStyle = "rgba(135,85,37,.14)"; c.lineWidth = 4; c.stroke();
      c.strokeStyle = "#f5d295"; c.lineWidth = p.attached ? 2.2 - Math.min(1, t.damage / t.strength) * 1.2 : 1;
      c.stroke();
      c.beginPath(); c.moveTo(-1, -6); c.quadraticCurveTo(t.ax - 6, t.ay * .8 - 4, t.ax, t.ay * .8);
      c.strokeStyle = "rgba(246,202,128,.62)"; c.lineWidth = 1.1; c.stroke();
    }
    if (showSeeds) for (const [i, p] of model.seeds.entries()) seed(c, p, i);
    c.restore();
    // A knife nick remains on the rim; no "completed" state clears the object.
    c.beginPath(); c.moveTo(107, 65); c.lineTo(114, 69);
    c.strokeStyle = "#ffd089"; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }
  function shadow(c) {
      c.save(); c.translate(CX + 9 + model.x * 9, CY + 29 + model.y * 5);
      c.scale(1, .65);
      const sh = c.createRadialGradient(0, 0, 30, 0, 0, 164);
      sh.addColorStop(0, "rgba(127,91,48,.15)"); sh.addColorStop(.7, "rgba(127,91,48,.07)"); sh.addColorStop(1, "rgba(127,91,48,0)");
      oval(c, 0, 0, 166, 166, sh); c.restore();
  }
  function captions(c) {
      c.textAlign = "center";
      // Keep the same quiet opening composition. The supplied vector is the
      // only title; the text fallback also keeps it readable if loading fails.
      if (titleArt && titleArt.complete && titleArt.naturalWidth > 0) {
        c.drawImage(titleArt, 57, 91, 276, 276 * 654 / 2064);
      } else {
        c.fillStyle = "#b9672f";
        c.font = "bold 32px 'Arial Rounded MT Bold', sans-serif";
        c.fillText(W.title, 195, 148);
      }
      c.fillStyle = `rgba(105,85,57,${.78 * hint})`;
      c.font = "12px 'Hiragino Kaku Gothic ProN', sans-serif";
      c.fillText("つかんで、ゆらす", 195, 583);
      c.fillStyle = "rgba(105,85,57,.55)"; c.font = "9px Georgia, serif";
      c.fillText("SukimaStock", 195, 684);
  }
  function draw() {
    withCanvasContext(c => {
      c.translate(0, W.logicalHeight); c.scale(1, -1);
      c.drawImage(paper, 0, 0);
      if (mode !== "prologue") {
        if (mode === "transition") {
          c.save(); c.globalAlpha = 1 - J.smooth(model.transition.progress / .48);
          shadow(c); c.restore();
        }
        root.PumpkinStageDraw.draw(c, model, seed, c => vessel(c, false, true));
        if (mode === "transition") {
          c.save(); c.globalAlpha = 1 - J.smooth(model.transition.progress / .48);
          captions(c); c.restore();
        }
        return;
      }
      shadow(c);
      vessel(c);
      captions(c);
    });
  }
  function knockAt(x, y) {
    if (mode !== "prologue") { const p = J.point(model, x, y); J.knock(model, p.x, p.y); }
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
        const strength = mode === "prologue" ? .28 : .28 + .10 * J.opening(model);
        model.targetX = kx * strength; model.targetY = ky * strength;
      }
      if (kx || ky) touchedOnce = true;
      if (SSE.input.actionPressed("knock")) { knockAt(CX + 70, CY - 35); touchedOnce = true; }
      if (mode !== "prologue") {
        J.update(model, dt);
        if (mode === "transition" && model.transition.settled) mode = "journey";
        if (again) again.hidden = !model.finished;
      } else {
        D.update(model, dt);
        if (model.detachments.length) SSE.audio.play("fiber");
        if (D.allLoose(model)) {
          if (openAt === null) openAt = model.time;
          if (model.time - openAt >= 1.8) { model = J.create(model, true); mode = "transition"; debugAt = -1; }
        }
      }
      if (debugStatus && model.time - debugAt > .35) {
        debugAt = model.time;
        const active = model.seeds.filter(p => !p.lost);
        const span = active.length ? Math.round(Math.min(...active.map(p => p.x))) + "…" + Math.round(Math.max(...active.map(p => p.x))) : "—";
        debugStatus.textContent = mode + " | loose " + model.seeds.filter(p => !p.attached).length + "/9 | active " + active.length + " lost " + model.seeds.filter(p => p.lost).length + " reached " + active.filter(p => p.x > J.END.left && p.x < J.END.right).length + " | x " + span + " | speed " + Math.round(Math.max(0,...active.map(p => Math.hypot(p.vx,p.vy)))) + " tilt " + model.x.toFixed(2) + " | held " + model.held + " | exit " + !!model.finished;
      }
      if (touchedOnce) hint *= Math.exp(-dt * .8);
      if (model.contacts.length && model.time - lastSound > .065) {
        const hit = model.contacts.reduce((a, b) => a.speed > b.speed ? a : b);
        const gain = Math.min(1, .40 + hit.speed / 240);
        SSE.audio.play(({ rim: "rim", fiber: "fiber", polished: "slide", cushion: "fiber" })[hit.material] || "seed", { volume: SSE.audio.baseline().reference.se.soft * gain, playbackRate: .9 + hit.speed / 900 });
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
        gesture = { x: t.x, y, moved: false, knocked: mode === "prologue" };
        touchedOnce = true;
        // Keep the accepted Stage 0 grab impulse. In the open world only a
        // tap knocks; regrabbing a tilt must not repeatedly kick stragglers away.
        if (mode === "prologue") knockAt(t.x, y);
      } else if (t.id === model.activeId && t.state === MOVING) {
        if (gesture && Math.hypot(t.x - gesture.x, y - gesture.y) > 8) gesture.moved = true;
        model.targetX = Math.max(-.38, Math.min(.38, (t.x - model.anchorX) / 210));
        model.targetY = Math.max(-.38, Math.min(.38, (y - model.anchorY) / 210));
      } else if (t.id === model.activeId && (t.state === ENDED || t.state === CANCELLED)) {
        if (mode !== "prologue" && t.state === ENDED && gesture && !gesture.moved && !gesture.knocked) knockAt(t.x, y);
        (mode !== "prologue" ? J : D).release(model); gesture = null;
      }
      return true;
    },
    exit() { (mode !== "prologue" ? J : D).release(model); gesture = null; },
  };
  SSE.createApp({
    id: W.id, logicalWidth: W.logicalWidth, logicalHeight: W.logicalHeight,
    frameRate: W.frameRate, initialScene: "main", pointerMode: "primary", debug: false,
    outerBackground: "#f7edd8",
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
      titleArt = document.getElementById("title-art");
      again = document.getElementById("again");
      again.addEventListener("click", () => {
        model = D.createPrologue(); mode = "prologue"; openAt = null;
        hint = 1; touchedOnce = false; lastSound = -1; gesture = null; debugAt = -1; again.hidden = true;
        SSE.audio.unlock();
      });
      if (new URLSearchParams(location.search).get("dev") === "1") {
        debugStatus = document.createElement("output"); debugStatus.id = "work-observation";
        debugStatus.setAttribute("aria-label", "work runtime observation"); document.body.appendChild(debugStatus);
      }
      paper = document.createElement("canvas"); paper.width = 390; paper.height = 740;
      const c = paper.getContext("2d");
      c.fillStyle = "#f7edd8"; c.fillRect(0, 0, 390, 740);
      const light = c.createLinearGradient(0, 0, 390, 740);
      light.addColorStop(0, "rgba(255,253,240,.62)"); light.addColorStop(1, "rgba(224,172,96,.10)");
      c.fillStyle = light; c.fillRect(0, 0, 390, 740);
      for (const g of grain) oval(c, g.x, g.y, g.r, g.r, "rgba(151,111,64,.035)");
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
      active: model.seeds.filter(p => !p.lost).length, lost: model.seeds.filter(p => p.lost).length, reached: model.seeds.filter(p => !p.lost && p.x > J.END.left && p.x < J.END.right).length,
      speed: model.seeds.map(p => Math.hypot(p.vx, p.vy)), impacts: model.impactCount,
      bounds: model.seeds.map(p => [Math.round(p.x), Math.round(p.y)]),
      state: model.seeds.map(p => ({lost: !!p.lost, inactive: !!p.inactive})),
      camera: model.camera ? { ...model.camera } : null, transition: model.transition ? model.transition.progress : null,
      marks: model.marks.length });
  }
})(window);
