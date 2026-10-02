(function (root) {
  "use strict";
  const W = root.SUKIMASTOCK_WORK, D = root.PumpkinDynamics;
  const J = root.PumpkinJourney;
  let model = D.createPrologue(), mode = "prologue", openAt = null, returnModel = null, debugStatus, debugAt = 0;
  if (new URLSearchParams(location.search).get("dev") === "1" && new URLSearchParams(location.search).get("stage") === "1") {
    model = J.create(model); mode = "journey"; model.titleCycle=true;
  }
  // Explicit development fixtures: placement only, then the real contact/result
  // pipeline. Ordinary play never reads these parameters.
  const fixture=new URLSearchParams(location.search);
  if(fixture.get("dev")==="1" && /^[0-9]$/.test(fixture.get("ending")||"")) {
    model=J.create(D.createPrologue());mode="journey";model.titleCycle=true;
    const count=Number(fixture.get("ending")), {left,right}=model.geometry.END;
    model.seeds.forEach((p,i)=>{if(i>=count){p.lost=p.inactive=true;return;}
      p.x=left+35+(right-left-70)*(i+.5)/count;
      p.y=model.geometry.floor(p.x).y-J.support(p,model.geometry.floor(p.x).nx,model.geometry.floor(p.x).ny)-.5;
      p.vx=p.vy=p.spin=0;
      const reward=Number(fixture.get("reward")||0);
      // Visual fixture only: identical IDs/placement at zero, middle and cap.
      if(reward>0&&reward<=1) {
        let lo=J.jump.TUNE.minDistance,hi=J.jump.TUNE.fullDistance;
        for(let n=0;n<40;n++){const m=(lo+hi)/2;if(J.jump.amount(m)<reward)lo=m;else hi=m;}
        p.jump.best=hi;
      }
    });
    model.camera={x:(left+right)/2,y:model.geometry.floor((left+right)/2).y-70,z:J.ZOOM};
  }
  // Sound policy is by event, not by shared filename. Keep original files for
  // comparison. No existing sound has been verified as soft soil, so arrivals
  // are intentionally silent in this version; the one-shot event is retained.
  const SOUND=Object.freeze({detach:"fiber",arrival:null,arrivalWindow:.12});
  const CX = 195, CY = 365, TAU = Math.PI * 2;
  let lastArrivalSound = -1, touchedOnce = false, hint = 1, paper, titleArt, gesture = null;
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
  function vessel(c, showSeeds = true, local = false, state = model) {
    c.save();
    if (!local) {
      c.translate(CX + state.x * 34, CY + state.y * 23);
      c.rotate(state.x * 0.22);
      c.scale(1 + state.ring * 0.22, 1 - state.y * 0.15 - state.ring * 0.18);
    }
    // A few local pixels of depth only. Fade before the shell expands so
    // the local transition renderer starts with the identical layered pose.
    const depth = state.transition ? 1 - J.smooth(state.transition.progress / .36) : 1;
    const px = state.x * depth, py = state.y * depth;
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
    c.restore();
    c.save(); c.translate(px * 7, py * 4);
    outline(c, 105, .80, 2.5);
    // Wide, quiet colour masses describe a soft hollow; no fibre diagram.
    const interior = c.createRadialGradient(-17 - state.x * 20, -12 - state.y * 20, 6, 0, 0, 119);
    interior.addColorStop(0, "#e6a05a"); interior.addColorStop(.52, "#e9a760");
    interior.addColorStop(.82, "#efb36c"); interior.addColorStop(1, "#c58b50");
    c.fillStyle = interior; c.fill();
    c.save(); c.clip();
    const shade = c.createLinearGradient(0, -85, 0, 65);
    shade.addColorStop(0, "rgba(138,85,40,.17)");
    shade.addColorStop(.48, "rgba(164,106,49,0)");
    shade.addColorStop(1, "rgba(255,220,156,.18)");
    oval(c, 0, 0, 112, 89, shade);
    const warmth = c.createRadialGradient(-29, 34, 0, -29, 34, 85);
    warmth.addColorStop(0, "rgba(255,218,155,.23)"); warmth.addColorStop(1, "rgba(255,218,155,0)");
    oval(c, -29, 34, 85, 64, warmth);
    c.restore(); c.restore();
    // Physical seeds/tethers and their clip retain the original transform.
    outline(c, 105, .80, 2.5); c.save(); c.clip();
    for (const m of showSeeds ? state.marks : []) {
      c.beginPath(); c.moveTo(m.ox, m.oy * .8); c.lineTo(m.x, m.y * .8);
      c.strokeStyle = `rgba(246,200,124,${.13 * Math.pow(1 - m.age / 18, 2)})`;
      c.lineWidth = 1.2; c.stroke();
    }
    if (showSeeds && state.seeds.some(p => p.attached)) {
      const pulp = c.createRadialGradient(0, -2, 0, 0, -2, 20);
      pulp.addColorStop(0, "rgba(255,224,163,.42)"); pulp.addColorStop(1, "rgba(255,224,163,0)");
      oval(c, 0, -2, 20, 14, pulp);
    }
    c.lineCap = "round";
    for (const p of showSeeds ? state.seeds : []) {
      if (!p.tether) continue;
      const t = p.tether, tail = p.attached ? 1 : Math.exp(-(state.time - t.detachedAt) * 2.4);
      const dx = p.x - t.ax, dy = p.y - t.ay;
      c.beginPath(); c.moveTo(t.ax, t.ay * .8);
      c.quadraticCurveTo(t.ax + dx * .4 - 6 * tail, (t.ay + dy * .4) * .8 + 6 * tail, t.ax + dx * tail, (t.ay + dy * tail) * .8);
      c.strokeStyle = "rgba(144,93,44,.12)"; c.lineWidth = 5; c.stroke();
      c.strokeStyle = "#ffe0a6"; c.lineWidth = p.attached ? 3.2 - Math.min(1, t.damage / t.strength) * 1.5 : 1.4;
      c.stroke();
    }
    if (showSeeds) for (const [i, p] of state.seeds.entries()) seed(c, p, i);
    c.restore();
    // A knife nick remains on the rim; no "completed" state clears the object.
    c.beginPath(); c.moveTo(107, 65); c.lineTo(114, 69);
    c.strokeStyle = "#ffd089"; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }
  function shadow(c, state = model) {
      c.save(); c.translate(CX + 9 + state.x * 9, CY + 29 + state.y * 5);
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
        c.drawImage(titleArt, 36.3, 102, 317.4, 317.4 * 654 / 2064);
      } else {
        c.fillStyle = "#b9672f";
        c.font = "bold 36.8px 'Arial Rounded MT Bold', sans-serif";
        c.fillText(W.title, 195, 163);
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
        const mix=J.titleMix(model);
        if(mix>0) { c.save();c.globalAlpha=mix;shadow(c,returnModel);c.restore(); }
        root.PumpkinStageDraw.draw(c, model, seed, c => vessel(c, false, true), c => vessel(c, true, true, returnModel));
        if(mix>0&&!model.ending.focus) { c.save();c.globalAlpha=mix;vessel(c,true,false,returnModel);c.restore(); }
        if(mix>0) { c.save();c.globalAlpha=mix;const previousHint=hint;hint=1;captions(c);hint=previousHint;c.restore(); }
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
  function returnToTitle() {
    SSE.input.reset?.();
    model = returnModel || D.createPrologue(); returnModel = null;
    mode = "prologue"; openAt = null;
    hint = 1; touchedOnce = false; lastArrivalSound = -1; gesture = null; debugAt = -1;
    // Keep the Engine's one music player and position, including automatic return.
  }
  function knockAt(x, y) {
    if (mode !== "prologue") { const p = J.point(model, x, y); J.knock(model, p.x, p.y); }
    else D.knock(model, x - CX, (y - CY) / .8);
  }
  const scene = {
    opaque: true,
    update(dt) {
      // Keyboard is an equal way of holding the vessel, without extra HUD.
      const kx = (SSE.input.action("right") ? 1 : 0) - (SSE.input.action("left") ? 1 : 0);
      const ky = (SSE.input.action("down") ? 1 : 0) - (SSE.input.action("up") ? 1 : 0);
      if (!model.result && model.activeId === null) {
        model.held = !!(kx || ky);
        const strength = mode === "prologue" ? .28 : .28 + .10 * J.opening(model);
        model.targetX = kx * strength; model.targetY = ky * strength;
      }
      if (kx || ky) touchedOnce = true;
      if (!model.result && SSE.input.actionPressed("knock")) { knockAt(CX + 70, CY - 35); touchedOnce = true; }
      if (mode !== "prologue") {
        J.update(model, dt);
        if (mode === "transition" && model.transition.settled) mode = "journey";
        if(model.result) { gesture=null;if(!returnModel)returnModel=D.createPrologue(); }
        // J.update emits each arrival once. Coalesce near-simultaneous events;
        // never queue sounds to be replayed after mute/background recovery.
        if(model.arrivalEvents.length && model.time-lastArrivalSound>SOUND.arrivalWindow) {
          if(SOUND.arrival)SSE.audio.play(SOUND.arrival);
          lastArrivalSound=model.time;
        }
        if(model.ending?.titleReady)returnToTitle();
      } else {
        D.update(model, dt);
        if (model.detachments.length) SSE.audio.play(SOUND.detach);
        if (touchedOnce && D.allLoose(model)) {
          if (openAt === null) openAt = model.time;
          if (model.time - openAt >= 1.8) { model = J.create(model, true); model.titleCycle=true; mode = "transition"; debugAt = -1; }
        }
      }
      if (debugStatus && model.time - debugAt > .35) {
        debugAt = model.time;
        const active = model.seeds.filter(p => !p.lost);
        const span = active.length ? Math.round(Math.min(...active.map(p => p.x))) + "…" + Math.round(Math.max(...active.map(p => p.x))) : "—";
        debugStatus.textContent = mode + " | loose " + model.seeds.filter(p => !p.attached).length + "/9 | active " + active.length + " lost " + model.seeds.filter(p => p.lost).length + " reached " + active.filter(p => p.arrival).length + " | x " + span + " | speed " + Math.round(Math.max(0,...active.map(p => Math.hypot(p.vx,p.vy)))) + " tilt " + model.x.toFixed(2) + " | held " + model.held + " | travelling " + active.filter(p=>!p.arrival).length + " | ending " + (model.ending?model.ending.phase:"—") + " | exit " + !!model.finished;
      }
      if (touchedOnce) hint *= Math.exp(-dt * .8);

    },
    draw,
    touch(t) {
      if(model.result)return true;
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
    // Legacy persistence keys are intentional: renaming the work must not reset saved settings.
    i18n: { storageKey: "sse:kotsu-koro:language" },
    audio: SSE.audio.withBaseline({ storageKey: "kotsu-koro.sound", music: {
      pumpoko: { file: "./audio/pumpoko-bgm.mp3", loop: true, volume: SSE.audio.baseline().reference.bgm.active },
    }, sounds: {
      shell: { file: "./audio/shell.wav", mode: "buffer", volume: SSE.audio.baseline().reference.se.action },
      rim: { file: "./audio/rim.wav", mode: "buffer", volume: SSE.audio.baseline().reference.se.soft },
      seed: { file: "./audio/seed.wav", mode: "buffer", volume: SSE.audio.baseline().reference.se.soft },
      fiber: { file: "./audio/fiber.wav", mode: "buffer", volume: SSE.audio.baseline().reference.se.soft },
      slide: { file: "./audio/slide.wav", mode: "buffer", volume: SSE.audio.baseline().reference.se.soft },
    } }),
    analytics: { enabled: false }, scenes: { main: scene },
    setup() {
      SSE.audio.preload();
      // Only trusted existing controls start music. Engine owns its single
      // cached player, mute/pause/resume and lifecycle; game resets never seek it.
      const beginMusic = event => {
        if (event.isTrusted !== true || document.hidden || SSE.lifecycle?.paused || !SSE.audio.enabled) return;
        if (SSE.audio.currentMusic === "pumpoko") SSE.audio.resumeMusic("pumpoko");
        else SSE.audio.playMusic("pumpoko", { restart: false });
      };
      document.getElementById("gameCanvas").addEventListener("pointerdown", event => {
        if (event.isPrimary === false || event.button > 0) return;
        beginMusic(event);
      }, { passive: true });
      root.addEventListener?.("keydown", event => {
        if (event.repeat || SSE.input.isEditable(event)) return;
        if (SSE.input.eventKeys(event).some(key => SSE.input.isBoundKey(key))) beginMusic(event);
      });
      titleArt = document.getElementById("title-art");
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
      button.addEventListener("click", event => { SSE.audio.setEnabled(!SSE.audio.enabled); SSE.audio.unlock(); beginMusic(event); sync(); });
    },
  });
  // Read-only diagnostics. No gameplay state is included in Session Report.
  if (new URLSearchParams(location.search).get("dev") === "1") {
    root.PumpkinProbe = () => ({ mode, loose: model.seeds.filter(p => !p.attached).length, seedCount: model.seeds.length, finished: !!model.finished, held: model.held, tilt: [model.x, model.y],
      travelling: model.seeds.filter(p=>!p.lost&&!p.arrival).length, arrived:model.seeds.filter(p=>p.arrival).length, plants:J.plants(model).length, replayReady:!!model.replayReady, ending:model.ending?{elapsed:model.ending.elapsed,phase:model.ending.phase,growthComplete:model.ending.growthComplete,focus:model.ending.focus?.id,zoom:J.returnZoom(model),titleMix:J.titleMix(model)}:null,
      active: model.seeds.filter(p => !p.lost).length, lost: model.seeds.filter(p => p.lost).length, reached: model.seeds.filter(p => p.arrival).length,
      speed: model.seeds.map(p => Math.hypot(p.vx, p.vy)), impacts: model.impactCount,
      bounds: model.seeds.map(p => [Math.round(p.x), Math.round(p.y)]),
      state: model.seeds.map(p => ({lost: !!p.lost, arrived:!!p.arrival, inactive: !!p.inactive})),
      jumps:model.seeds.map(p=>({id:p.runId,best:p.jump?.best||0,reward:p.arrival?.reward||J.jump.amount(p.jump?.best||0),recent:p.jump?.recent||null,flight:p.jump?.flight?{...p.jump.flight}:null})),
      camera: model.camera ? { ...model.camera } : null, transition: model.transition ? model.transition.progress : null,
      marks: model.marks.length });
  }
})(window);
