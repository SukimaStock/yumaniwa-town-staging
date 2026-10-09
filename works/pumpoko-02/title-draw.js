/* Selected title primitives adapted from PUMPOKO sketch.js. Y-down local art,
 * converted once at this boundary; WORLD LOOP stays Y-up. */
(function(root){
  'use strict';
  const CX=195,CY=365,TAU=Math.PI*2;
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  let titleArt;
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
    const M = root.PumpokoMaterial;
    const x = p.x, y = p.y * sy;
    c.save(); c.translate(x, y); c.rotate(p.angle); c.scale(1, p.roll || 1);
    // Soft cast/contact shadow stays close to the existing seed silhouette.
    oval(c, 2.2, 3, 8.2, 3.8, M.shadow);
    oval(c, 1, 3.3, 5.8, 1.6, "rgba(90,68,38,.12)");
    c.beginPath(); c.moveTo(-10.5, 0);
    c.bezierCurveTo(-5, -7.7, 7.5, -6.7, 11.5, 0);
    c.bezierCurveTo(7, 6.5, -5.8, 6.5, -10.5, 0);
    const fill = c.createLinearGradient(0, -6, 1, 6);
    fill.addColorStop(0, M.seedLight); fill.addColorStop(0.55, M.seed); fill.addColorStop(1, M.seedDeep);
    c.fillStyle = fill; c.fill(); c.strokeStyle = "#d9bf88"; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.moveTo(-7, -1); c.quadraticCurveTo(0, -3.5, 8, 0);
    c.strokeStyle = "rgba(255,250,221,.74)"; c.stroke();
    c.beginPath(); c.moveTo(-5, 2); c.quadraticCurveTo(1, 3.8, 7, 1.2);
    c.strokeStyle = "rgba(155,121,68,.18)"; c.lineWidth = 0.65; c.stroke();
    c.restore();
  }
  function vessel(c, showSeeds = true, local = false, state) {
    const M = root.PumpokoMaterial;
    c.save();
    if (!local) {
      c.translate(CX + state.x * 34, CY + state.y * 23);
      c.rotate(state.x * 0.22);
      c.scale(1 + state.ring * 0.22, 1 - state.y * 0.15 - state.ring * 0.18);
    }
    // A few local pixels of depth only. Fade before the shell expands so
    // the local transition renderer starts with the identical layered pose.
    const depth = state.transition ? 1 - smooth(state.transition.progress / .36) : 1;
    const px = state.x * depth, py = state.y * depth;
    // Lower skin: the visible thickness gives the drag somewhere to land.
    c.save(); c.translate(-px * 5, 15 - py * 3);
    outline(c, 143, 0.80, 3.5);
    const skin = c.createLinearGradient(-100, -110, 80, 100);
    skin.addColorStop(0, M.rindLight); skin.addColorStop(0.46, M.rind); skin.addColorStop(1, M.rindDeep);
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
    c.strokeStyle = M.rind; c.lineWidth = 3.2; c.stroke();

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
    // Fade attachment remnants in the existing 1.8s pause: .25s of quiet,
    // then 1.05s to a clean cut. Seed positions/visibility are independent.
    const fiber = showSeeds && state.looseAt !== null
      ? 1 - smooth((state.time - state.looseAt - .25) / 1.05) : 1;
    // Physical seeds/tethers and their clip retain the original transform.
    outline(c, 105, .80, 2.5); c.save(); c.clip();
    c.save(); c.globalAlpha *= fiber;
    for (const m of showSeeds && fiber > 0 ? state.marks : []) {
      c.beginPath(); c.moveTo(m.ox, m.oy * .8); c.lineTo(m.x, m.y * .8);
      c.strokeStyle = `rgba(246,200,124,${.13 * Math.pow(1 - m.age / 18, 2)})`;
      c.lineWidth = 1.2; c.stroke();
    }
    if (showSeeds && fiber > 0 && (state.seeds.some(p => p.attached) || state.looseAt !== null)) {
      const pulp = c.createRadialGradient(0, -2, 0, 0, -2, 20);
      pulp.addColorStop(0, "rgba(255,224,163,.42)"); pulp.addColorStop(1, "rgba(255,224,163,0)");
      oval(c, 0, -2, 20, 14, pulp);
    }
    c.lineCap = "round";
    for (const p of showSeeds && fiber > 0 ? state.seeds : []) {
      if (!p.tether) continue;
      const t = p.tether, tail = p.attached ? 1 : Math.exp(-(state.time - t.detachedAt) * 2.4);
      const dx = p.x - t.ax, dy = p.y - t.ay;
      c.beginPath(); c.moveTo(t.ax, t.ay * .8);
      c.quadraticCurveTo(t.ax + dx * .4 - 6 * tail, (t.ay + dy * .4) * .8 + 6 * tail, t.ax + dx * tail, (t.ay + dy * tail) * .8);
      c.strokeStyle = "rgba(144,93,44,.12)"; c.lineWidth = 5; c.stroke();
      c.strokeStyle = "#ffe0a6"; c.lineWidth = p.attached ? 3.2 - Math.min(1, t.damage / t.strength) * 1.5 : 1.4;
      c.stroke();
    }
    c.restore(); c.lineCap = "round";
    if (showSeeds) for (const [i, p] of state.seeds.entries()) seed(c, p, i);
    c.restore();
    // A knife nick remains on the rim; no "completed" state clears the object.
    c.beginPath(); c.moveTo(107, 65); c.lineTo(114, 69);
    c.strokeStyle = "#ffd089"; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }
  function shadow(c, state) {
      c.save(); c.translate(CX + 9 + state.x * 9, CY + 29 + state.y * 5);
      c.scale(1, .65);
      const sh = c.createRadialGradient(0, 0, 30, 0, 0, 164);
      sh.addColorStop(0, "rgba(127,91,48,.15)"); sh.addColorStop(.7, "rgba(127,91,48,.07)"); sh.addColorStop(1, "rgba(127,91,48,0)");
      oval(c, 0, 0, 166, 166, sh); c.restore();
  }
  function captions(c, state) {
      c.textAlign = "center";
      // Keep the same quiet opening composition. The supplied vector is the
      // only title; the text fallback also keeps it readable if loading fails.
      c.save(); const logoY = 1.2 * Math.sin(state.time * TAU / 7);
      if (titleArt && titleArt.complete && titleArt.naturalWidth > 0) {
        c.drawImage(titleArt, 36.3, 102 + logoY, 317.4, 317.4 * 654 / 2064);
      } else {
        c.fillStyle = "#b9672f";
        c.font = "bold 36.8px 'Arial Rounded MT Bold', sans-serif";
        c.fillText("PUMPOKO", 195, 163 + logoY);
      }
      c.restore();
      c.fillStyle = "rgba(105,85,57,.55)"; c.font = "9px Georgia, serif";
      c.fillText("SukimaStock", 195, 684);
  }
  root.PumpokoTitleDraw=function(c,state,pose={x:195,y:375,scale:1},alpha=1,captionsAlpha=1){
    c.save();c.globalAlpha*=alpha;c.translate(pose.x,pose.y);c.scale(pose.scale,-pose.scale);c.translate(-195,-365);
    shadow(c,state);vessel(c,true,false,state);
    c.save();c.globalAlpha*=captionsAlpha;titleArt=root.document?.getElementById('title-art');captions(c,state);c.restore();
    c.restore();
  };
})(typeof window!=='undefined'?window:globalThis);
